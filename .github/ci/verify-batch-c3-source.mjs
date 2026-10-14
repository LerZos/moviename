import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_COMMIT = "e6ec7708720e8c1e228d77daa331ccf0f4574615";
const PLAN_SHA256 = "7eb1168f8b1ea93118c9fccec1a4507ae5d0fc1c8c2eedea6f8410440eaaaf78";
const SOURCE_FILES = [
  "scripts/batch-c3-credits.test.mjs",
  "scripts/credits-normalization.test.mjs",
  "scripts/generate-batch-c3-credits.mjs",
  "src/app/data/generatedCanonicalCredits.ts",
  "src/app/data/movies.ts",
  "src/app/lib/import/curatedPack300.ts",
  "src/app/lib/import/fetchMovieFacts.ts",
  "src/app/lib/movies/credits.ts",
  "src/app/lib/movies/movieOverrides.ts",
  "src/app/lib/movies/verifiedCredits.ts",
  "src/app/movie/[slug]/MoviePageClient.tsx",
];
const RELEASE_FILES = [
  ".github/ci/verify-batch-c3-pages.mjs",
  ".github/ci/verify-batch-c3-source.mjs",
  ".github/ci/write-release-manifest.mjs",
  ".github/workflows/batch-b-linux-release.yml",
  "release-plans/batch-c3-dry-run-plan.json",
  "release-plans/batch-c3-manual-overrides-audit.json",
];
const repo = path.resolve(process.argv[2] ?? ".");
const reportPath = path.resolve(process.argv[3] ?? "batch-c3-source-verification.json");
const candidateRef = process.argv[4] ?? "HEAD";
const git = (args, encoding = "utf8") => execFileSync("git", args, { cwd: repo, encoding, maxBuffer: 32 * 1024 * 1024 });
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const errors = [];

const parentCommit = git(["rev-parse", `${candidateRef}^`]).trim();
if (parentCommit !== BASE_COMMIT) errors.push("Release parent is not the approved production commit");
const commitCount = Number(git(["rev-list", "--count", `${BASE_COMMIT}..${candidateRef}`]).trim());
if (commitCount !== 1) errors.push(`Expected one release commit, found ${commitCount}`);
const changedFiles = git(["diff", "--name-only", BASE_COMMIT, candidateRef]).trim().split(/\r?\n/).filter(Boolean).sort();
const expectedFiles = [...SOURCE_FILES, ...RELEASE_FILES].sort();
if (JSON.stringify(changedFiles) !== JSON.stringify(expectedFiles)) {
  errors.push("Missing or unexpected files in the release diff");
}

const planBytes = git(["show", `${candidateRef}:release-plans/batch-c3-dry-run-plan.json`], "buffer");
const planSha256 = sha256(planBytes);
if (planSha256 !== PLAN_SHA256) errors.push("Approved dry-run plan SHA-256 mismatch");
const plan = JSON.parse(planBytes.toString("utf8"));
if (plan.sourceCommit !== BASE_COMMIT || plan.summary?.eligible !== 369 ||
    plan.summary?.provenance?.FULLY_VERIFIED !== 84 || plan.summary?.provenance?.TMDB_ONLY !== 285 ||
    plan.allowlist?.length !== 369 ||
    new Set(plan.allowlist.map((entry) => entry.canonicalMovieId)).size !== 369 ||
    plan.allowlist.some((entry) => entry.fields?.voiceActors?.length)) {
  errors.push("Dry-run plan identity or scope gate failed");
}
const generated = git(["show", `${candidateRef}:src/app/data/generatedCanonicalCredits.ts`]);
const generatedEntries = generated.split(/\r?\n/)
  .filter((line) => /^  \{.*\},$/.test(line))
  .map((line) => JSON.parse(line.trim().slice(0, -1)));
if (JSON.stringify(generatedEntries) !== JSON.stringify(plan.allowlist)) {
  errors.push("Generated credits do not match the approved allowlist and fields");
}
const audit = JSON.parse(git(["show", `${candidateRef}:release-plans/batch-c3-manual-overrides-audit.json`]));
if (audit.allowlistPlanSha256 !== PLAN_SHA256 || audit.allowlistChecked !== 369 ||
    audit.allowlistedCardsWithCreditsOverride !== 0 || audit.earlyHistoricalCardsWithoutCheckpointCovered !== 17) {
  errors.push("Manual-override read-only audit attestation mismatch");
}

const diff = git(["diff", "--binary", BASE_COMMIT, candidateRef, "--", ...SOURCE_FILES], "buffer");
const sourceDiffSha256 = sha256(diff.at(-1) === 0x0a ? diff.subarray(0, -1) : diff);
const report = {
  schemaVersion: 1,
  releaseName: "kinoluma-batch-c3-linux-candidate",
  baseCommit: BASE_COMMIT,
  parentCommit,
  releaseCommit: git(["rev-parse", candidateRef]).trim(),
  commitCount,
  changedFiles,
  changedAppFiles: SOURCE_FILES,
  changedAppFilesCount: SOURCE_FILES.length,
  trackedDiffSha256: sourceDiffSha256,
  planSha256,
  credits: {
    eligible: plan.summary.eligible,
    provenance: plan.summary.provenance,
    fields: plan.summary.fields,
    manualOverrideAudit: "READ_ONLY_369_NO_CONFLICTS",
  },
  batchB: { totalImageMutations: 481, inheritedUnchangedFrom: BASE_COMMIT },
  manualOverrides: { preserved: 9, inheritedUnchangedFrom: BASE_COMMIT },
  visualParityEvidence: { desktop: "NOT_RUN_IN_CI", mobile: "NOT_RUN_IN_CI" },
  errors,
  pass: errors.length === 0,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`BATCH_C3_SOURCE=${report.pass ? "PASS" : "FAIL"} entries=${plan.allowlist.length}`);
console.log(`PLAN_SHA256=${planSha256}`);
for (const error of errors) console.error(error);
if (!report.pass) process.exitCode = 1;
