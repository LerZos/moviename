import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (/^(?:\.{1,2}\/)/.test(specifier) && !/\.[a-z0-9]+$/i.test(specifier)) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});

const root = process.argv[2];
if (!root) throw new Error("Usage: node verify-anime-namespace-routing.mjs <repo>");

process.env.TMDB_API_KEY = "test-only";
const calls = [];
globalThis.fetch = async (input) => {
  const url = String(input);
  calls.push(url);
  if (/\/images(?:\?|$)/.test(url)) {
    const mediaType = url.includes("/tv/") ? "tv" : "movie";
    return Response.json({
      posters: [{
        file_path: `/${mediaType}-poster.jpg`,
        width: 2000,
        height: 3000,
        iso_639_1: null,
        vote_average: 8,
        vote_count: 10,
        aspect_ratio: 2 / 3,
      }],
    });
  }
  return Response.json({});
};

const routeUrl = pathToFileURL(path.join(root, "src/app/api/tmdb/poster/route.ts")).href;
const { GET } = await import(`${routeUrl}?routing=${Date.now()}`);

async function verify(name, query, expectedNamespace) {
  calls.length = 0;
  const response = await GET(new Request(`http://localhost/api/tmdb/poster?${query}`));
  const location = response.headers.get("location") || "";
  const namespaceCall = calls.find((url) => url.includes(`/${expectedNamespace}/`));
  const opposite = expectedNamespace === "tv" ? "movie" : "tv";
  const wrongCall = calls.find((url) => url.includes(`/${opposite}/`));
  const ok = response.status === 302 && Boolean(namespaceCall) && !wrongCall && location.includes(`/${expectedNamespace}-poster.jpg`);
  return { name, expectedNamespace, status: response.status, location, calls, ok };
}

const results = [
  await verify("anime-tv-explicit", "tmdbId=209867&type=%D0%90%D0%BD%D0%B8%D0%BC%D0%B5&mediaType=tv", "tv"),
  await verify("anime-movie-explicit", "tmdbId=129&type=%D0%90%D0%BD%D0%B8%D0%BC%D0%B5&mediaType=movie", "movie"),
  await verify("legacy-series", "tmdbId=209867&type=%D0%A1%D0%B5%D1%80%D0%B8%D0%B0%D0%BB", "tv"),
  await verify("legacy-film", "tmdbId=129&type=%D0%A4%D0%B8%D0%BB%D1%8C%D0%BC", "movie"),
];

const failed = results.filter((result) => !result.ok);
console.log(`ROUTING_CASES=${results.length}`);
console.log(`ROUTING_PASS=${results.length - failed.length}`);
console.log(`ROUTING_FAIL=${failed.length}`);
for (const result of results) console.log(`${result.ok ? "PASS" : "FAIL"}|${result.name}|${result.expectedNamespace}|${result.location}`);
if (failed.length) process.exitCode = 1;
