"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { checkFrameReachability, type FrameReachabilityResult } from "../lib/playerFrameProbe";

const FIRST_CHECK_MS = 6000;
const CONTROL_URL = "/kinoluma-icon.png";

function frameSrc(container: HTMLElement | null) {
  return container?.querySelector("iframe")?.getAttribute("src")?.trim() || "";
}

// Resource Timing exposes response details of a frame navigation only when the
// provider sends Timing-Allow-Origin; when it does, a delivered response proves
// the frame loaded even if our HEAD probe was blocked.
function frameDelivered(src: string) {
  if (typeof performance === "undefined" || typeof performance.getEntriesByName !== "function") return false;
  return performance.getEntriesByName(src).some((entry) => {
    const timing = entry as PerformanceResourceTiming;
    return timing.initiatorType === "iframe" && (timing.responseStart > 0 || timing.transferSize > 0);
  });
}

// Fail open: a cross-origin frame cannot be inspected, and a HEAD probe can be
// blocked while the frame itself plays. The guard therefore never covers the
// frame; it only reports what it found (also as data-* diagnostics) so the page
// can offer the other source next to the player. Nothing is rewritten or proxied.
export default function PlayerFrameGuard({ onResult, children }: {
  onResult?: (result: FrameReachabilityResult | null) => void;
  children: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const onResultRef = useRef(onResult);
  const [result, setResult] = useState<FrameReachabilityResult | null>(null);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const controller = new AbortController();
    let observer: MutationObserver | null = null;
    const report = (next: FrameReachabilityResult | null) => {
      setResult(next);
      onResultRef.current?.(next);
    };
    const checkTimer = setTimeout(() => {
      const src = frameSrc(container.current);
      checkFrameReachability(src, {
        signal: controller.signal,
        currentSrc: () => frameSrc(container.current),
        controlUrl: CONTROL_URL,
        isOnline: () => typeof navigator === "undefined" || navigator.onLine !== false,
        frameDelivered: () => frameDelivered(src),
      }).then((next) => {
        if (controller.signal.aborted) return;
        report(next);
        if (next.state === "reachable") return;
        // The provider may still replace the frame (Collapse actualize.js): withdraw the notice then.
        observer = new MutationObserver(() => {
          if (frameSrc(container.current) === src) return;
          observer?.disconnect();
          report({ state: "unknown", reason: "frame_changed", host: next.host });
        });
        if (container.current) observer.observe(container.current, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
      });
    }, FIRST_CHECK_MS);
    return () => {
      clearTimeout(checkTimer);
      controller.abort();
      observer?.disconnect();
      onResultRef.current?.(null);
    };
  }, []);

  return (
    <div ref={container} className="player-frame-guard"
      data-player-frame-status={result?.state ?? "checking"}
      data-player-frame-reason={result?.reason}
      data-player-frame-host={result?.host}>
      {children}
    </div>
  );
}
