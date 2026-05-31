#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT_PATH = path.join(ROOT, "src/app/data/generatedMovies.ts");
const MOVIES_PATH = path.join(ROOT, "src/app/data/movies.ts");
const DEFAULT_LIMIT = 500;
const PAGE_SIZE = 250;
const MAX_PAGES = 40;
const KP_BASE_URL = "https://api.kinopoisk.dev/v1.4";

function readEnvFile(filename) {
  const filepath = path.join(ROOT, filename);
  if (!fs.existsSync(filepath)) return;

  const lines = fs.readFileSync(filepath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

readEnvFile(".env.local");
readEnvFile(".env");

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  if (!arg) return fallback;
  return arg.slice(prefix.length);
}

function getFlag(name) {
  return process.argv.includes(`--${name}`);
}

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

const TARGET_LIMIT = Math.max(1, Math.min(2000, toInt(getArg("limit", DEFAULT_LIMIT), DEFAULT_LIMIT)));
const START_PAGE = Math.max(1, toInt(getArg("start-page", 1), 1));
const INCLUDE_CARTOONS = getFlag("include-cartoons");
const INCLUDE_DOCUMENTARIES = !getFlag("skip-documentaries");
const INCLUDE_SERIES = !getFlag("skip-series");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanInt(value) {
  const number = cleanNumber(value);
  return number === null ? null : Math.trunc(number);
}

function normalize(value) {
  return cleanString(value)
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniq(values, limit = 12) {
  return Array.from(new Set(values.map(cleanString).filter(Boolean))).slice(0, limit);
}

function translit(value) {
  const map = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };

  return cleanString(value)
    .toLowerCase()
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "movie";
}

function json(value) {
  return JSON.stringify(value ?? null);
}

function tsString(value) {
  return JSON.stringify(cleanString(value));
}

function tsArray(values) {
  return `[${values.map((value) => tsString(value)).join(", ")}]`;
}

function escapeText(value) {
  return cleanString(value).replace(/\s+/g, " ").trim();
}

function trimText(value, maxLength) {
  const text = escapeText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "").replace(/[,.!?;:]+$/g, "")}.`;
}

function getToken() {
  return cleanString(process.env.KINOPOISK_DEV_TOKEN) || cleanString(process.env.KINOPOISK_API_KEY);
}

function appendFields(url) {
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
    "budget",
    "videos",
  ].forEach((field) => url.searchParams.append("selectFields", field));
}

function buildListUrl(page, mode) {
  const url = new URL(`${KP_BASE_URL}/movie`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(PAGE_SIZE));
  appendFields(url);
  url.searchParams.append("notNullFields", "id");
  url.searchParams.append("notNullFields", "name");
  url.searchParams.append("notNullFields", "year");
  url.searchParams.append("notNullFields", "rating.kp");
  url.searchParams.append("rating.kp", "5-10");
  url.searchParams.append("votes.kp", "500-99999999");
  url.searchParams.append("sortField", mode === "rating" ? "rating.kp" : "votes.kp");
  url.searchParams.append("sortType", "-1");
  return url.toString();
}

async function kpFetch(url) {
  const token = getToken();
  if (!token) {
    throw new Error("Не найден KINOPOISK_API_KEY или KINOPOISK_DEV_TOKEN в .env.local/.env/process.env");
  }

  const response = await fetch(url, {
    headers: {
      "X-API-KEY": token,
      "accept": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Kinopoisk API ${response.status}: ${body.slice(0, 500)}`);
  }

  return response.json();
}

function genreNames(doc) {
  return uniq((doc.genres ?? []).map((genre) => genre?.name), 10);
}

function countryNames(doc) {
  return uniq((doc.countries ?? []).map((country) => country?.name), 8);
}

function isAnime(doc) {
  const type = normalize(doc.type);
  const typeNumber = cleanInt(doc.typeNumber);
  const genres = genreNames(doc).map(normalize).join(" ");
  return type === "anime" || typeNumber === 4 || /(^|\s)аниме($|\s)|anime/.test(genres);
}

