import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type VibixVideo = {
  id?: number | string | null;
  iframe_video_id?: number | string | null;
  iframeVideoId?: number | string | null;
  rendex_video_id?: number | string | null;
  rendexVideoId?: number | string | null;
  video_id?: number | string | null;
  videoId?: number | string | null;
  player_id?: number | string | null;
  playerId?: number | string | null;
  embed_code?: string | null;
  embedCode?: string | null;
  iframe_url?: string | null;
  iframeUrl?: string | null;
  kp_id?: number | string | null;
  kinopoisk_id?: number | string | null;
  imdb_id?: string | null;
  type?: string | null;
};

function cleanText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cleanNumberId(value: unknown) {
  const text = cleanText(value);
  if (!text) return "";

  const match = text.match(/\d+/);
  if (!match) return "";

  const parsed = Number(match[0]);
  if (!Number.isFinite(parsed)) return "";

  return String(Math.trunc(parsed));
}

function normalizeImdbId(value: unknown) {
  const text = cleanText(value).replace(/^imdb:/i, "");
  if (!text) return "";

  const match = text.match(/tt\d+|\d+/i);
  if (!match) return "";

  const id = match[0].toLowerCase();
  return id.startsWith("tt") ? id : `tt${id}`;
}

function getSafeApiBaseUrl() {
  const rawUrl = cleanText(process.env.VIBIX_API_URL) || "https://vibix.org";
  return rawUrl.replace(/\/+$/, "");
}

function getPublisherId() {
  return (
    cleanNumberId(process.env.RENDEX_PUBLISHER_ID) ||
    cleanNumberId(process.env.VIBIX_PUBLISHER_ID) ||
    "678053396"
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function unwrapVideoPayload(payload: unknown): VibixVideo | null {
  const record = asRecord(payload);
  const data = record.data;

  if (Array.isArray(data)) {
    const firstItem = data.find((item) => getRendexDataId(asRecord(item)));
    return firstItem ? (asRecord(firstItem) as VibixVideo) : null;
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    return asRecord(data) as VibixVideo;
  }

  return Object.keys(record).length ? (record as VibixVideo) : null;
}

function getHtmlDataAttribute(source: unknown, attributeName: string) {
  const text = cleanText(source);
  if (!text) return "";

  const escapedAttribute = attributeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `\\b${escapedAttribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = text.match(pattern);

  return cleanText(match?.[1] || match?.[2] || match?.[3]);
}

function getRendexDataId(video: VibixVideo | Record<string, unknown> | null) {
  if (!video) return "";

  const record = asRecord(video);
  const candidates = [
    record.iframe_video_id,
    record.iframeVideoId,
    record.rendex_video_id,
    record.rendexVideoId,
    record.video_id,
    record.videoId,
    record.player_id,
    record.playerId,
    getHtmlDataAttribute(record.embed_code || record.embedCode, "data-id"),
    record.id,
  ];

  for (const candidate of candidates) {
    const id = cleanNumberId(candidate);
    if (id) return id;
  }

  return "";
}

function normalizeRendexContentType(
  value: unknown,
  fallbackMovieType: unknown,
) {
  const type =
    `${cleanText(value)} ${cleanText(fallbackMovieType)}`.toLowerCase();

  if (
    type.includes("serial") ||
    type.includes("series") ||
    type.includes("tv") ||
    type.includes("сериал")
  ) {
    return "series";
  }

  return "movie";
}

async function fetchVibixVideo(path: string) {
  const token = cleanText(
    process.env.VIBIX_API_TOKEN || process.env.RENDEX_API_TOKEN,
  );

  if (!token) {
    return null;
  }

  const response = await fetch(`${getSafeApiBaseUrl()}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as unknown;
  return unwrapVideoPayload(payload);
}

function buildRendexPlayer(
  video: VibixVideo | null,
  fallbackMovieType: unknown,
) {
  const contentId = getRendexDataId(video);
  if (!contentId) return null;

  return {
    id: `rendex-${contentId}`,
    name: "Запасной 1",
    type: "rendex",
    provider: "rendex",
    publisherId: getPublisherId(),
    contentType: normalizeRendexContentType(video?.type, fallbackMovieType),
    contentId,
    rendexVideoId: contentId,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kinopoiskId = cleanNumberId(url.searchParams.get("kpId"));
  const imdbId = normalizeImdbId(url.searchParams.get("imdbId"));
  const movieType = cleanText(url.searchParams.get("movieType"));

  if (!process.env.VIBIX_API_TOKEN && !process.env.RENDEX_API_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "VIBIX_API_TOKEN не задан на сервере" },
      { status: 503 },
    );
  }

  if (!kinopoiskId && !imdbId) {
    return NextResponse.json(
      { ok: false, error: "Нет kinopoiskId или imdbId" },
      { status: 400 },
    );
  }

  const byKinopoisk = kinopoiskId
    ? await fetchVibixVideo(`/api/v1/publisher/videos/kp/${kinopoiskId}`)
    : null;
  const kinopoiskPlayer = buildRendexPlayer(byKinopoisk, movieType);

  if (kinopoiskPlayer) {
    return NextResponse.json({ ok: true, player: kinopoiskPlayer });
  }

  const byImdb = imdbId
    ? await fetchVibixVideo(`/api/v1/publisher/videos/imdb/${imdbId}`)
    : null;
  const imdbPlayer = buildRendexPlayer(byImdb, movieType);

  if (imdbPlayer) {
    return NextResponse.json({ ok: true, player: imdbPlayer });
  }

  return NextResponse.json({ ok: true, player: null });
}
