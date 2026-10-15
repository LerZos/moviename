import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_COMMIT = "4e05f90b20bff8c65d8ab4bf8bcda09d03b66d33";
const APP_FILES = [
  "scripts/the-100.test.mjs",
  "src/app/data/canonicalIdentity.ts",
  "src/app/data/manualCanonicalMovieAdditions.ts",
  "src/app/data/manualThe100Addition.ts",
  "src/app/data/manualThe100Episodes.ts",
  "src/app/data/movieCardIndex.ts",
  "src/app/data/movies.ts",
  "src/app/data/profileCatalogItems.ts",
  "src/app/movie/[slug]/MoviePageClient.tsx",
];
const CI_FILES = [
  ".github/ci/runtime-qa.mjs",
  ".github/ci/verify-the-100-source.mjs",
  ".github/ci/write-release-manifest.mjs",
  ".github/workflows/batch-b-linux-release.yml",
];
const repo = path.resolve(process.argv[2] ?? ".");
const reportPath = path.resolve(process.argv[3] ?? "the-100-source-verification.json");
const candidateRef = process.argv[4] ?? "HEAD";
const git = (args, encoding = "utf8") =>
  execFileSync("git", args, { cwd: repo, encoding, maxBuffer: 32 * 1024 * 1024 });
const errors = [];
const parentCommit = git(["rev-parse", `${candidateRef}^`]).trim();
if (parentCommit !== BASE_COMMIT) errors.push("Release parent is not the approved production source commit");

const commitCount = Number(git(["rev-list", "--count", `${BASE_COMMIT}..${candidateRef}`]).trim());
if (commitCount !== 1) errors.push(`Expected one release commit, found ${commitCount}`);

const changedFiles = git(["diff", "--name-only", BASE_COMMIT, candidateRef])
  .trim().split(/\r?\n/).filter(Boolean).sort();
if (JSON.stringify(changedFiles) !== JSON.stringify([...APP_FILES, ...CI_FILES].sort())) {
  errors.push("Missing or unexpected files in The 100 release diff");
}

const appDiff = git(["diff", "--binary", BASE_COMMIT, candidateRef, "--", ...APP_FILES], "buffer");
const normalizedDiff = appDiff.at(-1) === 0x0a ? appDiff.subarray(0, -1) : appDiff;
const trackedDiffSha256 = createHash("sha256").update(normalizedDiff).digest("hex");
const report = {
  schemaVersion: 1,
  releaseName: "kinoluma-the-100-linux-candidate",
  baseCommit: BASE_COMMIT,
  parentCommit,
  releaseCommit: git(["rev-parse", candidateRef]).trim(),
  commitCount,
  changedFiles,
  changedAppFiles: APP_FILES,
  changedAppFilesCount: APP_FILES.length,
  trackedDiffSha256,
  the100: { slug: "the-100-2014", tmdbNamespace: "tv", tmdbId: 48866, seasons: 7, episodes: 100 },
  batchB: { totalImageMutations: 481, inheritedUnchangedFrom: BASE_COMMIT },
  manualOverrides: { preserved: 9, inheritedUnchangedFrom: BASE_COMMIT },
  credits: { inheritedUnchangedFrom: BASE_COMMIT, allowlistedCards: 369 },
  visualParityEvidence: { desktop: "NOT_RUN_IN_CI", mobile: "NOT_RUN_IN_CI" },
  errors,
  pass: errors.length === 0,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`THE_100_SOURCE=${report.pass ? "PASS" : "FAIL"}`);
console.log(`TRACKED_APP_DIFF_SHA256=${trackedDiffSha256}`);
for (const error of errors) console.error(error);
if (!report.pass) process.exitCode = 1;
