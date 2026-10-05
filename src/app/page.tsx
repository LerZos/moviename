import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import type { Movie } from "./data/movies";

import { getHomePageJsonLd, siteUrl } from "./lib/seo";
import { getCachedPublicMovies } from "./lib/movies/movieOverrides";
import { getDailyFeaturedDateKey, getDailyFeaturedItems } from "./lib/home/dailyFeatured";

// Главная содержит большой клиентский каталог. Суточный fallback ограничивает
// повторные ISR-записи; публикация и удаление карточек по-прежнему обновляют её
// точечно через существующие серверные маршруты.
export const revalidate = 86400;

const HOME_MOVIES_PER_TYPE = 90;
const HOME_TOP_RATED_LIMIT = 180;
const HOME_NEW_RELEASES_LIMIT = 70;

function compactHomeText(text: string, maxLength = 190) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength).replace(/\s+\S*$/, "")}...`;
}

function getMovieYear(movie: Movie) {
  const match = String(movie.year || "").match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

function pushUniqueMovie(target: Movie[], seenIds: Set<number>, movie: Movie) {
  if (seenIds.has(movie.id)) return;

  seenIds.add(movie.id);
  target.push(movie);
}

function getHomeMoviePool(movies: Movie[], featured: Movie[]) {
  const selected: Movie[] = [];
  const seenIds = new Set<number>();

  featured.forEach((movie) => pushUniqueMovie(selected, seenIds, movie));

  movies
    .filter((movie) => getMovieYear(movie) === 2026)
    .slice(0, HOME_NEW_RELEASES_LIMIT)
    .forEach((movie) => pushUniqueMovie(selected, seenIds, movie));

  movies
    .filter((movie) => movie.rating > 0)
    .sort((first, second) => second.rating - first.rating)
    .slice(0, HOME_TOP_RATED_LIMIT)
    .forEach((movie) => pushUniqueMovie(selected, seenIds, movie));

  ["Фильм", "Сериал", "Аниме", "Мультфильм"].forEach((type) => {
    movies
      .filter((movie) => movie.type === type)
      .slice(0, HOME_MOVIES_PER_TYPE)
      .forEach((movie) => pushUniqueMovie(selected, seenIds, movie));
  });

  return selected;
}

function getHomeClientContent(movies: Movie[]) {
  return movies.map((movie) => ({
    id: movie.id,
    slug: movie.slug,
    title: movie.title,
    originalTitle: movie.originalTitle,
    searchTitles: movie.searchTitles.slice(0, 8),
    type: movie.type,
    year: movie.year,
    rating: movie.rating,
    genres: movie.genres,
    poster: movie.poster,
    backdrop: movie.backdrop,
    posterFallbacks: movie.posterFallbacks,
    description: compactHomeText(movie.description),
    trailerUrl: movie.trailerUrl,
    tmdbId: movie.tmdbId,
    imdbId: movie.imdbId,
    kinopoiskId: movie.kinopoiskId,
    source: movie.source,
  }));
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    absolute: "KinoLuma — фильмы, сериалы, аниме и мультфильмы смотреть онлайн",
  },
  description:
    "KinoLuma — фильмы, сериалы, аниме и мультфильмы смотреть онлайн: описания, рейтинги, трейлеры, подборки и страницы просмотра без регистрации.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "KinoLuma — фильмы, сериалы, аниме и мультфильмы смотреть онлайн",
    description:
      "Подборки фильмов, сериалов, аниме и мультфильмов: рейтинги, трейлеры, описания и страницы просмотра без регистрации.",
    url: "/",
    siteName: "KinoLuma",
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: "/kinoluma-icon.png",
        width: 512,
        height: 512,
        alt: "KinoLuma",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KinoLuma — фильмы, сериалы, аниме и мультфильмы смотреть онлайн",
    description:
      "Каталог фильмов, сериалов, аниме и мультфильмов с подборками, трейлерами и страницами просмотра без регистрации.",
    images: ["/kinoluma-icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default async function Page() {
  const publicMovies = await getCachedPublicMovies();
  const dailyFeatured = getDailyFeaturedItems(publicMovies);
  const homeClientContent = getHomeClientContent(
    getHomeMoviePool(publicMovies, dailyFeatured),
  );
  const dailyFeaturedDateKey = getDailyFeaturedDateKey();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getHomePageJsonLd()),
        }}
      />
      <HomeClient
        initialContent={homeClientContent}
        initialFeaturedIds={dailyFeatured.map((item) => item.id)}
        initialFeaturedDateKey={dailyFeaturedDateKey}
      />
    </>
  );
}
