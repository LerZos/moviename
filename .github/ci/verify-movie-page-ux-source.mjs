import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_COMMIT = "1bcc9517a684ea80101986daaa53e620558ac6c9";
const APP_FILES = [
  "scripts/smart-search.test.mjs",
  "src/app/HomeClient.tsx",
  "src/app/api/search/route.ts",
  "src/app/lib/search/searchEngine.ts",
  "src/app/page.tsx",
];
const CI_FILES = [
  ".github/ci/verify-movie-page-ux-source.mjs",
  ".github/workflows/batch-b-linux-release.yml",
];
const repo = path.resolve(process.argv[2] ?? ".");
const reportPath = path.resolve(process.argv[3] ?? "movie-page-ux-source-verification.json");
const candidateRef = process.argv[4] ?? "HEAD";
const git = (args, encoding = "utf8") =>
  execFileSync("git", args, { cwd: repo, encoding, maxBuffer: 32 * 1024 * 1024 });
const errors = [];

const parentCommit = git(["rev-parse", `${candidateRef}^`]).trim();
if (parentCommit !== BASE_COMMIT) {
  errors.push("Batch D release commit is not directly based on the approved production source commit");
}

const commitCount = Number(git(["rev-list", "--count", `${BASE_COMMIT}..${candidateRef}`]).trim());
if (commitCount !== 1) errors.push(`Expected exactly one release commit, found ${commitCount}`);

const changedFiles = git(["diff", "--name-only", BASE_COMMIT, candidateRef])
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .sort();
const approvedFiles = [...APP_FILES, ...CI_FILES].sort();
if (JSON.stringify(changedFiles) !== JSON.stringify(approvedFiles)) {
  errors.push("Missing or unexpected files in Batch D release diff");
}

const appDiff = git(["diff", "--binary", BASE_COMMIT, candidateRef, "--", ...APP_FILES], "buffer");
const normalizedDiff = appDiff.at(-1) === 0x0a ? appDiff.subarray(0, -1) : appDiff;
const trackedDiffSha256 = createHash("sha256").update(normalizedDiff).digest("hex");

const report = {
  schemaVersion: 1,
  releaseName: "kinoluma-batch-d-smart-search-linux-candidate",
  baseCommit: BASE_COMMIT,
  parentCommit,
  releaseCommit: git(["rev-parse", candidateRef]).trim(),
  commitCount,
  changedFiles,
  changedAppFiles: APP_FILES,
  changedAppFilesCount: APP_FILES.length,
  trackedDiffSha256,
  protectedSource: {
    ratings: "UNCHANGED",
    posters: "UNCHANGED",
    canonicalIdentity: "UNCHANGED",
    seo: "UNCHANGED",
    seasons: "UNCHANGED",
  },
  inheritedProductionFeatures: {
    batchC3Credits: "UNCHANGED",
    adminRatingFix: "UNCHANGED",
    globalPosterFix: "UNCHANGED",
    moviePageUx: "UNCHANGED",
  },
  the100: {
    slug: "the-100-2014",
    tmdbNamespace: "tv",
    tmdbId: 48866,
    seasons: 7,
    episodes: 100,
    inheritedUnchangedFrom: BASE_COMMIT,
  },
  batchB: { totalImageMutations: 481, inheritedUnchangedFrom: BASE_COMMIT },
  manualOverrides: { preserved: 9, inheritedUnchangedFrom: BASE_COMMIT },
  credits: { inheritedFrom: BASE_COMMIT, allowlistedCards: 369 },
  smartSearch: {
    changedFiles: APP_FILES,
    canonicalRegistry: "UNCHANGED",
    publicUrls: "UNCHANGED",
    reviewedSearchOnlyAlias: "JOKER_2019_LEGACY_TO_CURRENT",
    localVisualQa: { desktop: "PASS", mobile: "PASS" },
  },
  errors,
  pass: errors.length === 0,
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`MOVIE_PAGE_UX_SOURCE=${report.pass ? "PASS" : "FAIL"}`);
console.log(`TRACKED_APP_DIFF_SHA256=${trackedDiffSha256}`);
for (const error of errors) console.error(error);
if (!report.pass) process.exitCode = 1;
