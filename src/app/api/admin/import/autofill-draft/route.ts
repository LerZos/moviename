import { assertAdminSecret } from "../../../../lib/import/adminAuth";
import { tmdbFetch, tmdbImage } from "../../../../lib/import/tmdb";
import { generateTemplateMovieSeo } from "../../../../lib/seo/generateTemplateMovieSeo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ManualDraftValues = Record<string, unknown>;
type MediaType = "movie" | "tv";

type TmdbGenre = { id?: number; name?: string };
type TmdbCreditPerson = { name?: string; job?: string };
type TmdbVideo = {
  key?: string;
  site?: string;
  type?: string;
  name?: string;
  official?: boolean;
  iso_639_1?: string;
};
type TmdbDetails = {
  id?: number;
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
  vote_average?: number;
  credits?: {
    cast?: TmdbCreditPerson[];
    crew?: TmdbCreditPerson[];
  };
  created_by?: Array<{ name?: string }>;
  videos?: { results?: TmdbVideo[] };
  external_ids?: {
    imdb_id?: string | null;
  };
};
type TmdbSearchResponse = {
  results?: Array<TmdbDetails & { popularity?: number }>;
};
type TmdbFindResponse = {
  movie_results?: TmdbDetails[];
  tv_results?: TmdbDetails[];
};

type KinopoiskDoc = {
  id?: number;
  name?: string;
  alternativeName?: string;
  enName?: string;
  description?: string;
  shortDescription?: string;
  year?: number;
  type?: string;
  isSeries?: boolean;
  genres?: Array<{ name?: string }>;
  countries?: Array<{ name?: string }>;
  persons?: Array<{
    name?: string;
    enName?: string;
    profession?: string;
    enProfession?: string;
  }>;
  poster?: { url?: string; previewUrl?: string };
  backdrop?: { url?: string; previewUrl?: string };
  rating?: { kp?: number | string; imdb?: number | string; tmdb?: number | string };
  externalId?: {
    imdb?: string | null;
    tmdb?: number | string | null;
  };
  videos?: {
    trailers?: Array<{ url?: string; name?: string; site?: string }>;
  };
};
type KinopoiskSearchResponse = { docs?: KinopoiskDoc[] };

