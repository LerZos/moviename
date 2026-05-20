import type { MetadataRoute } from "next";

import { movies } from "./data/movies";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://kinoluma.online").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 1,
    },
    ...movies.map((movie) => ({
      url: `${siteUrl}/movie/${movie.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.86,
    })),
  ];
}
