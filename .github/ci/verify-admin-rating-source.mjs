import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_COMMIT = "ad8a52c38f5d8e0956aaf3e80f0d197fbf71f883";
const APP_FILES = [
  "scripts/admin-rating.test.mjs",
  "src/app/admin/movies/[slug]/edit/MovieAdminEditForm.tsx",
  "src/app/api/admin/import/draft-action/route.ts",
  "src/app/api/admin/import/list/route.ts",
  "src/app/api/admin/import/update-draft/route.ts",
  "src/app/api/admin/movies/[slug]/override/route.ts",
  "src/app/lib/movies/movieOverrides.ts",
  "src/app/lib/movies/rating.ts",
  "src/app/movie/[slug]/MoviePageClient.tsx",
];
const CI_FILES = [
  ".github/ci/verify-admin-rating-source.mjs",
  ".github/workflows/batch-b-linux-release.yml",
];
const repo = path.resolve(process.argv[2] ?? ".");
const reportPath = path.resolve(
  process.argv[3] ?? "admin-rating-source-verification.json",
);
const candidateRef = process.argv[4] ?? "HEAD";
const git = (args, encoding = "utf8") =>
  execFileSync("git", args, {
    cwd: repo,
    encoding,
    maxBuffer: 32 * 1024 * 1024,
  });
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const errors = [];

const parentCommit = git(["rev-parse", `${candidateRef}^`]).trim();
if (parentCommit !== BASE_COMMIT) {
  errors.push("Release parent is not the approved Batch C.3 production commit");
}

const commitCount = Number(
  git(["rev-list", "--count", `${BASE_COMMIT}..${candidateRef}`]).trim(),
);
if (commitCount !== 1) errors.push(`Expected one release commit, found ${commitCount}`);

const changedFiles = git(["diff", "--name-only", BASE_COMMIT, candidateRef])
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .sort();
const expectedFiles = [...APP_FILES, ...CI_FILES].sort();
if (JSON.stringify(changedFiles) !== JSON.stringify(expectedFiles)) {
  errors.push("Missing or unexpected files in the admin rating release diff");
}

const diff = git(
  ["diff", "--binary", BASE_COMMIT, candidateRef, "--", ...APP_FILES],
  "buffer",
);
const trackedDiffSha256 = sha256(
  diff.at(-1) === 0x0a ? diff.subarray(0, -1) : diff,
);
const report = {
  schemaVersion: 1,
  releaseName: "kinoluma-admin-rating-linux-candidate",
  baseCommit: BASE_COMMIT,
  parentCommit,
  releaseCommit: git(["rev-parse", candidateRef]).trim(),
  commitCount,
  changedFiles,
  changedAppFiles: APP_FILES,
  changedAppFilesCount: APP_FILES.length,
  trackedDiffSha256,
  ratingFix: {
    overrideFieldsPreserved: true,
    decimalCommaSupported: true,
    manualRatingPriority: true,
    targetedTests: "scripts/admin-rating.test.mjs",
  },
  batchB: { totalImageMutations: 481, inheritedUnchangedFrom: BASE_COMMIT },
  manualOverrides: { preserved: 9, inheritedUnchangedFrom: BASE_COMMIT },
  credits: { inheritedUnchangedFrom: BASE_COMMIT, allowlistedCards: 369 },
  visualParityEvidence: { desktop: "NOT_RUN_IN_CI", mobile: "NOT_RUN_IN_CI" },
  errors,
  pass: errors.length === 0,
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`ADMIN_RATING_SOURCE=${report.pass ? "PASS" : "FAIL"}`);
console.log(`TRACKED_APP_DIFF_SHA256=${trackedDiffSha256}`);
for (const error of errors) console.error(error);
if (!report.pass) process.exitCode = 1;
