import { supabaseAdmin } from "../supabase/admin";
import {
  buildCandidateDuplicateInput,
  findDuplicateMovie,
  serializeDuplicateMatch,
} from "./duplicateGuard";
import { buildCollapseImdbUrl, buildCollapseKinopoiskUrl } from "../players";
import {
  fetchVibixLinks,
  getVibixConfig,
  type VibixVideo,
  type VibixVideoType,
} from "./vibixApi";
import type { MovieType } from "./types";

export type ImportVibixCandidatesOptions = {
  type: VibixVideoType;
  page?: number;
  limit?: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const normalized = value.replace(",", ".").trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanInt(value: unknown) {
  const numberValue = cleanNumber(value);
  return numberValue === null ? null : Math.trunc(numberValue);
}

function normalizeTitle(video: VibixVideo) {
  return (
    cleanText(video.name_rus) ||
    cleanText(video.name) ||
    cleanText(video.name_eng) ||
    cleanText(video.name_original) ||
    `Vibix ${video.id}`
  );
}

function normalizeOriginalTitle(video: VibixVideo) {
  return cleanText(video.name_original) || cleanText(video.name_eng) || null;
}

function normalizeMovieType(type: unknown): MovieType | null {
  const normalized = cleanText(type).toLowerCase();
  if (normalized === "movie" || normalized === "film") return "film";
  if (normalized === "serial" || normalized === "series" || normalized === "tv")
    return "series";
  return null;
}

function getKinopoiskId(video: VibixVideo) {
  return cleanInt(video.kp_id) ?? cleanInt(video.kinopoisk_id);
}

function getImdbId(video: VibixVideo) {
  return cleanText(video.imdb_id) || null;
}

function getRendexType(video: VibixVideo) {
  return normalizeMovieType(video.type) === "series" ? "series" : "movie";
}

function buildFactoriosUrl(kpId: number) {
  return `https://tarantino.factorios.live/show/kinopoisk/${kpId}`;
}

function buildVibixPlayers(video: VibixVideo) {
  const config = getVibixConfig();
  const videoId = cleanInt(video.id);
  const kpId = getKinopoiskId(video);
  const imdbId = getImdbId(video);
  const players: Array<Record<string, unknown>> = [];
  const collapseUrl = kpId
    ? buildCollapseKinopoiskUrl(kpId)
    : buildCollapseImdbUrl(imdbId);

  if (collapseUrl) {
    players.push({
      id: kpId ? `collapse-kp-${kpId}` : `collapse-imdb-${imdbId}`,
      name: "Основной",
      type: "collapse",
      provider: "collapse",
      contentKind: kpId ? "kp" : "imdb",
      contentType: kpId ? "kp" : "imdb",
      contentId: kpId ? String(kpId) : imdbId,
      embedUrl: collapseUrl,
    });
  }

  if (videoId && videoId > 0) {
    players.push({
      id: `rendex-${videoId}`,
      name: collapseUrl ? "Запасной 1" : "Основной",
      type: "rendex",
      provider: "rendex",
      publisherId: config.publisherId,
      contentType: getRendexType(video),
      contentId: String(videoId),
      rendexVideoId: String(videoId),
      design: "1",
      color1: "#56CEAA",
      color2: "#FFFFFF",
      color3: "#AEC7BC",
      color4: "#42BD88",
      color5: "#000000",
      embedUrl: "",
    });
  }

  if (kpId && kpId > 0) {
    players.push({
      id: `factorios-${kpId}`,
      name: collapseUrl || videoId ? `Запасной ${players.length}` : "Основной",
      type: "iframe",
      provider: "factorios",
      embedUrl: buildFactoriosUrl(kpId),
    });
  } else if (cleanText(video.iframe_url)) {
    players.push({
      id: `vibix-iframe-${videoId || "video"}`,
      name: collapseUrl || videoId ? `Запасной ${players.length}` : "Основной",
      type: "iframe",
      provider: "vibix",
      embedUrl: cleanText(video.iframe_url),
    });
  }

  return players;
}

function hasAnimeMarker(video: VibixVideo) {
  const genreText = Array.isArray(video.genre)
    ? video.genre.join(" ")
    : cleanText(video.genre);
  const tagsText = Array.isArray(video.tags)
    ? video.tags
        .map((tag) => `${cleanText(tag.name)} ${cleanText(tag.code)}`)
        .join(" ")
    : "";
  const text =
    `${genreText} ${tagsText} ${cleanText(video.name)} ${cleanText(video.name_rus)} ${cleanText(video.name_eng)}`.toLowerCase();

  return text.includes("аниме") || text.includes("anime");
}

function normalizeCandidate(video: VibixVideo) {
  if (hasAnimeMarker(video)) return null;
  const videoId = cleanInt(video.id);
  const title = normalizeTitle(video);
  const originalTitle = normalizeOriginalTitle(video);
  const year = cleanInt(video.year);
  const type = normalizeMovieType(video.type);
  const kinopoiskId = getKinopoiskId(video);
  const imdbId = getImdbId(video);

  if (!videoId || videoId <= 0 || !title || !type) {
    return null;
  }

  return {
    source: "vibix",
    source_id: `vibix:${videoId}`,
    title,
    original_title: originalTitle,
    year,
    type,
    status: "new",
    raw_json: {
      vibix: video,
      kinopoisk_id: kinopoiskId,
      kp_id: kinopoiskId,
      imdb_id: imdbId,
      kinoluma: {
        players: buildVibixPlayers(video),
        imported_from: "vibix",
        imported_at: new Date().toISOString(),
      },
    },
  };
}

async function writeRunLog(runId: string, values: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from("movie_import_runs")
    .update({
      ...values,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) throw error;
}

export async function importVibixCandidates(
  options: ImportVibixCandidatesOptions,
) {
  const config = getVibixConfig();
  if (!config.isConfigured) {
    throw new Error(
      "Vibix API не настроен: добавь VIBIX_API_TOKEN или RENDEX_API_TOKEN в env",
    );
  }

  const type = options.type === "serial" ? "serial" : "movie";
  const page = Math.max(1, Math.trunc(options.page || 1));
  const limit = Math.max(1, Math.min(100, Math.trunc(options.limit || 30)));

  const runInsert = await supabaseAdmin
    .from("movie_import_runs")
    .insert({
      status: "running",
      log: [
        {
          message: "Vibix import started",
          type,
          page,
          limit,
          at: new Date().toISOString(),
        },
      ],
    })
    .select("id")
    .single();

  if (runInsert.error) throw runInsert.error;
  const runId = runInsert.data.id as string;

  try {
    const response = await fetchVibixLinks({ type, page, limit });
    const videos = Array.isArray(response.data) ? response.data : [];
    type NormalizedVibixCandidate = NonNullable<
      ReturnType<typeof normalizeCandidate>
    >;
    const normalized = videos
      .map(normalizeCandidate)
      .filter((candidate): candidate is NormalizedVibixCandidate =>
        Boolean(candidate),
      );

    const freshCandidates: typeof normalized = [];
    const duplicates: unknown[] = [];
    let skippedInvalidCount = videos.length - normalized.length;

    for (const candidate of normalized) {
      const raw = asRecord(candidate.raw_json);
      const vibix = asRecord(raw.vibix);
      const duplicate = await findDuplicateMovie({
        ...buildCandidateDuplicateInput(candidate),
        kinopoiskId: cleanInt(vibix.kp_id) ?? cleanInt(vibix.kinopoisk_id),
        imdbId: cleanText(vibix.imdb_id) || null,
        rawJson: candidate.raw_json,
      });

      if (duplicate.isDuplicate) {
        duplicates.push({
          sourceId: candidate.source_id,
          title: candidate.title,
          duplicate: serializeDuplicateMatch(duplicate),
        });
        continue;
      }

      freshCandidates.push(candidate);
    }

    if (freshCandidates.length > 0) {
      const { error } = await supabaseAdmin
        .from("import_candidates")
        .upsert(freshCandidates, {
          onConflict: "source,source_id",
          ignoreDuplicates: false,
        });

      if (error) throw error;
    }

    const log = [
      {
        message: "Vibix import finished",
        at: new Date().toISOString(),
        type,
        page,
        limit,
        apiTotal: response.meta?.total ?? null,
        apiLastPage: response.meta?.last_page ?? null,
        scannedCount: videos.length,
        insertedCandidatesCount: freshCandidates.length,
        duplicateCount: duplicates.length,
        skippedInvalidCount,
        duplicates: duplicates.slice(0, 20),
      },
    ];

    await writeRunLog(runId, {
      status: "finished",
      found_count: freshCandidates.length,
      created_drafts_count: 0,
      failed_count: skippedInvalidCount,
      log,
    });

    return {
      runId,
      type,
      page,
      limit,
      totalFromApi: response.meta?.total ?? null,
      lastPage: response.meta?.last_page ?? null,
      scannedCount: videos.length,
      insertedCandidatesCount: freshCandidates.length,
      duplicateCount: duplicates.length,
      skippedInvalidCount,
    };
  } catch (error) {
    await writeRunLog(runId, {
      status: "failed",
      found_count: 0,
      created_drafts_count: 0,
      failed_count: 1,
      log: [
        {
          message: "Vibix import failed",
          at: new Date().toISOString(),
          type,
          page,
          limit,
          error: error instanceof Error ? error.message : String(error),
        },
      ],
    });

    throw error;
  }
}
