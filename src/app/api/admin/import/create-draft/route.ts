import { supabaseAdmin } from "../../../../lib/supabase/admin";
import { assertAdminSecret } from "../../../../lib/import/adminAuth";
import { checkDuplicates } from "../../../../lib/import/checkDuplicates";
import { generateSlug } from "../../../../lib/import/generateSlug";
import { normalizeTrailerUrl } from "../../../../lib/trailers";
import { mergeAutoPlayersIntoRawJson, parsePlayerText } from "../../../../lib/players";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ManualDraftValues = Record<string, unknown>;

const allowedStatuses = new Set([
  "draft",
  "needs_ai_seo",
  "needs_moderation",
  "needs_review",
  "ready",
  "published",
  "rejected",
]);

const allowedTypes = new Set([
  "film",
  "series",
  "anime",
  "cartoon",
  "documentary",
]);

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function cleanNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanRating(value: unknown) {
  const rating = cleanNumber(value);
  if (rating === null) return null;
  return Math.max(0, Math.min(10, Math.round(rating * 10) / 10));
}

function cleanGenres(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") return [];

  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractIframeSrc(value: string) {
  return value.match(/src=["']([^"']+)["']/i)?.[1]?.trim() || value.trim();
}

function extractYoutubeKey(value: string | null) {
  const text = String(value ?? "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;

  try {
    const url = new URL(text.startsWith("//") ? `https:${text}` : text);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (url.pathname.startsWith("/watch")) return url.searchParams.get("v") || "";
      if (url.pathname.startsWith("/embed/")) return url.pathname.split("/").filter(Boolean)[1] || "";
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/live/")) {
        return url.pathname.split("/").filter(Boolean)[1] || "";
      }
    }
  } catch {
    return "";
  }

  return "";
}

function normalizeManualTrailer(value: unknown) {
  const input = cleanText(value);

  if (!input) {
    return {
      trailer_url: null,
      trailer_embed_url: null,
      trailer_provider: null,
      trailer_key: null,
      trailer_source: null,
      trailer_status: "missing",
      trailer_confidence: 0,
    };
  }

  const source = extractIframeSrc(input);
  const embedUrl = normalizeTrailerUrl(source);
  const key = extractYoutubeKey(source) || extractYoutubeKey(embedUrl);
  const safeSource =
    /^https?:\/\//i.test(source) ||
    source.startsWith("//") ||
    /^[a-zA-Z0-9_-]{11}$/.test(source)
      ? source
      : null;
  const hasTrailer = Boolean(embedUrl || safeSource);

  return {
    trailer_url: key ? `https://www.youtube.com/watch?v=${key}` : safeSource,
    trailer_embed_url: embedUrl || safeSource,
    trailer_provider: key ? "youtube" : null,
    trailer_key: key || null,
    trailer_source: hasTrailer ? "manual" : null,
    trailer_status: hasTrailer ? "accepted" : "missing",
    trailer_confidence: hasTrailer ? 100 : 0,
  };
}

function parseFaq(value: unknown) {
  if (Array.isArray(value)) return value;

  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  const parsed = JSON.parse(trimmed) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("FAQ must be a JSON array");
  }

  return parsed
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;

      const record = item as Record<string, unknown>;
      const question = cleanText(record.question);
      const answer = cleanText(record.answer);

      if (!question || !answer) return null;

      return { question, answer };
    })
    .filter(Boolean);
}

function buildRawJson(values: ManualDraftValues, input: {
  slug: string;
  type: string;
  genres: string[];
  kinopoiskId: number | null;
  imdbId: string | null;
}) {
  const rating = cleanRating(values.rating);
  const players = parsePlayerText(values.player_links);
  const base = {
    source: "manual_admin",
    title: cleanText(values.title),
    original_title: cleanText(values.original_title),
    type: input.type,
    genres: input.genres,
    kinopoisk_id: input.kinopoiskId,
    imdb_id: input.imdbId,
    kinoluma: {
      manual: true,
      manual_created_at: new Date().toISOString(),
      ...(rating !== null
        ? {
            manual_rating: rating,
            manual_movie_rating: rating,
          }
        : {}),
      ...(players.length ? { players } : {}),
    },
  };

  return mergeAutoPlayersIntoRawJson(base, {
    slug: input.slug,
    kinopoiskId: input.kinopoiskId,
    imdbId: input.imdbId,
    rendexVideoId: cleanText(values.rendex_video_id),
    movieType: input.type,
    genres: input.genres,
  });
}

