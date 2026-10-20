import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import https from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { requireLocal } from "./register-local.mjs";

globalThis.fetch = async () => { throw new Error("REAL_FETCH_FORBIDDEN_IN_E3_TESTS"); };
https.request = () => { throw new Error("REAL_HTTPS_FORBIDDEN_IN_E3_TESTS"); };

const {
  E3_BUDGET,
  E3_IDS,
  E3_SERIES_BUDGETS,
  PersistentTmdbE3Pilot,
  createTmdbSender,
  endpointIdentity,
  endpointTmdbId,
} = requireLocal("./e3Transport.ts");
const {
  detailsEndpoint,
  initialPlan,
  inspectDetails,
  verifyLocalPilotIdentities,
} = requireLocal("./e3Import.ts");
const { buildE3PilotSnapshot } = requireLocal("./e3Normalize.ts");
const { normalizeEpisodeGuideSnapshot } = requireLocal("../../src/app/lib/episodeGuides/normalizer.ts");
const { verifyEpisodeGuideSnapshot } = requireLocal("../../src/app/lib/episodeGuides/verifier.ts");

const first = "/3/tv/246?language=ru-RU";
const second = "/3/tv/41727?language=ru-RU";
async function stateDirectory() {
  return join(await mkdtemp(join(tmpdir(), "kinoluma-e3-test-")), "state");
}
const success = async () => ({ status: 200, payload: { fixture: true } });

test("E.3 identities and the conservative bilingual plan are exact and allowlisted", () => {
  assert.equal(verifyLocalPilotIdentities().length, 3);
  assert.equal(initialPlan().length, 27);
  assert.equal(new Set(initialPlan()).size, 27);
  assert.equal(E3_BUDGET, 33);
  assert.deepEqual(E3_SERIES_BUDGETS, { 246: 11, 41727: 13, 66292: 9 });
  for (const endpoint of initialPlan()) assert.ok(endpointIdentity(endpoint));
  for (const endpoint of [
    "/3/tv/4613?language=ru-RU",
    "/3/search/tv?query=Banshee",
    first + "&append_to_response=images",
    "/3/tv/246/season/1?language=ja-JP",
    "https://example.com",
  ]) assert.throws(() => endpointIdentity(endpoint), /NOT_ALLOWLISTED/);
});

test("all three identities match one canonical registry entry and one local card", () => {
  for (const { entry, identity, movie } of verifyLocalPilotIdentities()) {
    assert.equal(identity.canonicalMovieId, entry.canonicalMovieId);
    assert.equal(identity.slug, entry.slug);
    assert.equal(identity.tmdbNamespace, "tv");
    assert.equal(identity.tmdbId, entry.tmdbId);
    assert.equal(movie.releaseStatus, "ended");
    assert.equal(movie.seasons, entry.localExpectedRegularSeasons);
    assert.equal(movie.episodes, entry.localExpectedRegularEpisodes);
    assert.equal(movie.episodeGuide, undefined);
  }
});

