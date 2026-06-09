import type { MovieCardIndexItem } from "./movieCardIndex";
import { generatedRequestedExpansionMovies } from "./generatedRequestedExpansion";

// Лёгкий индекс для быстрых карточек. Данные уже добавлены статически, генератор не нужен.
export const generatedRequestedMovieCardIndex: MovieCardIndexItem[] = generatedRequestedExpansionMovies.map((movie) => ({
  id: movie.id,
  slug: movie.slug,
  title: movie.title,
  type: movie.type,
  year: movie.year,
  rating: movie.rating,
  genres: movie.genres,
  poster: movie.poster,
  posterFallbacks: movie.posterFallbacks,
}));
