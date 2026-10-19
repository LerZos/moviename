import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
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

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const { normalizeEpisodeGuideSnapshot } = require(
  `${repositoryRoot}/src/app/lib/episodeGuides/normalizer.ts`,
);
const { computeEpisodeGuideChecksum } = require(
  `${repositoryRoot}/src/app/lib/episodeGuides/checksum.ts`,
);
const { verifyEpisodeGuideSnapshot } = require(
  `${repositoryRoot}/src/app/lib/episodeGuides/verifier.ts`,
);
const {
  createEpisodeGuideSnapshotLoader,
  EpisodeGuideSnapshotVerificationError,
} = require(`${repositoryRoot}/src/app/lib/episodeGuides/loader.ts`);
const {
  CorruptEpisodeGuideImportStateError,
  DEFAULT_EPISODE_GUIDE_IMPORT_POLICY,
  EpisodeGuideImportControlError,
  EpisodeGuideImportRequestGate,
  classifyProviderResponse,
  createEpisodeGuideImportCacheRecord,
  createEpisodeGuideImportCheckpoint,
  getPendingCanonicalMovieIds,
  loadEpisodeGuideImportCheckpoint,
  mapWithConcurrency,
  parseRetryAfterMs,
  readEpisodeGuideImportCacheRecord,
  saveEpisodeGuideImportCheckpoint,
  writeEpisodeGuideImportCacheRecord,
} = require(`${repositoryRoot}/scripts/episode-guides/importInfrastructure.ts`);

const canonicalMovieId = "174f15d5-abe2-433e-9e8e-e65c61391ca2";
const identity = {
  canonicalMovieId,
  slug: "andor",
  legacyNumericId: 1,
  contentType: "series",
  tmdbNamespace: "tv",
  tmdbId: 83867,
  imdbId: "tt9253284",
  kinopoiskId: null,
};

function createCompleteInput() {
  return {
    canonicalMovieId,
    slug: "andor",
    provider: { source: "tmdb", namespace: "tv", id: 83867 },
    sourceLanguage: "en",
    observedAt: "2026-10-18T08:00:00.000Z",
    verificationStatus: "verified_complete",
    completeness: {
      status: "complete",
      expectedRegularSeasonCount: 1,
      expectedRegularEpisodeCount: 2,
    },
    regularSeasons: [
      {
        seasonNumber: 1,
        episodes: [
          {
            episodeNumber: 1,
            originalTitle: "First",
            russianTitle: "Первый",
            airDate: "2022-09-21",
          },
          { episodeNumber: 2, originalTitle: "Second" },
        ],
      },
    ],
    specials: [{ episodeNumber: 1, originalTitle: "Special" }],
    provenance: [
      {
        source: "tmdb",
        observedAt: "2026-10-18T08:00:00.000Z",
        verificationStatus: "verified",
        fields: [
          "counts",
          "seasonNumber",
          "episodeNumber",
          "originalTitle",
          "airDate",
        ],
        language: "en",
      },
      {
        source: "manual",
        observedAt: "2026-10-18T08:00:00.000Z",
        verificationStatus: "verified",
        fields: ["russianTitle"],
        language: "ru",
      },
    ],
  };
}

function issueCodes(result) {
  return result.valid ? [] : result.issues.map((issue) => issue.code);
}

test("normalization is deterministic and preserves optional dates", () => {
  const input = createCompleteInput();
  const reversed = structuredClone(input);
  reversed.regularSeasons[0].episodes.reverse();
  reversed.provenance.reverse();
  reversed.provenance.forEach((entry) => entry.fields.reverse());

  const first = normalizeEpisodeGuideSnapshot(input);
  const second = normalizeEpisodeGuideSnapshot(reversed);
  assert.equal(first.regularSeasons[0].episodes[1].airDate, undefined);
  assert.equal(first.checksum, second.checksum);
  assert.equal(first.checksum, computeEpisodeGuideChecksum(first));
  assert.deepEqual(verifyEpisodeGuideSnapshot(first, identity), {
    valid: true,
    issues: [],
  });
});

