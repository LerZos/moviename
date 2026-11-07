// Reachability check for a third-party player frame. Browsers give no reliable
// signal for a failed cross-origin iframe (`load` fires for the error page too),
// so this only reports "unreachable" when the evidence is strong and fails open
// ("unknown") whenever the result is ambiguous. Even "unreachable" is not proof (a
// type-specific blocker can reject the probe while the frame plays), so callers must
// never cover the frame because of it. It never rewrites or proxies URLs.

export type FrameReachability = "reachable" | "unknown" | "unreachable";

export type FrameReachabilityReason =
  | "responded" // the frame host answered (any HTTP status, including 403/404/405)
  | "frame_delivered" // the probe failed but the frame's own response was observed
  | "no_src" // no frame URL to check: Collapse's actualize.js writes the player into a src-less frame
  | "not_https"
  | "unsupported" // fetch/AbortController missing
  | "offline"
  | "timeout"
  | "aborted" // unmount, player switch or retry
  | "frame_changed" // the provider replaced the frame while checking
  | "network_unconfirmed" // probe failed, but the failure was not reproduced cleanly
  | "network_error"; // the host failed twice while our own origin answered

export type FrameReachabilityResult = {
  state: FrameReachability;
  reason: FrameReachabilityReason;
  host?: string;
};

type ProbeOutcome = "ok" | "network_error" | "timeout" | "aborted";

export type FrameProbeDeps = {
  fetchImpl?: typeof fetch;
  signal: AbortSignal;
  /** Re-reads the frame URL so a frame swapped by the provider is never blamed. */
  currentSrc: () => string;
  /** Same-origin static file: tells "this host is unreachable" from "we are offline". */
  controlUrl: string;
  isOnline?: () => boolean;
  /** True when the frame's own navigation is known to have delivered a response. */
  frameDelivered?: () => boolean;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  timeoutMs?: number;
  confirmDelayMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_CONFIRM_DELAY_MS = 2500;

function defaultSleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

// A no-cors HEAD resolves with an opaque response whenever the server answers,
// whatever the status, and rejects only on a network-level failure.
async function probe(url: string, fetchImpl: typeof fetch, signal: AbortSignal, timeoutMs: number): Promise<ProbeOutcome> {
  if (signal.aborted) return "aborted";
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    await fetchImpl(url, { method: "HEAD", mode: "no-cors", cache: "no-store", credentials: "omit", redirect: "follow", signal: controller.signal });
    return "ok";
  } catch {
    if (timedOut) return "timeout";
    return signal.aborted ? "aborted" : "network_error";
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

export function parseFrameUrl(src: string) {
  try {
    return new URL(src.trim());
  } catch {
    return null;
  }
}

export async function checkFrameReachability(src: string, deps: FrameProbeDeps): Promise<FrameReachabilityResult> {
  const fetchImpl = deps.fetchImpl ?? (typeof fetch === "function" ? fetch : undefined);
  const sleep = deps.sleep ?? defaultSleep;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = parseFrameUrl(src);
  if (!src.trim() || !url) return { state: "unknown", reason: "no_src" };
  const host = url.hostname;
  if (url.protocol !== "https:") return { state: "unknown", reason: "not_https", host };
  if (!fetchImpl || typeof AbortController !== "function") return { state: "unknown", reason: "unsupported", host };
  if (deps.isOnline && !deps.isOnline()) return { state: "unknown", reason: "offline", host };

  const changed = () => deps.currentSrc().trim() !== src.trim();
  const first = await probe(url.toString(), fetchImpl, deps.signal, timeoutMs);
  if (first === "ok") return { state: "reachable", reason: "responded", host };
  if (first !== "network_error") return { state: "unknown", reason: first, host };
  if (changed()) return { state: "unknown", reason: "frame_changed", host };

  await sleep(deps.confirmDelayMs ?? DEFAULT_CONFIRM_DELAY_MS, deps.signal);
  if (deps.signal.aborted) return { state: "unknown", reason: "aborted", host };
  if (changed()) return { state: "unknown", reason: "frame_changed", host };
  const second = await probe(url.toString(), fetchImpl, deps.signal, timeoutMs);
  if (second === "ok") return { state: "reachable", reason: "responded", host };
  if (second === "aborted") return { state: "unknown", reason: "aborted", host };
  if (second === "timeout") return { state: "unknown", reason: "network_unconfirmed", host };

  // Both probes failed fast; the probe may be blocked while the frame itself plays.
  if (deps.frameDelivered?.()) return { state: "reachable", reason: "frame_delivered", host };
  // Only blame the host when our own origin answers.
  const control = await probe(deps.controlUrl, fetchImpl, deps.signal, timeoutMs);
  if (control === "aborted") return { state: "unknown", reason: "aborted", host };
  if (control !== "ok") return { state: "unknown", reason: deps.isOnline && !deps.isOnline() ? "offline" : "network_unconfirmed", host };
  if (changed()) return { state: "unknown", reason: "frame_changed", host };
  return { state: "unreachable", reason: "network_error", host };
}

export type FrameNotice = "unreachable" | "hint" | null;

/**
 * What to show next to (never over) the player. "unreachable" is the strongest
 * client-side evidence available, still not proof; "hint" covers ambiguous results.
 */
export function frameNotice(result: FrameReachabilityResult | null): FrameNotice {
  if (!result) return null;
  if (result.state === "unreachable") return "unreachable";
  return result.state === "unknown" && (result.reason === "timeout" || result.reason === "network_unconfirmed" || result.reason === "offline")
    ? "hint"
    : null;
}
