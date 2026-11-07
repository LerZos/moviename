import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { test } from "node:test";
import { requireLocal } from "./episode-guides/register-local.mjs";

let networkAttempts = 0;
const forbidden = () => { networkAttempts++; throw new Error("NETWORK_FORBIDDEN"); };
globalThis.fetch = http.request = http.get = https.request = https.get = forbidden;
const ts = requireLocal("typescript");
const originalTsLoader = requireLocal.extensions[".ts"];
requireLocal.extensions[".ts"] = (module, filename) => {
  if (!filename.endsWith("vibixPolicy.ts")) return originalTsLoader(module, filename);
  module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
};
const { prepareVibixPlan } = requireLocal("../../src/app/lib/vibixPolicy.ts");
const { generatedKinopoiskRequestedMovies } = requireLocal("../../src/app/data/generatedKinopoiskRequested.ts");
const { buildAutoPlayers } = requireLocal("../../src/app/lib/players.ts");
const { getCanonicalIdentityBySlug } = requireLocal("../../src/app/data/canonicalIdentity.ts");
const { checkFrameReachability, frameNotice } = requireLocal("../../src/app/lib/playerFrameProbe.ts");
const { isUsableSavedPlayer, isVibixPlayer, mergePlayerOptions, stablePlayerKey } = requireLocal("../../src/app/lib/vibix.ts");
const pageSource = readFileSync(new URL("../src/app/movie/[slug]/MoviePageClient.tsx", import.meta.url), "utf8");
const guardSource = readFileSync(new URL("../src/app/components/PlayerFrameGuard.tsx", import.meta.url), "utf8");
const probeSource = readFileSync(new URL("../src/app/lib/playerFrameProbe.ts", import.meta.url), "utf8");

// Mirrors the non-preferred (legacy/unverified) plan branch of the movie page player list.
function legacyPagePlayers(entry) {
  const plan = prepareVibixPlan({ ...entry, canonicalMovieId: getCanonicalIdentityBySlug(entry.slug)?.canonicalMovieId });
  const saved = (entry.players || []).filter(isUsableSavedPlayer);
  const retained = saved.filter((player) => !isVibixPlayer(player)
    || plan.players.some((allowed) => stablePlayerKey(allowed) === stablePlayerKey(player)));
  const generated = buildAutoPlayers({ slug: entry.slug, kinopoiskId: entry.kinopoiskId, imdbId: entry.imdbId,
    movieType: entry.type, genres: entry.genres });
  return { plan, players: mergePlayerOptions(generated, retained).slice(0, 2) };
}

