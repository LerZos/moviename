import "server-only";
import { createHash } from "node:crypto";
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import { request } from "node:https";
import { join } from "node:path";
import {
  EpisodeGuideImportRequestGate,
  classifyProviderResponse,
  writeJsonAtomic,
} from "./importInfrastructure";

export const E3_IDS = Object.freeze({
  246: "c5cf7ec6-d093-43b0-84b8-9f903c332451",
  41727: "bc84cfc1-a6fb-4bc0-9661-24fca39c6363",
  66292: "42989ff4-cd94-4f82-a7b0-7d75b3a73fe5",
});
export const E3_BUDGET = 33;
export const E3_SERIES_BUDGETS = Object.freeze({ 246: 11, 41727: 13, 66292: 9 });

type Entry = {
  endpoint: string;
  canonicalMovieId: string;
  startedAt: string;
  outcome: "reserved" | "response" | "network_error";
  status?: number;
  observedAt?: string;
  retryAfterMs?: number;
  quotaExhausted?: boolean;
  payload?: unknown;
};
type Journal = { version: 1; authorization: "E3-three-series-33-GET"; entries: Entry[] };
export type TransportResponse = {
  status: number;
  payload: unknown;
  retryAfter?: string;
  quotaRemaining?: number;
};
export type Sender = (endpoint: string) => Promise<TransportResponse>;

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function endpointTmdbId(endpoint: string) {
  const match = /^\/3\/tv\/(246|41727|66292)(?:\/season\/(0|[1-9]\d*))?\?language=(ru-RU|en-US)$/.exec(endpoint);
  if (!match) throw new Error("ENDPOINT_NOT_ALLOWLISTED");
  return Number(match[1]) as keyof typeof E3_IDS;
}

export function endpointIdentity(endpoint: string) {
  return E3_IDS[endpointTmdbId(endpoint)];
}

// One native HTTPS request, without redirect following or automatic retries.
// PersistentTmdbE3Pilot durably reserves every invocation before dispatch.
export function createTmdbSender(token: string): Sender {
  if (!token.trim()) throw new Error("MISSING_TMDB_ACCESS_TOKEN");
  return (endpoint) => new Promise((resolve, reject) => {
    endpointIdentity(endpoint);
    const req = request({
      hostname: "api.themoviedb.org",
      port: 443,
      path: endpoint,
      method: "GET",
      agent: false,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    }, (res) => {
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > 8_000_000) req.destroy(new Error("RESPONSE_TOO_LARGE"));
        else chunks.push(chunk);
      });
      res.on("error", () => reject(new Error("RESPONSE_INTERRUPTED")));
      res.on("end", () => {
        const status = res.statusCode ?? 0;
        let payload: unknown = null;
        if (status === 200) {
          try {
            payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          } catch {
            reject(new Error("INVALID_RESPONSE_JSON"));
            return;
          }
        }
        const quota = res.headers["x-ratelimit-remaining"];
        resolve({
          status,
          payload,
          retryAfter: typeof res.headers["retry-after"] === "string" ? res.headers["retry-after"] : undefined,
          quotaRemaining: typeof quota === "string" && /^\d+$/.test(quota) ? Number(quota) : undefined,
        });
      });
    });
    const timer = setTimeout(() => req.destroy(new Error("REQUEST_TIMEOUT")), 20_000);
    req.on("close", () => clearTimeout(timer));
    req.on("error", () => reject(new Error("TMDB_NETWORK_ERROR")));
    req.end();
  });
}

export class PersistentTmdbE3Pilot {
  private journal: Journal = { version: 1, authorization: "E3-three-series-33-GET", entries: [] };
  private gate!: EpisodeGuideImportRequestGate;
  private busy = false;
  private closed = false;
  private poisoned = false;

  private constructor(
    private directory: string,
    private sender: Sender,
    private networkEnabled: boolean,
  ) {}

  static async open(directory: string, options: {
    initialize?: boolean;
    networkEnabled?: boolean;
    sender: Sender;
  }) {
    const session = new PersistentTmdbE3Pilot(
      directory,
      options.sender,
      options.networkEnabled === true,
    );
    if (options.initialize) {
      await mkdir(directory);
      await session.save();
    }
    const lock = await open(join(directory, "session.lock"), "wx");
    await lock.close();
    try {
      const envelope = JSON.parse(await readFile(join(directory, "journal.json"), "utf8"));
      const data = envelope.data as Journal;
      if (
        envelope.checksum !== digest(data) ||
        data?.version !== 1 ||
        data.authorization !== "E3-three-series-33-GET" ||
        !Array.isArray(data.entries) ||
        data.entries.length > E3_BUDGET
      ) {
        throw new Error("CORRUPT_REQUEST_JOURNAL");
      }
      const endpoints = new Set<string>();
      const counts = new Map<number, number>();
      for (const entry of data.entries) {
        const tmdbId = endpointTmdbId(entry.endpoint);
        counts.set(tmdbId, (counts.get(tmdbId) ?? 0) + 1);
        if (
          entry.canonicalMovieId !== endpointIdentity(entry.endpoint) ||
          endpoints.has(entry.endpoint) ||
          !Number.isFinite(Date.parse(entry.startedAt)) ||
          !["reserved", "response", "network_error"].includes(entry.outcome)
        ) {
          throw new Error("CORRUPT_REQUEST_JOURNAL");
        }
        endpoints.add(entry.endpoint);
        if (
          entry.outcome === "response" &&
          (!Number.isInteger(entry.status) ||
            !entry.observedAt ||
            !Number.isFinite(Date.parse(entry.observedAt)))
        ) {
          throw new Error("CORRUPT_RESPONSE_RECORD");
        }
      }
      for (const [tmdbId, count] of counts) {
        if (count > E3_SERIES_BUDGETS[tmdbId as keyof typeof E3_SERIES_BUDGETS]) {
          throw new Error("CORRUPT_SERIES_BUDGET");
        }
      }
      session.journal = data;
      session.gate = new EpisodeGuideImportRequestGate({
        networkEnabled: session.networkEnabled,
        allowlist: Object.values(E3_IDS),
        requestBudget: E3_BUDGET,
        concurrency: 1,
      }, data.entries.length);
      return session;
    } catch {
      await session.close();
      throw new Error("REQUEST_JOURNAL_UNTRUSTED: stopped; original files retained");
    }
  }

