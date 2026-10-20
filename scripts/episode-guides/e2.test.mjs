import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import https from "node:https";
import { EventEmitter } from "node:events";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { requireLocal } from "./register-local.mjs";
globalThis.fetch = async () => { throw new Error("REAL_FETCH_FORBIDDEN_IN_E2_TESTS"); };
https.request = () => { throw new Error("REAL_HTTPS_FORBIDDEN_IN_E2_TESTS"); };
const { PersistentTmdbPilot, endpointIdentity, createTmdbSender } = requireLocal("./e2Transport.ts");
const { initialPlan, verifyLocalPilotIdentities, inspectDetails } = requireLocal("./e2Import.ts");
const { buildPilotSnapshot } = requireLocal("./e2Normalize.ts");
const { normalizeEpisodeGuideSnapshot } = requireLocal("../../src/app/lib/episodeGuides/normalizer.ts");
const { verifyEpisodeGuideSnapshot } = requireLocal("../../src/app/lib/episodeGuides/verifier.ts");

const first = "/3/tv/4613?language=ru-RU";
const second = "/3/tv/83867?language=ru-RU";
async function stateDirectory() {
  return join(await mkdtemp(join(tmpdir(), "kinoluma-e2-test-")), "state");
}
const success = async () => ({ status: 200, payload: { fixture: true } });

test("local identities and the conservative complete plan fit exactly 12 GET", () => {
  assert.equal(verifyLocalPilotIdentities().length, 2);
  assert.equal(initialPlan().length, 12);
  assert.equal(new Set(initialPlan()).size, 12);
  for (const endpoint of initialPlan()) assert.ok(endpointIdentity(endpoint));
  for (const endpoint of ["/3/tv/48866?language=ru-RU", "/3/search/tv?query=Andor", first + "&append_to_response=images", "https://example.com"]) {
    assert.throws(() => endpointIdentity(endpoint), /NOT_ALLOWLISTED/);
  }
});

test("native transport pins host, GET and Bearer header and does not follow redirects", async (context) => {
  let calls = 0;
  context.mock.method(https, "request", (options, callback) => {
    calls++;
    assert.equal(options.hostname, "api.themoviedb.org");
    assert.equal(options.method, "GET");
    assert.equal(options.path, first);
    assert.equal(options.agent, false);
    assert.equal(options.headers.Authorization, "Bearer synthetic-test-token");
    const request = new EventEmitter();
    request.destroy = () => request.emit("close");
    request.end = () => queueMicrotask(() => {
      const response = new EventEmitter();
      response.statusCode = 302;
      response.headers = { location: "https://other.invalid/" };
      callback(response);
      response.emit("end");
      request.emit("close");
    });
    return request;
  });
  const response = await createTmdbSender("synthetic-test-token")(first);
  assert.equal(response.status, 302);
  assert.equal(calls, 1);
});

test("write-ahead reservation precedes transport, resume and cache preserve budget", async () => {
  const directory = await stateDirectory();
  let calls = 0;
  const sender = async () => {
    const saved = JSON.parse(await readFile(join(directory, "journal.json"), "utf8"));
    assert.equal(saved.data.entries.at(-1).outcome, "reserved");
    assert.equal(saved.data.entries.length, ++calls);
    return success();
  };
  let session = await PersistentTmdbPilot.open(directory, { initialize: true, networkEnabled: true, sender });
  try {
    await session.get(first);
    await session.get(first);
    assert.equal(calls, 1);
  } finally { await session.close(); }
  session = await PersistentTmdbPilot.open(directory, { networkEnabled: true, sender });
  try {
    await session.get(first);
    await session.get(second);
    assert.equal(calls, 2);
    assert.equal(session.summary().length, 2);
    await assert.rejects(PersistentTmdbPilot.open(directory, { networkEnabled: true, sender }), /EEXIST/);
    await assert.rejects(PersistentTmdbPilot.open(directory, { initialize: true, networkEnabled: true, sender }), /EEXIST/);
  } finally { await session.close(); }
});

