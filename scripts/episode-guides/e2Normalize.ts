import "server-only";
import type { CanonicalMovieIdentity } from "../../src/app/data/canonicalIdentity";
import type { EpisodeGuidePilotEntry } from "../../src/app/data/episodeGuidePilotAllowlist";
import { normalizeEpisodeGuideSnapshot } from "../../src/app/lib/episodeGuides/normalizer";
import { verifyEpisodeGuideSnapshot } from "../../src/app/lib/episodeGuides/verifier";
import type { EpisodeGuideEpisode, EpisodeGuideProvenance, EpisodeGuideSeason } from "../../src/app/lib/episodeGuides/types";
import { detailsEndpoint, inspectDetails, list, nonnegativeInteger, positiveInteger, record, seasonEndpoint } from "./e2Import";
import { endpointIdentity } from "./e2Transport";

export type CachedResponse = {
  endpoint: string; canonicalMovieId: string; observedAt?: string; status?: number; payload?: unknown;
};
export type EpisodeGuideConflict = {
  field: string; local: unknown; remote: unknown;
};
type Baseline = { releaseStatus?: string; releaseDate?: string; seasons?: number; episodes?: number };

function text(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error("INVALID_PROVIDER_TEXT");
  return value.trim() || undefined;
}
function title(value: unknown) {
  const name = text(value);
  return name && !/^(?:episode|эпизод|серия)\s*#?\s*\d+$/iu.test(name) ? name : undefined;
}
function date(value: unknown) {
  const valueText = text(value);
  if (!valueText) return undefined;
  const parsed = new Date(`${valueText}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valueText) || !Number.isFinite(parsed.valueOf()) ||
      parsed.toISOString().slice(0, 10) !== valueText) throw new Error("INVALID_PROVIDER_AIR_DATE");
  return valueText;
}

function readSeason(response: CachedResponse | undefined, seriesId: number, seasonNumber: number, seasonId: number) {
  if (!response) return undefined;
  const raw = record(response.payload);
  if (raw.id !== seasonId || raw.season_number !== seasonNumber) throw new Error("SEASON_IDENTITY_MISMATCH");
  const episodeIds = new Set<number>();
  const episodes = new Map<number, { id: number; name?: string; airDate?: string }>();
  for (const value of list(raw.episodes)) {
    const episode = record(value);
    if (episode.show_id !== seriesId || episode.season_number !== seasonNumber) throw new Error("EPISODE_IDENTITY_MISMATCH");
    const number = positiveInteger(episode.episode_number);
    const id = positiveInteger(episode.id);
    if (episodes.has(number) || episodeIds.has(id)) throw new Error("DUPLICATE_EPISODE_NUMBER_OR_ID");
    episodeIds.add(id);
    episodes.set(number, { id, name: title(episode.name), airDate: date(episode.air_date) });
  }
  return episodes;
}

export function buildPilotSnapshot(
  entry: EpisodeGuidePilotEntry,
  identity: CanonicalMovieIdentity,
  baseline: Baseline,
  responses: readonly CachedResponse[],
) {
  if (identity.canonicalMovieId !== entry.canonicalMovieId || identity.slug !== entry.slug ||
      identity.tmdbNamespace !== "tv" || identity.tmdbId !== entry.tmdbId) throw new Error("CANONICAL_IDENTITY_MISMATCH");
  const byEndpoint = new Map<string, CachedResponse>();
  for (const response of responses) {
    if (response.status !== 200) continue;
    if (response.canonicalMovieId !== entry.canonicalMovieId ||
        endpointIdentity(response.endpoint) !== entry.canonicalMovieId ||
        !response.observedAt || !Number.isFinite(Date.parse(response.observedAt))) throw new Error("RESPONSE_PROVENANCE_MISMATCH");
    if (byEndpoint.has(response.endpoint)) throw new Error("DUPLICATE_CACHED_RESPONSE");
    byEndpoint.set(response.endpoint, response);
  }
  const detailResponse = byEndpoint.get(detailsEndpoint(entry.tmdbId));
  if (!detailResponse) throw new Error("MISSING_DETAILS");
  const details = inspectDetails(detailResponse.payload, entry.tmdbId);
  const conflicts: EpisodeGuideConflict[] = [];
  const omissions: { season: number; episode: number; field: string; reason: string }[] = [];
  const compare = (field: string, local: unknown, remote: unknown) => {
    if (local !== undefined && local !== remote) conflicts.push({ field, local, remote: remote ?? null });
  };
  compare("regularSeasonCount", baseline.seasons, details.regularSeasonCount);
  compare("regularEpisodeCount", baseline.episodes, details.regularEpisodeCount);
  compare("releaseStatus", baseline.releaseStatus?.toLowerCase(), text(details.raw.status)?.toLowerCase());
  compare("releaseDate", baseline.releaseDate, date(details.raw.first_air_date));
  compare("detailsSeasonListCount", details.regularSeasonCount, details.seasons.filter((s) => s.seasonNumber > 0).length);
  compare("detailsSeasonEpisodeTotal", details.regularEpisodeCount,
    details.seasons.filter((s) => s.seasonNumber > 0).reduce((count, s) => count + s.episodeCount, 0));

  const provenance: EpisodeGuideProvenance[] = [{
    source: "tmdb", observedAt: detailResponse.observedAt!, verificationStatus: "verified",
    fields: ["counts"], sourceReference: `https://api.themoviedb.org${detailResponse.endpoint}`,
  }];
  const regularSeasons: EpisodeGuideSeason[] = [];
  let specials: EpisodeGuideEpisode[] = [];
  let complete = true;
  for (const season of details.seasons) {
    const ruResponse = byEndpoint.get(seasonEndpoint(entry.tmdbId, season.seasonNumber, "ru-RU"));
    const enResponse = byEndpoint.get(seasonEndpoint(entry.tmdbId, season.seasonNumber, "en-US"));
    const ru = readSeason(ruResponse, entry.tmdbId, season.seasonNumber, season.id);
    const en = readSeason(enResponse, entry.tmdbId, season.seasonNumber, season.id);
    if (!ru || !en) complete = false;
    for (const [locale, episodes] of [["ru", ru], ["en", en]] as const) {
      if (episodes) compare(`season.${season.seasonNumber}.${locale}.count`, season.episodeCount, episodes.size);
    }
    // Union retains confirmed data when a translation is incomplete; identity
    // mismatches fail closed and incompleteness is never hidden by intersection.
    const numbers = [...new Set([...(ru?.keys() ?? []), ...(en?.keys() ?? [])])].sort((a, b) => a - b);
    const episodes: EpisodeGuideEpisode[] = numbers.map((number) => {
      const russian = ru?.get(number);
      const original = en?.get(number);
      if (!russian || !original) complete = false;
      if (russian && original && russian.id !== original.id) throw new Error("LOCALIZATION_EPISODE_ID_MISMATCH");
      if (russian?.airDate && original?.airDate && russian.airDate !== original.airDate) {
        throw new Error("LOCALIZATION_AIR_DATE_MISMATCH");
      }
      const originalTitle = details.sourceLanguage === "en" ? original?.name : undefined;
      // ru-RU may return generic labels or English fallback. Neither establishes
      // a Russian title. No translation is generated here.
      const russianTitle = russian?.name && /[А-Яа-яЁё]/u.test(russian.name) &&
        russian.name !== original?.name ? russian.name : undefined;
      if (!russianTitle) omissions.push({
        season: season.seasonNumber, episode: number, field: "russianTitle",
        reason: "missing, generic label or unconfirmed Russian localization",
      });
      const airDate = original?.airDate ?? russian?.airDate;
      return {
        episodeNumber: number,
        ...(originalTitle ? { originalTitle } : {}),
        ...(russianTitle ? { russianTitle } : {}),
        ...(airDate ? { airDate } : {}),
      };
    });
    for (const [response, language] of [[ruResponse, "ru"], [enResponse, "en"]] as const) {
      if (!response) continue;
      const fields: EpisodeGuideProvenance["fields"][number][] = ["seasonNumber", "episodeNumber", "airDate"];
      if (language === "ru" && episodes.some((episode) => episode.russianTitle)) fields.push("russianTitle");
      if (language === details.sourceLanguage && episodes.some((episode) => episode.originalTitle)) fields.push("originalTitle");
      provenance.push({
        source: "tmdb", observedAt: response.observedAt!, verificationStatus: "verified",
        fields, language, sourceReference: `https://api.themoviedb.org${response.endpoint}`,
      });
    }
    if (season.seasonNumber === 0) specials = episodes;
    else if (ru || en) regularSeasons.push({ seasonNumber: season.seasonNumber, episodes });
  }
  // Ordinary numbering must cover every episode from 1. Specials may be sparse.
  complete &&= conflicts.length === 0 && regularSeasons.length > 0 &&
    regularSeasons.every((season, index) => season.seasonNumber === index + 1 &&
      season.episodes.length > 0 && season.episodes.every((episode, i) => episode.episodeNumber === i + 1));
  const snapshot = normalizeEpisodeGuideSnapshot({
    canonicalMovieId: entry.canonicalMovieId, slug: entry.slug,
    provider: { source: "tmdb", namespace: "tv", id: entry.tmdbId },
    sourceLanguage: details.sourceLanguage,
    observedAt: [...byEndpoint.values()].map((response) => response.observedAt!).sort().at(-1)!,
    verificationStatus: complete ? "verified_complete" : "verified_partial",
    completeness: {
      status: complete ? "complete" : "partial",
      expectedRegularSeasonCount: details.regularSeasonCount,
      expectedRegularEpisodeCount: details.regularEpisodeCount,
      expectedSpecialEpisodeCount: nonnegativeInteger(details.seasons.find((s) => s.seasonNumber === 0)?.episodeCount ?? 0),
    },
    regularSeasons, specials, provenance,
  });
  const verification = verifyEpisodeGuideSnapshot(snapshot, identity);
  if (!verification.valid) throw new Error(`SNAPSHOT_REJECTED: ${verification.issues.map((issue) => issue.code).join(",")}`);
  return { snapshot, conflicts, omissions, verification };
}
