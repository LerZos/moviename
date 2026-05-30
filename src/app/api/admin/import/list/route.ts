import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { assertAdminSecret } from '../../../../lib/import/adminAuth';
import { tmdbFetch } from '../../../../lib/import/tmdb';
import { findBestMovieImages } from '../../../../lib/import/movieImages';
import {
  fetchVibixByImdbId,
  fetchVibixByKinopoiskId,
  getVibixConfig,
  unwrapVibixVideo,
} from '../../../../lib/import/vibixApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CountResult = {
  key: string;
  count: number;
};

type CandidateRow = {
  id: string;
  source: string | null;
  source_id: string | null;
  title: string | null;
  original_title: string | null;
  year: number | null;
  type: string | null;
  status: string | null;
  raw_json: unknown;
  created_at: string | null;
  updated_at: string | null;
};

type CandidateRawJson = {
  id?: number | string | null;
  media_type?: 'movie' | 'tv' | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  poster?: { url?: string | null; previewUrl?: string | null } | null;
  backdrop?: { url?: string | null; previewUrl?: string | null } | null;
  vibix?: {
    poster_url?: string | null;
    backdrop_url?: string | null;
    poster_path?: string | null;
    backdrop_path?: string | null;
  } | null;
};

type TmdbDetailsForImages = {
  id: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
};

const MAX_CANDIDATE_IMAGE_ENRICHMENTS = 80;

