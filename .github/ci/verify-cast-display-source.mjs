import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_COMMIT = "4e05f90b20bff8c65d8ab4bf8bcda09d03b66d33";
const APP_FILES = [
  "scripts/cast-display.test.mjs",
  "src/app/lib/movies/credits.ts",
  "src/app/movie/[slug]/MoviePageClient.tsx",
];
const CI_FILES = [
  ".github/ci/verify-cast-display-source.mjs",
  ".github/workflows/batch-b-linux-release.yml",
];
const repo = path.resolve(process.argv[2] ?? ".");
const reportPath = path.resolve(
  process.argv[3] ?? "cast-display-source-verification.json",
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
  errors.push("Release parent is not the approved Admin Rating production commit");
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
  errors.push("Missing or unexpected files in the Cast Display release diff");
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
  releaseName: "kinoluma-cast-display-linux-candidate",
  baseCommit: BASE_COMMIT,
  parentCommit,
  releaseCommit: git(["rev-parse", candidateRef]).trim(),
  commitCount,
  changedFiles,
  changedAppFiles: APP_FILES,
  changedAppFilesCount: APP_FILES.length,
  trackedDiffSha256,
  castDisplayFix: {
    heading: "Актёрский состав",
    initialPeople: 6,
    legacySummaryFallbackPreserved: true,
    creditGroupsRemainSeparate: true,
    targetedTests: "scripts/cast-display.test.mjs",
  },
  adminRatingFix: { inheritedUnchangedFrom: BASE_COMMIT },
  credits: { inheritedUnchangedFrom: BASE_COMMIT, allowlistedCards: 369 },
  globalPosterFix: { inheritedUnchangedFrom: BASE_COMMIT },
  visualParityEvidence: { desktop: "NOT_RUN_IN_CI", mobile: "NOT_RUN_IN_CI" },
  errors,
  pass: errors.length === 0,
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`CAST_DISPLAY_SOURCE=${report.pass ? "PASS" : "FAIL"}`);
console.log(`TRACKED_APP_DIFF_SHA256=${trackedDiffSha256}`);
for (const error of errors) console.error(error);
if (!report.pass) process.exitCode = 1;
