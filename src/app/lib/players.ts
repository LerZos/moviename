import type { ContentType, PlayerProvider } from "../data/movies";

export const RENDEX_SCRIPT_SRC =
  "https://graphicslab.io/sdk/v2/rendex-sdk.min.js";
export const RENDEX_PUBLISHER_ID = "678053396";
export const FACTORIOS_BASE_URL =
  "https://tarantino.factorios.live/show/kinopoisk";
export const COLLAPSE_ACTUALIZE_SCRIPT_SRC =
  "https://kodir2.github.io/actualize.js";
export const COLLAPSE_EMBED_BASE_URL = "https://api.ortified.ws/embed";

export type KinoLumaPlayer = PlayerProvider & {
  type?: "iframe" | "rendex" | "collapse" | "collapse-iframe" | "vibix-iframe";
  provider?: string;
  publisherId?: string;
  contentType?: string;
  contentId?: string;
  contentKind?: string;
  scriptSrc?: string;
  design?: string;
  color1?: string;
  color2?: string;
  color3?: string;
  color4?: string;
  color5?: string;
};

const RENDEX_DEFAULT_COLORS = {
  design: "1",
  color1: "#56CEAA",
  color2: "#FFFFFF",
  color3: "#AEC7BC",
  color4: "#42BD88",
  color5: "#000000",
};

const KINOPOISK_ID_BY_SLUG: Record<string, number> = {
  gladiator: 474,
  "pulp-fiction": 342,
  "fight-club": 361,
  se7en: 377,
  "the-godfather": 325,
  "the-green-mile": 435,
  whiplash: 725190,
  parasite: 1043758,
  "joker-2019": 1048334,
  chernobyl: 1227803,
  sherlock: 502838,
  "better-call-saul": 796660,
  "the-boys": 460586,
  "peaky-blinders": 716587,
  dark: 1032606,
  "the-mandalorian": 1118138,
  arcane: 4445150,
  "kung-fu-panda": 103734,
  zootopia: 775276,
  moana: 837530,
  "the-incredibles": 38903,
  "cosmos-a-spacetime-odyssey": 762381,
  "free-solo": 1182400,
  "the-last-dance": 1162628,
  "my-octopus-teacher": 1405676,
  "21-jump-street": 413080,
  "22-jump-street": 672899,
  "the-hangover": 426004,
  "lets-be-cops": 760469,
};