test("duplicate episodes and negative numbers are rejected", () => {
  const input = createCompleteInput();
  input.regularSeasons[0].episodes = [
    { episodeNumber: -1, originalTitle: "Invalid" },
    { episodeNumber: -1, originalTitle: "Duplicate" },
  ];
  const result = verifyEpisodeGuideSnapshot(
    normalizeEpisodeGuideSnapshot(input),
    identity,
  );
  assert.ok(issueCodes(result).includes("INVALID_EPISODE_NUMBER"));
  assert.ok(issueCodes(result).includes("DUPLICATE_EPISODE_NUMBER"));
});

test("specials remain separate from regular seasons", () => {
  const valid = normalizeEpisodeGuideSnapshot(createCompleteInput());
  assert.equal(valid.specials.length, 1);
  assert.equal(issueCodes(verifyEpisodeGuideSnapshot(valid, identity)).length, 0);

  const mixedInput = createCompleteInput();
  mixedInput.regularSeasons[0].seasonNumber = 0;
  const mixed = verifyEpisodeGuideSnapshot(
    normalizeEpisodeGuideSnapshot(mixedInput),
    identity,
  );
  assert.ok(issueCodes(mixed).includes("SPECIAL_MIXED_WITH_REGULAR_SEASONS"));
});

test("identity mismatches and tampered checksums block snapshots", () => {
  const providerMismatch = createCompleteInput();
  providerMismatch.provider.id = 999;
  assert.ok(
    issueCodes(
      verifyEpisodeGuideSnapshot(
        normalizeEpisodeGuideSnapshot(providerMismatch),
        identity,
      ),
    ).includes("PROVIDER_ID_MISMATCH"),
  );

  const tampered = normalizeEpisodeGuideSnapshot(createCompleteInput());
  tampered.checksum = "sha256:tampered";
  assert.ok(
    issueCodes(verifyEpisodeGuideSnapshot(tampered, identity)).includes(
      "CHECKSUM_MISMATCH",
    ),
  );
});

test("unverified translations cannot replace source-language titles", () => {
  const input = createCompleteInput();
  input.sourceLanguage = "ja";
  input.regularSeasons[0].episodes = [
    { episodeNumber: 1, originalTitle: "An English Translation" },
    { episodeNumber: 2, originalTitle: "Another Translation" },
  ];
  const result = verifyEpisodeGuideSnapshot(
    normalizeEpisodeGuideSnapshot(input),
    identity,
  );
  assert.ok(issueCodes(result).includes("UNVERIFIED_ORIGINAL_TITLE_LANGUAGE"));
});

test("incomplete guides are never promoted to complete automatically", () => {
  const pendingInput = createCompleteInput();
  delete pendingInput.verificationStatus;
  delete pendingInput.completeness;
  const pending = normalizeEpisodeGuideSnapshot(pendingInput);
  assert.equal(pending.verificationStatus, "pending");
  assert.equal(pending.completeness.status, "partial");
  assert.ok(
    issueCodes(verifyEpisodeGuideSnapshot(pending, identity)).includes(
      "SNAPSHOT_NOT_VERIFIED",
    ),
  );

  const incompleteInput = createCompleteInput();
  incompleteInput.completeness.expectedRegularEpisodeCount = 3;
  const incomplete = verifyEpisodeGuideSnapshot(
    normalizeEpisodeGuideSnapshot(incompleteInput),
    identity,
  );
  assert.ok(issueCodes(incomplete).includes("INCOMPLETE_GUIDE_MARKED_COMPLETE"));
});

test("lazy loader verifies identity before returning a snapshot", async () => {
  const snapshot = normalizeEpisodeGuideSnapshot(createCompleteInput());
  const load = createEpisodeGuideSnapshotLoader(
    {
      [canonicalMovieId]: {
        status: "available",
        slug: "andor",
        provider: { source: "tmdb", namespace: "tv", id: 83867 },
        load: async () => ({ episodeGuideSnapshot: snapshot }),
      },
    },
    () => identity,
  );
  assert.equal(await load(canonicalMovieId), snapshot);

  const wrongId = "01c49b47-8e78-48c7-a718-ec2c06824aa1";
  const loadMismatch = createEpisodeGuideSnapshotLoader(
    {
      [wrongId]: {
        status: "available",
        slug: "andor",
        provider: { source: "tmdb", namespace: "tv", id: 83867 },
        load: async () => ({ episodeGuideSnapshot: snapshot }),
      },
    },
    () => identity,
  );
  await assert.rejects(
    loadMismatch(wrongId),
    (error) =>
      error instanceof EpisodeGuideSnapshotVerificationError &&
      error.issueCodes.includes("MANIFEST_CANONICAL_ID_MISMATCH"),
  );
});

