"use client";

import { type ReactNode, useEffect, useSyncExternalStore } from "react";

import { type CleanDocumentReload, cleanDocumentAction, hasThirdPartyPlayerSdk } from "../lib/thirdPartySdk";

const RELOAD_KEY = "kinoluma-clean-document-reload";
const subscribe = () => () => {};
const currentPath = () => window.location.pathname + window.location.search;
// Per document: set once a guarded route rendered clean, so later SPA contamination is never mistaken for a loop.
let renderedCleanInDocument = false;

function readLastReload(): CleanDocumentReload | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(RELOAD_KEY) || "null") as Partial<CleanDocumentReload> | null;
    return typeof value?.path === "string" && typeof value.at === "number" ? { path: value.path, at: value.at } : null;
  } catch {
    return null;
  }
}

function freshFromReload() {
  const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  return !renderedCleanInDocument && entry?.type === "reload";
}

const clientAction = () =>
  cleanDocumentAction(hasThirdPartyPlayerSdk(), currentPath(), readLastReload(), Date.now(), freshFromReload());

// Sensitive routes reached by SPA navigation (links, router.push, Back/Forward) from a movie page would render in a
// document where the player SDK already ran. Never mount them there: reload into a fresh document instead.
export default function CleanDocumentGuard({ children }: { children: ReactNode }) {
  // Server render and hydration describe a freshly loaded document, which never ran the movie-only SDK.
  const action = useSyncExternalStore(subscribe, clientAction, () => "render" as const);

  useEffect(() => {
    if (action === "render") {
      // Hydration renders before the client re-check; only a really clean document counts.
      if (!hasThirdPartyPlayerSdk()) renderedCleanInDocument = true;
      return;
    }
    if (action === "blocked") return;
    try {
      sessionStorage.setItem(RELOAD_KEY, JSON.stringify({ path: currentPath(), at: Date.now() }));
    } catch {
      // Without storage the reload still yields a clean document; loop detection is best-effort.
    }
    window.location.reload();
  }, [action]);

  if (action === "render") return <>{children}</>;

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white">
      <div role="status" className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur">
        <h1 className="text-2xl font-black tracking-tight">
          {action === "blocked" ? "Не удалось открыть страницу безопасно" : "Открываю страницу…"}
        </h1>
        {action === "blocked" && (
          <p className="mt-3 text-sm text-white/55">
            Закрой вкладку и открой страницу заново в новой вкладке.
          </p>
        )}
      </div>
    </main>
  );
}
