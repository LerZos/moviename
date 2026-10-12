import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_COMMIT = "f660b0db6e7b3f9d3768dd49ec14b31d5333b6e5";

const EXPECTED_APP_FILES = new Map([
  ["src/app/HomeClient.tsx", "05a9e0d6ba951dfbc93a040d3e3403795d643077a6c04cb7bd07ab50d4e3d923"],
  ["src/app/catalog/[category]/CatalogPageClient.tsx", "0d3b3b09cf48b539e83ffe6bcd3f7a5d7cb07ae216e627587a4ffd6951c6bf6c"],
  ["src/app/collections/CollectionMovieGridClient.tsx", "83fa80e150dc68d15b72cd61b798e8233efc80f0e4d57105d854277261a4f41c"],
  ["src/app/collections/collectionStyles.ts", "be199b5c09fa5fd06cb9fa99852acedc230bc64cb8045d5f62064953bed4e44c"],
  ["src/app/components/PosterImage.tsx", "978f309b54e117e8b18e306b2ef0d9bf8cd4e8ab93b2434671fb7195648a708e"],
  ["src/app/globals.css", "50c4cf4e8219035aced8346096004f38e953ba3243bd891f32732383b7b2bf3c"],
  ["src/app/movie/[slug]/MoviePageClient.tsx", "8cc31e8e96d06e01227abc60a5d70a549ff5112269347c371c73fb6ae2045317"],
  ["src/app/profile/page.tsx", "4451849d1713f3d9e97ed1bc1a83c422875c333e1433f8492fe1df956b205aca"],
]);

const EXPECTED_CI_FILES = [
  ".github/ci/verify-global-poster-fix-source.mjs",
  ".github/ci/write-release-manifest.mjs",
  ".github/workflows/batch-b-linux-release.yml",
];

const repo = path.resolve(process.argv[2] ?? ".");
const reportPath = path.resolve(process.argv[3] ?? "poster-fix-source-verification.json");
const candidateRef = process.argv[4] ?? "HEAD";

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

const errors = [];
const parentCommit = git(["rev-parse", `${candidateRef}^`]).trim();
if (parentCommit !== BASE_COMMIT) {
  errors.push(`Release commit parent is ${parentCommit}, expected ${BASE_COMMIT}`);
}

const commitCount = Number(git(["rev-list", "--count", `${BASE_COMMIT}..${candidateRef}`]).trim());
if (commitCount !== 1) errors.push(`Expected one release commit after base, found ${commitCount}`);

const changedFiles = git(["diff", "--name-only", BASE_COMMIT, candidateRef])
  .split(/\r?\n/)
  .filter(Boolean)
  .sort();
const changedAppFiles = changedFiles.filter((file) => file.startsWith("src/")).sort();
const expectedAppFiles = [...EXPECTED_APP_FILES.keys()].sort();
const expectedChangedFiles = [...expectedAppFiles, ...EXPECTED_CI_FILES].sort();

if (JSON.stringify(changedAppFiles) !== JSON.stringify(expectedAppFiles)) {
  errors.push("Application diff is not the approved eight-file poster fix");
}
if (JSON.stringify(changedFiles) !== JSON.stringify(expectedChangedFiles)) {
  errors.push("Release diff contains missing or unexpected files");
}

const fileChecks = [];
for (const [relativePath, expectedSha256] of EXPECTED_APP_FILES) {
  const actualSha256 = sha256(git(["show", `${candidateRef}:${relativePath}`], { encoding: "buffer" }));
  const pass = actualSha256 === expectedSha256;
  fileChecks.push({ path: relativePath, expectedSha256, actualSha256, pass });
  if (!pass) errors.push(`Approved file hash mismatch: ${relativePath}`);
}

const rawDiff = git(
  [
    "diff",
    "--binary",
    "--no-ext-diff",
    "--src-prefix=a/",
    "--dst-prefix=b/",
    BASE_COMMIT,
    candidateRef,
    "--",
    ...expectedAppFiles,
  ],
  { encoding: "buffer" },
);
const canonicalDiff = rawDiff.at(-1) === 0x0a ? rawDiff.subarray(0, -1) : rawDiff;
const trackedDiffSha256 = sha256(canonicalDiff);

const report = {
  schemaVersion: 1,
  releaseName: "kinoluma-global-poster-fix-linux-candidate",
  baseCommit: BASE_COMMIT,
  parentCommit,
  releaseCommit: git(["rev-parse", candidateRef]).trim(),
  commitCount,
  changedFiles,
  changedAppFiles,
  changedAppFilesCount: changedAppFiles.length,
  expectedAppFilesCount: expectedAppFiles.length,
  trackedDiffSha256,
  fileChecks,
  batchB: {
    totalImageMutations: 481,
    inheritedUnchangedFrom: BASE_COMMIT,
  },
  manualOverrides: {
    preserved: 9,
    inheritedUnchangedFrom: BASE_COMMIT,
  },
  visualParityEvidence: {
    desktop: "NOT_RUN_IN_CI",
    mobile: "NOT_RUN_IN_CI",
    note: "CI validates the exact locally audited poster-fix hashes; it does not run screenshot comparison.",
  },
  errors,
  pass: errors.length === 0,
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`SOURCE_FILES=${report.changedAppFilesCount}/8`);
console.log(`POSTER_FIX_DIFF_SHA256=${report.trackedDiffSha256}`);
console.log(`SOURCE_VERIFY=${report.pass ? "PASS" : "FAIL"}`);

if (!report.pass) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
}
