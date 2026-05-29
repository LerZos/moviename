import { tmdbFetch, tmdbImage } from './tmdb';
import type { ImportCandidate, MovieFacts, MovieType } from './types';

type TmdbGenre = { id: number; name: string };
type TmdbCreditPerson = { name?: string; job?: string; known_for_department?: string };

type TmdbDetails = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  genres?: TmdbGenre[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  original_language?: string;
  credits?: {
    cast?: TmdbCreditPerson[];
    crew?: TmdbCreditPerson[];
  };
  created_by?: Array<{ name?: string }>;
  videos?: { results?: unknown[] };
  external_ids?: {
    imdb_id?: string | null;
  };
};

type KinopoiskSearchResponse = {
  docs?: Array<{
    id?: number;
    name?: string;
    alternativeName?: string;
    description?: string;
    year?: number;
    genres?: Array<{ name?: string }>;
    persons?: Array<{ name?: string; enName?: string; profession?: string; enProfession?: string }>;
    videos?: unknown;
    externalId?: {
      imdb?: string;
      tmdb?: number;
    };
  }>;
};

function getYear(value?: string): number | null {
  if (!value) return null;
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function isLikelyKinopoiskMatch(
  doc: NonNullable<KinopoiskSearchResponse['docs']>[number],
  title: string,
  originalTitle: string | null,
  year: number | null,
): boolean {
  const expectedNames = [title, originalTitle].filter(Boolean).map((value) => normalizeText(String(value)));
  const actualNames = [doc.name, doc.alternativeName].filter(Boolean).map((value) => normalizeText(String(value)));

  const titleMatches = actualNames.some((actual) =>
    expectedNames.some((expected) => actual === expected || actual.includes(expected) || expected.includes(actual)),
  );

  const yearMatches = !doc.year || !year || Math.abs(doc.year - year) <= 1;

  return titleMatches && yearMatches;
}

function detectType(details: TmdbDetails, mediaType: 'movie' | 'tv'): MovieType {
  const genres = (details.genres ?? []).map((genre) => normalizeText(genre.name));
  const hasAnimation = genres.some((genre) => genre.includes('animation') || genre.includes('мульт'));
  const hasDocumentary = genres.some((genre) => genre.includes('documentary') || genre.includes('документ'));

  if (hasDocumentary) return 'documentary';
  if (hasAnimation && details.original_language === 'ja') return 'anime';
  if (hasAnimation) return 'cartoon';
  if (mediaType === 'tv') return 'series';
  return 'film';
}

async function fetchKinopoiskByTitle(
  title: string,
  originalTitle: string | null,
  year: number | null,
): Promise<NonNullable<KinopoiskSearchResponse['docs']>[number] | null> {
  const token = process.env.KINOPOISK_DEV_TOKEN;
  if (!token || !title) return null;

  const url = new URL('https://api.kinopoisk.dev/v1.4/movie/search');
  url.searchParams.set('query', title);
  url.searchParams.set('limit', '1');
  url.searchParams.set('page', '1');

  const response = await fetch(url.toString(), {
    headers: {
      'X-API-KEY': token,
      accept: 'application/json',
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as KinopoiskSearchResponse;
  const firstMatch = data.docs?.find((doc) => isLikelyKinopoiskMatch(doc, title, originalTitle, year));

  return firstMatch ?? null;
}


function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const parsed = Number(value.replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanInt(value: unknown) {
  const numberValue = cleanNumber(value);
  return numberValue === null ? null : Math.trunc(numberValue);
}

function cleanStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanString(typeof item === 'object' && item !== null ? (item as Record<string, unknown>).name : item))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function detectVibixType(value: unknown): MovieType {
  const type = cleanString(value).toLowerCase();
  if (type === 'serial' || type === 'series' || type === 'tv') return 'series';
  return 'film';
}

function getVibixMovieFacts(candidate: ImportCandidate): MovieFacts {
  const raw = asRecord(candidate.raw_json);
  const vibix = asRecord(raw.vibix || raw);
  const kinoluma = asRecord(raw.kinoluma);
  const title = cleanString(vibix.name_rus) || cleanString(vibix.name) || cleanString(candidate.title) || `Vibix ${cleanString(vibix.id)}`;
  const originalTitle = cleanString(vibix.name_original) || cleanString(vibix.name_eng) || candidate.original_title || null;
  const year = cleanInt(vibix.year) ?? candidate.year ?? null;
  const kinopoiskId = cleanInt(vibix.kp_id) ?? cleanInt(vibix.kinopoisk_id) ?? cleanInt(raw.kp_id) ?? cleanInt(raw.kinopoisk_id);
  const imdbId = cleanString(vibix.imdb_id) || cleanString(raw.imdb_id) || null;

  return {
    title,
    originalTitle,
    year,
    type: detectVibixType(vibix.type || candidate.type),
    genres: cleanStringArray(vibix.genre),
    posterUrl: cleanString(vibix.poster_url) || null,
    backdropUrl: cleanString(vibix.backdrop_url) || null,
    tmdbId: null,
    kinopoiskId,
    imdbId,
    actors: [],
    directors: [],
    description: cleanString(vibix.description) || cleanString(vibix.description_short) || null,
    source: 'vibix',
    rawJson: {
      candidate,
      vibix,
      kinoluma,
    },
  };
}

export async function fetchMovieFacts(candidate: ImportCandidate): Promise<MovieFacts> {
  if (candidate.source === 'vibix' || candidate.source_id.startsWith('vibix:')) {
    return getVibixMovieFacts(candidate);
  }

  const [mediaTypeFromSource, idFromSource] = candidate.source_id.split(':') as ['movie' | 'tv', string];
  const mediaType = mediaTypeFromSource === 'tv' ? 'tv' : 'movie';
  const tmdbId = Number(idFromSource);

  if (!Number.isFinite(tmdbId)) {
    throw new Error(`Invalid TMDB source_id: ${candidate.source_id}`);
  }

  const details = await tmdbFetch<TmdbDetails>(
    `/${mediaType}/${tmdbId}?language=ru-RU&append_to_response=credits,videos,external_ids`,
  );

  const title = details.title ?? details.name ?? candidate.title;
  const originalTitle = details.original_title ?? details.original_name ?? candidate.original_title ?? null;
  const year = getYear(details.release_date ?? details.first_air_date) ?? candidate.year ?? null;
  const kinopoisk = await fetchKinopoiskByTitle(title, originalTitle, year);

  const genresFromTmdb = (details.genres ?? []).map((genre) => genre.name).filter(Boolean);
  const genresFromKinopoisk = (kinopoisk?.genres ?? []).map((genre) => genre.name).filter(Boolean) as string[];
  const genres = Array.from(new Set([...genresFromKinopoisk, ...genresFromTmdb]));

  const actors = Array.from(
    new Set([
      ...((kinopoisk?.persons ?? [])
        .filter((person) => person.profession === 'актеры' || person.enProfession === 'actor')
        .map((person) => person.name ?? person.enName)
        .filter(Boolean) as string[]),
      ...((details.credits?.cast ?? []).slice(0, 10).map((person) => person.name).filter(Boolean) as string[]),
    ]),
  ).slice(0, 12);

  const directors = Array.from(
    new Set([
      ...((kinopoisk?.persons ?? [])
        .filter((person) => person.profession === 'режиссеры' || person.enProfession === 'director')
        .map((person) => person.name ?? person.enName)
        .filter(Boolean) as string[]),
      ...((details.credits?.crew ?? [])
        .filter((person) => person.job === 'Director')
        .map((person) => person.name)
        .filter(Boolean) as string[]),
      ...((details.created_by ?? []).map((person) => person.name).filter(Boolean) as string[]),
    ]),
  ).slice(0, 8);

  const imdbId = details.external_ids?.imdb_id ?? kinopoisk?.externalId?.imdb ?? null;
  const kinopoiskId = typeof kinopoisk?.id === 'number' ? kinopoisk.id : null;

  return {
    title,
    originalTitle,
    year,
    type: detectType(details, mediaType),
    genres,
    posterUrl: tmdbImage(details.poster_path, 'w500'),
    backdropUrl: tmdbImage(details.backdrop_path, 'w780'),
    tmdbId,
    kinopoiskId,
    imdbId,
    actors,
    directors,
    description: kinopoisk?.description ?? details.overview ?? null,
    source: kinopoisk ? 'tmdb+kinopoisk' : 'tmdb',
    rawJson: {
      candidate,
      tmdb: details,
      kinopoisk,
    },
  };
}
