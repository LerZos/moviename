import { NextResponse } from "next/server";

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original";
const FALLBACK_POSTER = "/kinoluma-icon.png";
const CACHE_CONTROL = "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=2592000";

function cleanText(value: string | null | undefined) {
  return (value || "").trim();
}

function getMediaType(type: string | null | undefined) {
  const value = cleanText(type).toLowerCase();
  if (value.includes("сериал") || value === "tv" || value === "series") return "tv";
  return "movie";
}

function redirectTo(url: URL | string) {
  const response = NextResponse.redirect(url, 302);
  response.headers.set("Cache-Control", CACHE_CONTROL);
  return response;
}

function getSafeFallbackUrl(request: Request, value: string) {
  const fallback = cleanText(value);

  if (!fallback) return new URL(FALLBACK_POSTER, request.url);

  if (fallback.startsWith("/")) {
    return new URL(fallback, request.url);
  }

  try {
    const url = new URL(fallback);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url;
    }
  } catch {
    return new URL(FALLBACK_POSTER, request.url);
  }

  return new URL(FALLBACK_POSTER, request.url);
}

function redirectToFallback(request: Request, fallback: string) {
  return redirectTo(getSafeFallbackUrl(request, fallback));
}

async function tmdbApiFetch<T>(path: string, params: Record<string, string> = {}) {
  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey) return null;

  const url = new URL(`${TMDB_API_BASE}${path}`);
  url.searchParams.set("api_key", apiKey);

  if (!params.language) {
    url.searchParams.set("language", "ru-RU");
  }

  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 30 } });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

type TmdbDetails = {
  id?: number;
  backdrop_path?: string | null;
  poster_path?: string | null;
};

type TmdbFindResponse = {
  movie_results?: TmdbDetails[];
  tv_results?: TmdbDetails[];
};

type TmdbSearchItem = {
  id?: number;
  backdrop_path?: string | null;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  popularity?: number;
};

type TmdbSearchResponse = { results?: TmdbSearchItem[] };

type TmdbImageItem = {
  file_path?: string | null;
  width?: number;
  height?: number;
  vote_average?: number;
  vote_count?: number;
  aspect_ratio?: number;
};

type TmdbImagesResponse = { backdrops?: TmdbImageItem[] };

function getBackdropPath(item: TmdbDetails | TmdbSearchItem | TmdbImageItem | null | undefined) {
  if (!item) return "";

  const path = "backdrop_path" in item ? item.backdrop_path : item.file_path;
  return path && path.startsWith("/") ? path : "";
}

function getPosterPath(item: TmdbDetails | TmdbSearchItem | null | undefined) {
  const path = item?.poster_path;
  return path && path.startsWith("/") ? path : "";
}

function getImageUrl(path: string) {
  return path ? `${TMDB_IMAGE_BASE}${path}` : "";
}

function getBackdropQualityScore(item: TmdbImageItem) {
  const width = item.width || 0;
  const height = item.height || 0;
  const voteAverage = item.vote_average || 0;
  const voteCount = item.vote_count || 0;
  const aspectRatio = item.aspect_ratio || (height ? width / height : 0);

  if (!getBackdropPath(item)) return -1;

  // Нормальный backdrop обычно около 16:9. Постеры и случайные вертикальные картинки режем сразу.
  const aspectPenalty = aspectRatio >= 1.55 && aspectRatio <= 2.15 ? 0 : -2000;
  const sizeScore = width * 1.6 + height;
  const voteScore = voteAverage * 55 + Math.min(voteCount, 120) * 10;

  return sizeScore + voteScore + aspectPenalty;
}

function pickBestBackdrop(backdrops: TmdbImageItem[] | undefined) {
  const usable = (backdrops || []).filter((item) => getBackdropQualityScore(item) > 0);
  if (!usable.length) return null;
  return usable.sort((a, b) => getBackdropQualityScore(b) - getBackdropQualityScore(a))[0];
}

function pickSearchResult(results: TmdbSearchItem[] | undefined, year: string) {
  const usable = (results || []).filter((item) => getBackdropPath(item) || getPosterPath(item));
  if (!usable.length) return null;

  if (year) {
    const sameYear = usable.find((item) =>
      (item.release_date || item.first_air_date || "").startsWith(year),
    );
    if (sameYear) return sameYear;
  }

  return usable.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0];
}

async function getBestBackdrop(mediaType: "movie" | "tv", tmdbId: string) {
  if (!tmdbId) return "";

  const images = await tmdbApiFetch<TmdbImagesResponse>(`/${mediaType}/${tmdbId}/images`, {
    include_image_language: "null,en,ru",
  });
  const bestBackdrop = pickBestBackdrop(images?.backdrops);
  const bestBackdropPath = getBackdropPath(bestBackdrop);
  if (bestBackdropPath) return getImageUrl(bestBackdropPath);

  const details = await tmdbApiFetch<TmdbDetails>(`/${mediaType}/${tmdbId}`);
  const backdropPath = getBackdropPath(details);
  if (backdropPath) return getImageUrl(backdropPath);

  return "";
}

async function getOfficialApiBackdrop(input: {
  mediaType: "movie" | "tv";
  tmdbId: string;
  imdbId: string;
  title: string;
  originalTitle: string;
  year: string;
}) {
  if (input.tmdbId) {
    const backdrop = await getBestBackdrop(input.mediaType, input.tmdbId);
    if (backdrop) return backdrop;
  }

  if (input.imdbId) {
    const found = await tmdbApiFetch<TmdbFindResponse>(`/find/${input.imdbId}`, {
      external_source: "imdb_id",
    });
    const results = input.mediaType === "tv" ? found?.tv_results : found?.movie_results;
    const foundId = results?.[0]?.id;
    if (foundId) {
      const backdrop = await getBestBackdrop(input.mediaType, String(foundId));
      if (backdrop) return backdrop;
    }

    const fallbackBackdrop = getBackdropPath(results?.[0]);
    if (fallbackBackdrop) return getImageUrl(fallbackBackdrop);
  }

  const queries = [input.originalTitle, input.title].filter(Boolean);
  for (const query of queries) {
    const searchPath = input.mediaType === "tv" ? "/search/tv" : "/search/movie";
    const search = await tmdbApiFetch<TmdbSearchResponse>(searchPath, {
      query,
      include_adult: "false",
      year: input.mediaType === "movie" ? input.year : "",
      first_air_date_year: input.mediaType === "tv" ? input.year : "",
    });
    const selected = pickSearchResult(search?.results, input.year);

    if (selected?.id) {
      const backdrop = await getBestBackdrop(input.mediaType, String(selected.id));
      if (backdrop) return backdrop;
    }

    const fallbackBackdrop = getBackdropPath(selected);
    if (fallbackBackdrop) return getImageUrl(fallbackBackdrop);
  }

  return "";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mediaType = getMediaType(searchParams.get("type")) as "movie" | "tv";
  const fallback = cleanText(searchParams.get("fallback"));

  const input = {
    mediaType,
    tmdbId: cleanText(searchParams.get("tmdbId")),
    imdbId: cleanText(searchParams.get("imdbId")),
    title: cleanText(searchParams.get("title")),
    originalTitle: cleanText(searchParams.get("originalTitle")),
    year: cleanText(searchParams.get("year")),
  };

  const officialBackdrop = await getOfficialApiBackdrop(input);
  if (officialBackdrop) return redirectTo(officialBackdrop);

  return redirectToFallback(request, fallback);
}
