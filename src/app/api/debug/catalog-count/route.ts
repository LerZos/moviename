import { NextResponse } from "next/server";

import { movies } from "../../../data/movies";
import { manualCuratedExpansionPack } from "../../../data/manualCuratedExpansionPack";

export const dynamic = "force-dynamic";

export function GET() {
  const manualSlugs = new Set(manualCuratedExpansionPack.map((movie) => movie.slug));
  const visibleManualMovies = movies.filter((movie) => manualSlugs.has(movie.slug));

  return NextResponse.json({
    ok: true,
    catalogTotal: movies.length,
    manualPackTotal: manualCuratedExpansionPack.length,
    visibleManualPackTotal: visibleManualMovies.length,
    firstManualSlugs: manualCuratedExpansionPack.slice(0, 10).map((movie) => movie.slug),
    visibleManualSlugs: visibleManualMovies.slice(0, 10).map((movie) => movie.slug),
  });
}
