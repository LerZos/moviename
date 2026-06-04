import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "src", "app");
const requiredFiles = [
  "package.json",
  "src/app/sitemap.ts",
  "src/app/lib/seo.ts",
  "src/app/movie/[slug]/page.tsx",
  "src/app/movie/[slug]/MoviePageClient.tsx",
  "src/app/collections/[slug]/page.tsx",
  "src/app/data/collections.ts",
  "src/app/data/movies.ts",
  "scripts/kinoluma-seo-audit.mjs",
];

const publicScanFiles = [
  "src/app/page.tsx",
  "src/app/HomeClient.tsx",
  "src/app/layout.tsx",
  "src/app/expected/page.tsx",
  "src/app/collections/page.tsx",
  "src/app/collections/[slug]/page.tsx",
  "src/app/collections/CollectionMovieGridClient.tsx",
  "src/app/data/collections.ts",
  "src/app/data/movies.ts",
  "src/app/lib/seo.ts",
  "src/app/movie/[slug]/page.tsx",
  "src/app/movie/[slug]/MoviePageClient.tsx",
];

const blockedPublicPatterns = [
  /SEO-данные/i,
  /SEO-описание/i,
  /FAQ-разметка/i,
  /JSON-LD/i,
  /Kinopoisk ID/i,
  /Кинопоиск ID/i,
  /TMDB ID/i,
  /IMDb ID/i,
  /IMDB ID/i,
  /Рейтинг KinoLuma/i,
  /для SEO/i,
  /для продвижения/i,
];

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function findSlugs(text) {
  return Array.from(text.matchAll(/slug:\s*["']([^"']+)["']/g), (match) => match[1]);
}

function findDuplicates(items) {
  const counts = new Map();
  const duplicates = [];

  for (const item of items) {
    const nextCount = (counts.get(item) || 0) + 1;
    counts.set(item, nextCount);

    if (nextCount === 2) {
      duplicates.push(item);
    }
  }

  return duplicates;
}

const errors = [];
const warnings = [];

for (const filePath of requiredFiles) {
  if (!exists(filePath)) {
    errors.push(`Не найден файл: ${filePath}`);
  }
}

if (exists("src/app/movie/[slug]/MoviePageClient.tsx")) {
  const clientText = readText("src/app/movie/[slug]/MoviePageClient.tsx");

  if (!clientText.includes(".split(/\\n{2,}/)")) {
    errors.push("MoviePageClient.tsx: splitLongTextIntoParagraphs должен использовать .split(/\\n{2,}/).");
  }
}

if (exists("src/app/sitemap.ts")) {
  const sitemapText = readText("src/app/sitemap.ts");

  if (/publicMovies\.map\([\s\S]*lastModified:\s*new Date\(\)/m.test(sitemapText)) {
    errors.push("sitemap.ts: у страниц фильмов всё ещё стоит lastModified: new Date().");
  }

  if (!sitemapText.includes("publicMovies.map")) {
    errors.push("sitemap.ts: не найден publicMovies.map(...), фильмы могут не попадать в sitemap.");
  }
}

if (exists("src/app/data/movies.ts")) {
  const movieSlugs = findSlugs(readText("src/app/data/movies.ts"));
  const duplicateMovieSlugs = findDuplicates(movieSlugs);

  if (duplicateMovieSlugs.length > 0) {
    errors.push(`data/movies.ts: найдены дубли slug: ${duplicateMovieSlugs.join(", ")}`);
  }
}

if (exists("src/app/data/curatedExpectedReleases.ts")) {
  const expectedSlugs = findSlugs(readText("src/app/data/curatedExpectedReleases.ts"));
  const duplicateExpectedSlugs = findDuplicates(expectedSlugs);

  if (duplicateExpectedSlugs.length > 0) {
    errors.push(`data/curatedExpectedReleases.ts: найдены дубли slug: ${duplicateExpectedSlugs.join(", ")}`);
  }

  if (expectedSlugs.includes("masters-of-the-universe-2026")) {
    errors.push("curatedExpectedReleases.ts: ожидаемый релиз Masters of the Universe должен иметь slug masters-of-the-universe-2026-expected.");
  }
}

if (exists("src/app/data/collections.ts")) {
  const collectionsText = readText("src/app/data/collections.ts");
  const collectionSlugs = findSlugs(collectionsText);
  const duplicateCollectionSlugs = findDuplicates(collectionSlugs);

  if (duplicateCollectionSlugs.length > 0) {
    errors.push(`data/collections.ts: найдены дубли slug: ${duplicateCollectionSlugs.join(", ")}`);
  }

  for (const slug of ["best-sci-fi-movies", "series-like-breaking-bad"]) {
    if (!collectionsText.includes(`slug: "${slug}"`) && !collectionsText.includes(`slug: '${slug}'`)) {
      errors.push(`data/collections.ts: не найдена SEO-подборка ${slug}.`);
    }
  }
}

for (const filePath of publicScanFiles) {
  if (!exists(filePath)) continue;

  const text = readText(filePath);
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const isSanitizerLine = /replace\(|blocked|pattern|RegExp|sanitize|HIDDEN|test\(/i.test(line);

    if (isSanitizerLine) {
      return;
    }

    for (const pattern of blockedPublicPatterns) {
      if (pattern.test(line)) {
        warnings.push(`${filePath}:${index + 1}: публичный технический текст: ${line.trim()}`);
      }
    }
  });
}

if (!fs.existsSync(appDir)) {
  errors.push("Не найдена папка src/app. Запускай аудит из корня проекта, где лежит package.json.");
}

if (warnings.length > 0) {
  console.log("Предупреждения:");
  warnings.forEach((warning) => console.log(`- ${warning}`));
  console.log("");
}

if (errors.length > 0) {
  console.error("SEO-аудит KinoLuma: найдены проблемы:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("SEO-аудит KinoLuma: базовые проверки пройдены.");
