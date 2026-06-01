#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const KINOPOISK_BASE_URL = "https://api.kinopoisk.dev/v1.4";
const DEFAULT_YEAR_FROM = 2000;
const CURRENT_YEAR = new Date().getFullYear();
const FUTURE_YEAR_TO = CURRENT_YEAR + 8;
const RENDEX_SCRIPT_SRC = "https://graphicslab.io/sdk/v2/rendex-sdk.min.js";
const RENDEX_DEFAULT_PUBLISHER_ID = "678053396";
const FACTORIOS_BASE_URL = "https://tarantino.factorios.live/show/kinopoisk";
const COLLAPSE_EMBED_BASE_URL = "https://api.ortified.ws/embed";
const TARGET_TOTALS = {
  films: 100,
  series: 100,
  cartoons: 100,
  expected: 0,
};

const SELECT_FIELDS = [
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
  "premiere",
  "networks",
];

const REQUESTS = [
  {
    bucket: "films",
    label: "250 лучших фильмов Кинопоиска",
    limit: 100,
    queries: [
      { lists: ["top250"], typeNumber: ["1"], year: [`${DEFAULT_YEAR_FROM}-${CURRENT_YEAR}`], sortField: ["votes.kp"], sortType: ["-1"] },
      { lists: ["100_greatest_movies_XXI"], typeNumber: ["1"], year: [`${DEFAULT_YEAR_FROM}-${CURRENT_YEAR}`], sortField: ["votes.kp"], sortType: ["-1"] },
      { typeNumber: ["1"], year: [`${DEFAULT_YEAR_FROM}-${CURRENT_YEAR}`], "rating.kp": ["6.8-10"], "votes.kp": ["120000-99999999"], sortField: ["votes.kp"], sortType: ["-1"] },
      { typeNumber: ["1"], year: [`${DEFAULT_YEAR_FROM}-${CURRENT_YEAR}`], "rating.imdb": ["7-10"], "votes.imdb": ["250000-99999999"], sortField: ["votes.imdb"], sortType: ["-1"] },
    ],
  },
  {
    bucket: "series",
    label: "250 лучших сериалов, 100 великих сериалов XXI века и HBO",
    limit: 100,
    queries: [
      { lists: ["series-top250"], typeNumber: ["2"], year: [`${DEFAULT_YEAR_FROM}-${CURRENT_YEAR}`], sortField: ["votes.kp"], sortType: ["-1"] },
      { lists: ["100_greatest_TVseries"], typeNumber: ["2"], year: [`${DEFAULT_YEAR_FROM}-${CURRENT_YEAR}`], sortField: ["votes.kp"], sortType: ["-1"] },
      { lists: ["hbo_best"], typeNumber: ["2"], year: [`${DEFAULT_YEAR_FROM}-${CURRENT_YEAR}`], sortField: ["votes.kp"], sortType: ["-1"] },
      { typeNumber: ["2"], year: [`${DEFAULT_YEAR_FROM}-${CURRENT_YEAR}`], "rating.kp": ["7-10"], "votes.kp": ["60000-99999999"], sortField: ["votes.kp"], sortType: ["-1"] },
    ],
  },
  {
    bucket: "cartoons",
    label: "популярные мультфильмы 2000+ без советской классики",
    limit: 100,
    queries: [
      { typeNumber: ["3", "5"], year: [`${DEFAULT_YEAR_FROM}-${CURRENT_YEAR}`], "rating.kp": ["6.2-10"], "votes.kp": ["25000-99999999"], sortField: ["votes.kp"], sortType: ["-1"] },
      { typeNumber: ["3", "5"], year: [`${DEFAULT_YEAR_FROM}-${CURRENT_YEAR}`], "rating.imdb": ["6.4-10"], "votes.imdb": ["80000-99999999"], sortField: ["votes.imdb"], sortType: ["-1"] },
    ],
  },
  {
    bucket: "expected",
    label: "рейтинг ожидаемых фильмов Кинопоиска",
    limit: 0,
    queries: [
      { lists: ["planned-to-watch-films"], typeNumber: ["1"], year: [`${CURRENT_YEAR}-${FUTURE_YEAR_TO}`], sortField: ["votes.await"], sortType: ["-1"] },
      { typeNumber: ["1"], year: [`${CURRENT_YEAR}-${FUTURE_YEAR_TO}`], "votes.await": ["1000-99999999"], sortField: ["votes.await"], sortType: ["-1"] },
      { typeNumber: ["1"], status: ["announced", "filming", "post-production"], sortField: ["votes.await"], sortType: ["-1"] },
    ],
  },
];

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function loadEnvFile(filePath) {
  const envText = readText(filePath);
  for (const line of envText.split(/\r?\n/)) {
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

function findAppDir() {
  const root = process.cwd();
  const candidates = [
    path.join(root, "src", "app"),
    root,
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "data", "movies.ts"))) return candidate;
  }

  throw new Error("Не нашёл src/app/data/movies.ts. Запускай скрипт из корня проекта, где package.json.");
}

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
  const parsed = cleanNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function normalizeText(value) {
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

function getKinopoiskToken() {
  return cleanString(process.env.KINOPOISK_DEV_TOKEN) || cleanString(process.env.KINOPOISK_API_KEY);
}

function getVibixConfig() {
  return {
    apiUrl: (cleanString(process.env.VIBIX_API_URL) || "https://vibix.org").replace(/\/$/, ""),
    apiToken: cleanString(process.env.VIBIX_API_TOKEN) || cleanString(process.env.RENDEX_API_TOKEN),
    publisherId: cleanString(process.env.RENDEX_PUBLISHER_ID) || cleanString(process.env.VIBIX_PUBLISHER_ID) || RENDEX_DEFAULT_PUBLISHER_ID,
  };
}

function appendRepeated(url, key, values) {
  for (const value of values || []) {
    if (value !== undefined && value !== null && String(value).trim()) {
      url.searchParams.append(key, String(value));
    }
  }
}

function buildKinopoiskUrl(query, page, limit) {
  const url = new URL(`${KINOPOISK_BASE_URL}/movie`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));
  for (const field of SELECT_FIELDS) url.searchParams.append("selectFields", field);
  for (const field of ["id", "name", "year", "poster.url"]) url.searchParams.append("notNullFields", field);

  for (const [key, values] of Object.entries(query)) {
    appendRepeated(url, key, Array.isArray(values) ? values : [values]);
  }

  return url.toString();
}

