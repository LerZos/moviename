import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMovieWithOverrides, getPublicMovies } from "../../lib/movies/movieOverrides";
import {
  absoluteUrl,
  getMovieBreadcrumbJsonLd,
  getMovieFaqJsonLd,
  getMovieJsonLd,
  getMovieMetaDescription,
  getMovieSeoTitle,
  getMovieWebPageJsonLd,
  siteUrl,
} from "../../lib/seo";
import MoviePageClient from "./MoviePageClient";

type MoviePageProps = {
  params: Promise<{
    slug: string;
  }>;
};


export const revalidate = 3600;

// Не генерируем все страницы фильмов во время build.
// Большой каталог живёт через ISR: страница создаётся по первому запросу
// и дальше кешируется с revalidate. Sitemap при этом остаётся полным.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: MoviePageProps): Promise<Metadata> {
  const { slug } = await params;
  const movie = await getMovieWithOverrides(slug);

  if (!movie) {
    return {
      title: "Фильм не найден",
      description: "Такой страницы фильма нет в каталоге KinoLuma.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const pageUrl = `${siteUrl}/movie/${movie.slug}`;
  const posterUrl = absoluteUrl(movie.poster);
  const title = getMovieSeoTitle(movie);
  const description = getMovieMetaDescription(movie);

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
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
      type: movie.type === "Сериал" ? "video.tv_show" : "video.movie",
      images: [
        {
          url: posterUrl,
          width: 500,
          height: 750,
          alt: `${movie.title} (${movie.year}) — постер KinoLuma`,
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
  const movie = await getMovieWithOverrides(slug);

  if (!movie) {
    notFound();
  }

  const publicMovies = await getPublicMovies();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getMovieJsonLd(movie)),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getMovieWebPageJsonLd(movie)),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getMovieBreadcrumbJsonLd(movie)),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getMovieFaqJsonLd(movie)),
        }}
      />

      <MoviePageClient movie={movie} allMovies={publicMovies} />
    </>
  );
}
