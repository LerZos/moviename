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


function getHomeClientContent(movies: Movie[]) {
  return movies.map((movie) => ({
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
  const homeClientContent = getHomeClientContent(publicMovies);
  const dailyFeatured = getDailyFeaturedItems(publicMovies);
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