  private async save() {
    await writeJsonAtomic(join(this.directory, "journal.json"), {
      data: this.journal,
      checksum: digest(this.journal),
    });
  }

  summary() {
    return this.journal.entries.map(({ payload: _payload, ...entry }) => {
      void _payload;
      return { ...entry };
    });
  }

  assertPlan(endpoints: readonly string[]) {
    endpoints.forEach(endpointIdentity);
    if (new Set(endpoints).size !== endpoints.length) throw new Error("DUPLICATE_PLAN_ENDPOINT");
    const needed = endpoints.filter((endpoint) =>
      !this.journal.entries.some((entry) => entry.endpoint === endpoint && entry.status === 200),
    );
    if (this.journal.entries.length + needed.length > E3_BUDGET) {
      throw new Error(`PLAN_EXCEEDS_BUDGET: used=${this.journal.entries.length}; needed=${needed.length}`);
    }
    for (const tmdbIdText of Object.keys(E3_IDS)) {
      const tmdbId = Number(tmdbIdText) as keyof typeof E3_IDS;
      const used = this.journal.entries.filter((entry) => endpointTmdbId(entry.endpoint) === tmdbId).length;
      const additional = needed.filter((endpoint) => endpointTmdbId(endpoint) === tmdbId).length;
      if (used + additional > E3_SERIES_BUDGETS[tmdbId]) {
        throw new Error(`PLAN_EXCEEDS_SERIES_BUDGET: tmdbId=${tmdbId}; used=${used}; needed=${additional}`);
      }
    }
    return {
      used: this.journal.entries.length,
      additional: needed.length,
      total: this.journal.entries.length + needed.length,
    };
  }

  async get(endpoint: string) {
    if (this.closed || this.poisoned) throw new Error("SESSION_CLOSED_OR_UNTRUSTED");
    const canonicalMovieId = endpointIdentity(endpoint);
    const tmdbId = endpointTmdbId(endpoint);
    const cached = this.journal.entries.find((entry) => entry.endpoint === endpoint && entry.status === 200);
    if (cached) return structuredClone(cached);
    if (this.busy) throw new Error("CONCURRENT_GET_FORBIDDEN");
    if (this.journal.entries.some((entry) =>
      entry.outcome !== "response" || entry.status !== 200 || entry.quotaExhausted)) {
      throw new Error("IMPORT_HALTED: failed, quota-exhausted or uncertain request; no automatic retry");
    }
    const seriesUsed = this.journal.entries.filter((entry) => endpointTmdbId(entry.endpoint) === tmdbId).length;
    if (seriesUsed >= E3_SERIES_BUDGETS[tmdbId]) throw new Error("SERIES_REQUEST_BUDGET_EXHAUSTED");
    this.busy = true;
    try {
      this.gate.reserve(canonicalMovieId);
      const entry: Entry = {
        endpoint,
        canonicalMovieId,
        startedAt: new Date().toISOString(),
        outcome: "reserved",
      };
      this.journal.entries.push(entry);
      try {
        await this.save();
      } catch {
        this.poisoned = true;
        throw new Error("RESERVATION_WRITE_FAILED");
      }
      let response: TransportResponse;
      try {
        response = await this.sender(endpoint);
      } catch {
        entry.outcome = "network_error";
        entry.observedAt = new Date().toISOString();
        try { await this.save(); } catch { this.poisoned = true; }
        throw new Error("TMDB_NETWORK_ERROR: reserved request counted; import stopped");
      }
      entry.outcome = "response";
      entry.status = response.status;
      entry.observedAt = new Date().toISOString();
      const action = classifyProviderResponse(response);
      if (action.action === "retry") entry.retryAfterMs = action.retryAfterMs;
      if (action.action === "stop") {
        entry.quotaExhausted = true;
        this.gate.markProviderQuotaExhausted();
      }
      if (response.status === 200) entry.payload = response.payload;
      try {
        await this.save();
      } catch {
        this.poisoned = true;
        throw new Error("RESPONSE_WRITE_FAILED: budget uncertain");
      }
      if (response.status !== 200 || entry.quotaExhausted) {
        throw new Error(
          `TMDB_HTTP_${response.status}: import stopped${entry.retryAfterMs !== undefined ? `; Retry-After=${entry.retryAfterMs}ms` : ""}`,
        );
      }
      return structuredClone(entry);
    } finally {
      this.busy = false;
    }
  }

  async close() {
    if (!this.closed) {
      this.closed = true;
      await unlink(join(this.directory, "session.lock"));
    }
  }
}
