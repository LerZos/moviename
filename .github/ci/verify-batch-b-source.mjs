import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_COMMIT = "54398810c958380a1624eec02429b7e31680755e";
const EXPECTED_TRACKED_DIFF_SHA256 =
  "1a729bd5fc3d229af3118531fd210b795ed6e90677873d221fcc85817a511f35";

const ORIGINAL_TRACKED_FILES = [
  "src/app/HomeClient.tsx",
  "src/app/api/admin/import/cleanup-duplicates/route.ts",
  "src/app/api/admin/import/create-draft/route.ts",
  "src/app/api/admin/import/delete-candidate/route.ts",
  "src/app/api/admin/import/delete-draft/route.ts",
  "src/app/api/admin/import/draft-action/route.ts",
  "src/app/api/admin/import/feedback/route.ts",
  "src/app/api/admin/import/generate-seo/route.ts",
  "src/app/api/admin/import/generate-template-seo/route.ts",
  "src/app/api/admin/import/list/route.ts",
  "src/app/api/admin/import/process-next/route.ts",
  "src/app/api/admin/import/update-draft/route.ts",
  "src/app/api/cron/import-daily/route.ts",
  "src/app/api/tmdb/poster/route.ts",
  "src/app/data/canonicalMovieMetadata.ts",
  "src/app/data/generatedCanonicalMovieMetadata.ts",
  "src/app/data/manualPopularAnime.ts",
  "src/app/lib/imageLinks.ts",
  "src/app/lib/import/adminAuth.ts",
  "src/app/lib/import/createMovieDraft.ts",
  "src/app/lib/import/curatedPack300.ts",
  "src/app/lib/import/discoverMovies.ts",
  "src/app/lib/import/duplicateGuard.ts",
  "src/app/lib/import/moderateDraft.ts",
  "src/app/lib/import/publicPopularImport.ts",
  "src/app/lib/import/vibixImport.ts",
  "src/app/lib/movies/movieOverrides.ts",
  "src/app/lib/supabase/admin.ts",
  "src/app/movie/[slug]/MoviePageClient.tsx",
];

const RECOVERY_NEW_FILES = new Map([
  [
    "scripts/server-only-test-loader.mjs",
    "9d1aa21e8f2dea9cc0488949f58c7c31f4501d01f0fc515a0b2d06deac5aeb32",
  ],
  [
    "scripts/supabase-admin-lazy.test.mjs",
    "9a50723c98f42efa89fa504e1730bd5c9fb7dd1a8aed04b11b63ce2d0fe87715",
  ],
  [
    "src/app/lib/home/homeCatalogRoutes.ts",
    "3563535cced3cb387e107b7503ed4c42dfe2b66e07efe1d0c1e8b7888d5411c7",
  ],
]);

const EXPECTED_APP_FILES = [...ORIGINAL_TRACKED_FILES, ...RECOVERY_NEW_FILES.keys()].sort();
const GENERATED_METADATA = "src/app/data/generatedCanonicalMovieMetadata.ts";
const GENERATED_REGISTRY = "src/app/data/generatedCanonicalMovieRegistry.ts";

const MANUAL_IMAGE_FIELDS = [
  ["avatar-fire-and-ash", "poster"],
  ["jumanji-1995", "poster"],
  ["steins-gate", "poster"],
  ["oregairu-2013", "backdrop"],
  ["oregairu-2013", "poster"],
  ["attack-on-titan", "poster"],
  ["naruto", "poster"],
  ["the-boondocks-2005", "backdrop"],
  ["the-boondocks-2005", "poster"],
];

const repo = path.resolve(process.argv[2] ?? ".");
const reportPath = path.resolve(process.argv[3] ?? "batch-b-source-verification.json");

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: repo,
    encoding: options.encoding ?? "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseGeneratedMetadata(source) {
  const marker = source.indexOf("generatedCanonicalMovieMetadata");
  const start = source.indexOf("[", marker);
  const end = source.lastIndexOf("] as const satisfies");
  if (start < 0 || end < start) throw new Error("Generated metadata array not found");
  return JSON.parse(source.slice(start, end + 1));
}

function comparableFields(entry) {
  return Object.fromEntries(
    Object.entries(entry).filter(([key]) => !["sources", "poster", "backdrop"].includes(key)),
  );
}

git(["merge-base", "--is-ancestor", BASE_COMMIT, "HEAD"]);

const changedAppFiles = git(["diff", "--name-only", BASE_COMMIT, "--", "src", "scripts"])
  .split(/\r?\n/)
  .filter(Boolean)
  .sort();

const appInventoryMatches =
  JSON.stringify(changedAppFiles) === JSON.stringify(EXPECTED_APP_FILES);

const rawDiff = git(
  [
    "diff",
    "--binary",
    "--no-ext-diff",
    "--src-prefix=a/",
    "--dst-prefix=b/",
    BASE_COMMIT,
    "--",
    ...ORIGINAL_TRACKED_FILES,
  ],
  { encoding: "buffer" },
);
const canonicalDiff = rawDiff.at(-1) === 0x0a ? rawDiff.subarray(0, -1) : rawDiff;
const trackedDiffSha256 = sha256(canonicalDiff);