test("offline default, over-budget plan and the thirteenth actual dispatch are blocked", async () => {
  const directory = await stateDirectory();
  let calls = 0;
  const sender = async () => { calls++; return success(); };
  let session = await PersistentTmdbPilot.open(directory, { initialize: true, sender });
  try {
    await assert.rejects(session.get(first), /Network is disabled/);
    assert.equal(calls, 0);
    assert.throws(() => session.assertPlan([...initialPlan(), "/3/tv/4613/season/9?language=ru-RU"]), /PLAN_EXCEEDS_BUDGET/);
    assert.equal(calls, 0);
  } finally { await session.close(); }
  session = await PersistentTmdbPilot.open(directory, { networkEnabled: true, sender });
  try { for (const endpoint of initialPlan()) await session.get(endpoint); }
  finally { await session.close(); }
  session = await PersistentTmdbPilot.open(directory, { networkEnabled: true, sender });
  try {
    await assert.rejects(session.get("/3/tv/4613/season/9?language=ru-RU"), /budget is exhausted/);
    assert.equal(calls, 12);
    assert.equal(session.summary().length, 12);
  } finally { await session.close(); }
});

test("HTTP errors, 429 Retry-After, quota exhaustion and network failures count once and halt across resume", async () => {
  for (const response of [
    { status: 401 }, { status: 403 }, { status: 429, retryAfter: "7" },
    { status: 500 }, { status: 302 },
    { status: 200, quotaRemaining: 0 }, null,
  ]) {
    const directory = await stateDirectory();
    let calls = 0;
    const sender = async () => {
      calls++;
      if (!response) throw new Error("private transport details must not leak");
      return { payload: null, ...response };
    };
    let session = await PersistentTmdbPilot.open(directory, { initialize: true, networkEnabled: true, sender });
    try {
      await assert.rejects(session.get(first), /TMDB_HTTP_|TMDB_NETWORK_ERROR/);
      if (response?.status === 429) assert.equal(session.summary()[0].retryAfterMs, 7000);
    } finally { await session.close(); }
    session = await PersistentTmdbPilot.open(directory, { networkEnabled: true, sender });
    try {
      await assert.rejects(session.get(second), /IMPORT_HALTED/);
      assert.equal(calls, 1);
      assert.equal(session.summary().length, 1);
    } finally { await session.close(); }
  }
});

test("corrupt or missing checkpoint cannot reset the counter; uncertain reservation blocks network", async () => {
  const directory = await stateDirectory();
  let session = await PersistentTmdbPilot.open(directory, { initialize: true, sender: success });
  await session.close();
  const path = join(directory, "journal.json");
  const envelope = JSON.parse(await readFile(path, "utf8"));
  envelope.data.entries.push({
    endpoint: first, canonicalMovieId: endpointIdentity(first),
    startedAt: new Date().toISOString(), outcome: "reserved",
  });
  envelope.checksum = createHash("sha256").update(JSON.stringify(envelope.data)).digest("hex");
  await writeFile(path, JSON.stringify(envelope));
  let calls = 0;
  session = await PersistentTmdbPilot.open(directory, {
    networkEnabled: true, sender: async () => { calls++; return success(); },
  });
  try { await assert.rejects(session.get(second), /IMPORT_HALTED/); }
  finally { await session.close(); }
  assert.equal(calls, 0);
  await writeFile(path, "{corrupt");
  await assert.rejects(PersistentTmdbPilot.open(directory, { sender: success }), /REQUEST_JOURNAL_UNTRUSTED/);
  assert.equal(await readFile(path, "utf8"), "{corrupt");
  await assert.rejects(PersistentTmdbPilot.open(await stateDirectory(), { sender: success }), /ENOENT/);
});

test("concurrent dispatch is blocked before calling the transport", async () => {
  const directory = await stateDirectory();
  let finish;
  let entered;
  const transportEntered = new Promise((resolve) => { entered = resolve; });
  const session = await PersistentTmdbPilot.open(directory, {
    initialize: true, networkEnabled: true,
    sender: () => { entered(); return new Promise((resolve) => { finish = resolve; }); },
  });
  try {
    const pending = session.get(first);
    await transportEntered;
    await assert.rejects(session.get(second), /CONCURRENT_GET_FORBIDDEN/);
    finish(await success());
    await pending;
    assert.equal(session.summary().length, 1);
  } finally { await session.close(); }
});

test("provider details reject wrong series ID and duplicate season numbers", () => {
  assert.throws(() => inspectDetails({ id: 999 }, 4613), /IDENTITY_MISMATCH/);
  assert.throws(() => inspectDetails({
    id: 4613, seasons: [
      { id: 1, season_number: 1, episode_count: 1 },
      { id: 2, season_number: 1, episode_count: 1 },
    ],
  }, 4613), /DUPLICATE_PROVIDER_SEASON/);
});