type AutoPlayerInput = {
  slug?: string | null;
  kinopoiskId?: number | string | null;
  imdbId?: number | string | null;
  rendexVideoId?: number | string | null;
  contentType?: string | null;
  movieType?: ContentType | string | null;
  genres?: string[] | string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function cleanString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cleanNumberString(value: unknown) {
  const text = cleanString(value);
  if (!text) return "";

  const parsed = Number(text.replace(",", "."));
  if (!Number.isFinite(parsed)) return "";

  return String(Math.trunc(parsed));
}

function cleanIdString(value: unknown) {
  const text = cleanString(value);
  return text
    .replace(/^imdb:/i, "")
    .replace(/^kp:/i, "")
    .trim();
}

function normalizeImdbId(value: unknown) {
  const text = cleanIdString(value);
  if (!text) return "";

  const match = text.match(/tt\d+|\d+/i);
  if (!match) return "";

  const id = match[0].toLowerCase();
  return id.startsWith("tt") ? id : `tt${id}`;
}

function addCollapseFrameParams(url: string) {
  if (!url) return "";

  const params = ["sharing=false", "episodesOpen=false"];
  const missingParams = params.filter(
    (param) => !url.includes(param.split("=")[0]),
  );
  if (!missingParams.length) return url;

  return `${url}${url.includes("?") ? "&" : "?"}${missingParams.join("&")}`;
}

export function buildCollapseKinopoiskUrl(kinopoiskId: unknown) {
  const id = cleanNumberString(kinopoiskId);
  return id
    ? addCollapseFrameParams(`${COLLAPSE_EMBED_BASE_URL}/kp/${id}`)
    : "";
}

export function buildCollapseImdbUrl(imdbId: unknown) {
  const id = normalizeImdbId(imdbId);
  return id
    ? addCollapseFrameParams(`${COLLAPSE_EMBED_BASE_URL}/imdb/${id}`)
    : "";
}

export function buildCollapseMovieUrl(contentId: unknown) {
  const id = cleanNumberString(contentId);
  return id
    ? addCollapseFrameParams(`${COLLAPSE_EMBED_BASE_URL}/movie/${id}`)
    : "";
}

function buildCollapseUrl(contentKind: unknown, contentId: unknown) {
  const kind = cleanString(contentKind).toLowerCase();

  if (kind === "kp" || kind === "kinopoisk" || kind === "kinopoisk_id") {
    return buildCollapseKinopoiskUrl(contentId);
  }

  if (kind === "imdb" || kind === "imdb_id") {
    return buildCollapseImdbUrl(contentId);
  }

  if (/^https?:\/\//i.test(cleanString(contentId))) {
    return cleanString(contentId);
  }

  return buildCollapseMovieUrl(contentId);
}

function buildCollapsePlayerFromParts(
  name: string,
  contentKind: unknown,
  contentId: unknown,
  index = 0,
): KinoLumaPlayer | null {
  const kind = cleanString(contentKind) || "movie";
  const id =
    kind.toLowerCase() === "imdb" || kind.toLowerCase() === "imdb_id"
      ? normalizeImdbId(contentId)
      : cleanNumberString(contentId) || cleanIdString(contentId);
  const embedUrl = buildCollapseUrl(kind, id || contentId);
  if (!embedUrl) return null;

  return {
    id: `collapse-${kind.toLowerCase()}-${id || index + 1}`,
    name,
    type: "collapse",
    provider: "collapse",
    embedUrl,
    contentKind: kind,
    contentType: kind,
    contentId: id || cleanString(contentId),
  };
}

function buildCollapseIframePlayer(
  name: string,
  url: unknown,
  index = 0,
): KinoLumaPlayer | null {
  const embedUrl = cleanString(url);
  if (!embedUrl) return null;

  return {
    id: `collapse-iframe-${index + 1}`,
    name,
    type: "collapse-iframe",
    provider: "collapse",
    embedUrl,
  };
}

function buildVibixIframePlayer(
  name: string,
  url: unknown,
  index = 0,
): KinoLumaPlayer | null {
  const embedUrl = cleanString(url);
  if (!embedUrl) return null;

  return {
    id: `vibix-iframe-${index + 1}`,
    name,
    type: "vibix-iframe",
    provider: "vibix",
    embedUrl,
  };
}

function normalizeText(value: unknown) {
  return cleanString(value).toLowerCase().replaceAll("ё", "е");
}

function normalizeGenres(genres: AutoPlayerInput["genres"]) {
  if (Array.isArray(genres)) {
    return genres.map((genre) => normalizeText(genre)).join(" ");
  }

  return normalizeText(genres);
}

export function getFallbackKinopoiskIdBySlug(slug: unknown) {
  const key = cleanString(slug);
  return key ? KINOPOISK_ID_BY_SLUG[key] : undefined;
}

export function isAnimeAutoPlayerInput(
  input: Pick<AutoPlayerInput, "contentType" | "movieType" | "genres">,
) {
  const type = `${normalizeText(input.movieType)} ${normalizeText(input.contentType)} ${normalizeGenres(input.genres)}`;
  return /(^|[\s,;|/])аниме($|[\s,;|/])|(^|[\s,;|/])anime($|[\s,;|/])/i.test(
    type,
  );
}

export function canAutoGeneratePlayers(input: AutoPlayerInput) {
  if (isAnimeAutoPlayerInput(input)) return false;

  const type = normalizeText(input.movieType || input.contentType);

  if (!type) return true;

  return (
    type === "movie" ||
    type === "film" ||
    type === "series" ||
    type === "serial" ||
    type === "tv" ||
    type.includes("фильм") ||
    type.includes("сериал") ||
    type.includes("мультфильм") ||
    type.includes("документ")
  );
}

function getHtmlDataAttribute(source: unknown, attributeName: string) {
  const text = cleanString(source);
  if (!text) return "";

  const escapedAttribute = attributeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `\\b${escapedAttribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = text.match(pattern);

  return cleanString(match?.[1] || match?.[2] || match?.[3]);
}

export function extractRendexVideoId(value: unknown) {
  const text = cleanString(value);
  if (!text) return "";

  const dataId = getHtmlDataAttribute(text, "data-id");
  return cleanNumberString(dataId) || cleanNumberString(text);
}

function getNestedNumberString(
  source: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = cleanNumberString(source[key]);
    if (value) return value;
  }

  return "";
}

function valueToText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => valueToText(item))
      .filter(Boolean)
      .join(" ");
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return cleanString(
      record.name || record.title || record.value || record.slug || "",
    );
  }

  return cleanString(value);
}

function getNestedText(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = valueToText(source[key]);
    if (value) return value;
  }

  return "";
}

function getMovieTypeFromRawJson(rawJson: unknown) {
  const raw = asRecord(rawJson);
  const kinoluma = asRecord(raw.kinoluma);
  const candidate = asRecord(raw.candidate);
  const candidateRaw = asRecord(candidate.raw_json);
  const rawJsonRecord = asRecord(raw.raw_json);
  const catalog = asRecord(raw.catalog);

  return (
    getNestedText(kinoluma, [
      "movieType",
      "movie_type",
      "contentType",
      "content_type",
      "type",
      "category",
    ]) ||
    getNestedText(raw, [
      "movieType",
      "movie_type",
      "contentType",
      "content_type",
      "type",
      "category",
    ]) ||
    getNestedText(rawJsonRecord, [
      "movieType",
      "movie_type",
      "contentType",
      "content_type",
      "type",
      "category",
    ]) ||
    getNestedText(candidate, [
      "movieType",
      "movie_type",
      "contentType",
      "content_type",
      "type",
      "category",
    ]) ||
    getNestedText(candidateRaw, [
      "movieType",
      "movie_type",
      "contentType",
      "content_type",
      "type",
      "category",
    ]) ||
    getNestedText(catalog, [
      "movieType",
      "movie_type",
      "contentType",
      "content_type",
      "type",
      "category",
    ])
  );
}

function getGenresFromRawJson(rawJson: unknown) {
  const raw = asRecord(rawJson);
  const kinoluma = asRecord(raw.kinoluma);
  const candidate = asRecord(raw.candidate);
  const candidateRaw = asRecord(candidate.raw_json);
  const rawJsonRecord = asRecord(raw.raw_json);
  const catalog = asRecord(raw.catalog);

  return (
    getNestedText(kinoluma, ["genres", "genre"]) ||
    getNestedText(raw, ["genres", "genre"]) ||
    getNestedText(rawJsonRecord, ["genres", "genre"]) ||
    getNestedText(candidate, ["genres", "genre"]) ||
    getNestedText(candidateRaw, ["genres", "genre"]) ||
    getNestedText(catalog, ["genres", "genre"])
  );
}

function getNestedRendexVideoId(
  source: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = extractRendexVideoId(source[key]);
    if (value) return value;
  }

  return "";
}

function buildRendexPlayerFromEmbedCode(
  value: unknown,
  name = "Основной",
): KinoLumaPlayer | null {
  const text = cleanString(value);
  const contentId = extractRendexVideoId(text);
  if (!contentId) return null;

  return {
    id: `rendex-${contentId}`,
    name,
    type: "rendex",
    embedUrl: "",
    publisherId:
      cleanNumberString(getHtmlDataAttribute(text, "data-publisher-id")) ||
      RENDEX_PUBLISHER_ID,
    contentType: normalizeRendexContentType(
      getHtmlDataAttribute(text, "data-type") || "movie",
    ),
    contentId,
    scriptSrc: RENDEX_SCRIPT_SRC,
    design:
      cleanString(getHtmlDataAttribute(text, "data-design")) ||
      RENDEX_DEFAULT_COLORS.design,
    color1:
      cleanString(getHtmlDataAttribute(text, "data-color1")) ||
      RENDEX_DEFAULT_COLORS.color1,
    color2:
      cleanString(getHtmlDataAttribute(text, "data-color2")) ||
      RENDEX_DEFAULT_COLORS.color2,
    color3:
      cleanString(getHtmlDataAttribute(text, "data-color3")) ||
      RENDEX_DEFAULT_COLORS.color3,
    color4:
      cleanString(getHtmlDataAttribute(text, "data-color4")) ||
      RENDEX_DEFAULT_COLORS.color4,
    color5:
      cleanString(getHtmlDataAttribute(text, "data-color5")) ||
      RENDEX_DEFAULT_COLORS.color5,
  };
}

export function getRendexVideoIdFromRawJson(rawJson: unknown) {
  const raw = asRecord(rawJson);
  const kinoluma = asRecord(raw.kinoluma);
  const candidate = asRecord(raw.candidate);
  const candidateRaw = asRecord(candidate.raw_json);
  const rawJsonRecord = asRecord(raw.raw_json);
  const catalog = asRecord(raw.catalog);
  const rendex = asRecord(raw.rendex);
  const graphicslab = asRecord(raw.graphicslab);
  const existingRendexPlayer = parsePlayerArray(kinoluma.players).find(
    (player) => player.type === "rendex" && player.contentId,
  );

  return (
    cleanNumberString(existingRendexPlayer?.contentId) ||
    getNestedRendexVideoId(kinoluma, [
      "rendexVideoId",
      "rendex_video_id",
      "iframeVideoId",
      "iframe_video_id",
      "embedCode",
      "embed_code",
    ]) ||
    getNestedRendexVideoId(raw, [
      "rendexVideoId",
      "rendex_video_id",
      "iframeVideoId",
      "iframe_video_id",
      "embedCode",
      "embed_code",
    ]) ||
    getNestedRendexVideoId(rawJsonRecord, [
      "rendexVideoId",
      "rendex_video_id",
      "iframeVideoId",
      "iframe_video_id",
      "embedCode",
      "embed_code",
    ]) ||
    getNestedRendexVideoId(candidate, [
      "rendexVideoId",
      "rendex_video_id",
      "iframeVideoId",
      "iframe_video_id",
      "embedCode",
      "embed_code",
    ]) ||
    getNestedRendexVideoId(candidateRaw, [
      "rendexVideoId",
      "rendex_video_id",
      "iframeVideoId",
      "iframe_video_id",
      "embedCode",
      "embed_code",
    ]) ||
    getNestedRendexVideoId(catalog, [
      "rendexVideoId",
      "rendex_video_id",
      "iframeVideoId",
      "iframe_video_id",
      "embedCode",
      "embed_code",
    ]) ||
    getNestedRendexVideoId(rendex, [
      "videoId",
      "video_id",
      "id",
      "embedCode",
      "embed_code",
    ]) ||
    getNestedRendexVideoId(graphicslab, [
      "videoId",
      "video_id",
      "id",
      "embedCode",
      "embed_code",
    ])
  );
}

export function getKinopoiskIdFromRawJson(rawJson: unknown) {
  const raw = asRecord(rawJson);
  const kinoluma = asRecord(raw.kinoluma);
  const candidate = asRecord(raw.candidate);
  const candidateRaw = asRecord(candidate.raw_json);
  const rawJsonRecord = asRecord(raw.raw_json);
  const kinopoisk = asRecord(raw.kinopoisk);
  const externalId = asRecord(kinopoisk.externalId);

  return (
    getNestedNumberString(kinoluma, [
      "kinopoiskId",
      "kinopoisk_id",
      "kpId",
      "kp_id",
    ]) ||
    getNestedNumberString(raw, [
      "kinopoiskId",
      "kinopoisk_id",
      "kpId",
      "kp_id",
    ]) ||
    getNestedNumberString(rawJsonRecord, [
      "kinopoiskId",
      "kinopoisk_id",
      "kpId",
      "kp_id",
    ]) ||
    getNestedNumberString(candidate, [
      "kinopoiskId",
      "kinopoisk_id",
      "kpId",
      "kp_id",
    ]) ||
    getNestedNumberString(candidateRaw, [
      "kinopoiskId",
      "kinopoisk_id",
      "kpId",
      "kp_id",
    ]) ||
    getNestedNumberString(kinopoisk, ["id", "kpId", "kp_id"]) ||
    getNestedNumberString(externalId, ["kp", "kinopoisk"])
  );
}

export function getImdbIdFromRawJson(rawJson: unknown) {
  const raw = asRecord(rawJson);
  const kinoluma = asRecord(raw.kinoluma);
  const candidate = asRecord(raw.candidate);
  const candidateRaw = asRecord(candidate.raw_json);
  const rawJsonRecord = asRecord(raw.raw_json);
  const kinopoisk = asRecord(raw.kinopoisk);
  const externalId = asRecord(kinopoisk.externalId);

  return (
    normalizeImdbId(getNestedText(kinoluma, ["imdbId", "imdb_id"])) ||
    normalizeImdbId(getNestedText(raw, ["imdbId", "imdb_id"])) ||
    normalizeImdbId(getNestedText(rawJsonRecord, ["imdbId", "imdb_id"])) ||
    normalizeImdbId(getNestedText(candidate, ["imdbId", "imdb_id"])) ||
    normalizeImdbId(getNestedText(candidateRaw, ["imdbId", "imdb_id"])) ||
    normalizeImdbId(getNestedText(kinopoisk, ["imdbId", "imdb_id"])) ||
    normalizeImdbId(getNestedText(externalId, ["imdb"]))
  );
}

function normalizeRendexContentType(input?: string | null) {
  const value = cleanString(input).toLowerCase();

  if (value === "series" || value === "serial" || value === "tv")
    return "series";

  return "movie";
}

function getRendexContentType(input: AutoPlayerInput) {
  if (input.contentType) return normalizeRendexContentType(input.contentType);

  const type = cleanString(input.movieType).toLowerCase();

  if (
    type.includes("сериал") ||
    type === "series" ||
    type === "serial" ||
    type === "tv"
  )
    return "series";

  return "movie";
}

export function buildFactoriosUrl(
  kinopoiskId: number | string | null | undefined,
) {
  const id = cleanNumberString(kinopoiskId);
  return id ? `${FACTORIOS_BASE_URL}/${id}` : "";
}

export function buildAutoPlayers(input: AutoPlayerInput): KinoLumaPlayer[] {
  if (!canAutoGeneratePlayers(input)) {
    return [];
  }

  const fallbackKinopoiskId =
    input.kinopoiskId || getFallbackKinopoiskIdBySlug(input.slug);
  const kinopoiskId = cleanNumberString(fallbackKinopoiskId);
  const imdbId = normalizeImdbId(input.imdbId);
  const rendexVideoId = extractRendexVideoId(input.rendexVideoId);
  const collapseUrl =
    buildCollapseKinopoiskUrl(kinopoiskId) || buildCollapseImdbUrl(imdbId);
  const factoriosUrl = buildFactoriosUrl(kinopoiskId);
  const players: KinoLumaPlayer[] = [];

  if (collapseUrl) {
    players.push({
      id: kinopoiskId
        ? `collapse-kp-${kinopoiskId}`
        : `collapse-imdb-${imdbId}`,
      name: "Основной",
      type: "collapse",
      provider: "collapse",
      embedUrl: collapseUrl,
      contentKind: kinopoiskId ? "kp" : "imdb",
      contentType: kinopoiskId ? "kp" : "imdb",
      contentId: kinopoiskId || imdbId,
    });
  }

  if (rendexVideoId) {
    players.push({
      id: `rendex-${rendexVideoId}`,
      name: collapseUrl ? "Запасной 1" : "Основной",
      type: "rendex",
      embedUrl: "",
      publisherId: RENDEX_PUBLISHER_ID,
      contentType: getRendexContentType(input),
      contentId: rendexVideoId,
      scriptSrc: RENDEX_SCRIPT_SRC,
      ...RENDEX_DEFAULT_COLORS,
    });
  }

  if (factoriosUrl) {
    players.push({
      id: `factorios-${kinopoiskId}`,
      name:
        collapseUrl || rendexVideoId
          ? `Запасной ${players.length}`
          : "Основной",
      type: "iframe",
      provider: "factorios",
      embedUrl: factoriosUrl,
    });
  }

  return players;
}

export function buildAutoPlayersFromRawJson(
  rawJson: unknown,
  input: Omit<AutoPlayerInput, "rendexVideoId" | "kinopoiskId"> &
    AutoPlayerInput = {},
) {
  return buildAutoPlayers({
    ...input,
    movieType: cleanString(input.movieType) || getMovieTypeFromRawJson(rawJson),
    genres: input.genres || getGenresFromRawJson(rawJson),
    kinopoiskId:
      cleanNumberString(input.kinopoiskId) ||
      getKinopoiskIdFromRawJson(rawJson),
    imdbId: normalizeImdbId(input.imdbId) || getImdbIdFromRawJson(rawJson),
    rendexVideoId:
      cleanNumberString(input.rendexVideoId) ||
      getRendexVideoIdFromRawJson(rawJson),
  });
}

export function mergeAutoPlayersIntoRawJson(
  rawJson: unknown,
  input: AutoPlayerInput = {},
) {
  const base = asRecord(rawJson);
  const kinoluma = asRecord(base.kinoluma);
  const existingPlayers = parsePlayerArray(kinoluma.players);
  const generatedPlayers = buildAutoPlayersFromRawJson(base, input);
  const players = existingPlayers.length ? existingPlayers : generatedPlayers;
  const rendexVideoId =
    extractRendexVideoId(input.rendexVideoId) ||
    getRendexVideoIdFromRawJson(base);
  const kinopoiskId =
    cleanNumberString(input.kinopoiskId) ||
    getKinopoiskIdFromRawJson(base) ||
    cleanNumberString(getFallbackKinopoiskIdBySlug(input.slug));
  const imdbId = normalizeImdbId(input.imdbId) || getImdbIdFromRawJson(base);

  return {
    ...base,
    kinoluma: {
      ...kinoluma,
      ...(rendexVideoId ? { rendex_video_id: rendexVideoId } : {}),
      ...(kinopoiskId ? { kinopoisk_id: kinopoiskId } : {}),
      ...(imdbId ? { imdb_id: imdbId } : {}),
      players,
      players_autogenerated_at: new Date().toISOString(),
    },
  };
}

export function parsePlayerArray(value: unknown): KinoLumaPlayer[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((player, index) => normalizePlayer(asRecord(player), index))
    .filter((player): player is KinoLumaPlayer => Boolean(player));
}

function normalizePlayer(
  item: Record<string, unknown>,
  index: number,
): KinoLumaPlayer | null {
  const type = cleanString(
    item.type || item.kind || item.provider,
  ).toLowerCase();
  const name = cleanString(item.name) || `Плеер ${index + 1}`;

  if (type === "collapse" || type === "collaps") {
    const embedUrl = cleanString(item.embedUrl || item.embed_url || item.url);
    const contentKind = cleanString(
      item.contentKind ||
        item.content_kind ||
        item.contentType ||
        item.content_type ||
        "movie",
    );
    const contentId = cleanString(
      item.contentId ||
        item.content_id ||
        item.dataId ||
        item.data_id ||
        item.id,
    );
    const player = embedUrl
      ? buildCollapseIframePlayer(name, embedUrl, index)
      : buildCollapsePlayerFromParts(name, contentKind, contentId, index);

    if (!player) return null;

    return {
      ...player,
      id: cleanString(item.id) || player.id,
    };
  }

  if (type === "collapse-iframe" || type === "collaps-iframe") {
    const player = buildCollapseIframePlayer(
      name,
      item.embedUrl || item.embed_url || item.url,
      index,
    );
    return player ? { ...player, id: cleanString(item.id) || player.id } : null;
  }

  if (type === "vibix" || type === "vibix-iframe") {
    const player = buildVibixIframePlayer(
      name,
      item.embedUrl || item.embed_url || item.url || item.iframe_url,
      index,
    );
    return player ? { ...player, id: cleanString(item.id) || player.id } : null;
  }

  if (
    type === "rendex" ||
    type === "graphicslab" ||
    type === "widget" ||
    extractRendexVideoId(
      item.contentId || item.content_id || item.dataId || item.data_id,
    )
  ) {
    const contentId = extractRendexVideoId(
      item.contentId ||
        item.content_id ||
        item.dataId ||
        item.data_id ||
        item.id,
    );
    if (!contentId) return null;

    return {
      id: cleanString(item.id) || `rendex-${contentId}`,
      name,
      type: "rendex",
      embedUrl: "",
      publisherId:
        cleanString(item.publisherId || item.publisher_id) ||
        RENDEX_PUBLISHER_ID,
      contentType: normalizeRendexContentType(
        cleanString(
          item.contentType ||
            item.content_type ||
            item.dataType ||
            item.data_type,
        ) || "movie",
      ),
      contentId,
      scriptSrc:
        cleanString(item.scriptSrc || item.script_src) || RENDEX_SCRIPT_SRC,
      design: cleanString(item.design) || RENDEX_DEFAULT_COLORS.design,
      color1: cleanString(item.color1) || RENDEX_DEFAULT_COLORS.color1,
      color2: cleanString(item.color2) || RENDEX_DEFAULT_COLORS.color2,
      color3: cleanString(item.color3) || RENDEX_DEFAULT_COLORS.color3,
      color4: cleanString(item.color4) || RENDEX_DEFAULT_COLORS.color4,
      color5: cleanString(item.color5) || RENDEX_DEFAULT_COLORS.color5,
    };
  }

  const embedUrl = cleanString(item.embedUrl || item.embed_url || item.url);
  if (!embedUrl) return null;

  return {
    id: cleanString(item.id) || `player-${index + 1}`,
    name,
    type: type === "vibix" || type === "vibix-iframe" ? "vibix-iframe" : "iframe",
    provider: cleanString(item.provider),
    embedUrl,
  };
}

export function parsePlayerText(value: unknown): KinoLumaPlayer[] {
  if (Array.isArray(value)) return parsePlayerArray(value);
  if (typeof value !== "string") return [];

  return value
    .split("\n")
    .map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return null;

      const parts = trimmed
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean);
      const name = parts[0] || `Плеер ${index + 1}`;
      const type = (parts[1] || "").toLowerCase();

      if (parts.length === 1 && /<ins\b|data-id\s*=/i.test(trimmed)) {
        return buildRendexPlayerFromEmbedCode(
          trimmed,
          index === 0 ? "Основной" : `Плеер ${index + 1}`,
        );
      }

      if (type === "collapse" || type === "collaps") {
        const possibleUrl = parts.slice(2).join("|").trim();

        if (/^https?:\/\//i.test(possibleUrl)) {
          return buildCollapseIframePlayer(name, possibleUrl, index);
        }

        const knownKind = ["movie", "film", "kp", "kinopoisk", "imdb"].includes(
          (parts[2] || "").toLowerCase(),
        );
        const contentKind = knownKind ? parts[2] : "movie";
        const contentId = knownKind
          ? parts.slice(3).join("|").trim()
          : parts.slice(2).join("|").trim();
        return buildCollapsePlayerFromParts(
          name,
          contentKind,
          contentId,
          index,
        );
      }

      if (type === "collapse-iframe" || type === "collaps-iframe") {
        return buildCollapseIframePlayer(
          name,
          parts.slice(2).join("|").trim(),
          index,
        );
      }

      if (type === "vibix" || type === "vibix-iframe") {
        return buildVibixIframePlayer(
          name,
          parts.slice(2).join("|").trim(),
          index,
        );
      }

      if (type === "rendex" || type === "graphicslab" || type === "widget") {
        const compactContentId = extractRendexVideoId(parts[2]);
        const longPublisherId = cleanString(parts[2]) || RENDEX_PUBLISHER_ID;
        const longContentType = normalizeRendexContentType(parts[3] || "movie");
        const longContentId = extractRendexVideoId(parts[4]);
        const contentId = longContentId || compactContentId;

        if (!contentId) return null;

        const embedCodePlayer = buildRendexPlayerFromEmbedCode(
          parts.slice(2).join("|"),
          name,
        );
        if (embedCodePlayer) return embedCodePlayer;

        return {
          id: `rendex-${contentId}`,
          name,
          type: "rendex",
          embedUrl: "",
          publisherId: longContentId ? longPublisherId : RENDEX_PUBLISHER_ID,
          contentType: longContentId ? longContentType : "movie",
          contentId,
          scriptSrc: RENDEX_SCRIPT_SRC,
          ...RENDEX_DEFAULT_COLORS,
        } satisfies KinoLumaPlayer;
      }

      if (type === "iframe") {
        const embedUrl = parts.slice(2).join("|").trim();
        if (!embedUrl) return null;

        return {
          id: `player-${index + 1}`,
          name,
          type: "iframe",
          embedUrl,
        } satisfies KinoLumaPlayer;
      }

      const embedUrl = parts.slice(1).join("|").trim() || trimmed;
      if (!embedUrl) return null;

      return {
        id: `player-${index + 1}`,
        name,
        type: "iframe",
        embedUrl,
      } satisfies KinoLumaPlayer;
    })
    .filter((player): player is KinoLumaPlayer => Boolean(player));
}

export function playersToText(players: unknown) {
  return parsePlayerArray(players)
    .map((player) => {
      if (player.type === "collapse") {
        if (player.contentId) {
          return `${player.name} | collapse | ${player.contentKind || player.contentType || "movie"} | ${player.contentId}`.trim();
        }

        return player.embedUrl
          ? `${player.name} | collapse-iframe | ${player.embedUrl}`
          : "";
      }

      if (player.type === "collapse-iframe") {
        return player.embedUrl
          ? `${player.name} | collapse-iframe | ${player.embedUrl}`
          : "";
      }

      if (player.type === "vibix-iframe" || player.provider === "vibix") {
        return player.embedUrl
          ? `${player.name} | vibix | ${player.embedUrl}`
          : "";
      }

      if (player.type === "rendex") {
        return `${player.name} | rendex | ${player.contentId || ""}`.trim();
      }

      return player.embedUrl
        ? `${player.name} | iframe | ${player.embedUrl}`
        : "";
    })
    .filter(Boolean)
    .join("\n");
}

export function buildPlayerTextFromIds(input: AutoPlayerInput) {
  return playersToText(buildAutoPlayers(input));
}
