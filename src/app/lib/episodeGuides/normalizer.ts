import "server-only";

import { computeEpisodeGuideChecksum } from "./checksum";
import {
  EPISODE_GUIDE_SNAPSHOT_SCHEMA_VERSION,
  type EpisodeGuideEpisode,
  type EpisodeGuideProvenance,
  type EpisodeGuideSeason,
  type EpisodeGuideSnapshot,
  type EpisodeGuideSnapshotInput,
} from "./types";

function cleanOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeEpisode(episode: EpisodeGuideEpisode): EpisodeGuideEpisode {
  return {
    episodeNumber: episode.episodeNumber,
    ...(cleanOptionalText(episode.originalTitle)
      ? { originalTitle: cleanOptionalText(episode.originalTitle) }
      : {}),
    ...(cleanOptionalText(episode.russianTitle)
      ? { russianTitle: cleanOptionalText(episode.russianTitle) }
      : {}),
    ...(cleanOptionalText(episode.airDate)
      ? { airDate: cleanOptionalText(episode.airDate) }
      : {}),
  };
}

function normalizeSeason(season: EpisodeGuideSeason): EpisodeGuideSeason {
  return {
    seasonNumber: season.seasonNumber,
    episodes: season.episodes
      .map(normalizeEpisode)
      .sort((left, right) => left.episodeNumber - right.episodeNumber),
  };
}

function normalizeProvenance(
  provenance: EpisodeGuideProvenance,
): EpisodeGuideProvenance {
  return {
    source: provenance.source,
    observedAt: provenance.observedAt.trim(),
    verificationStatus: provenance.verificationStatus,
    fields: [...new Set(provenance.fields)].sort((left, right) =>
      left.localeCompare(right, "en"),
    ),
    ...(cleanOptionalText(provenance.language)
      ? { language: cleanOptionalText(provenance.language)?.toLowerCase() }
      : {}),
    ...(cleanOptionalText(provenance.sourceReference)
      ? { sourceReference: cleanOptionalText(provenance.sourceReference) }
      : {}),
  };
}

export function normalizeEpisodeGuideSnapshot(
  input: EpisodeGuideSnapshotInput,
): EpisodeGuideSnapshot {
  const payload: Omit<EpisodeGuideSnapshot, "checksum"> = {
    schemaVersion: EPISODE_GUIDE_SNAPSHOT_SCHEMA_VERSION,
    canonicalMovieId: input.canonicalMovieId.trim(),
    slug: input.slug.trim(),
    provider: {
      source: input.provider.source,
      namespace: input.provider.namespace,
      id: input.provider.id,
    },
    ...(cleanOptionalText(input.sourceLanguage)
      ? { sourceLanguage: cleanOptionalText(input.sourceLanguage)?.toLowerCase() }
      : {}),
    observedAt: input.observedAt.trim(),
    verificationStatus: input.verificationStatus ?? "pending",
    completeness: {
      status: input.completeness?.status ?? "partial",
      ...(input.completeness?.expectedRegularSeasonCount !== undefined
        ? {
            expectedRegularSeasonCount:
              input.completeness.expectedRegularSeasonCount,
          }
        : {}),
      ...(input.completeness?.expectedRegularEpisodeCount !== undefined
        ? {
            expectedRegularEpisodeCount:
              input.completeness.expectedRegularEpisodeCount,
          }
        : {}),
      ...(input.completeness?.expectedSpecialEpisodeCount !== undefined
        ? { expectedSpecialEpisodeCount: input.completeness.expectedSpecialEpisodeCount }
        : {}),
    },
    regularSeasons: input.regularSeasons
      .map(normalizeSeason)
      .sort((left, right) => left.seasonNumber - right.seasonNumber),
    specials: input.specials
      .map(normalizeEpisode)
      .sort((left, right) => left.episodeNumber - right.episodeNumber),
    provenance: input.provenance
      .map(normalizeProvenance)
      .sort((left, right) => {
        const bySource = left.source.localeCompare(right.source, "en");
        if (bySource) return bySource;
        const byLanguage = (left.language ?? "").localeCompare(
          right.language ?? "",
          "en",
        );
        if (byLanguage) return byLanguage;
        const byTime = left.observedAt.localeCompare(right.observedAt, "en");
        return byTime || (left.sourceReference ?? "").localeCompare(right.sourceReference ?? "", "en");
      }),
  };

  return {
    ...payload,
    checksum: computeEpisodeGuideChecksum(payload),
  };
}

