import fs from "node:fs/promises";
import path from "node:path";

const PINNED_SLUG = "steins-gate";
const ROUTED_NAMESPACE = "mediaType=tv";
const ROUTED_CACHE_VERSION = "manual-anime-3";

function extractPinnedPoster(source, slug) {
  const slugMarker = `slug: "${slug}"`;
  const slugIndex = source.indexOf(slugMarker);
  if (slugIndex < 0) throw new Error(`Pinned source is missing slug: ${slug}`);

  const nextSlugIndex = source.indexOf("\n    slug:", slugIndex + slugMarker.length);
  const entrySource = source.slice(slugIndex, nextSlugIndex < 0 ? source.length : nextSlugIndex);
  const posterMatch = entrySource.match(/^\s*poster:\s*"([^"]+)",/m);
  if (!posterMatch) throw new Error(`Pinned source is missing poster: ${slug}`);

  const poster = posterMatch[1];
  const parsed = new URL(poster);
  if (parsed.protocol !== "https:" || parsed.hostname !== "image.tmdb.org") {
    throw new Error(`Pinned poster is not a trusted TMDB image: ${slug}`);
  }
  return poster;
}

function htmlIncludesPoster(html, poster) {
  const normalized = html.replaceAll("&amp;", "&");
  const variants = [poster, encodeURI(poster), encodeURIComponent(poster)];
  if (variants.some((variant) => normalized.includes(variant))) return true;

  let decoded = normalized;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      break;
    }
    if (decoded.includes(poster)) return true;
  }
  return false;
}

function evaluatePage({ slug, status, html, pinnedPoster }) {
  const canonicalUrl = `https://kinoluma.online/movie/${slug}`;
  const canonical = html.includes(canonicalUrl);

  if (slug === PINNED_SLUG) {
    const poster = htmlIncludesPoster(html, pinnedPoster);
    return {
      slug,
      status,
      canonical,
      poster,
      mode: "pinned",
      ok: status === 200 && canonical && poster,
    };
  }

  const namespace = html.includes(ROUTED_NAMESPACE);
  const cacheVersion = html.includes(ROUTED_CACHE_VERSION);
  return {
    slug,
    status,
    canonical,
    namespace,
    cacheVersion,
    mode: "routed",
    ok: status === 200 && canonical && namespace && cacheVersion,
  };
}

function runSelfTest() {
  const poster = "https://image.tmdb.org/t/p/w500/verified-poster.jpg";
  const canonical = (slug) => `https://kinoluma.online/movie/${slug}`;
  const cases = [
    {
      name: "routed-positive",
      expected: true,
      input: {
        slug: "ordinary-anime",
        status: 200,
        html: `${canonical("ordinary-anime")} ${ROUTED_NAMESPACE} ${ROUTED_CACHE_VERSION}`,
        pinnedPoster: poster,
      },
    },
    {
      name: "routed-missing-namespace",
      expected: false,
      input: {
        slug: "ordinary-anime",
        status: 200,
        html: `${canonical("ordinary-anime")} ${ROUTED_CACHE_VERSION}`,
        pinnedPoster: poster,
      },
    },
    {
      name: "pinned-next-image-positive",
      expected: true,
      input: {
        slug: PINNED_SLUG,
        status: 200,
        html: `${canonical(PINNED_SLUG)} /_next/image?url=${encodeURIComponent(poster)}&amp;w=640`,
        pinnedPoster: poster,
      },
    },
    {
      name: "pinned-fallback-negative",
      expected: false,
      input: {
        slug: PINNED_SLUG,
        status: 200,
        html: `${canonical(PINNED_SLUG)} /kinoluma-icon.png`,
        pinnedPoster: poster,
      },
    },
    {
      name: "pinned-wrong-poster-negative",
      expected: false,
      input: {
        slug: PINNED_SLUG,
        status: 200,
        html: `${canonical(PINNED_SLUG)} ${poster.replace("verified-poster", "wrong-poster")}`,
        pinnedPoster: poster,
      },
    },
    {
      name: "pinned-missing-canonical",
      expected: false,
      input: { slug: PINNED_SLUG, status: 200, html: poster, pinnedPoster: poster },
    },
  ];

  const failed = cases.filter(({ input, expected }) => evaluatePage(input).ok !== expected);
  console.log(`ANIME_WIRING_SELF_TEST=${cases.length - failed.length}/${cases.length}`);
  for (const item of failed) console.log(`SELF_TEST_FAIL|${item.name}`);
  if (failed.length) process.exitCode = 1;
}

async function main() {
  if (process.argv[2] === "--self-test") {
    runSelfTest();
    return;
  }

  const root = process.argv[2];
  const origin = process.argv[3];
  if (!root || !origin) {
    throw new Error("Usage: node verify-anime-page-wiring.mjs <repo> <origin>");
  }

  const source = await fs.readFile(
    path.join(root, "src/app/data/manualPopularAnime.ts"),
    "utf8",
  );
  const pinnedSource = await fs.readFile(
    path.join(root, "src/app/data/manualUserPinnedAdditions.ts"),
    "utf8",
  );
  const pinnedPoster = extractPinnedPoster(pinnedSource, PINNED_SLUG);
  const slugs = [...source.matchAll(/^    slug:\s*"([^"]+)",/gm)].map((match) => match[1]);
  if (slugs.length !== 21) throw new Error(`Expected 21 slugs, found ${slugs.length}`);
  if (slugs.filter((slug) => slug === PINNED_SLUG).length !== 1) {
    throw new Error(`Expected exactly one ${PINNED_SLUG} entry`);
  }

  const results = [];
  for (const slug of slugs) {
    const response = await fetch(`${origin}/movie/${slug}`);
    const html = await response.text();
    results.push(evaluatePage({ slug, status: response.status, html, pinnedPoster }));
  }

  const failed = results.filter((item) => !item.ok);
  console.log(`ANIME_PAGES=${results.length}`);
  console.log(`ANIME_PAGE_PASS=${results.length - failed.length}`);
  console.log(`ANIME_PAGE_FAIL=${failed.length}`);
  for (const item of failed) {
    if (item.mode === "pinned") {
      console.log(
        `FAIL|${item.slug}|${item.status}|canonical=${item.canonical}|pinnedPoster=${item.poster}`,
      );
    } else {
      console.log(
        `FAIL|${item.slug}|${item.status}|canonical=${item.canonical}|namespace=${item.namespace}|cache=${item.cacheVersion}`,
      );
    }
  }
  if (failed.length) process.exitCode = 1;
}

await main();
