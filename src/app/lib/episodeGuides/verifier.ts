import "server-only";

import type { CanonicalMovieIdentity } from "../../data/canonicalIdentity";
import { computeEpisodeGuideChecksum } from "./checksum";
import type {
  EpisodeGuideEpisode,
  EpisodeGuideProvenanceField,
  EpisodeGuideSnapshot,
} from "./types";

export type EpisodeGuideVerificationIssue = {
  code: string;
  path: string;
  message: string;
};

export type EpisodeGuideVerificationResult =
  | { valid: true; issues: readonly [] }
  | { valid: false; issues: readonly EpisodeGuideVerificationIssue[] };

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function isIsoTimestamp(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

function isNonNegativeInteger(value: number) {
  return Number.isInteger(value) && value >= 0;
}

function hasVerifiedTitleProvenance(
  snapshot: EpisodeGuideSnapshot,
  field: EpisodeGuideProvenanceField,
  language: string,
) {
  return snapshot.provenance.some(
    (entry) =>
      entry.verificationStatus === "verified" &&
      entry.fields.includes(field) &&
      entry.language?.toLowerCase() === language.toLowerCase(),
  );
}

function addEpisodeIssues(
  issues: EpisodeGuideVerificationIssue[],
  episodes: readonly EpisodeGuideEpisode[],
  path: string,
  snapshot: EpisodeGuideSnapshot,
) {
  const seen = new Set<number>();
  for (const [index, episode] of episodes.entries()) {
    const episodePath = `${path}[${index}]`;
    if (!isNonNegativeInteger(episode.episodeNumber)) {
      issues.push({
        code: "INVALID_EPISODE_NUMBER",
        path: `${episodePath}.episodeNumber`,
        message: "Номер эпизода должен быть целым неотрицательным числом.",
      });
    }
    if (seen.has(episode.episodeNumber)) {
      issues.push({
        code: "DUPLICATE_EPISODE_NUMBER",
        path: `${episodePath}.episodeNumber`,
        message: `Номер эпизода ${episode.episodeNumber} повторяется в одном сезоне.`,
      });
    }
    seen.add(episode.episodeNumber);

    if (episode.airDate && !isIsoDate(episode.airDate)) {
      issues.push({
        code: "INVALID_AIR_DATE",
        path: `${episodePath}.airDate`,
        message: "Дата выхода должна быть реальной датой в формате YYYY-MM-DD.",
      });
    }

    if (episode.originalTitle) {
      if (!snapshot.sourceLanguage) {
        issues.push({
          code: "MISSING_SOURCE_LANGUAGE",
          path: `${episodePath}.originalTitle`,
          message: "Для originalTitle необходимо указать sourceLanguage.",
        });
      } else if (
        !hasVerifiedTitleProvenance(
          snapshot,
          "originalTitle",
          snapshot.sourceLanguage,
        )
      ) {
        issues.push({
          code: "UNVERIFIED_ORIGINAL_TITLE_LANGUAGE",
          path: `${episodePath}.originalTitle`,
          message:
            "originalTitle должен быть подтверждён на исходном языке; перевод нельзя выдавать за оригинал.",
        });
      }
    }

    if (
      episode.russianTitle &&
      !hasVerifiedTitleProvenance(snapshot, "russianTitle", "ru")
    ) {
      issues.push({
        code: "UNVERIFIED_RUSSIAN_TITLE",
        path: `${episodePath}.russianTitle`,
        message: "Русское название допускается только с проверенным provenance ru.",
      });
    }
  }
}

function hasContiguousNumbers(numbers: readonly number[], start: number) {
  const sorted = [...numbers].sort((left, right) => left - right);
  return sorted.every((number, index) => number === start + index);
}

export function verifyEpisodeGuideSnapshot(
  snapshot: EpisodeGuideSnapshot,
  registryIdentity: CanonicalMovieIdentity | null,
): EpisodeGuideVerificationResult {
  const issues: EpisodeGuideVerificationIssue[] = [];

  if (!registryIdentity) {
    issues.push({
      code: "CANONICAL_ID_NOT_FOUND",
      path: "canonicalMovieId",
      message: "Canonical UUID отсутствует в registry.",
    });
  } else {
    if (registryIdentity.canonicalMovieId !== snapshot.canonicalMovieId) {
      issues.push({
        code: "CANONICAL_ID_MISMATCH",
        path: "canonicalMovieId",
        message: "Snapshot не соответствует запрошенному canonical UUID.",
      });
    }
    if (registryIdentity.slug !== snapshot.slug) {
      issues.push({
        code: "SLUG_MISMATCH",
        path: "slug",
        message: "Slug snapshot не совпадает с canonical registry.",
      });
    }
    if (registryIdentity.tmdbNamespace !== "tv") {
      issues.push({
        code: "REGISTRY_NAMESPACE_NOT_TV",
        path: "provider.namespace",
        message: "Canonical identity должна использовать TMDB TV namespace.",
      });
    }
    if (registryIdentity.tmdbId !== snapshot.provider.id) {
      issues.push({
        code: "PROVIDER_ID_MISMATCH",
        path: "provider.id",
        message: "TMDB TV ID snapshot не совпадает с canonical registry.",
      });
    }
  }

  if (snapshot.provider.source !== "tmdb" || snapshot.provider.namespace !== "tv") {
    issues.push({
      code: "PROVIDER_NAMESPACE_NOT_TMDB_TV",
      path: "provider",
      message: "Episode guide допускает только явный TMDB TV provider.",
    });
  }
  if (!Number.isInteger(snapshot.provider.id) || snapshot.provider.id <= 0) {
    issues.push({
      code: "INVALID_PROVIDER_ID",
      path: "provider.id",
      message: "Provider ID должен быть положительным целым числом.",
    });
  }
  if (!isIsoTimestamp(snapshot.observedAt)) {
    issues.push({
      code: "INVALID_OBSERVED_AT",
      path: "observedAt",
      message: "observedAt должен быть корректным ISO timestamp.",
    });
  }
  for (const [index, provenance] of snapshot.provenance.entries()) {
    if (!isIsoTimestamp(provenance.observedAt)) {
      issues.push({
        code: "INVALID_PROVENANCE_OBSERVED_AT",
        path: `provenance[${index}].observedAt`,
        message: "Provenance observedAt должен быть корректным ISO timestamp.",
      });
    }
  }

  const seenSeasons = new Set<number>();
  for (const [index, season] of snapshot.regularSeasons.entries()) {
    if (!Number.isInteger(season.seasonNumber) || season.seasonNumber <= 0) {
      issues.push({
        code: "SPECIAL_MIXED_WITH_REGULAR_SEASONS",
        path: `regularSeasons[${index}].seasonNumber`,
        message: "Обычные сезоны должны иметь номер > 0; season 0 хранится в specials.",
      });
    }
    if (seenSeasons.has(season.seasonNumber)) {
      issues.push({
        code: "DUPLICATE_SEASON_NUMBER",
        path: `regularSeasons[${index}].seasonNumber`,
        message: `Сезон ${season.seasonNumber} повторяется.`,
      });
    }
    seenSeasons.add(season.seasonNumber);
    addEpisodeIssues(
      issues,
      season.episodes,
      `regularSeasons[${index}].episodes`,
      snapshot,
    );
  }
  addEpisodeIssues(issues, snapshot.specials, "specials", snapshot);

  const regularEpisodeCount = snapshot.regularSeasons.reduce(
    (total, season) => total + season.episodes.length,
    0,
  );
  if (snapshot.completeness.status === "complete" && snapshot.verificationStatus !== "verified_complete") {
    issues.push({
      code: "INCONSISTENT_COMPLETENESS", path: "completeness.status",
      message: "Complete требует статуса verified_complete.",
    });
  }
  for (const [field, count] of Object.entries(snapshot.completeness)) {
    if (field !== "status" && (typeof count !== "number" || !isNonNegativeInteger(count))) {
      issues.push({ code: "INVALID_EXPECTED_COUNT", path: `completeness.${field}`, message: "Ожидаемое количество должно быть целым неотрицательным числом." });
    }
  }
  if (snapshot.verificationStatus === "verified_complete") {
    const expectedSeasons = snapshot.completeness.expectedRegularSeasonCount;
    const expectedEpisodes = snapshot.completeness.expectedRegularEpisodeCount;
    if (
      snapshot.completeness.status !== "complete" ||
      expectedSeasons === undefined ||
      expectedEpisodes === undefined ||
      !expectedSeasons || !expectedEpisodes ||
      snapshot.regularSeasons.some((season) => season.episodes.length === 0) ||
      (snapshot.completeness.expectedSpecialEpisodeCount !== undefined &&
        snapshot.specials.length !== snapshot.completeness.expectedSpecialEpisodeCount) ||
      expectedSeasons !== snapshot.regularSeasons.length ||
      expectedEpisodes !== regularEpisodeCount ||
      !hasContiguousNumbers(
        snapshot.regularSeasons.map((season) => season.seasonNumber),
        1,
      ) ||
      snapshot.regularSeasons.some(
        (season) =>
          !hasContiguousNumbers(
            season.episodes.map((episode) => episode.episodeNumber),
            1,
          ),
      )
    ) {
      issues.push({
        code: "INCOMPLETE_GUIDE_MARKED_COMPLETE",
        path: "verificationStatus",
        message:
          "Guide нельзя считать complete без совпадающих ожидаемых totals и непрерывной нумерации.",
      });
    }
  }
  if (snapshot.verificationStatus === "pending") {
    issues.push({
      code: "SNAPSHOT_NOT_VERIFIED",
      path: "verificationStatus",
      message: "Pending snapshot нельзя применять.",
    });
  }
  if (snapshot.verificationStatus === "rejected") {
    issues.push({
      code: "SNAPSHOT_REJECTED",
      path: "verificationStatus",
      message: "Rejected snapshot нельзя применять.",
    });
  }

  const expectedChecksum = computeEpisodeGuideChecksum(snapshot);
  if (snapshot.checksum !== expectedChecksum) {
    issues.push({
      code: "CHECKSUM_MISMATCH",
      path: "checksum",
      message: "Checksum snapshot не воспроизводится.",
    });
  }

  return issues.length ? { valid: false, issues } : { valid: true, issues: [] };
}

