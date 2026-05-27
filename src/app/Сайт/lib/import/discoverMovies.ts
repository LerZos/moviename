import { supabaseAdmin } from '../supabase/admin';
import { tmdbFetch } from './tmdb';
import type { MovieType } from './types';

type TmdbListItem = {
  id: number;
  media_type?: 'movie' | 'tv';
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string | null;
  popularity?: number | null;
  vote_average?: number | null;
  vote_count?: number | null;
};

type TmdbListResponse = {
  results: TmdbListItem[];
};

function getYear(value?: string): number | null {
  if (!value) return null;
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function detectBasicType(item: TmdbListItem): MovieType {
  const mediaType = item.media_type ?? (item.title ? 'movie' : 'tv');
  return mediaType === 'tv' ? 'series' : 'film';
}

function normalizeCandidate(item: TmdbListItem, fallbackMediaType: 'movie' | 'tv') {
  const mediaType = item.media_type ?? fallbackMediaType;
  const title = item.title ?? item.name ?? item.original_title ?? item.original_name ?? '';
  const originalTitle = item.original_title ?? item.original_name ?? null;
  const year = getYear(item.release_date ?? item.first_air_date);

  return {
    source: 'tmdb',
    source_id: `${mediaType}:${item.id}`,
    title,
    original_title: originalTitle,
    year,
    type: detectBasicType({ ...item, media_type: mediaType }),
    status: 'new',
    raw_json: { ...item, media_type: mediaType },
  };
}

async function refreshNewCandidateRawJson(candidate: ReturnType<typeof normalizeCandidate>) {
  const { error } = await supabaseAdmin
    .from('import_candidates')
    .update({
      title: candidate.title,
      original_title: candidate.original_title,
      year: candidate.year,
      type: candidate.type,
      raw_json: candidate.raw_json,
      updated_at: new Date().toISOString(),
    })
    .eq('source', candidate.source)
    .eq('source_id', candidate.source_id)
    .eq('status', 'new');

  if (error) throw error;
}

export async function discoverMovies() {
  const runInsert = await supabaseAdmin
    .from('movie_import_runs')
    .insert({ status: 'running', log: [{ message: 'TMDB discovery started', at: new Date().toISOString() }] })
    .select('id')
    .single();

  if (runInsert.error) throw runInsert.error;

  const runId = runInsert.data.id as string;

  try {
    const endpoints: Array<{ path: string; mediaType: 'movie' | 'tv' }> = [
      { path: '/trending/movie/day?language=ru-RU&page=1', mediaType: 'movie' },
      { path: '/trending/tv/day?language=ru-RU&page=1', mediaType: 'tv' },
      { path: '/movie/popular?language=ru-RU&page=1', mediaType: 'movie' },
      { path: '/tv/popular?language=ru-RU&page=1', mediaType: 'tv' },
    ];

    const responses = await Promise.all(
      endpoints.map(async (endpoint) => ({
        ...endpoint,
        data: await tmdbFetch<TmdbListResponse>(endpoint.path),
      })),
    );

    const candidatesByKey = new Map<string, ReturnType<typeof normalizeCandidate>>();

    for (const response of responses) {
      for (const item of response.data.results ?? []) {
        const candidate = normalizeCandidate(item, response.mediaType);
        if (!candidate.title) continue;
        candidatesByKey.set(`${candidate.source}:${candidate.source_id}`, candidate);
      }
    }

    const candidates = Array.from(candidatesByKey.values());

    if (candidates.length > 0) {
      const { error } = await supabaseAdmin
        .from('import_candidates')
        .upsert(candidates, {
          onConflict: 'source,source_id',
          ignoreDuplicates: true,
        });

      if (error) throw error;

      await Promise.all(candidates.map((candidate) => refreshNewCandidateRawJson(candidate)));
    }

    await supabaseAdmin
      .from('movie_import_runs')
      .update({
        status: 'finished',
        finished_at: new Date().toISOString(),
        found_count: candidates.length,
        log: [
          { message: 'TMDB discovery finished', at: new Date().toISOString(), foundCount: candidates.length },
        ],
      })
      .eq('id', runId);

    return { runId, foundCount: candidates.length };
  } catch (error) {
    await supabaseAdmin
      .from('movie_import_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        failed_count: 1,
        log: [
          {
            message: error instanceof Error ? error.message : 'Unknown discovery error',
            at: new Date().toISOString(),
          },
        ],
      })
      .eq('id', runId);

    throw error;
  }
}
