import type { MovieType } from './types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const KINOPOISK_BASE_URL = 'https://api.kinopoisk.dev/v1.4';

export type MovieImageLookupInput = {
  title?: string | null;
  originalTitle?: string | null;
  year?: number | string | null;
  type?: MovieType | string | null;
  kinopoiskId?: number | string | null;
  imdbId?: string | null;
};

export type MovieImageLookupResult = {
  posterUrl: string | null;
  backdropUrl: string | null;
  source: 'kinopoisk' | 'tmdb' | null;
  kinopoiskId?: number | null;
  tmdbId?: number | null;
};

type KinopoiskImage = {
  url?: string | null;
  previewUrl?: string | null;
};

type KinopoiskDoc = {
  id?: number | null;
  name?: string | null;
  alternativeName?: string | null;
  enName?: string | null;
  year?: number | null;
  poster?: KinopoiskImage | null;
  backdrop?: KinopoiskImage | null;
};

type KinopoiskSearchResponse = {
  docs?: KinopoiskDoc[];
};

type TmdbSearchItem = {
  id?: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
};

type TmdbSearchResponse = {
  results?: TmdbSearchItem[];
};

type TmdbFindResponse = {
  movie_results?: TmdbSearchItem[];
  tv_results?: TmdbSearchItem[];
};

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

