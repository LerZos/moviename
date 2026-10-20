import "server-only";
import { getCanonicalMovieRegistry } from "../../src/app/data/canonicalIdentity";
import { episodeGuidePilotAllowlist } from "../../src/app/data/episodeGuidePilotAllowlist";
import { movies } from "../../src/app/data/movies";
import {
  detailsEndpoint,
  inspectDetails,
  seasonEndpoint,
} from "./e2Import";
import { E3_IDS, type PersistentTmdbE3Pilot } from "./e3Transport";

export { detailsEndpoint, inspectDetails, seasonEndpoint } from "./e2Import";

export const E3_PILOT = Object.entries(E3_IDS).map(([id, canonicalMovieId]) => {
  const entry = episodeGuidePilotAllowlist.find((item) => item.canonicalMovieId === canonicalMovieId);
  if (!entry || entry.tmdbId !== Number(id)) throw new Error("PILOT_IDENTITY_MISMATCH");
  return entry;
});

export function verifyLocalPilotIdentities() {
  const registry = getCanonicalMovieRegistry();
  return E3_PILOT.map((entry) => {
    const identities = registry.filter((identity) =>
      identity.canonicalMovieId === entry.canonicalMovieId ||
      (identity.tmdbNamespace === "tv" && identity.tmdbId === entry.tmdbId) ||
      identity.slug === entry.slug,
    );
    const cards = movies.filter((movie) =>
      movie.canonicalMovieId === entry.canonicalMovieId || movie.slug === entry.slug,
    );
    const identity = identities[0];
    const movie = cards[0];
    if (
      identities.length !== 1 || cards.length !== 1 ||
      identity.canonicalMovieId !== entry.canonicalMovieId ||
      identity.slug !== entry.slug || identity.tmdbNamespace !== "tv" ||
      identity.tmdbId !== entry.tmdbId || identity.contentType !== "series" ||
      movie.canonicalMovieId !== entry.canonicalMovieId || movie.slug !== entry.slug ||
      movie.tmdbId !== entry.tmdbId || movie.type !== "Сериал" ||
      (movie.tmdbNamespace !== undefined && movie.tmdbNamespace !== "tv") ||
      movie.seasons !== entry.localExpectedRegularSeasons ||
      movie.episodes !== entry.localExpectedRegularEpisodes ||
      movie.releaseStatus !== entry.localStatus
    ) {
      throw new Error("LOCAL_IDENTITY_OR_BASELINE_MISMATCH");
    }
    return { entry, identity, movie };
  });
}

export function initialPlan() {
  return E3_PILOT.flatMap((entry) => [
    detailsEndpoint(entry.tmdbId),
    ...Array.from({ length: entry.localExpectedRegularSeasons + 1 }, (_, season) =>
      (["ru-RU", "en-US"] as const).map((language) =>
        seasonEndpoint(entry.tmdbId, season, language),
      ),
    ).flat(),
  ]);
}

export async function collectPilot(session: PersistentTmdbE3Pilot, detailsOnly = false) {
  const local = verifyLocalPilotIdentities();
  session.assertPlan(initialPlan());
  const details = new Map<number, ReturnType<typeof inspectDetails>>();
  for (const { entry } of local) {
    const response = await session.get(detailsEndpoint(entry.tmdbId));
    details.set(entry.tmdbId, inspectDetails(response.payload, entry.tmdbId));
  }

  for (const { entry, movie } of local) {
    const remote = details.get(entry.tmdbId)!;
    const status = typeof remote.raw.status === "string" ? remote.raw.status.toLowerCase() : undefined;
    const seasonTotal = remote.seasons
      .filter((season) => season.seasonNumber > 0)
      .reduce((total, season) => total + season.episodeCount, 0);
    const conflicts = [
      remote.regularSeasonCount !== entry.localExpectedRegularSeasons ? "regularSeasonCount" : null,
      remote.regularEpisodeCount !== entry.localExpectedRegularEpisodes ? "regularEpisodeCount" : null,
      remote.seasons.filter((season) => season.seasonNumber > 0).length !== remote.regularSeasonCount
        ? "detailsSeasonListCount" : null,
      seasonTotal !== remote.regularEpisodeCount ? "detailsSeasonEpisodeTotal" : null,
      status !== entry.localStatus ? "releaseStatus" : null,
      movie.releaseDate && remote.raw.first_air_date !== movie.releaseDate ? "releaseDate" : null,
    ].filter(Boolean);
    if (conflicts.length) {
      throw new Error(`REMOTE_BASELINE_MISMATCH:${entry.slug}:${conflicts.join(",")}`);
    }
    if (remote.sourceLanguage !== "en") {
      throw new Error(`UNSUPPORTED_SOURCE_LANGUAGE:${entry.slug}:${remote.sourceLanguage ?? "unknown"}`);
    }
  }

  const endpoints = E3_PILOT.flatMap((entry) => [
    detailsEndpoint(entry.tmdbId),
    ...details.get(entry.tmdbId)!.seasons.flatMap((season) =>
      (["ru-RU", "en-US"] as const).map((language) =>
        seasonEndpoint(entry.tmdbId, season.seasonNumber, language),
      ),
    ),
  ]);
  const plan = session.assertPlan(endpoints);
  if (!detailsOnly) {
    for (const endpoint of endpoints) await session.get(endpoint);
  }
  return {
    plan,
    series: E3_PILOT.map((entry) => ({
      slug: entry.slug,
      tmdbId: entry.tmdbId,
      seasons: details.get(entry.tmdbId)!.seasons,
      sourceLanguage: details.get(entry.tmdbId)!.sourceLanguage,
      regularSeasonCount: details.get(entry.tmdbId)!.regularSeasonCount,
      regularEpisodeCount: details.get(entry.tmdbId)!.regularEpisodeCount,
    })),
  };
}
