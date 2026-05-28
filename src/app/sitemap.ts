import type { MetadataRoute } from "next";

import { seoCollections } from "./data/collections";
import { getPublicMovies } from "./lib/movies/movieOverrides";
import {
  catalogRoutes,
  getCatalogGenreRoutes,
  siteUrl,
} from "./lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const publicMovies = await getPublicMovies();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${siteUrl}/collections`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.86,
    },
    ...seoCollections.map((collection) => ({
      url: `${siteUrl}/collections/${collection.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.84,
    })),
    ...catalogRoutes.map((route) => ({
      url: `${siteUrl}/catalog/${route.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...getCatalogGenreRoutes().map((route) => ({
      url: `${siteUrl}/catalog/${route.category}/${route.genre}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.76,
    })),
    ...publicMovies.map((movie) => ({
      url: `${siteUrl}/movie/${movie.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.88,
    })),
  ];
}
