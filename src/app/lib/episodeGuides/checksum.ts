import "server-only";

import { createHash } from "node:crypto";

import type { EpisodeGuideSnapshot } from "./types";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right, "en"))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }

  return value;
}

export function serializeEpisodeGuideSnapshot(
  snapshot: Omit<EpisodeGuideSnapshot, "checksum"> | EpisodeGuideSnapshot,
) {
  const payload: Partial<EpisodeGuideSnapshot> = { ...snapshot };
  delete payload.checksum;
  return JSON.stringify(canonicalize(payload));
}

export function computeEpisodeGuideChecksum(
  snapshot: Omit<EpisodeGuideSnapshot, "checksum"> | EpisodeGuideSnapshot,
) {
  const digest = createHash("sha256")
    .update(serializeEpisodeGuideSnapshot(snapshot), "utf8")
    .digest("hex");

  return `sha256:${digest}`;
}

