"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerProvider } from "../data/movies";
import { isVibixSdkPlayer, normalizeVibixKind, parseVibixId, safeVibixIframeUrl } from "../lib/vibix";

const COLORS = ["#56CEAA", "#FFFFFF", "#AEC7BC", "#42BD88", "#000000"];
const IFRAME_COLORS = ["#2d3043", "#ffffff", "#0f101a", "#2d3043", "#ffffff"];

// Both official SDK scripts are loaded by the root layout.
// No WatchParty, playback commands or automatic reloads.
export default function VibixPlayer({ player, title, movieType }: { player: PlayerProvider; title: string; movieType?: string }) {
  const record = player as PlayerProvider & Record<string, unknown>;
  const sdk = isVibixSdkPlayer(player);
  const container = useRef<HTMLDivElement>(null);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [problem, setProblem] = useState("");
  const kind = normalizeVibixKind(record.contentType || (movieType === "Сериал" ? "series" : "movie"));
  const contentId = kind ? parseVibixId(kind, record.contentId || record.rendexVideoId) : "";
  const safeUrl = safeVibixIframeUrl(player.embedUrl);
  let src = safeUrl;
  if (safeUrl) {
    const url = new URL(safeUrl);
    url.searchParams.set("design", "1");
    IFRAME_COLORS.forEach((color, i) => url.searchParams.set(`color${i + 1}`, color));
    url.searchParams.set("sharing", "false");
    url.searchParams.set("episodesOpen", "false");
    src = url.toString();
  }
  useEffect(() => {
    if (documentLoaded) return;
    const timer = setTimeout(() => setProblem("Загрузка Vibix задерживается. Можно выбрать другой плеер."), 12000);
    // This observes insertion only, not video availability or successful playback.
    const checkFrame = () => {
      if (container.current?.querySelector("iframe")) { setDocumentLoaded(true); setProblem(""); }
    };
    const observer = sdk ? new MutationObserver(checkFrame) : null;
    if (sdk && container.current) {
      observer?.observe(container.current, { childList: true, subtree: true });
      checkFrame();
    }
    return () => { clearTimeout(timer); observer?.disconnect(); };
  }, [sdk, documentLoaded]);
  const invalid = sdk ? !contentId : !safeUrl;
  const color = (index: number) => typeof record[`color${index + 1}`] === "string"
    ? String(record[`color${index + 1}`]) : COLORS[index];
  return <div className={sdk ? "rendex-player-frame" : "player-iframe-shell"} ref={container}>
    {!invalid && (sdk ? <>
      <ins data-publisher-id="678053396"
        data-type={kind} data-id={contentId} data-design="1"
        data-color1={color(0)} data-color2={color(1)} data-color3={color(2)} data-color4={color(3)} data-color5={color(4)}
        data-width="100%" data-height="100%" />
    </> : <iframe src={src} title={`${player.name} — ${title}`} className="player-iframe"
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      onLoad={() => { setDocumentLoaded(true); setProblem(""); }}
      onError={() => setProblem("Не удалось загрузить окно Vibix. Можно выбрать другой плеер.")} />)}
    {(invalid || problem || !documentLoaded) && <div role="status" aria-live="polite"
      style={{ position: "absolute", bottom: 8, left: 12, right: 12, pointerEvents: "none", background: "rgba(0,0,0,.8)", padding: 8, borderRadius: 8, fontSize: 13 }}>
      {invalid ? "Некорректная конфигурация Vibix." : problem || "Загрузка окна Vibix…"}
    </div>}
  </div>;
}
