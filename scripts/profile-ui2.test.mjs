// UI 2.0 profile contract: auth + collections data layer, shared UI markup, profile isolation.
// Runs offline: Supabase is an in-memory stub behind globalThis.fetch.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { test } from "node:test";
import { requireLocal } from "./episode-guides/register-local.mjs";

const forbidden = () => {
  throw new Error("NETWORK_FORBIDDEN");
};
http.request = http.get = https.request = https.get = forbidden;

const SUPABASE_URL = "http://supabase.test";
const USER = { id: "00000000-0000-4000-8000-0000000000aa", email: "viewer@kinoluma.test", password: "local-test-pass", name: "Тестовый Зритель" };

// --- In-memory Supabase (auth + user_movie_actions) -------------------------------------------
const db = { rows: [], failWrites: false, tokens: new Set() };

function json(status, body) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function userJson() {
  return {
    id: USER.id, aud: "authenticated", role: "authenticated", email: USER.email,
    user_metadata: { name: USER.name }, app_metadata: { provider: "email" },
    created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
  };
}

function eqFilters(url) {
  return [...url.searchParams].filter(([, value]) => value.startsWith("eq.")).map(([key, value]) => [key, value.slice(3)]);
}

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  if (url.origin !== SUPABASE_URL) return forbidden();
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  const authed = db.tokens.has((headers.get("authorization") || "").replace(/^Bearer\s+/i, ""));
  const body = init.body ? JSON.parse(init.body) : {};

  if (url.pathname === "/auth/v1/token") {
    if (body.email !== USER.email || body.password !== USER.password) {
      return json(400, { error: "invalid_grant", error_description: "Invalid login credentials", msg: "Invalid login credentials" });
    }
    const token = `t-${db.tokens.size + 1}`;
    db.tokens.add(token);
    return json(200, { access_token: token, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `r-${token}`, user: userJson() });
  }
  if (url.pathname === "/auth/v1/user") return authed ? json(200, userJson()) : json(401, { msg: "invalid JWT" });
  if (url.pathname === "/auth/v1/logout") {
    db.tokens.clear();
    return json(204);
  }

  if (url.pathname === "/rest/v1/user_movie_actions") {
    if (!authed) return json(401, { message: "JWT expired" });
    const filters = eqFilters(url);
    const matches = (row) => filters.every(([key, value]) => String(row[key]) === value);
    if (method === "GET") return json(200, db.rows.filter(matches).map(({ movie_id, action }) => ({ movie_id, action })));
    if (db.failWrites) return json(503, { message: "write rejected" });
    if (method === "POST") {
      for (const row of Array.isArray(body) ? body : [body]) {
        if (row.user_id !== USER.id) return json(403, { message: "RLS" });
        if (!db.rows.some((r) => r.movie_id === row.movie_id && r.action === row.action)) db.rows.push(row);
      }
      return json(201);
    }
    if (method === "DELETE") {
      db.rows = db.rows.filter((row) => !matches(row));
      return json(204);
    }
  }
  return json(404, { message: "not stubbed" });
};

process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

const ts = requireLocal("typescript");
const originalTsLoader = requireLocal.extensions[".ts"];
const compileTsx = (module, filename) => {
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText,
    filename,
  );
};
requireLocal.extensions[".tsx"] = compileTsx;
requireLocal.extensions[".ts"] = (module, filename) =>
  filename.includes(`${"components"}`) ? compileTsx(module, filename) : originalTsLoader(module, filename);

const supabaseModule = requireLocal("../../src/app/lib/supabase.ts");
const actions = requireLocal("../../src/app/lib/kinolumaSupabase.ts");
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// --- Auth + collections ---------------------------------------------------------------------------

test("signed-out viewers cannot write and get empty collections", async () => {
  assert.equal(await actions.getCurrentSupabaseUser(), null);
  assert.deepEqual(await actions.loadMovieActions(), actions.emptyMovieActionState);
  assert.equal(await actions.syncMovieAction(1, "liked", true), false);
  assert.equal(await actions.clearMovieActions(), false);
  assert.equal(db.rows.length, 0);
});

