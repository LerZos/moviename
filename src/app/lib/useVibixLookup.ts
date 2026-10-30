"use client";

import { useEffect, useState } from "react";
import { isVibixLookupPlayer, VIBIX_STATUS_TEXT, type VibixLookupResult, type VibixStatus } from "./vibix";

// The owner also tags each result by movie identity: cancellation alone is not
// enough if a response resolves immediately before a route transition.
export function useVibixLookup(input: {
  movieKey: string; kpId?: number; imdbId?: string; movieType: string;
  enabled: boolean;
}) {
  const { movieKey, kpId, imdbId, movieType, enabled } = input;
  const key = JSON.stringify([movieKey, kpId, imdbId, movieType]);
  const [state, setState] = useState<{ key: string; result: VibixLookupResult } | null>(null);
  useEffect(() => {
    if (!enabled || (!kpId && !imdbId)) return;
    const controller = new AbortController();
    let current = true;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
    const params = new URLSearchParams({ movieType });
    if (kpId) params.set("kpId", String(kpId));
    if (imdbId) params.set("imdbId", imdbId);
    void (async () => {
      let result: VibixLookupResult;
      try {
        const response = await fetch(`/api/player/vibix?${params}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as Partial<VibixLookupResult>;
        const status = payload?.status;
        if (!status || !Object.hasOwn(VIBIX_STATUS_TEXT, status) || ["idle", "loading"].includes(status) ||
          (status === "found" && (!response.ok || !isVibixLookupPlayer(payload.player)))) {
          result = { status: "invalid_response", player: null };
        } else result = { status, player: status === "found" ? payload.player! : null };
      } catch (error) {
        result = { status: timedOut ? "timeout" : error instanceof SyntaxError ? "invalid_response" : "upstream_error", player: null };
      } finally { clearTimeout(timer); }
      if (current) setState({ key, result });
    })();
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [key, kpId, imdbId, movieType, enabled]);
  const result = enabled && state?.key === key ? state.result : null;
  const status: VibixStatus = result?.status || (enabled && (kpId || imdbId) ? "loading" : "idle");
  return { status, player: result?.player ?? null };
}
