import { movies } from "../../data/movies";
import { mergeAutoPlayersIntoRawJson } from "../players";
import { supabaseAdmin } from "../supabase/admin";
import { generateSlug } from "./generateSlug";
import type { MovieType } from "./types";

const KINOPOISK_BASE_URL = "https://api.kinopoisk.dev/v1.4";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 80;
const PAGE_SIZE = 250;
const MAX_PAGES_PER_RUN = 12;

export type PublishPopularOptions = {
  limit?: number;
  startPage?: number;
  includeCartoons?: boolean;
  includeDocumentaries?: boolean;
};

type KinopoiskDoc = {
  id?: number | string | null;
  name?: string | null;
  alternativeName?: string | null;
  enName?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  slogan?: string | null;
  year?: number | string | null;
  type?: string | null;
  typeNumber?: number | string | null;
  isSeries?: boolean | null;
  movieLength?: number | string | null;
  seriesLength?: number | string | null;
  ageRating?: number | string | null;
  genres?: Array<{ name?: string | null }>;
  countries?: Array<{ name?: string | null }>;
  poster?: { url?: string | null; previewUrl?: string | null } | null;
  backdrop?: { url?: string | null; previewUrl?: string | null } | null;
  rating?: { kp?: number | string | null; imdb?: number | string | null; tmdb?: number | string | null } | null;
  votes?: { kp?: number | string | null; imdb?: number | string | null; tmdb?: number | string | null } | null;
  externalId?: { imdb?: string | null; tmdb?: number | string | null } | null;
  persons?: Array<{
    name?: string | null;
    enName?: string | null;
    profession?: string | null;
    enProfession?: string | null;
  }>;
};

type KinopoiskListResponse = {
  docs?: KinopoiskDoc[];
  page?: number;
  pages?: number;
  total?: number;
};

type ExistingRow = {
  slug: string | null;
  title: string | null;
  year: number | null;
  kinopoisk_id: number | null;
  imdb_id: string | null;
};

