import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINOPOISK_BASE_URL = "https://api.kinopoisk.dev/v1.4";
const DEFAULT_FALLBACK = "/kinoluma-icon.png";
const CACHE_CONTROL =
  "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";

type KinopoiskMoviePosterResponse = {
  poster?: {
    url?: string | null;
    previewUrl?: string | null;
  } | null;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanKinopoiskId(value: unknown) {
  const text = cleanString(value);
  const match = text.match(/\d+/);
  return match ? match[0] : "";
}

function getKinopoiskToken() {
  return (
    cleanString(process.env.KINOPOISK_DEV_TOKEN) ||
    cleanString(process.env.KINOPOISK_API_KEY)
  );
}

function isSafeHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function getPublicRequestOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim() || requestUrl.host;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim();
  const protocol = forwardedProto || requestUrl.protocol.replace(":", "");

  return `${protocol}://${host}`;
}

function normalizeFallbackUrl(value: string, request: Request) {
  const fallback = cleanString(value);
  const publicOrigin = getPublicRequestOrigin(request);

  if (!fallback || fallback.startsWith("data:")) {
    return new URL(DEFAULT_FALLBACK, publicOrigin).toString();
  }

  if (fallback.startsWith("/")) return new URL(fallback, publicOrigin).toString();

  return new URL(DEFAULT_FALLBACK, publicOrigin).toString();
}

function normalizePosterUrl(value: unknown) {
  const url = cleanString(value);
  if (!isSafeHttpUrl(url)) return "";
  return url;
}

async function fetchKinopoiskPoster(kinopoiskId: string) {
  const token = getKinopoiskToken();
  if (!token) return "";

  const url = new URL(`${KINOPOISK_BASE_URL}/movie/${kinopoiskId}`);
  url.searchParams.append("selectFields", "id");
  url.searchParams.append("selectFields", "poster");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "X-API-KEY": token,
        accept: "application/json",
      },
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    if (!response.ok) return "";

    const payload = (await response.json()) as KinopoiskMoviePosterResponse;
    return (
      normalizePosterUrl(payload.poster?.url) ||
      normalizePosterUrl(payload.poster?.previewUrl)
    );
  } catch (error) {
    console.warn("[KinoLuma] Kinopoisk poster lookup failed", {
      kinopoiskId,
      error: error instanceof Error ? error.message : error,
    });
    return "";
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const kinopoiskId = cleanKinopoiskId(requestUrl.searchParams.get("kpId"));
  const fallbackUrl = normalizeFallbackUrl(
    requestUrl.searchParams.get("fallback") || "",
    request,
  );

  if (!kinopoiskId) {
    return NextResponse.redirect(fallbackUrl, {
      status: 307,
      headers: {
        "Cache-Control": CACHE_CONTROL,
      },
    });
  }

  const posterUrl = await fetchKinopoiskPoster(kinopoiskId);
  const targetUrl = posterUrl || fallbackUrl;

  return NextResponse.redirect(targetUrl, {
    status: 307,
    headers: {
      "Cache-Control": CACHE_CONTROL,
    },
  });
}
