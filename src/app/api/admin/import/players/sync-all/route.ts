import { revalidatePath } from "next/cache";

import type { Movie } from "../../../../../data/movies";
import {
  assertAdminSecret,
  getAdminUserFromRequest,
} from "../../../../../lib/import/adminAuth";
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
};

type SyncMovieResult = {
  slug: string;
  title: string;
  status: "updated" | "skipped" | "partial" | "failed";
  reason?: string;
  playersCount?: number;
  hasCollapse?: boolean;
  hasVibix?: boolean;
  hasFactorios?: boolean;
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
  if (!parsed || parsed <= 0) return 1000;
  return Math.min(parsed, 2000);
}

function normalizeText(value: unknown) {
  return cleanString(value).toLowerCase().replaceAll("ё", "е");
}

function isAnimeMovie(movie: Movie) {
  const genres = Array.isArray(movie.genres) ? movie.genres.join(" ") : "";
  const text = normalizeText(`${movie.type} ${genres}`);

  // Пропускаем только аниме. Мультфильмы, сериалы и документалки должны
  // получать те же 3 плеера, что и обычные фильмы.
  return /(^|[\s,;|/])аниме($|[\s,;|/])|(^|[\s,;|/])anime($|[\s,;|/])/i.test(text);
}

function getContentGroup(movie: Movie) {
  const text = normalizeText(`${movie.type} ${(movie.genres || []).join(" ")}`);

  if (text.includes("сериал") || text.includes("serial") || text.includes("series")) {
    return "Сериал";
  }

  if (text.includes("мульт") || text.includes("cartoon") || text.includes("animation")) {
    return "Мультфильм";
  }

  if (text.includes("документ") || text.includes("documentary")) {
    return "Документальный";
  }

  return "Фильм";
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

function hasVibixIframe(video: VibixVideo | null) {
  return Boolean(cleanString(video?.iframe_url));
}

function addFrameParams(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";

  const params = ["sharing=false", "episodesOpen=false"];
  const missingParams = params.filter(
    (param) => !trimmed.includes(`${param.split("=")[0]}=`),
  );

  if (!missingParams.length) return trimmed;
  return `${trimmed}${trimmed.includes("?") ? "&" : "?"}${missingParams.join("&")}`;
}

function isCollapsePlayer(player: KinoLumaPlayer) {
  const record = asRecord(player);
  const type = cleanString(record.type || record.provider).toLowerCase();
  const embedUrl = cleanString(player.embedUrl).toLowerCase();

  return (
    type === "collapse" ||
    type === "collaps" ||
    type === "collapse-iframe" ||
    type === "collaps-iframe" ||
    embedUrl.includes("api.ortified.ws/embed")
  );
}

function isVibixPlayer(player: KinoLumaPlayer) {
  const record = asRecord(player);
  const type = cleanString(record.type || record.provider).toLowerCase();
  const embedUrl = cleanString(player.embedUrl).toLowerCase();

  return (
    type === "vibix" ||
    type === "vibix-iframe" ||
    record.provider === "vibix" ||
    embedUrl.includes("vibix")
  );
}

function isFactoriosPlayer(player: KinoLumaPlayer) {
  const record = asRecord(player);
  const provider = cleanString(record.provider).toLowerCase();
  const embedUrl = cleanString(player.embedUrl).toLowerCase();

  return provider === "factorios" || embedUrl.includes("tarantino.factorios.live/show/kinopoisk");
}

function isGeneratedMainPlayer(player: KinoLumaPlayer) {
  return isCollapsePlayer(player) || isVibixPlayer(player) || isFactoriosPlayer(player);
}

function getPlayerKey(player: KinoLumaPlayer) {
  const record = asRecord(player);
  const type = cleanString(record.type || record.provider || "iframe").toLowerCase();
  const embedUrl = cleanString(player.embedUrl);
  const contentKind = cleanString(record.contentKind || record.contentType);
  const contentId = cleanString(record.contentId || record.rendexVideoId);

  if (isCollapsePlayer(player) && contentId) return `collapse:${contentKind}:${contentId}`;
  if (isVibixPlayer(player) && embedUrl) return `vibix:${embedUrl}`;
  if (isFactoriosPlayer(player) && embedUrl) return `factorios:${embedUrl}`;
  if (type === "rendex" && contentId) return `rendex:${contentId}`;

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

function renamePlayers(players: KinoLumaPlayer[]) {
  return players.map((player, index) => ({
    ...player,
    name: index === 0 ? "Основной" : `Запасной ${index}`,
  }));
}

function buildVibixPlayer(movie: Movie, video: VibixVideo): KinoLumaPlayer | null {
  const iframeUrl = addFrameParams(cleanString(video.iframe_url));
  if (!iframeUrl) return null;

  const kpId = getVibixKinopoiskId(video, movie);
  const imdbId = getVibixImdbId(video, movie);
  const videoId = getVibixVideoId(video);
  const rawType = cleanString(video.type).toLowerCase();
  const contentType = rawType === "serial" || rawType === "series" ? "series" : "movie";

  return {
    id: `vibix-${videoId || kpId || imdbId || movie.slug}`,
    name: "Vibix",
    type: "vibix-iframe",
    provider: "vibix",
    embedUrl: iframeUrl,
    contentKind: contentType,
    contentType,
    contentId: videoId || cleanString(kpId) || cleanString(imdbId),
    kinopoiskId: kpId,
    imdbId,
  } as KinoLumaPlayer;
}

function getGeneratedPlayers(movie: Movie) {
  const autoPlayers = buildAutoPlayers({
    slug: movie.slug,
    kinopoiskId: movie.kinopoiskId,
    imdbId: movie.imdbId,
    movieType: movie.type,
    genres: movie.genres,
  });

  return {
    collapse: autoPlayers.find(isCollapsePlayer) || null,
    factorios: autoPlayers.find(isFactoriosPlayer) || null,
  };
}

function getExistingExtraPlayers(movie: Movie) {
  return parsePlayerArray(movie.players || []).filter(
    (player) => !isGeneratedMainPlayer(player),
  );
}

function hasAllThree(players: KinoLumaPlayer[]) {
  return (
    players.some(isCollapsePlayer) &&
    players.some(isVibixPlayer) &&
    players.some(isFactoriosPlayer)
  );
}

function summarizePlayers(players: KinoLumaPlayer[]) {
  return {
    hasCollapse: players.some(isCollapsePlayer),
    hasVibix: players.some(isVibixPlayer),
    hasFactorios: players.some(isFactoriosPlayer),
    playersCount: players.length,
  };
}

async function findVibixVideo(movie: Movie) {
  const errors: string[] = [];

  if (movie.kinopoiskId) {
    try {
      const video = unwrapVibixVideo(await fetchVibixByKinopoiskId(movie.kinopoiskId));
      if (hasVibixIframe(video)) return { video, error: "" };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (movie.imdbId) {
    try {
      const video = unwrapVibixVideo(await fetchVibixByImdbId(movie.imdbId));
      if (hasVibixIframe(video)) return { video, error: "" };
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
    const movies = (await getPublicMovies()).slice(0, limit);
    const results: SyncMovieResult[] = [];

    for (const movie of movies) {
      try {
        if (isAnimeMovie(movie)) {
          results.push(createResult(movie, "skipped", { reason: "Аниме временно пропускаем — нужен отдельный аниме-плеер" }));
          continue;
        }

        if (!movie.kinopoiskId && !movie.imdbId) {
          results.push(createResult(movie, "skipped", { reason: "Нет kinopoiskId или imdbId" }));
          continue;
        }

        const currentPlayers = parsePlayerArray(movie.players || []);
        if (mode === "missing" && hasAllThree(currentPlayers)) {
          results.push(createResult(movie, "skipped", { reason: "Три плеера уже есть", ...summarizePlayers(currentPlayers) }));
          continue;
        }

        const { collapse, factorios } = getGeneratedPlayers(movie);
        const vibixLookup = await findVibixVideo(movie);
        const vibixPlayer = vibixLookup.video ? buildVibixPlayer(movie, vibixLookup.video) : null;
        const existingExtraPlayers = getExistingExtraPlayers(movie);
        const nextPlayers = renamePlayers(
          dedupePlayers([
            ...(collapse ? [collapse] : []),
            ...(vibixPlayer ? [vibixPlayer] : []),
            ...(factorios ? [factorios] : []),
            ...existingExtraPlayers,
          ]),
        );

        if (!nextPlayers.length) {
          results.push(createResult(movie, "skipped", { reason: "Не удалось собрать ни один плеер" }));
          continue;
        }

        const summary = summarizePlayers(nextPlayers);
        const overrideData = ((await getMovieOverrideData(movie.slug)) || {}) as MovieOverrideData;

        await saveMovieOverride(
          movie.slug,
          {
            ...overrideData,
            players: nextPlayers,
          },
          updatedBy,
        );

        const status: SyncMovieResult["status"] = summary.hasCollapse && summary.hasVibix && summary.hasFactorios ? "updated" : "partial";
        const missing: string[] = [];
        if (!summary.hasCollapse) missing.push("Collapse");
        if (!summary.hasVibix) missing.push("Vibix");
        if (!summary.hasFactorios) missing.push("Factorios");

        results.push(
          createResult(movie, status, {
            ...summary,
            reason: missing.length
              ? `${getContentGroup(movie)}: добавлены доступные плееры, не найдено: ${missing.join(", ")}${vibixLookup.error ? `. ${vibixLookup.error}` : ""}`
              : `${getContentGroup(movie)}: добавлены Collapse, Vibix и Factorios`,
            vibixVideoId: vibixLookup.video ? getVibixVideoId(vibixLookup.video) || null : null,
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
    const partialCount = results.filter((result) => result.status === "partial").length;
    const skippedCount = results.filter((result) => result.status === "skipped").length;
    const failedCount = results.filter((result) => result.status === "failed").length;

    revalidatePath("/");
    revalidatePath("/movie/[slug]", "page");
    revalidatePath("/catalog/[category]", "page");

    return Response.json({
      ok: true,
      result: {
        mode,
        scannedCount: movies.length,
        updatedCount,
        partialCount,
        skippedCount,
        failedCount,
        results: results.slice(0, 100),
      },
      message: `Плееры: все 3 для фильмов/мультфильмов/сериалов/документалок — добавлено ${updatedCount}, частично ${partialCount}, пропущено ${skippedCount}, ошибок ${failedCount}`,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown players sync error",
      },
      { status: 500 },
    );
  }
}