async function kinopoiskRequest(url) {
  const token = getKinopoiskToken();
  if (!token) throw new Error("Нет KINOPOISK_DEV_TOKEN или KINOPOISK_API_KEY в .env.local");

  const response = await fetch(url, {
    headers: {
      "X-API-KEY": token,
      accept: "application/json",
    },
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message = payload && typeof payload === "object" && "message" in payload ? payload.message : text;
    throw new Error(`Kinopoisk.dev ${response.status}: ${message}`);
  }

  return payload;
}

function getExistingKinopoiskIds(appDir) {
  const dataDir = path.join(appDir, "data");
  const ids = new Set();
  for (const fileName of fs.readdirSync(dataDir)) {
    if (!fileName.endsWith(".ts")) continue;
    const text = readText(path.join(dataDir, fileName));
    for (const match of text.matchAll(/kinopoiskId\s*:\s*(\d+)/g)) {
      ids.add(Number(match[1]));
    }
  }
  return ids;
}

function getExistingSlugs(appDir) {
  const dataDir = path.join(appDir, "data");
  const slugs = new Set();
  for (const fileName of fs.readdirSync(dataDir)) {
    if (!fileName.endsWith(".ts")) continue;
    const text = readText(path.join(dataDir, fileName));
    for (const match of text.matchAll(/slug\s*:\s*"([^"]+)"/g)) {
      slugs.add(match[1]);
    }
  }
  return slugs;
}

const CYRILLIC_TO_LATIN = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function slugify(value) {
  return normalizeText(value)
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "kinoluma-title";
}

function makeUniqueSlug(base, year, usedSlugs) {
  const baseSlug = `${slugify(base)}${year ? `-${year}` : ""}`;
  let slug = baseSlug;
  let index = 2;

  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  usedSlugs.add(slug);
  return slug;
}

function genreNames(doc) {
  return uniq((Array.isArray(doc.genres) ? doc.genres : []).map((genre) => genre?.name), 10);
}

function countryNames(doc) {
  return uniq((Array.isArray(doc.countries) ? doc.countries : []).map((country) => country?.name), 8);
}

function isAnime(doc) {
  const typeNumber = cleanInt(doc.typeNumber);
  const type = normalizeText(doc.type);
  const genres = genreNames(doc).map(normalizeText).join(" ");
  return typeNumber === 4 || type === "anime" || /(^|\s)аниме($|\s)|anime/.test(genres);
}

