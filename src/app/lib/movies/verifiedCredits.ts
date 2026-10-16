import { generatedCanonicalCredits } from "../../data/generatedCanonicalCredits";
import type { Movie, VerifiedMovieCredits } from "../../data/movies";

const creditsByCanonicalId = new Map(
  generatedCanonicalCredits.map((entry) => [entry.canonicalMovieId, entry]),
);

const contentTypeByPublicType: Record<Movie["type"], string> = {
  "Фильм": "film",
  "Сериал": "series",
  "Аниме": "anime",
  "Мультфильм": "cartoon",
  "Документальный": "documentary",
};

// Any manual edit to facts or cast owns the displayed credits for that movie.
// The broader keys also match the C.2 manual-override gate.
export function hasManualCreditsOverride(override: Record<string, unknown> | null | undefined): boolean {
  if (!override) return false;
  return ["facts", "cast", "actors", "directors", "creators", "seriesCreators", "voiceActors", "characters", "crew", "credits", "verifiedCredits"]
    .some((key) => Object.prototype.hasOwnProperty.call(override, key));
}

export function getVerifiedCreditsForMovie(movie: Movie): VerifiedMovieCredits | null {
  const entry = movie.canonicalMovieId ? creditsByCanonicalId.get(movie.canonicalMovieId) : undefined;
  if (!entry || entry.slug !== movie.slug || entry.contentType !== contentTypeByPublicType[movie.type] ||
      (entry.tmdbId ?? null) !== (movie.tmdbId ?? null) ||
      (entry.imdbId ?? null) !== (movie.imdbId ?? null) ||
      (entry.kinopoiskId ?? null) !== (movie.kinopoiskId ?? null) ||
      // Older static cards omit namespace; the generated entry was checked
      // against the canonical registry and content type at generation time.
      (entry.tmdbNamespace && movie.tmdbNamespace && entry.tmdbNamespace !== movie.tmdbNamespace)) {
    return null;
  }
  return {
    provenance: entry.provenance,
    ...(entry.fields.directors?.length ? { directors: [...entry.fields.directors] } : {}),
    ...(entry.fields.seriesCreators?.length ? { seriesCreators: [...entry.fields.seriesCreators] } : {}),
    ...(entry.fields.actors?.length ? { actors: entry.fields.actors.map((person) => ({ ...person })) } : {}),
  };
}

export function attachVerifiedCredits(
  movie: Movie,
  override: Record<string, unknown> | null | undefined,
): Movie {
  const verifiedCredits = getVerifiedCreditsForMovie(movie) ?? movie.verifiedCredits;

  return {
    ...movie,
    verifiedCredits: hasManualCreditsOverride(override)
      ? undefined
      : verifiedCredits,
  };
}
