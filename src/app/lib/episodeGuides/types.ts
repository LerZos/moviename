import type { CanonicalMovieId } from "../../data/canonicalIdentity";

export const EPISODE_GUIDE_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export type EpisodeGuideVerificationStatus =
  | "pending"
  | "verified_partial"
  | "verified_complete"
  | "rejected";

export type EpisodeGuideProvenanceField =
  | "seasonNumber"
  | "episodeNumber"
  | "originalTitle"
  | "russianTitle"
  | "airDate"
  | "counts";

export type EpisodeGuideProvenance = {
  source: "tmdb" | "kinopoisk" | "manual";
  observedAt: string;
  verificationStatus: "verified" | "unverified";
  fields: readonly EpisodeGuideProvenanceField[];
  language?: string;
  sourceReference?: string;
};

export type EpisodeGuideEpisode = {
  episodeNumber: number;
  originalTitle?: string;
  russianTitle?: string;
  airDate?: string;
};

export type EpisodeGuideSeason = {
  seasonNumber: number;
  episodes: readonly EpisodeGuideEpisode[];
};

export type EpisodeGuideCompleteness = {
  status: "partial" | "complete";
  expectedRegularSeasonCount?: number;
  expectedRegularEpisodeCount?: number;
  expectedSpecialEpisodeCount?: number;
};

export type EpisodeGuideSnapshot = {
  schemaVersion: typeof EPISODE_GUIDE_SNAPSHOT_SCHEMA_VERSION;
  canonicalMovieId: CanonicalMovieId;
  slug: string;
  provider: {
    source: "tmdb";
    namespace: "tv";
    id: number;
  };
  sourceLanguage?: string;
  observedAt: string;
  verificationStatus: EpisodeGuideVerificationStatus;
  completeness: EpisodeGuideCompleteness;
  regularSeasons: readonly EpisodeGuideSeason[];
  specials: readonly EpisodeGuideEpisode[];
  provenance: readonly EpisodeGuideProvenance[];
  checksum: string;
};

export type EpisodeGuideSnapshotInput = Omit<
  EpisodeGuideSnapshot,
  "schemaVersion" | "checksum" | "verificationStatus" | "completeness"
> & {
  schemaVersion?: typeof EPISODE_GUIDE_SNAPSHOT_SCHEMA_VERSION;
  verificationStatus?: EpisodeGuideVerificationStatus;
  completeness?: Partial<EpisodeGuideCompleteness>;
};

