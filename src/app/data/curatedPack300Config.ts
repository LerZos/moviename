import type { MovieType } from "../lib/import/types";

export type CuratedPackQuota = Record<MovieType, number>;

export const CURATED_PACK_300_VERSION = "2026-07-07-v1";

export const CURATED_PACK_300_QUOTAS: CuratedPackQuota = {
  film: 165,
  series: 60,
  anime: 30,
  cartoon: 30,
  documentary: 15,
};

export const CURATED_PACK_300_MINIMUMS = {
  film: { rating: 5.8, votes: 700 },
  series: { rating: 6.0, votes: 500 },
  anime: { rating: 6.2, votes: 300 },
  cartoon: { rating: 5.8, votes: 400 },
  documentary: { rating: 6.2, votes: 150 },
} as const;

export const CURATED_PACK_300_PAGE_SIZE = 250;
export const CURATED_PACK_300_MAX_PAGES_PER_MODE = 10;
