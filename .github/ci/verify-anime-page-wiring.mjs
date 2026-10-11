import fs from "node:fs/promises";
import path from "node:path";

const root = process.argv[2];
const origin = process.argv[3];
if (!root || !origin) throw new Error("Usage: node verify-anime-page-wiring.mjs <repo> <origin>");

const source = await fs.readFile(path.join(root, "src/app/data/manualPopularAnime.ts"), "utf8");
const slugs = [...source.matchAll(/^    slug:\s*"([^"]+)",/gm)].map((match) => match[1]);
if (slugs.length !== 21) throw new Error(`Expected 21 slugs, found ${slugs.length}`);

const results = [];
for (const slug of slugs) {
  const response = await fetch(`${origin}/movie/${slug}`);
  const html = await response.text();
  const canonical = `https://kinoluma.online/movie/${slug}`;
  const ok = response.status === 200 &&
    html.includes(canonical) &&
    html.includes("mediaType=tv") &&
    html.includes("manual-anime-3");
  results.push({ slug, status: response.status, canonical: html.includes(canonical), namespace: html.includes("mediaType=tv"), cacheVersion: html.includes("manual-anime-3"), ok });
}

const failed = results.filter((item) => !item.ok);
console.log(`ANIME_PAGES=${results.length}`);
console.log(`ANIME_PAGE_PASS=${results.length - failed.length}`);
console.log(`ANIME_PAGE_FAIL=${failed.length}`);
for (const item of failed) console.log(`FAIL|${item.slug}|${item.status}|canonical=${item.canonical}|namespace=${item.namespace}|cache=${item.cacheVersion}`);
if (failed.length) process.exitCode = 1;
