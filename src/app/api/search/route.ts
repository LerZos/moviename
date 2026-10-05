import { NextResponse } from "next/server";

import { movies, type Movie } from "../../data/movies";

function normalizeSearchText(text: string) {
  return text
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .trim();
}

function getSearchText(movie: Movie) {
  return normalizeSearchText(
    [
      movie.title,
      movie.originalTitle,
      ...movie.searchTitles,
      movie.type,
      movie.year,
      ...movie.genres,
      movie.slug,
    ].join(" "),
  );
}

function toSearchItem(movie: Movie) {
  return {
    id: movie.id,
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
  const query = normalizeSearchText(url.searchParams.get("q") || "");

  if (query.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const items = movies
    .map((movie) => {
      const title = normalizeSearchText(movie.title);
      const originalTitle = normalizeSearchText(movie.originalTitle);
      const aliases = movie.searchTitles.map((item) => normalizeSearchText(item));
      const searchText = getSearchText(movie);
      const exact =
        title === query ||
        originalTitle === query ||
        aliases.includes(query) ||
        movie.slug === query;
      const startsWith =
        title.startsWith(query) ||
        originalTitle.startsWith(query) ||
        aliases.some((item) => item.startsWith(query));

      return { movie, searchText, exact, startsWith };
    })
    .filter((item) => item.searchText.includes(query))
    .sort((first, second) => {
      if (first.exact !== second.exact) return Number(second.exact) - Number(first.exact);
      if (first.startsWith !== second.startsWith) {
        return Number(second.startsWith) - Number(first.startsWith);
      }

      return second.movie.rating - first.movie.rating;
    })
    .slice(0, 24)
    .map(({ movie }) => toSearchItem(movie));

  return NextResponse.json({ items });
}
