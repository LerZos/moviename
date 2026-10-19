import "server-only";
import { getCanonicalMovieRegistry } from "../../src/app/data/canonicalIdentity";
import { episodeGuidePilotAllowlist } from "../../src/app/data/episodeGuidePilotAllowlist";
import { movies } from "../../src/app/data/movies";
import { E2_IDS, type PersistentTmdbPilot } from "./e2Transport";

export const E2_PILOT = Object.entries(E2_IDS).map(([id, canonicalMovieId]) => {
  const entry = episodeGuidePilotAllowlist.find((item) => item.canonicalMovieId === canonicalMovieId);
  if (!entry || entry.tmdbId !== Number(id)) throw new Error("PILOT_IDENTITY_MISMATCH");
  return entry;
});

export function verifyLocalPilotIdentities() {
  const registry = getCanonicalMovieRegistry();
  return E2_PILOT.map((entry) => {
    const identities = registry.filter((identity) => identity.canonicalMovieId === entry.canonicalMovieId ||
      (identity.tmdbNamespace === "tv" && identity.tmdbId === entry.tmdbId) || identity.slug === entry.slug);
    const cards = movies.filter((movie) => movie.canonicalMovieId === entry.canonicalMovieId || movie.slug === entry.slug);
    const identity = identities[0];
    const movie = cards[0];
    if (identities.length !== 1 || cards.length !== 1 ||
        identity.canonicalMovieId !== entry.canonicalMovieId || identity.slug !== entry.slug ||
        identity.tmdbNamespace !== "tv" || identity.tmdbId !== entry.tmdbId ||
        identity.contentType !== "series" || movie.canonicalMovieId !== entry.canonicalMovieId ||
        movie.slug !== entry.slug || movie.tmdbId !== entry.tmdbId || movie.type !== "Сериал" ||
        (movie.tmdbNamespace !== undefined && movie.tmdbNamespace !== "tv") ||
        movie.seasons !== entry.localExpectedRegularSeasons || movie.episodes !== entry.localExpectedRegularEpisodes ||
        movie.releaseStatus !== entry.localStatus) throw new Error("LOCAL_IDENTITY_OR_BASELINE_MISMATCH");
    return { entry, identity, movie };
  });
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_PROVIDER_OBJECT");
  return value as Record<string, unknown>;
}
export function nonnegativeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("INVALID_PROVIDER_NUMBER");
  return value;
}
export function positiveInteger(value: unknown): number {
  const number = nonnegativeInteger(value);
  if (!number) throw new Error("INVALID_PROVIDER_ID");
  return number;
}
export function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("INVALID_PROVIDER_ARRAY");
  return value;
}

export function inspectDetails(value: unknown, tmdbId: number) {
  const raw = record(value);
  if (raw.id !== tmdbId) throw new Error("TMDB_DETAILS_IDENTITY_MISMATCH");
  const seasons = list(raw.seasons).map((item) => {
    const season = record(item);
    return {
      id: positiveInteger(season.id),
      seasonNumber: nonnegativeInteger(season.season_number),
      episodeCount: nonnegativeInteger(season.episode_count),
    };
  }).sort((left, right) => left.seasonNumber - right.seasonNumber);
  if (new Set(seasons.map((season) => season.seasonNumber)).size !== seasons.length ||
      new Set(seasons.map((season) => season.id)).size !== seasons.length) throw new Error("DUPLICATE_PROVIDER_SEASON");
  return {
    raw, seasons,
    regularSeasonCount: nonnegativeInteger(raw.number_of_seasons),
    regularEpisodeCount: nonnegativeInteger(raw.number_of_episodes),
    sourceLanguage: typeof raw.original_language === "string" ? raw.original_language : undefined,
  };
}

export function detailsEndpoint(tmdbId: number) {
  return `/3/tv/${tmdbId}?language=ru-RU`;
}
export function seasonEndpoint(tmdbId: number, season: number, language: "ru-RU" | "en-US") {
  return `/3/tv/${tmdbId}/season/${season}?language=${language}`;
}

// Prior to discovery, reserve a full bilingual plan including season 0 for each
// series. If discovery expands it, assertPlan blocks before any season GET.
export function initialPlan() {
  return E2_PILOT.flatMap((entry) => [
    detailsEndpoint(entry.tmdbId),
    ...Array.from({ length: entry.localExpectedRegularSeasons + 1 }, (_, season) =>
      (["ru-RU", "en-US"] as const).map((language) => seasonEndpoint(entry.tmdbId, season, language)),
    ).flat(),
  ]);
}

export async function collectPilot(session: PersistentTmdbPilot, detailsOnly = false) {
  verifyLocalPilotIdentities();
  session.assertPlan(initialPlan());
  const details = new Map<number, ReturnType<typeof inspectDetails>>();
  for (const entry of E2_PILOT) {
    const response = await session.get(detailsEndpoint(entry.tmdbId));
    details.set(entry.tmdbId, inspectDetails(response.payload, entry.tmdbId));
  }
  const endpoints = E2_PILOT.flatMap((entry) => [
    detailsEndpoint(entry.tmdbId),
    ...details.get(entry.tmdbId)!.seasons.flatMap((season) =>
      (["ru-RU", "en-US"] as const).map((language) =>
        seasonEndpoint(entry.tmdbId, season.seasonNumber, language)),
    ),
  ]);
  const plan = session.assertPlan(endpoints);
  if (!detailsOnly) {
    for (const endpoint of endpoints) await session.get(endpoint);
  }
  return {
    plan,
    series: E2_PILOT.map((entry) => ({
      slug: entry.slug, tmdbId: entry.tmdbId,
      seasons: details.get(entry.tmdbId)!.seasons,
      sourceLanguage: details.get(entry.tmdbId)!.sourceLanguage,
      regularSeasonCount: details.get(entry.tmdbId)!.regularSeasonCount,
      regularEpisodeCount: details.get(entry.tmdbId)!.regularEpisodeCount,
    })),
  };
}
