import type { PlayerProvider } from "../data/movies";

export type VibixIdentity =
  | { kind: "movie" | "series" | "kp"; id: string }
  | { kind: "imdb"; id: string }
  | { kind: "iframe"; url: string };
export type VibixSdkKind = Exclude<VibixIdentity["kind"], "iframe">;
export type VibixStatus = "idle" | "loading" | "found" | "not_found" | "auth_error" |
  "rate_limited" | "upstream_error" | "timeout" | "invalid_response" | "unconfigured";
export type VibixPlayerData = PlayerProvider & {
  type: "vibix-iframe" | "rendex";
  provider: string;
  contentId?: string;
  contentType?: VibixSdkKind;
  publisherId?: string;
};
export type VibixLookupResult = { status: Exclude<VibixStatus, "idle" | "loading">; player: VibixPlayerData | null };

export type VibixProvenance = {
  source: "manual-verified" | "legacy-generated";
  canonicalMovieId: string;
  slug: string;
  contentType: "movie" | "series";
  playerKey: string;
};
export type VibixPlan = {
  movieKey: string;
  status: "verified" | "external" | "legacy_unverified" | "unverified_identity" | "identity_conflict" | "unavailable";
  players: PlayerProvider[];
};
export const VIBIX_PLAN_TEXT: Record<VibixPlan["status"], string> = {
  verified: "", external: "",
  legacy_unverified: "Сохранённая привязка Vibix требует проверки. Автоматическая замена отключена.",
  unverified_identity: "Недостаточно подтверждённых данных для автоматического подключения Vibix.",
  identity_conflict: "Vibix не подключён: идентификаторы произведения не совпадают.",
  unavailable: "Для Vibix нет подтверждённого Kinopoisk или IMDb ID. Можно выбрать другой источник.",
};

export function normalizeVibixKind(value: unknown): VibixSdkKind | null {
  const text = String(value ?? "").trim().toLowerCase();
  if (["series", "serial", "tv"].includes(text)) return "series";
  if (["movie", "film"].includes(text)) return "movie";
  if (text === "kp" || text === "imdb") return text;
  return null;
}

export function parseVibixId(kind: VibixSdkKind, value: unknown): string {
  const text = String(value ?? "").trim();
  if (kind === "imdb") return /^tt\d+$/i.test(text) ? text.toLowerCase() : "";
  return /^[1-9]\d*$/.test(text) && Number.isSafeInteger(Number(text)) ? text : "";
}

export function isVibixPlayer(player: PlayerProvider): boolean {
  const record = player as PlayerProvider & Record<string, unknown>;
  return [record.type, record.provider].some((value) =>
    ["vibix", "vibix-iframe", "exiim", "rendex", "graphicslab"].includes(String(value ?? "").toLowerCase()));
}

export function isVibixSdkPlayer(player: PlayerProvider): boolean {
  const record = player as PlayerProvider & Record<string, unknown>;
  return [record.type, record.provider].some((value) => String(value ?? "").toLowerCase() === "rendex");
}

// Only provider-labelled records from the existing movie/override pipeline are
// restored. HTTPS alone is not provenance. Do not guess mirrors or rewrite URLs.
export function safeVibixIframeUrl(value: unknown): string {
  try {
    const url = new URL(String(value ?? ""));
    const hosts = ["vibix.org", "exiim.cloud", "kinescopecdn.net", "videoframe2.com"];
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) ||
      url.pathname === "/" || /^\/(api|login|profile|logout)(\/|$)/i.test(url.pathname)) return "";
    return url.toString();
  } catch { return ""; }
}

export function isUsableSavedPlayer(player: PlayerProvider): boolean {
  const record = player as PlayerProvider & Record<string, unknown>;
  if (!isVibixPlayer(player)) return Boolean(player.embedUrl?.trim());
  if (record.disabled === true || record.revoked === true || record.expired === true) return false;
  if (isVibixSdkPlayer(player)) {
    const kind = normalizeVibixKind(record.contentType || "movie");
    return Boolean(kind && parseVibixId(kind, record.contentId || record.rendexVideoId));
  }
  return Boolean(safeVibixIframeUrl(player.embedUrl));
}

export function stablePlayerKey(player: PlayerProvider): string {
  const record = player as PlayerProvider & Record<string, unknown>;
  if (isVibixSdkPlayer(player)) return `rendex:${record.publisherId || "678053396"}:${normalizeVibixKind(record.contentType || "movie")}:${record.contentId || record.rendexVideoId}`;
  try {
    const url = new URL(player.embedUrl);
    if (isVibixPlayer(player)) {
      for (const name of ["design", "color1", "color2", "color3", "color4", "color5", "sharing", "episodesOpen"]) url.searchParams.delete(name);
    }
    url.searchParams.sort();
    return `${isVibixPlayer(player) ? "vibix" : "iframe"}:${url.toString()}`;
  } catch { return `${record.type || "iframe"}:${player.id}`; }
}

export function mergePlayerOptions(...groups: PlayerProvider[][]): PlayerProvider[] {
  const seen = new Set<string>();
  return groups.flat().filter((player) => {
    if (!isUsableSavedPlayer(player)) return false;
    const key = stablePlayerKey(player);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type PlayerSelection = { movieKey: string; playerKey: string };

export function isVibixLookupPlayer(value: unknown): value is VibixPlayerData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const player = value as Record<string, unknown>;
  if (!["id", "name", "provider", "embedUrl"].every((key) => typeof player[key] === "string")) return false;
  if (player.type !== "rendex" && player.type !== "vibix-iframe") return false;
  if (player.contentId != null && typeof player.contentId !== "string") return false;
  if (player.publisherId != null && typeof player.publisherId !== "string") return false;
  if (player.contentType != null && !normalizeVibixKind(player.contentType)) return false;
  return isUsableSavedPlayer(value as PlayerProvider);
}
export function selectedPlayer(players: PlayerProvider[], selection: PlayerSelection | null, movieKey: string) {
  return (selection?.movieKey === movieKey
    ? players.find((player) => stablePlayerKey(player) === selection.playerKey) : undefined) || players[0];
}

export const VIBIX_STATUS_TEXT: Record<VibixStatus, string> = {
  idle: "", loading: "Проверяем доступность Vibix…", found: "",
  not_found: "Vibix сообщил, что видео отсутствует. Можно выбрать другой плеер.",
  auth_error: "Vibix временно недоступен. Можно выбрать другой плеер.",
  rate_limited: "Vibix временно ограничил запросы. Попробуйте позже.",
  upstream_error: "Не удалось связаться с Vibix. Сохранённые варианты остаются доступны.",
  timeout: "Vibix не ответил вовремя. Сохранённые варианты остаются доступны.",
  invalid_response: "Не удалось получить корректные данные Vibix.",
  unconfigured: "Поиск Vibix временно недоступен. Сохранённые варианты остаются доступны.",
};
