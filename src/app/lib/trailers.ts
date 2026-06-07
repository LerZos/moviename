const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "www.youtube.com",
  "youtu.be",
]);

type TrailerLookupItem = {
  slug?: string | null;
  title?: string | null;
  originalTitle?: string | null;
  type?: string | null;
  year?: string | number | null;
  trailerUrl?: string | null;
  tmdbId?: number | string | null;
  imdbId?: string | null;
  kinopoiskId?: number | string | null;
};

const CURATED_TRAILER_KEYS: Record<string, string> = {
  // Disney / Walt Disney Animation Studios
  "slug:zootopia-2-2025": "5AwtptT8X8k",
  "tmdb:1084242": "5AwtptT8X8k",
  "imdb:tt26443597": "5AwtptT8X8k",
  "title:zootopia 2:2025": "5AwtptT8X8k",
  "title:зверополис 2:2025": "5AwtptT8X8k",
  "slug:zootopia": "jWM0ct-OLsM",
  "title:zootopia:2016": "jWM0ct-OLsM",
  "title:зверополис:2016": "jWM0ct-OLsM",

  // DreamWorks / Universal
  "slug:puss-in-boots-the-last-wish": "xgZLXyqbYOc",
  "slug:kot-v-sapogah-2-poslednee-zhelanie-2022": "xgZLXyqbYOc",
  "tmdb:315162": "xgZLXyqbYOc",
  "imdb:tt3915174": "xgZLXyqbYOc",
  "title:puss in boots the last wish:2022": "xgZLXyqbYOc",
  "title:puss in boots: the last wish:2022": "xgZLXyqbYOc",
  "title:кот в сапогах 2 последнее желание:2022": "xgZLXyqbYOc",
  "title:кот в сапогах 2: последнее желание:2022": "xgZLXyqbYOc",
  "slug:puss-in-boots-2011": "Znuq-daWfLE",
  "tmdb:417859": "Znuq-daWfLE",
  "imdb:tt0448694": "Znuq-daWfLE",
  "title:puss in boots:2011": "Znuq-daWfLE",
  "title:кот в сапогах:2011": "Znuq-daWfLE",
};

function isYoutubeHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return YOUTUBE_HOSTS.has(hostname.toLowerCase()) || host === "youtube.com" || host === "youtu.be";
}

function cleanYoutubeId(value: string | null | undefined) {
  const id = String(value ?? "").trim();

  if (!/^[a-zA-Z0-9_-]{6,32}$/.test(id)) {
    return "";
  }

  return id;
}

function normalizeLookupText(value: string | number | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getYear(value: string | number | null | undefined) {
  const match = String(value ?? "").match(/\d{4}/);
  return match?.[0] ?? "";
}

function parseYoutubeStartSeconds(value: string | null | undefined) {
  const rawValue = String(value ?? "").trim().toLowerCase();

  if (!rawValue) return "";

  if (/^\d+$/.test(rawValue)) return rawValue;

  const match = rawValue.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);

  if (!match) return "";

  const hours = Number.parseInt(match[1] || "0", 10);
  const minutes = Number.parseInt(match[2] || "0", 10);
  const seconds = Number.parseInt(match[3] || "0", 10);
  const total = hours * 3600 + minutes * 60 + seconds;

  return total > 0 ? String(total) : "";
}

function buildYoutubeEmbedUrl(id: string | null | undefined, sourceUrl?: URL) {
  const videoId = cleanYoutubeId(id);

  if (!videoId) return "";

  const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
  const start = parseYoutubeStartSeconds(
    sourceUrl?.searchParams.get("start") ?? sourceUrl?.searchParams.get("t"),
  );

  embedUrl.searchParams.set("rel", "0");
  embedUrl.searchParams.set("modestbranding", "1");

  if (start) {
    embedUrl.searchParams.set("start", start);
  }

  return embedUrl.toString();
}

