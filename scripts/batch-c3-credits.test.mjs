import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const originalLoad = Module._load;
Module._load = function load(request, ...args) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, ...args);
};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    const source = readFileSync(filename, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    });
    module._compile(compiled.outputText, filename);
  };
}
process.env.KINOLUMA_DISABLE_SUPABASE_DURING_BUILD = "true";

const { movies } = require("../src/app/data/movies.ts");
const { generatedCanonicalCredits } = require("../src/app/data/generatedCanonicalCredits.ts");
const { attachVerifiedCredits, getVerifiedCreditsForMovie, hasManualCreditsOverride } = require("../src/app/lib/movies/verifiedCredits.ts");
const { normalizeCatalogCredits } = require("../src/app/lib/movies/credits.ts");
const { getDraftFacts, getCachedMovieWithOverrides } = require("../src/app/lib/movies/movieOverrides.ts");
const { collectDirectorNames } = require("../src/app/lib/import/fetchMovieFacts.ts");
const { collectCuratedProductionCredits } = require("../src/app/lib/import/curatedPack300.ts");
const moviesById = new Map(movies.map((movie) => [movie.canonicalMovieId, movie]));

test("all allowlisted identities resolve against the original 2000 cards plus The 100", () => {
  assert.equal(movies.filter((movie) => movie.slug !== "the-100-2014").length, 2000);
  assert.equal(movies.filter((movie) => movie.slug === "the-100-2014").length, 1);
  assert.equal(movies.length, 2001);
  assert.equal(generatedCanonicalCredits.length, 369);
  assert.equal(new Set(generatedCanonicalCredits.map((entry) => entry.canonicalMovieId)).size, 369);
  for (const entry of generatedCanonicalCredits) {
    const movie = moviesById.get(entry.canonicalMovieId);
    assert.ok(movie, entry.slug);
    const credits = getVerifiedCreditsForMovie(movie);
    assert.ok(credits, entry.slug);
    assert.equal(credits.provenance, entry.provenance);
    assert.deepEqual(credits.directors ?? [], entry.fields.directors ?? []);
    assert.deepEqual(credits.seriesCreators ?? [], entry.fields.seriesCreators ?? []);
    assert.deepEqual(credits.actors ?? [], entry.fields.actors ?? []);
    assert.equal((credits.actors ?? []).some((person) => /\bvoice\b|озвуч/i.test(person.role)), false);
  }
});

test("each planned field adds visible credits where the static catalog lacks them", () => {
  const added = { directors: 0, seriesCreators: 0, actors: 0 };
  const violations = [];
  for (const entry of generatedCanonicalCredits) {
    const movie = moviesById.get(entry.canonicalMovieId);
    const before = normalizeCatalogCredits(movie);
    const after = normalizeCatalogCredits(attachVerifiedCredits(movie, null));
    for (const field of Object.keys(added)) {
      if (!entry.fields[field]?.length) continue;
      if (before[field].length || !after[field].length) {
        violations.push(`${entry.slug}: ${field} before=${before[field].length} after=${after[field].length}`);
      }
      added[field] += 1;
    }
  }
  assert.deepEqual(violations, []);
  assert.deepEqual(added, { directors: 246, seriesCreators: 31, actors: 261 });
});

test("identity mismatch cannot attach verified data or alter public movie fields", () => {
  const entry = generatedCanonicalCredits.find((item) => item.fields.directors?.length && item.fields.actors?.length);
  assert.ok(entry);
  const movie = moviesById.get(entry.canonicalMovieId);
  const before = structuredClone(movie);
  assert.equal(getVerifiedCreditsForMovie({ ...movie, imdbId: "tt0000000" }), null);
  assert.equal(getVerifiedCreditsForMovie({ ...movie, slug: "other" }), null);
  assert.equal(getVerifiedCreditsForMovie({ ...movie, tmdbNamespace: movie.tmdbNamespace === "tv" ? "movie" : "tv" }), null);
  const enriched = attachVerifiedCredits(movie, null);
  const { verifiedCredits, ...unchanged } = enriched;
  assert.ok(verifiedCredits);
  assert.deepEqual(unchanged, before);
  assert.deepEqual(movie, before);
});

