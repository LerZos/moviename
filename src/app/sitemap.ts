import type { MetadataRoute } from "next";

import { seoCollections } from "./data/collections";
import { getCachedPublicMovies } from "./lib/movies/movieOverrides";
import {
  catalogRoutes,
  getCatalogGenreRoutes,
  siteUrl,
} from "./lib/seo";

const STATIC_LAST_MODIFIED = new Date("2026-06-07T00:00:00.000Z");

type SitemapEntry = MetadataRoute.Sitemap[number];

function getMovieSitemapPriority(type: string) {
  if (type === "Фильм" || type === "Сериал") return 0.9;
  if (type === "Мультфильм") return 0.84;
  return 0.8;
}

function getMovieChangeFrequency(type: string) {
  return type === "Фильм" || type === "Сериал" ? "weekly" as const : "monthly" as const;
}

function getValidLastModified(value: unknown) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value !== "string" && typeof value !== "number") return undefined;

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function getMovieLastModified(movie: unknown) {
  const record = movie && typeof movie === "object" ? movie as Record<string, unknown> : {};

  return (
    getValidLastModified(record.updatedAt) ||
    getValidLastModified(record.updated_at) ||
    getValidLastModified(record.createdAt) ||
    getValidLastModified(record.created_at) ||
    STATIC_LAST_MODIFIED
  );
}

function uniqueSitemapEntries(entries: SitemapEntry[]) {
  const seenUrls = new Set<string>();

  return entries.filter((entry) => {
    if (seenUrls.has(entry.url)) return false;
    seenUrls.add(entry.url);
    return true;
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicMovies = await getCachedPublicMovies();

  const entries: SitemapEntry[] = [
    {
      url: siteUrl,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${siteUrl}/expected`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.86,
    },
    {
      url: `${siteUrl}/collections`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.86,
    },
    ...seoCollections.map((collection) => ({
      url: `${siteUrl}/collections/${collection.slug}`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.84,
    })),
    ...catalogRoutes.map((route) => ({
      url: `${siteUrl}/catalog/${route.slug}`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...getCatalogGenreRoutes().map((route) => ({
      url: `${siteUrl}/catalog/${route.category}/${route.genre}`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.76,
    })),
    ...publicMovies.map((movie) => ({
      url: `${siteUrl}/movie/${movie.slug}`,
      lastModified: getMovieLastModified(movie),
      changeFrequency: getMovieChangeFrequency(movie.type),
      priority: getMovieSitemapPriority(movie.type),
    })),
  ];

  return uniqueSitemapEntries(entries);
}