test("native transport pins TMDB, GET and the Bearer credential", async (context) => {
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

test("write-ahead journal, cache, resume and lock preserve the E.3 budget", async () => {
  const directory = await stateDirectory();
  let calls = 0;
  const sender = async () => {
    const saved = JSON.parse(await readFile(join(directory, "journal.json"), "utf8"));
    assert.equal(saved.data.authorization, "E3-three-series-33-GET");
    assert.equal(saved.data.entries.at(-1).outcome, "reserved");
    assert.equal(saved.data.entries.length, ++calls);
    return success();
  };
  let session = await PersistentTmdbE3Pilot.open(directory, {
    initialize: true,
    networkEnabled: true,
    sender,
  });
  try {
    await session.get(first);
    await session.get(first);
    assert.equal(calls, 1);
  } finally { await session.close(); }
  session = await PersistentTmdbE3Pilot.open(directory, { networkEnabled: true, sender });
  try {
    await session.get(first);
    await session.get(second);
    assert.equal(calls, 2);
    await assert.rejects(
      PersistentTmdbE3Pilot.open(directory, { networkEnabled: true, sender }),
      /EEXIST/,
    );
  } finally { await session.close(); }
});

test("offline mode, total budget and per-series ceilings block before transport", async () => {
  const directory = await stateDirectory();
  let calls = 0;
  const sender = async () => { calls++; return success(); };
  const session = await PersistentTmdbE3Pilot.open(directory, { initialize: true, sender });
  try {
    await assert.rejects(session.get(first), /Network is disabled/);
    assert.equal(calls, 0);
    const avatarOverPlan = [
      detailsEndpoint(246),
      ...Array.from({ length: 6 }, (_, season) => [
        `/3/tv/246/season/${season}?language=ru-RU`,
        `/3/tv/246/season/${season}?language=en-US`,
      ]).flat(),
    ];
    assert.throws(() => session.assertPlan(avatarOverPlan), /SERIES_BUDGET/);
    assert.equal(calls, 0);
  } finally { await session.close(); }
});

test("HTTP failures and uncertain dispatch count once and stop resume", async () => {
  for (const response of [
    { status: 401 },
    { status: 403 },
    { status: 429, retryAfter: "5" },
    { status: 500 },
    null,
  ]) {
    const directory = await stateDirectory();
    let calls = 0;
    const sender = async () => {
      calls++;
      if (!response) throw new Error("private transport details must not leak");
      return { payload: null, ...response };
    };
    let session = await PersistentTmdbE3Pilot.open(directory, {
      initialize: true,
      networkEnabled: true,
      sender,
    });
    try {
      await assert.rejects(session.get(first), /TMDB_HTTP_|TMDB_NETWORK_ERROR/);
      if (response?.status === 429) assert.equal(session.summary()[0].retryAfterMs, 5000);
    } finally { await session.close(); }
    session = await PersistentTmdbE3Pilot.open(directory, { networkEnabled: true, sender });
    try {
      await assert.rejects(session.get(second), /IMPORT_HALTED/);
      assert.equal(calls, 1);
      assert.equal(session.summary().length, 1);
    } finally { await session.close(); }
  }
});

test("corruption and an uncertain reservation cannot reset the E.3 journal", async () => {
  const directory = await stateDirectory();
  let session = await PersistentTmdbE3Pilot.open(directory, { initialize: true, sender: success });
  await session.close();
  const path = join(directory, "journal.json");
  const envelope = JSON.parse(await readFile(path, "utf8"));
  envelope.data.entries.push({
    endpoint: first,
    canonicalMovieId: endpointIdentity(first),
    startedAt: new Date().toISOString(),
    outcome: "reserved",
  });
  envelope.checksum = createHash("sha256").update(JSON.stringify(envelope.data)).digest("hex");
  await writeFile(path, JSON.stringify(envelope));
  let calls = 0;
  session = await PersistentTmdbE3Pilot.open(directory, {
    networkEnabled: true,
    sender: async () => { calls++; return success(); },
  });
  try { await assert.rejects(session.get(second), /IMPORT_HALTED/); }
  finally { await session.close(); }
  assert.equal(calls, 0);
  await writeFile(path, "{corrupt");
  await assert.rejects(
    PersistentTmdbE3Pilot.open(directory, { sender: success }),
    /REQUEST_JOURNAL_UNTRUSTED/,
  );
  assert.equal(await readFile(path, "utf8"), "{corrupt");
});

test("provider details reject a wrong identity and duplicate season numbers", () => {
  assert.throws(() => inspectDetails({ id: 999 }, 246), /IDENTITY_MISMATCH/);
  assert.throws(() => inspectDetails({
    id: 246,
    seasons: [
      { id: 1, season_number: 1, episode_count: 1 },
      { id: 2, season_number: 1, episode_count: 1 },
    ],
  }, 246), /DUPLICATE_PROVIDER_SEASON/);
});

function normalizationFixture() {
  const { entry, identity } = verifyLocalPilotIdentities()[0];
  const observedAt = "2026-10-19T08:00:00.000Z";
  const wrap = (endpoint, payload) => ({
    endpoint,
    payload,
    canonicalMovieId: entry.canonicalMovieId,
    status: 200,
    observedAt,
  });
  const episode = (number, season, name, airDate = null) => ({
    id: 100 + season * 10 + number,
    show_id: entry.tmdbId,
    season_number: season,
    episode_number: number,
    name,
    air_date: airDate,
  });
  const responses = [
    wrap(first, {
      id: entry.tmdbId,
      original_language: "en",
      status: "Ended",
      first_air_date: "2005-02-21",
      number_of_seasons: 1,
      number_of_episodes: 2,
      seasons: [
        { id: 1, season_number: 0, episode_count: 1 },
        { id: 2, season_number: 1, episode_count: 2 },
      ],
    }),
    wrap("/3/tv/246/season/0?language=ru-RU", {
      id: 1, season_number: 0, episodes: [episode(1, 0, "Эпизод 1")],
    }),
    wrap("/3/tv/246/season/0?language=en-US", {
      id: 1, season_number: 0, episodes: [episode(1, 0, "Special")],
    }),
    wrap("/3/tv/246/season/1?language=ru-RU", {
      id: 2,
      season_number: 1,
      episodes: [episode(1, 1, "Первый", "2005-02-21"), episode(2, 1, "English fallback")],
    }),
    wrap("/3/tv/246/season/1?language=en-US", {
      id: 2,
      season_number: 1,
      episodes: [episode(1, 1, "First", "2005-02-21"), episode(2, 1, "Second")],
    }),
  ];
  return {
    entry,
    identity,
    responses,
    baseline: { seasons: 1, episodes: 2, releaseStatus: "ended", releaseDate: "2005-02-21" },
  };
}

test("E.3 normalization keeps specials, optional dates, provenance and deterministic checksums", () => {
  const fixture = normalizationFixture();
  const result = buildE3PilotSnapshot(
    fixture.entry,
    fixture.identity,
    fixture.baseline,
    fixture.responses,
  );
  assert.equal(result.snapshot.verificationStatus, "verified_complete");
  assert.equal(result.snapshot.specials.length, 1);
  assert.equal(result.snapshot.specials[0].russianTitle, undefined);
  assert.equal(result.snapshot.regularSeasons[0].episodes[1].russianTitle, undefined);
  assert.equal(result.snapshot.regularSeasons[0].episodes[1].airDate, undefined);
  assert.equal(result.snapshot.sourceLanguage, "en");
  assert.equal(result.verification.valid, true);
  assert.deepEqual(result.conflicts, []);
  assert.deepEqual(
    buildE3PilotSnapshot(
      fixture.entry,
      fixture.identity,
      fixture.baseline,
      [...fixture.responses].reverse(),
    ),
    result,
  );
  assert.equal(normalizeEpisodeGuideSnapshot(result.snapshot).checksum, result.snapshot.checksum);
  assert.equal(verifyEpisodeGuideSnapshot(result.snapshot, fixture.identity).valid, true);
});

test("non-English source does not promote en-US translations to original titles", () => {
  const fixture = normalizationFixture();
  fixture.responses[0].payload.original_language = "ja";
  const { snapshot } = buildE3PilotSnapshot(
    fixture.entry,
    fixture.identity,
    fixture.baseline,
    fixture.responses,
  );
  assert.ok([
    ...snapshot.specials,
    ...snapshot.regularSeasons.flatMap((season) => season.episodes),
  ].every((episode) => episode.originalTitle === undefined));
});

test("endpoint attribution is stable for all allowed provider IDs", () => {
  for (const [tmdbId, canonicalMovieId] of Object.entries(E3_IDS)) {
    const endpoint = detailsEndpoint(Number(tmdbId));
    assert.equal(endpointTmdbId(endpoint), Number(tmdbId));
    assert.equal(endpointIdentity(endpoint), canonicalMovieId);
  }
});

test("activated E.3 snapshots remain verified and absent from catalog entries", async () => {
  const { episodeGuideSnapshotManifest } = requireLocal("../../src/app/lib/episodeGuides/manifest.ts");
  const { loadEpisodeGuideSnapshot } = requireLocal("../../src/app/lib/episodeGuides/loader.ts");
  const { computeEpisodeGuideChecksum } = requireLocal("../../src/app/lib/episodeGuides/checksum.ts");
  const checksums = {
    "42989ff4-cd94-4f82-a7b0-7d75b3a73fe5": "sha256:c011de3cdad66c068a2d30fbd536b22176ca8bd7a0c686272285dfd72b9436e9",
    "bc84cfc1-a6fb-4bc0-9661-24fca39c6363": "sha256:90746725ae921f51ad6b0c52cf74f49bf5d146764d11746996f0c3194ed804eb",
    "c5cf7ec6-d093-43b0-84b8-9f903c332451": "sha256:b157da26e76ff3b8e1fff5965fdfceb7cc2a945a6936cd32752f58290f5ea2cf",
  };
  for (const { entry, identity, movie } of verifyLocalPilotIdentities()) {
    const manifestEntry = episodeGuideSnapshotManifest[entry.canonicalMovieId];
    assert.equal(manifestEntry.status, "available");
    const { episodeGuideSnapshot } = requireLocal(
      `../../src/app/lib/episodeGuides/snapshots/${entry.canonicalMovieId}.ts`,
    );
    assert.equal(await loadEpisodeGuideSnapshot(entry.canonicalMovieId), episodeGuideSnapshot);
    assert.equal(episodeGuideSnapshot.checksum, checksums[entry.canonicalMovieId]);
    assert.equal(episodeGuideSnapshot.checksum, computeEpisodeGuideChecksum(episodeGuideSnapshot));
    assert.equal(normalizeEpisodeGuideSnapshot(episodeGuideSnapshot).checksum, episodeGuideSnapshot.checksum);
    assert.equal(verifyEpisodeGuideSnapshot(episodeGuideSnapshot, identity).valid, true);
    const regular = episodeGuideSnapshot.regularSeasons.flatMap((season) => season.episodes);
    assert.equal(regular.length, entry.localExpectedRegularEpisodes);
    assert.equal(regular.filter((episode) => episode.russianTitle).length, regular.length);
    assert.equal(movie.episodeGuide, undefined);
  }
});
