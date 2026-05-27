import type { MetadataRoute } from "next";

import { seoCollections } from "./data/collections";
import { movies } from "./data/movies";
import {
  catalogRoutes,
  getCatalogGenreRoutes,
  siteUrl,
} from "./lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

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
    ...movies.map((movie) => ({
      url: `${siteUrl}/movie/${movie.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.88,
    })),
  ];
}