function mapType(doc) {
  const type = normalize(doc.type);
  const typeNumber = cleanInt(doc.typeNumber);
  const genres = genreNames(doc).map(normalize).join(" ");

  if (isAnime(doc)) return "Аниме";
  if (/документ/.test(genres)) return "Документальный";
  if (type === "cartoon" || type === "animated series" || type === "animated-series" || typeNumber === 3 || typeNumber === 5) {
    return "Мультфильм";
  }
  if (doc.isSeries || type === "tv series" || type === "tv-series" || type === "series" || typeNumber === 2) {
    return "Сериал";
  }
  return "Фильм";
}

function getRating(doc) {
  const rating = cleanNumber(doc.rating?.kp) ?? cleanNumber(doc.rating?.imdb) ?? cleanNumber(doc.rating?.tmdb) ?? 0;
  return Math.max(0, Math.min(10, Math.round(rating * 10) / 10));
}

function getVotes(doc) {
  return cleanInt(doc.votes?.kp) ?? cleanInt(doc.votes?.imdb) ?? cleanInt(doc.votes?.tmdb) ?? 0;
}

function peopleByProfession(doc, professions, limit) {
  return uniq(
    (doc.persons ?? [])
      .filter((person) => {
        const profession = normalize(person?.profession);
        const enProfession = normalize(person?.enProfession);
        return professions.some((item) => profession === item || enProfession === item);
      })
      .map((person) => person?.name || person?.enName),
    limit,
  );
}

function castMembers(doc, limit = 6) {
  const actors = (doc.persons ?? [])
    .filter((person) => {
      const profession = normalize(person?.profession);
      const enProfession = normalize(person?.enProfession);
      return profession === "актеры" || profession === "актер" || enProfession === "actor" || enProfession === "actors";
    })
    .map((person) => ({
      name: cleanString(person?.name || person?.enName),
      role: cleanString(person?.description) || "в главных ролях",
    }))
    .filter((person) => person.name);

  const unique = [];
  const seen = new Set();
  for (const person of actors) {
    const key = normalize(person.name);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(person);
    if (unique.length >= limit) break;
  }
  return unique;
}

function getBudget(doc) {
  const raw = doc.budget;
  if (!raw || typeof raw !== "object") return "";
  const value = cleanInt(raw.value);
  const currency = cleanString(raw.currency);
  if (!value || !currency) return "";
  return `${currency}${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
}

function getDuration(doc) {
  const minutes = cleanInt(doc.movieLength) ?? cleanInt(doc.seriesLength);
  return minutes ? `${minutes} мин` : "";
}

function getKinopoiskPosterUrl(doc) {
  const poster = doc?.poster;
  if (!poster || typeof poster !== "object") return "";
  const url = cleanString(poster.url) || cleanString(poster.previewUrl);
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) return "";
  return url;
}

function getTrailerUrl(doc) {
  const trailers = Array.isArray(doc.videos?.trailers) ? doc.videos.trailers : [];
  const trailer = trailers.find((item) => /youtube\.com|youtu\.be/.test(cleanString(item?.url))) || trailers[0];
  const rawUrl = cleanString(trailer?.url);
  if (!rawUrl) return "";

  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes("youtu.be")) {
      const key = url.pathname.replace(/^\//, "");
      return key ? `https://www.youtube.com/embed/${key}` : "";
    }
    if (url.hostname.includes("youtube.com")) {
      const key = url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop();
      return key ? `https://www.youtube.com/embed/${key}` : "";
    }
  } catch {}

  return rawUrl;
}

function typeLabel(type) {
  if (type === "Сериал") return "сериал";
  if (type === "Мультфильм") return "мультфильм";
  if (type === "Документальный") return "документальный фильм";
  return "фильм";
}

