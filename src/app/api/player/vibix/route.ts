import { NextResponse } from "next/server";
import { lookupVibix } from "../../../lib/vibixLookup";
import { parseVibixId } from "../../../lib/vibix";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kpId = parseVibixId("kp", params.get("kpId"));
  const imdbId = parseVibixId("imdb", params.get("imdbId"));
  if (!kpId && !imdbId) return NextResponse.json(
    { ok: false, status: "invalid_response", player: null }, { status: 400 },
  );
  const baseUrl = (process.env.EXIIM_API_URL || process.env.VIBIX_API_URL || "https://vibix.org")
    .trim().replace(/\/api\/external\/documentation\/?$/i, "").replace(/\/+$/, "");
  const outcome = await lookupVibix({
    kpId, imdbId, movieType: params.get("movieType") || "",
    baseUrl, token: process.env.EXIIM_API_TOKEN || process.env.VIBIX_API_TOKEN || process.env.RENDEX_API_TOKEN || "",
    publisherId: process.env.RENDEX_PUBLISHER_ID || process.env.VIBIX_PUBLISHER_ID || "678053396",
    signal: request.signal,
  });
  const httpStatus = outcome.status === "found" || outcome.status === "not_found" ? 200
    : outcome.status === "timeout" ? 504 : outcome.status === "rate_limited" ? 429
      : outcome.status === "auth_error" || outcome.status === "unconfigured" ? 503 : 502;
  // No upstream details or persistent/negative cache without a verified contract.
  return NextResponse.json({ ok: httpStatus === 200, ...outcome }, {
    status: httpStatus, headers: { "Cache-Control": "private, no-store" },
  });
}
