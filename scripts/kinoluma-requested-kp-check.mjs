import { readFileSync } from "node:fs";

const sourcePath = "src/app/data/generatedRequestedExpansion.ts";
const source = readFileSync(sourcePath, "utf8");

const baseStart = source.indexOf("const requestedMovieBase");
const mapStart = source.indexOf("const REQUESTED_KINOPOISK_INFO");
const helperStart = source.indexOf("function hasRequestedFact");

if (baseStart === -1 || mapStart === -1 || helperStart === -1) {
  throw new Error("Не найдены нужные блоки requestedMovieBase / REQUESTED_KINOPOISK_INFO / hasRequestedFact");
}

const baseBlock = source.slice(baseStart, mapStart);
const mapBlock = source.slice(mapStart, helperStart);

const movieSlugs = [...baseBlock.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]);
const mapEntries = [...mapBlock.matchAll(/"([^"]+)":\s*\{\s*kinopoiskId:\s*(\d+),\s*rating:\s*(\d+(?:\.\d+)?)\s*\}/g)].map((match) => ({
  slug: match[1],
  kinopoiskId: Number(match[2]),
  rating: Number(match[3]),
}));

const uniqueMovieSlugs = new Set(movieSlugs);
const entryBySlug = new Map(mapEntries.map((entry) => [entry.slug, entry]));

const missing = movieSlugs.filter((slug) => !entryBySlug.has(slug));
const extra = mapEntries.filter((entry) => !uniqueMovieSlugs.has(entry.slug)).map((entry) => entry.slug);
const badValues = mapEntries.filter((entry) => !Number.isFinite(entry.kinopoiskId) || entry.kinopoiskId <= 0 || !Number.isFinite(entry.rating) || entry.rating <= 0);
const duplicates = mapEntries
  .map((entry) => entry.slug)
  .filter((slug, index, list) => list.indexOf(slug) !== index);

if (missing.length || extra.length || badValues.length || duplicates.length) {
  console.error("KinoLuma Kinopoisk check failed");
  console.error({ missing, extra, badValues, duplicates });
  process.exit(1);
}

if (!source.includes("Рейтинг Кинопоиска")) {
  throw new Error("Не найден публичный факт 'Рейтинг Кинопоиска'");
}

if (!source.includes("kinopoiskId: enrichedMovie.kinopoiskId")) {
  throw new Error("buildAutoPlayers не получает kinopoiskId из расширенной карточки");
}

console.log(`KinoLuma Kinopoisk check OK: ${movieSlugs.length} карточек, ${mapEntries.length} ID/рейтингов.`);