const REJECTED_PUBLIC_GENRE_PARTS = [
  "документ",
  "реальное тв",
  "реалити",
  "reality",
  "ток-шоу",
  "ток шоу",
  "talk show",
  "концерт",
  "concert",
  "музыка",
  "music",
  "новости",
  "news",
  "церемония",
  "шоу",
];

function hasRejectedPublicGenre(doc) {
  return genreNames(doc)
    .map(normalizeText)
    .some((genre) => REJECTED_PUBLIC_GENRE_PARTS.some((blockedGenre) => genre.includes(blockedGenre)));
}

function isOldOrSoviet(doc) {
  const year = cleanInt(doc.year) || 0;
  const countries = countryNames(doc).map(normalizeText).join(" ");
  return year < DEFAULT_YEAR_FROM || countries.includes("ссср");
}

function getContentType(bucket, doc) {
  const typeNumber = cleanInt(doc.typeNumber);
  if (bucket === "series" || typeNumber === 2 || doc.isSeries) return "Сериал";
  if (bucket === "cartoons" || typeNumber === 3 || typeNumber === 5) return "Мультфильм";
  return "Фильм";
}

function getRating(doc) {
  const rating = cleanNumber(doc.rating?.kp) || cleanNumber(doc.rating?.imdb) || cleanNumber(doc.rating?.tmdb) || 0;
  return Math.max(0, Math.min(10, Math.round(rating * 10) / 10));
}

function peopleByProfession(doc, professions, limit) {
  const persons = Array.isArray(doc.persons) ? doc.persons : [];
  return uniq(
    persons
      .filter((person) => {
        const profession = normalizeText(person?.profession);
        const enProfession = normalizeText(person?.enProfession);
        return professions.some((item) => profession === item || enProfession === item);
      })
      .map((person) => person?.name || person?.enName),
    limit,
  );
}

function getTmdbPosterRoute(input) {
  const params = new URLSearchParams();

  if (input.tmdbId) params.set("tmdbId", String(input.tmdbId));
  if (input.imdbId) params.set("imdbId", input.imdbId);
  if (input.title) params.set("title", input.title);
  if (input.originalTitle) params.set("originalTitle", input.originalTitle);
  if (input.year) params.set("year", String(input.year));
  if (input.type) params.set("type", input.type);

  params.set("quality", "high");
  params.set("v", "3");

  return `/api/tmdb/poster?${params.toString()}`;
}

function getPosterRoute(kpId, input = {}) {
  const params = new URLSearchParams();
  params.set("kpId", String(kpId));
  params.set("v", "kp-generated-2");
  params.set("fallback", getTmdbPosterRoute(input));

  return `/api/kinopoisk/poster?${params.toString()}`;
}

function getSeoTypeLabel(type) {
  if (type === "Сериал") return "сериал";
  if (type === "Мультфильм") return "мультфильм";
  return "фильм";
}

