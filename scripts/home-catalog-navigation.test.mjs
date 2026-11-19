import assert from "node:assert/strict";
import test from "node:test";
import * as routes from "../src/app/lib/home/homeCatalogRoutes.ts";

const cases = [
  ["Все", 1, "Все", "/"],
  ["Драма", 1, "Все", "/?genre=drama&type=all"],
  ["Драма", 1, "Фильм", "/?genre=drama&type=film"],
  ["Драма", 2, "Сериал", "/?genre=drama&type=series&page=2"],
  ["Все", 1, "Сериал", "/?type=series"],
  ["Все", 2, "Все", "/?type=all&page=2"],
];

for (const [genre, page, type, path] of cases) {
  test(`URL contract and reload state: ${path}`, () => {
    assert.equal(routes.getHomeCatalogPathWithType(genre, page, type), path);
    assert.deepEqual(routes.parseHomeCatalogSearch(new URL(path, "http://localhost").search), { genre, page, type });
  });
}

test("every genre and content type round-trips, including mixed content", () => {
  for (const genre of ["Все", ...routes.homeGenreRoutes.map(item => item.genre)]) {
    for (const type of ["Все", ...routes.homeTypeRoutes.map(item => item.type)]) {
      const path = routes.getHomeCatalogPathWithType(genre, 2, type);
      assert.equal(new URL(path, "http://localhost").pathname, "/");
      assert.deepEqual(routes.parseHomeCatalogSearch(new URL(path, "http://localhost").search), { genre, type, page: 2 });
    }
  }
});

test("legacy two-argument formatter also uses the root query contract", () => {
  assert.equal(routes.getHomeCatalogPath("Комедия", 2), "/?genre=comedy&type=all&page=2");
});

test("all existing aliases parse and serialize to the existing primary slugs", () => {
  for (const item of routes.homeGenreRoutes) {
    for (const alias of [item.slug, ...(item.aliases ?? [])]) {
      const state = routes.parseHomeCatalogSearch(`?genre=${alias.toUpperCase()}&type=movies&page=02`);
      assert.deepEqual(state, { genre: item.genre, type: "Фильм", page: 2 });
      assert.equal(routes.getHomeCatalogPathWithType(state.genre, state.page, state.type), `/?genre=${item.slug}&type=film&page=2`);
    }
  }
  for (const item of routes.homeTypeRoutes) {
    for (const alias of item.aliases ?? []) assert.equal(routes.parseHomeCatalogSearch(`?type=${alias}`).type, item.type);
  }
});

test("invalid and repeated parameters reset only their own field", () => {
  for (const page of ["", "0", "-1", "1.5", "NaN", "Infinity", "1e2", "9007199254740992", "%ZZ", "2&page=3"]) {
    assert.deepEqual(routes.parseHomeCatalogSearch(`?genre=drama&type=film&page=${page}`), { genre: "Драма", type: "Фильм", page: 1 });
  }
  for (const search of ["?genre=unknown&type=unknown", "?genre=drama&genre=comedy&type=film&type=series", "?genre=%FF&type=%ZZ"]) {
    assert.deepEqual(routes.parseHomeCatalogSearch(search), { genre: "Все", type: "Все", page: 1 });
  }
  assert.deepEqual(routes.parseHomeCatalogSearch("?genre=drama&type=film&type=film&page=2"), { genre: "Драма", type: "Все", page: 2 });
});

