import type { MetadataRoute } from "next";

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
      priority: 0.86,
    })),
  ];
}
