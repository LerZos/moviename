import { notFound } from "next/navigation";

import {
  getBreadcrumbJsonLd,
  getCatalogFaqJsonLd,
  getCatalogGenreRoutes,
  getCatalogRoute,
  getCollectionPageJsonLd,
  getGenreBySlug,
  getGenreItems,
  getGenreMetadata,
} from "../../../lib/seo";
import CatalogPageClient from "../CatalogPageClient";

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
  return getGenreMetadata(category, genre);
}

export default async function CatalogGenrePage({ params }: CatalogGenrePageProps) {
  const { category, genre } = await params;
  const route = getCatalogRoute(category);

  if (!route) {
    notFound();
  }

  const genreName = getGenreBySlug(route, genre);

  if (!genreName) {
    notFound();
  }

  const items = getGenreItems(route, genreName);

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
              { name: genreName, url: `/catalog/${route.slug}/${genre}` },
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

      <CatalogPageClient categorySlug={category} genreSlug={genre} />
    </>
  );
}
