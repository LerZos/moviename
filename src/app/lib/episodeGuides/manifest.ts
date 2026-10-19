import "server-only";

import { episodeGuidePilotAllowlist } from "../../data/episodeGuidePilotAllowlist";
import type { CanonicalMovieId } from "../../data/canonicalIdentity";
import type { EpisodeGuideSnapshot } from "./types";

export type EpisodeGuideSnapshotModule = {
  episodeGuideSnapshot: EpisodeGuideSnapshot;
};

type EpisodeGuideSnapshotManifestIdentity = {
  slug: string;
  provider: { source: "tmdb"; namespace: "tv"; id: number };
};

export type EpisodeGuideSnapshotManifestEntry =
  | (EpisodeGuideSnapshotManifestIdentity & { status: "planned" })
  | (EpisodeGuideSnapshotManifestIdentity & {
      status: "available";
      load: () => Promise<EpisodeGuideSnapshotModule>;
    });

export type EpisodeGuideSnapshotManifest = Readonly<
  Partial<Record<CanonicalMovieId, EpisodeGuideSnapshotManifestEntry>>
>;

// E.1's remaining eight identities stay planned. Only reviewed E.2 snapshots
// have explicit server-only lazy imports; no glob or full-catalog payload.
export const episodeGuideSnapshotManifest: EpisodeGuideSnapshotManifest = Object.freeze({
  ...Object.fromEntries(
    episodeGuidePilotAllowlist.map((entry) => [
      entry.canonicalMovieId,
      {
        status: "planned" as const,
        slug: entry.slug,
        provider: {
          source: "tmdb" as const,
          namespace: entry.tmdbNamespace,
          id: entry.tmdbId,
        },
      },
    ]),
  ),
  "01c49b47-8e78-48c7-a718-ec2c06824aa1": {
    status: "available",
    slug: "band-of-brothers-2001",
    provider: { source: "tmdb", namespace: "tv", id: 4613 },
    load: () => import("./snapshots/01c49b47-8e78-48c7-a718-ec2c06824aa1"),
  },
  "174f15d5-abe2-433e-9e8e-e65c61391ca2": {
    status: "available",
    slug: "andor",
    provider: { source: "tmdb", namespace: "tv", id: 83867 },
    load: () => import("./snapshots/174f15d5-abe2-433e-9e8e-e65c61391ca2"),
  },
});