test("manual facts and cast have absolute priority at runtime", () => {
  const entry = generatedCanonicalCredits.find((item) => item.fields.directors?.length && item.fields.actors?.length);
  const movie = moviesById.get(entry.canonicalMovieId);
  for (const override of [
    { facts: [{ label: "Режиссёр", value: "Ручной автор" }] },
    { cast: [{ name: "Ручной актёр", role: "Герой" }] },
    { directors: ["Ручной автор"] },
    { crew: { directors: ["Ручной автор"] } },
    { characters: [{ name: "Ручной персонаж", role: "" }] },
  ]) {
    assert.equal(hasManualCreditsOverride(override), true);
    assert.equal(attachVerifiedCredits({ ...movie, ...override }, override).verifiedCredits, undefined);
  }
  assert.equal(hasManualCreditsOverride({ poster: "unchanged" }), false);
  const visible = normalizeCatalogCredits({ ...movie, facts: [{ label: "Режиссёр", value: "Ручной автор" }], verifiedCredits: getVerifiedCreditsForMovie(movie) });
  assert.deepEqual(visible.directors, ["Ручной автор"]);
});

test("TV creators, film directors, cast, characters and voice roles remain distinct", () => {
  const tv = normalizeCatalogCredits({ type: "Сериал", verifiedCredits: { provenance: "TMDB_ONLY", directors: ["Не показывать"], seriesCreators: ["Создатель"], actors: [{ name: "Актёр", role: "Роль" }] } });
  assert.deepEqual(tv.directors, []);
  assert.deepEqual(tv.seriesCreators, ["Создатель"]);
  assert.equal(tv.actors.length, 1);
  const animation = normalizeCatalogCredits({ type: "Мультфильм", genres: ["Анимация"], verifiedCredits: { provenance: "FULLY_VERIFIED", directors: ["Режиссёр"], actors: [{ name: "Не подтверждено", role: "Герой" }] }, cast: [{ name: "Актёр озвучивания", role: "voice" }] });
  assert.deepEqual(animation.directors, ["Режиссёр"]);
  assert.deepEqual(animation.actors, []);
  assert.equal(animation.voiceActors.length, 1);
});

test("imported TMDB creators are not stored as directors", () => {
  const details = { created_by: [{ name: "Создатель" }], credits: { crew: [{ name: "Режиссёр", job: "Director" }, { name: "Автор", job: "Writer" }] } };
  assert.deepEqual(collectDirectorNames(details, null), ["Режиссёр"]);
  const tvFacts = getDraftFacts({ type: "series", year: 2024, directors: ["Устаревшее смешанное поле"], raw_json: { tmdb: details } });
  assert.ok(tvFacts.some((fact) => fact.label === "Создатели" && fact.value === "Создатель"));
  assert.equal(tvFacts.some((fact) => fact.label === "Режиссёр"), false);
  const filmFacts = getDraftFacts({ type: "film", year: 2024, directors: ["Режиссёр"], raw_json: { tmdb: details } });
  assert.ok(filmFacts.some((fact) => fact.label === "Режиссёр"));
  assert.equal(filmFacts.some((fact) => fact.label === "Создатели"), false);
  const curated = collectCuratedProductionCredits(details, { persons: [] });
  assert.deepEqual(curated.directors, ["Режиссёр"]);
  assert.deepEqual(curated.creators, ["Создатель"]);
});

test("movie page server path receives verified credits without a database read", async () => {
  const movie = await getCachedMovieWithOverrides("the-gorge-2025");
  assert.equal(movie?.verifiedCredits?.provenance, "FULLY_VERIFIED");
  assert.ok(normalizeCatalogCredits(movie).directors.length > 0);
});
