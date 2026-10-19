import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { test } from "node:test";
import { requireLocal } from "./register-local.mjs";

// Never import the real DB client or permit transport in these fixture tests.
let networkAttempts = 0;
const forbidNetwork = () => { networkAttempts++; throw new Error("NETWORK_FORBIDDEN"); };
globalThis.fetch = forbidNetwork;
http.request = http.get = https.request = https.get = forbidNetwork;
process.env.KINOLUMA_LOAD_PUBLISHED_DRAFTS = "false";
process.env.KINOLUMA_DISABLE_SUPABASE_DURING_BUILD = "false";

const ts = requireLocal("typescript");
const catalog = requireLocal("../../src/app/data/movies.ts");
const canonical = requireLocal("../../src/app/data/canonicalIdentity.ts");
const loader = requireLocal("../../src/app/lib/episodeGuides/loader.ts");
const { episodeGuideSnapshotManifest: manifest } = requireLocal("../../src/app/lib/episodeGuides/manifest.ts");
const integration = requireLocal("../../src/app/lib/episodeGuides/movieIntegration.ts");
const normalizer = requireLocal("../../src/app/lib/episodeGuides/normalizer.ts");
const { computeEpisodeGuideChecksum } = requireLocal("../../src/app/lib/episodeGuides/checksum.ts");
const { verifyEpisodeGuideSnapshot } = requireLocal("../../src/app/lib/episodeGuides/verifier.ts");
const pilots = [
  { id: "01c49b47-8e78-48c7-a718-ec2c06824aa1", seasons: 1, episodes: 10, specials: 6,
    checksum: "sha256:a7269e8832e1603c97415355542d7cf9bf7fd346eeb92b21367ba424c5bc8c5a" },
  { id: "174f15d5-abe2-433e-9e8e-e65c61391ca2", seasons: 2, episodes: 24, specials: 5,
    checksum: "sha256:39bfdaf2a4fb4331dad448abe2925941e75a424285539dc3f053e21e97ff2ce8" },
];
const movieFor = (id) => catalog.movies.find((movie) => movie.canonicalMovieId === id);