type PreparedMovie = {
  title: string;
  originalTitle: string | null;
  slug: string;
  year: number | null;
  type: MovieType;
  genres: string[];
  countries: string[];
  posterUrl: string;
  backdropUrl: string | null;
  kinopoiskId: number;
  imdbId: string | null;
  tmdbId: number | null;
  rating: number;
  actors: string[];
  directors: string[];
  description: string | null;
  longDescription: string;
  rawJson: Record<string, unknown>;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanInt(value: unknown) {
  const parsed = cleanNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function normalize(value: unknown) {
  return cleanString(value)
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniq(values: Array<string | null | undefined>, limit = 12) {
  return Array.from(
    new Set(values.map((value) => cleanString(value)).filter(Boolean)),
  ).slice(0, limit);
}

function getKinopoiskToken() {
  return cleanString(process.env.KINOPOISK_DEV_TOKEN) || cleanString(process.env.KINOPOISK_API_KEY);
}

async function kinopoiskRequest<T>(url: string): Promise<T | null> {
  const token = getKinopoiskToken();
  if (!token) throw new Error("Нет KINOPOISK_DEV_TOKEN или KINOPOISK_API_KEY");

  const response = await fetch(url, {
    headers: {
      "X-API-KEY": token,
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kinopoisk request failed: ${response.status} ${text}`);
  }

  return (await response.json()) as T;
}

function appendFields(url: URL) {
  [
    "id",
    "name",
    "alternativeName",
    "enName",
    "description",
    "shortDescription",
    "slogan",
    "year",
    "type",
    "typeNumber",
    "isSeries",
    "movieLength",
    "seriesLength",
    "ageRating",
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

function buildListUrl(page: number, mode: "votes" | "rating") {
  const url = new URL(`${KINOPOISK_BASE_URL}/movie`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(PAGE_SIZE));
  appendFields(url);
  url.searchParams.append("notNullFields", "id");
  url.searchParams.append("notNullFields", "name");
  url.searchParams.append("notNullFields", "year");
  url.searchParams.append("notNullFields", "poster.url");
  url.searchParams.append("rating.kp", "4.5-10");
  url.searchParams.append("votes.kp", "50-99999999");
  url.searchParams.append("sortField", mode === "votes" ? "votes.kp" : "rating.kp");
  url.searchParams.append("sortType", "-1");
  return url.toString();
}

function imageUrl(image: KinopoiskDoc["poster"] | KinopoiskDoc["backdrop"]) {
  return cleanString(image?.url) || cleanString(image?.previewUrl) || null;
}

function genreNames(doc: KinopoiskDoc) {
  return uniq((doc.genres ?? []).map((genre) => genre.name || null), 10);
}

function countryNames(doc: KinopoiskDoc) {
  return uniq((doc.countries ?? []).map((country) => country.name || null), 8);
}

function isAnime(doc: KinopoiskDoc) {
  const type = normalize(doc.type);
  const typeNumber = cleanInt(doc.typeNumber);
  const genres = genreNames(doc).map(normalize).join(" ");
  return type === "anime" || typeNumber === 4 || /(^|\s)аниме($|\s)|anime/.test(genres);
}

function mapType(doc: KinopoiskDoc): MovieType {
  const type = normalize(doc.type);
  const typeNumber = cleanInt(doc.typeNumber);
  const genres = genreNames(doc).map(normalize).join(" ");

  if (isAnime(doc)) return "anime";
  if (/документ/.test(genres)) return "documentary";
  if (type === "cartoon" || type === "animated series" || type === "animated-series" || typeNumber === 3 || typeNumber === 5) {
    return "cartoon";
  }
  if (doc.isSeries || type === "tv series" || type === "tv-series" || type === "series" || typeNumber === 2) {
    return "series";
  }
  return "film";
}

function getRating(doc: KinopoiskDoc) {
  const rating = cleanNumber(doc.rating?.kp) || cleanNumber(doc.rating?.imdb) || cleanNumber(doc.rating?.tmdb) || 0;
  return Math.max(0, Math.min(10, Math.round(rating * 10) / 10));
}

function getVotes(doc: KinopoiskDoc) {
  return cleanInt(doc.votes?.kp) || cleanInt(doc.votes?.imdb) || cleanInt(doc.votes?.tmdb) || 0;
}

function peopleByProfession(doc: KinopoiskDoc, professions: string[], limit: number) {
  return uniq(
    (doc.persons ?? [])
      .filter((person) => {
        const profession = normalize(person.profession);
        const enProfession = normalize(person.enProfession);
        return professions.some((item) => profession === item || enProfession === item);
      })
      .map((person) => person.name || person.enName),
    limit,
  );
}

function getSeoTypeLabel(type: MovieType) {
  if (type === "series") return "сериал";
  if (type === "documentary") return "документальный фильм";
  if (type === "cartoon") return "мультфильм";
  return "фильм";
}

function trimText(value: string, maxLength: number) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "").replace(/[,.!?;:]+$/g, "")}.`;
}

function buildLongDescription(input: {
  title: string;
  year: number | null;
  type: MovieType;
  genres: string[];
  description: string | null;
}) {
  const typeLabel = getSeoTypeLabel(input.type);
  const yearText = input.year ? ` ${input.year} года` : "";
  const genreText = input.genres.length ? ` в жанрах ${input.genres.slice(0, 4).join(", ")}` : "";
  const description = input.description ? ` ${input.description}` : " Описание будет дополнено после ручной проверки.";
  return `«${input.title}» — ${typeLabel}${yearText}${genreText}.${description} На странице KinoLuma собраны постер, рейтинг и плееры Collapse/Factorios по Kinopoisk ID.`;
}

function buildSeoTitle(movie: PreparedMovie) {
  const yearPart = movie.year ? ` (${movie.year})` : "";
  return trimText(`${movie.title}${yearPart} смотреть онлайн ${getSeoTypeLabel(movie.type)} бесплатно`, 78);
}

function buildSeoDescription(movie: PreparedMovie) {
  const yearPart = movie.year ? ` (${movie.year})` : "";
  const genres = movie.genres.length ? ` Жанры: ${movie.genres.slice(0, 5).join(", ").toLowerCase()}.` : "";
  return trimText(`${movie.title}${yearPart} — ${getSeoTypeLabel(movie.type)} смотреть онлайн на KinoLuma без регистрации.${genres} Рейтинг, постер, описание и плееры Collapse/Factorios.`, 210);
}

function buildFaq(movie: PreparedMovie) {
  return [
    {
      question: `О чём ${getSeoTypeLabel(movie.type)} «${movie.title}»?`,
      answer: movie.description
        ? trimText(movie.description, 260)
        : `На странице «${movie.title}» собраны описание, жанры, рейтинг и данные для просмотра онлайн.`,
    },
    {
      question: `Есть ли плеер для «${movie.title}»?`,
      answer: "Да, автоматически добавлены основной плеер Collapse и запасной Factorios по Kinopoisk ID.",
    },
    {
      question: `Какие жанры у «${movie.title}»?`,
      answer: movie.genres.length ? `Жанры: ${movie.genres.join(", ")}.` : "Жанры пока не указаны в подключённых источниках.",
    },
  ];
}

function staticKinopoiskIds() {
  return new Set(
    movies
      .map((movie) => cleanInt((movie as unknown as { kinopoiskId?: unknown }).kinopoiskId))
      .filter((id): id is number => Boolean(id)),
  );
}

function staticSlugs() {
  return new Set(movies.map((movie) => cleanString(movie.slug)).filter(Boolean));
}

async function loadExisting() {
  const ids = staticKinopoiskIds();
  const slugs = staticSlugs();
  const imdbIds = new Set<string>();

  for (let from = 0; from < 5000; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from("movie_drafts")
      .select("slug,title,year,kinopoisk_id,imdb_id")
      .range(from, from + 999);

    if (error) throw error;
    const rows = (data ?? []) as ExistingRow[];
    if (!rows.length) break;

    for (const row of rows) {
      const kpId = cleanInt(row.kinopoisk_id);
      if (kpId) ids.add(kpId);
      const slug = cleanString(row.slug);
      if (slug) slugs.add(slug);
      const imdbId = cleanString(row.imdb_id).toLowerCase();
      if (imdbId) imdbIds.add(imdbId);
    }

    if (rows.length < 1000) break;
  }

  return { ids, slugs, imdbIds };
}

function prepareDoc(doc: KinopoiskDoc, options: Required<PublishPopularOptions>) {
  const kinopoiskId = cleanInt(doc.id);
  if (!kinopoiskId) return { movie: null, skippedReason: "no_kinopoisk_id" } as const;
  if (isAnime(doc)) return { movie: null, skippedReason: "anime_skipped" } as const;

  const type = mapType(doc);
  if (type === "anime") return { movie: null, skippedReason: "anime_skipped" } as const;
  if (type === "cartoon" && !options.includeCartoons) return { movie: null, skippedReason: "cartoon_skipped" } as const;
  if (type === "documentary" && !options.includeDocumentaries) return { movie: null, skippedReason: "documentary_skipped" } as const;

  const title = cleanString(doc.name) || cleanString(doc.alternativeName) || cleanString(doc.enName);
  if (!title) return { movie: null, skippedReason: "no_title" } as const;

  const year = cleanInt(doc.year);
  const posterUrl = imageUrl(doc.poster);
  if (!posterUrl) return { movie: null, skippedReason: "no_poster" } as const;

  const rating = getRating(doc);
  const votes = getVotes(doc);
  if (rating > 0 && rating < 4.5) return { movie: null, skippedReason: "low_rating" } as const;
  if (votes > 0 && votes < 25) return { movie: null, skippedReason: "low_votes" } as const;

  const genres = genreNames(doc);
  const countries = countryNames(doc);
  const description = cleanString(doc.description) || cleanString(doc.shortDescription) || null;
  const imdbId = cleanString(doc.externalId?.imdb) || null;
  const tmdbId = cleanInt(doc.externalId?.tmdb);
  const slug = generateSlug(title, year ?? undefined);
  const contentType = type === "series" ? "series" : "movie";
  const rawJsonBase = {
    kinopoisk: doc,
    kinoluma: {
      import_mode: "published_fast_kinopoisk_only",
      imported_at: new Date().toISOString(),
      manual_rating: rating,
      votes_kp: cleanInt(doc.votes?.kp) || null,
    },
  };
  const rawJson = mergeAutoPlayersIntoRawJson(rawJsonBase, {
    kinopoiskId,
    imdbId,
    movieType: type,
    contentType,
  });

  const movie: PreparedMovie = {
    title,
    originalTitle: cleanString(doc.alternativeName || doc.enName) || null,
    slug,
    year,
    type,
    genres,
    countries,
    posterUrl,
    backdropUrl: imageUrl(doc.backdrop),
    kinopoiskId,
    imdbId,
    tmdbId,
    rating,
    actors: peopleByProfession(doc, ["актеры", "actor"], 12),
    directors: peopleByProfession(doc, ["режиссеры", "director"], 8),
    description,
    longDescription: buildLongDescription({ title, year, type, genres, description }),
    rawJson,
  };

  return { movie, skippedReason: null } as const;
}

function normalizeOptions(options: PublishPopularOptions): Required<PublishPopularOptions> {
  return {
    limit: Math.max(1, Math.min(MAX_LIMIT, Math.trunc(options.limit || DEFAULT_LIMIT))),
    startPage: Math.max(1, Math.trunc(options.startPage || 1)),
    includeCartoons: options.includeCartoons ?? true,
    includeDocumentaries: options.includeDocumentaries ?? true,
  };
}

async function insertMovies(moviesToInsert: PreparedMovie[]) {
  if (!moviesToInsert.length) return;

  const rows = moviesToInsert.map((movie) => ({
    title: movie.title,
    original_title: movie.originalTitle,
    slug: movie.slug,
    year: movie.year,
    type: movie.type,
    genres: movie.genres,
    poster_url: movie.posterUrl,
    backdrop_url: movie.backdropUrl,
    tmdb_id: movie.tmdbId,
    kinopoisk_id: movie.kinopoiskId,
    imdb_id: movie.imdbId,
    actors: movie.actors,
    directors: movie.directors,
    description: movie.description,
    long_description: movie.longDescription,
    seo_title: buildSeoTitle(movie),
    seo_description: buildSeoDescription(movie),
    faq: buildFaq(movie),
    trailer_provider: null,
    trailer_key: null,
    trailer_url: null,
    trailer_embed_url: null,
    trailer_source: null,
    trailer_confidence: 0,
    trailer_status: "missing",
    similar_movie_ids: [],
    source: "kinopoisk_fast_public",
    raw_json: movie.rawJson,
    status: "published",
    quality_score: null,
    moderation_notes: "Быстрая автопубликация из Kinopoisk.dev. Плееры Collapse + Factorios по Kinopoisk ID. Vibix/Rendex не добавлялся.",
  }));

  const { error } = await supabaseAdmin.from("movie_drafts").insert(rows);
  if (error) throw error;
}

export async function publishPopularMovies(options: PublishPopularOptions = {}) {
  const normalizedOptions = normalizeOptions(options);
  const runInsert = await supabaseAdmin
    .from("movie_import_runs")
    .insert({
      status: "running",
      log: [
        {
          message: "Fast Kinopoisk-only public import started",
          options: normalizedOptions,
          at: new Date().toISOString(),
        },
      ],
    })
    .select("id")
    .single();

  if (runInsert.error) throw runInsert.error;
  const runId = runInsert.data.id as string;

  const stats = {
    scannedCount: 0,
    preparedCount: 0,
    publishedCount: 0,
    duplicateCount: 0,
    failedCount: 0,
    skipped: {} as Record<string, number>,
    pages: [] as Array<Record<string, unknown>>,
    examples: [] as Array<Record<string, unknown>>,
  };

  try {
    const existing = await loadExisting();
    const prepared: PreparedMovie[] = [];

    for (let offset = 0; offset < MAX_PAGES_PER_RUN && prepared.length < normalizedOptions.limit; offset += 1) {
      const page = normalizedOptions.startPage + offset;
      const mode: "votes" | "rating" = offset % 3 === 2 ? "rating" : "votes";
      const url = buildListUrl(page, mode);
      const response = await kinopoiskRequest<KinopoiskListResponse>(url);
      const docs = Array.isArray(response?.docs) ? response.docs : [];
      stats.pages.push({ page, mode, received: docs.length });

      for (const doc of docs) {
        if (prepared.length >= normalizedOptions.limit) break;
        stats.scannedCount += 1;

        const preparedDoc = prepareDoc(doc, normalizedOptions);
        if (!preparedDoc.movie) {
          const key = preparedDoc.skippedReason || "unknown";
          stats.skipped[key] = (stats.skipped[key] || 0) + 1;
          continue;
        }

        const movie = preparedDoc.movie;
        const normalizedImdb = cleanString(movie.imdbId).toLowerCase();
        if (existing.ids.has(movie.kinopoiskId) || existing.slugs.has(movie.slug) || (normalizedImdb && existing.imdbIds.has(normalizedImdb))) {
          stats.duplicateCount += 1;
          continue;
        }

        existing.ids.add(movie.kinopoiskId);
        existing.slugs.add(movie.slug);
        if (normalizedImdb) existing.imdbIds.add(normalizedImdb);
        stats.preparedCount += 1;
        prepared.push(movie);
      }
    }

    await insertMovies(prepared);
    stats.publishedCount = prepared.length;
    stats.examples = prepared.slice(0, 20).map((movie) => ({
      title: movie.title,
      year: movie.year,
      type: movie.type,
      slug: movie.slug,
      kinopoiskId: movie.kinopoiskId,
      rating: movie.rating,
    }));

    await supabaseAdmin
      .from("movie_import_runs")
      .update({
        status: "finished",
        finished_at: new Date().toISOString(),
        found_count: stats.preparedCount,
        created_drafts_count: stats.publishedCount,
        failed_count: stats.failedCount,
        log: [
          {
            message: "Fast Kinopoisk-only public import finished",
            options: normalizedOptions,
            ...stats,
            at: new Date().toISOString(),
          },
        ],
      })
      .eq("id", runId);

    return { runId, ...normalizedOptions, ...stats };
  } catch (error) {
    await supabaseAdmin
      .from("movie_import_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        failed_count: 1,
        log: [
          {
            message: "Fast Kinopoisk-only public import failed",
            options: normalizedOptions,
            error: error instanceof Error ? error.message : String(error),
            ...stats,
            at: new Date().toISOString(),
          },
        ],
      })
      .eq("id", runId);

    throw error;
  }
}