// Synthetic episodes stay exclusively in tests, never in exported snapshots.
function normalizationFixture() {
  const { entry, identity } = verifyLocalPilotIdentities()[0];
  const observedAt = "2026-10-18T08:00:00.000Z";
  const wrap = (endpoint, payload) => ({
    endpoint, payload, canonicalMovieId: entry.canonicalMovieId, status: 200, observedAt,
  });
  const episode = (number, season, name, airDate = null) => ({
    id: 100 + season * 10 + number, show_id: entry.tmdbId, season_number: season,
    episode_number: number, name, air_date: airDate,
  });
  const responses = [
    wrap(first, { id: entry.tmdbId, original_language: "en", status: "Ended", first_air_date: "2001-09-09",
      number_of_seasons: 1, number_of_episodes: 2,
      seasons: [{ id: 1, season_number: 0, episode_count: 1 }, { id: 2, season_number: 1, episode_count: 2 }],
    }),
    wrap("/3/tv/4613/season/0?language=ru-RU", { id: 1, season_number: 0, episodes: [episode(1, 0, "Эпизод 1")] }),
    wrap("/3/tv/4613/season/0?language=en-US", { id: 1, season_number: 0, episodes: [episode(1, 0, "Special")] }),
    wrap("/3/tv/4613/season/1?language=ru-RU", { id: 2, season_number: 1, episodes: [episode(1, 1, "Первый", "2001-09-09"), episode(2, 1, "English fallback")] }),
    wrap("/3/tv/4613/season/1?language=en-US", { id: 2, season_number: 1, episodes: [episode(1, 1, "First", "2001-09-09"), episode(2, 1, "Second")] }),
  ];
  return { entry, identity, responses, baseline: { seasons: 1, episodes: 2, releaseStatus: "ended", releaseDate: "2001-09-09" } };
}

test("normalizer separates specials, rejects generic/fallback Russian titles and preserves optional dates", () => {
  const { entry, identity, responses, baseline } = normalizationFixture();
  const result = buildPilotSnapshot(entry, identity, baseline, responses);
  assert.equal(result.snapshot.verificationStatus, "verified_complete");
  assert.equal(result.snapshot.regularSeasons[0].episodes.length, 2);
  assert.equal(result.snapshot.specials.length, 1);
  assert.equal(result.snapshot.specials[0].russianTitle, undefined);
  assert.equal(result.snapshot.regularSeasons[0].episodes[1].russianTitle, undefined);
  assert.equal(result.snapshot.regularSeasons[0].episodes[1].airDate, undefined);
  assert.equal(result.omissions.length, 2);
  assert.deepEqual(result.conflicts, []);
  assert.deepEqual(buildPilotSnapshot(entry, identity, baseline, [...responses].reverse()), result);
  assert.equal(normalizeEpisodeGuideSnapshot(result.snapshot).checksum, result.snapshot.checksum);
});

test("foreign series, wrong season/episode identity and duplicates fail closed", () => {
  for (const mutate of [
    (fixture) => { fixture.responses[0].payload.id = 999; },
    (fixture) => { fixture.responses[3].payload.id = 999; },
    (fixture) => { fixture.responses[3].payload.episodes[0].show_id = 999; },
    (fixture) => { fixture.responses[3].payload.episodes[0].season_number = 0; },
    (fixture) => { fixture.responses[3].payload.episodes[0].episode_number = -1; },
    (fixture) => { fixture.responses[3].payload.episodes[1].episode_number = 1; },
    (fixture) => { fixture.responses[3].payload.episodes[0].id = 999; },
    (fixture) => { fixture.responses[3].payload.episodes[0].air_date = "2001-02-30"; },
  ]) {
    const fixture = normalizationFixture();
    mutate(fixture);
    assert.throws(() => buildPilotSnapshot(fixture.entry, fixture.identity, fixture.baseline, fixture.responses));
  }
});