function withDependencies(relativeFile, modules) {
  const source = readFileSync(new URL(relativeFile, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const result = { exports: {} };
  new Function("require", "module", "exports", compiled)((id) => {
    assert.ok(Object.hasOwn(modules, id), `Unexpected dependency: ${id}`);
    return modules[id];
  }, result, result.exports);
  return result.exports;
}

test("catalog imports no snapshots; manifest has exactly two lazy available entries", () => {
  assert.equal(Object.keys(requireLocal.cache).filter((path) => /episodeGuides[/\\]snapshots[/\\]/.test(path)).length, 0);
  assert.deepEqual(Object.entries(manifest).filter(([, entry]) => entry.status === "available").map(([id]) => id).sort(), pilots.map(({ id }) => id).sort());
  assert.equal(Object.values(manifest).filter((entry) => entry.status === "planned").length, 8);
  for (const { id } of pilots) assert.equal(movieFor(id).episodeGuide, undefined);
});

for (const pilot of pilots) test(`canonical detail integration + pinned checksum: ${pilot.id}`, async () => {
  const base = movieFor(pilot.id);
  const snapshot = await loader.loadEpisodeGuideSnapshot(pilot.id);
  const loadedIds = Object.keys(requireLocal.cache)
    .filter((path) => /episodeGuides[/\\]snapshots[/\\]/.test(path))
    .map((path) => path.split(/[/\\]/).at(-1).replace(/\.ts$/, "")).sort();
  assert.deepEqual(loadedIds, pilots.slice(0, pilots.indexOf(pilot) + 1).map(({ id }) => id).sort());
  assert.equal(snapshot.checksum, pilot.checksum);
  assert.equal(computeEpisodeGuideChecksum(snapshot), pilot.checksum);
  assert.equal(verifyEpisodeGuideSnapshot(snapshot, canonical.getCanonicalIdentityById(pilot.id)).valid, true);
  const detail = await integration.attachVerifiedEpisodeGuide(base);
  assert.equal(detail.episodeGuide.length, pilot.seasons);
  assert.equal(detail.episodeGuide.reduce((sum, season) => sum + season.episodes.length, 0), pilot.episodes);
  assert.ok(detail.episodeGuide.every((season) => season.season > 0));
  assert.equal(detail.episodeSpecials.length, pilot.specials);
  assert.deepEqual(detail.episodeSpecials.map((episode) => episode.number), snapshot.specials.map((episode) => episode.episodeNumber));
  for (const field of ["canonicalMovieId", "slug", "tmdbNamespace", "tmdbId", "imdbId", "kinopoiskId", "seasons", "episodes"])
    assert.equal(detail[field], base[field], field);
  assert.equal(base.episodeGuide, undefined);
  detail.episodeGuide[0].episodes[0].russianTitle = "Fixture mutation";
  assert.notEqual((await integration.attachVerifiedEpisodeGuide(base)).episodeGuide[0].episodes[0].russianTitle, "Fixture mutation");
});

test("no slug/provider fallback; reject conflicting TV/provider identity", async () => {
  const base = movieFor(pilots[0].id);
  const withoutId = { ...base, canonicalMovieId: undefined };
  assert.equal(await integration.attachVerifiedEpisodeGuide(withoutId), withoutId);
  for (const [change, issue] of [
    [{ tmdbNamespace: "movie" }, "MOVIE_NAMESPACE_NOT_TV"],
    [{ tmdbId: 83867 }, "MOVIE_PROVIDER_ID_MISMATCH"],
    [{ slug: "andor" }, "MOVIE_SLUG_MISMATCH"],
  ]) await assert.rejects(integration.attachVerifiedEpisodeGuide({ ...base, ...change }), (error) => error.issueCodes.includes(issue));
  for (const [id, entry] of Object.entries(manifest)) if (entry.status === "planned") {
    const movie = movieFor(id);
    assert.equal(await integration.attachVerifiedEpisodeGuide(movie), movie);
  }
});

test("validated fixture preserves absent dates/titles and sparse special numbers", async () => {
  const base = movieFor(pilots[0].id);
  const snapshot = await loader.loadEpisodeGuideSnapshot(base.canonicalMovieId);
  const input = structuredClone(snapshot);
  delete input.regularSeasons[0].episodes[0].airDate;
  delete input.specials[0].airDate;
  delete input.specials[0].russianTitle;
  delete input.specials[0].originalTitle;
  input.specials.at(-1).episodeNumber = 99;
  const fixture = normalizer.normalizeEpisodeGuideSnapshot(input);
  const fixtureLoader = loader.createEpisodeGuideSnapshotLoader({
    [base.canonicalMovieId]: { ...manifest[base.canonicalMovieId], load: async () => ({ episodeGuideSnapshot: fixture }) },
  }, canonical.getCanonicalIdentityById);
  const isolated = withDependencies("../../src/app/lib/episodeGuides/movieIntegration.ts", {
    "server-only": {}, "../../data/canonicalIdentity": canonical,
    "./loader": { ...loader, loadEpisodeGuideSnapshot: fixtureLoader },
  });
  const detail = await isolated.attachVerifiedEpisodeGuide(base);
  assert.equal(Object.hasOwn(detail.episodeGuide[0].episodes[0], "airDate"), false);
  assert.deepEqual(detail.episodeSpecials[0], { number: input.specials[0].episodeNumber });
  assert.equal(detail.episodeSpecials.at(-1).number, 99);
});

test("actual existing merge pipeline keeps manual overrides and later credits enrichment", async () => {
  const fixtures = new Map();
  const events = [];
  const realCredits = requireLocal("../../src/app/lib/movies/verifiedCredits.ts");
  const overrides = withDependencies("../../src/app/lib/movies/movieOverrides.ts", {
    react: { cache: (fn) => fn }, "../../data/movies": catalog,
    "../supabase/admin": {
      hasRealSupabaseAdminCredentials: () => true,
      getSupabaseAdmin: () => ({ from(table) {
        assert.equal(table, "movie_overrides");
        return { select(columns) {
          assert.equal(columns, "data");
          return { eq(field, slug) {
            assert.equal(field, "slug");
            return { maybeSingle: async () => ({ data: { data: fixtures.get(slug) }, error: null }) };
          } };
        } };
      } }),
    },
    "./rating": requireLocal("../../src/app/lib/movies/rating.ts"),
    "../episodeGuides/movieIntegration": { async attachVerifiedEpisodeGuide(movie) {
      assert.equal(movie.episodeGuide, undefined);
      assert.equal(movie.episodes, movieFor(movie.canonicalMovieId).episodes);
      events.push("snapshot");
      return integration.attachVerifiedEpisodeGuide(movie);
    } },
    "./verifiedCredits": { attachVerifiedCredits(movie, override) {
      events.push("credits");
      if (override?.episodeGuide) assert.deepEqual(movie.episodeGuide, override.episodeGuide);
      return realCredits.attachVerifiedCredits(movie, override);
    } },
  });
  for (const { id } of pilots) {
    const base = movieFor(id);
    const detail = await overrides.getMovieWithOverrides(base.slug);
    assert.ok(detail.episodeGuide.length);
    const fixture = { episodeGuide: [{ season: 1, episodes: [{ number: 1, russianTitle: "Ручная правка" }] }],
      episodeSpecials: [], seasons: 1, episodes: 1, runtime: 42, rating: 7.3,
      canonicalMovieId: "not-a-canonical-id", slug: "not-the-slug", id: -1,
      facts: [{ label: "Создатель", value: "Manual creator" }],
    };
    fixtures.set(base.slug, fixture);
    const merged = await overrides.getMovieWithOverrides(base.slug);
    assert.deepEqual(merged.episodeGuide, fixture.episodeGuide);
    assert.deepEqual(merged.episodeSpecials, []);
    assert.equal(merged.seasons, 1);
    assert.equal(merged.episodes, 1);
    assert.equal(merged.runtime, 42);
    assert.equal(merged.rating, 7.3);
    assert.ok(merged.facts.some((fact) => fact.label === "Длительность" && fact.value === "42 мин"));
    assert.equal(merged.verifiedCredits, undefined);
    for (const key of ["id", "slug", "canonicalMovieId", "tmdbId", "imdbId", "kinopoiskId"])
      assert.equal(merged[key], base[key]);
    fixtures.set(base.slug, { episodeGuide: [], episodeSpecials: [] });
    const cleared = await overrides.getMovieWithOverrides(base.slug);
    assert.deepEqual(cleared.episodeGuide, []);
    assert.deepEqual(cleared.episodeSpecials, []);
    fixtures.set(base.slug, { episodeGuide: [], episodeSpecials: [], hidden: true });
    assert.equal(await overrides.getMovieWithOverrides(base.slug), null);
  }
  assert.deepEqual(events, Array.from({ length: 6 }, () => ["snapshot", "credits"]).flat());
});

test("The 100 remains unchanged; no network attempts", async () => {
  const base = catalog.movies.find((movie) => movie.slug === "the-100-2014");
  const before = structuredClone(base);
  assert.equal(await integration.attachVerifiedEpisodeGuide(base), base);
  assert.deepEqual(base, before);
  assert.equal(base.episodeGuide.length, 7);
  assert.equal(base.episodeGuide.flatMap((season) => season.episodes).length, 100);
  assert.equal(networkAttempts, 0);
});
