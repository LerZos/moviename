import { NextResponse } from "next/server";

import { movies } from "../../../data/movies";
import {
  DAILY_FEATURED_COUNT,
  getDailyFeaturedDateKey,
  getDailyFeaturedItems,
} from "../../../lib/home/dailyFeatured";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const now = new Date();
  const dateKey = getDailyFeaturedDateKey(now);
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
