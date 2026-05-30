import { revalidatePath } from "next/cache";

import type { Movie } from "../../../../../data/movies";
import { assertAdminSecret, getAdminUserFromRequest } from "../../../../../lib/import/adminAuth";
import {
  fetchVibixByImdbId,
  fetchVibixByKinopoiskId,
  unwrapVibixVideo,
  type VibixVideo,
} from "../../../../../lib/import/vibixApi";
import {
  getMovieOverrideData,
  getPublicMovies,
  saveMovieOverride,
  type MovieOverrideData,
} from "../../../../../lib/movies/movieOverrides";
import {
  buildAutoPlayers,
  parsePlayerArray,
  type KinoLumaPlayer,
} from "../../../../../lib/players";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SyncMode = "missing" | "refresh";

type SyncRequestBody = {
  mode?: SyncMode;
  limit?: number | string;
  makePrimary?: boolean;
};

type SyncMovieResult = {
  slug: string;
  title: string;
  status: "updated" | "skipped" | "not_found" | "failed";
  reason?: string;
  kinopoiskId?: number | null;
  imdbId?: string | null;
  vibixVideoId?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function cleanString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cleanNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== "string") return null;

  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function readLimit(value: unknown) {
  const parsed = cleanNumber(value);
  if (!parsed || parsed <= 0) return 250;
  return Math.min(parsed, 1000);
}

function isAnimeMovie(movie: Movie) {
  const genreText = Array.isArray(movie.genres) ? movie.genres.join(" ") : "";
  const text = `${movie.type} ${genreText}`.toLowerCase().replaceAll("ё", "е");
  return /(^|[\s,;|/])аниме($|[\s,;|/])|(^|[\s,;|/])anime($|[\s,;|/])/i.test(text);
}

function getVibixKinopoiskId(video: VibixVideo, movie: Movie) {
  return cleanNumber(video.kp_id) ?? cleanNumber(video.kinopoisk_id) ?? movie.kinopoiskId ?? null;
}

function getVibixImdbId(video: VibixVideo, movie: Movie) {
  return cleanString(video.imdb_id) || cleanString(movie.imdbId) || null;
}

function getVibixVideoId(video: VibixVideo) {
  return cleanString(video.id);
}

function hasVibixIframe(video: VibixVideo | null | undefined): video is VibixVideo {
  return Boolean(video && cleanString(video.iframe_url));
}

function addVibixFrameParams(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";

  const params = ["sharing=false", "episodesOpen=false"];
  const missingParams = params.filter(
    (param) => !trimmed.includes(`${param.split("=")[0]}=`),
  );

  if (!missingParams.length) return trimmed;
  return `${trimmed}${trimmed.includes("?") ? "&" : "?"}${missingParams.join("&")}`;
}

function isVibixPlayer(player: KinoLumaPlayer) {
  const record = asRecord(player);
  const type = cleanString(record.type).toLowerCase();
  const provider = cleanString(record.provider).toLowerCase();
  const embedUrl = cleanString(player.embedUrl).toLowerCase();

  return (
    provider === "vibix" ||
    type === "vibix" ||
    type === "vibix-iframe" ||
    embedUrl.includes("vibix")
  );
}

function isCollapsePlayer(player: KinoLumaPlayer) {
  const record = asRecord(player);
  const type = cleanString(record.type || record.provider).toLowerCase();
  const embedUrl = cleanString(player.embedUrl).toLowerCase();

  return type === "collapse" || type === "collaps" || embedUrl.includes("api.ortified.ws/embed");
}

function getPlayerKey(player: KinoLumaPlayer) {
  const record = asRecord(player);
  const type = cleanString(record.type || record.provider || "iframe").toLowerCase();
  const embedUrl = cleanString(player.embedUrl);
  const contentKind = cleanString(record.contentKind || record.contentType);
  const contentId = cleanString(record.contentId || record.rendexVideoId);

  if (type === "rendex" && contentId) return `rendex:${contentId}`;
  if ((type === "collapse" || type === "collaps") && contentId) {
    return `collapse:${contentKind}:${contentId}`;
  }
  if (isVibixPlayer(player) && embedUrl) return `vibix:${embedUrl}`;

  return embedUrl ? `${type}:${embedUrl}` : `${type}:${player.id}`;
}

function dedupePlayers(players: KinoLumaPlayer[]) {
  const seen = new Set<string>();
  const result: KinoLumaPlayer[] = [];

  for (const player of players) {
    const key = getPlayerKey(player);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(player);
  }

  return result;
}

function normalizePlayerNames(players: KinoLumaPlayer[]) {
  return players.map((player, index) => ({
    ...player,
    name: index === 0 ? "Основной" : `Запасной ${index}`,
  }));
}

function buildVibixPlayer(movie: Movie, video: VibixVideo): KinoLumaPlayer | null {
  const iframeUrl = addVibixFrameParams(cleanString(video.iframe_url));
  if (!iframeUrl) return null;

  const kpId = getVibixKinopoiskId(video, movie);
  const imdbId = getVibixImdbId(video, movie);
  const videoId = getVibixVideoId(video);
  const rawType = cleanString(video.type).toLowerCase();

  return {
    id: `vibix-${videoId || kpId || imdbId || movie.slug}`,
    name: "Vibix",
    type: "vibix-iframe",
    provider: "vibix",
    embedUrl: iframeUrl,
    contentKind: rawType === "serial" || rawType === "series" ? "series" : "movie",
    contentType: rawType === "serial" || rawType === "series" ? "series" : "movie",
    contentId: videoId || cleanString(kpId) || cleanString(imdbId),
    kinopoiskId: kpId,
    imdbId,
  } as KinoLumaPlayer;
}