test("binding review notes are admin-only diagnostics, kept on the player section", () => {
  assert.match(pageSource, /\{isAdmin && currentVibixPlan && VIBIX_PLAN_TEXT\[currentVibixPlan\.status\] \?/);
  assert.match(pageSource, /data-vibix-plan=\{currentVibixPlan\?\.status\}/);
});

test("provider default names get the same Основной / Запасной N labels", () => {
  assert.match(pageSource, /\["vibix", "exiim", "rendex", "collapse"\]\.includes\(lowerName\)/);
  assert.match(pageSource, /return normalizePlayerButtonNames\(mergedPlayers\)\.slice\(0, 2\);/);
});

test("both player kinds render through the frame guard with an alternative source", () => {
  assert.match(pageSource, /const frameGuardKey = `\$\{movieKey\}:\$\{activePlayerKey\}:\$\{frameRetry\}`;/);
  assert.match(pageSource, /<PlayerFrameGuard\s+key=\{frameGuardKey\}\s+onResult=/);
  assert.match(pageSource, /onClick=\{switchToAlternative\}/);
});

test("the frame guard only probes and never rewrites, proxies or swaps provider URLs", () => {
  assert.match(guardSource, /checkFrameReachability\(src,/);
  assert.match(probeSource, /method: "HEAD", mode: "no-cors", cache: "no-store", credentials: "omit"/);
  for (const source of [guardSource, probeSource]) {
    assert.doesNotMatch(source, /setAttribute\(|\.src\s*=|location\.(href|assign|replace)/);
  }
});

test("fail open: no check result ever covers the frame; notices sit below the player box", () => {
  assert.doesNotMatch(guardSource + pageSource, /player-frame-fallback/);
  assert.match(guardSource, /return \(\s*<div ref=\{container\} className="player-frame-guard"[\s\S]*?>\s*\{children\}\s*<\/div>\s*\);/);
  assert.ok(pageSource.indexOf('className="player-frame-notice"') > pageSource.indexOf("</PlayerFrameGuard>"),
    "the notice is rendered after the player box");
  assert.match(pageSource, /frameCheck\?\.key === frameGuardKey && dismissedFrameKey !== frameGuardKey/);
  assert.match(pageSource, /setFrameRetry\(\(value\) => value \+ 1\)/);
  assert.match(pageSource, /setDismissedFrameKey\(frameGuardKey\)/);
});

const FRAME = "https://api.ortified.ws/embed/kp/1";
const CONTROL = "/kinoluma-icon.png";
const networkError = () => Promise.reject(new TypeError("Failed to fetch"));
const answered = () => Promise.resolve({ type: "opaque", status: 0 });
const hang = (signal) => new Promise((_, reject) =>
  signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));

async function check(handlers, extra = {}) {
  const calls = [];
  const fetchImpl = (url, init) => {
    calls.push({ url, method: init.method, mode: init.mode, credentials: init.credentials });
    return (handlers[url] || handlers["*"])(init.signal, calls.length);
  };
  const src = extra.src ?? FRAME;
  const result = await checkFrameReachability(src, {
    fetchImpl, signal: (extra.controller || new AbortController()).signal, controlUrl: CONTROL,
    currentSrc: extra.currentSrc || (() => src), isOnline: extra.isOnline, frameDelivered: extra.frameDelivered,
    sleep: async () => {}, timeoutMs: extra.timeoutMs ?? 50, confirmDelayMs: 0,
  });
  return { ...result, calls };
}

test("probe: any HTTP answer (opaque, incl. 403/404/405) is reachable with a single HEAD", async () => {
  const result = await check({ "*": answered });
  assert.deepEqual([result.state, result.reason, result.host], ["reachable", "responded", "api.ortified.ws"]);
  assert.deepEqual(result.calls, [{ url: FRAME, method: "HEAD", mode: "no-cors", credentials: "omit" }]);
});

test("probe: one rejected HEAD (CORS, extension, flaky network) is not a failure when the retry answers", async () => {
  const result = await check({ "*": (_, n) => (n === 1 ? networkError() : answered()) });
  assert.equal(result.state, "reachable");
  assert.equal(result.calls.length, 2);
});

test("probe: two fast failures while our own origin answers is the only confirmed unreachable", async () => {
  const result = await check({ [FRAME]: networkError, [CONTROL]: answered });
  assert.deepEqual([result.state, result.reason], ["unreachable", "network_error"]);
  assert.deepEqual(result.calls.map(({ url }) => url), [FRAME, FRAME, CONTROL]);
  assert.equal(frameNotice(result), "unreachable");
});

test("probe: a blocked HEAD is overridden when the frame's own response was observed (HEAD-only blockers)", async () => {
  const { calls, ...result } = await check({ [FRAME]: networkError, [CONTROL]: answered }, { frameDelivered: () => true });
  assert.deepEqual([result.state, result.reason], ["reachable", "frame_delivered"]);
  assert.equal(calls.length, 2, "no control request once the frame is known to be delivered");
  assert.equal(frameNotice(result), null);
});

test("probe: failures with our own origin down stay unknown (offline, not the provider)", async () => {
  const result = await check({ "*": networkError });
  assert.deepEqual([result.state, result.reason], ["unknown", "network_unconfirmed"]);
  assert.equal(frameNotice(result), "hint");
});

test("probe: timeouts and slow providers are unknown, never unreachable", async () => {
  const slow = await check({ "*": hang }, { timeoutMs: 20 });
  assert.deepEqual([slow.state, slow.reason, slow.calls.length], ["unknown", "timeout", 1]);
  assert.equal(frameNotice(slow), "hint");
  const failThenSlow = await check({ [FRAME]: (signal, n) => (n === 1 ? networkError() : hang(signal)) }, { timeoutMs: 20 });
  assert.deepEqual([failThenSlow.state, failThenSlow.reason], ["unknown", "network_unconfirmed"]);
});

test("probe: unmount or player switch aborts quietly; a frame swapped by the provider is never blamed", async () => {
  const controller = new AbortController();
  const pending = check({ "*": hang }, { controller, timeoutMs: 5000 });
  controller.abort();
  const aborted = await pending;
  assert.deepEqual([aborted.state, aborted.reason], ["unknown", "aborted"]);
  assert.equal(frameNotice(aborted), null);
  let src = FRAME;
  const swapped = await check({ [FRAME]: () => { src = ""; return networkError(); } }, { currentSrc: () => src });
  assert.deepEqual([swapped.state, swapped.reason, swapped.calls.length], ["unknown", "frame_changed", 1]);
});

test("probe: no request for Collapse's src-less frame, non-https frames or an offline browser", async () => {
  const cases = [[{ src: "" }, "no_src"], [{ src: "http://example.test/x" }, "not_https"], [{ isOnline: () => false }, "offline"]];
  for (const [extra, reason] of cases) {
    const result = await check({ "*": () => assert.fail("must not probe") }, extra);
    assert.deepEqual([result.state, result.reason, result.calls.length], ["unknown", reason, 0]);
  }
  assert.equal(frameNotice({ state: "unknown", reason: "no_src" }), null);
  assert.equal(frameNotice(null), null, "nothing while checking or after unmount");
});

test("a legacy series keeps Collapse primary and its own saved Vibix series ID as backup", () => {
  const entry = generatedKinopoiskRequestedMovies.find((item) => item.slug === "dekster-2006");
  const { plan, players } = legacyPagePlayers(entry);
  assert.equal(plan.status, "legacy_unverified", "diagnostic status is still computed");
  assert.deepEqual(players.map(({ type }) => type), ["collapse", "rendex"]);
  assert.equal(players[1].contentType, "series");
  assert.equal(players[1].contentId, entry.players.find((player) => player.type === "rendex").contentId);
});

test("no network was attempted", () => assert.equal(networkAttempts, 0));
