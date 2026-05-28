import { notFound } from "next/navigation";

import {
  getBreadcrumbJsonLd,
  getCatalogFaqJsonLd,
  getCatalogGenreRoutes,
  getCatalogRoute,
  getCollectionPageJsonLd,
  getGenreBySlug,
  getGenreMetadata,
} from "../../../lib/seo";
import CatalogPageClient from "../CatalogPageClient";
import { getPublicMovies } from "../../../lib/movies/movieOverrides";

export const dynamicParams = true;

type CatalogGenrePageProps = {
  params: Promise<{
    category: string;
    genre: string;
  }>;
};

export function generateStaticParams() {
  return getCatalogGenreRoutes();
}

export async function generateMetadata({ params }: CatalogGenrePageProps) {
  const { category, genre } = await params;
  return getGenreMetadata(category, decodeURIComponent(genre));
}

export default async function CatalogGenrePage({ params }: CatalogGenrePageProps) {
  const { category, genre } = await params;
  const decodedGenre = decodeURIComponent(genre);
  const route = getCatalogRoute(category);

  if (!route) {
    notFound();
  }

  const genreName = getGenreBySlug(route, decodedGenre);

  if (!genreName) {
    notFound();
  }

  const publicMovies = await getPublicMovies();
  const items = publicMovies.filter((movie) => movie.type === route.type && movie.genres.includes(genreName));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getCollectionPageJsonLd(route, items, genreName)),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            getBreadcrumbJsonLd([
              { name: "KinoLuma", url: "/" },
              { name: route.label, url: `/catalog/${route.slug}` },
              { name: genreName, url: `/catalog/${route.slug}/${decodedGenre}` },
            ]),
          ),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getCatalogFaqJsonLd(route, genreName)),
        }}
      />

      <CatalogPageClient categorySlug={category} genreSlug={decodedGenre} initialContent={publicMovies} />
    </>
  );
}