function buildLongDescription(movie) {
  const genres = movie.genres.length ? movie.genres.slice(0, 5).join(", ").toLowerCase() : "кино";
  const countries = movie.countries.length ? movie.countries.join(", ") : "страна не указана";
  const directorsText = movie.directors.length ? movie.directors.join(", ") : "создатели не указаны в источнике";
  const actorsText = movie.cast.length ? movie.cast.slice(0, 5).map((person) => `${person.name}${person.role && person.role !== "в главных ролях" ? ` — ${person.role}` : ""}`).join(", ") : "актёрский состав будет уточнён";
  const budgetText = movie.budget ? `Бюджет: ${movie.budget}.` : "Бюджет в открытых данных не указан.";
  const durationText = movie.duration ? `Хронометраж: ${movie.duration}.` : "Хронометраж будет уточнён после обновления источников.";
  const base = movie.description || `Карточка посвящена материалу «${movie.title}» и собрана по открытым данным Kinopoisk.`;

  return trimText(
    `«${movie.title}» (${movie.year}) — ${typeLabel(movie.type)} в жанрах ${genres}. ${base} Страна производства: ${countries}. Режиссура/создатели: ${directorsText}. В центре страницы указаны главные участники: ${actorsText}. Рейтинг KinoLuma: ${movie.rating.toFixed(1)} из 10. ${budgetText} ${durationText} На KinoLuma карточка подготовлена для просмотра онлайн: есть постер, краткое описание, расширенный блок «О фильме», факты, трейлер при наличии в источнике, SEO-данные, FAQ-разметка и плееры Collapse/Factorios по Kinopoisk ID.`,
    700,
  );
}

function makeDescription(doc, title, year, type, genres) {
  const source = cleanString(doc.shortDescription) || cleanString(doc.description);
  const genreText = genres.length ? genres.slice(0, 3).join(", ").toLowerCase() : "кино";
  const fallback = `${title} (${year}) — ${typeLabel(type)} в жанрах ${genreText}. Карточка добавлена в каталог KinoLuma с рейтингом, фактами, актёрами и плеерами по Kinopoisk ID.`;
  return trimText(source || fallback, 260);
}

function makeSlug(title, originalTitle, year, kpId, usedSlugs) {
  const source = originalTitle || title;
  let slug = `${translit(source)}-${year}`.replace(/-{2,}/g, "-");
  if (!slug || usedSlugs.has(slug)) slug = `${translit(title)}-${year}-${kpId}`;
  if (usedSlugs.has(slug)) slug = `${slug}-${kpId}`;
  usedSlugs.add(slug);
  return slug;
}

function readExisting() {
  const ids = new Set();
  const slugs = new Set();
  const imdbIds = new Set();

  for (const filepath of [MOVIES_PATH, OUTPUT_PATH]) {
    if (!fs.existsSync(filepath)) continue;
    const text = fs.readFileSync(filepath, "utf8");
    for (const match of text.matchAll(/kinopoiskId:\s*(\d+)/g)) ids.add(Number(match[1]));
    for (const match of text.matchAll(/slug:\s*["']([^"']+)["']/g)) slugs.add(match[1]);
    for (const match of text.matchAll(/imdbId:\s*["']([^"']+)["']/g)) imdbIds.add(match[1].toLowerCase());
  }

  return { ids, slugs, imdbIds };
}

function shouldSkip(doc, type, options) {
  if (!cleanInt(doc.id)) return "нет Kinopoisk ID";
  if (!cleanString(doc.name) && !cleanString(doc.alternativeName) && !cleanString(doc.enName)) return "нет названия";
  if (!cleanInt(doc.year)) return "нет года";
  if (isAnime(doc)) return "аниме пропущено: для аниме нужен отдельный плеер";
  if (type === "Мультфильм" && !options.includeCartoons) return "мультфильм пропущен";
  if (type === "Документальный" && !options.includeDocumentaries) return "документалка пропущена";
  if (type === "Сериал" && !options.includeSeries) return "сериал пропущен";
  if (getRating(doc) <= 0) return "нет рейтинга";
  if (getVotes(doc) < 500) return "мало оценок";
  return "";
}