test("page one is omitted and non-finite/fractional numeric inputs are safe", () => {
  for (const page of [1, 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(routes.getHomeCatalogPathWithType("Драма", page, "Все"), "/?genre=drama&type=all");
  }
});

test("filter changes and reset preserve unrelated query values and the fragment", () => {
  const location = { search: "?utm_source=test&genre=comedy&page=2&tag=a&tag=b&type=film", hash: "#catalog" };
  const path = routes.getHomeCatalogPathWithType("Драма", 1, "Сериал", location);
  const url = new URL(path, "http://localhost");
  assert.deepEqual(url.searchParams.getAll("tag"), ["a", "b"]);
  assert.equal(url.searchParams.get("utm_source"), "test");
  assert.equal(url.hash, "#catalog");
  assert.deepEqual(routes.parseHomeCatalogSearch(url.search), { genre: "Драма", type: "Сериал", page: 1 });
  const reset = new URL(routes.getHomeCatalogPathWithType("Все", 1, "Все", url), "http://localhost");
  assert.equal(reset.pathname, "/");
  assert.equal(reset.searchParams.has("genre") || reset.searchParams.has("type") || reset.searchParams.has("page"), false);
  assert.equal(reset.hash, "#catalog");
  assert.deepEqual(reset.searchParams.getAll("tag"), ["a", "b"]);
});

test("every agreed type value has one canonical slug and keeps the genre", () => {
  const types = { all: "Все", film: "Фильм", series: "Сериал", anime: "Аниме", cartoon: "Мультфильм" };
  for (const [slug, type] of Object.entries(types)) {
    assert.deepEqual(routes.parseHomeCatalogSearch(`?type=${slug}`), { genre: "Все", type, page: 1 });
    assert.equal(routes.getHomeCatalogPathWithType("Все", 1, type), slug === "all" ? "/" : `/?type=${slug}`);
    assert.equal(routes.getHomeCatalogPathWithType("Драма", 3, type), `/?genre=drama&type=${slug}&page=3`);
  }
});

test("empty, missing and malformed queries fall back to the home page", () => {
  for (const search of ["", "?", "?genre=", "?type=", "?page=", "?genre=&type=&page=", "?foo=bar"]) {
    const state = routes.parseHomeCatalogSearch(search);
    assert.deepEqual(state, { genre: "Все", type: "Все", page: 1 });
    assert.equal(new URL(routes.getHomeCatalogPathWithType(state.genre, state.page, state.type), "http://localhost").pathname, "/");
  }
});

test("built URLs never use the legacy path format and are fixed points", () => {
  for (const genre of ["Все", ...routes.homeGenreRoutes.map(item => item.genre)]) {
    for (const type of ["Все", ...routes.homeTypeRoutes.map(item => item.type)]) {
      for (const page of [1, 2, 17]) {
        const path = routes.getHomeCatalogPathWithType(genre, page, type);
        assert.match(path, /^\/(\?|$)/, path);
        assert.doesNotMatch(path, /\/page\//, path);
        const state = routes.parseHomeCatalogSearch(new URL(path, "http://localhost").search);
        // Rebuilding from the parsed state must be a no-op, so replaceState never loops.
        assert.equal(routes.getHomeCatalogPathWithType(state.genre, state.page, state.type), path);
      }
    }
  }
});

test("a click-through history keeps genre and type on every entry for Back/Forward", () => {
  const steps = [
    ["Драма", 1, "Все", "/?genre=drama&type=all"],
    ["Драма", 1, "Сериал", "/?genre=drama&type=series"],
    ["Драма", 2, "Сериал", "/?genre=drama&type=series&page=2"],
    ["Драма", 3, "Сериал", "/?genre=drama&type=series&page=3"],
    ["Драма", 1, "Фильм", "/?genre=drama&type=film"],
    ["Все", 1, "Фильм", "/?type=film"],
    ["Все", 2, "Все", "/?type=all&page=2"],
    ["Все", 1, "Все", "/"],
  ];
  const entries = ["/"];
  for (const [genre, page, type, expected] of steps) {
    const current = new URL(entries.at(-1), "http://localhost");
    const next = routes.getHomeCatalogPathWithType(genre, page, type, current);
    assert.equal(next, expected);
    entries.push(next);
  }
  // Walking the stack backwards and forwards restores exactly the state that produced each entry.
  for (const [index, [genre, page, type]] of steps.entries()) {
    assert.deepEqual(routes.parseHomeCatalogSearch(new URL(entries[index + 1], "http://localhost").search), { genre, page, type });
  }
});

test("legacy genre paths redirect to the query contract without loops or route clashes", async () => {
  const { match } = (await import("next/dist/compiled/path-to-regexp/index.js")).default;
  const { readdirSync } = await import("node:fs");
  const redirects = routes.getLegacyHomeCatalogRedirects();
  const resolve = (path) => {
    for (const rule of redirects) {
      const result = match(rule.source, { decode: decodeURIComponent })(path);
      if (result) return rule.destination.replace(":page", result.params.page ?? "");
    }
    return null;
  };
  assert.equal(resolve("/drama"), "/?genre=drama&type=all");
  assert.equal(resolve("/comedy"), "/?genre=comedy&type=all");
  assert.equal(resolve("/drama/page/2"), "/?genre=drama&type=all&page=2");
  assert.equal(resolve("/horror/page/4"), "/?genre=scary&type=all&page=4");
  assert.equal(resolve("/page/3"), "/?type=all&page=3");
  // The old nav linked these for the content type, not the genre.
  assert.equal(resolve("/anime"), "/?type=anime");
  assert.equal(resolve("/cartoon"), "/?type=cartoon");
  assert.equal(resolve("/cartoons/page/2"), "/?type=cartoon&page=2");
  for (const path of ["/", "/drama/page/x", "/drama/extra", "/movie/drama", "/catalog/films", "/unknown"]) {
    assert.equal(resolve(path), null, path);
  }
  for (const rule of redirects) {
    assert.equal(rule.permanent, false);
    assert.equal(resolve(new URL(rule.destination.replace(":page", "2"), "http://localhost").pathname), null, rule.destination);
  }
  for (const entry of readdirSync(new URL("../src/app", import.meta.url), { withFileTypes: true })) {
    if (entry.isDirectory()) assert.equal(resolve(`/${entry.name}`), null, `redirect shadows /${entry.name}`);
  }
  for (const entry of readdirSync(new URL("../public", import.meta.url))) {
    assert.equal(resolve(`/${entry}`), null, `redirect shadows /${entry}`);
  }
});

test("home client syncs from committed search params and links use the contract", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../src/app/HomeClient.tsx", import.meta.url), "utf8");
  assert.match(source, /<Suspense fallback=\{null\}>\s*<HomeCatalogLocationSync onSearchChange=\{restoreCatalogLocation\} \/>\s*<\/Suspense>/);
  // A [content]-driven restore read the old window.location during soft navigations and reverted them.
  assert.doesNotMatch(source, /addEventListener\("popstate", restoreCatalogLocation\)/);
  assert.doesNotMatch(source, /href="\/"\s+className="text-left[^"]*"\s+draggable=\{false\}\s*>\s*(Фильмы|Сериалы)/);
  assert.match(source, /href=\{getHomeCatalogPathWithType\("Все", 1, "Фильм"\)\}/);
  assert.match(source, /href=\{getHomeCatalogPathWithType\("Все", 1, "Сериал"\)\}/);
  // /anime and /cartoon only exist as legacy redirects; the nav links the content type directly.
  assert.match(source, /href=\{getHomeCatalogPathWithType\("Все", 1, "Аниме"\)\}/);
  assert.match(source, /href=\{getHomeCatalogPathWithType\("Все", 1, "Мультфильм"\)\}/);
  assert.doesNotMatch(source, /href="\/(anime|cartoon|drama|comedy)"/);
});

// Optional runtime check against a local server: KINOLUMA_HOME_QA_ORIGIN=http://127.0.0.1:<port>
const qaOrigin = process.env.KINOLUMA_HOME_QA_ORIGIN;
test("agreed routes answer 200 and legacy paths redirect on a running server", { skip: !qaOrigin }, async () => {
  const origin = new URL(qaOrigin);
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname), "QA must use a loopback server");
  const fetchManual = (path) => fetch(new URL(path, origin), { redirect: "manual", signal: AbortSignal.timeout(60000) });
  for (const path of ["/", "/?genre=drama&type=all", "/?genre=drama&type=film", "/?genre=drama&type=series", "/?genre=drama&type=series&page=2", "/?type=series", "/?type=all&page=2", "/?type=anime", "/?type=cartoon", "/?genre=bogus&type=bogus&page=-1"]) {
    const response = await fetchManual(path);
    assert.equal(response.status, 200, path);
  }
  for (const [path, location] of [["/drama", "/?genre=drama&type=all"], ["/comedy", "/?genre=comedy&type=all"], ["/drama/page/2", "/?genre=drama&type=all&page=2"], ["/page/2", "/?type=all&page=2"], ["/anime", "/?type=anime"], ["/cartoon", "/?type=cartoon"]]) {
    const response = await fetchManual(path);
    assert.equal(response.status, 307, path);
    assert.equal(response.headers.get("location"), location, path);
    assert.equal((await fetchManual(location)).status, 200, location);
  }
});

test("home-to-home links bypass the router's stale canonical URL", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../src/app/HomeClient.tsx", import.meta.url), "utf8");
  const sync = source.slice(source.indexOf("function HomeCatalogLocationSync"), source.indexOf("function getGenresForType"));
  assert.match(sync, /window\.addEventListener\("click", handleHomeLinkClick, true\)/);
  assert.match(sync, /url\.pathname !== "\/"/);
  assert.match(sync, /url\.search === window\.location\.search/);
  assert.match(sync, /event\.preventDefault\(\);\s*window\.history\.pushState\(null, "", url\.pathname \+ url\.search \+ url\.hash\)/);
});
