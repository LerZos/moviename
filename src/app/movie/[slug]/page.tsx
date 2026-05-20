import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { movies, type Movie } from "../../data/movies";
import MoviePageClient from "./MoviePageClient";

type MoviePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://kinoluma.online").replace(/\/$/, "");

function findMovieBySlug(slug: string) {
  return movies.find((movie) => movie.slug === slug);
}

function absoluteUrl(url: string) {
  if (!url) {
    return `${siteUrl}/kinoluma-icon.png`;
  }

  if (url.startsWith("http") || url.startsWith("data:")) {
    return url;
  }

  return `${siteUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function getMovieDescription(movie: Movie) {
  return (
    movie.description ||
    `Информация о ${movie.title}: описание, трейлер, жанры, рейтинг, актёры и похожие фильмы на KinoLuma.`
  );
}

function getMovieKeywords(movie: Movie) {
  return Array.from(
    new Set([
      movie.title,
      movie.originalTitle,
      ...movie.searchTitles,
      movie.type,
      "KinoLuma",
      "фильмы онлайн легально",
      "каталог фильмов",
      "трейлер",
      "описание фильма",
      ...movie.genres,
      String(movie.year),
    ].filter(Boolean)),
  );
}

function getJsonLd(movie: Movie) {
  const pageUrl = `${siteUrl}/movie/${movie.slug}`;
  const posterUrl = absoluteUrl(movie.poster);
  const description = getMovieDescription(movie);
  const schemaType = movie.type === "Сериал" ? "TVSeries" : "Movie";

  return {
    "@context": "https://schema.org",
    "@type": schemaType,
    "@id": `${pageUrl}#${schemaType.toLowerCase()}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    name: movie.title,
    alternateName: movie.originalTitle,
    description,
    url: pageUrl,
    image: posterUrl,
    thumbnailUrl: posterUrl,
    datePublished: String(movie.year),
    genre: movie.genres,
    inLanguage: "ru-RU",
    isAccessibleForFree: true,
    actor: movie.cast?.map((person) => ({
      "@type": "Person",
      name: person.name,
      characterName: person.role,
    })),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: movie.rating,
      bestRating: 10,
      worstRating: 1,
      ratingCount: 100,
    },
    trailer: movie.trailerUrl
      ? {
          "@type": "VideoObject",
          name: `Трейлер — ${movie.title}`,
          description: `Официальный или легально встроенный трейлер: ${movie.title}.`,
          embedUrl: movie.trailerUrl,
          thumbnailUrl: posterUrl,
          uploadDate: `${movie.year}-01-01`,
        }
      : undefined,
  };
}

export function generateStaticParams() {
  return movies.map((movie) => ({
    slug: movie.slug,
  }));
}

export async function generateMetadata({
  params,
}: MoviePageProps): Promise<Metadata> {
  const { slug } = await params;
  const movie = findMovieBySlug(slug);

  if (!movie) {
    return {
      title: "Фильм не найден — KinoLuma",
      description: "Такой страницы фильма нет в каталоге KinoLuma.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const pageUrl = `${siteUrl}/movie/${movie.slug}`;
  const posterUrl = absoluteUrl(movie.poster);
  const description = getMovieDescription(movie);
  const title = `${movie.title} (${movie.year}) — ${movie.type} на KinoLuma`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    keywords: getMovieKeywords(movie),
    alternates: {
      canonical: pageUrl,
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
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "KinoLuma",
      locale: "ru_RU",
      type: "video.movie",
      images: [
        {
          url: posterUrl,
          width: 500,
          height: 750,
          alt: `${movie.title} — постер KinoLuma`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [posterUrl],
    },
  };
}

export default async function MoviePage({ params }: MoviePageProps) {
  const { slug } = await params;
  const movie = findMovieBySlug(slug);

  if (!movie) {
    notFound();
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getJsonLd(movie)),
        }}
      />

      <MoviePageClient movie={movie} />
    </>
  );
}