test("request gate defaults to offline and enforces allowlist and budget", () => {
  const offline = new EpisodeGuideImportRequestGate(
    DEFAULT_EPISODE_GUIDE_IMPORT_POLICY,
  );
  assert.throws(
    () => offline.reserve(canonicalMovieId),
    (error) =>
      error instanceof EpisodeGuideImportControlError &&
      error.code === "NETWORK_DISABLED",
  );

  const gate = new EpisodeGuideImportRequestGate({
    networkEnabled: true,
    allowlist: [canonicalMovieId],
    requestBudget: 1,
    concurrency: 2,
  });
  assert.equal(gate.reserve(canonicalMovieId), 1);
  assert.throws(
    () => gate.reserve(canonicalMovieId),
    (error) =>
      error instanceof EpisodeGuideImportControlError &&
      error.code === "REQUEST_BUDGET_EXHAUSTED",
  );
  assert.equal(gate.getState().stopReason, "request_budget_exhausted");
});

test("429 Retry-After and provider quota exhaustion are classified", () => {
  assert.equal(parseRetryAfterMs("7", 0), 7_000);
  assert.deepEqual(classifyProviderResponse({ status: 429, retryAfter: "2" }), {
    action: "retry",
    retryAfterMs: 2_000,
  });
  assert.deepEqual(
    classifyProviderResponse({ status: 429, quotaRemaining: 0 }),
    { action: "stop", reason: "provider_quota_exhausted" },
  );
});

test("concurrency helper never exceeds the configured limit", async () => {
  let active = 0;
  let maximum = 0;
  const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return value * 2;
  });
  assert.deepEqual(result, [2, 4, 6, 8, 10]);
  assert.equal(maximum, 2);
});

test("checkpoint and cache writes are atomic, resumable and corruption-safe", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kinoluma-e1-"));
  try {
    const allowlist = [
      canonicalMovieId,
      "01c49b47-8e78-48c7-a718-ec2c06824aa1",
    ];
    const checkpointPath = join(directory, "checkpoint.json");
    const checkpoint = createEpisodeGuideImportCheckpoint(
      allowlist,
      "2026-10-18T08:00:00.000Z",
    );
    checkpoint.completedCanonicalMovieIds.push(canonicalMovieId);
    checkpoint.requestCount = 1;
    checkpoint.status = "running";
    await saveEpisodeGuideImportCheckpoint(checkpointPath, checkpoint, allowlist);
    const resumed = await loadEpisodeGuideImportCheckpoint(
      checkpointPath,
      allowlist,
    );
    assert.deepEqual(getPendingCanonicalMovieIds(allowlist, resumed), [allowlist[1]]);
    assert.equal((await readdir(directory)).some((name) => name.endsWith(".tmp")), false);

    const cache = createEpisodeGuideImportCacheRecord({
      canonicalMovieId,
      provider: { namespace: "tv", id: 83867 },
      observedAt: "2026-10-18T08:00:00.000Z",
      payload: { seasons: [] },
    });
    await writeEpisodeGuideImportCacheRecord(directory, cache);
    assert.deepEqual(
      await readEpisodeGuideImportCacheRecord(directory, canonicalMovieId),
      cache,
    );

    await writeFile(checkpointPath, "{broken", "utf8");
    await assert.rejects(
      loadEpisodeGuideImportCheckpoint(checkpointPath, allowlist),
      CorruptEpisodeGuideImportStateError,
    );
    assert.equal((await readFile(checkpointPath, "utf8")).startsWith("{broken"), true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("offline dry-run validates all 10 pilot identities without network", () => {
  const output = execFileSync(
    process.execPath,
    [
      join(repositoryRoot, "scripts/episode-guides/e1-dry-run.mjs"),
      "--json",
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  const report = JSON.parse(output);
  assert.equal(report.status, "PASS");
  assert.equal(report.pilotCardsChecked, 10);
  assert.equal(report.publicGuidesCreated, 0);
  assert.equal(report.networkRequests, 0);
});