function trimText(value, maxLength) {
  const text = cleanString(value).replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "").replace(/[,.!?;:]+$/g, "")}.`;
}

function buildDescription(doc, title, type, bucket) {
  const sourceDescription = cleanString(doc.shortDescription) || cleanString(doc.description);
  if (sourceDescription) return trimText(sourceDescription, 260);

  if (bucket === "expected") {
    return `${title} — ожидаемый ${getSeoTypeLabel(type)} из рейтинга будущих премьер. Подробности будут обновлены после появления проверенных данных.`;
  }

  const genres = genreNames(doc).slice(0, 3).join(", ").toLowerCase();
  return `${title} — популярный ${getSeoTypeLabel(type)}${genres ? ` в жанрах ${genres}` : ""}. Карточка собрана по проверяемым данным Kinopoisk.dev без выдуманных фактов.`;
}

function buildLongDescription(doc, title, year, type, description, bucket) {
  const genres = genreNames(doc);
  const countries = countryNames(doc);
  const directors = peopleByProfession(doc, ["режиссеры", "режиссер", "director"], 4);
  const actors = peopleByProfession(doc, ["актеры", "актер", "actor"], 6);
  const kind = getSeoTypeLabel(type);
  const genreText = genres.length ? ` Жанры: ${genres.join(", ").toLowerCase()}.` : "";
  const countryText = countries.length ? ` Страны: ${countries.join(", ")}.` : "";
  const directorText = directors.length ? ` Режиссура: ${directors.join(", ")}.` : "";
  const actorText = actors.length ? ` В главных ролях: ${actors.join(", ")}.` : "";
  const expectedText = bucket === "expected" ? " Это ожидаемый релиз: дата, рейтинг и доступность просмотра могут измениться после премьеры." : "";

  return trimText(
    `«${title}»${year ? ` (${year})` : ""} — ${kind}, добавленный в KinoLuma из популярных списков Кинопоиска и Kinopoisk.dev. ${description}${genreText}${countryText}${directorText}${actorText}${expectedText} На странице есть постер Кинопоиска, жанры, факты, SEO-разметка, FAQ и плееры по Kinopoisk ID, если материал уже доступен у подключённых провайдеров.`,
    780,
  );
}

function buildFacts(doc, type, bucket) {
  const facts = [];
  const year = cleanInt(doc.year);
  const duration = cleanInt(doc.movieLength) || cleanInt(doc.seriesLength);
  const countries = countryNames(doc);
  const directors = peopleByProfession(doc, ["режиссеры", "режиссер", "director"], 4);
  const actors = peopleByProfession(doc, ["актеры", "актер", "actor"], 8);
  const kpId = cleanInt(doc.id);
  const imdbId = cleanString(doc.externalId?.imdb);
  const tmdbId = cleanInt(doc.externalId?.tmdb);

  if (year) facts.push({ label: "Год", value: String(year) });
  facts.push({ label: "Тип", value: type });
  if (bucket === "expected") facts.push({ label: "Статус", value: "Ожидаемый фильм" });
  if (countries.length) facts.push({ label: "Страна", value: countries.slice(0, 4).join(", ") });
  if (duration) facts.push({ label: type === "Сериал" ? "Длительность серии" : "Длительность", value: `${duration} мин` });
  if (directors.length) facts.push({ label: type === "Сериал" ? "Создатели" : "Режиссёр", value: directors.join(", ") });
  if (actors.length) facts.push({ label: "Главные герои", value: actors.join(", ") });
  if (kpId) facts.push({ label: "Kinopoisk ID", value: String(kpId) });
  if (imdbId) facts.push({ label: "IMDb ID", value: imdbId });
  if (tmdbId) facts.push({ label: "TMDB ID", value: String(tmdbId) });
  return facts;
}

function buildCollapsePlayer(kpId) {
  return {
    id: `collapse-kp-${kpId}`,
    name: "Основной",
    type: "collapse",
    provider: "collapse",
    embedUrl: `${COLLAPSE_EMBED_BASE_URL}/kp/${kpId}?sharing=false&episodesOpen=false`,
    contentKind: "kp",
    contentType: "kp",
    contentId: String(kpId),
  };
}

function buildFactoriosPlayer(kpId, orderIndex) {
  return {
    id: `factorios-${kpId}`,
    name: `Запасной ${orderIndex}`,
    type: "iframe",
    provider: "factorios",
    embedUrl: `${FACTORIOS_BASE_URL}/${kpId}`,
  };
}

function getRendexContentType(type) {
  return type === "Сериал" ? "series" : "movie";
}

function getHtmlDataAttribute(source, attributeName) {
  const text = cleanString(source);
  if (!text) return "";
  const escaped = attributeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = text.match(pattern);
  return cleanString(match?.[1] || match?.[2] || match?.[3]);
}

function cleanVideoId(value) {
  const id = cleanInt(value);
  return id && id > 0 ? String(id) : "";
}

function getVibixVideoId(video) {
  if (!video || typeof video !== "object") return "";
  return (
    cleanVideoId(video.iframe_video_id) ||
    cleanVideoId(video.iframeVideoId) ||
    cleanVideoId(video.rendex_video_id) ||
    cleanVideoId(video.rendexVideoId) ||
    cleanVideoId(video.video_id) ||
    cleanVideoId(video.videoId) ||
    cleanVideoId(video.player_id) ||
    cleanVideoId(video.playerId) ||
    cleanVideoId(getHtmlDataAttribute(video.embed_code || video.embedCode, "data-id")) ||
    cleanVideoId(video.id)
  );
}

async function vibixRequest(pathname) {
  const config = getVibixConfig();
  if (!config.apiToken) return null;

  const response = await fetch(`${config.apiUrl}${pathname}`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${config.apiToken}`,
    },
  });

  if (!response.ok) return null;
  const payload = await response.json();
  return payload?.data && typeof payload.data === "object" ? payload.data : payload;
}

