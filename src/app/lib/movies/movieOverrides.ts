import { revalidateTag, unstable_cache } from "next/cache";

import {
  movies,
  sanitizeMovieForPublicDisplay,
  type CastMember,
  type ContentType,
  type Movie,
  type MovieFact,
  type PlayerProvider,
} from "../../data/movies";
import { supabaseAdmin } from "../supabase/admin";

export type MovieOverrideData = Partial<Movie> & Record<string, unknown>;

type MovieDraftRow = {
  id: string;
  title: string | null;
  original_title: string | null;
  slug: string | null;
  year: number | string | null;
  type: string | null;
  genres: string[] | null;
  poster_url: string | null;
  backdrop_url: string | null;
  tmdb_id: number | null;
  kinopoisk_id: number | null;
  imdb_id: string | null;
  actors: string[] | null;
  directors: string[] | null;
  description: string | null;
  long_description: string | null;
  trailer_url: string | null;
  trailer_embed_url: string | null;
  quality_score: number | null;
  raw_json: unknown;
  status: string | null;
  updated_at: string | null;
  created_at: string | null;
};

const DEFAULT_PLAYERS: PlayerProvider[] = [
  { id: "player-1", name: "Плеер 1", embedUrl: "" },
  { id: "player-2", name: "Плеер 2", embedUrl: "" },
  { id: "player-3", name: "Плеер 3", embedUrl: "" },
];

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value: unknown, limit = 12) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => cleanString(item))
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
    .slice(0, limit);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  return "unknown error";
}

function warnSupabaseReadFallback(scope: string, error: unknown) {
  console.warn(`${scope}: ${getErrorMessage(error)}. Используем данные из movies.ts без Supabase-overrides.`);
}

function shouldLoadPublishedDraftMovies() {
  // Публичная публикация movie_drafts не включена по умолчанию.
  // После больших контент-паков этот запрос может тормозить next build и ловить
  // Supabase statement timeout. Включай только осознанно через env.
  return process.env.KINOLUMA_LOAD_PUBLISHED_DRAFTS === "true";
}

function mapDraftType(type: string | null): ContentType {
  if (type === "series" || type === "tv") return "Сериал";
  if (type === "anime") return "Аниме";
  if (type === "cartoon") return "Мультфильм";
  if (type === "documentary") return "Документальный";
  return "Фильм";
}

function getStableMovieId(slug: string) {
  let hash = 0;

  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) % 900000;
  }

  return 900000000 + hash;
}

