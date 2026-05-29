import { movies } from '../../data/movies';
import { supabaseAdmin } from '../supabase/admin';
import { generateSlug } from './generateSlug';

type DuplicateSource = 'static_movie' | 'movie_draft';

export type DuplicateLookupInput = {
  tmdbId?: number | string | null;
  kinopoiskId?: number | string | null;
  imdbId?: string | null;
  slug?: string | null;
  title?: string | null;
  originalTitle?: string | null;
  year?: number | string | null;
  sourceId?: string | null;
  rawJson?: unknown;
  excludeDraftId?: string | null;
};

export type DuplicateMatch = {
  isDuplicate: boolean;
  reason: string | null;
  matchedSource: DuplicateSource | null;
  matchedId: string | number | null;
  matchedTitle: string | null;
  matchedSlug: string | null;
  matchedField: string | null;
};

type DuplicateGuardOptions = {
  includeDrafts?: boolean;
};

type DraftDuplicateRow = {
  id: string;
  title: string | null;
  original_title: string | null;
  slug: string | null;
  year: number | null;
  tmdb_id: number | null;
  kinopoisk_id: number | null;
  imdb_id: string | null;
  status: string | null;
};

const EMPTY_DUPLICATE: DuplicateMatch = {
  isDuplicate: false,
  reason: null,
  matchedSource: null,
  matchedId: null,
  matchedTitle: null,
  matchedSlug: null,
  matchedField: null,
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toCleanString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toCleanNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toCleanInt(value: unknown) {
  const number = toCleanNumber(value);
  return number === null ? null : Math.trunc(number);
}

function normalizeTitle(value: string | null | undefined) {
  if (!value) return '';

  return value
    .toLowerCase()
    .replaceAll('ё', 'е')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/№/g, ' number ')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeImdbId(value: string | null | undefined) {
  const clean = toCleanString(value);
  return clean ? clean.toLowerCase() : null;
}

function getYearNumber(value: unknown) {
  const year = toCleanInt(value);
  if (year === null || year < 1800 || year > 2200) return null;
  return year;
}

function getInputTitles(input: DuplicateLookupInput) {
  return [input.title, input.originalTitle]
    .map((value) => normalizeTitle(value ?? null))
    .filter(Boolean);
}

function yearsMatch(left: number | null, right: number | string | null | undefined) {
  const rightYear = getYearNumber(right);
  if (!left || !rightYear) return false;
  return Math.abs(left - rightYear) <= 1;
}

function stripYearSuffix(value: string | null | undefined) {
  const clean = toCleanString(value);
  if (!clean) return null;
  return clean.replace(/-?(18|19|20|21|22)\d{2}$/g, '').replace(/-+$/g, '') || clean;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => toCleanString(value))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function getSlugVariants(value: string | null | undefined, year?: number | string | null) {
  const clean = toCleanString(value);
  if (!clean) return [];

  const cleanYear = getYearNumber(year ?? null);
  const generatedNoYear = generateSlug(clean);
  const generatedWithYear = cleanYear ? generateSlug(clean, cleanYear) : null;

  return uniqueStrings([
    clean,
    stripYearSuffix(clean),
    generatedNoYear,
    generatedWithYear,
    stripYearSuffix(generatedWithYear),
  ]);
}

function getMovieSlugVariants(movie: (typeof movies)[number]) {
  const searchTitles = Array.isArray(movie.searchTitles) ? movie.searchTitles : [];

  return uniqueStrings([
    movie.slug,
    stripYearSuffix(movie.slug),
    ...getSlugVariants(movie.title, movie.year),
    ...getSlugVariants(movie.originalTitle, movie.year),
    ...searchTitles.flatMap((title) => getSlugVariants(title, movie.year)),
  ]);
}

function getInputSlugVariants(input: DuplicateLookupInput) {
  return uniqueStrings([
    input.slug ?? null,
    stripYearSuffix(input.slug ?? null),
    ...getSlugVariants(input.title ?? null, input.year),
    ...getSlugVariants(input.originalTitle ?? null, input.year),
  ]);
}

function hasIntersection(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

function getRawValue(rawJson: unknown, keys: string[]) {
  let current: unknown = asRecord(rawJson);

  for (const key of keys) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return null;
    current = (current as Record<string, unknown>)[key];
  }

  return current ?? null;
}

function getInputTmdbId(input: DuplicateLookupInput) {
  return (
    toCleanInt(input.tmdbId) ??
    parseTmdbIdFromSourceId(input.sourceId) ??
    toCleanInt(getRawValue(input.rawJson, ['id'])) ??
    toCleanInt(getRawValue(input.rawJson, ['tmdb_id'])) ??
    toCleanInt(getRawValue(input.rawJson, ['tmdbId']))
  );
}

function getInputKinopoiskId(input: DuplicateLookupInput) {
  return (
    toCleanInt(input.kinopoiskId) ??
    toCleanInt(getRawValue(input.rawJson, ['kinopoisk_id'])) ??
    toCleanInt(getRawValue(input.rawJson, ['kinopoiskId'])) ??
    toCleanInt(getRawValue(input.rawJson, ['id_kinopoisk'])) ??
    toCleanInt(getRawValue(input.rawJson, ['external_ids', 'kinopoisk_id']))
  );
}

function getInputImdbId(input: DuplicateLookupInput) {
  return normalizeImdbId(
    input.imdbId ??
      (getRawValue(input.rawJson, ['imdb_id']) as string | null) ??
      (getRawValue(input.rawJson, ['imdbId']) as string | null) ??
      (getRawValue(input.rawJson, ['external_ids', 'imdb_id']) as string | null),
  );
}

function getStaticMovieImdbId(movie: (typeof movies)[number]) {
  const record = movie as unknown as Record<string, unknown>;
  const direct = normalizeImdbId(record.imdbId as string | null | undefined);
  if (direct) return direct;

  const facts = Array.isArray(movie.facts) ? movie.facts : [];
  for (const fact of facts) {
    if (!fact || typeof fact !== 'object') continue;
    const label = normalizeTitle(String((fact as { label?: unknown }).label ?? ''));
    if (label !== 'imdb') continue;

    const value = normalizeImdbId(String((fact as { value?: unknown }).value ?? ''));
    if (value) return value;
  }

  return null;
}

function getStaticMovieTmdbId(movie: (typeof movies)[number]) {
  const record = movie as unknown as Record<string, unknown>;
  return toCleanInt(record.tmdbId ?? record.tmdb_id ?? null);
}

function staticMovieMatches(input: DuplicateLookupInput): DuplicateMatch | null {
  const inputTmdbId = getInputTmdbId(input);
  const inputKinopoiskId = getInputKinopoiskId(input);
  const inputImdbId = getInputImdbId(input);
  const inputTitles = getInputTitles(input);
  const inputSlugVariants = getInputSlugVariants(input);

  for (const movie of movies) {
    const movieYear = getYearNumber(movie.year);
    const movieTmdbId = getStaticMovieTmdbId(movie);
    const movieImdbId = getStaticMovieImdbId(movie);

    if (inputTmdbId && movieTmdbId && movieTmdbId === inputTmdbId) {
      return {
        isDuplicate: true,
        reason: `Уже есть в movies.ts: совпал TMDB ID ${inputTmdbId}`,
        matchedSource: 'static_movie',
        matchedId: movie.id,
        matchedTitle: movie.title,
        matchedSlug: movie.slug,
        matchedField: 'tmdbId',
      };
    }

    if (inputKinopoiskId && movie.kinopoiskId === inputKinopoiskId) {
      return {
        isDuplicate: true,
        reason: `Уже есть в movies.ts: совпал kinopoiskId ${inputKinopoiskId}`,
        matchedSource: 'static_movie',
        matchedId: movie.id,
        matchedTitle: movie.title,
        matchedSlug: movie.slug,
        matchedField: 'kinopoiskId',
      };
    }

    if (inputImdbId && movieImdbId && movieImdbId === inputImdbId) {
      return {
        isDuplicate: true,
        reason: `Уже есть в movies.ts: совпал IMDb ID ${inputImdbId}`,
        matchedSource: 'static_movie',
        matchedId: movie.id,
        matchedTitle: movie.title,
        matchedSlug: movie.slug,
        matchedField: 'imdbId',
      };
    }

    const movieSlugVariants = getMovieSlugVariants(movie);
    const slugMatched = inputSlugVariants.length > 0 && hasIntersection(inputSlugVariants, movieSlugVariants);

    if (slugMatched && (!input.year || !movieYear || yearsMatch(movieYear, input.year))) {
      return {
        isDuplicate: true,
        reason: `Уже есть в movies.ts: совпал slug/slug без года`,
        matchedSource: 'static_movie',
        matchedId: movie.id,
        matchedTitle: movie.title,
        matchedSlug: movie.slug,
        matchedField: 'slug',
      };
    }

    if (inputTitles.length && yearsMatch(movieYear, input.year)) {
      const movieTitles = [movie.title, movie.originalTitle, ...(movie.searchTitles ?? [])]
        .map((value) => normalizeTitle(value))
        .filter(Boolean);

      const titleMatches = inputTitles.some((inputTitle) =>
        movieTitles.some((movieTitle) => inputTitle === movieTitle),
      );

      if (titleMatches) {
        return {
          isDuplicate: true,
          reason: `Уже есть в movies.ts: совпали название и год`,
          matchedSource: 'static_movie',
          matchedId: movie.id,
          matchedTitle: movie.title,
          matchedSlug: movie.slug,
          matchedField: 'title+year',
        };
      }
    }
  }

  return null;
}

async function findDraftByExactField(
  column: 'tmdb_id' | 'kinopoisk_id' | 'imdb_id' | 'slug',
  value: string | number | null,
  input: DuplicateLookupInput,
): Promise<DuplicateMatch | null> {
  if (value === null || value === '') return null;

  let query = supabaseAdmin
    .from('movie_drafts')
    .select('id,title,slug,status')
    .eq(column, value)
    .neq('status', 'deleted')
    .limit(1);

  if (input.excludeDraftId) {
    query = query.neq('id', input.excludeDraftId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;

  if (!data) return null;

  return {
    isDuplicate: true,
    reason: `Уже есть в movie_drafts: совпал ${column}`,
    matchedSource: 'movie_draft',
    matchedId: String(data.id),
    matchedTitle: typeof data.title === 'string' ? data.title : null,
    matchedSlug: typeof data.slug === 'string' ? data.slug : null,
    matchedField: column,
  };
}

async function findDraftBySlugBase(input: DuplicateLookupInput): Promise<DuplicateMatch | null> {
  const inputSlugVariants = getInputSlugVariants(input);
  const inputYear = getYearNumber(input.year);

  if (!inputSlugVariants.length) return null;

  let query = supabaseAdmin
    .from('movie_drafts')
    .select('id,title,original_title,slug,year,status')
    .neq('status', 'deleted')
    .limit(500);

  if (inputYear) {
    query = query.in('year', [inputYear - 1, inputYear, inputYear + 1]);
  }

  if (input.excludeDraftId) {
    query = query.neq('id', input.excludeDraftId);
  }

  const { data, error } = await query;
  if (error) throw error;

  for (const draft of (data ?? []) as DraftDuplicateRow[]) {
    const draftSlugVariants = uniqueStrings([
      draft.slug,
      stripYearSuffix(draft.slug),
      ...getSlugVariants(draft.title, draft.year),
      ...getSlugVariants(draft.original_title, draft.year),
    ]);

    if (!hasIntersection(inputSlugVariants, draftSlugVariants)) continue;

    return {
      isDuplicate: true,
      reason: 'Уже есть в movie_drafts: совпал slug/slug без года',
      matchedSource: 'movie_draft',
      matchedId: draft.id,
      matchedTitle: draft.title,
      matchedSlug: draft.slug,
      matchedField: 'slug',
    };
  }

  return null;
}

async function findDraftByTitleAndYear(input: DuplicateLookupInput): Promise<DuplicateMatch | null> {
  const inputTitles = getInputTitles(input);
  const inputYear = getYearNumber(input.year);

  if (!inputTitles.length || !inputYear) return null;

  let query = supabaseAdmin
    .from('movie_drafts')
    .select('id,title,original_title,slug,year,status')
    .neq('status', 'deleted')
    .in('year', [inputYear - 1, inputYear, inputYear + 1])
    .limit(500);

  if (input.excludeDraftId) {
    query = query.neq('id', input.excludeDraftId);
  }

  const { data, error } = await query;
  if (error) throw error;

  for (const draft of (data ?? []) as DraftDuplicateRow[]) {
    const draftTitles = [draft.title, draft.original_title]
      .map((value) => normalizeTitle(value ?? null))
      .filter(Boolean);

    const titleMatches = inputTitles.some((inputTitle) =>
      draftTitles.some((draftTitle) => inputTitle === draftTitle),
    );

    if (titleMatches) {
      return {
        isDuplicate: true,
        reason: 'Уже есть в movie_drafts: совпали название и год',
        matchedSource: 'movie_draft',
        matchedId: draft.id,
        matchedTitle: draft.title,
        matchedSlug: draft.slug,
        matchedField: 'title+year',
      };
    }
  }

  return null;
}

export function parseTmdbIdFromSourceId(sourceId: string | null | undefined) {
  const source = toCleanString(sourceId);
  if (!source) return null;

  const [mediaType, rawId] = source.split(':');
  if (mediaType !== 'movie' && mediaType !== 'tv') return null;

  const id = toCleanInt(rawId);
  return id && id > 0 ? id : null;
}

export function buildCandidateDuplicateInput(candidate: {
  source_id?: string | null;
  title?: string | null;
  original_title?: string | null;
  year?: number | string | null;
  raw_json?: unknown;
}) {
  const title = candidate.title ?? null;
  const year = getYearNumber(candidate.year ?? null);

  return {
    tmdbId: parseTmdbIdFromSourceId(candidate.source_id),
    slug: title ? generateSlug(title, year) : null,
    title,
    originalTitle: candidate.original_title ?? null,
    year,
    sourceId: candidate.source_id ?? null,
    rawJson: candidate.raw_json ?? null,
  } satisfies DuplicateLookupInput;
}

export async function findDuplicateMovie(
  input: DuplicateLookupInput,
  options: DuplicateGuardOptions = {},
): Promise<DuplicateMatch> {
  const includeDrafts = options.includeDrafts ?? true;
  const inputTmdbId = getInputTmdbId(input);
  const inputKinopoiskId = getInputKinopoiskId(input);
  const inputImdbId = getInputImdbId(input);
  const inputSlug = toCleanString(input.slug);

  const normalizedInput = {
    ...input,
    tmdbId: inputTmdbId,
    kinopoiskId: inputKinopoiskId,
    imdbId: inputImdbId,
    slug: inputSlug,
  } satisfies DuplicateLookupInput;

  const staticMatch = staticMovieMatches(normalizedInput);
  if (staticMatch) return staticMatch;
  if (!includeDrafts) return EMPTY_DUPLICATE;

  const exactChecks: Array<{
    column: 'tmdb_id' | 'kinopoisk_id' | 'imdb_id' | 'slug';
    value: string | number | null;
  }> = [
    { column: 'tmdb_id', value: inputTmdbId },
    { column: 'kinopoisk_id', value: inputKinopoiskId },
    { column: 'imdb_id', value: inputImdbId },
    { column: 'slug', value: inputSlug },
  ];

  for (const check of exactChecks) {
    const match = await findDraftByExactField(check.column, check.value, normalizedInput);
    if (match) return match;
  }

  const draftSlugBaseMatch = await findDraftBySlugBase(normalizedInput);
  if (draftSlugBaseMatch) return draftSlugBaseMatch;

  const titleYearMatch = await findDraftByTitleAndYear(normalizedInput);
  if (titleYearMatch) return titleYearMatch;

  return EMPTY_DUPLICATE;
}

export function serializeDuplicateMatch(match: DuplicateMatch) {
  return {
    isDuplicate: match.isDuplicate,
    reason: match.reason,
    matchedSource: match.matchedSource,
    matchedId: match.matchedId,
    matchedTitle: match.matchedTitle,
    matchedSlug: match.matchedSlug,
    matchedField: match.matchedField,
    checkedAt: new Date().toISOString(),
  };
}
