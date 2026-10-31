// The official Vibix/Rendex SDKs run with first-party privileges on movie pages. After SPA navigation they stay in
// the document (removing tags cannot undo executed JavaScript), so sensitive routes must start a fresh document.
const PLAYER_SDK_HOST = "graphicslab.io";
const PLAYER_SDK_GLOBALS = ["RendexSDK", "GlareGraphics", "__RENDEX_SDK_V2_LOADED__"];
const RELOAD_LOOP_WINDOW_MS = 10_000;

type SdkWindow = { document: { scripts: ArrayLike<{ src: string }> } };

export function hasThirdPartyPlayerSdk(win: SdkWindow = window): boolean {
  if (PLAYER_SDK_GLOBALS.some((name) => name in win)) return true;
  return Array.from(win.document.scripts).some(({ src }) => {
    try {
      const { hostname } = new URL(src);
      return hostname === PLAYER_SDK_HOST || hostname.endsWith(`.${PLAYER_SDK_HOST}`);
    } catch {
      return false;
    }
  });
}

export type CleanDocumentReload = { path: string; at: number };

// A loop is only a document produced by our own reload that is contaminated before it ever rendered clean
// (freshFromReload); it fails closed. Any later SPA contamination, e.g. quick Back/Forward, reloads again.
export function cleanDocumentAction(
  contaminated: boolean, path: string, lastReload: CleanDocumentReload | null, now: number, freshFromReload: boolean,
): "render" | "reload" | "blocked" {
  if (!contaminated) return "render";
  return freshFromReload && lastReload?.path === path && now - lastReload.at < RELOAD_LOOP_WINDOW_MS
    ? "blocked" : "reload";
}