function prepareMovie(doc, usedSlugs) {
  const kpId = cleanInt(doc.id);
  const year = cleanInt(doc.year);
  const title = cleanString(doc.name) || cleanString(doc.alternativeName) || cleanString(doc.enName);
  const originalTitle = cleanString(doc.alternativeName) || cleanString(doc.enName) || title;
  const type = mapType(doc);
  const genres = genreNames(doc);
  const countries = countryNames(doc);
  const rating = getRating(doc);
  const directors = peopleByProfession(doc, ["режиссеры", "режиссер", "director", "directors"], 4);
  const creators = peopleByProfession(doc, ["продюсеры", "продюсер", "producer", "producers", "сценаристы", "сценарист", "writer", "writers"], 4);
  const cast = castMembers(doc);
  const duration = getDuration(doc);
  const budget = getBudget(doc);
  const imdbId = cleanString(doc.externalId?.imdb);
  const tmdbId = cleanInt(doc.externalId?.tmdb);
  const slug = makeSlug(title, originalTitle, year, kpId, usedSlugs);
  const description = makeDescription(doc, title, year, type, genres);
  const movie = {
    kpId,
    imdbId,
    tmdbId,
    slug,
    title,
    originalTitle,
    type,
    year,
    rating,
    genres,
    countries,
    directors: directors.length ? directors : creators,
    cast,
    duration,
    budget,
    description,
    trailerUrl: getTrailerUrl(doc),
    ageRating: cleanInt(doc.ageRating),
    posterUrl: getKinopoiskPosterUrl(doc),
  };
  return {
    ...movie,
    longDescription: buildLongDescription(movie),
  };
}

function renderMovie(movie, index) {
  const facts = [
    { label: "Страна", value: movie.countries.join(", ") },
    { label: "Длительность", value: movie.duration },
    { label: movie.type === "Сериал" ? "Создатели" : "Режиссёр", value: movie.directors.join(", ") },
    { label: "Главные роли", value: movie.cast.map((person) => person.name).join(", ") },
    { label: "Бюджет", value: movie.budget },
    { label: "Возраст", value: movie.ageRating ? `${movie.ageRating}+` : "" },
    { label: "Рейтинг KinoLuma", value: movie.rating.toFixed(1) },
    { label: "Kinopoisk ID", value: String(movie.kpId) },
    { label: "IMDb ID", value: movie.imdbId },
  ].filter((fact) => cleanString(fact.value));

  const searchTitles = uniq([movie.title, movie.originalTitle, movie.slug, ...movie.cast.slice(0, 3).map((person) => person.name)], 12);

  return `  {
    id: ${100000 + index},
    kinopoiskId: ${movie.kpId},${movie.imdbId ? `\n    imdbId: ${tsString(movie.imdbId)},` : ""}${movie.tmdbId ? `\n    tmdbId: ${movie.tmdbId},` : ""}
    slug: ${tsString(movie.slug)},
    title: ${tsString(movie.title)},
    originalTitle: ${tsString(movie.originalTitle)},
    searchTitles: ${tsArray(searchTitles)},
    type: ${tsString(movie.type)},
    year: ${tsString(String(movie.year))},
    rating: ${movie.rating.toFixed(1)},
    genres: ${tsArray(movie.genres)},
    countries: ${tsArray(movie.countries)},
    poster: ${movie.type === "Документальный" && movie.posterUrl ? tsString(movie.posterUrl) : `getGeneratedTmdbPoster({${movie.tmdbId ? ` tmdbId: ${movie.tmdbId},` : ""}${movie.imdbId ? ` imdbId: ${tsString(movie.imdbId)},` : ""} title: ${tsString(movie.title)}, originalTitle: ${tsString(movie.originalTitle)}, year: ${tsString(String(movie.year))}, type: ${tsString(movie.type)} })`},
    description: ${tsString(movie.description)},
    longDescription: ${tsString(movie.longDescription)},
    trailerUrl: ${tsString(movie.trailerUrl)},
    facts: [
${facts.map((fact) => `      { label: ${tsString(fact.label)}, value: ${tsString(fact.value)} },`).join("\n")}
    ],
    cast: [
${movie.cast.map((person) => `      { name: ${tsString(person.name)}, role: ${tsString(person.role)} },`).join("\n")}
    ],
    players: createGeneratedKinopoiskPlayers(${movie.kpId}),
  }`;
}