test("wrong password is rejected by Supabase Auth", async () => {
  const { error } = await supabaseModule.supabase.auth.signInWithPassword({ email: USER.email, password: "wrong-pass" });
  assert.ok(error);
  assert.equal(await actions.getCurrentSupabaseUser(), null);
});

test("sign-in maps the display name from user metadata", async () => {
  const { data, error } = await supabaseModule.supabase.auth.signInWithPassword({ email: USER.email, password: USER.password });
  assert.equal(error, null);
  assert.deepEqual(actions.mapSupabaseUser(data.user), { id: USER.id, name: USER.name, email: USER.email });
});

test("all four existing collections round-trip, including «Смотрю»", async () => {
  for (const [movieId, action] of [[24, "watch_later"], [3, "watch_later"], [20, "liked"], [28, "disliked"], [1, "watching"]]) {
    assert.equal(await actions.syncMovieAction(movieId, action, true), true);
  }
  // Re-enabling is idempotent (upsert on user_id,movie_id,action).
  assert.equal(await actions.syncMovieAction(24, "watch_later", true), true);

  assert.deepEqual(await actions.loadMovieActions(), {
    watchLaterIds: [24, 3],
    likedItemIds: [20],
    dislikedItemIds: [28],
    watchingItemIds: [1],
  });
});

test("removal deletes only the targeted row", async () => {
  assert.equal(await actions.syncMovieAction(3, "watch_later", false), true);
  const state = await actions.loadMovieActions();
  assert.deepEqual(state.watchLaterIds, [24]);
  assert.deepEqual(state.likedItemIds, [20]);
});

test("a rejected write reports failure so the profile rolls back", async () => {
  db.failWrites = true;
  try {
    assert.equal(await actions.syncMovieAction(21, "liked", true), false);
    assert.equal(await actions.syncMovieAction(20, "liked", false), false);
    assert.equal(await actions.clearMovieActions(), false);
  } finally {
    db.failWrites = false;
  }
  assert.deepEqual((await actions.loadMovieActions()).likedItemIds, [20]);
});

test("clearing removes every collection for the signed-in user only", async () => {
  db.rows.push({ user_id: "someone-else", movie_id: 5, action: "liked" });
  assert.equal(await actions.clearMovieActions(), true);
  assert.deepEqual(await actions.loadMovieActions(), actions.emptyMovieActionState);
  assert.deepEqual(db.rows, [{ user_id: "someone-else", movie_id: 5, action: "liked" }]);
});

// --- Profile page contract ------------------------------------------------------------------------

test("profile keeps the localStorage keys shared with the movie page", () => {
  const profile = read("src/app/profile/page.tsx");
  const moviePage = read("src/app/movie/[slug]/MoviePageClient.tsx");
  for (const key of ["kinoluma-watching-items", "kinoluma-watch-later", "kinoluma-liked-items", "kinoluma-disliked-items"]) {
    assert.ok(profile.includes(`"${key}"`), `profile misses ${key}`);
    assert.ok(moviePage.includes(`"${key}"`), `movie page misses ${key}`);
  }
});

test("profile stays isolated from the player SDK and inside CleanDocumentGuard", () => {
  const profile = read("src/app/profile/page.tsx");
  for (const forbiddenImport of ["VibixPlayer", "next/script", "PlayerFrameGuard", "thirdPartySdk"]) {
    assert.ok(!profile.includes(forbiddenImport), `profile must not import ${forbiddenImport}`);
  }
  assert.match(read("src/app/profile/layout.tsx"), /<CleanDocumentGuard>\{children\}<\/CleanDocumentGuard>/);
});