const newFileChecks = [];
for (const [relativePath, expectedSha256] of RECOVERY_NEW_FILES) {
  const contents = await readFile(path.join(repo, relativePath));
  const actualSha256 = sha256(contents);
  newFileChecks.push({
    path: relativePath,
    expectedSha256,
    actualSha256,
    pass: actualSha256 === expectedSha256,
  });
}

const baseMetadata = parseGeneratedMetadata(git(["show", `${BASE_COMMIT}:${GENERATED_METADATA}`]));
const candidateMetadata = parseGeneratedMetadata(
  await readFile(path.join(repo, GENERATED_METADATA), "utf8"),
);
const baseById = new Map(baseMetadata.map((entry) => [entry.canonicalMovieId, entry]));
const candidateById = new Map(candidateMetadata.map((entry) => [entry.canonicalMovieId, entry]));

let posterMutations = 0;
let backdropMutations = 0;
const nonImageChanges = [];
const lostProvenance = [];

for (const [id, before] of baseById) {
  const after = candidateById.get(id);
  if (!after) {
    nonImageChanges.push({ id, issue: "missing_record" });
    continue;
  }

  if (before.poster !== after.poster) posterMutations += 1;
  if (before.backdrop !== after.backdrop) backdropMutations += 1;

  if (JSON.stringify(comparableFields(before)) !== JSON.stringify(comparableFields(after))) {
    nonImageChanges.push({ id, issue: "non_image_field_changed" });
  }

  for (const source of before.sources ?? []) {
    const retained = (after.sources ?? []).some(
      (next) =>
        next.source === source.source &&
        (source.fields ?? []).every((field) => next.fields?.includes(field)) &&
        next.observedAt === source.observedAt &&
        next.sourceUpdatedAt === source.sourceUpdatedAt,
    );
    if (!retained) lostProvenance.push({ id, source: source.source });
  }
}

const addedIds = [...candidateById.keys()].filter((id) => !baseById.has(id));
const missingIds = [...baseById.keys()].filter((id) => !candidateById.has(id));

const registrySource = await readFile(path.join(repo, GENERATED_REGISTRY), "utf8");
const idBySlug = new Map();
for (const line of registrySource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("],")) continue;
  const tuple = JSON.parse(trimmed.slice(0, -1));
  idBySlug.set(tuple[1], tuple[0]);
}

const manualOverrideChecks = MANUAL_IMAGE_FIELDS.map(([slug, field]) => {
  const canonicalMovieId = idBySlug.get(slug);
  const metadata = candidateById.get(canonicalMovieId);
  return {
    slug,
    field,
    canonicalMovieId: canonicalMovieId ?? null,
    pass: canonicalMovieId !== undefined && metadata?.[field] === undefined,
  };
});

const totalImageMutations = posterMutations + backdropMutations;
const errors = [];
if (!appInventoryMatches) errors.push("Recovery app-source inventory differs from the approved 32 files");
if (trackedDiffSha256 !== EXPECTED_TRACKED_DIFF_SHA256) errors.push("Tracked diff SHA-256 mismatch");
if (newFileChecks.some((item) => !item.pass)) errors.push("One or more recovery-new file hashes differ");
if (baseMetadata.length !== candidateMetadata.length || addedIds.length || missingIds.length) {
  errors.push("Generated metadata record set changed");
}
if (posterMutations !== 1 || backdropMutations !== 480 || totalImageMutations !== 481) {
  errors.push("Batch B mutation count differs from 1 poster + 480 backdrops");
}
if (nonImageChanges.length) errors.push("Batch B contains non-image metadata changes");
if (lostProvenance.length) errors.push("Batch A provenance was lost");
if (manualOverrideChecks.some((item) => !item.pass)) errors.push("A manual image override is no longer preserved");

const report = {
  schemaVersion: 1,
  baseCommit: BASE_COMMIT,
  changedAppFiles,
  changedAppFilesCount: changedAppFiles.length,
  appInventoryMatches,
  trackedDiffSha256,
  trackedDiffMatches: trackedDiffSha256 === EXPECTED_TRACKED_DIFF_SHA256,
  recoveryNewFiles: newFileChecks,
  batchB: {
    baseRecords: baseMetadata.length,
    candidateRecords: candidateMetadata.length,
    addedIds: addedIds.length,
    missingIds: missingIds.length,
    posterMutations,
    backdropMutations,
    totalImageMutations,
    nonImageChanges: nonImageChanges.length,
    lostProvenance: lostProvenance.length,
  },
  manualOverrides: {
    checked: manualOverrideChecks.length,
    preserved: manualOverrideChecks.filter((item) => item.pass).length,
    checks: manualOverrideChecks,
  },
  errors,
  pass: errors.length === 0,
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`SOURCE_FILES=${report.changedAppFilesCount}/32`);
console.log(`TRACKED_DIFF_SHA256=${report.trackedDiffSha256}`);
console.log(`BATCH_B=${totalImageMutations}/481`);
console.log(`MANUAL_OVERRIDES=${report.manualOverrides.preserved}/9`);
console.log(`SOURCE_VERIFY=${report.pass ? "PASS" : "FAIL"}`);

if (!report.pass) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
}