function buildBasePlayers(movie: Movie) {
  const generatedPlayers = buildAutoPlayers({
    slug: movie.slug,
    kinopoiskId: movie.kinopoiskId,
    imdbId: movie.imdbId,
    movieType: movie.type,
    genres: movie.genres,
  });
  const currentPlayers = parsePlayerArray(movie.players || []);

  return dedupePlayers([...generatedPlayers, ...currentPlayers]);
}

function insertVibixPlayer(
  basePlayers: KinoLumaPlayer[],
  vibixPlayer: KinoLumaPlayer,
  makePrimary: boolean,
) {
  const withoutOldVibix = basePlayers.filter((player) => !isVibixPlayer(player));

  if (makePrimary) {
    return normalizePlayerNames(dedupePlayers([vibixPlayer, ...withoutOldVibix]));
  }

  const collapseIndex = withoutOldVibix.findIndex(isCollapsePlayer);

  if (collapseIndex >= 0) {
    return normalizePlayerNames(
      dedupePlayers([
        ...withoutOldVibix.slice(0, collapseIndex + 1),
        vibixPlayer,
        ...withoutOldVibix.slice(collapseIndex + 1),
      ]),
    );
  }

  return normalizePlayerNames(dedupePlayers([...withoutOldVibix, vibixPlayer]));
}

async function findVibixVideo(movie: Movie) {
  const errors: string[] = [];

  if (movie.kinopoiskId) {
    try {
      const video = unwrapVibixVideo(await fetchVibixByKinopoiskId(movie.kinopoiskId));
      if (hasVibixIframe(video)) return video;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (movie.imdbId) {
    try {
      const video = unwrapVibixVideo(await fetchVibixByImdbId(movie.imdbId));
      if (hasVibixIframe(video)) return video;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    video: null,
    error: errors.length ? errors.slice(0, 2).join("; ") : "Vibix не вернул iframe_url",
  };
}

function createResult(
  movie: Movie,
  status: SyncMovieResult["status"],
  values: Omit<SyncMovieResult, "slug" | "title" | "status"> = {},
): SyncMovieResult {
  return {
    slug: movie.slug,
    title: movie.title,
    status,
    kinopoiskId: movie.kinopoiskId ?? null,
    imdbId: movie.imdbId ?? null,
    ...values,
  };
}

async function getUpdatedBy(request: Request) {
  const adminUser = await getAdminUserFromRequest(request);

  if (adminUser) {
    return { updatedBy: adminUser.email, authError: null as Response | null };
  }

  const authError = assertAdminSecret(request);
  if (authError) return { updatedBy: "", authError };

  return { updatedBy: "admin-secret", authError: null as Response | null };
}

export async function POST(request: Request) {
  const { updatedBy, authError } = await getUpdatedBy(request);
  if (authError) return authError;

  try {
    const body = (await request.json().catch(() => ({}))) as SyncRequestBody;
    const mode: SyncMode = body.mode === "refresh" ? "refresh" : "missing";
    const limit = readLimit(body.limit);
    const makePrimary = body.makePrimary === true;
    const movies = (await getPublicMovies()).slice(0, limit);
    const results: SyncMovieResult[] = [];

    for (const movie of movies) {
      try {
        if (isAnimeMovie(movie)) {
          results.push(createResult(movie, "skipped", { reason: "Аниме временно пропускаем" }));
          continue;
        }

        if (!movie.kinopoiskId && !movie.imdbId) {
          results.push(createResult(movie, "skipped", { reason: "Нет kinopoiskId или imdbId" }));
          continue;
        }

        const basePlayers = buildBasePlayers(movie);

        if (mode === "missing" && basePlayers.some(isVibixPlayer)) {
          results.push(createResult(movie, "skipped", { reason: "Vibix уже есть" }));
          continue;
        }

        const lookup = await findVibixVideo(movie);
        const video = lookup && "video" in lookup ? lookup.video : lookup;
        const lookupError = lookup && "error" in lookup ? lookup.error : "Vibix не найден";

        if (!video) {
          results.push(createResult(movie, "not_found", { reason: lookupError }));
          continue;
        }

        const vibixPlayer = buildVibixPlayer(movie, video);
        if (!vibixPlayer) {
          results.push(createResult(movie, "not_found", { reason: "Vibix найден, но iframe_url пустой" }));
          continue;
        }

        const overrideData = ((await getMovieOverrideData(movie.slug)) || {}) as MovieOverrideData;
        const players = insertVibixPlayer(basePlayers, vibixPlayer, makePrimary);

        await saveMovieOverride(
          movie.slug,
          {
            ...overrideData,
            players,
          },
          updatedBy,
        );

        results.push(
          createResult(movie, "updated", {
            reason: makePrimary ? "Vibix поставлен первым" : "Vibix добавлен к плеерам",
            vibixVideoId: getVibixVideoId(video) || null,
          }),
        );
      } catch (error) {
        results.push(
          createResult(movie, "failed", {
            reason: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }

    const updatedCount = results.filter((result) => result.status === "updated").length;
    const skippedCount = results.filter((result) => result.status === "skipped").length;
    const notFoundCount = results.filter((result) => result.status === "not_found").length;
    const failedCount = results.filter((result) => result.status === "failed").length;

    revalidatePath("/");
    revalidatePath("/movie/[slug]", "page");
    revalidatePath("/catalog/[category]", "page");

    return Response.json({
      ok: true,
      result: {
        mode,
        makePrimary,
        scannedCount: movies.length,
        updatedCount,
        skippedCount,
        notFoundCount,
        failedCount,
        results: results.slice(0, 80),
      },
      message: `Vibix: обновлено ${updatedCount}, пропущено ${skippedCount}, не найдено ${notFoundCount}, ошибок ${failedCount}`,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown Vibix site sync error",
      },
      { status: 500 },
    );
  }
}
