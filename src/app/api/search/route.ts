import { NextResponse } from "next/server";

import { movies, type Movie } from "../../data/movies";
import { normalizeSearchText, searchCatalog } from "../../lib/search/searchEngine";

const SEARCH_RESULT_LIMIT = 24;
const SEARCH_CACHE_LIMIT = 100;
const searchResultCache = new Map<string, ReturnType<typeof toSearchItem>[]>();

function toSearchItem(movie: Movie) {
  return {
    id: movie.id,
    canonicalMovieId: movie.canonicalMovieId,
    slug: movie.slug,
    title: movie.title,
    originalTitle: movie.originalTitle,
    searchTitles: movie.searchTitles,
    type: movie.type,
    year: movie.year,
    rating: movie.rating,
    genres: movie.genres,
    poster: movie.poster,
    backdrop: movie.backdrop,
    posterFallbacks: movie.posterFallbacks,
    description: movie.description,
    trailerUrl: movie.trailerUrl,
    tmdbId: movie.tmdbId,
    imdbId: movie.imdbId,
    kinopoiskId: movie.kinopoiskId,
    source: movie.source,
    facts: movie.facts,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawQuery = url.searchParams.get("q") || "";
  const query = normalizeSearchText(rawQuery);

  if (!query) {
    return NextResponse.json({ items: [] });
  }

  const cachedItems = searchResultCache.get(query);
  const items = cachedItems ?? searchCatalog(movies, rawQuery, { limit: SEARCH_RESULT_LIMIT }).map(toSearchItem);

  if (!cachedItems) {
    searchResultCache.set(query, items);
    if (searchResultCache.size > SEARCH_CACHE_LIMIT) {
      const oldestKey = searchResultCache.keys().next().value;
      if (oldestKey) searchResultCache.delete(oldestKey);
    }
  }

  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
  );
}
