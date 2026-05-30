import { NextResponse } from "next/server";

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_SITE_BASE = "https://www.themoviedb.org";
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

function redirectToFallback(request: Request) {
  return redirectTo(new URL(FALLBACK_POSTER, request.url));
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

async function fetchTmdbHtml(url: URL | string) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36 KinoLumaPosterBot/1.0",
      },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });

    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  }
}

type TmdbDetails = { id?: number; poster_path?: string | null };
type TmdbFindResponse = { movie_results?: TmdbDetails[]; tv_results?: TmdbDetails[] };
type TmdbSearchItem = {
  id?: number;
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
  iso_639_1?: string | null;
  vote_average?: number;
  vote_count?: number;
  aspect_ratio?: number;
};
type TmdbImagesResponse = { posters?: TmdbImageItem[] };

function getPosterPath(item: TmdbDetails | TmdbSearchItem | TmdbImageItem | null | undefined) {
  const posterPath = item?.poster_path || item?.file_path;
  return posterPath && posterPath.startsWith("/") ? posterPath : "";
}

function getImageUrlFromPosterPath(path: string) {
  return path ? `${TMDB_IMAGE_BASE}${path}` : "";
}

function getPosterQualityScore(item: TmdbImageItem) {
  const width = item.width || 0;
  const height = item.height || 0;
  const voteAverage = item.vote_average || 0;
  const voteCount = item.vote_count || 0;
  const language = item.iso_639_1 || "null";
  const aspectRatio = item.aspect_ratio || (height ? width / height : 0);

  if (!getPosterPath(item)) return -1;

  // Постеры обычно около 0.66. Слишком широкие/узкие изображения часто оказываются мусором.
  const aspectPenalty = aspectRatio >= 0.58 && aspectRatio <= 0.76 ? 0 : -900;

  // Приоритет — реальное качество файла. Русские постеры иногда красивые, но часто маленькие сканы.
  const languageBonus = language === "null" ? 260 : language === "en" ? 220 : language === "ru" ? 90 : 20;
  const sizeScore = width * 1.4 + height;
  const voteScore = voteAverage * 35 + Math.min(voteCount, 80) * 8;

  return sizeScore + voteScore + languageBonus + aspectPenalty;
}

function pickBestPosterImage(posters: TmdbImageItem[] | undefined) {
  const usable = (posters || []).filter((item) => getPosterQualityScore(item) > 0);
  if (!usable.length) return null;
  return usable.sort((a, b) => getPosterQualityScore(b) - getPosterQualityScore(a))[0];
}

function pickSearchResult(results: TmdbSearchItem[] | undefined, year: string) {
  const withPoster = (results || []).filter((item) => getPosterPath(item));
  if (!withPoster.length) return null;

  if (year) {
    const sameYear = withPoster.find((item) =>
      (item.release_date || item.first_air_date || "").startsWith(year),
    );
    if (sameYear) return sameYear;
  }

  return withPoster.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0];
}

function decodeHtmlEntity(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#x2F;", "/")
    .replaceAll("&#47;", "/")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function upgradeTmdbImageSize(url: string) {
  return url.replace(/\/t\/p\/[^/]+\//i, "/t/p/original/");
}

function normalizeTmdbImageUrl(value: string) {
  const decoded = decodeHtmlEntity(value).trim();

  if (!decoded) return "";

  const normalized = decoded.startsWith("//") ? `https:${decoded}` : decoded;
  const absolute = normalized.startsWith("/t/p/")
    ? `https://media.themoviedb.org${normalized}`
    : normalized;

  if (
    /^https:\/\/(media|image)\.themoviedb\.org\/t\/p\//i.test(absolute) &&
    /\.(jpg|jpeg|png|webp)(\?|$)/i.test(absolute)
  ) {
    return upgradeTmdbImageSize(absolute);
  }

  return "";
}

function extractPosterUrlFromHtml(html: string) {
  if (!html) return "";

  const metaPatterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i,
  ];

  for (const pattern of metaPatterns) {
    const match = html.match(pattern);
    const url = normalizeTmdbImageUrl(match?.[1] || "");
    if (url) return url;
  }

  const directImageMatch = html.match(
    /https:\/\/(?:media|image)\.themoviedb\.org\/t\/p\/[A-Za-z0-9_./-]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s<>]*)?/i,
  );
  const directImageUrl = normalizeTmdbImageUrl(directImageMatch?.[0] || "");
  if (directImageUrl) return directImageUrl;

  const srcsetMatch = html.match(
    /(?:src|data-src|data-lazy-src|srcset)=["']([^"']*\/(?:t\/p)\/[^"']+?\.(?:jpg|jpeg|png|webp)[^"']*)["']/i,
  );
  const srcsetValue = srcsetMatch?.[1]?.split(",")?.[0]?.trim()?.split(" ")?.[0] || "";
  return normalizeTmdbImageUrl(srcsetValue);
}

function extractTmdbDetailsId(html: string, mediaType: "movie" | "tv", year: string) {
  if (!html) return "";

  const linkPattern = new RegExp(`href=["']/${mediaType}/(\\d+)(?:-[^"']*)?["']`, "gi");
  const matches = [...html.matchAll(linkPattern)];

  if (!matches.length) return "";

  if (year) {
    const withYearPattern = new RegExp(
      `href=["']/${mediaType}/(\\d+)(?:-[^"']*)?["'][\\s\\S]{0,700}?${year}`,
      "i",
    );
    const yearMatch = html.match(withYearPattern);
    if (yearMatch?.[1]) return yearMatch[1];
  }

  return matches[0]?.[1] || "";
}