test("incomplete loading and catalog conflicts retain partial status without modifying the baseline", () => {
  const fixture = normalizationFixture();
  const before = structuredClone(fixture);
  const incomplete = buildPilotSnapshot(fixture.entry, fixture.identity, fixture.baseline,
    fixture.responses.filter((response) => !response.endpoint.includes("/season/0")));
  assert.equal(incomplete.snapshot.verificationStatus, "verified_partial");
  assert.equal(incomplete.snapshot.completeness.expectedSpecialEpisodeCount, 1);
  assert.equal(incomplete.snapshot.specials.length, 0);
  const baseline = { ...fixture.baseline, episodes: 9 };
  const conflicting = buildPilotSnapshot(fixture.entry, fixture.identity, baseline, fixture.responses);
  assert.equal(conflicting.snapshot.verificationStatus, "verified_partial");
  assert.ok(conflicting.conflicts.some((conflict) => conflict.field === "regularEpisodeCount"));
  assert.deepEqual(fixture, before);
  assert.equal(baseline.episodes, 9);
  const falseComplete = normalizeEpisodeGuideSnapshot({
    ...incomplete.snapshot, verificationStatus: "verified_complete",
    completeness: { ...incomplete.snapshot.completeness, status: "complete" },
  });
  assert.equal(verifyEpisodeGuideSnapshot(falseComplete, fixture.identity).valid, false);
});

test("English translations are not called original when source language is not English", () => {
  const fixture = normalizationFixture();
  fixture.responses[0].payload.original_language = "ja";
  const { snapshot } = buildPilotSnapshot(fixture.entry, fixture.identity, fixture.baseline, fixture.responses);
  assert.equal(snapshot.sourceLanguage, "ja");
  assert.ok([...snapshot.specials, ...snapshot.regularSeasons.flatMap((season) => season.episodes)]
    .every((episode) => episode.originalTitle === undefined));
});

test("E.2 snapshots remain available after E.3 activation; checksum and isolation hold", async () => {
  const { episodeGuideSnapshotManifest } = requireLocal("../../src/app/lib/episodeGuides/manifest.ts");
  const { loadEpisodeGuideSnapshot } = requireLocal("../../src/app/lib/episodeGuides/loader.ts");
  const { computeEpisodeGuideChecksum } = requireLocal("../../src/app/lib/episodeGuides/checksum.ts");
  const available = Object.entries(episodeGuideSnapshotManifest).filter(([, entry]) => entry.status === "available");
  assert.deepEqual(available.map(([id]) => id).sort(), [
    "01c49b47-8e78-48c7-a718-ec2c06824aa1", "174f15d5-abe2-433e-9e8e-e65c61391ca2",
    "42989ff4-cd94-4f82-a7b0-7d75b3a73fe5", "bc84cfc1-a6fb-4bc0-9661-24fca39c6363",
    "c5cf7ec6-d093-43b0-84b8-9f903c332451",
  ]);
  assert.equal(Object.values(episodeGuideSnapshotManifest).filter((entry) => entry.status === "planned").length, 5);
  assert.equal(Object.values(episodeGuideSnapshotManifest).filter((entry) => entry.status === "prepared").length, 0);
  for (const { entry, identity, movie } of verifyLocalPilotIdentities()) {
    const snapshot = await loadEpisodeGuideSnapshot(entry.canonicalMovieId);
    assert.ok(snapshot);
    assert.equal(snapshot.verificationStatus, "verified_complete");
    assert.equal(snapshot.sourceLanguage, "en");
    assert.equal(snapshot.checksum, computeEpisodeGuideChecksum(snapshot));
    assert.equal(snapshot.checksum, normalizeEpisodeGuideSnapshot(snapshot).checksum);
    assert.equal(verifyEpisodeGuideSnapshot(snapshot, identity).valid, true);
    const regular = snapshot.regularSeasons.flatMap((season) => season.episodes);
    assert.equal(regular.length, entry.localExpectedRegularEpisodes);
    assert.equal(regular.filter((episode) => episode.russianTitle).length, regular.length);
    assert.equal(snapshot.specials.length, entry.tmdbId === 4613 ? 6 : 5);
    assert.equal(snapshot.specials.filter((episode) => episode.russianTitle).length, entry.tmdbId === 4613 ? 3 : 0);
    assert.ok([...regular, ...snapshot.specials].every((episode) => episode.airDate && episode.originalTitle));
    assert.equal(movie.episodeGuide, undefined);
  }
  for (const [id, entry] of Object.entries(episodeGuideSnapshotManifest)) {
    if (entry.status !== "available") assert.equal(await loadEpisodeGuideSnapshot(id), null);
  }
});
