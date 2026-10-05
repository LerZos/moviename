import { movies } from "../../data/movies";
import {
  CURATED_PACK_300_MAX_PAGES_PER_MODE,
  CURATED_PACK_300_MINIMUMS,
  CURATED_PACK_300_PAGE_SIZE,
  CURATED_PACK_300_QUOTAS,
  CURATED_PACK_300_VERSION,
  type CuratedPackQuota,
} from "../../data/curatedPack300Config";
import { mergeAutoPlayersIntoRawJson } from "../players";
import { supabaseAdmin } from "../supabase/admin";
import { findDuplicateMovie } from "./duplicateGuard";
import { generateSlug } from "./generateSlug";
import { tmdbFetch, tmdbImage } from "./tmdb";
import type { MovieType } from "./types";

const KINOPOISK_BASE_URL = "https://api.kinopoisk.dev/v1.4";
const DEFAULT_TARGET = 300;
const HARD_MAX_TARGET = 300;
const INSERT_CHUNK_SIZE = 40;
const ENRICH_CONCURRENCY = 5;

type DiscoveryMode = "popular" | "rated" | "recent" | "gems";

type CuratedPack300Options = {
  limit?: number;
  dryRun?: boolean;
  quotas?: Partial<CuratedPackQuota>;
};

type KinopoiskPerson = {
  name?: string | null;
  enName?: string | null;
  profession?: string | null;
  enProfession?: string | null;
  description?: string | null;
};

type KinopoiskDoc = {
  id?: number | string | null;
  name?: string | null;
  alternativeName?: string | null;
  enName?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  year?: number | string | null;
  type?: string | null;
  typeNumber?: number | string | null;
  isSeries?: boolean | null;
  movieLength?: number | string | null;
  seriesLength?: number | string | null;
  ageRating?: number | string | null;
  status?: string | null;
  genres?: Array<{ name?: string | null }>;
  countries?: Array<{ name?: string | null }>;
  poster?: { url?: string | null; previewUrl?: string | null } | null;
  backdrop?: { url?: string | null; previewUrl?: string | null } | null;
  rating?: {
    kp?: number | string | null;
    imdb?: number | string | null;
    tmdb?: number | string | null;
  } | null;
  votes?: {
    kp?: number | string | null;
    imdb?: number | string | null;
    tmdb?: number | string | null;
  } | null;
  externalId?: {
    imdb?: string | null;
    tmdb?: number | string | null;
  } | null;
  persons?: KinopoiskPerson[];
  productionCompanies?: Array<{ name?: string | null }>;
};

type KinopoiskListResponse = {
  docs?: KinopoiskDoc[];
  page?: number;
  pages?: number;
  total?: number;
};

type TmdbGenre = { id?: number; name?: string };
type TmdbCountry = { iso_3166_1?: string; name?: string };
type TmdbCompany = { id?: number; name?: string };
type TmdbNetwork = { id?: number; name?: string };
type TmdbCast = { name?: string; character?: string; order?: number };
type TmdbCrew = { name?: string; job?: string; department?: string };
type TmdbVideo = {
  key?: string;
  site?: string;
  type?: string;
  name?: string;
  official?: boolean;
  iso_639_1?: string;
  published_at?: string;
};

