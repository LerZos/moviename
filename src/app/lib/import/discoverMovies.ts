import { supabaseAdmin } from '../supabase/admin';
import { buildCandidateDuplicateInput, findDuplicateMovie, serializeDuplicateMatch } from './duplicateGuard';
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
  page?: number;
  total_pages?: number;
  total_results?: number;
  results: TmdbListItem[];
};

type NormalizedCandidate = ReturnType<typeof normalizeCandidate>;

const MIN_DISCOVERY_RATING = 5;
const MIN_DISCOVERY_VOTE_COUNT = 50;
const DEFAULT_DISCOVERY_MAX_PAGE = 20;

function getYear(value?: string): number | null {
  if (!value) return null;
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function detectBasicType(item: TmdbListItem): MovieType {
  const mediaType = item.media_type ?? (item.title ? 'movie' : 'tv');
  return mediaType === 'tv' ? 'series' : 'film';
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const parsed = Number(value.replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function getDiscoveryMaxPage() {
  const rawValue = Number(process.env.KINOLUMA_DISCOVERY_MAX_PAGE);
  const value = Number.isFinite(rawValue) && rawValue > 0 ? rawValue : DEFAULT_DISCOVERY_MAX_PAGE;

  return Math.max(2, Math.min(Math.trunc(value), 100));
}

function getRotatingPage(offset: number) {
  const maxPage = getDiscoveryMaxPage();
  const dayNumber = Math.floor(Date.now() / 86_400_000);

  return ((dayNumber + offset) % maxPage) + 1;
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

function getCandidateSkipReason(candidate: NormalizedCandidate) {
  const raw = candidate.raw_json;
  const releaseDate = String(raw.release_date ?? raw.first_air_date ?? '').trim();
  const rating = getNumber(raw.vote_average) ?? 0;
  const voteCount = getNumber(raw.vote_count) ?? 0;
  const hasImage = Boolean(raw.poster_path || raw.backdrop_path);

  if (!candidate.title) return 'Нет названия';
  if (!releaseDate) return 'Нет даты выхода в TMDB';
  if (releaseDate > todayIsoDate()) return 'Фильм ещё не вышел';
  if (!hasImage) return 'Нет постера или backdrop';
  if (rating < MIN_DISCOVERY_RATING || voteCount < MIN_DISCOVERY_VOTE_COUNT) {
    return 'Слишком слабый или пустой рейтинг TMDB';
  }

  return null;
}

function buildEndpoints() {
  const today = todayIsoDate();
  const moviePage = getRotatingPage(0);
  const moviePage2 = getRotatingPage(5);
  const tvPage = getRotatingPage(9);
  const tvPage2 = getRotatingPage(14);

  return [
    { path: `/trending/movie/day?language=ru-RU&page=${moviePage}`, mediaType: 'movie' as const },
    { path: `/trending/tv/day?language=ru-RU&page=${tvPage}`, mediaType: 'tv' as const },
    { path: `/movie/popular?language=ru-RU&page=${moviePage2}`, mediaType: 'movie' as const },
    { path: `/tv/popular?language=ru-RU&page=${tvPage2}`, mediaType: 'tv' as const },
    {
      path: `/discover/movie?language=ru-RU&sort_by=popularity.desc&include_adult=false&include_video=false&vote_count.gte=${MIN_DISCOVERY_VOTE_COUNT}&vote_average.gte=${MIN_DISCOVERY_RATING}&primary_release_date.lte=${today}&page=${getRotatingPage(19)}`,
      mediaType: 'movie' as const,
    },
    {
      path: `/discover/tv?language=ru-RU&sort_by=popularity.desc&include_adult=false&vote_count.gte=${MIN_DISCOVERY_VOTE_COUNT}&vote_average.gte=${MIN_DISCOVERY_RATING}&first_air_date.lte=${today}&page=${getRotatingPage(24)}`,
      mediaType: 'tv' as const,
    },
  ];
}

async function refreshNewCandidateRawJson(candidate: NormalizedCandidate) {
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

async function markExistingCandidateAsDuplicate(candidate: NormalizedCandidate, reason: unknown) {
  const rawJson = candidate.raw_json && typeof candidate.raw_json === 'object'
    ? candidate.raw_json
    : {};

  const { error } = await supabaseAdmin
    .from('import_candidates')
    .update({
      status: 'duplicate',
      raw_json: {
        ...rawJson,
        kinoluma_duplicate: reason,
      },
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
    const endpoints = buildEndpoints();
    const responses = await Promise.all(
      endpoints.map(async (endpoint) => ({
        ...endpoint,
        data: await tmdbFetch<TmdbListResponse>(endpoint.path),
      })),
    );

    const candidatesByKey = new Map<string, NormalizedCandidate>();
    let skippedUnsafeCount = 0;

    for (const response of responses) {
      for (const item of response.data.results ?? []) {
        const candidate = normalizeCandidate(item, response.mediaType);
        const skipReason = getCandidateSkipReason(candidate);

        if (skipReason) {
          skippedUnsafeCount += 1;
          continue;
        }

        candidatesByKey.set(`${candidate.source}:${candidate.source_id}`, candidate);
      }
    }

    const candidates = Array.from(candidatesByKey.values());
    const freshCandidates: NormalizedCandidate[] = [];
    let skippedDuplicateCount = 0;

    for (const candidate of candidates) {
      const duplicate = await findDuplicateMovie(buildCandidateDuplicateInput(candidate));

      if (duplicate.isDuplicate) {
        skippedDuplicateCount += 1;
        await markExistingCandidateAsDuplicate(candidate, serializeDuplicateMatch(duplicate));
        continue;
      }

      freshCandidates.push(candidate);
    }

    if (freshCandidates.length > 0) {
      const { error } = await supabaseAdmin
        .from('import_candidates')
        .upsert(freshCandidates, {
          onConflict: 'source,source_id',
          ignoreDuplicates: true,
        });

      if (error) throw error;

      await Promise.all(freshCandidates.map((candidate) => refreshNewCandidateRawJson(candidate)));
    }

    await supabaseAdmin
      .from('movie_import_runs')
      .update({
        status: 'finished',
        finished_at: new Date().toISOString(),
        found_count: freshCandidates.length,
        log: [
          {
            message: 'TMDB discovery finished',
            at: new Date().toISOString(),
            foundCount: freshCandidates.length,
            scannedCount: candidates.length,
            skippedDuplicateCount,
            skippedUnsafeCount,
            endpoints: endpoints.map((endpoint) => endpoint.path),
          },
        ],
      })
      .eq('id', runId);

    return {
      runId,
      foundCount: freshCandidates.length,
      scannedCount: candidates.length,
      skippedDuplicateCount,
      skippedUnsafeCount,
    };
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