function getCuratedTrailerKey(item: TrailerLookupItem) {
  const slug = normalizeLookupText(item.slug);
  const year = getYear(item.year);
  const tmdbId = String(item.tmdbId ?? "").trim();
  const imdbId = String(item.imdbId ?? "").trim().toLowerCase();
  const kinopoiskId = String(item.kinopoiskId ?? "").trim();
  const title = normalizeLookupText(item.title);
  const originalTitle = normalizeLookupText(item.originalTitle);

  const lookupKeys = [
    slug && `slug:${slug}`,
    tmdbId && `tmdb:${tmdbId}`,
    imdbId && `imdb:${imdbId}`,
    kinopoiskId && `kp:${kinopoiskId}`,
    title && year && `title:${title}:${year}`,
    originalTitle && year && `title:${originalTitle}:${year}`,
  ].filter(Boolean) as string[];

  for (const lookupKey of lookupKeys) {
    const trailerKey = CURATED_TRAILER_KEYS[lookupKey];

    if (trailerKey) {
      return trailerKey;
    }
  }

  return "";
}

export function normalizeTrailerUrl(value: string | null | undefined) {
  const rawUrl = String(value ?? "").trim();

  if (!rawUrl) return "";

  if (/^[a-zA-Z0-9_-]{11}$/.test(rawUrl)) {
    return buildYoutubeEmbedUrl(rawUrl);
  }

  const urlWithProtocol = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;

  try {
    const url = new URL(urlWithProtocol);
    const host = url.hostname.toLowerCase();

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }

    if (isYoutubeHost(host)) {
      const normalizedHost = host.replace(/^www\./, "");

      if (normalizedHost === "youtu.be") {
        return buildYoutubeEmbedUrl(url.pathname.split("/").filter(Boolean)[0], url);
      }

      if (url.pathname.startsWith("/embed/")) {
        return buildYoutubeEmbedUrl(url.pathname.split("/").filter(Boolean)[1], url);
      }

      if (url.pathname.startsWith("/watch")) {
        return buildYoutubeEmbedUrl(url.searchParams.get("v"), url);
      }

      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/live/")) {
        return buildYoutubeEmbedUrl(url.pathname.split("/").filter(Boolean)[1], url);
      }
    }

    if (url.protocol === "http:" && url.hostname === "play.poiskkino.dev") {
      url.protocol = "https:";
    }

    return url.toString();
  } catch {
    return "";
  }
}

export function getFallbackTrailerUrl(item: TrailerLookupItem) {
  return buildYoutubeEmbedUrl(getCuratedTrailerKey(item));
}

export function getResolvedTrailerUrl(item: TrailerLookupItem) {
  return normalizeTrailerUrl(item.trailerUrl) || getFallbackTrailerUrl(item);
}

export function hasValidTrailerUrl(value: string | null | undefined) {
  return normalizeTrailerUrl(value).length > 0;
}

export function canResolveTrailerUrl(item: TrailerLookupItem) {
  if (getResolvedTrailerUrl(item)) {
    return true;
  }

  return Boolean(item.tmdbId || item.imdbId || (item.title && item.year));
}

export function buildTrailerLookupApiUrl(item: TrailerLookupItem) {
  const params = new URLSearchParams();

  if (item.slug) params.set("slug", item.slug);
  if (item.tmdbId) params.set("tmdbId", String(item.tmdbId));
  if (item.imdbId) params.set("imdbId", String(item.imdbId));
  if (item.kinopoiskId) params.set("kinopoiskId", String(item.kinopoiskId));
  if (item.title) params.set("title", item.title);
  if (item.originalTitle) params.set("originalTitle", item.originalTitle);
  if (item.type) params.set("type", item.type);
  if (item.year) params.set("year", String(item.year));

  const query = params.toString();

  return query ? `/api/tmdb/trailer?${query}` : "";
}

export async function resolveTrailerUrl(item: TrailerLookupItem) {
  const staticTrailerUrl = getResolvedTrailerUrl(item);

  if (staticTrailerUrl) {
    return staticTrailerUrl;
  }

  const apiUrl = buildTrailerLookupApiUrl(item);

  if (!apiUrl) {
    return "";
  }

  try {
    const response = await fetch(apiUrl, { cache: "force-cache" });

    if (!response.ok) {
      return "";
    }

    const data = (await response.json()) as { embedUrl?: string; url?: string; key?: string };

    return normalizeTrailerUrl(data.embedUrl || data.url || data.key || "");
  } catch {
    return "";
  }
}