function cleanText(value: unknown) {
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

function normalizeText(value: unknown) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function getYear(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  const text = cleanText(value);
  const direct = cleanInt(text);
  if (direct && direct >= 1880 && direct <= 2100) return direct;

  const match = text.match(/\d{4}/);
  return match ? cleanInt(match[0]) : null;
}

function yearFromDate(value: unknown) {
  return getYear(cleanText(value).slice(0, 4));
}

function unique(items: Array<string | null | undefined>, limit = 12) {
  return items
    .map((item) => cleanText(item))
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
    .slice(0, limit);
}

function buildPath(path: string, params: Record<string, string | number | null | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim()) {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

async function safeTmdbFetch<T>(path: string): Promise<T | null> {
  if (!process.env.TMDB_ACCESS_TOKEN?.trim()) return null;

  try {
    return await tmdbFetch<T>(path);
  } catch {
    return null;
  }
}

function preferredMediaTypes(type: unknown): MediaType[] {
  const normalized = cleanText(type).toLowerCase();
  if (normalized === "series") return ["tv", "movie"];
  if (normalized === "anime" || normalized === "cartoon") return ["movie", "tv"];
  return ["movie", "tv"];
}

async function fetchTmdbDetails(mediaType: MediaType, id: number) {
  return safeTmdbFetch<TmdbDetails>(
    buildPath(`/${mediaType}/${id}`, {
      language: "ru-RU",
      append_to_response: "credits,videos,external_ids",
    }),
  );
}

function scoreTmdbMatch(item: TmdbDetails & { popularity?: number }, input: {
  title: string;
  year: number | null;
}) {
  const expectedTitle = normalizeText(input.title);
  const actualTitle = normalizeText(item.title || item.name);
  const originalTitle = normalizeText(item.original_title || item.original_name);
  const itemYear = yearFromDate(item.release_date || item.first_air_date);
  let score = Number(item.popularity || 0);

  if (actualTitle === expectedTitle || originalTitle === expectedTitle) score += 1000;
  if (actualTitle.includes(expectedTitle) || expectedTitle.includes(actualTitle)) score += 180;
  if (input.year && itemYear === input.year) score += 250;
  if (input.year && itemYear && Math.abs(itemYear - input.year) === 1) score += 60;

  return score;
}

async function findTmdbByImdb(imdbId: string, type: unknown) {
  const data = await safeTmdbFetch<TmdbFindResponse>(
    buildPath(`/find/${encodeURIComponent(imdbId)}`, {
      language: "ru-RU",
      external_source: "imdb_id",
    }),
  );
  if (!data) return null;

  const mediaTypes = preferredMediaTypes(type);
  const movie = data.movie_results?.[0];
  const tv = data.tv_results?.[0];
  const firstType = mediaTypes[0];

  if (firstType === "tv" && tv?.id) return { mediaType: "tv" as const, id: tv.id };
  if (firstType === "movie" && movie?.id) return { mediaType: "movie" as const, id: movie.id };
  if (movie?.id) return { mediaType: "movie" as const, id: movie.id };
  if (tv?.id) return { mediaType: "tv" as const, id: tv.id };

  return null;
}

async function findTmdbByTitle(values: ManualDraftValues) {
  const title = cleanText(values.title) || cleanText(values.original_title);
  if (!title) return null;

  const year = getYear(values.year);
  const candidates: Array<TmdbDetails & { mediaType: MediaType; popularity?: number }> = [];

  for (const mediaType of preferredMediaTypes(values.type)) {
    const path = buildPath(`/search/${mediaType}`, {
      language: "ru-RU",
      query: title,
      include_adult: "false",
      ...(year
        ? mediaType === "movie"
          ? { year }
          : { first_air_date_year: year }
        : {}),
    });
    const data = await safeTmdbFetch<TmdbSearchResponse>(path);
    const results = Array.isArray(data?.results) ? data.results : [];

    results.forEach((item) => {
      if (item.id) candidates.push({ ...item, mediaType });
    });
  }

  return (
    candidates
      .sort((left, right) => scoreTmdbMatch(right, { title, year }) - scoreTmdbMatch(left, { title, year }))[0] || null
  );
}

async function findTmdb(values: ManualDraftValues) {
  const tmdbId = cleanInt(values.tmdb_id);
  const mediaTypes = preferredMediaTypes(values.type);

  if (tmdbId) {
    for (const mediaType of mediaTypes) {
      const details = await fetchTmdbDetails(mediaType, tmdbId);
      if (details?.id) return { mediaType, details };
    }
  }

  const imdbId = cleanText(values.imdb_id);
  if (imdbId) {
    const foundByImdb = await findTmdbByImdb(imdbId, values.type);
    if (foundByImdb) {
      const details = await fetchTmdbDetails(foundByImdb.mediaType, foundByImdb.id);
      if (details?.id) return { mediaType: foundByImdb.mediaType, details };
    }
  }

  const foundByTitle = await findTmdbByTitle(values);
  if (foundByTitle?.id) {
    const details = await fetchTmdbDetails(foundByTitle.mediaType, foundByTitle.id);
    if (details?.id) return { mediaType: foundByTitle.mediaType, details };
  }

  return null;
}

function getKinopoiskToken() {
  return process.env.KINOPOISK_DEV_TOKEN?.trim() || process.env.KINOPOISK_API_KEY?.trim() || "";
}

async function kinopoiskFetch<T>(pathOrUrl: string): Promise<T | null> {
  const token = getKinopoiskToken();
  if (!token) return null;

  try {
    const url = pathOrUrl.startsWith("http")
      ? pathOrUrl
      : `https://api.kinopoisk.dev/v1.4${pathOrUrl}`;
    const response = await fetch(url, {
      headers: {
        "X-API-KEY": token,
        accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function isLikelyKinopoiskMatch(doc: KinopoiskDoc, input: {
  title: string;
  originalTitle: string;
  year: number | null;
}) {
  const expected = [input.title, input.originalTitle].map(normalizeText).filter(Boolean);
  const actual = [doc.name, doc.alternativeName, doc.enName].map(normalizeText).filter(Boolean);
  const titleMatches =
    !expected.length ||
    actual.some((actualTitle) =>
      expected.some(
        (expectedTitle) =>
          actualTitle === expectedTitle ||
          actualTitle.includes(expectedTitle) ||
          expectedTitle.includes(actualTitle),
      ),
    );
  const yearMatches = !input.year || !doc.year || Math.abs(doc.year - input.year) <= 1;

  return titleMatches && yearMatches;
}

async function findKinopoisk(values: ManualDraftValues, tmdb: TmdbDetails | null) {
  const kinopoiskId = cleanInt(values.kinopoisk_id);
  if (kinopoiskId) {
    const exact = await kinopoiskFetch<KinopoiskDoc>(`/movie/${kinopoiskId}`);
    if (exact?.id) return exact;
  }

  const title =
    cleanText(values.title) ||
    cleanText(tmdb?.title || tmdb?.name) ||
    cleanText(tmdb?.original_title || tmdb?.original_name);
  if (!title) return null;

  const url = new URL("https://api.kinopoisk.dev/v1.4/movie/search");
  url.searchParams.set("query", title);
  url.searchParams.set("limit", "5");
  url.searchParams.set("page", "1");

  const data = await kinopoiskFetch<KinopoiskSearchResponse>(url.toString());
  const docs = Array.isArray(data?.docs) ? data.docs : [];
  const originalTitle =
    cleanText(values.original_title) ||
    cleanText(tmdb?.original_title || tmdb?.original_name) ||
    cleanText(tmdb?.title || tmdb?.name);
  const year = getYear(values.year) || yearFromDate(tmdb?.release_date || tmdb?.first_air_date);

  return docs.find((doc) => isLikelyKinopoiskMatch(doc, { title, originalTitle, year })) || null;
}

function isAnimationGenre(genres: string[]) {
  return genres.some((genre) => {
    const normalized = normalizeText(genre);
    return normalized.includes("animation") || normalized.includes("анима") || normalized.includes("мульт");
  });
}

function detectType(input: {
  selectedType: unknown;
  mediaType: MediaType | null;
  genres: string[];
  tmdb: TmdbDetails | null;
  kinopoisk: KinopoiskDoc | null;
}) {
  const selected = cleanText(input.selectedType).toLowerCase();
  if (["film", "series", "anime", "cartoon", "documentary"].includes(selected)) return selected;

  const genreText = input.genres.map(normalizeText).join(" ");
  if (genreText.includes("documentary") || genreText.includes("документ")) return "documentary";
  if (isAnimationGenre(input.genres) && input.tmdb?.original_language === "ja") return "anime";
  if (isAnimationGenre(input.genres)) return "cartoon";
  if (input.mediaType === "tv" || input.kinopoisk?.isSeries) return "series";
  return "film";
}

function peopleFromKinopoisk(kinopoisk: KinopoiskDoc | null, professions: string[]) {
  const wanted = new Set(professions.map(normalizeText));

  return (kinopoisk?.persons ?? [])
    .filter((person) => {
      const profession = normalizeText(person.profession);
      const enProfession = normalizeText(person.enProfession);
      return wanted.has(profession) || wanted.has(enProfession);
    })
    .map((person) => cleanText(person.name) || cleanText(person.enName))
    .filter(Boolean);
}

function peopleFromTmdbCast(tmdb: TmdbDetails | null) {
  return (tmdb?.credits?.cast ?? []).map((person) => person.name).filter(Boolean);
}

function directorsFromTmdb(tmdb: TmdbDetails | null) {
  return [
    ...((tmdb?.credits?.crew ?? [])
      .filter((person) => person.job === "Director")
      .map((person) => person.name)
      .filter(Boolean) as string[]),
    ...((tmdb?.created_by ?? []).map((person) => person.name).filter(Boolean) as string[]),
  ];
}

function pickTrailer(tmdb: TmdbDetails | null, kinopoisk: KinopoiskDoc | null) {
  const videos = (tmdb?.videos?.results ?? [])
    .filter((video) => normalizeText(video.site) === "youtube")
    .filter((video) => cleanText(video.key));

  const score = (video: TmdbVideo) => {
    let value = 0;
    const type = normalizeText(video.type);
    const name = normalizeText(video.name);
    if (type === "trailer") value += 100;
    if (video.official) value += 25;
    if (video.iso_639_1 === "ru") value += 15;
    if (name.includes("official") || name.includes("официаль")) value += 8;
    if (name.includes("trailer") || name.includes("трейлер")) value += 8;
    return value;
  };
  const tmdbTrailer = videos.sort((left, right) => score(right) - score(left))[0];
  if (tmdbTrailer?.key) return `https://www.youtube.com/watch?v=${tmdbTrailer.key}`;

  const kpTrailer = (kinopoisk?.videos?.trailers ?? [])
    .map((trailer) => cleanText(trailer.url))
    .find((url) => /(?:youtube\.com|youtu\.be)/i.test(url));

  return kpTrailer || "";
}

function pickRating(kinopoisk: KinopoiskDoc | null, tmdb: TmdbDetails | null) {
  const value =
    cleanNumber(kinopoisk?.rating?.kp) ||
    cleanNumber(kinopoisk?.rating?.imdb) ||
    cleanNumber(kinopoisk?.rating?.tmdb) ||
    cleanNumber(tmdb?.vote_average);

  return value === null ? "" : String(Math.round(value * 10) / 10);
}

function setValue(target: Record<string, string>, key: string, value: unknown) {
  const cleaned = Array.isArray(value) ? unique(value).join(", ") : cleanText(value);
  if (cleaned) target[key] = cleaned;
}

function buildPlayerLinks(kinopoiskId: number | null, imdbId: string) {
  if (kinopoiskId) return `Основной | collapse | kp | ${kinopoiskId}`;
  if (imdbId) return `Основной | collapse | imdb | ${imdbId}`;
  return "";
}

export async function POST(request: Request) {
  const authError = assertAdminSecret(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const values =
      body.values &&
      typeof body.values === "object" &&
      !Array.isArray(body.values)
        ? (body.values as ManualDraftValues)
        : null;

    if (!values) {
      return Response.json({ ok: false, error: "values are required" }, { status: 400 });
    }

    const hasSearchInput = Boolean(
      cleanText(values.title) ||
        cleanText(values.original_title) ||
        cleanText(values.imdb_id) ||
        cleanInt(values.tmdb_id) ||
        cleanInt(values.kinopoisk_id),
    );

    if (!hasSearchInput) {
      return Response.json(
        { ok: false, error: "Введите название, год или один из ID перед автозаполнением" },
        { status: 400 },
      );
    }

    const tmdbResult = await findTmdb(values);
    const tmdb = tmdbResult?.details ?? null;
    const kinopoisk = await findKinopoisk(values, tmdb);

    if (!tmdb && !kinopoisk) {
      return Response.json(
        { ok: false, error: "Не удалось найти фильм в TMDB или Kinopoisk" },
        { status: 404 },
      );
    }

    const genres = unique([
      ...((kinopoisk?.genres ?? []).map((genre) => genre.name).filter(Boolean) as string[]),
      ...((tmdb?.genres ?? []).map((genre) => genre.name).filter(Boolean) as string[]),
    ]);
    const title =
      cleanText(kinopoisk?.name) ||
      cleanText(tmdb?.title || tmdb?.name) ||
      cleanText(values.title);
    const originalTitle =
      cleanText(tmdb?.original_title || tmdb?.original_name) ||
      cleanText(kinopoisk?.alternativeName) ||
      cleanText(kinopoisk?.enName);
    const year =
      getYear(values.year) ||
      kinopoisk?.year ||
      yearFromDate(tmdb?.release_date || tmdb?.first_air_date);
    const kinopoiskId = cleanInt(values.kinopoisk_id) || (typeof kinopoisk?.id === "number" ? kinopoisk.id : null);
    const tmdbId =
      cleanInt(values.tmdb_id) ||
      (typeof tmdb?.id === "number" ? tmdb.id : null) ||
      cleanInt(kinopoisk?.externalId?.tmdb);
    const imdbId =
      cleanText(values.imdb_id) ||
      cleanText(tmdb?.external_ids?.imdb_id) ||
      cleanText(kinopoisk?.externalId?.imdb);
    const actors = unique([
      ...peopleFromKinopoisk(kinopoisk, ["актеры", "актёры", "actor"]),
      ...peopleFromTmdbCast(tmdb),
    ]);
    const directors = unique([
      ...peopleFromKinopoisk(kinopoisk, ["режиссеры", "режиссёры", "director"]),
      ...directorsFromTmdb(tmdb),
    ], 8);
    const description =
      cleanText(kinopoisk?.description) ||
      cleanText(kinopoisk?.shortDescription) ||
      cleanText(tmdb?.overview);
    const trailer = pickTrailer(tmdb, kinopoisk);
    const type = detectType({
      selectedType: values.type,
      mediaType: tmdbResult?.mediaType ?? null,
      genres,
      tmdb,
      kinopoisk,
    });
    const generated = generateTemplateMovieSeo({
      title,
      original_title: originalTitle,
      year,
      type,
      genres,
      actors,
      directors,
      description,
      trailer_status: trailer ? "accepted" : "missing",
      trailer_url: trailer,
      kinopoisk_id: kinopoiskId,
      tmdb_id: tmdbId,
      imdb_id: imdbId,
    });
    const responseValues: Record<string, string> = {};

    setValue(responseValues, "title", title);
    setValue(responseValues, "original_title", originalTitle);
    setValue(responseValues, "year", year ? String(year) : "");
    setValue(responseValues, "type", type);
    setValue(responseValues, "genres", genres);
    setValue(responseValues, "poster_url", tmdbImage(tmdb?.poster_path, "w500") || kinopoisk?.poster?.url);
    setValue(responseValues, "backdrop_url", tmdbImage(tmdb?.backdrop_path, "w780") || kinopoisk?.backdrop?.url);
    setValue(responseValues, "tmdb_id", tmdbId ? String(tmdbId) : "");
    setValue(responseValues, "kinopoisk_id", kinopoiskId ? String(kinopoiskId) : "");
    setValue(responseValues, "imdb_id", imdbId);
    setValue(responseValues, "actors", actors);
    setValue(responseValues, "directors", directors);
    setValue(responseValues, "rating", pickRating(kinopoisk, tmdb));
    setValue(responseValues, "description", description);
    setValue(responseValues, "long_description", generated.longDescription);
    setValue(responseValues, "seo_title", generated.seoTitle);
    setValue(responseValues, "seo_description", generated.seoDescription);
    setValue(responseValues, "faq_json", JSON.stringify(generated.faq, null, 2));
    setValue(responseValues, "trailer_input", trailer);

    const currentPlayerLinks = cleanText(values.player_links);
    if (!currentPlayerLinks) {
      setValue(responseValues, "player_links", buildPlayerLinks(kinopoiskId, imdbId));
    }

    setValue(
      responseValues,
      "moderation_notes",
      `Автозаполнено через TMDB${kinopoisk ? " + Kinopoisk" : ""}. Перед публикацией проверь описание, постер, трейлер и плееры.`,
    );

    return Response.json({
      ok: true,
      values: responseValues,
      source: {
        tmdb: Boolean(tmdb),
        kinopoisk: Boolean(kinopoisk),
      },
      message: `Автозаполнено: ${tmdb ? "TMDB" : ""}${tmdb && kinopoisk ? " + " : ""}${kinopoisk ? "Kinopoisk" : ""}`,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown manual draft autofill error",
      },
      { status: 500 },
    );
  }
}