async function getOfficialBestPoster(mediaType: "movie" | "tv", tmdbId: string) {
  if (!tmdbId) return "";

  const images = await tmdbApiFetch<TmdbImagesResponse>(`/${mediaType}/${tmdbId}/images`, {
    include_image_language: "null,en,ru",
  });
  const bestPoster = pickBestPosterImage(images?.posters);
  const bestPosterPath = getPosterPath(bestPoster);
  if (bestPosterPath) return getImageUrlFromPosterPath(bestPosterPath);

  const details = await tmdbApiFetch<TmdbDetails>(`/${mediaType}/${tmdbId}`);
  const posterPath = getPosterPath(details);
  if (posterPath) return getImageUrlFromPosterPath(posterPath);

  return "";
}

async function getPublicDetailsPoster(mediaType: "movie" | "tv", tmdbId: string) {
  if (!tmdbId) return "";

  const detailsUrl = new URL(`/${mediaType}/${tmdbId}`, TMDB_SITE_BASE);
  detailsUrl.searchParams.set("language", "ru-RU");

  const html = await fetchTmdbHtml(detailsUrl);
  return extractPosterUrlFromHtml(html);
}

async function getPublicFindPoster(imdbId: string, mediaType: "movie" | "tv", year: string) {
  if (!imdbId) return "";

  const findUrl = new URL(`/find/${imdbId}`, TMDB_SITE_BASE);
  findUrl.searchParams.set("external_source", "imdb_id");
  findUrl.searchParams.set("language", "ru-RU");

  const html = await fetchTmdbHtml(findUrl);
  const posterFromFindPage = extractPosterUrlFromHtml(html);
  if (posterFromFindPage) return posterFromFindPage;

  const tmdbId = extractTmdbDetailsId(html, mediaType, year);
  return getPublicDetailsPoster(mediaType, tmdbId);
}

async function getPublicSearchPoster(query: string, mediaType: "movie" | "tv", year: string) {
  if (!query) return "";

  const searchUrl = new URL("/search", TMDB_SITE_BASE);
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("language", "ru-RU");

  const html = await fetchTmdbHtml(searchUrl);
  const posterFromSearchPage = extractPosterUrlFromHtml(html);
  if (posterFromSearchPage) return posterFromSearchPage;

  const tmdbId = extractTmdbDetailsId(html, mediaType, year);
  return getPublicDetailsPoster(mediaType, tmdbId);
}

async function getOfficialApiPoster(input: {
  mediaType: "movie" | "tv";
  tmdbId: string;
  imdbId: string;
  title: string;
  originalTitle: string;
  year: string;
}) {
  if (input.tmdbId) {
    const bestPoster = await getOfficialBestPoster(input.mediaType, input.tmdbId);
    if (bestPoster) return bestPoster;
  }

  if (input.imdbId) {
    const found = await tmdbApiFetch<TmdbFindResponse>(`/find/${input.imdbId}`, {
      external_source: "imdb_id",
    });
    const results = input.mediaType === "tv" ? found?.tv_results : found?.movie_results;
    const foundId = results?.[0]?.id;
    if (foundId) {
      const bestPoster = await getOfficialBestPoster(input.mediaType, String(foundId));
      if (bestPoster) return bestPoster;
    }

    const posterPath = getPosterPath(results?.[0]);
    if (posterPath) return getImageUrlFromPosterPath(posterPath);
  }

  const query = input.originalTitle || input.title;
  if (query) {
    const searchPath = input.mediaType === "tv" ? "/search/tv" : "/search/movie";
    const search = await tmdbApiFetch<TmdbSearchResponse>(searchPath, {
      query,
      include_adult: "false",
      year: input.mediaType === "movie" ? input.year : "",
      first_air_date_year: input.mediaType === "tv" ? input.year : "",
    });
    const selected = pickSearchResult(search?.results, input.year);
    if (selected?.id) {
      const bestPoster = await getOfficialBestPoster(input.mediaType, String(selected.id));
      if (bestPoster) return bestPoster;
    }

    const posterPath = getPosterPath(selected);
    if (posterPath) return getImageUrlFromPosterPath(posterPath);
  }

  return "";
}

async function getPublicTmdbPoster(input: {
  mediaType: "movie" | "tv";
  tmdbId: string;
  imdbId: string;
  title: string;
  originalTitle: string;
  year: string;
}) {
  if (input.tmdbId) {
    const posterUrl = await getPublicDetailsPoster(input.mediaType, input.tmdbId);
    if (posterUrl) return posterUrl;
  }

  if (input.imdbId) {
    const posterUrl = await getPublicFindPoster(input.imdbId, input.mediaType, input.year);
    if (posterUrl) return posterUrl;
  }

  const queries = [input.originalTitle, input.title].filter(Boolean);
  for (const query of queries) {
    const posterUrl = await getPublicSearchPoster(query, input.mediaType, input.year);
    if (posterUrl) return posterUrl;
  }

  return "";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mediaType = getMediaType(searchParams.get("type")) as "movie" | "tv";
  const input = {
    mediaType,
    tmdbId: cleanText(searchParams.get("tmdbId")),
    imdbId: cleanText(searchParams.get("imdbId")),
    title: cleanText(searchParams.get("title")),
    originalTitle: cleanText(searchParams.get("originalTitle")),
    year: cleanText(searchParams.get("year")),
  };

  const officialPoster = await getOfficialApiPoster(input);
  if (officialPoster) return redirectTo(officialPoster);

  const publicPoster = await getPublicTmdbPoster(input);
  if (publicPoster) return redirectTo(publicPoster);

  return redirectToFallback(request);
}