function tmdbImage(path: string | null | undefined, size = 'w500') {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function cleanUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return trimmed;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getDraftPlayerLinks(rawJson: unknown) {
  const raw = asObject(rawJson);
  const kinoluma = asObject(raw.kinoluma);
  const players = Array.isArray(kinoluma.players) ? kinoluma.players : [];

  return players
    .map((player) => {
      const item = asObject(player);
      const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Плеер';
      const type = typeof item.type === 'string' ? item.type.trim().toLowerCase() : '';
      const contentId = typeof item.contentId === 'string' ? item.contentId.trim() : typeof item.rendexVideoId === 'string' ? item.rendexVideoId.trim() : '';
      const embedUrl = typeof item.embedUrl === 'string' ? item.embedUrl.trim() : '';

      if (type === 'rendex' && contentId) return `${name} | rendex | ${contentId}`;
      if (type === 'iframe' && embedUrl) return `${name} | iframe | ${embedUrl}`;
      return embedUrl ? `${name} | ${embedUrl}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

function getNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const parsed = Number(value.replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function roundRating(value: number) {
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getInt(value: unknown) {
  const numberValue = getNumber(value);
  return numberValue === null ? null : Math.trunc(numberValue);
}

function isVibixCandidate(candidate: CandidateRow) {
  return candidate.source === 'vibix' || Boolean(candidate.source_id?.startsWith('vibix:'));
}

function getCandidateKinopoiskId(raw: unknown) {
  const data = asObject(raw);
  const vibix = asObject(data.vibix);
  const candidate = asObject(data.candidate);
  const candidateRaw = asObject(candidate.raw_json);

  return (
    getInt(vibix.kp_id) ??
    getInt(vibix.kinopoisk_id) ??
    getInt(data.kp_id) ??
    getInt(data.kinopoisk_id) ??
    getInt(candidateRaw.kp_id) ??
    getInt(candidateRaw.kinopoisk_id)
  );
}

function getCandidateImdbId(raw: unknown) {
  const data = asObject(raw);
  const vibix = asObject(data.vibix);
  const candidate = asObject(data.candidate);
  const candidateRaw = asObject(candidate.raw_json);

  return getString(vibix.imdb_id) || getString(data.imdb_id) || getString(candidateRaw.imdb_id) || null;
}

function getCandidateImageSource(raw: unknown) {
  const data = asObject(raw);
  const kinoluma = asObject(data.kinoluma);
  return getString(kinoluma.poster_source || kinoluma.image_source).toLowerCase();
}

function hasTrustedCandidateImage(raw: unknown) {
  const source = getCandidateImageSource(raw);
  return source === 'tmdb' || source === 'kinopoisk';
}

function getCandidateType(candidate: CandidateRow, raw: unknown) {
  const data = asObject(raw);
  const vibix = asObject(data.vibix);
  const nestedCandidate = asObject(data.candidate);
  return getString(candidate.type) || getString(vibix.type) || getString(data.type) || getString(nestedCandidate.type) || null;
}

async function enrichCandidateWithBetterPoster(candidate: CandidateRow, raw: Record<string, unknown>) {
  const vibix = asObject(raw.vibix);
  const kinoluma = asObject(raw.kinoluma);
  const images = await findBestMovieImages({
    title: candidate.title || getString(vibix.name_rus) || getString(vibix.name),
    originalTitle: candidate.original_title || getString(vibix.name_original) || getString(vibix.name_eng),
    year: candidate.year ?? getInt(vibix.year),
    type: getCandidateType(candidate, raw),
    kinopoiskId: getCandidateKinopoiskId(raw),
    imdbId: getCandidateImdbId(raw),
  });

  if (!images.posterUrl && !images.backdropUrl) return null;

  return {
    ...raw,
    poster_url: images.posterUrl ?? cleanUrl(raw.poster_url) ?? cleanUrl(vibix.poster_url) ?? null,
    backdrop_url: images.backdropUrl ?? cleanUrl(raw.backdrop_url) ?? cleanUrl(vibix.backdrop_url) ?? null,
    kinoluma: {
      ...kinoluma,
      poster_source: images.source,
      backdrop_source: images.source,
      image_enriched_at: new Date().toISOString(),
    },
  };
}

async function enrichVibixCandidate(raw: unknown) {
  const rawObject = asObject(raw);
  const vibix = asObject(rawObject.vibix);
  const kpId = getCandidateKinopoiskId(rawObject);
  const imdbId = getCandidateImdbId(rawObject);

  if (!getVibixConfig().isConfigured) return rawObject;

  try {
    const payload = kpId ? await fetchVibixByKinopoiskId(kpId) : imdbId ? await fetchVibixByImdbId(imdbId) : null;
    const fullVideo = unwrapVibixVideo(payload);

    if (!fullVideo) return rawObject;

    return {
      ...rawObject,
      poster_url: cleanUrl(fullVideo.poster_url) ?? cleanUrl(rawObject.poster_url) ?? null,
      backdrop_url: cleanUrl(fullVideo.backdrop_url) ?? cleanUrl(rawObject.backdrop_url) ?? null,
      vibix: {
        ...vibix,
        ...fullVideo,
        poster_url: cleanUrl(fullVideo.poster_url) ?? cleanUrl(vibix.poster_url) ?? null,
        backdrop_url: cleanUrl(fullVideo.backdrop_url) ?? cleanUrl(vibix.backdrop_url) ?? null,
      },
      admin_vibix_enriched_at: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('[KinoLuma import admin] Vibix poster enrichment failed:', {
      kpId,
      imdbId,
      error: error instanceof Error ? error.message : error,
    });

    return rawObject;
  }
}

function getDraftMovieRating(rawJson: unknown) {
  const raw = asObject(rawJson);
  const kinoluma = asObject(raw.kinoluma);
  const tmdb = asObject(raw.tmdb);
  const kinopoisk = asObject(raw.kinopoisk);
  const candidate = asObject(raw.candidate);
  const kinopoiskRating = asObject(kinopoisk.rating);

  const manualRating = getNumber(kinoluma.manual_rating);
  const kpRating = getNumber(kinopoiskRating.kp);
  const imdbRating = getNumber(kinopoiskRating.imdb);
  const tmdbRating = getNumber(tmdb.vote_average) ?? getNumber(candidate.vote_average);
  const tmdbVoteCount = getNumber(tmdb.vote_count) ?? getNumber(candidate.vote_count) ?? 0;

  if (manualRating && manualRating > 0) return roundRating(manualRating);
  if (kpRating && kpRating > 0) return roundRating(kpRating);
  if (imdbRating && imdbRating > 0) return roundRating(imdbRating);
  if (tmdbRating && tmdbRating > 0 && tmdbVoteCount > 0) return roundRating(tmdbRating);

  return null;
}

function getCandidatePosterUrl(raw: unknown) {
  const data = asObject(raw) as CandidateRawJson;
  const vibix = asObject(data.vibix) as CandidateRawJson['vibix'];

  return (
    cleanUrl(data.poster_url) ??
    cleanUrl(vibix?.poster_url) ??
    tmdbImage(data.poster_path, 'w500') ??
    tmdbImage(vibix?.poster_path, 'w500') ??
    cleanUrl(data.poster?.url) ??
    cleanUrl(data.poster?.previewUrl) ??
    null
  );
}

function getCandidateBackdropUrl(raw: unknown) {
  const data = asObject(raw) as CandidateRawJson;
  const vibix = asObject(data.vibix) as CandidateRawJson['vibix'];

  return (
    cleanUrl(data.backdrop_url) ??
    cleanUrl(vibix?.backdrop_url) ??
    tmdbImage(data.backdrop_path, 'w780') ??
    tmdbImage(vibix?.backdrop_path, 'w780') ??
    cleanUrl(data.backdrop?.url) ??
    cleanUrl(data.backdrop?.previewUrl) ??
    null
  );
}

function getDraftPosterUrl(raw: unknown) {
  const rawObject = asObject(raw);
  const vibix = asObject(rawObject.vibix);
  const candidate = asObject(rawObject.candidate);
  const candidateRaw = asObject(candidate.raw_json);

  return (
    cleanUrl(rawObject.poster_url) ??
    cleanUrl(candidateRaw.poster_url) ??
    cleanUrl(vibix.poster_url) ??
    null
  );
}

function getDraftBackdropUrl(raw: unknown) {
  const rawObject = asObject(raw);
  const vibix = asObject(rawObject.vibix);
  const candidate = asObject(rawObject.candidate);
  const candidateRaw = asObject(candidate.raw_json);

  return (
    cleanUrl(rawObject.backdrop_url) ??
    cleanUrl(candidateRaw.backdrop_url) ??
    cleanUrl(vibix.backdrop_url) ??
    null
  );
}

function getDraftRendexVideoId(raw: unknown) {
  const rawObject = asObject(raw);
  const kinoluma = asObject(rawObject.kinoluma);
  const vibix = asObject(rawObject.vibix);
  const candidate = asObject(rawObject.candidate);
  const candidateRaw = asObject(candidate.raw_json);
  const players = Array.isArray(kinoluma.players) ? kinoluma.players : [];

  for (const player of players) {
    const item = asObject(player);
    const type = typeof item.type === 'string' ? item.type.toLowerCase() : '';
    const contentId = cleanUrl(item.contentId) ?? cleanUrl(item.rendexVideoId);
    if (type === 'rendex' && contentId) return contentId;
  }

  const rawId = vibix.id ?? candidateRaw.id ?? rawObject.id;
  if (typeof rawId === 'number' && Number.isFinite(rawId)) return String(Math.trunc(rawId));
  if (typeof rawId === 'string' && rawId.trim()) return rawId.trim();

  return null;
}

function parseTmdbSourceId(sourceId: string | null) {
  if (!sourceId) return null;

  const [mediaType, rawId] = sourceId.split(':');
  const id = Number(rawId);

  if ((mediaType !== 'movie' && mediaType !== 'tv') || !Number.isFinite(id)) {
    return null;
  }

  return { mediaType, id } as const;
}

async function enrichCandidateImages(candidate: CandidateRow, shouldFetchExternalImages: boolean) {
  let rawObject = asObject(candidate.raw_json);
  let posterUrl = getCandidatePosterUrl(rawObject);
  let backdropUrl = getCandidateBackdropUrl(rawObject);

  if (shouldFetchExternalImages && isVibixCandidate(candidate) && !hasTrustedCandidateImage(rawObject)) {
    const betterPosterRawJson = await enrichCandidateWithBetterPoster(candidate, rawObject);

    if (betterPosterRawJson) {
      rawObject = betterPosterRawJson;
      posterUrl = getCandidatePosterUrl(betterPosterRawJson);
      backdropUrl = getCandidateBackdropUrl(betterPosterRawJson);

      await supabaseAdmin
        .from('import_candidates')
        .update({ raw_json: rawObject, updated_at: new Date().toISOString() })
        .eq('id', candidate.id);
    }
  }

  if ((!posterUrl || !backdropUrl) && shouldFetchExternalImages && isVibixCandidate(candidate)) {
    const vibixEnrichedRawJson = await enrichVibixCandidate(rawObject);
    const vibixPosterUrl = getCandidatePosterUrl(vibixEnrichedRawJson);
    const vibixBackdropUrl = getCandidateBackdropUrl(vibixEnrichedRawJson);

    if (vibixPosterUrl || vibixBackdropUrl) {
      rawObject = vibixEnrichedRawJson;
      posterUrl = vibixPosterUrl;
      backdropUrl = vibixBackdropUrl;

      await supabaseAdmin
        .from('import_candidates')
        .update({ raw_json: rawObject, updated_at: new Date().toISOString() })
        .eq('id', candidate.id);
    }
  }

  if (posterUrl || backdropUrl || !shouldFetchExternalImages || !process.env.TMDB_ACCESS_TOKEN) {
    return {
      ...candidate,
      raw_json: rawObject,
      poster_url: posterUrl,
      backdrop_url: backdropUrl,
    };
  }

  const parsedSource = parseTmdbSourceId(candidate.source_id);

  if (!parsedSource) {
    return {
      ...candidate,
      raw_json: rawObject,
      poster_url: null,
      backdrop_url: null,
    };
  }

  try {
    const details = await tmdbFetch<TmdbDetailsForImages>(
      `/${parsedSource.mediaType}/${parsedSource.id}?language=ru-RU`,
    );

    const enrichedRawJson = {
      ...rawObject,
      poster_path: details.poster_path ?? rawObject.poster_path ?? null,
      backdrop_path: details.backdrop_path ?? rawObject.backdrop_path ?? null,
      admin_image_enriched_at: new Date().toISOString(),
    };

    await supabaseAdmin
      .from('import_candidates')
      .update({ raw_json: enrichedRawJson, updated_at: new Date().toISOString() })
      .eq('id', candidate.id);

    return {
      ...candidate,
      raw_json: enrichedRawJson,
      poster_url: getCandidatePosterUrl(enrichedRawJson),
      backdrop_url: getCandidateBackdropUrl(enrichedRawJson),
    };
  } catch (error) {
    console.warn('[KinoLuma import admin] Candidate poster enrichment failed:', {
      candidateId: candidate.id,
      sourceId: candidate.source_id,
      error: error instanceof Error ? error.message : error,
    });

    return {
      ...candidate,
      raw_json: rawObject,
      poster_url: null,
      backdrop_url: null,
    };
  }
}

async function countRows(table: string, column?: string, value?: string): Promise<number> {
  let query = supabaseAdmin.from(table).select('id', { count: 'exact', head: true });

  if (column && value) {
    query = query.eq(column, value);
  }

  const { count, error } = await query;
  if (error) throw error;

  return count ?? 0;
}

async function getDraftCounts(): Promise<CountResult[]> {
  const statuses = [
    'draft',
    'needs_ai_seo',
    'needs_moderation',
    'needs_review',
    'ready',
    'published',
    'rejected',
  ];

  const counts = await Promise.all(
    statuses.map(async (status) => ({
      key: status,
      count: await countRows('movie_drafts', 'status', status),
    })),
  );

  return counts;
}

export async function GET(request: Request) {
  const authError = assertAdminSecret(request);
  if (authError) return authError;

  try {
    const { data: candidates, error: candidatesError } = await supabaseAdmin
      .from('import_candidates')
      .select('id, source, source_id, title, original_title, year, type, status, raw_json, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(80);

    if (candidatesError) throw candidatesError;

    const rows = (candidates ?? []) as CandidateRow[];
    let enrichmentsLeft = MAX_CANDIDATE_IMAGE_ENRICHMENTS;

    const enrichedCandidates = await Promise.all(
      rows.map((candidate) => {
        const hasImage = Boolean(getCandidatePosterUrl(candidate.raw_json) || getCandidateBackdropUrl(candidate.raw_json));
        const needsBetterVibixImage = isVibixCandidate(candidate) && !hasTrustedCandidateImage(candidate.raw_json);
        const shouldFetchExternalImages = (!hasImage || needsBetterVibixImage) && enrichmentsLeft > 0;

        if (shouldFetchExternalImages) {
          enrichmentsLeft -= 1;
        }

        return enrichCandidateImages(candidate, shouldFetchExternalImages);
      }),
    );

    const { data: drafts, error: draftsError } = await supabaseAdmin
      .from('movie_drafts')
      .select(
        'id, title, original_title, slug, year, type, genres, poster_url, backdrop_url, tmdb_id, kinopoisk_id, imdb_id, actors, directors, description, long_description, seo_title, seo_description, faq, trailer_provider, trailer_key, trailer_url, trailer_embed_url, trailer_source, trailer_confidence, trailer_status, similar_movie_ids, source, status, quality_score, moderation_notes, raw_json, created_at, updated_at',
      )
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(120);

    if (draftsError) throw draftsError;

    const { data: runs, error: runsError } = await supabaseAdmin
      .from('movie_import_runs')
      .select('id, started_at, finished_at, status, found_count, created_drafts_count, failed_count, log')
      .order('started_at', { ascending: false })
      .limit(10);

    if (runsError) throw runsError;

    const [newCandidatesCount, draftCounts] = await Promise.all([
      countRows('import_candidates', 'status', 'new'),
      getDraftCounts(),
    ]);

    return Response.json({
      ok: true,
      candidates: enrichedCandidates.map((candidate) => ({
        id: candidate.id,
        source: candidate.source,
        source_id: candidate.source_id,
        title: candidate.title,
        original_title: candidate.original_title,
        year: candidate.year,
        type: candidate.type,
        status: candidate.status,
        poster_url: candidate.poster_url,
        backdrop_url: candidate.backdrop_url,
        created_at: candidate.created_at,
        updated_at: candidate.updated_at,
      })),
      drafts: (drafts ?? []).map((draft) => {
        const { raw_json: rawJson, ...publicDraft } = draft as Record<string, unknown>;

        const existingPosterUrl = typeof publicDraft.poster_url === 'string' && publicDraft.poster_url.trim() ? publicDraft.poster_url : null;
        const existingBackdropUrl = typeof publicDraft.backdrop_url === 'string' && publicDraft.backdrop_url.trim() ? publicDraft.backdrop_url : null;

        return {
          ...publicDraft,
          poster_url: existingPosterUrl || getDraftPosterUrl(rawJson),
          backdrop_url: existingBackdropUrl || getDraftBackdropUrl(rawJson),
          rendex_video_id: getDraftRendexVideoId(rawJson),
          player_links: getDraftPlayerLinks(rawJson),
          movie_rating: getDraftMovieRating(rawJson),
        };
      }),
      runs: runs ?? [],
      counts: {
        newCandidates: newCandidatesCount,
        drafts: draftCounts,
      },
      config: {
        hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
        hasTemplateSeo: true,
        hasKinopoisk: Boolean(process.env.KINOPOISK_DEV_TOKEN || process.env.KINOPOISK_API_KEY),
        hasTMDB: Boolean(process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_API_KEY),
        hasVibix: getVibixConfig().isConfigured,
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown import list error',
      },
      { status: 500 },
    );
  }
}
