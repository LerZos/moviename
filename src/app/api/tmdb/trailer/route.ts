import { NextResponse } from "next/server";
import { IMAGE_SOURCE_LINKS } from "../../../lib/imageLinks";
import { getFallbackTrailerUrl, normalizeTrailerUrl } from "../../../lib/trailers";

type TmdbVideo = {
  key?: string;
  name?: string;
  site?: string;
  type?: string;
  official?: boolean;
  iso_639_1?: string;
  published_at?: string;
};

type TmdbVideosResponse = {
  results?: TmdbVideo[];
};

type TmdbFindResponse = {
  movie_results?: { id?: number }[];
  tv_results?: { id?: number }[];
};

type TmdbSearchResponse = {
  results?: { id?: number; title?: string; name?: string; release_date?: string; first_air_date?: string }[];
};

type TrailerTarget = {
  mediaType: "movie" | "tv";
  tmdbId: string;
};

const TMDB_API_BASE = IMAGE_SOURCE_LINKS.tmdbApiBase;
const TMDB_SITE_BASE = IMAGE_SOURCE_LINKS.tmdbSiteBase;
const PUBLIC_PAGE_REVALIDATE_SECONDS = 86400;

export const revalidate = 86400;

function cleanText(value: string | null) {
  return String(value ?? "").trim();
}

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/&quot;|&#34;/g, " ")
    .replace(/&#39;|&apos;/g, " ")
    .replace(/&amp;/g, " ")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getYear(value: string | null | undefined) {
  const match = String(value ?? "").match(/\d{4}/);
  return match?.[0] ?? "";
}

function getPreferredMediaType(type: string) {
  return type === "Сериал" ? "tv" : "movie";
}

function getAlternateMediaType(mediaType: "movie" | "tv") {
  return mediaType === "movie" ? "tv" : "movie";
}

function scoreVideo(video: TmdbVideo, title: string, originalTitle: string) {
  let score = 0;
  const name = normalize(video.name);
  const normalizedTitle = normalize(title);
  const normalizedOriginalTitle = normalize(originalTitle);

  if (video.site === "YouTube") score += 35;
  if (video.type === "Trailer") score += 35;
  if (video.official === true) score += 20;
  if (video.iso_639_1 === "ru") score += 12;
  if (video.iso_639_1 === "en") score += 8;
  if (name.includes("official") || name.includes("официаль")) score += 8;
  if (name.includes("trailer") || name.includes("трейлер")) score += 8;
  if (name.includes("teaser") || name.includes("тизер")) score -= 4;
  if (normalizedTitle && name.includes(normalizedTitle)) score += 6;
  if (normalizedOriginalTitle && name.includes(normalizedOriginalTitle)) score += 6;

  return score;
}

function getBestYoutubeTrailer(videos: TmdbVideo[], title: string, originalTitle: string) {
  return videos
    .filter((video) => video.site === "YouTube" && video.key)
    .filter((video) => video.type === "Trailer" || video.type === "Teaser")
    .map((video) => ({ video, score: scoreVideo(video, title, originalTitle) }))
    .sort((a, b) => b.score - a.score)[0]?.video;
}

function getTmdbCredentials() {
  return {
    token: process.env.TMDB_ACCESS_TOKEN?.trim() ?? "",
    apiKey: process.env.TMDB_API_KEY?.trim() ?? "",
  };
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}) {
  const { token, apiKey } = getTmdbCredentials();

  if (!token && !apiKey) {
    return null;
  }

  const url = new URL(`${TMDB_API_BASE}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  if (apiKey && !token) {
    url.searchParams.set("api_key", apiKey);
  }

  try {
    const response = await fetch(url, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
            accept: "application/json",
          }
        : { accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return null;
    }

    return response.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function publicTmdbFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(path, TMDB_SITE_BASE);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "KinoLuma trailer resolver/1.0",
      },
      next: { revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return "";
    }

    return response.text();
  } catch {
    return "";
  }
}

function addCandidate(
  candidates: Map<string, { key: string; score: number }>,
  key: string | null | undefined,
  context: string,
  title: string,
  originalTitle: string,
) {
  const normalizedUrl = normalizeTrailerUrl(key);

  if (!normalizedUrl) {
    return;
  }

  const match = normalizedUrl.match(/\/embed\/([a-zA-Z0-9_-]{6,32})/);
  const cleanKey = match?.[1] ?? "";

  if (!cleanKey) {
    return;
  }

  const normalizedContext = normalize(context);
  const normalizedTitle = normalize(title);
  const normalizedOriginalTitle = normalize(originalTitle);
  let score = 20;

  if (normalizedContext.includes("youtube")) score += 12;
  if (normalizedContext.includes("trailer") || normalizedContext.includes("трейлер")) score += 22;
  if (normalizedContext.includes("official") || normalizedContext.includes("официаль")) score += 16;
  if (normalizedContext.includes("teaser") || normalizedContext.includes("тизер")) score -= 8;
  if (normalizedTitle && normalizedContext.includes(normalizedTitle)) score += 8;
  if (normalizedOriginalTitle && normalizedContext.includes(normalizedOriginalTitle)) score += 8;

  const existing = candidates.get(cleanKey);

  if (!existing || existing.score < score) {
    candidates.set(cleanKey, { key: cleanKey, score });
  }
}

function extractYoutubeTrailerKeyFromHtml(html: string, title: string, originalTitle: string) {
  const candidates = new Map<string, { key: string; score: number }>();
  const decodedHtml = html
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'");

  const patterns = [
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,32})/gi,
    /["']key["']\s*:\s*["']([a-zA-Z0-9_-]{6,32})["']/gi,
    /data-(?:video-)?(?:id|key)=["']([a-zA-Z0-9_-]{6,32})["']/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(decodedHtml)) !== null) {
      const start = Math.max(0, match.index - 220);
      const end = Math.min(decodedHtml.length, match.index + 420);
      const context = decodedHtml.slice(start, end);
      addCandidate(candidates, match[1], context, title, originalTitle);
    }
  }

  return [...candidates.values()].sort((a, b) => b.score - a.score)[0]?.key ?? "";
}

function extractTmdbTargetsFromSearchHtml(html: string, preferredMediaType: "movie" | "tv", year: string) {
  const decodedHtml = html.replace(/&amp;/g, "&");
  const candidates: Array<{ mediaType: "movie" | "tv"; tmdbId: string; score: number }> = [];
  const pattern = /href=["']\/(movie|tv)\/(\d+)(?:-[^"']*)?["']/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(decodedHtml)) !== null) {
    const mediaType = match[1] as "movie" | "tv";
    const tmdbId = match[2];
    const start = Math.max(0, match.index - 500);
    const end = Math.min(decodedHtml.length, match.index + 500);
    const context = decodedHtml.slice(start, end);
    let score = 0;

    if (mediaType === preferredMediaType) score += 20;
    if (year && context.includes(year)) score += 15;

    candidates.push({ mediaType, tmdbId, score });
  }

  const seen = new Set<string>();

  return candidates
    .filter((candidate) => {
      const key = `${candidate.mediaType}:${candidate.tmdbId}`;

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score);
}

async function getTrailerByTmdbApi(mediaType: "movie" | "tv", tmdbId: string, title: string, originalTitle: string) {
  const languageAttempts = [
    { language: "ru-RU", include_video_language: "ru,en,null" },
    { language: "en-US", include_video_language: "en,ru,null" },
  ];

  for (const params of languageAttempts) {
    const data = await tmdbFetch<TmdbVideosResponse>(`/${mediaType}/${tmdbId}/videos`, params);
    const best = getBestYoutubeTrailer(data?.results ?? [], title, originalTitle);

    if (best?.key) {
      return normalizeTrailerUrl(best.key);
    }
  }

  return "";
}

async function getTrailerByTmdbPublicPage(mediaType: "movie" | "tv", tmdbId: string, title: string, originalTitle: string) {
  const pageAttempts = [
    `/${mediaType}/${tmdbId}/videos`,
    `/${mediaType}/${tmdbId}`,
  ];

  for (const path of pageAttempts) {
    const html = await publicTmdbFetch(path, { language: "ru-RU" });
    const key = extractYoutubeTrailerKeyFromHtml(html, title, originalTitle);

    if (key) {
      return normalizeTrailerUrl(key);
    }
  }

  return "";
}

async function getTrailerByTmdbId(mediaType: "movie" | "tv", tmdbId: string, title: string, originalTitle: string) {
  return (
    (await getTrailerByTmdbApi(mediaType, tmdbId, title, originalTitle)) ||
    (await getTrailerByTmdbPublicPage(mediaType, tmdbId, title, originalTitle))
  );
}

async function findTmdbIdByImdbId(imdbId: string) {
  const data = await tmdbFetch<TmdbFindResponse>(`/find/${imdbId}`, {
    external_source: "imdb_id",
  });
  const movieId = data?.movie_results?.[0]?.id;
  const tvId = data?.tv_results?.[0]?.id;

  if (movieId) return { mediaType: "movie" as const, tmdbId: String(movieId) };
  if (tvId) return { mediaType: "tv" as const, tmdbId: String(tvId) };

  return null;
}

async function searchTmdbIdWithApi(title: string, year: string) {
  if (!title) {
    return null;
  }

  const movie = await tmdbFetch<TmdbSearchResponse>("/search/movie", {
    query: title,
    language: "ru-RU",
    year,
  });
  const movieId = movie?.results?.[0]?.id;

  if (movieId) {
    return { mediaType: "movie" as const, tmdbId: String(movieId) };
  }

  const tv = await tmdbFetch<TmdbSearchResponse>("/search/tv", {
    query: title,
    language: "ru-RU",
    first_air_date_year: year,
  });
  const tvId = tv?.results?.[0]?.id;

  if (tvId) {
    return { mediaType: "tv" as const, tmdbId: String(tvId) };
  }

  return null;
}

async function searchTmdbIdPublic(title: string, year: string, preferredMediaType: "movie" | "tv") {
  if (!title) {
    return null;
  }

  const html = await publicTmdbFetch("/search", { query: title, language: "ru-RU" });
  const candidates = extractTmdbTargetsFromSearchHtml(html, preferredMediaType, year);
  const best = candidates[0];

  if (!best) {
    return null;
  }

  return { mediaType: best.mediaType, tmdbId: best.tmdbId };
}

async function searchTmdbId(title: string, year: string, preferredMediaType: "movie" | "tv") {
  return (await searchTmdbIdWithApi(title, year)) ?? (await searchTmdbIdPublic(title, year, preferredMediaType));
}

async function getTrailerForTarget(target: TrailerTarget, title: string, originalTitle: string) {
  return await getTrailerByTmdbId(target.mediaType, target.tmdbId, title, originalTitle);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const item = {
    slug: cleanText(searchParams.get("slug")),
    title: cleanText(searchParams.get("title")),
    originalTitle: cleanText(searchParams.get("originalTitle")),
    type: cleanText(searchParams.get("type")),
    year: cleanText(searchParams.get("year")),
    tmdbId: cleanText(searchParams.get("tmdbId")),
    imdbId: cleanText(searchParams.get("imdbId")),
    kinopoiskId: cleanText(searchParams.get("kinopoiskId")),
  };

  const fallbackTrailerUrl = getFallbackTrailerUrl(item);

  if (fallbackTrailerUrl) {
    return NextResponse.json({ embedUrl: fallbackTrailerUrl, source: "curated" });
  }

  const preferredMediaType = getPreferredMediaType(item.type);
  const targets: TrailerTarget[] = [];

  if (item.tmdbId) {
    targets.push({ mediaType: preferredMediaType, tmdbId: item.tmdbId });
    targets.push({ mediaType: getAlternateMediaType(preferredMediaType), tmdbId: item.tmdbId });
  }

  if (item.imdbId) {
    const target = await findTmdbIdByImdbId(item.imdbId);

    if (target) {
      targets.push(target);
    }
  }

  if (targets.length === 0) {
    const year = getYear(item.year);
    const target =
      (await searchTmdbId(item.originalTitle, year, preferredMediaType)) ??
      (await searchTmdbId(item.title, year, preferredMediaType));

    if (target) {
      targets.push(target);
    }
  }

  const uniqueTargets = targets.filter((target, index, source) =>
    source.findIndex((item) => item.mediaType === target.mediaType && item.tmdbId === target.tmdbId) === index,
  );

  for (const target of uniqueTargets) {
    const trailerUrl = await getTrailerForTarget(target, item.title, item.originalTitle);

    if (trailerUrl) {
      return NextResponse.json({ embedUrl: trailerUrl, source: target.mediaType === preferredMediaType ? "tmdb" : "tmdb-alt" });
    }
  }

  return NextResponse.json({ embedUrl: "", source: "missing" }, { status: 404 });
}
