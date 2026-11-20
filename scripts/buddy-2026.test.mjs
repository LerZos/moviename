import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import ts from "typescript";

import { searchCatalog } from "../src/app/lib/search/searchEngine.ts";

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

const { manualBuddyAddition: movie } = loadLocalTypeScript("src/app/data/manualBuddyAddition.ts");
const { normalizeCatalogCredits } = loadLocalTypeScript("src/app/lib/movies/credits.ts");

assert.equal(movie.id, 950002);
assert.equal(movie.slug, "buddy-2026");
assert.equal(movie.title, "Бадди");
assert.equal(movie.originalTitle, "Buddy");
assert.equal(movie.type, "Фильм");
assert.equal(movie.year, "2026");
assert.equal(movie.tmdbNamespace, "movie");
assert.equal(movie.tmdbId, 1514026);
assert.equal(movie.imdbId, "tt37281055");
assert.equal(movie.kinopoiskId, 8549783);
assert.equal(movie.runtime, 96);
assert.equal(movie.releaseDate, "2026-08-28");
assert.equal(movie.rating, 6.6);
assert.deepEqual(movie.genres, ["Ужасы", "Комедия", "Фэнтези"]);
assert.equal(movie.seasons, undefined);
assert.equal(movie.episodes, undefined);
// Players come from the standard Kinopoisk fallback chain in movies.ts.
assert.equal(movie.players, undefined);
assert.ok(movie.poster.endsWith("/1BdZbNvl1SfrrX8J9X5tQzN6Ivu.jpg"));
assert.ok(movie.backdrop.endsWith("/i8Y6RYLaeoYXP8ncDjyCpp5ttFv.jpg"));
assert.equal(movie.trailerUrl, "https://www.youtube.com/embed/0mil0YgOtu8");
assert.ok(movie.facts.some((fact) => fact.label === "Сценарий" && fact.value === "Каспер Келли, Джейми Кинг"));

const credits = normalizeCatalogCredits(movie);
assert.deepEqual(credits.directors, ["Каспер Келли"]);
assert.equal(credits.seriesCreators.length, 0);
for (const name of ["Кристин Милиоти", "Дилейни Куинн", "Тофер Грейс", "Киган-Майкл Кей", "Майкл Шеннон", "Пэттон Освальт"]) {
  assert.ok(credits.actors.some((person) => person.name === name), name);
}

// The identity must be new: no other catalog source may carry this film's IDs or slug.
const dataDir = new URL("src/app/data/", root);
const ownFiles = new Set([
  "manualBuddyAddition.ts",
  "manualCanonicalMovieAdditions.ts",
  "movieCardIndex.ts",
  "profileCatalogItems.ts",
]);
for (const file of readdirSync(dataDir)) {
  if (ownFiles.has(file) || !/\.(ts|json)$/.test(file)) continue;
  const text = readFileSync(new URL(file, dataDir), "utf8");
  assert.doesNotMatch(text, /tt37281055|\b1514026\b|\b8549783\b|"buddy-2026"|\b950002\b/, file);
}
for (const path of [
  "src/app/data/manualCanonicalMovieAdditions.ts",
  "src/app/data/movieCardIndex.ts",
  "src/app/data/profileCatalogItems.ts",
]) {
  const text = readFileSync(new URL(path, root), "utf8");
  assert.equal((text.match(/"buddy-2026"/g) ?? []).length, 1, path);
}

const generatedRegistry = loadLocalTypeScript("src/app/data/generatedCanonicalMovieRegistry.ts");
const manualRegistry = loadLocalTypeScript("src/app/data/manualCanonicalMovieAdditions.ts");
const identity = loadLocalTypeScript("src/app/data/canonicalIdentity.ts", {
  "./generatedCanonicalMovieRegistry": generatedRegistry,
  "./manualCanonicalMovieAdditions": manualRegistry,
});
const tuple = manualRegistry.manualCanonicalMovieAdditions.find((entry) => entry[1] === movie.slug);
assert.deepEqual([...tuple.slice(1)], ["buddy-2026", 950002, "film", "movie", 1514026, "tt37281055", 8549783]);
const canonicalMovieId = tuple[0];
assert.equal(identity.getCanonicalIdentityBySlug(movie.slug)?.canonicalMovieId, canonicalMovieId);
assert.equal(identity.resolveCanonicalIdentityFromLegacyId(movie.id).identity?.canonicalMovieId, canonicalMovieId);
assert.equal(identity.resolveCanonicalIdentityFromTmdb("movie", movie.tmdbId).identity?.canonicalMovieId, canonicalMovieId);
assert.equal(identity.resolveCanonicalIdentityFromTmdb("tv", movie.tmdbId).status, "not_found");
assert.equal(identity.resolveCanonicalIdentityFromImdb(movie.imdbId).identity?.canonicalMovieId, canonicalMovieId);
assert.equal(identity.resolveCanonicalIdentityFromKinopoisk(movie.kinopoiskId).identity?.canonicalMovieId, canonicalMovieId);
// The 100 keeps its identity and position.
assert.equal(manualRegistry.manualCanonicalMovieAdditions[0][1], "the-100-2014");

const decoy = {
  id: 1,
  slug: "buddy-2003",
  title: "Бадди",
  originalTitle: "Buddy",
  searchTitles: [],
  type: "Фильм",
  year: "2003",
  rating: 6.0,
  genres: ["Комедия"],
};
const catalog = [decoy, { ...movie, canonicalMovieId }];
for (const query of ["Бадди", "бадди", "Buddy", "buddy 2026", "Бадди 2026", "Приятель"]) {
  const results = searchCatalog(catalog, query, { limit: 5 });
  assert.ok(results.some((item) => item.slug === "buddy-2026"), query);
}
assert.equal(searchCatalog(catalog, "buddy 2026", { limit: 5 })[0].slug, "buddy-2026");

console.log("BUDDY_2026_IDENTITY_CREDITS_SEARCH=PASS");