type TmdbDetails = {
  id?: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  status?: string;
  overview?: string;
  genres?: TmdbGenre[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_seasons?: number | null;
  number_of_episodes?: number | null;
  origin_country?: string[];
  production_countries?: TmdbCountry[];
  production_companies?: TmdbCompany[];
  networks?: TmdbNetwork[];
  vote_average?: number | null;
  vote_count?: number | null;
  original_language?: string | null;
  credits?: {
    cast?: TmdbCast[];
    crew?: TmdbCrew[];
  };
  created_by?: Array<{ name?: string }>;
  videos?: { results?: TmdbVideo[] };
  external_ids?: { imdb_id?: string | null };
  next_episode_to_air?: unknown;
};

type TmdbFindResponse = {
  movie_results?: TmdbDetails[];
  tv_results?: TmdbDetails[];
};

type ExistingDraftRow = {
  slug: string | null;
  title: string | null;
  original_title: string | null;
  year: number | null;
  tmdb_id: number | null;
  kinopoisk_id: number | null;
  imdb_id: string | null;
  status: string | null;
};

type ExistingKeys = {
  slugs: Set<string>;
  imdbIds: Set<string>;
  tmdbIds: Set<number>;
  kinopoiskIds: Set<number>;
  titleYears: Set<string>;
};

type Candidate = {
  doc: KinopoiskDoc;
  type: MovieType;
  score: number;
  discoveryMode: DiscoveryMode;
};

type CastItem = {
  name: string;
  role: string;
};

type FactItem = {
  label: string;
  value: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

type FullCard = {
  title: string;
  originalTitle: string;
  slug: string;
  type: "Фильм" | "Сериал" | "Аниме" | "Мультфильм" | "Документальный";
  year: number;
  genres: string[];
  country: string[];
  duration: string;
  rating: number | null;
  tmdbId: number | null;
  kinopoiskId: number;
  imdbId: string | null;
  description: string;
  longDescription: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    h1: string;
    seoText: string;
    keywords: string[];
  };
  faq: FaqItem[];
  facts: FactItem[];
  cast: CastItem[];
  crew: {
    directors: string[];
    writers: string[];
    studios: string[];
  };
  media: {
    posterUrl: string;
    backdropUrl: string;
    trailerUrl: string;
  };
  seasons?: number | null;
  episodes?: number | null;
  releaseStatus?: string | null;
  sourceMeta: {
    packVersion: string;
    discoveryMode: DiscoveryMode;
    generatedAt: string;
  };
};

type PreparedMovie = {
  card: FullCard;
  db: {
    title: string;
    original_title: string | null;
    slug: string;
    year: number;
    type: MovieType;
    genres: string[];
    poster_url: string | null;
    backdrop_url: string | null;
    tmdb_id: number | null;
    kinopoisk_id: number;
    imdb_id: string | null;
    actors: string[];
    directors: string[];
    description: string;
    long_description: string;
    seo_title: string;
    seo_description: string;
    faq: FaqItem[];
    trailer_provider: string | null;
    trailer_key: string | null;
    trailer_url: string | null;
    trailer_embed_url: string | null;
    trailer_source: string | null;
    trailer_confidence: number;
    trailer_status: "accepted" | "missing";
    similar_movie_ids: unknown[];
    source: string;
    raw_json: Record<string, unknown>;
    status: "published";
    quality_score: number;
    moderation_notes: string;
  };
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanInt(value: unknown) {
  const numberValue = cleanNumber(value);
  return numberValue === null ? null : Math.trunc(numberValue);
}

function clampRating(value: number | null) {
  if (value === null || value <= 0) return null;
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

function uniq(values: Array<string | null | undefined>, limit = 20) {
  return Array.from(
    new Set(values.map((value) => cleanString(value)).filter(Boolean)),
  ).slice(0, limit);
}

function normalize(value: unknown) {
  return cleanString(value)
    .toLowerCase()
    .replaceAll("ё", "е")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleYearKey(title: unknown, year: unknown) {
  const cleanTitle = normalize(title);
  const cleanYear = cleanInt(year);
  return cleanTitle && cleanYear ? `${cleanTitle}::${cleanYear}` : "";
}

function imageUrl(image: KinopoiskDoc["poster"] | KinopoiskDoc["backdrop"]) {
  return cleanString(image?.url) || cleanString(image?.previewUrl) || null;
}

function getKinopoiskToken() {
  return (
    cleanString(process.env.KINOPOISK_DEV_TOKEN) ||
    cleanString(process.env.KINOPOISK_API_KEY)
  );
}

async function kinopoiskRequest<T>(url: string): Promise<T> {
  const token = getKinopoiskToken();
  if (!token) {
    throw new Error("Нужен KINOPOISK_DEV_TOKEN или KINOPOISK_API_KEY");
  }

  const response = await fetch(url, {
    headers: { "X-API-KEY": token, accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kinopoisk request failed: ${response.status} ${text}`);
  }

  return (await response.json()) as T;
}

function appendKinopoiskFields(url: URL) {
  [
    "id",
    "name",
    "alternativeName",
    "enName",
    "description",
    "shortDescription",
    "year",
    "type",
    "typeNumber",
    "isSeries",
    "movieLength",
    "seriesLength",
    "ageRating",
    "status",
    "genres",
    "countries",
    "poster",
    "backdrop",
    "rating",
    "votes",
    "externalId",
    "persons",
  ].forEach((field) => url.searchParams.append("selectFields", field));
}

function typeNumberFilters(type: MovieType) {
  if (type === "film") return ["1"];
  if (type === "series") return ["2"];
  if (type === "anime") return ["4"];
  if (type === "cartoon") return ["3", "5"];
  return [];
}

function buildDiscoveryUrl(type: MovieType, mode: DiscoveryMode, page: number) {
  const currentYear = new Date().getUTCFullYear();
  const minimum = CURATED_PACK_300_MINIMUMS[type];
  const url = new URL(`${KINOPOISK_BASE_URL}/movie`);

  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(CURATED_PACK_300_PAGE_SIZE));
  appendKinopoiskFields(url);

  url.searchParams.append("notNullFields", "id");
  url.searchParams.append("notNullFields", "name");
  url.searchParams.append("notNullFields", "year");
  url.searchParams.append("notNullFields", "poster.url");
  url.searchParams.append("rating.kp", `${minimum.rating}-10`);
  url.searchParams.append("votes.kp", `${minimum.votes}-99999999`);
  url.searchParams.append("year", `1900-${currentYear}`);

  for (const value of typeNumberFilters(type)) {
    url.searchParams.append("typeNumber", value);
  }
  if (type === "documentary") {
    url.searchParams.append("genres.name", "документальный");
  }

  if (mode === "popular") {
    url.searchParams.append("sortField", "votes.kp");
    url.searchParams.append("sortType", "-1");
  } else if (mode === "rated") {
    url.searchParams.set("votes.kp", `${Math.max(minimum.votes, 1000)}-99999999`);
    url.searchParams.append("sortField", "rating.kp");
    url.searchParams.append("sortType", "-1");
  } else if (mode === "recent") {
    url.searchParams.set("year", `${Math.max(2005, currentYear - 12)}-${currentYear}`);
    url.searchParams.append("sortField", "votes.kp");
    url.searchParams.append("sortType", "-1");
  } else {
    url.searchParams.set("rating.kp", `${Math.max(minimum.rating, 6.5)}-10`);
    url.searchParams.set("votes.kp", `${Math.max(250, Math.floor(minimum.votes / 2))}-30000`);
    url.searchParams.append("sortField", "rating.kp");
    url.searchParams.append("sortType", "-1");
  }

  return url.toString();
}

function genreNames(doc: KinopoiskDoc) {
  return uniq((doc.genres ?? []).map((genre) => genre.name || null), 12);
}

function countryNames(doc: KinopoiskDoc) {
  return uniq((doc.countries ?? []).map((country) => country.name || null), 8);
}

function mapType(doc: KinopoiskDoc): MovieType {
  const type = normalize(doc.type);
  const typeNumber = cleanInt(doc.typeNumber);
  const genres = genreNames(doc).map(normalize).join(" ");

  if (type === "anime" || typeNumber === 4 || /(^|\s)аниме($|\s)/.test(genres)) {
    return "anime";
  }
  if (/документ/.test(genres)) return "documentary";
  if (typeNumber === 3 || typeNumber === 5 || /cartoon|animated/.test(type)) {
    return "cartoon";
  }
  if (doc.isSeries || typeNumber === 2 || /series|сериал/.test(type)) {
    return "series";
  }
  return "film";
}

function getRating(doc: KinopoiskDoc) {
  return clampRating(
    cleanNumber(doc.rating?.kp) ??
      cleanNumber(doc.rating?.imdb) ??
      cleanNumber(doc.rating?.tmdb),
  );
}

function getVotes(doc: KinopoiskDoc) {
  return (
    cleanInt(doc.votes?.kp) ??
    cleanInt(doc.votes?.imdb) ??
    cleanInt(doc.votes?.tmdb) ??
    0
  );
}

function personNames(
  doc: KinopoiskDoc,
  professions: string[],
  limit: number,
) {
  return uniq(
    (doc.persons ?? [])
      .filter((person) => {
        const profession = normalize(person.profession);
        const enProfession = normalize(person.enProfession);
        return professions.some(
          (expected) => profession === expected || enProfession === expected,
        );
      })
      .map((person) => person.name || person.enName),
    limit,
  );
}

function candidateScore(doc: KinopoiskDoc, mode: DiscoveryMode) {
  const rating = getRating(doc) ?? 0;
  const votes = getVotes(doc);
  const year = cleanInt(doc.year) ?? 1900;
  const currentYear = new Date().getUTCFullYear();
  const completeness = [
    imageUrl(doc.poster),
    imageUrl(doc.backdrop),
    cleanString(doc.description) || cleanString(doc.shortDescription),
    cleanString(doc.externalId?.imdb),
    cleanInt(doc.externalId?.tmdb),
    (doc.persons ?? []).length > 0 ? "yes" : "",
  ].filter(Boolean).length;
  const recency = Math.max(0, 12 - Math.min(12, currentYear - year));
  const modeBoost = mode === "gems" ? 7 : mode === "recent" ? 5 : 0;

  return (
    rating * 10 +
    Math.log10(Math.max(10, votes)) * 12 +
    completeness * 5 +
    recency * 0.6 +
    modeBoost
  );
}

function isUsableDoc(doc: KinopoiskDoc, expectedType: MovieType) {
  const id = cleanInt(doc.id);
  const title = cleanString(doc.name) || cleanString(doc.alternativeName) || cleanString(doc.enName);
  const year = cleanInt(doc.year);
  const currentYear = new Date().getUTCFullYear();
  const rating = getRating(doc);
  const votes = getVotes(doc);
  const minimum = CURATED_PACK_300_MINIMUMS[expectedType];

  if (!id || !title || !year || year > currentYear) return false;
  if (!imageUrl(doc.poster)) return false;
  if (!(cleanString(doc.description) || cleanString(doc.shortDescription))) return false;
  if (rating === null || rating < minimum.rating) return false;
  if (votes < minimum.votes) return false;
  return mapType(doc) === expectedType;
}

async function loadExistingKeys(): Promise<ExistingKeys> {
  const result: ExistingKeys = {
    slugs: new Set<string>(),
    imdbIds: new Set<string>(),
    tmdbIds: new Set<number>(),
    kinopoiskIds: new Set<number>(),
    titleYears: new Set<string>(),
  };

  for (const movie of movies) {
    result.slugs.add(cleanString(movie.slug));
    const imdbId = cleanString(movie.imdbId).toLowerCase();
    if (imdbId) result.imdbIds.add(imdbId);
    const tmdbId = cleanInt(movie.tmdbId);
    if (tmdbId) result.tmdbIds.add(tmdbId);
    const kpId = cleanInt(movie.kinopoiskId);
    if (kpId) result.kinopoiskIds.add(kpId);
    const key = titleYearKey(movie.title, movie.year);
    if (key) result.titleYears.add(key);
    const originalKey = titleYearKey(movie.originalTitle, movie.year);
    if (originalKey) result.titleYears.add(originalKey);
  }

  for (let from = 0; from < 10000; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from("movie_drafts")
      .select(
        "slug,title,original_title,year,tmdb_id,kinopoisk_id,imdb_id,status",
      )
      .neq("status", "deleted")
      .range(from, from + 999);

    if (error) throw error;
    const rows = (data ?? []) as ExistingDraftRow[];
    if (!rows.length) break;

    for (const row of rows) {
      const slug = cleanString(row.slug);
      if (slug) result.slugs.add(slug);
      const imdbId = cleanString(row.imdb_id).toLowerCase();
      if (imdbId) result.imdbIds.add(imdbId);
      const tmdbId = cleanInt(row.tmdb_id);
      if (tmdbId) result.tmdbIds.add(tmdbId);
      const kpId = cleanInt(row.kinopoisk_id);
      if (kpId) result.kinopoiskIds.add(kpId);
      const titleKey = titleYearKey(row.title, row.year);
      if (titleKey) result.titleYears.add(titleKey);
      const originalKey = titleYearKey(row.original_title, row.year);
      if (originalKey) result.titleYears.add(originalKey);
    }

    if (rows.length < 1000) break;
  }

  return result;
}

function candidateAlreadyExists(doc: KinopoiskDoc, existing: ExistingKeys) {
  const kpId = cleanInt(doc.id);
  const imdbId = cleanString(doc.externalId?.imdb).toLowerCase();
  const tmdbId = cleanInt(doc.externalId?.tmdb);
  const title = cleanString(doc.name) || cleanString(doc.alternativeName) || cleanString(doc.enName);
  const year = cleanInt(doc.year);
  const slug = title && year ? generateSlug(title, year) : "";
  const keys = [
    titleYearKey(doc.name, year),
    titleYearKey(doc.alternativeName, year),
    titleYearKey(doc.enName, year),
  ].filter(Boolean);

  return Boolean(
    (kpId && existing.kinopoiskIds.has(kpId)) ||
      (imdbId && existing.imdbIds.has(imdbId)) ||
      (tmdbId && existing.tmdbIds.has(tmdbId)) ||
      (slug && existing.slugs.has(slug)) ||
      keys.some((key) => existing.titleYears.has(key)),
  );
}

function reserveCandidate(doc: KinopoiskDoc, existing: ExistingKeys) {
  const kpId = cleanInt(doc.id);
  const imdbId = cleanString(doc.externalId?.imdb).toLowerCase();
  const tmdbId = cleanInt(doc.externalId?.tmdb);
  const title = cleanString(doc.name) || cleanString(doc.alternativeName) || cleanString(doc.enName);
  const year = cleanInt(doc.year);
  if (kpId) existing.kinopoiskIds.add(kpId);
  if (imdbId) existing.imdbIds.add(imdbId);
  if (tmdbId) existing.tmdbIds.add(tmdbId);
  if (title && year) existing.slugs.add(generateSlug(title, year));
  [doc.name, doc.alternativeName, doc.enName].forEach((value) => {
    const key = titleYearKey(value, year);
    if (key) existing.titleYears.add(key);
  });
}

async function discoverCandidates(
  type: MovieType,
  desired: number,
  existing: ExistingKeys,
) {
  const modes: DiscoveryMode[] = ["popular", "rated", "recent", "gems"];
  const pool = new Map<number, Candidate>();

  for (const mode of modes) {
    for (
      let page = 1;
      page <= CURATED_PACK_300_MAX_PAGES_PER_MODE;
      page += 1
    ) {
      const response = await kinopoiskRequest<KinopoiskListResponse>(
        buildDiscoveryUrl(type, mode, page),
      );
      const docs = Array.isArray(response.docs) ? response.docs : [];
      if (!docs.length) break;

      for (const doc of docs) {
        if (!isUsableDoc(doc, type)) continue;
        if (candidateAlreadyExists(doc, existing)) continue;
        const id = cleanInt(doc.id);
        if (!id) continue;
        const candidate = {
          doc,
          type,
          score: candidateScore(doc, mode),
          discoveryMode: mode,
        } satisfies Candidate;
        const previous = pool.get(id);
        if (!previous || candidate.score > previous.score) {
          pool.set(id, candidate);
        }
      }

      if (pool.size >= Math.max(desired * 4, desired + 40)) break;
      if (response.pages && page >= response.pages) break;
    }
  }

  return Array.from(pool.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(desired * 5, desired + 80));
}

function preferredTmdbMediaType(type: MovieType): "movie" | "tv" {
  return type === "series" ? "tv" : "movie";
}

async function resolveTmdbReference(doc: KinopoiskDoc, type: MovieType) {
  const directId = cleanInt(doc.externalId?.tmdb);
  if (directId) {
    return { mediaType: preferredTmdbMediaType(type), id: directId } as const;
  }

  const imdbId = cleanString(doc.externalId?.imdb);
  if (!imdbId) return null;

  try {
    const found = await tmdbFetch<TmdbFindResponse>(
      `/find/${encodeURIComponent(imdbId)}?language=ru-RU&external_source=imdb_id`,
    );
    const preferred = preferredTmdbMediaType(type);
    if (preferred === "tv" && found.tv_results?.[0]?.id) {
      return { mediaType: "tv" as const, id: found.tv_results[0].id };
    }
    if (preferred === "movie" && found.movie_results?.[0]?.id) {
      return { mediaType: "movie" as const, id: found.movie_results[0].id };
    }
    if (found.movie_results?.[0]?.id) {
      return { mediaType: "movie" as const, id: found.movie_results[0].id };
    }
    if (found.tv_results?.[0]?.id) {
      return { mediaType: "tv" as const, id: found.tv_results[0].id };
    }
  } catch {
    return null;
  }

  return null;
}

async function fetchTmdbDetails(doc: KinopoiskDoc, type: MovieType) {
  const reference = await resolveTmdbReference(doc, type);
  if (!reference) return { reference: null, details: null };

  try {
    const details = await tmdbFetch<TmdbDetails>(
      `/${reference.mediaType}/${reference.id}?language=ru-RU&append_to_response=credits,videos,external_ids`,
    );
    return { reference, details };
  } catch {
    return { reference, details: null };
  }
}

function splitSentences(value: string) {
  return cleanString(value)
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function trimText(value: string, maxLength: number) {
  const text = cleanString(value).replace(/\s+/g, " ");
  if (text.length <= maxLength) return text;
  const clipped = text
    .slice(0, Math.max(1, maxLength - 1))
    .replace(/\s+\S*$/, "")
    .replace(/[,.!?;:]+$/g, "");
  return `${clipped}.`.slice(0, maxLength);
}

function readableType(type: MovieType) {
  if (type === "series") return "сериал";
  if (type === "anime") return "аниме";
  if (type === "cartoon") return "мультфильм";
  if (type === "documentary") return "документальный проект";
  return "фильм";
}

function publicType(type: MovieType): FullCard["type"] {
  if (type === "series") return "Сериал";
  if (type === "anime") return "Аниме";
  if (type === "cartoon") return "Мультфильм";
  if (type === "documentary") return "Документальный";
  return "Фильм";
}

function buildShortDescription(input: {
  title: string;
  type: MovieType;
  overview: string;
  genres: string[];
  country: string[];
}) {
  const sentences = splitSentences(input.overview).slice(0, 3);
  let text = sentences.join(" ");
  if (sentences.length < 2) {
    const genreText = input.genres.slice(0, 3).join(", ").toLowerCase();
    const countryText = input.country.slice(0, 2).join(", ");
    const factual = [
      genreText ? `${readableType(input.type)} относится к жанрам ${genreText}` : "",
      countryText ? `страна производства: ${countryText}` : "",
    ].filter(Boolean).join("; ");
    if (factual) text = `${text}${/[.!?]$/.test(text) ? "" : "."} ${factual}.`;
  }
  return trimText(text || `${input.title}: нужно проверить описание.`, 520);
}

function buildLongDescription(input: {
  title: string;
  year: number;
  type: MovieType;
  description: string;
  genres: string[];
  countries: string[];
  directors: string[];
  cast: CastItem[];
  studios: string[];
  seasons: number | null;
  episodes: number | null;
}) {
  const genreText = input.genres.slice(0, 5).join(", ").toLowerCase();
  const countryText = input.countries.slice(0, 3).join(", ");
  const first = `«${input.title}» — ${readableType(input.type)} ${input.year} года${genreText ? ` в жанрах ${genreText}` : ""}. ${input.description}`;

  const audience = input.genres.length
    ? `Проект подойдёт зрителям, которым интересны ${input.genres.slice(0, 4).join(", ").toLowerCase()}. Описание не раскрывает ключевые повороты сюжета и помогает заранее понять общий тон истории.`
    : `Проект подойдёт зрителям, которые выбирают историю по сюжету, создателям и актёрскому составу. Описание не раскрывает ключевые повороты.`;

  const productionParts = [
    countryText ? `производство: ${countryText}` : "",
    input.directors.length ? `режиссура: ${input.directors.slice(0, 3).join(", ")}` : "",
    input.studios.length ? `студии: ${input.studios.slice(0, 3).join(", ")}` : "",
    input.cast.length ? `в основном составе: ${input.cast.slice(0, 5).map((item) => item.name).join(", ")}` : "",
    input.seasons ? `сезонов: ${input.seasons}` : "",
    input.episodes ? `эпизодов: ${input.episodes}` : "",
  ].filter(Boolean);
  const third = productionParts.length
    ? `Среди подтверждённых сведений о проекте — ${productionParts.join("; ")}. Эти данные помогают оценить масштаб и формат проекта без спойлеров.`
    : "Дополнительные сведения о производстве добавляются только после подтверждения в подключённых источниках.";

  return [first, audience, third].map((part) => trimText(part, 900)).join("\n\n");
}

function buildSeo(input: {
  title: string;
  originalTitle: string;
  year: number;
  type: MovieType;
  genres: string[];
  description: string;
}) {
  const typeLabel = readableType(input.type);
  const metaTitle = trimText(`${input.title} (${input.year}) — смотреть ${typeLabel}`, 65);
  const metaDescription = trimText(
    `${input.title} (${input.year}): описание, жанры, актёры, трейлер и информация о просмотре на KinoLuma.`,
    160,
  );
  const h1 = `${input.title} (${input.year})`;
  const genreText = input.genres.slice(0, 5).join(", ").toLowerCase();
  const seoText = [
    `«${input.title}» — ${typeLabel} ${input.year} года${genreText ? ` в жанрах ${genreText}` : ""}. ${input.description}`,
    `На странице собраны основные сведения о проекте: оригинальное название «${input.originalTitle}», состав, создатели, доступные медиа и идентификаторы. Информация о просмотре и трейлере показывается только при наличии подтверждённых ссылок.`,
  ].join("\n\n");
  const keywords = uniq([
    input.title,
    input.originalTitle,
    `${input.title} ${input.year}`,
    `${input.title} смотреть`,
    `${input.title} трейлер`,
    `${input.title} актёры`,
    ...input.genres.map((genre) => `${typeLabel} ${genre}`),
  ], 14);

  return { metaTitle, metaDescription, h1, seoText, keywords };
}

function buildFaq(input: {
  title: string;
  type: MovieType;
  description: string;
  genres: string[];
  trailerUrl: string | null;
  releaseStatus: string | null;
  seasons: number | null;
  episodes: number | null;
}) {
  const typeLabel = readableType(input.type);
  const faq: FaqItem[] = [
    {
      question: `О чём ${typeLabel} «${input.title}»?`,
      answer: trimText(input.description, 300),
    },
    {
      question: `Где смотреть «${input.title}»?`,
      answer: `На странице KinoLuma показываются доступные варианты просмотра, если для карточки подключён рабочий плеер. Доступность может меняться.`,
    },
    {
      question: `Есть ли трейлер «${input.title}»?`,
      answer: input.trailerUrl
        ? "Да, в карточке добавлена подтверждённая ссылка на трейлер."
        : "Нужно найти: подтверждённая ссылка на трейлер не найдена.",
    },
    {
      question: `Какой жанр у «${input.title}»?`,
      answer: input.genres.length
        ? `Жанры: ${input.genres.join(", ")}.`
        : "Нужно проверить: жанры не подтверждены.",
    },
    {
      question: `Для кого подойдёт «${input.title}»?`,
      answer: input.genres.length
        ? `Для зрителей, которым интересны ${input.genres.slice(0, 4).join(", ").toLowerCase()}.`
        : "Для аудитории, которая выбирает проект по сюжету и создателям; жанровую принадлежность нужно проверить.",
    },
  ];

  if (input.type === "series") {
    const size = [
      input.seasons ? `${input.seasons} сезон(ов)` : "",
      input.episodes ? `${input.episodes} эпизод(ов)` : "",
    ].filter(Boolean).join(" и ");
    faq.push({
      question: `Сколько сезонов и эпизодов у «${input.title}»?`,
      answer: size || "Нужно проверить: точное количество сезонов и эпизодов не подтверждено.",
    });
    faq.push({
      question: `Будет ли продолжение «${input.title}»?`,
      answer: input.releaseStatus
        ? `Текущий статус проекта: ${input.releaseStatus}. Отдельное подтверждение следующего сезона нужно проверять по официальным объявлениям.`
        : "Нужно проверить: подтверждённых данных о продолжении в карточке нет.",
    });
  } else {
    faq.push({
      question: `Подойдёт ли «${input.title}» для первого знакомства с жанром?`,
      answer: input.genres.length
        ? `Да, если вам интересны ${input.genres.slice(0, 3).join(", ").toLowerCase()}; окончательный выбор зависит от личных предпочтений.`
        : "Нужно проверить жанровые данные перед рекомендацией.",
    });
  }

  return faq.slice(0, 7);
}

function chooseTrailer(videos: TmdbVideo[]) {
  const candidates = videos
    .filter((video) => cleanString(video.site).toLowerCase() === "youtube")
    .filter((video) => cleanString(video.key))
    .map((video) => ({
      ...video,
      score:
        (video.official ? 100 : 0) +
        (video.iso_639_1 === "ru" ? 60 : video.iso_639_1 === "en" ? 20 : 0) +
        (video.type === "Trailer" ? 50 : video.type === "Teaser" ? 20 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  const first = candidates[0];
  if (!first?.key) return null;
  return {
    key: first.key,
    url: `https://www.youtube.com/watch?v=${first.key}`,
    embedUrl: `https://www.youtube.com/embed/${first.key}`,
  };
}

function tmdbCast(details: TmdbDetails | null) {
  return (details?.credits?.cast ?? [])
    .filter((item) => cleanString(item.name))
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999))
    .slice(0, 12)
    .map((item) => ({
      name: cleanString(item.name),
      role: cleanString(item.character) || "нужно проверить",
    }));
}

function tmdbCrewNames(details: TmdbDetails | null, jobs: string[], limit: number) {
  return uniq(
    (details?.credits?.crew ?? [])
      .filter((item) => jobs.includes(cleanString(item.job)))
      .map((item) => item.name),
    limit,
  );
}

function formatDuration(doc: KinopoiskDoc, details: TmdbDetails | null) {
  const minutes =
    cleanInt(details?.runtime) ??
    cleanInt(doc.movieLength) ??
    cleanInt(doc.seriesLength) ??
    (details?.episode_run_time ?? []).map(cleanInt).find((value) => value && value > 0) ??
    null;
  return minutes ? `${minutes} мин` : "нужно проверить";
}

function productionCountries(doc: KinopoiskDoc, details: TmdbDetails | null) {
  return uniq([
    ...countryNames(doc),
    ...((details?.production_countries ?? []).map((item) => item.name)),
    ...((details?.origin_country ?? []).map((item) => item)),
  ], 8);
}

function productionStudios(doc: KinopoiskDoc, details: TmdbDetails | null) {
  return uniq([
    ...((doc.productionCompanies ?? []).map((item) => item.name)),
    ...((details?.production_companies ?? []).map((item) => item.name)),
    ...((details?.networks ?? []).map((item) => item.name)),
  ], 10);
}

function mergedGenres(doc: KinopoiskDoc, details: TmdbDetails | null) {
  return uniq([
    ...genreNames(doc),
    ...((details?.genres ?? []).map((genre) => genre.name)),
  ], 12);
}

function qualityScore(card: FullCard) {
  let score = 0;
  if (card.title) score += 8;
  if (card.originalTitle) score += 5;
  if (card.year) score += 5;
  if (card.genres.length) score += 8;
  if (card.country.length) score += 5;
  if (card.duration !== "нужно проверить") score += 5;
  if (card.rating !== null) score += 5;
  if (card.tmdbId) score += 6;
  if (card.kinopoiskId) score += 8;
  if (card.imdbId) score += 6;
  if (card.description.length >= 80) score += 7;
  if (card.longDescription.length >= 300) score += 7;
  if (card.cast.length) score += 6;
  if (card.crew.directors.length) score += 6;
  if (card.crew.studios.length) score += 4;
  if (card.media.posterUrl !== "нужно найти") score += 5;
  if (card.media.backdropUrl !== "нужно найти") score += 4;
  if (card.media.trailerUrl !== "нужно найти") score += 4;
  return Math.min(100, score);
}

function currentOrPastRelease(details: TmdbDetails | null, doc: KinopoiskDoc) {
  const today = new Date().toISOString().slice(0, 10);
  const date = cleanString(details?.release_date || details?.first_air_date);
  if (date && date > today) return false;
  const year = cleanInt(doc.year);
  return Boolean(year && year <= new Date().getUTCFullYear());
}

async function enrichCandidate(candidate: Candidate): Promise<PreparedMovie | null> {
  const doc = candidate.doc;
  const kinopoiskId = cleanInt(doc.id);
  const title = cleanString(doc.name) || cleanString(doc.alternativeName) || cleanString(doc.enName);
  const year = cleanInt(doc.year);
  if (!kinopoiskId || !title || !year) return null;

  const { reference, details } = await fetchTmdbDetails(doc, candidate.type);
  if (!currentOrPastRelease(details, doc)) return null;

  const originalTitle =
    cleanString(details?.original_title || details?.original_name) ||
    cleanString(doc.alternativeName || doc.enName) ||
    title;
  const slug = generateSlug(title, year);
  const genres = mergedGenres(doc, details);
  const countries = productionCountries(doc, details);
  const directors = uniq([
    ...tmdbCrewNames(details, ["Director"], 8),
    ...personNames(doc, ["режиссеры", "director"], 8),
    ...((details?.created_by ?? []).map((item) => item.name)),
  ], 8);
  const writers = uniq([
    ...tmdbCrewNames(details, ["Writer", "Screenplay", "Teleplay", "Story"], 10),
    ...personNames(doc, ["сценаристы", "writer"], 10),
  ], 10);
  const studios = productionStudios(doc, details);
  const cast = tmdbCast(details);
  const fallbackActors = personNames(doc, ["актеры", "actor"], 12);
  const finalCast = cast.length
    ? cast
    : fallbackActors.map((name) => ({ name, role: "нужно проверить" }));
  const overview =
    cleanString(doc.shortDescription) ||
    cleanString(doc.description) ||
    cleanString(details?.overview);
  if (!overview) return null;

  const description = buildShortDescription({
    title,
    type: candidate.type,
    overview,
    genres,
    country: countries,
  });
  const seasons = cleanInt(details?.number_of_seasons);
  const episodes = cleanInt(details?.number_of_episodes);
  const releaseStatus = cleanString(details?.status || doc.status) || null;
  const longDescription = buildLongDescription({
    title,
    year,
    type: candidate.type,
    description,
    genres,
    countries,
    directors,
    cast: finalCast,
    studios,
    seasons,
    episodes,
  });
  const trailer = chooseTrailer(details?.videos?.results ?? []);
  const posterUrl = tmdbImage(details?.poster_path, "w500") || imageUrl(doc.poster);
  const backdropUrl = tmdbImage(details?.backdrop_path, "w780") || imageUrl(doc.backdrop);
  const tmdbId = reference?.id ?? cleanInt(doc.externalId?.tmdb);
  const imdbId =
    cleanString(details?.external_ids?.imdb_id) ||
    cleanString(doc.externalId?.imdb) ||
    null;
  const rating = getRating(doc) ?? clampRating(cleanNumber(details?.vote_average));
  const duration = formatDuration(doc, details);
  const seo = buildSeo({
    title,
    originalTitle,
    year,
    type: candidate.type,
    genres,
    description,
  });
  const faq = buildFaq({
    title,
    type: candidate.type,
    description,
    genres,
    trailerUrl: trailer?.url ?? null,
    releaseStatus,
    seasons,
    episodes,
  });
  const facts: FactItem[] = [
    { label: "Год", value: String(year) },
    { label: "Тип", value: publicType(candidate.type) },
    ...(countries.length ? [{ label: "Страна", value: countries.join(", ") }] : []),
    { label: "Длительность", value: duration },
    ...(rating !== null ? [{ label: "Рейтинг", value: rating.toFixed(1) }] : []),
    ...(directors.length ? [{ label: "Режиссёр", value: directors.slice(0, 3).join(", ") }] : []),
    ...(studios.length ? [{ label: "Студия", value: studios.slice(0, 3).join(", ") }] : []),
    ...(seasons ? [{ label: "Сезоны", value: String(seasons) }] : []),
    ...(episodes ? [{ label: "Эпизоды", value: String(episodes) }] : []),
    ...(releaseStatus ? [{ label: "Статус", value: releaseStatus }] : []),
  ];

  const card: FullCard = {
    title,
    originalTitle,
    slug,
    type: publicType(candidate.type),
    year,
    genres,
    country: countries,
    duration,
    rating,
    tmdbId: tmdbId ?? null,
    kinopoiskId,
    imdbId,
    description,
    longDescription,
    seo,
    faq,
    facts,
    cast: finalCast,
    crew: { directors, writers, studios },
    media: {
      posterUrl: posterUrl || "нужно найти",
      backdropUrl: backdropUrl || "нужно найти",
      trailerUrl: trailer?.url || "нужно найти",
    },
    ...(candidate.type === "series" ? { seasons, episodes } : {}),
    releaseStatus,
    sourceMeta: {
      packVersion: CURATED_PACK_300_VERSION,
      discoveryMode: candidate.discoveryMode,
      generatedAt: new Date().toISOString(),
    },
  };

  const score = qualityScore(card);
  if (score < 72) return null;
  if (!posterUrl) return null;

  const rawBase = {
    kinopoisk: doc,
    tmdb: details,
    kinoluma: {
      pack_300: card,
      import_mode: "curated_pack_300",
      pack_version: CURATED_PACK_300_VERSION,
      discovery_mode: candidate.discoveryMode,
      generated_at: card.sourceMeta.generatedAt,
      ...(rating !== null ? { manual_rating: rating } : {}),
    },
  };
  const rawJson = mergeAutoPlayersIntoRawJson(rawBase, {
    slug,
    kinopoiskId,
    imdbId,
    movieType: candidate.type,
    contentType: candidate.type === "series" ? "series" : "movie",
  });

  return {
    card,
    db: {
      title,
      original_title: originalTitle || null,
      slug,
      year,
      type: candidate.type,
      genres,
      poster_url: posterUrl,
      backdrop_url: backdropUrl || null,
      tmdb_id: tmdbId ?? null,
      kinopoisk_id: kinopoiskId,
      imdb_id: imdbId,
      actors: finalCast.map((item) => item.name),
      directors,
      description,
      long_description: longDescription,
      seo_title: seo.metaTitle,
      seo_description: seo.metaDescription,
      faq,
      trailer_provider: trailer ? "youtube" : null,
      trailer_key: trailer?.key ?? null,
      trailer_url: trailer?.url ?? null,
      trailer_embed_url: trailer?.embedUrl ?? null,
      trailer_source: trailer ? "tmdb" : null,
      trailer_confidence: trailer ? 90 : 0,
      trailer_status: trailer ? "accepted" : "missing",
      similar_movie_ids: [],
      source: "kinoluma_curated_pack_300",
      raw_json: rawJson,
      status: "published",
      quality_score: score,
      moderation_notes:
        `KinoLuma curated pack 300 (${CURATED_PACK_300_VERSION}). ` +
        "Автопубликация только после проверки дублей; неизвестные факты не выдумываются.",
    },
  };
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
) {
  const output = new Array<R>(values.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= values.length) return;
      output[index] = await mapper(values[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  );
  return output;
}

function normalizedQuotas(limit: number, override?: Partial<CuratedPackQuota>) {
  const base = { ...CURATED_PACK_300_QUOTAS, ...(override ?? {}) };
  if (limit === 300) return base;
  const entries = Object.entries(base) as Array<[MovieType, number]>;
  const total = entries.reduce((sum, [, value]) => sum + Math.max(0, value), 0) || 1;
  const result: CuratedPackQuota = {
    film: 0,
    series: 0,
    anime: 0,
    cartoon: 0,
    documentary: 0,
  };
  let assigned = 0;
  for (const [type, value] of entries) {
    const quota = Math.floor((Math.max(0, value) / total) * limit);
    result[type] = quota;
    assigned += quota;
  }
  const order: MovieType[] = ["film", "series", "anime", "cartoon", "documentary"];
  for (let i = 0; assigned < limit; i += 1) {
    result[order[i % order.length]] += 1;
    assigned += 1;
  }
  return result;
}

function validatePreparedPack(
  prepared: PreparedMovie[],
  expectedLimit: number,
  quotas: CuratedPackQuota,
) {
  if (prepared.length !== expectedLimit) {
    throw new Error(`Validation failed: expected ${expectedLimit} cards, got ${prepared.length}`);
  }

  const uniqueStrings = (label: string, values: string[]) => {
    const seen = new Set<string>();
    for (const value of values.filter(Boolean)) {
      const normalized = value.toLowerCase();
      if (seen.has(normalized)) {
        throw new Error(`Validation failed: duplicate ${label} ${value}`);
      }
      seen.add(normalized);
    }
  };
  const uniqueNumbers = (label: string, values: number[]) => {
    const seen = new Set<number>();
    for (const value of values) {
      if (seen.has(value)) {
        throw new Error(`Validation failed: duplicate ${label} ${value}`);
      }
      seen.add(value);
    }
  };

  uniqueStrings("slug", prepared.map((item) => item.card.slug));
  uniqueStrings(
    "imdbId",
    prepared.map((item) => item.card.imdbId || "").filter(Boolean),
  );
  uniqueNumbers(
    "kinopoiskId",
    prepared.map((item) => item.card.kinopoiskId),
  );
  uniqueNumbers(
    "tmdbId",
    prepared
      .map((item) => item.card.tmdbId)
      .filter((value): value is number => Boolean(value)),
  );

  const currentYear = new Date().getUTCFullYear();
  const actualQuota: CuratedPackQuota = {
    film: 0,
    series: 0,
    anime: 0,
    cartoon: 0,
    documentary: 0,
  };

  for (const item of prepared) {
    actualQuota[item.db.type] += 1;
    if (item.card.year > currentYear) {
      throw new Error(`Validation failed: future release ${item.card.title} (${item.card.year})`);
    }
    if (item.card.seo.metaTitle.length > 65) {
      throw new Error(`Validation failed: metaTitle > 65 for ${item.card.slug}`);
    }
    if (item.card.seo.metaDescription.length > 160) {
      throw new Error(`Validation failed: metaDescription > 160 for ${item.card.slug}`);
    }
    if (!Number.isInteger(item.card.kinopoiskId) || item.card.kinopoiskId <= 0) {
      throw new Error(`Validation failed: invalid kinopoiskId for ${item.card.slug}`);
    }
    if (item.card.tmdbId !== null && (!Number.isInteger(item.card.tmdbId) || item.card.tmdbId <= 0)) {
      throw new Error(`Validation failed: invalid tmdbId for ${item.card.slug}`);
    }
    if (item.card.imdbId !== null && !/^tt\d+$/i.test(item.card.imdbId)) {
      throw new Error(`Validation failed: invalid imdbId for ${item.card.slug}`);
    }
  }

  for (const type of Object.keys(quotas) as MovieType[]) {
    if (actualQuota[type] !== quotas[type]) {
      throw new Error(
        `Validation failed: quota ${type} expected ${quotas[type]}, got ${actualQuota[type]}`,
      );
    }
  }
}

async function finalDuplicateCheck(movie: PreparedMovie) {
  return findDuplicateMovie({
    tmdbId: movie.card.tmdbId,
    kinopoiskId: movie.card.kinopoiskId,
    imdbId: movie.card.imdbId,
    slug: movie.card.slug,
    title: movie.card.title,
    originalTitle: movie.card.originalTitle,
    year: movie.card.year,
  });
}

async function insertPreparedMovies(
  prepared: PreparedMovie[],
  sourceTag: string,
) {
  try {
    for (let index = 0; index < prepared.length; index += INSERT_CHUNK_SIZE) {
      const chunk = prepared
        .slice(index, index + INSERT_CHUNK_SIZE)
        .map((item) => ({ ...item.db, source: sourceTag }));
      const { error } = await supabaseAdmin.from("movie_drafts").insert(chunk);
      if (error) throw error;
    }
  } catch (error) {
    const rollback = await supabaseAdmin
      .from("movie_drafts")
      .delete()
      .eq("source", sourceTag);
    if (rollback.error) {
      console.error("[KinoLuma curated-pack-300] rollback failed", rollback.error);
    }
    throw error;
  }
}

export async function publishCuratedPack300(
  options: CuratedPack300Options = {},
) {
  const limit = Math.max(
    1,
    Math.min(HARD_MAX_TARGET, Math.trunc(options.limit || DEFAULT_TARGET)),
  );
  const dryRun = options.dryRun ?? false;
  const quotas = normalizedQuotas(limit, options.quotas);

  const runInsert = await supabaseAdmin
    .from("movie_import_runs")
    .insert({
      status: "running",
      log: [
        {
          message: "KinoLuma curated pack 300 started",
          limit,
          dryRun,
          quotas,
          packVersion: CURATED_PACK_300_VERSION,
          at: new Date().toISOString(),
        },
      ],
    })
    .select("id")
    .single();
  if (runInsert.error) throw runInsert.error;
  const runId = String(runInsert.data.id);
  const sourceTag = `kinoluma_curated_pack_300:${runId}`;

  const stats = {
    discovered: {} as Record<string, number>,
    enriched: {} as Record<string, number>,
    rejectedAfterEnrichment: {} as Record<string, number>,
    duplicateAfterEnrichment: 0,
    preparedCount: 0,
    publishedCount: 0,
  };

  try {
    const existing = await loadExistingKeys();
    const typeOrder: MovieType[] = ["film", "series", "anime", "cartoon", "documentary"];
    const selected: PreparedMovie[] = [];

    for (const type of typeOrder) {
      const desired = quotas[type];
      if (desired <= 0) continue;
      const candidates = await discoverCandidates(type, desired, existing);
      stats.discovered[type] = candidates.length;

      const enriched = await mapWithConcurrency(
        candidates,
        ENRICH_CONCURRENCY,
        async (candidate) => enrichCandidate(candidate),
      );
      const valid = enriched.filter((item): item is PreparedMovie => Boolean(item));
      stats.enriched[type] = valid.length;
      stats.rejectedAfterEnrichment[type] = candidates.length - valid.length;

      for (const movie of valid) {
        if (selected.filter((item) => item.db.type === type).length >= desired) break;

        const duplicate = await finalDuplicateCheck(movie);
        if (duplicate.isDuplicate) {
          stats.duplicateAfterEnrichment += 1;
          continue;
        }
        if (candidateAlreadyExists(
          {
            id: movie.card.kinopoiskId,
            name: movie.card.title,
            alternativeName: movie.card.originalTitle,
            year: movie.card.year,
            externalId: {
              imdb: movie.card.imdbId,
              tmdb: movie.card.tmdbId,
            },
          },
          existing,
        )) {
          stats.duplicateAfterEnrichment += 1;
          continue;
        }

        reserveCandidate(
          {
            id: movie.card.kinopoiskId,
            name: movie.card.title,
            alternativeName: movie.card.originalTitle,
            year: movie.card.year,
            externalId: {
              imdb: movie.card.imdbId,
              tmdb: movie.card.tmdbId,
            },
          },
          existing,
        );
        selected.push(movie);
      }

      const selectedForType = selected.filter((item) => item.db.type === type).length;
      if (selectedForType < desired) {
        throw new Error(
          `Не удалось собрать квоту ${type}: нужно ${desired}, подготовлено ${selectedForType}. ` +
            "Ничего не опубликовано: увеличь страницы discovery или ослабь только подтверждённые пороги.",
        );
      }
    }

    if (selected.length !== limit) {
      throw new Error(
        `Пакет неполный: ожидалось ${limit}, подготовлено ${selected.length}. Ничего не опубликовано.`,
      );
    }

    validatePreparedPack(selected, limit, quotas);
    stats.preparedCount = selected.length;
    if (!dryRun) {
      await insertPreparedMovies(selected, sourceTag);
      stats.publishedCount = selected.length;
    }

    const manifest = selected.map((item) => item.card);
    await supabaseAdmin
      .from("movie_import_runs")
      .update({
        status: "finished",
        finished_at: new Date().toISOString(),
        found_count: stats.preparedCount,
        created_drafts_count: stats.publishedCount,
        failed_count: 0,
        log: [
          {
            message: "KinoLuma curated pack 300 finished",
            limit,
            dryRun,
            quotas,
            stats,
            examples: manifest.slice(0, 20).map((card) => ({
              title: card.title,
              year: card.year,
              type: card.type,
              slug: card.slug,
              kinopoiskId: card.kinopoiskId,
              tmdbId: card.tmdbId,
              imdbId: card.imdbId,
            })),
            at: new Date().toISOString(),
          },
        ],
      })
      .eq("id", runId);

    return {
      runId,
      packVersion: CURATED_PACK_300_VERSION,
      sourceTag,
      limit,
      dryRun,
      quotas,
      stats,
      manifest,
    };
  } catch (error) {
    if (!dryRun) {
      const rollback = await supabaseAdmin
        .from("movie_drafts")
        .delete()
        .eq("source", sourceTag);
      if (rollback.error) {
        console.error("[KinoLuma curated-pack-300] rollback failed", rollback.error);
      }
    }
    await supabaseAdmin
      .from("movie_import_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        failed_count: 1,
        log: [
          {
            message: "KinoLuma curated pack 300 failed",
            limit,
            dryRun,
            quotas,
            stats,
            error: error instanceof Error ? error.message : String(error),
            at: new Date().toISOString(),
          },
        ],
      })
      .eq("id", runId);
    throw error;
  }
}