export async function POST(request: Request) {
  const authError = assertAdminSecret(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const values =
      body.values &&
      typeof body.values === "object" &&
      !Array.isArray(body.values)
        ? (body.values as ManualDraftValues)
        : null;

    if (!values) {
      return Response.json(
        { ok: false, error: "values are required" },
        { status: 400 },
      );
    }

    const title = cleanText(values.title);
    if (!title) {
      return Response.json(
        { ok: false, error: "Название фильма обязательно" },
        { status: 400 },
      );
    }

    const year = cleanNumber(values.year);
    const typeInput = cleanText(values.type) || "film";
    const type = allowedTypes.has(typeInput) ? typeInput : "film";
    const statusInput = cleanText(values.status) || "draft";
    const status = allowedStatuses.has(statusInput) ? statusInput : "draft";
    const slug = cleanText(values.slug) || generateSlug(title, year);
    const originalTitle = cleanText(values.original_title);
    const genres = cleanGenres(values.genres);
    const tmdbId = cleanNumber(values.tmdb_id);
    const kinopoiskId = cleanNumber(values.kinopoisk_id);
    const imdbId = cleanText(values.imdb_id);
    const trailer = normalizeManualTrailer(values.trailer_input);
    const rawJson = buildRawJson(values, {
      slug,
      type,
      genres,
      kinopoiskId,
      imdbId,
    });

    const duplicate = await checkDuplicates({
      tmdbId,
      kinopoiskId,
      imdbId,
      slug,
      title,
      originalTitle,
      year,
    });

    if (duplicate.isDuplicate) {
      return Response.json(
        {
          ok: false,
          error: `Похоже, фильм уже есть: ${duplicate.matchedTitle || duplicate.matchedSlug || duplicate.reason || "duplicate"}`,
          duplicate,
        },
        { status: 409 },
      );
    }

    const { data: draft, error } = await supabaseAdmin
      .from("movie_drafts")
      .insert({
        title,
        original_title: originalTitle,
        slug,
        year,
        type,
        genres,
        poster_url: cleanText(values.poster_url),
        backdrop_url: cleanText(values.backdrop_url),
        tmdb_id: tmdbId,
        kinopoisk_id: kinopoiskId,
        imdb_id: imdbId,
        actors: cleanStringList(values.actors),
        directors: cleanStringList(values.directors),
        description: cleanText(values.description),
        long_description: cleanText(values.long_description),
        seo_title: cleanText(values.seo_title),
        seo_description: cleanText(values.seo_description),
        faq: parseFaq(values.faq_json),
        trailer_provider: trailer.trailer_provider,
        trailer_key: trailer.trailer_key,
        trailer_url: trailer.trailer_url,
        trailer_embed_url: trailer.trailer_embed_url,
        trailer_source: trailer.trailer_source,
        trailer_confidence: trailer.trailer_confidence,
        trailer_status: trailer.trailer_status,
        similar_movie_ids: [],
        source: "manual_admin",
        raw_json: rawJson,
        status,
        quality_score: null,
        moderation_notes: cleanText(values.moderation_notes) || "Создано вручную в Import Admin",
      })
      .select("*")
      .single();

    if (error) throw error;

    const { error: feedbackError } = await supabaseAdmin
      .from("agent_feedback")
      .insert({
        draft_id: draft.id,
        agent_name: "admin_dashboard",
        decision: "manual_create",
        reason: "Manual movie draft was created in the import admin panel.",
        before_value: null,
        after_value: draft,
      });

    if (feedbackError) throw feedbackError;

    return Response.json({
      ok: true,
      draft,
      message: "Фильм добавлен в черновики",
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown manual draft create error",
      },
      { status: 500 },
    );
  }
}
