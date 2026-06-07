import { notFound } from "next/navigation";

import {
  catalogRoutes,
  getBreadcrumbJsonLd,
  getCatalogFaqJsonLd,
  getCatalogMetadata,
  getCatalogRoute,
  getCollectionPageJsonLd,
} from "../../lib/seo";
import CatalogPageClient from "./CatalogPageClient";
import { getCachedPublicMovies } from "../../lib/movies/movieOverrides";

type CatalogPageProps = {
  params: Promise<{
    category: string;
  }>;
};

export function generateStaticParams() {
  return catalogRoutes.map((route) => ({
    category: route.slug,
  }));
}

export async function generateMetadata({ params }: CatalogPageProps) {
  const { category } = await params;
  return getCatalogMetadata(category);
}

export default async function CatalogCategoryPage({ params }: CatalogPageProps) {
  const { category } = await params;
  const route = getCatalogRoute(category);

  if (!route) {
    notFound();
  }

  const publicMovies = await getCachedPublicMovies();
  const items = publicMovies.filter((movie) => movie.type === route.type);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getCollectionPageJsonLd(route, items)),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            getBreadcrumbJsonLd([
              { name: "KinoLuma", url: "/" },
              { name: route.label, url: `/catalog/${route.slug}` },
            ]),
          ),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getCatalogFaqJsonLd(route)),
        }}
      />

      <CatalogPageClient categorySlug={category} initialContent={items} />
    </>
  );
}
