import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const root = new URL("../", import.meta.url);

function loadLocalTypeScript(relativePath, modules = {}) {
  const source = readFileSync(new URL(relativePath, root), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  const requireLocal = (specifier) => {
    if (!(specifier in modules)) throw new Error(`Unexpected import: ${specifier}`);
    return modules[specifier];
  };
  new Function("require", "module", "exports", compiled)(requireLocal, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const { the100EpisodeGuide } = loadLocalTypeScript("src/app/data/manualThe100Episodes.ts");
const { manualThe100Addition: movie } = loadLocalTypeScript(
  "src/app/data/manualThe100Addition.ts",
  { "./manualThe100Episodes": { the100EpisodeGuide } },
);
const { normalizeCatalogCredits } = loadLocalTypeScript("src/app/lib/movies/credits.ts");

assert.deepEqual(the100EpisodeGuide.map((season) => season.episodes.length), [13, 16, 16, 13, 13, 13, 16]);
assert.equal(the100EpisodeGuide.flatMap((season) => season.episodes).length, 100);
assert.equal(the100EpisodeGuide.flatMap((season) => season.episodes)
  .filter((episode) => episode.russianTitle).length, 28);
for (const [index, season] of the100EpisodeGuide.entries()) {
  assert.equal(season.season, index + 1);
  assert.deepEqual(season.episodes.map((episode) => episode.number),
    Array.from({ length: season.episodes.length }, (_, episodeIndex) => episodeIndex + 1));
  for (const episode of season.episodes) {
    assert.match(episode.airDate, /^20(?:1[4-9]|20)-\d{2}-\d{2}$/);
    assert.equal(new Date(`${episode.airDate}T00:00:00Z`).toISOString().slice(0, 10), episode.airDate);
    assert.ok(episode.originalTitle.trim());
    if (episode.russianTitle) assert.ok(episode.russianTitle.trim());
  }
}
assert.equal(the100EpisodeGuide[0].episodes[0].airDate, "2014-03-19");
assert.equal(the100EpisodeGuide[6].episodes[15].airDate, "2020-09-30");
assert.equal(movie.episodeGuide, the100EpisodeGuide);

assert.equal(movie.id, 950001);
assert.equal(movie.slug, "the-100-2014");
assert.equal(movie.type, "Сериал");
assert.equal(movie.tmdbNamespace, "tv");
assert.equal(movie.tmdbId, 48866);
assert.equal(movie.imdbId, "tt2661044");
assert.equal(movie.kinopoiskId, 733493);
assert.equal(movie.seasons, 7);
assert.equal(movie.episodes, 100);
assert.equal(movie.releaseStatus, "Ended");
assert.ok(movie.poster.includes("/wHIMMLFsk32wIzDmawWkYVbxFCS.jpg"));
assert.ok(movie.backdrop.includes("/hTExot1sfn7dHZjGrk0Aiwpntxt.jpg"));
assert.deepEqual(movie.verifiedCredits.seriesCreators, ["Jason Rothenberg"]);
assert.equal(movie.verifiedCredits.directors, undefined);
assert.equal(movie.verifiedCredits.actors.length, 8);
assert.ok(movie.verifiedCredits.actors.every(({ name, role }) => name && role));
const credits = normalizeCatalogCredits(movie);
assert.deepEqual(credits.seriesCreators, ["Jason Rothenberg"]);
assert.equal(credits.directors.length, 0);
assert.equal(credits.actors.length, 8);
assert.equal(credits.voiceActors.length, 0);
assert.equal(credits.characters.length, 0);

const registry = readFileSync(new URL("src/app/data/manualCanonicalMovieAdditions.ts", root), "utf8");
assert.equal((registry.match(/"the-100-2014"/g) ?? []).length, 1);
assert.equal((registry.match(/"tt2661044"/g) ?? []).length, 1);
assert.equal((registry.match(/\b48866\b/g) ?? []).length, 1);
assert.equal((registry.match(/\b733493\b/g) ?? []).length, 1);
const generatedRegistry = loadLocalTypeScript("src/app/data/generatedCanonicalMovieRegistry.ts");
const manualRegistry = loadLocalTypeScript("src/app/data/manualCanonicalMovieAdditions.ts");
assert.equal(generatedRegistry.canonicalMovieRegistry.some((entry) =>
  entry[1] === movie.slug || entry[2] === movie.id ||
  (entry[4] === movie.tmdbNamespace && entry[5] === movie.tmdbId) ||
  entry[6] === movie.imdbId || entry[7] === movie.kinopoiskId), false);
const identity = loadLocalTypeScript("src/app/data/canonicalIdentity.ts", {
  "./generatedCanonicalMovieRegistry": generatedRegistry,
  "./manualCanonicalMovieAdditions": manualRegistry,
});
const canonicalMovieId = manualRegistry.manualCanonicalMovieAdditions[0][0];
assert.equal(identity.getCanonicalIdentityBySlug(movie.slug)?.canonicalMovieId, canonicalMovieId);
assert.equal(identity.resolveCanonicalIdentityFromLegacyId(movie.id).identity?.canonicalMovieId, canonicalMovieId);
assert.equal(identity.resolveCanonicalIdentityFromTmdb("tv", movie.tmdbId).identity?.canonicalMovieId, canonicalMovieId);
assert.equal(identity.resolveCanonicalIdentityFromTmdb("movie", movie.tmdbId).status, "not_found");
assert.equal(identity.resolveCanonicalIdentityFromImdb(movie.imdbId).identity?.canonicalMovieId, canonicalMovieId);
assert.equal(identity.resolveCanonicalIdentityFromKinopoisk(movie.kinopoiskId).identity?.canonicalMovieId, canonicalMovieId);
for (const path of ["src/app/data/movieCardIndex.ts", "src/app/data/profileCatalogItems.ts"]) {
  const index = readFileSync(new URL(path, root), "utf8");
  assert.equal((index.match(/"the-100-2014"/g) ?? []).length, 1, path);
}

console.log("THE_100_IDENTITY_EPISODES_CREDITS=PASS (7 seasons, 100 episodes)");
