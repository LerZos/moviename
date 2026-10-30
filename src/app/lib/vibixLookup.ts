import "server-only";
import { normalizeVibixKind, parseVibixId, safeVibixIframeUrl, type VibixLookupResult } from "./vibix";

type LookupOptions = {
  kpId?: string; imdbId?: string; movieType?: string;
  baseUrl: string; token: string; publisherId: string;
  signal?: AbortSignal; timeoutMs?: number; fetcher?: typeof fetch;
};
const result = (status: VibixLookupResult["status"]): VibixLookupResult => ({ status, player: null });
function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

async function lookupOne(kind: "kp" | "imdb", id: string, options: LookupOptions): Promise<VibixLookupResult> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? 6000);
  try {
    const response = await (options.fetcher ?? fetch)(`${options.baseUrl}/api/v1/publisher/videos/${kind}/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${options.token}`, Accept: "application/json" },
      cache: "no-store", redirect: "error", signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) return result("auth_error");
    if (response.status === 429) return result("rate_limited");
    // A generic 404 can mean a missing route, not necessarily a missing title.
    if (!response.ok) return result("upstream_error");
    let payload: unknown;
    try { payload = await response.json(); }
    catch { return result(timedOut ? "timeout" : "invalid_response"); }
    const envelope = record(payload);
    if (!envelope || envelope.success === false) return result("invalid_response");
    // Only an explicit successful, empty lookup is treated as absence.
    if (envelope.success === true && Object.hasOwn(envelope, "data") && envelope.data === null) return result("not_found");
    const video = Object.hasOwn(envelope, "data") ? record(envelope.data) : envelope;
    if (!video) return result("invalid_response");
    const kp = video.kp_id ?? video.kinopoisk_id;
    if ((kp != null && options.kpId && String(kp) !== options.kpId) ||
      (video.imdb_id != null && options.imdbId && String(video.imdb_id).toLowerCase() !== options.imdbId)) return result("invalid_response");
    const contentType = normalizeVibixKind(video.type);
    if (video.type != null && contentType !== "movie" && contentType !== "series") return result("invalid_response");
    if ((options.movieType === "Сериал" && contentType === "movie") ||
      (options.movieType === "Фильм" && contentType === "series")) return result("invalid_response");
    const contentId = contentType ? parseVibixId(contentType, video.id) : "";
    const rawUrl = video.iframe_url ?? video.iframeUrl;
    if (rawUrl != null && rawUrl !== "") {
      const embedUrl = safeVibixIframeUrl(rawUrl);
      if (!embedUrl) return result("invalid_response");
      return { status: "found", player: {
        id: `exiim-${contentId || `${kind}-${id}`}`, name: "Exiim", type: "vibix-iframe", provider: "exiim",
        embedUrl,
      } };
    }
    // A bare provider ID must carry its own documented namespace; never infer
    // it from the requested KP/IMDb ID or a catalogue title.
    if (!contentId || (contentType !== "movie" && contentType !== "series")) return result("invalid_response");
    return { status: "found", player: {
      id: `rendex-${contentType}-${contentId}`, name: "Vibix", type: "rendex", provider: "rendex",
      embedUrl: "", contentId, contentType, publisherId: options.publisherId,
    } };
  } catch { return result(timedOut ? "timeout" : "upstream_error"); }
  finally { clearTimeout(timer); options.signal?.removeEventListener("abort", abort); }
}

export async function lookupVibix(options: LookupOptions): Promise<VibixLookupResult> {
  if (!options.token.trim()) return result("unconfigured");
  const kpId = parseVibixId("kp", options.kpId);
  const imdbId = parseVibixId("imdb", options.imdbId);
  if (!kpId && !imdbId) return result("invalid_response");
  if (options.signal?.aborted) return result("upstream_error");
  const first = await lookupOne(kpId ? "kp" : "imdb", kpId || imdbId, options);
  // No retries on errors. Alternative ID only after explicit absence.
  if (first.status !== "not_found" || !kpId || !imdbId || options.signal?.aborted) return first;
  return lookupOne("imdb", imdbId, options);
}
