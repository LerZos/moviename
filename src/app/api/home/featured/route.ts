import { NextResponse } from "next/server";

import { getCachedPublicMovies } from "../../../lib/movies/movieOverrides";
import {
  DAILY_FEATURED_COUNT,
  getDailyFeaturedDateKey,
  getDailyFeaturedItems,
} from "../../../lib/home/dailyFeatured";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const dateKey = getDailyFeaturedDateKey(now);
  const movies = await getCachedPublicMovies();
  const featuredItems = getDailyFeaturedItems(movies, now, DAILY_FEATURED_COUNT);

  return NextResponse.json(
    {
      dateKey,
      ids: featuredItems.map((item) => item.id),
      count: featuredItems.length,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    },
  );
}