function renderGeneratedFile(movies) {
  return `import type { Movie, ContentType, PlayerProvider } from "./movies";

type GeneratedPosterInput = {
  tmdbId?: number;
  imdbId?: string;
  title: string;
  originalTitle?: string;
  year?: string | number;
  type?: ContentType | string;
};

function getGeneratedTmdbPoster(input: GeneratedPosterInput) {
  const params = new URLSearchParams();

  if (input.tmdbId) params.set("tmdbId", String(input.tmdbId));
  if (input.imdbId) params.set("imdbId", input.imdbId);
  params.set("title", input.title);
  if (input.originalTitle) params.set("originalTitle", input.originalTitle);
  if (input.year) params.set("year", String(input.year));
  if (input.type) params.set("type", String(input.type));
  params.set("quality", "high");
  params.set("v", "generated-500");

  return \`/api/tmdb/poster?\${params.toString()}\`;
}

function createGeneratedKinopoiskPlayers(kinopoiskId: number): PlayerProvider[] {
  const id = String(kinopoiskId);

  return [
    {
      id: \`collapse-kp-\${id}\`,
      name: "Основной",
      type: "collapse",
      provider: "collapse",
      embedUrl: \`https://api.ortified.ws/embed/kp/\${id}?sharing=false&episodesOpen=false\`,
      contentKind: "kp",
      contentType: "kp",
      contentId: id,
    },
    {
      id: \`factorios-\${id}\`,
      name: "Запасной 1",
      type: "iframe",
      provider: "factorios",
      embedUrl: \`https://tarantino.factorios.live/show/kinopoisk/\${id}\`,
    },
  ];
}

export const generatedKinoLumaMovies: Movie[] = [
${movies.map(renderMovie).join(",\n")}
];
`;
}

async function main() {
  const existing = readExisting();
  const usedSlugs = new Set(existing.slugs);
  const prepared = [];
  const skipped = {};

  for (let offset = 0; offset < MAX_PAGES && prepared.length < TARGET_LIMIT; offset += 1) {
    const page = START_PAGE + offset;
    const mode = offset % 3 === 2 ? "rating" : "votes";
    const data = await kpFetch(buildListUrl(page, mode));
    const docs = Array.isArray(data?.docs) ? data.docs : [];
    console.log(`[KinoLuma] page=${page} mode=${mode} received=${docs.length} prepared=${prepared.length}`);

    if (!docs.length) break;

    for (const doc of docs) {
      if (prepared.length >= TARGET_LIMIT) break;
      const type = mapType(doc);
      const reason = shouldSkip(doc, type, {
        includeCartoons: INCLUDE_CARTOONS,
        includeDocumentaries: INCLUDE_DOCUMENTARIES,
        includeSeries: INCLUDE_SERIES,
      });
      if (reason) {
        skipped[reason] = (skipped[reason] || 0) + 1;
        continue;
      }

      const kpId = cleanInt(doc.id);
      const imdbId = cleanString(doc.externalId?.imdb).toLowerCase();
      if (existing.ids.has(kpId) || (imdbId && existing.imdbIds.has(imdbId))) {
        skipped["дубликат"] = (skipped["дубликат"] || 0) + 1;
        continue;
      }

      const movie = prepareMovie(doc, usedSlugs);
      existing.ids.add(movie.kpId);
      if (movie.imdbId) existing.imdbIds.add(movie.imdbId.toLowerCase());
      prepared.push(movie);
    }
  }

  if (!prepared.length) {
    throw new Error("Не удалось подготовить ни одной карточки. Проверь токен, лимит API и фильтры.");
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, renderGeneratedFile(prepared), "utf8");

  console.log("\n[KinoLuma] Готово");
  console.log(`[KinoLuma] Добавлено карточек: ${prepared.length}`);
  console.log(`[KinoLuma] Файл: ${path.relative(ROOT, OUTPUT_PATH)}`);
  console.log("[KinoLuma] Примеры:");
  for (const movie of prepared.slice(0, 12)) {
    console.log(`- ${movie.title} (${movie.year}) / kp=${movie.kpId} / rating=${movie.rating}`);
  }
  console.log("[KinoLuma] Пропуски:", skipped);
}

main().catch((error) => {
  console.error("\n[KinoLuma] Ошибка генерации контент-пака:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
