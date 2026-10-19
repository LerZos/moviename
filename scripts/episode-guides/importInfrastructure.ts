import "server-only";

import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  rename,
  unlink,
} from "node:fs/promises";
import { dirname, join } from "node:path";

import type { CanonicalMovieId } from "../../src/app/data/canonicalIdentity";

export type EpisodeGuideImportPolicy = {
  networkEnabled: boolean;
  allowlist: readonly CanonicalMovieId[];
  requestBudget: number;
  concurrency: number;
};

export const DEFAULT_EPISODE_GUIDE_IMPORT_POLICY = Object.freeze({
  networkEnabled: false,
  allowlist: Object.freeze([]),
  requestBudget: 0,
  concurrency: 1,
}) satisfies EpisodeGuideImportPolicy;

export type ImportStopReason = "request_budget_exhausted" | "provider_quota_exhausted";

export class EpisodeGuideImportControlError extends Error {
  constructor(
    readonly code:
      | "NETWORK_DISABLED"
      | "NOT_ALLOWLISTED"
      | "REQUEST_BUDGET_EXHAUSTED"
      | "IMPORT_STOPPED",
    message: string,
  ) {
    super(message);
    this.name = "EpisodeGuideImportControlError";
  }
}

export class EpisodeGuideImportRequestGate {
  private readonly allowedIds: ReadonlySet<CanonicalMovieId>;
  private usedRequests: number;
  private stopReason: ImportStopReason | null = null;

  constructor(
    readonly policy: EpisodeGuideImportPolicy = DEFAULT_EPISODE_GUIDE_IMPORT_POLICY,
    initialRequestCount = 0,
  ) {
    if (!Number.isInteger(policy.requestBudget) || policy.requestBudget < 0) {
      throw new Error("requestBudget must be a non-negative integer");
    }
    if (!Number.isInteger(policy.concurrency) || policy.concurrency < 1) {
      throw new Error("concurrency must be a positive integer");
    }
    if (!Number.isInteger(initialRequestCount) || initialRequestCount < 0) {
      throw new Error("initialRequestCount must be a non-negative integer");
    }
    this.allowedIds = new Set(policy.allowlist);
    this.usedRequests = initialRequestCount;
  }

  reserve(canonicalMovieId: CanonicalMovieId) {
    if (!this.policy.networkEnabled) {
      throw new EpisodeGuideImportControlError(
        "NETWORK_DISABLED",
        "Network is disabled by default; enable it explicitly for a reviewed import.",
      );
    }
    if (!this.allowedIds.has(canonicalMovieId)) {
      throw new EpisodeGuideImportControlError(
        "NOT_ALLOWLISTED",
        `Canonical ID is not allowlisted: ${canonicalMovieId}`,
      );
    }
    if (this.stopReason) {
      throw new EpisodeGuideImportControlError(
        "IMPORT_STOPPED",
        `Import is stopped: ${this.stopReason}`,
      );
    }
    if (this.usedRequests >= this.policy.requestBudget) {
      this.stopReason = "request_budget_exhausted";
      throw new EpisodeGuideImportControlError(
        "REQUEST_BUDGET_EXHAUSTED",
        "Request budget is exhausted.",
      );
    }

    this.usedRequests += 1;
    return this.usedRequests;
  }

  markProviderQuotaExhausted() {
    this.stopReason = "provider_quota_exhausted";
  }

  getState() {
    return {
      requestCount: this.usedRequests,
      remainingBudget: Math.max(0, this.policy.requestBudget - this.usedRequests),
      stopReason: this.stopReason,
    } as const;
  }
}

export function parseRetryAfterMs(value: string | null | undefined, now = Date.now()) {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1_000;

  const retryAt = Date.parse(trimmed);
  if (Number.isNaN(retryAt)) return null;
  return Math.max(0, retryAt - now);
}

export function classifyProviderResponse(input: {
  status: number;
  retryAfter?: string | null;
  quotaRemaining?: number | null;
  now?: number;
}) {
  if (input.quotaRemaining === 0) {
    return { action: "stop", reason: "provider_quota_exhausted" } as const;
  }
  if (input.status === 429) {
    return {
      action: "retry",
      retryAfterMs: parseRetryAfterMs(input.retryAfter, input.now) ?? 60_000,
    } as const;
  }
  return { action: "continue" } as const;
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("concurrency must be a positive integer");
  }
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runWorker),
  );
  return results;
}

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right, "en"))
        .map(([key, child]) => [key, canonicalizeJson(child)]),
    );
  }
  return value;
}

