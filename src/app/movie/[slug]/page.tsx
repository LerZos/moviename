import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCachedMovieWithOverrides } from "../../lib/movies/movieOverrides";
import type { Movie } from "../../data/movies";
import { generatedRequestedSeoCollections } from "../../data/generatedRequestedCollections";
import { movieCardIndex, type MovieCardIndexItem } from "../../data/movieCardIndex";
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

function getRequestedCollectionRelatedSlugs(movieSlug: string) {
  const seenSlugs = new Set<string>([movieSlug]);

  return generatedRequestedSeoCollections
    .filter((collection) => collection.itemSlugs.includes(movieSlug))
    .flatMap((collection) => collection.itemSlugs)
    .filter((slug) => {
      if (seenSlugs.has(slug)) return false;

      seenSlugs.add(slug);
      return true;
    });
}

function getSimilarMovies(movie: Movie): MovieCardIndexItem[] {
  const currentGenres = new Set(movie.genres);
  const requestedRelatedSlugs = getRequestedCollectionRelatedSlugs(movie.slug);
  const requestedRelatedScore = new Map(
    requestedRelatedSlugs.map((slug, index) => [slug, 80 - index] as const),
  );

  return movieCardIndex
    .filter((item) => item.id !== movie.id)
    .map((item) => {
      const sharedGenres = item.genres.filter((genre) => currentGenres.has(genre));
      const collectionScore = requestedRelatedScore.get(item.slug) ?? 0;
      const score =
        collectionScore +
        sharedGenres.length * 4 +
        (item.type === movie.type ? 2 : 0) +
        item.rating / 10;

      return { item, sharedGenres, collectionScore, score };
    })
    .filter(
      ({ item, sharedGenres, collectionScore }) =>
        collectionScore > 0 || sharedGenres.length > 0 || item.type === movie.type,
    )
    .sort((firstItem, secondItem) => {
      if (secondItem.score !== firstItem.score) {
        return secondItem.score - firstItem.score;
      }

      return secondItem.item.rating - firstItem.item.rating;
    })
    .slice(0, 6)
    .map(({ item }) => item);
}

export async function generateMetadata({
  params,
}: MoviePageProps): Promise<Metadata> {
  const { slug } = await params;
  const movie = await getCachedMovieWithOverrides(slug);

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
  const movie = await getCachedMovieWithOverrides(slug);

  if (!movie) {
    notFound();
  }

  const relatedMovies = getSimilarMovies(movie);

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

      <MoviePageClient movie={movie} relatedMovies={relatedMovies} />
    </>
  );
}