async function findVibixVideo(doc) {
  const kpId = cleanInt(doc.id);
  const imdbId = cleanString(doc.externalId?.imdb);

  try {
    if (kpId) {
      const byKp = await vibixRequest(`/api/v1/publisher/videos/kp/${kpId}`);
      if (byKp) return byKp;
    }

    if (imdbId) {
      const byImdb = await vibixRequest(`/api/v1/publisher/videos/imdb/${encodeURIComponent(imdbId)}`);
      if (byImdb) return byImdb;
    }
  } catch (error) {
    console.warn("Vibix lookup skipped:", error instanceof Error ? error.message : error);
  }

  return null;
}

async function buildPlayers(doc, type, bucket) {
  const kpId = cleanInt(doc.id);
  if (!kpId) return [];

  const players = [buildCollapsePlayer(kpId)];

  if (bucket !== "expected") {
    const video = await findVibixVideo(doc);
    const videoId = getVibixVideoId(video);
    if (videoId) {
      const config = getVibixConfig();
      players.push({
        id: `rendex-${videoId}`,
        name: "Запасной 1",
        type: "rendex",
        provider: "rendex",
        embedUrl: "",
        publisherId: config.publisherId,
        contentType: getRendexContentType(type),
        contentId: videoId,
        scriptSrc: RENDEX_SCRIPT_SRC,
        design: "1",
        color1: "#56CEAA",
        color2: "#FFFFFF",
        color3: "#AEC7BC",
        color4: "#42BD88",
        color5: "#000000",
      });
    }
  }

  players.push(buildFactoriosPlayer(kpId, players.length));
  return players.slice(0, 3);
}

function shouldSkipDoc(doc, bucket) {
  const kpId = cleanInt(doc.id);
  if (!kpId) return true;
  if (isAnime(doc)) return true;
  if (hasRejectedPublicGenre(doc)) return true;
  if (bucket !== "expected" && isOldOrSoviet(doc)) return true;
  if (bucket === "cartoons") {
    const typeNumber = cleanInt(doc.typeNumber);
    if (typeNumber !== 3 && typeNumber !== 5) return true;
  }
  if (bucket === "series") {
    const typeNumber = cleanInt(doc.typeNumber);
    if (typeNumber !== 2 && !doc.isSeries) return true;
  }
  if ((bucket === "films" || bucket === "expected") && cleanInt(doc.typeNumber) !== 1) return true;
  return false;
}

async function docToMovie(doc, bucket, usedSlugs, generatedIndex) {
  const kpId = cleanInt(doc.id);
  const title = cleanString(doc.name) || cleanString(doc.alternativeName) || cleanString(doc.enName) || `Kinopoisk ${kpId}`;
  const originalTitle = cleanString(doc.alternativeName) || cleanString(doc.enName) || title;
  const year = cleanInt(doc.year);
  const type = getContentType(bucket, doc);
  const genres = genreNames(doc);
  const countries = countryNames(doc);
  const description = buildDescription(doc, title, type, bucket);
  const slug = makeUniqueSlug(title, year, usedSlugs);
  const imdbId = cleanString(doc.externalId?.imdb);
  const tmdbId = cleanInt(doc.externalId?.tmdb);
  const actors = peopleByProfession(doc, ["актеры", "актер", "actor"], 10);
  const directors = peopleByProfession(doc, ["режиссеры", "режиссер", "director"], 6);
  const players = await buildPlayers(doc, type, bucket);
  const sourceLabels = {
    films: "250 лучших фильмов / 100 великих фильмов XXI века / популярное Кинопоиска",
    series: "250 лучших сериалов / 100 великих сериалов XXI века / Шедевры HBO",
    cartoons: "популярные мультфильмы 2000+",
    expected: "Рейтинг ожидаемых фильмов Кинопоиска",
  };

  return {
    id: 700000 + generatedIndex,
    kinopoiskId: kpId,
    ...(imdbId ? { imdbId } : {}),
    ...(tmdbId ? { tmdbId } : {}),
    slug,
    title,
    originalTitle,
    searchTitles: uniq([title, originalTitle, slug, ...actors.slice(0, 5), ...directors.slice(0, 3)], 16),
    type,
    year: year ? String(year) : "",
    rating: bucket === "expected" ? 0 : getRating(doc),
    genres: bucket === "expected" ? uniq([...genres, "Ожидаемые"], 10) : genres,
    countries,
    poster: getPosterRoute(kpId, {
      tmdbId,
      imdbId,
      title,
      originalTitle,
      year,
      type,
    }),
    description,
    longDescription: buildLongDescription(doc, title, year, type, description, bucket),
    trailerUrl: "",
    facts: buildFacts(doc, type, bucket),
    cast: actors.map((actor) => ({ name: actor, role: type === "Мультфильм" ? "озвучка / главная роль" : "главная роль" })),
    players,
    source: sourceLabels[bucket],
  };
}