test("profile tabs and admin check keep their existing contracts", () => {
  const profile = read("src/app/profile/page.tsx");
  assert.match(profile, /new URLSearchParams\(window\.location\.search\)\.get\("tab"\)/);
  assert.match(profile, /fetch\("\/api\/admin\/me"/);
  assert.match(profile, /supabase\.auth\.signInWithPassword/);
  assert.match(profile, /supabase\.auth\.signUp/);
});

// --- Shared UI markup -----------------------------------------------------------------------------

const React = requireLocal("react");
const { renderToStaticMarkup } = requireLocal("react-dom/server");

test("existing pages keep their production headers and the catalog genre fix", () => {
  const moviePage = read("src/app/movie/[slug]/MoviePageClient.tsx");
  const catalog = read("src/app/catalog/[category]/CatalogPageClient.tsx");
  assert.match(moviePage, /<header className="topbar">/);
  assert.match(moviePage, /querySelector<HTMLElement>\(".topbar"\)/);
  assert.match(catalog, /<header className="catalog-header">/);
  for (const file of ["src/app/collections/page.tsx", "src/app/collections/[slug]/page.tsx"]) {
    assert.match(read(file), /<header className="collections-header">/, file);
  }
  for (const file of ["src/app/movie/[slug]/MoviePageClient.tsx", "src/app/catalog/[category]/CatalogPageClient.tsx", "src/app/profile/page.tsx"]) {
    assert.ok(!read(file).includes("SiteHeader"), file + " must not use a second header design");
  }
  // "Боевик" and "боевик" collapse into one chip and filter case-insensitively.
  assert.match(catalog, /byKey\.set\(key, genre\)/);
  assert.match(catalog, /genre\.toLowerCase\(\) === selectedGenre\.toLowerCase\(\)/);
});

test("media card keeps long titles readable and labels the poster action", () => {
  const { default: MediaCard } = requireLocal("../../src/app/components/ui/MediaCard.tsx");
  const title = "Леди Баг и Супер-Кот из Альтернативной Вселенной: Приключения в Париже";
  const item = { id: 1, slug: "miraculous-world-paris-2023", title, originalTitle: "", year: "2023", type: "Мультфильм", rating: 8.5, poster: "" };
  const html = renderToStaticMarkup(React.createElement(MediaCard, { item, onOpen: () => {} }));
  assert.match(html, new RegExp(`<h3 class="kl-card-title" title="${title}">`));
  assert.match(html, /aria-label="Подробнее: Леди Баг[^"]*, 2023 · Мультфильм, рейтинг 8\.5"/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /href="\/movie\/miraculous-world-paris-2023"/);
  // Home rail card: content type pill on the poster, "year · ★ rating" under the title.
  assert.match(html, /<span class="kl-card-type" aria-hidden="true">Мультфильм<\/span>/);
  assert.match(html, /<span class="kl-card-rating">★ 8\.5<\/span>/);
  // Missing poster falls back to a generated SVG instead of an empty image.
  assert.match(html, /src="data:image\/svg\+xml/);
});

test("poster fallback wraps long titles and escapes markup", () => {
  const { getPosterFallback } = requireLocal("../../src/app/components/ui/posterFallback.ts");
  const svg = decodeURIComponent(getPosterFallback("Очень длинное название фильма, которое точно не поместится <b>в одну</b> строку постера", "", "Фильм").split(",")[1]);
  const lines = svg.match(/font-size="36"/g) ?? [];
  assert.ok(lines.length >= 2 && lines.length <= 4, `expected 2-4 title lines, got ${lines.length}`);
  assert.ok(!svg.includes("<b>"));
  assert.ok(svg.includes("&lt;b&gt;"));
});

test("dialog markup provides one overlay, modal semantics and Escape handling", () => {
  const dialog = read("src/app/components/ui/Dialog.tsx");
  assert.equal((dialog.match(/className="kl-dialog-backdrop"/g) ?? []).length, 1);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /event\.key === "Escape"/);
  assert.match(dialog, /body\.style\.overflow = "hidden"/);
  assert.match(dialog, /previouslyFocused\?\.focus/);
  const info = read("src/app/components/ui/MovieInfoDialog.tsx");
  // The trailer iframe exists only after an explicit click and sits in a 16:9 frame.
  assert.match(info, /trailer\.status === "ready" \?/);
  assert.match(info, /className="kl-info-trailer-frame"/);
  assert.match(read("src/app/styles/ui.css"), /\.kl-info-trailer-frame \{[^}]*aspect-ratio: 16 \/ 9;/);
});
