import "server-only";

import {
  getCanonicalIdentityById,
  type CanonicalMovieId,
  type CanonicalMovieIdentity,
} from "../../data/canonicalIdentity";
import {
  episodeGuideSnapshotManifest,
  type EpisodeGuideSnapshotManifest,
} from "./manifest";
import type { EpisodeGuideSnapshot } from "./types";
import { verifyEpisodeGuideSnapshot } from "./verifier";

export class EpisodeGuideSnapshotVerificationError extends Error {
  constructor(
    canonicalMovieId: CanonicalMovieId,
    readonly issueCodes: readonly string[],
  ) {
    super(
      `Episode guide snapshot blocked for ${canonicalMovieId}: ${issueCodes.join(", ")}`,
    );
    this.name = "EpisodeGuideSnapshotVerificationError";
  }
}

export function createEpisodeGuideSnapshotLoader(
  manifest: EpisodeGuideSnapshotManifest,
  resolveIdentity: (
    canonicalMovieId: CanonicalMovieId,
  ) => CanonicalMovieIdentity | null,
) {
  const cache = new Map<
    CanonicalMovieId,
    Promise<EpisodeGuideSnapshot | null>
  >();

  return function loadEpisodeGuideSnapshot(canonicalMovieId: CanonicalMovieId) {
    const cached = cache.get(canonicalMovieId);
    if (cached) return cached;

    const entry = manifest[canonicalMovieId];
    if (!entry) return Promise.resolve(null);

    const identity = resolveIdentity(canonicalMovieId);
    const manifestIssueCodes = [
      ...(!identity || identity.canonicalMovieId !== canonicalMovieId
        ? ["MANIFEST_CANONICAL_ID_MISMATCH"]
        : []),
      ...(identity?.slug !== entry.slug ? ["MANIFEST_SLUG_MISMATCH"] : []),
      ...(identity?.tmdbNamespace !== "tv" || entry.provider.namespace !== "tv"
        ? ["MANIFEST_NAMESPACE_NOT_TV"]
        : []),
      ...(identity?.tmdbId !== entry.provider.id
        ? ["MANIFEST_PROVIDER_ID_MISMATCH"]
        : []),
    ];
    if (manifestIssueCodes.length) {
      return Promise.reject(
        new EpisodeGuideSnapshotVerificationError(
          canonicalMovieId,
          manifestIssueCodes,
        ),
      );
    }

    if (entry.status === "planned") return Promise.resolve(null);

    const pending = entry.load().then(({ episodeGuideSnapshot }) => {
      if (episodeGuideSnapshot.canonicalMovieId !== canonicalMovieId) {
        throw new EpisodeGuideSnapshotVerificationError(canonicalMovieId, [
          "MANIFEST_CANONICAL_ID_MISMATCH",
        ]);
      }

      const result = verifyEpisodeGuideSnapshot(
        episodeGuideSnapshot,
        identity,
      );
      if (!result.valid) {
        throw new EpisodeGuideSnapshotVerificationError(
          canonicalMovieId,
          result.issues.map((issue) => issue.code),
        );
      }
      return episodeGuideSnapshot;
    });

    cache.set(canonicalMovieId, pending);
    return pending;
  };
}

export const loadEpisodeGuideSnapshot = createEpisodeGuideSnapshotLoader(
  episodeGuideSnapshotManifest,
  getCanonicalIdentityById,
);

export function getEpisodeGuideManifestIds() {
  return Object.keys(episodeGuideSnapshotManifest).sort((left, right) =>
    left.localeCompare(right, "en"),
  );
}

