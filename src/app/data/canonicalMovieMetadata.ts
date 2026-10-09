import type { Movie } from "./movies";
import { generatedCanonicalMovieMetadata } from "./generatedCanonicalMovieMetadata";
import type { CanonicalMovieId } from "./generatedCanonicalMovieRegistry";

export const CANONICAL_METADATA_FIELDS = [
  "runtime",
  "releaseDate",
  "releaseStatus",
  "countries",
  "seasons",
  "episodes",
] as const;

export type CanonicalMovieMetadataField = (typeof CANONICAL_METADATA_FIELDS)[number];
export type CanonicalMovieMetadataSource = "tmdb" | "kinopoisk";

export type CanonicalMovieMetadataProvenance = {
  source: CanonicalMovieMetadataSource;
  fields: readonly CanonicalMovieMetadataField[];
  observedAt: string;
  sourceUpdatedAt?: string;
};

export type CanonicalMovieMetadataEntry = {
  canonicalMovieId: CanonicalMovieId;
  runtime?: number;
  releaseDate?: string;
  releaseStatus?: string;
  countries?: readonly string[];
  seasons?: number;
  episodes?: number;
  sources: readonly CanonicalMovieMetadataProvenance[];
};

const metadataByCanonicalMovieId = new Map<CanonicalMovieId, CanonicalMovieMetadataEntry>(
  generatedCanonicalMovieMetadata.map((entry) => [entry.canonicalMovieId, entry]),
);

export function applyCanonicalMovieMetadata(movie: Movie): Movie {
  const canonicalMovieId = movie.canonicalMovieId;
  const metadata = canonicalMovieId
    ? metadataByCanonicalMovieId.get(canonicalMovieId)
    : undefined;

  return {
    ...movie,
    facts: movie.facts?.map((fact) => ({ ...fact })),
    ...(metadata?.runtime !== undefined ? { runtime: metadata.runtime } : {}),
    ...(metadata?.releaseDate !== undefined ? { releaseDate: metadata.releaseDate } : {}),
    ...(metadata?.releaseStatus !== undefined ? { releaseStatus: metadata.releaseStatus } : {}),
    ...(metadata?.countries !== undefined ? { countries: [...metadata.countries] } : {}),
    ...(metadata?.seasons !== undefined ? { seasons: metadata.seasons } : {}),
    ...(metadata?.episodes !== undefined ? { episodes: metadata.episodes } : {}),
  };
}

export function getCanonicalMovieMetadataCount() {
  return metadataByCanonicalMovieId.size;
}
