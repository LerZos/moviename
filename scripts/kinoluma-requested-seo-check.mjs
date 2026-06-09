import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Не найден файл: ${relativePath}`);
  }

  return readFileSync(fullPath, "utf8");
}

function assertOk(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const moviesTs = read("src/app/data/movies.ts");
const sitemapTs = read("src/app/sitemap.ts");
const seoTs = read("src/app/lib/seo.ts");
const moviePageTsx = read("src/app/movie/[slug]/page.tsx");
const requestedMoviesTs = read("src/app/data/generatedRequestedExpansion.ts");
const requestedCollectionsTs = read("src/app/data/generatedRequestedCollections.ts");

const requestedSlugs = Array.from(
  requestedMoviesTs.matchAll(/\n\s*slug:\s*"([^"]+)"/g),
  (match) => match[1],
);

const requiredCollectionSlugs = [
  "movies-like-jumanji",
  "movies-like-uncharted",
  "movies-with-dwayne-johnson",
  "movies-with-tom-holland",
  "disaster-movies",
];

assertOk(requestedSlugs.length >= 100, `Ожидалось 100+ новых slug, найдено: ${requestedSlugs.length}`);
assertOk(
  moviesTs.includes('import { generatedRequestedExpansionMovies } from "./generatedRequestedExpansion";'),
  "movies.ts не импортирует generatedRequestedExpansionMovies",
);
assertOk(
  moviesTs.includes("...generatedRequestedExpansionMovies"),
  "movies.ts не добавляет generatedRequestedExpansionMovies в moviesRaw",
);
assertOk(
  sitemapTs.includes("publicMovies.map") && sitemapTs.includes("/movie/${movie.slug}"),
  "sitemap.ts не строит страницы фильмов из publicMovies.map(...movie.slug)",
);
assertOk(
  !/keywords\s*:\s*getMovieKeywords/.test(seoTs),
  "В lib/seo.ts всё ещё есть keywords из getMovieKeywords",
);
assertOk(
  moviePageTsx.includes("generatedRequestedSeoCollections") && moviePageTsx.includes("getRequestedCollectionRelatedSlugs"),
  "movie/[slug]/page.tsx не использует подборки для блока похожих материалов",
);

for (const slug of requiredCollectionSlugs) {
  assertOk(
    requestedCollectionsTs.includes(`slug: "${slug}"`),
    `Не найдена SEO-подборка: ${slug}`,
  );
}

for (const slug of ["jumanji-1995", "uncharted-2022", "san-andreas-2015", "jungle-cruise-2021"]) {
  assertOk(
    requestedMoviesTs.includes(`"${slug}":`) || requestedMoviesTs.includes(`slug: "${slug}"`),
    `Не найден усиленный фильм: ${slug}`,
  );
}

console.log("KinoLuma SEO check OK");
console.log(`Новых slug в generatedRequestedExpansion.ts: ${requestedSlugs.length}`);
console.log("Sitemap берёт фильмы из publicMovies.map(...movie.slug), значит новые карточки попадают туда после build/deploy.");
console.log("Keywords из lib/seo.ts metadata/json блока убраны.");
console.log("SEO-подборки и связанный блок похожих материалов подключены.");