function normalizeText(value: unknown) {
  return cleanString(value)
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getYearFromDate(value: unknown) {
  const text = cleanString(value);
  if (!text) return null;

  const year = Number(text.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function buildTmdbImage(path: unknown, size: 'w500' | 'w780' | 'original') {
  const text = cleanString(path);
  if (!text) return null;
  if (text.startsWith('http')) return text;
  if (!text.startsWith('/')) return null;

  return `${TMDB_IMAGE_BASE_URL}/${size}${text}`;
}

function cleanImageUrl(value: unknown) {
  const text = cleanString(value);
  if (!text) return null;
  if (text.startsWith('//')) return `https:${text}`;
  if (!/^https?:\/\//i.test(text)) return null;

  return text;
}

function getKinopoiskImage(image: KinopoiskImage | null | undefined) {
  return cleanImageUrl(image?.url) || cleanImageUrl(image?.previewUrl);
}

function isSeriesLike(type: MovieImageLookupInput['type']) {
  const value = normalizeText(type);
  return value === 'series' || value === 'serial' || value === 'tv' || value.includes('сериал');
}

function looksLikeSameMovie(
  candidateNames: Array<string | null | undefined>,
  expectedNames: Array<string | null | undefined>,
  candidateYear: number | null,
  expectedYear: number | null,
) {
  const expected = expectedNames.map(normalizeText).filter(Boolean);
  const actual = candidateNames.map(normalizeText).filter(Boolean);

  if (!expected.length || !actual.length) return false;

  const titleMatches = actual.some((actualName) =>
    expected.some(
      (expectedName) =>
        actualName === expectedName ||
        actualName.includes(expectedName) ||
        expectedName.includes(actualName),
    ),
  );

  const yearMatches = !candidateYear || !expectedYear || Math.abs(candidateYear - expectedYear) <= 1;

  return titleMatches && yearMatches;
}

function normalizeImdbId(value: unknown) {
  const text = cleanString(value).replace(/^imdb:/i, '');
  if (!text) return '';

  const match = text.match(/tt\d+|\d+/i);
  if (!match) return '';

  const id = match[0].toLowerCase();
  return id.startsWith('tt') ? id : `tt${id}`;
}

function getTmdbToken() {
  return cleanString(process.env.TMDB_ACCESS_TOKEN);
}

function getTmdbApiKey() {
  return cleanString(process.env.TMDB_API_KEY);
}

async function tmdbRequest<T>(path: string): Promise<T | null> {
  const token = getTmdbToken();
  const apiKey = getTmdbApiKey();

  if (!token && !apiKey) return null;

  const url = new URL(path.startsWith('http') ? path : `${TMDB_BASE_URL}${path}`);
  if (!token && apiKey) url.searchParams.set('api_key', apiKey);

  try {
    const response = await fetch(url.toString(), {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
            accept: 'application/json',
          }
        : { accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.warn('[KinoLuma import] TMDB image lookup failed:', error);
    return null;
  }
}

function imageResultFromTmdbItem(item: TmdbSearchItem | null | undefined): MovieImageLookupResult | null {
  if (!item) return null;

  const posterUrl = buildTmdbImage(item.poster_path, 'w500');
  const backdropUrl = buildTmdbImage(item.backdrop_path, 'w780');

  if (!posterUrl && !backdropUrl) return null;

  return {
    posterUrl,
    backdropUrl,
    source: 'tmdb',
    tmdbId: typeof item.id === 'number' ? item.id : null,
  };
}

async function findTmdbImages(input: MovieImageLookupInput): Promise<MovieImageLookupResult | null> {
  const imdbId = normalizeImdbId(input.imdbId);
  const expectedYear = cleanInt(input.year);
  const expectedNames = [input.title, input.originalTitle];
  const mediaType = isSeriesLike(input.type) ? 'tv' : 'movie';

  if (imdbId) {
    const found = await tmdbRequest<TmdbFindResponse>(`/find/${encodeURIComponent(imdbId)}?external_source=imdb_id&language=ru-RU`);
    const exactItem = mediaType === 'tv' ? found?.tv_results?.[0] : found?.movie_results?.[0];
    const exactResult = imageResultFromTmdbItem(exactItem);
    if (exactResult) return exactResult;
  }

  const query = cleanString(input.title) || cleanString(input.originalTitle);
  if (!query) return null;

  const searchUrl = new URL(`${TMDB_BASE_URL}/search/${mediaType}`);
  searchUrl.searchParams.set('language', 'ru-RU');
  searchUrl.searchParams.set('query', query);
  searchUrl.searchParams.set('include_adult', 'false');
  searchUrl.searchParams.set('page', '1');

  if (expectedYear) {
    if (mediaType === 'tv') {
      searchUrl.searchParams.set('first_air_date_year', String(expectedYear));
    } else {
      searchUrl.searchParams.set('year', String(expectedYear));
      searchUrl.searchParams.set('primary_release_year', String(expectedYear));
    }
  }

  const search = await tmdbRequest<TmdbSearchResponse>(searchUrl.toString());
  const results = Array.isArray(search?.results) ? search.results : [];
  const matched =
    results.find((item) =>
      looksLikeSameMovie(
        [item.title, item.name, item.original_title, item.original_name],
        expectedNames,
        getYearFromDate(item.release_date || item.first_air_date),
        expectedYear,
      ),
    ) || results.find((item) => item.poster_path || item.backdrop_path);

  return imageResultFromTmdbItem(matched);
}

function getKinopoiskToken() {
  return cleanString(process.env.KINOPOISK_DEV_TOKEN) || cleanString(process.env.KINOPOISK_API_KEY);
}

async function kinopoiskRequest<T>(path: string): Promise<T | null> {
  const token = getKinopoiskToken();
  if (!token) return null;

  try {
    const response = await fetch(path.startsWith('http') ? path : `${KINOPOISK_BASE_URL}${path}`, {
      headers: {
        'X-API-KEY': token,
        accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.warn('[KinoLuma import] Kinopoisk image lookup failed:', error);
    return null;
  }
}

function imageResultFromKinopoiskDoc(doc: KinopoiskDoc | null | undefined): MovieImageLookupResult | null {
  if (!doc) return null;

  const posterUrl = getKinopoiskImage(doc.poster);
  const backdropUrl = getKinopoiskImage(doc.backdrop);

  if (!posterUrl && !backdropUrl) return null;

  return {
    posterUrl,
    backdropUrl,
    source: 'kinopoisk',
    kinopoiskId: typeof doc.id === 'number' ? doc.id : null,
  };
}

async function findKinopoiskImages(input: MovieImageLookupInput): Promise<MovieImageLookupResult | null> {
  const kpId = cleanInt(input.kinopoiskId);
  const expectedYear = cleanInt(input.year);
  const expectedNames = [input.title, input.originalTitle];

  if (kpId) {
    const exact = await kinopoiskRequest<KinopoiskDoc>(`/movie/${kpId}`);
    const exactResult = imageResultFromKinopoiskDoc(exact);
    if (exactResult) return exactResult;
  }

  const query = cleanString(input.title) || cleanString(input.originalTitle);
  if (!query) return null;

  const url = new URL(`${KINOPOISK_BASE_URL}/movie/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('limit', '5');
  url.searchParams.set('page', '1');

  const search = await kinopoiskRequest<KinopoiskSearchResponse>(url.toString());
  const docs = Array.isArray(search?.docs) ? search.docs : [];
  const matched =
    docs.find((doc) =>
      looksLikeSameMovie(
        [doc.name, doc.alternativeName, doc.enName],
        expectedNames,
        cleanInt(doc.year),
        expectedYear,
      ),
    ) || docs.find((doc) => doc.poster?.url || doc.poster?.previewUrl || doc.backdrop?.url || doc.backdrop?.previewUrl);

  return imageResultFromKinopoiskDoc(matched);
}

export async function findBestMovieImages(input: MovieImageLookupInput): Promise<MovieImageLookupResult> {
  const empty: MovieImageLookupResult = {
    posterUrl: null,
    backdropUrl: null,
    source: null,
  };

  const kinopoisk = await findKinopoiskImages(input);
  if (kinopoisk?.posterUrl || kinopoisk?.backdropUrl) return kinopoisk;

  const tmdb = await findTmdbImages(input);
  if (tmdb?.posterUrl || tmdb?.backdropUrl) return tmdb;

  return empty;
}
