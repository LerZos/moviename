import "server-only";

import { getCanonicalIdentityById } from "../../data/canonicalIdentity";
import type { Movie, MovieEpisode } from "../../data/movies";
import {
  EpisodeGuideSnapshotVerificationError,
  loadEpisodeGuideSnapshot,
} from "./loader";
import type { EpisodeGuideEpisode } from "./types";

function toMovieEpisode(episode: EpisodeGuideEpisode): MovieEpisode {
  return {
    number: episode.episodeNumber,
    ...(episode.originalTitle ? { originalTitle: episode.originalTitle } : {}),
    ...(episode.russianTitle ? { russianTitle: episode.russianTitle } : {}),
    ...(episode.airDate ? { airDate: episode.airDate } : {}),
  };
}

// Only the server-side detail path calls this. The catalog stays unchanged.
// The loader validates provenance/checksum and imports only this canonical ID.
export async function attachVerifiedEpisodeGuide(movie: Movie): Promise<Movie> {
  if (!movie.canonicalMovieId) return movie;
  const snapshot = await loadEpisodeGuideSnapshot(movie.canonicalMovieId);
  if (!snapshot) return movie;

  const identity = getCanonicalIdentityById(movie.canonicalMovieId);
  const issues = [
    ...(identity?.tmdbNamespace !== "tv" ||
    (movie.tmdbNamespace !== undefined && movie.tmdbNamespace !== "tv")
      ? ["MOVIE_NAMESPACE_NOT_TV"] : []),
    ...(movie.tmdbId !== snapshot.provider.id ? ["MOVIE_PROVIDER_ID_MISMATCH"] : []),
    ...(movie.slug !== snapshot.slug ? ["MOVIE_SLUG_MISMATCH"] : []),
  ];
  if (issues.length) {
    throw new EpisodeGuideSnapshotVerificationError(movie.canonicalMovieId, issues);
  }

  // Fresh arrays prevent a manual merge/consumer from mutating cached snapshots.
  // Do not derive catalog season/episode totals from specials or partial guides.
  return {
    ...movie,
    episodeGuide: snapshot.regularSeasons.map((season) => ({
      season: season.seasonNumber,
      episodes: season.episodes.map(toMovieEpisode),
    })),
    episodeSpecials: snapshot.specials.map(toMovieEpisode),
  };
}
