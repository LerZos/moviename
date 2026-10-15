import { writeFile } from "node:fs/promises";
import path from "node:path";

const origin = (process.argv[2] ?? "http://127.0.0.1:3100").replace(/\/$/, "");
const reportPath = path.resolve(process.argv[3] ?? "runtime-qa.json");

const slugs = [
  "uvolit-zhora",
  "predator-badlands",
  "cyberpunk-edgerunners",
  "band-of-brothers-2001",
  "resident-alien-2021",
  "5-32-2021",
  "obyasnyalkiny-2023",
  "spider-man-far-from-home",
  "one-piece",
  "jujutsu-kaisen",
  "moriarty-the-patriot-2020",
  "tomodachi-game-2022",
  "steins-gate",
  "oregairu-2013",
  "the-boondocks-2005",
  "attack-on-titan",
  "naruto",
  "jumanji-1995",
  "the-100-2014",
];

function canonicalFromHtml(html) {
  return (
    html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1] ??
    html.match(/<link[^>]+href="([^"]+)"[^>]+rel="canonical"/i)?.[1] ??
    null
  );
}

const errors = [];
const rootResponse = await fetch(`${origin}/`);
if (rootResponse.status !== 200) errors.push(`Home page returned HTTP ${rootResponse.status}`);

const pages = [];
for (const slug of slugs) {
  const response = await fetch(`${origin}/movie/${slug}`);
  const html = await response.text();
  const canonical = canonicalFromHtml(html);
  const expectedCanonical = `https://kinoluma.online/movie/${slug}`;
  const pass = response.status === 200 && canonical === expectedCanonical;
  pages.push({ slug, status: response.status, canonical, expectedCanonical, pass });
  if (!pass) errors.push(`${slug}: SSR/canonical check failed`);
  if (slug === "the-100-2014") {
    for (const expected of ["Сезоны и серии", "Сезон 7", "100 серий", "Jason Rothenberg", "wHIMMLFsk32wIzDmawWkYVbxFCS.jpg"]) {
      if (!html.includes(expected)) errors.push(`${slug}: missing ${expected} in SSR HTML`);
    }
  }
}

for (const query of ["Сотня", "The 100"]) {
  const response = await fetch(`${origin}/api/search?q=${encodeURIComponent(query)}`);
  const body = response.ok ? await response.json() : null;
  if (response.status !== 200 || !Array.isArray(body?.items) ||
      body.items.filter((item) => item.slug === "the-100-2014").length !== 1) {
    errors.push(`Search for ${query} did not return exactly one The 100 card`);
  }
}

const sitemapResponse = await fetch(`${origin}/sitemap.xml`);
const sitemap = await sitemapResponse.text();
const sitemapUrlCount = [...sitemap.matchAll(/<loc>[^<]+<\/loc>/g)].length;
if (sitemapResponse.status !== 200 || sitemapUrlCount !== 2190 ||
    !sitemap.includes("https://kinoluma.online/movie/the-100-2014")) {
  errors.push(`Sitemap check failed: HTTP ${sitemapResponse.status}, ${sitemapUrlCount} URLs`);
}

const imageUrl = new URL("/_next/image", origin);
imageUrl.searchParams.set("url", "/kinoluma-icon.png");
imageUrl.searchParams.set("w", "640");
imageUrl.searchParams.set("q", "75");
const imageResponse = await fetch(imageUrl);
const imageContentType = imageResponse.headers.get("content-type") ?? "";
const imageBody = await imageResponse.arrayBuffer();
if (
  imageResponse.status !== 200 ||
  !imageContentType.toLowerCase().startsWith("image/") ||
  imageBody.byteLength === 0
) {
  errors.push("Linux _next/image processing failed");
}

const adminResponse = await fetch(`${origin}/api/admin/import/list`);
if (adminResponse.status !== 401) {
  errors.push(`Admin route guard returned HTTP ${adminResponse.status}, expected 401`);
}

const cronResponse = await fetch(`${origin}/api/cron/import-daily`);
if (cronResponse.status !== 401) {
  errors.push(`Cron route guard returned HTTP ${cronResponse.status}, expected 401`);
}

const tmdbDirectUrl = new URL("/api/tmdb/poster", origin);
tmdbDirectUrl.searchParams.set(
  "posterUrl",
  "https://image.tmdb.org/t/p/original/kinoluma-ci-route-smoke.jpg",
);
const tmdbResponse = await fetch(tmdbDirectUrl, { redirect: "manual" });
const tmdbLocation = tmdbResponse.headers.get("location") ?? "";
if (tmdbResponse.status !== 302 || !tmdbLocation.startsWith("https://image.tmdb.org/")) {
  errors.push("TMDB poster route initialization check failed");
}

const report = {
  schemaVersion: 1,
  origin,
  homeStatus: rootResponse.status,
  ssrCanonical: {
    checked: pages.length,
    passed: pages.filter((page) => page.pass).length,
    pages,
  },
  sitemap: { status: sitemapResponse.status, urlCount: sitemapUrlCount },
  imageOptimizer: {
    status: imageResponse.status,
    contentType: imageContentType,
    bytes: imageBody.byteLength,
  },
  routeGuards: {
    adminStatus: adminResponse.status,
    cronStatus: cronResponse.status,
    tmdbStatus: tmdbResponse.status,
  },
  errors,
  pass: errors.length === 0,
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`SSR_CANONICAL=${report.ssrCanonical.passed}/19`);
console.log(`SITEMAP_URLS=${sitemapUrlCount}/2190`);
console.log(`IMAGE_OPTIMIZER=${imageResponse.status}:${imageContentType}`);
console.log(`ROUTE_GUARDS=${adminResponse.status}/${cronResponse.status}/${tmdbResponse.status}`);
console.log(`RUNTIME_QA=${report.pass ? "PASS" : "FAIL"}`);

if (!report.pass) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
}
