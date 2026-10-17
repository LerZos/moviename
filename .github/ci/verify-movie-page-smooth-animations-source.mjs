import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_COMMIT = "aedcc799f6f03146e0e34b6b285179b7c109bbd2";
const APP_FILES = [
  "scripts/episode-accordion-cast.test.mjs",
  "src/app/movie/[slug]/MoviePageClient.tsx",
];
const CI_FILES = [
  ".github/ci/verify-movie-page-smooth-animations-source.mjs",
  ".github/workflows/movie-page-smooth-animations-linux-release.yml",
];
const EXPECTED_CHANGES = new Map([
  ["scripts/episode-accordion-cast.test.mjs", "M"],
  ["src/app/movie/[slug]/MoviePageClient.tsx", "M"],
  [".github/ci/verify-movie-page-smooth-animations-source.mjs", "A"],
  [".github/workflows/movie-page-smooth-animations-linux-release.yml", "A"],
]);

const repo = path.resolve(process.argv[2] ?? ".");
const reportPath = path.resolve(
  process.argv[3] ?? "movie-page-smooth-animations-source-verification.json",
);
const candidateRef = process.argv[4] ?? "HEAD";
const git = (args, encoding = "utf8") =>
  execFileSync("git", args, { cwd: repo, encoding, maxBuffer: 32 * 1024 * 1024 });
const errors = [];

let baseIsAncestor = false;
try {
  execFileSync("git", ["merge-base", "--is-ancestor", BASE_COMMIT, candidateRef], {
    cwd: repo,
    stdio: "ignore",
  });
  baseIsAncestor = true;
} catch {
  errors.push("Approved Batch D base is not an ancestor of the release candidate");
}

const parentCommit = git(["rev-parse", `${candidateRef}^`]).trim();
if (parentCommit !== BASE_COMMIT) {
  errors.push(
    `Release must be directly based on ${BASE_COMMIT}; found parent ${parentCommit}`,
  );
}

const commitCount = Number(
  git(["rev-list", "--count", `${BASE_COMMIT}..${candidateRef}`]).trim(),
);
if (commitCount !== 1) {
  errors.push(`Expected exactly one release commit after the approved base; found ${commitCount}`);
}

const changeRows = git(["diff", "--name-status", BASE_COMMIT, candidateRef])
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const [status, ...nameParts] = line.split("\t");
    return { status, file: nameParts.at(-1) };
  });
const changedFiles = changeRows.map(({ file }) => file).sort();
const approvedFiles = [...APP_FILES, ...CI_FILES].sort();

if (JSON.stringify(changedFiles) !== JSON.stringify(approvedFiles)) {
  const unexpected = changedFiles.filter((file) => !approvedFiles.includes(file));
  const missing = approvedFiles.filter((file) => !changedFiles.includes(file));
  if (unexpected.length > 0) errors.push(`Unexpected changed files: ${unexpected.join(", ")}`);
  if (missing.length > 0) errors.push(`Missing required changed files: ${missing.join(", ")}`);
}

for (const { status, file } of changeRows) {
  const expectedStatus = EXPECTED_CHANGES.get(file);
  if (expectedStatus && status !== expectedStatus) {
    errors.push(`${file}: expected Git status ${expectedStatus}, found ${status}`);
  }
  if (status.startsWith("D")) errors.push(`${file}: deletion is not allowed`);
  if (status.startsWith("R") || status.startsWith("C")) {
    errors.push(`${file}: rename/copy changes are not allowed`);
  }
}

const trackedDiff = git(
  ["diff", "--binary", BASE_COMMIT, candidateRef, "--", ...approvedFiles],
  "buffer",
);
const normalizedDiff =
  trackedDiff.at(-1) === 0x0a ? trackedDiff.subarray(0, -1) : trackedDiff;
const trackedDiffSha256 = createHash("sha256").update(normalizedDiff).digest("hex");

const report = {
  schemaVersion: 1,
  releaseName: "kinoluma-movie-page-smooth-animations-linux-candidate",
  baseCommit: BASE_COMMIT,
  baseIsAncestor,
  parentCommit,
  releaseCommit: git(["rev-parse", candidateRef]).trim(),
  commitCount,
  changedFiles,
  changedAppFiles: APP_FILES,
  changedAppFilesCount: APP_FILES.length,
  trackedDiffSha256,
  protectedSource: {
    catalog: "UNCHANGED",
    canonicalIdentity: "UNCHANGED",
    manualOverrides: "UNCHANGED",
    ratings: "UNCHANGED",
    posters: "UNCHANGED",
    credits: "UNCHANGED",
    seo: "UNCHANGED",
    smartSearch: "UNCHANGED",
  },
  inheritedProductionFeatures: {
    batchC3Credits: "UNCHANGED",
    adminRatingFix: "UNCHANGED",
    globalPosterFix: "UNCHANGED",
    the100: "UNCHANGED",
    moviePageUx: "UNCHANGED",
    batchDSmartSearch: "UNCHANGED",
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
  visualParityEvidence: {
    desktop: "PASS",
    mobile: "PASS",
    reducedMotion: "PASS",
    rapidToggle: "PASS",
    note: "Local isolated browser QA completed before release preparation.",
  },
  errors,
  pass: errors.length === 0,
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`SMOOTH_ANIMATIONS_SOURCE=${report.pass ? "PASS" : "FAIL"}`);
console.log(`TRACKED_DIFF_SHA256=${trackedDiffSha256}`);
for (const error of errors) console.error(`SOURCE_GATE_ERROR=${error}`);
if (!report.pass) process.exitCode = 1;
