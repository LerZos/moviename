import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { assertAdminSecret } from '../../../../lib/import/adminAuth';
import { tmdbFetch } from '../../../../lib/import/tmdb';
import { buildAutoPlayersFromRawJson, getRendexVideoIdFromRawJson, playersToText } from '../../../../lib/players';

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
  poster?: { url?: string | null; previewUrl?: string | null } | null;
  backdrop?: { url?: string | null; previewUrl?: string | null } | null;
};

type TmdbDetailsForImages = {
  id: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
};

const MAX_CANDIDATE_IMAGE_ENRICHMENTS = 24;

function tmdbImage(path: string | null | undefined, size = 'w500') {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getDraftPlayerLinks(rawJson: unknown) {
  const raw = asObject(rawJson);
  const kinoluma = asObject(raw.kinoluma);

  return playersToText(kinoluma.players) || playersToText(buildAutoPlayersFromRawJson(raw));
}

function getDraftRendexVideoId(rawJson: unknown) {
  return getRendexVideoIdFromRawJson(rawJson) || null;
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

  return (
    tmdbImage(data.poster_path, 'w500') ??
    data.poster?.url ??
    data.poster?.previewUrl ??
    null
  );
}

function getCandidateBackdropUrl(raw: unknown) {
  const data = asObject(raw) as CandidateRawJson;

  return (
    tmdbImage(data.backdrop_path, 'w780') ??
    data.backdrop?.url ??
    data.backdrop?.previewUrl ??
    null
  );
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

async function enrichCandidateImages(candidate: CandidateRow, shouldFetchFromTmdb: boolean) {
  const rawObject = asObject(candidate.raw_json);
  const posterUrl = getCandidatePosterUrl(rawObject);
  const backdropUrl = getCandidateBackdropUrl(rawObject);

  if (posterUrl || backdropUrl || !shouldFetchFromTmdb || !process.env.TMDB_ACCESS_TOKEN) {
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
        const shouldFetchFromTmdb = !hasImage && enrichmentsLeft > 0;

        if (shouldFetchFromTmdb) {
          enrichmentsLeft -= 1;
        }

        return enrichCandidateImages(candidate, shouldFetchFromTmdb);
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

        return {
          ...publicDraft,
          player_links: getDraftPlayerLinks(rawJson),
          rendex_video_id: getDraftRendexVideoId(rawJson),
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
        hasKinopoisk: Boolean(process.env.KINOPOISK_DEV_TOKEN),
        hasTMDB: Boolean(process.env.TMDB_ACCESS_TOKEN),
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
