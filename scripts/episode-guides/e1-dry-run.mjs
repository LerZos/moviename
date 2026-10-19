import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const originalLoad = Module._load;
Module._load = function load(request, ...args) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, ...args);
};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    module._compile(compiled.outputText, filename);
  };
}

process.env.KINOLUMA_DISABLE_SUPABASE_DURING_BUILD = "true";
let networkRequests = 0;
globalThis.fetch = async () => {
  networkRequests += 1;
  throw new Error("NETWORK_REQUEST_FORBIDDEN_DURING_E1_DRY_RUN");
};

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const { movies } = require(`${repositoryRoot}/src/app/data/movies.ts`);
const { episodeGuidePilotAllowlist } = require(
  `${repositoryRoot}/src/app/data/episodeGuidePilotAllowlist.ts`,
);
const { getCanonicalIdentityById } = require(
  `${repositoryRoot}/src/app/data/canonicalIdentity.ts`,
);
const {
  getEpisodeGuideManifestIds,
  loadEpisodeGuideSnapshot,
} = require(`${repositoryRoot}/src/app/lib/episodeGuides/loader.ts`);
const { episodeGuideSnapshotManifest } = require(
  `${repositoryRoot}/src/app/lib/episodeGuides/manifest.ts`,
);

const moviesByCanonicalId = new Map(
  movies.map((movie) => [movie.canonicalMovieId, movie]),
);
const allowlistIds = episodeGuidePilotAllowlist.map(
  (entry) => entry.canonicalMovieId,
);

assert.equal(episodeGuidePilotAllowlist.length, 10);
assert.equal(new Set(allowlistIds).size, 10);
assert.deepEqual(
  episodeGuidePilotAllowlist.map((entry) => entry.slug),
  episodeGuidePilotAllowlist
    .map((entry) => entry.slug)
    .sort((left, right) => left.localeCompare(right, "en")),
  "pilot allowlist order must remain deterministic",
);

for (const entry of episodeGuidePilotAllowlist) {
  const identity = getCanonicalIdentityById(entry.canonicalMovieId);
  const movie = moviesByCanonicalId.get(entry.canonicalMovieId);
  assert.ok(identity, `${entry.slug}: canonical identity missing`);
  assert.ok(movie, `${entry.slug}: static card missing`);
  assert.equal(identity.slug, entry.slug, `${entry.slug}: registry slug mismatch`);
  assert.equal(identity.contentType, "series", `${entry.slug}: registry type mismatch`);
  assert.equal(identity.tmdbNamespace, "tv", `${entry.slug}: namespace mismatch`);
  assert.equal(identity.tmdbId, entry.tmdbId, `${entry.slug}: registry TMDB mismatch`);
  assert.equal(movie.slug, entry.slug, `${entry.slug}: card slug mismatch`);
  assert.equal(movie.title, entry.title, `${entry.slug}: title mismatch`);
  assert.equal(movie.type, "Сериал", `${entry.slug}: card type mismatch`);
  assert.equal(movie.tmdbId, entry.tmdbId, `${entry.slug}: card TMDB mismatch`);
  assert.equal(movie.releaseStatus, entry.localStatus, `${entry.slug}: status mismatch`);
  assert.equal(movie.seasons, entry.localExpectedRegularSeasons);
  assert.equal(movie.episodes, entry.localExpectedRegularEpisodes);
  assert.equal(movie.episodeGuide, undefined, `${entry.slug}: E.1 must not publish a guide`);
}

const manifestIds = getEpisodeGuideManifestIds();
assert.equal(new Set(manifestIds).size, manifestIds.length);
assert.deepEqual(manifestIds, [...allowlistIds].sort((left, right) =>
  left.localeCompare(right, "en"),
));

let verifiedSnapshots = 0;
for (const canonicalMovieId of allowlistIds) {
  const snapshot = await loadEpisodeGuideSnapshot(canonicalMovieId);
  if (snapshot) verifiedSnapshots += 1;
}

assert.equal(manifestIds.length, 10, "E.1 manifest must cover the complete pilot");
assert.equal(verifiedSnapshots,
  Object.values(episodeGuideSnapshotManifest).filter((entry) => entry.status === "available").length,
  "every available internal snapshot must pass the loader; public catalog stays unchanged",
);
assert.equal(networkRequests, 0, "offline dry-run attempted a network request");

const report = {
  status: "PASS",
  mode: "offline",
  pilotCardsChecked: episodeGuidePilotAllowlist.length,
  canonicalIdentitiesChecked: episodeGuidePilotAllowlist.length,
  manifestEntriesChecked: manifestIds.length,
  verifierPath: "manifest-identity-and-loader-blocking",
  verifiedSnapshots,
  publicGuidesCreated: 0,
  networkRequests,
};

console.log(JSON.stringify(report, null, process.argv.includes("--json") ? 2 : 0));