async function collectBucket(request, existingIds, usedSlugs, generatedState) {
  const bucket = [];
  console.log(`\n→ ${request.label}`);

  for (const query of request.queries) {
    if (bucket.length >= request.limit) break;

    for (let page = 1; page <= 8 && bucket.length < request.limit; page += 1) {
      const url = buildKinopoiskUrl(query, page, 80);
      const payload = await kinopoiskRequest(url);
      const docs = Array.isArray(payload?.docs) ? payload.docs : [];
      if (!docs.length) break;

      for (const doc of docs) {
        if (bucket.length >= request.limit) break;
        const kpId = cleanInt(doc.id);
        if (!kpId || existingIds.has(kpId) || shouldSkipDoc(doc, request.bucket)) continue;

        existingIds.add(kpId);
        generatedState.index += 1;
        const movie = await docToMovie(doc, request.bucket, usedSlugs, generatedState.index);
        bucket.push(movie);
        console.log(`  + ${bucket.length}/${request.limit}: ${movie.title} (${movie.year || "год ?"}) [kp ${kpId}]`);
      }

      if (docs.length < 80) break;
    }
  }

  return bucket;
}

function js(value) {
  return JSON.stringify(value, null, 2)
    .replace(/"([a-zA-Z_$][\w$]*)":/g, "$1:")
    .replace(/\n/g, "\n  ");
}

function renderMovie(movie) {
  const lines = ["  {"];
  const orderedKeys = [
    "id", "kinopoiskId", "imdbId", "tmdbId", "slug", "title", "originalTitle", "searchTitles", "type", "year", "rating", "genres", "countries", "poster", "description", "longDescription", "trailerUrl", "facts", "cast", "players", "source",
  ];

  for (const key of orderedKeys) {
    if (movie[key] === undefined) continue;
    lines.push(`    ${key}: ${js(movie[key])},`);
  }

  lines.push("  }");
  return lines.join("\n");
}

function renderOutput(movies) {
  const generatedAt = new Date().toISOString();
  return `import type { Movie } from "./movies";\n\n// Автогенерация: scripts/generate-kinopoisk-requested-pack.mjs\n// Дата: ${generatedAt}\n// Источник данных: Kinopoisk.dev + опционально Vibix для Rendex data-id.\n// Не редактируй руками: при следующем запуске файл будет перезаписан.\n\nexport const generatedKinopoiskRequestedMovies: Movie[] = [\n${movies.map(renderMovie).join(",\n")}\n];\n`;
}

async function main() {
  const appDir = findAppDir();
  const projectRoot = appDir.endsWith(path.join("src", "app")) ? path.dirname(path.dirname(appDir)) : appDir;
  loadEnvFile(path.join(projectRoot, ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env.local"));

  if (!getKinopoiskToken()) {
    throw new Error("Добавь KINOPOISK_API_KEY или KINOPOISK_DEV_TOKEN в .env.local. Значение в чат отправлять не нужно.");
  }

  const existingIds = getExistingKinopoiskIds(appDir);
  const usedSlugs = getExistingSlugs(appDir);
  const generatedState = { index: 0 };
  const allMovies = [];

  console.log(`KinoLuma: найдено существующих Kinopoisk ID: ${existingIds.size}`);
  console.log("Генерирую: 100 фильмов, 100 сериалов и 100 мультфильмов. Ожидаемые релизы, документалки, реальное ТВ, ток-шоу, концерты и музыка пропускаются.");

  for (const request of REQUESTS) {
    const items = await collectBucket(request, existingIds, usedSlugs, generatedState);
    allMovies.push(...items);

    if (items.length < request.limit) {
      console.warn(`  ! Получилось ${items.length}/${request.limit}. Обычно это значит, что топ уже частично есть в movies.ts или API вернул меньше подходящих карточек.`);
    }
  }

  const outputPath = path.join(appDir, "data", "generatedKinopoiskRequested.ts");
  fs.writeFileSync(outputPath, renderOutput(allMovies), "utf8");

  console.log(`\nГотово: ${outputPath}`);
  console.log(`Всего добавлено в generatedKinopoiskRequestedMovies: ${allMovies.length}`);
  console.log("Теперь запусти npm run build и проверь /catalog/films, /catalog/series, /catalog/cartoons и поиск на главной.");
}

main().catch((error) => {
  console.error("\nKinoLuma generator failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
