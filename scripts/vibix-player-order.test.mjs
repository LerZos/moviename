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
const { isUsableSavedPlayer, isVibixPlayer, mergePlayerOptions, stablePlayerKey } = requireLocal("../../src/app/lib/vibix.ts");
const pageSource = readFileSync(new URL("../src/app/movie/[slug]/MoviePageClient.tsx", import.meta.url), "utf8");

// Mirrors the verified-plan branch of the movie page player list.
function verifiedPagePlayers(entry) {
  const plan = prepareVibixPlan({ ...entry, canonicalMovieId: "24dfe6d2-d725-4d21-a5bc-94f82d84cea9" });
  assert.equal(plan.status, "verified");
  const saved = (entry.players || []).filter(isUsableSavedPlayer);
  const retained = saved.filter((player) => !isVibixPlayer(player)
    || plan.players.some((allowed) => stablePlayerKey(allowed) === stablePlayerKey(player)));
  const generated = buildAutoPlayers({ slug: entry.slug, kinopoiskId: entry.kinopoiskId, imdbId: entry.imdbId,
    movieType: entry.type, genres: entry.genres });
  return mergePlayerOptions(generated, plan.players, retained).slice(0, 2);
}

test("movie page keeps Collapse primary, Vibix the first backup, and at most two players", () => {
  assert.match(pageSource, /mergePlayerOptions\(generatedPlayers, currentVibixPlan\.players, retainedPlayers\)/);
  assert.doesNotMatch(pageSource, /mergePlayerOptions\(currentVibixPlan\.players, generatedPlayers/);
  assert.match(pageSource, /return normalizePlayerButtonNames\(mergedPlayers\)\.slice\(0, 2\);/);
});

test("Spider-Man shows Collapse then verified Vibix 325785, without the saved Factorios fallback", () => {
  const entry = generatedKinopoiskRequestedMovies.find((item) => item.slug === "chelovek-pauk-2002");
  assert.ok(entry.players.some((player) => player.provider === "factorios"), "fixture keeps a saved Factorios entry");
  const players = verifiedPagePlayers(entry);
  assert.deepEqual(players.map(({ type }) => type), ["collapse", "rendex"]);
  assert.equal(players[1].contentId, "325785");
  assert.ok(!players.some((player) => player.provider === "factorios"));
});

test("no network was attempted", () => assert.equal(networkAttempts, 0));
