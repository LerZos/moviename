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
      status: "prepared";
      checksum: `sha256:${string}`;
    })
  | (EpisodeGuideSnapshotManifestIdentity & {
      status: "available";
      load: () => Promise<EpisodeGuideSnapshotModule>;
    });

export type EpisodeGuideSnapshotManifest = Readonly<
  Partial<Record<CanonicalMovieId, EpisodeGuideSnapshotManifestEntry>>
>;

// Only activated snapshots have server-only lazy imports. Prepared snapshots
// remain unavailable to the public loader until a separately reviewed UI step.
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
  "42989ff4-cd94-4f82-a7b0-7d75b3a73fe5": {
    status: "available",
    slug: "bolshaya-malenkaya-lozh-2017",
    provider: { source: "tmdb", namespace: "tv", id: 66292 },
    load: () => import("./snapshots/42989ff4-cd94-4f82-a7b0-7d75b3a73fe5"),
  },
  "c5cf7ec6-d093-43b0-84b8-9f903c332451": {
    status: "available",
    slug: "avatar-legenda-ob-aange-2004",
    provider: { source: "tmdb", namespace: "tv", id: 246 },
    load: () => import("./snapshots/c5cf7ec6-d093-43b0-84b8-9f903c332451"),
  },
  "bc84cfc1-a6fb-4bc0-9661-24fca39c6363": {
    status: "available",
    slug: "banshi-2013",
    provider: { source: "tmdb", namespace: "tv", id: 41727 },
    load: () => import("./snapshots/bc84cfc1-a6fb-4bc0-9661-24fca39c6363"),
  },
});