function jsonChecksum(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalizeJson(value)), "utf8")
    .digest("hex")}`;
}

export async function writeJsonAtomic(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  let handle: Awaited<ReturnType<typeof open>> | null = null;

  try {
    handle = await open(temporaryPath, "wx");
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temporaryPath, path);
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

export class CorruptEpisodeGuideImportStateError extends Error {
  constructor(path: string, reason: string) {
    super(`Corrupt episode-guide import state at ${path}: ${reason}`);
    this.name = "CorruptEpisodeGuideImportStateError";
  }
}

async function readJson(path: string) {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new CorruptEpisodeGuideImportStateError(
      path,
      error instanceof Error ? error.message : "invalid JSON",
    );
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export type EpisodeGuideImportCheckpoint = {
  schemaVersion: 1;
  allowlistChecksum: string;
  completedCanonicalMovieIds: CanonicalMovieId[];
  failedCanonicalMovieIds: CanonicalMovieId[];
  requestCount: number;
  status: "ready" | "running" | "quota_exhausted" | "complete";
  updatedAt: string;
};

export function computeAllowlistChecksum(allowlist: readonly CanonicalMovieId[]) {
  return jsonChecksum([...allowlist]);
}

export function createEpisodeGuideImportCheckpoint(
  allowlist: readonly CanonicalMovieId[],
  updatedAt = new Date().toISOString(),
): EpisodeGuideImportCheckpoint {
  return {
    schemaVersion: 1,
    allowlistChecksum: computeAllowlistChecksum(allowlist),
    completedCanonicalMovieIds: [],
    failedCanonicalMovieIds: [],
    requestCount: 0,
    status: "ready",
    updatedAt,
  };
}

function validateCheckpoint(
  path: string,
  value: unknown,
  allowlist: readonly CanonicalMovieId[],
): EpisodeGuideImportCheckpoint {
  const record = asRecord(value);
  const allowedIds = new Set(allowlist);
  const validStatuses = new Set(["ready", "running", "quota_exhausted", "complete"]);
  if (
    !record ||
    record.schemaVersion !== 1 ||
    record.allowlistChecksum !== computeAllowlistChecksum(allowlist) ||
    !isStringArray(record.completedCanonicalMovieIds) ||
    !isStringArray(record.failedCanonicalMovieIds) ||
    !Number.isInteger(record.requestCount) ||
    (record.requestCount as number) < 0 ||
    typeof record.status !== "string" ||
    !validStatuses.has(record.status) ||
    typeof record.updatedAt !== "string" ||
    Number.isNaN(Date.parse(record.updatedAt))
  ) {
    throw new CorruptEpisodeGuideImportStateError(path, "invalid checkpoint shape");
  }

  const completed = record.completedCanonicalMovieIds;
  const failed = record.failedCanonicalMovieIds;
  if (
    new Set(completed).size !== completed.length ||
    new Set(failed).size !== failed.length ||
    completed.some((id) => !allowedIds.has(id)) ||
    failed.some((id) => !allowedIds.has(id))
  ) {
    throw new CorruptEpisodeGuideImportStateError(
      path,
      "checkpoint contains duplicate or non-allowlisted IDs",
    );
  }

  return record as EpisodeGuideImportCheckpoint;
}

export async function saveEpisodeGuideImportCheckpoint(
  path: string,
  checkpoint: EpisodeGuideImportCheckpoint,
  allowlist: readonly CanonicalMovieId[],
) {
  validateCheckpoint(path, checkpoint, allowlist);
  await writeJsonAtomic(path, checkpoint);
}

export async function loadEpisodeGuideImportCheckpoint(
  path: string,
  allowlist: readonly CanonicalMovieId[],
) {
  const value = await readJson(path);
  return value === null ? null : validateCheckpoint(path, value, allowlist);
}

export function getPendingCanonicalMovieIds(
  allowlist: readonly CanonicalMovieId[],
  checkpoint: EpisodeGuideImportCheckpoint,
) {
  const completed = new Set(checkpoint.completedCanonicalMovieIds);
  return allowlist.filter((canonicalMovieId) => !completed.has(canonicalMovieId));
}

export type EpisodeGuideImportCacheRecord = {
  schemaVersion: 1;
  canonicalMovieId: CanonicalMovieId;
  provider: { namespace: "tv"; id: number };
  observedAt: string;
  payload: unknown;
  checksum: string;
};

export function createEpisodeGuideImportCacheRecord(
  value: Omit<EpisodeGuideImportCacheRecord, "schemaVersion" | "checksum">,
): EpisodeGuideImportCacheRecord {
  const payload = { schemaVersion: 1 as const, ...value };
  return { ...payload, checksum: jsonChecksum(payload) };
}

function getCachePath(directory: string, canonicalMovieId: CanonicalMovieId) {
  if (!/^[0-9a-f-]{36}$/i.test(canonicalMovieId)) {
    throw new Error("Unsafe canonicalMovieId for cache path");
  }
  return join(directory, `${canonicalMovieId}.json`);
}

function validateCacheRecord(path: string, value: unknown) {
  const record = asRecord(value);
  if (
    !record ||
    record.schemaVersion !== 1 ||
    typeof record.canonicalMovieId !== "string" ||
    !asRecord(record.provider) ||
    asRecord(record.provider)?.namespace !== "tv" ||
    !Number.isInteger(asRecord(record.provider)?.id) ||
    typeof record.observedAt !== "string" ||
    Number.isNaN(Date.parse(record.observedAt)) ||
    typeof record.checksum !== "string"
  ) {
    throw new CorruptEpisodeGuideImportStateError(path, "invalid cache shape");
  }

  const { checksum, ...payload } = record;
  if (checksum !== jsonChecksum(payload)) {
    throw new CorruptEpisodeGuideImportStateError(path, "cache checksum mismatch");
  }
  return record as EpisodeGuideImportCacheRecord;
}

export async function writeEpisodeGuideImportCacheRecord(
  directory: string,
  record: EpisodeGuideImportCacheRecord,
) {
  const path = getCachePath(directory, record.canonicalMovieId);
  validateCacheRecord(path, record);
  await writeJsonAtomic(path, record);
}

export async function readEpisodeGuideImportCacheRecord(
  directory: string,
  canonicalMovieId: CanonicalMovieId,
) {
  const path = getCachePath(directory, canonicalMovieId);
  const value = await readJson(path);
  return value === null ? null : validateCacheRecord(path, value);
}