function escapePosterText(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createDraftPoster(title: string, originalTitle: string) {
  const safeTitle = escapePosterText(title || "KinoLuma");
  const safeOriginal = escapePosterText(originalTitle || "Published draft");

  const svg = `
    <svg width="500" height="750" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="750" gradientUnits="userSpaceOnUse">
          <stop stop-color="#303030"/>
          <stop offset="0.54" stop-color="#080808"/>
          <stop offset="1" stop-color="#000000"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="20%" r="70%">
          <stop stop-color="#ffffff" stop-opacity="0.20"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="500" height="750" fill="url(#bg)"/>
      <rect width="500" height="750" fill="url(#glow)"/>
      <rect x="32" y="32" width="436" height="686" rx="34" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2"/>
      <circle cx="250" cy="276" r="104" fill="#ffffff" opacity="0.06"/>
      <path d="M218 228V324L302 276L218 228Z" fill="#ffffff" opacity="0.82"/>
      <text x="250" y="452" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900">${safeTitle}</text>
      <text x="250" y="496" text-anchor="middle" fill="#a3a3a3" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800">${safeOriginal}</text>
      <text x="250" y="650" text-anchor="middle" fill="#737373" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="900">KinoLuma</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildCollapseKinopoiskUrl(kinopoiskId: string) {
  const id = kinopoiskId.trim().match(/\d+/)?.[0] || "";
  return id
    ? `https://api.ortified.ws/embed/kp/${id}?sharing=false&episodesOpen=false`
    : "";
}

function buildCollapseMovieUrl(contentId: string) {
  const id = contentId.trim().match(/\d+/)?.[0] || "";
  return id
    ? `https://api.ortified.ws/embed/movie/${id}?sharing=false&episodesOpen=false`
    : "";
}

function buildCollapseImdbUrl(imdbId: string) {
  const match = imdbId.trim().match(/tt\d+|\d+/i)?.[0] || "";
  if (!match) return "";

  const id = match.toLowerCase().startsWith("tt")
    ? match.toLowerCase()
    : `tt${match}`;
  return `https://api.ortified.ws/embed/imdb/${id}?sharing=false&episodesOpen=false`;
}

function buildCollapseUrl(kind: string, rawId: string) {
  const normalizedKind = kind.trim().toLowerCase() || "movie";

  if (normalizedKind === "kp" || normalizedKind === "kinopoisk")
    return buildCollapseKinopoiskUrl(rawId);
  if (normalizedKind === "imdb") return buildCollapseImdbUrl(rawId);

  return buildCollapseMovieUrl(rawId);
}

function getManualPlayers(rawJson: unknown): PlayerProvider[] {
  const raw = asRecord(rawJson);
  const kinoluma = asRecord(raw.kinoluma);
  const players = Array.isArray(kinoluma.players) ? kinoluma.players : [];

  return players
    .map((player, index) => {
      const item = asRecord(player);
      const type = cleanString(item.type).toLowerCase();
      const embedUrl = cleanString(item.embedUrl);
      const contentId =
        cleanString(item.contentId) || cleanString(item.rendexVideoId);
      const name = cleanString(item.name) || `Плеер ${index + 1}`;

      if (
        type === "collapse" ||
        type === "collaps" ||
        type === "collapse-iframe" ||
        type === "collaps-iframe"
      ) {
        const contentKind =
          cleanString(item.contentKind) ||
          cleanString(item.contentType) ||
          "movie";
        const collapseUrl =
          embedUrl || buildCollapseUrl(contentKind, contentId);

        if (!collapseUrl) return null;

        return {
          id:
            cleanString(item.id) ||
            `collapse-${contentKind}-${contentId || index + 1}`,
          name,
          embedUrl: collapseUrl,
          type:
            type === "collapse-iframe" || type === "collaps-iframe"
              ? "collapse-iframe"
              : "collapse",
          provider: "collapse",
          contentKind,
          contentType: contentKind,
          contentId,
        } as PlayerProvider & Record<string, unknown>;
      }

      if (type === "rendex" && contentId) {
        return {
          id: cleanString(item.id) || `rendex-${contentId}`,
          name,
          embedUrl: "",
          type: "rendex",
          provider: "rendex",
          publisherId:
            cleanString(item.publisherId) ||
            process.env.RENDEX_PUBLISHER_ID ||
            process.env.VIBIX_PUBLISHER_ID ||
            "678053396",
          contentType: cleanString(item.contentType) || "movie",
          contentId,
          rendexVideoId: contentId,
          design: cleanString(item.design) || "1",
          color1: cleanString(item.color1) || "#56CEAA",
          color2: cleanString(item.color2) || "#FFFFFF",
          color3: cleanString(item.color3) || "#AEC7BC",
          color4: cleanString(item.color4) || "#42BD88",
          color5: cleanString(item.color5) || "#000000",
        } as PlayerProvider & Record<string, unknown>;
      }

      if (!embedUrl) return null;

      return {
        id: cleanString(item.id) || `player-${index + 1}`,
        name,
        embedUrl,
        type: type || "iframe",
      } as PlayerProvider & Record<string, unknown>;
    })
    .filter((player): player is PlayerProvider => Boolean(player));
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function roundRating(value: number) {
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

function getNestedRecord(source: Record<string, unknown>, key: string) {
  return asRecord(source[key]);
}

function getRawSourceRecords(rawJson: unknown) {
  const raw = asRecord(rawJson);
  const tmdb = getNestedRecord(raw, "tmdb");
  const kinopoisk = getNestedRecord(raw, "kinopoisk");
  const candidate = getNestedRecord(raw, "candidate");

  return { raw, tmdb, kinopoisk, candidate };
}

function getRatingFromRawJson(rawJson: unknown) {
  const { raw, tmdb, kinopoisk, candidate } = getRawSourceRecords(rawJson);
  const kinoluma = getNestedRecord(raw, "kinoluma");
  const kinopoiskRating = asRecord(kinopoisk.rating);
  const manualRating = getNumber(kinoluma.manual_rating);
  const kpRating = getNumber(kinopoiskRating.kp);
  const imdbRating = getNumber(kinopoiskRating.imdb);
  const tmdbRating =
    getNumber(tmdb.vote_average) ?? getNumber(candidate.vote_average);
  const tmdbVoteCount =
    getNumber(tmdb.vote_count) ?? getNumber(candidate.vote_count) ?? 0;

  if (manualRating && manualRating > 0) return roundRating(manualRating);
  if (kpRating && kpRating > 0) return roundRating(kpRating);
  if (imdbRating && imdbRating > 0) return roundRating(imdbRating);
  if (tmdbRating && tmdbRating > 0 && tmdbVoteCount > 0)
    return roundRating(tmdbRating);

  return 0;
}

function getDurationFromRawJson(rawJson: unknown) {
  const { tmdb, kinopoisk } = getRawSourceRecords(rawJson);
  const runtime =
    getNumber(tmdb.runtime) ??
    getNumber(kinopoisk.movieLength) ??
    getNumber(kinopoisk.seriesLength);

  if (runtime && runtime > 0) return `${Math.round(runtime)} мин`;

  const episodeRunTime = Array.isArray(tmdb.episode_run_time)
    ? tmdb.episode_run_time
    : [];
  const firstEpisodeRuntime = episodeRunTime
    .map(getNumber)
    .find((value) => value && value > 0);

  return firstEpisodeRuntime ? `${Math.round(firstEpisodeRuntime)} мин` : "";
}

function getCountryFromRawJson(rawJson: unknown) {
  const { tmdb, kinopoisk } = getRawSourceRecords(rawJson);
  const countriesFromKinopoisk = Array.isArray(kinopoisk.countries)
    ? kinopoisk.countries
        .map((country) => cleanString(asRecord(country).name))
        .filter(Boolean)
    : [];
  const countriesFromTmdb = Array.isArray(tmdb.production_countries)
    ? tmdb.production_countries
        .map((country) => cleanString(asRecord(country).name))
        .filter(Boolean)
    : [];
  const originCountries = cleanStringArray(tmdb.origin_country, 4);
  const countries = Array.from(
    new Set([
      ...countriesFromKinopoisk,
      ...countriesFromTmdb,
      ...originCountries,
    ]),
  );

  return countries.slice(0, 3).join(", ");
}

function getStudioFromRawJson(rawJson: unknown) {
  const { tmdb, kinopoisk } = getRawSourceRecords(rawJson);
  const tmdbCompanies = Array.isArray(tmdb.production_companies)
    ? tmdb.production_companies
        .map((company) => cleanString(asRecord(company).name))
        .filter(Boolean)
    : [];
  const networks = Array.isArray(tmdb.networks)
    ? tmdb.networks
        .map((network) => cleanString(asRecord(network).name))
        .filter(Boolean)
    : [];
  const kinopoiskCompanies = Array.isArray(kinopoisk.productionCompanies)
    ? kinopoisk.productionCompanies
        .map((company) => cleanString(asRecord(company).name))
        .filter(Boolean)
    : [];
  const studios = Array.from(
    new Set([...kinopoiskCompanies, ...tmdbCompanies, ...networks]),
  );

  return studios.slice(0, 3).join(", ");
}

function getBudgetFromRawJson(rawJson: unknown) {
  const { tmdb, kinopoisk } = getRawSourceRecords(rawJson);
  const budget =
    getNumber(tmdb.budget) ?? getNumber(asRecord(kinopoisk.budget).value);

  if (!budget || budget <= 0) return "";

  return `$${Math.round(budget).toLocaleString("en-US")}`;
}

function getDraftFacts(draft: MovieDraftRow): MovieFact[] {
  const facts: MovieFact[] = [];
  const country = getCountryFromRawJson(draft.raw_json);
  const duration = getDurationFromRawJson(draft.raw_json);
  const budget = getBudgetFromRawJson(draft.raw_json);
  const studio = getStudioFromRawJson(draft.raw_json);

  if (draft.year) facts.push({ label: "Год", value: String(draft.year) });
  facts.push({ label: "Тип", value: mapDraftType(draft.type) });
  if (country) facts.push({ label: "Страна", value: country });
  if (duration) facts.push({ label: "Длительность", value: duration });
  if (budget) facts.push({ label: "Бюджет", value: budget });
  if (studio) facts.push({ label: "Студия", value: studio });
  if (draft.directors?.length)
    facts.push({
      label: "Режиссёр",
      value: draft.directors.slice(0, 3).join(", "),
    });

  return facts;
}

function getDraftCast(draft: MovieDraftRow): CastMember[] {
  return cleanStringArray(draft.actors, 12).map((actor) => ({
    name: actor,
    role: "Актёр",
  }));
}

function draftToMovie(draft: MovieDraftRow): Movie | null {
  const slug = cleanString(draft.slug);
  const title = cleanString(draft.title);

  if (!slug || !title || draft.status !== "published") {
    return null;
  }

  const originalTitle = cleanString(draft.original_title) || title;
  const genres = cleanStringArray(draft.genres, 12);
  const poster =
    cleanString(draft.poster_url) ||
    cleanString(draft.backdrop_url) ||
    createDraftPoster(title, originalTitle);
  const players = getManualPlayers(draft.raw_json);

  return {
    id: getStableMovieId(slug),
    kinopoiskId: draft.kinopoisk_id ?? undefined,
    tmdbId: draft.tmdb_id ?? undefined,
    imdbId: cleanString(draft.imdb_id) || undefined,
    slug,
    title,
    originalTitle,
    searchTitles: [title, originalTitle, slug].filter(
      (value, index, array) => value && array.indexOf(value) === index,
    ),
    type: mapDraftType(draft.type),
    year: draft.year ? String(draft.year) : "",
    rating: getRatingFromRawJson(draft.raw_json),
    genres,
    poster,
    backdrop: cleanString(draft.backdrop_url) || undefined,
    description:
      cleanString(draft.description) ||
      `${title} — материал KinoLuma, опубликованный из импортного черновика после проверки.`,
    trailerUrl:
      cleanString(draft.trailer_embed_url) || cleanString(draft.trailer_url),
    longDescription: cleanString(draft.long_description) || undefined,
    facts: getDraftFacts(draft),
    cast: getDraftCast(draft),
    players: players.length ? players : DEFAULT_PLAYERS,
  } as Movie & Record<string, unknown>;
}

async function getPublishedDraftMovies() {
  if (!shouldLoadPublishedDraftMovies()) {
    return [];
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("movie_drafts")
      .select(
        "id, title, original_title, slug, year, type, genres, poster_url, backdrop_url, tmdb_id, kinopoisk_id, imdb_id, actors, directors, description, long_description, trailer_url, trailer_embed_url, quality_score, raw_json, status, created_at, updated_at",
      )
      .eq("status", "published")
      .order("updated_at", { ascending: false });

    if (error) {
      warnSupabaseReadFallback(
        "Не удалось загрузить опубликованные movie_drafts",
        error,
      );
      return [];
    }

    return ((data ?? []) as MovieDraftRow[])
      .map(draftToMovie)
      .filter((movie): movie is Movie => Boolean(movie));
  } catch (error) {
    warnSupabaseReadFallback(
      "Не удалось загрузить опубликованные movie_drafts",
      error,
    );
    return [];
  }
}

async function getMovieOverridesBySlugs(slugs: string[]) {
  if (!slugs.length) return new Map<string, MovieOverrideData>();

  const result = new Map<string, MovieOverrideData>();
  const uniqueSlugs = Array.from(new Set(slugs.map(cleanString).filter(Boolean)));

  // Важно: после больших контент-паков один .in("slug", 500+ slugs)
  // превращается в слишком длинный URL для Supabase/PostgREST и может дать fetch failed.
  // Поэтому грузим overrides маленькими пачками и не роняем публичный каталог.
  for (const slugChunk of chunkArray(uniqueSlugs, 80)) {
    try {
      const { data, error } = await supabaseAdmin
        .from("movie_overrides")
        .select("slug, data")
        .in("slug", slugChunk);

      if (error) {
        warnSupabaseReadFallback("Не удалось загрузить movie_overrides", error);
        continue;
      }

      for (const row of data ?? []) {
        const slug = cleanString((row as { slug?: unknown }).slug);
        const overrideData = (row as { data?: unknown }).data;

        if (
          slug &&
          overrideData &&
          typeof overrideData === "object" &&
          !Array.isArray(overrideData)
        ) {
          result.set(slug, overrideData as MovieOverrideData);
        }
      }
    } catch (error) {
      warnSupabaseReadFallback("Не удалось загрузить movie_overrides", error);
    }
  }

  return result;
}

function isHiddenOverride(override: MovieOverrideData | null | undefined) {
  return Boolean(override && override.hidden === true);
}

function getSafeOverrideRating(baseRating: number, overrideRating: unknown) {
  const normalizedRating = getNumber(overrideRating);

  if (normalizedRating === null || normalizedRating <= 0) {
    return baseRating;
  }

  return roundRating(normalizedRating);
}

function applyOverride(
  movie: Movie,
  override: MovieOverrideData | null | undefined,
): Movie {
  if (!override) return movie;

  const mergedMovie = {
    ...movie,
    ...override,
    id: movie.id,
    slug: movie.slug,
  } as Movie;

  if (Object.prototype.hasOwnProperty.call(override, "rating")) {
    mergedMovie.rating = getSafeOverrideRating(movie.rating, override.rating);
  }

  return mergedMovie;
}

const baseMoviesBySlug = new Map(movies.map((movie) => [movie.slug, movie]));

export function getBaseMovieBySlug(slug: string) {
  return baseMoviesBySlug.get(slug) || null;
}

export async function getPublicMovies(): Promise<Movie[]> {
  const draftMovies = await getPublishedDraftMovies();
  const bySlug = new Map<string, Movie>();

  movies.forEach((movie) => bySlug.set(movie.slug, movie));

  draftMovies.forEach((movie) => {
    bySlug.set(movie.slug, movie);
  });

  const slugs = Array.from(bySlug.keys());
  const overrides = await getMovieOverridesBySlugs(slugs);

  return Array.from(bySlug.values())
    .map((movie) => applyOverride(movie, overrides.get(movie.slug)))
    .filter((movie) => !(movie as Movie & { hidden?: boolean }).hidden)
    .map((movie) => sanitizeMovieForPublicDisplay(movie));
}


// Do not wrap the full public movie list in unstable_cache: Next.js has a
// 2 MB data-cache entry limit, while the full catalog can be larger.
// Keep the exported name so pages can continue using the optimized lighter
// client payloads without triggering the oversized cache error.
export const getCachedPublicMovies = getPublicMovies;

export async function getPublicBaseMovieBySlug(
  slug: string,
): Promise<Movie | null> {
  const fallbackMovie = getBaseMovieBySlug(slug);

  // В обычном режиме каталог уже лежит в data/movies.ts. Не ходим в Supabase
  // за movie_drafts на каждую страницу фильма: это давало задержку на серверном
  // рендере. Если опубликованные drafts действительно нужны публично, включи
  // KINOLUMA_LOAD_PUBLISHED_DRAFTS=true.
  if (!shouldLoadPublishedDraftMovies()) {
    return fallbackMovie ? sanitizeMovieForPublicDisplay(fallbackMovie) : null;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("movie_drafts")
      .select(
        "id, title, original_title, slug, year, type, genres, poster_url, backdrop_url, tmdb_id, kinopoisk_id, imdb_id, actors, directors, description, long_description, trailer_url, trailer_embed_url, quality_score, raw_json, status, created_at, updated_at",
      )
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      warnSupabaseReadFallback(
        "Не удалось загрузить опубликованный movie_draft",
        error,
      );
      return fallbackMovie ? sanitizeMovieForPublicDisplay(fallbackMovie) : null;
    }

    const draftMovie = data ? draftToMovie(data as MovieDraftRow) : null;

    if (draftMovie) {
      return draftMovie;
    }
  } catch (error) {
    warnSupabaseReadFallback(
      "Не удалось загрузить опубликованный movie_draft",
      error,
    );
  }

  return fallbackMovie ? sanitizeMovieForPublicDisplay(fallbackMovie) : null;
}

export async function getMovieOverrideData(
  slug: string,
): Promise<MovieOverrideData | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("movie_overrides")
      .select("data")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      warnSupabaseReadFallback("Не удалось загрузить movie_overrides", error);
      return null;
    }

    if (!data?.data || typeof data.data !== "object") {
      return null;
    }

    return data.data as MovieOverrideData;
  } catch (error) {
    warnSupabaseReadFallback("Не удалось загрузить movie_overrides", error);
    return null;
  }
}

export async function getMovieWithOverrides(
  slug: string,
): Promise<Movie | null> {
  const baseMovie = await getPublicBaseMovieBySlug(slug);

  if (!baseMovie) {
    return null;
  }

  const override = await getMovieOverrideData(slug);

  if (isHiddenOverride(override)) {
    return null;
  }

  return sanitizeMovieForPublicDisplay(applyOverride(baseMovie, override));
}


export const getCachedMovieWithOverrides = unstable_cache(
  getMovieWithOverrides,
  ["movie-with-overrides"],
  {
    revalidate: 3600,
    tags: ["movies"],
  },
);

export async function saveMovieOverride(
  slug: string,
  data: MovieOverrideData,
  updatedBy: string,
) {
  const { error } = await supabaseAdmin.from("movie_overrides").upsert(
    {
      slug,
      data,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" },
  );

  if (error) {
    throw error;
  }

  revalidateTag("movies", "max");
}
