import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";

// Admin Rating + Poster production release (Build ID YOphvyhUVH9GVGz2tSdZF) this change is built on.
const BASE = "14f1dffbed70df2ace849f20fbd276041fa12886";
const APP_FILES = [
  "docs/DESIGN_SYSTEM.md",
  "scripts/profile-ui2.test.mjs",
  "src/app/HomeClient.tsx",
  "src/app/catalog/[category]/CatalogPageClient.tsx",
  "src/app/collections/[slug]/page.tsx",
  "src/app/collections/collectionStyles.ts",
  "src/app/collections/page.tsx",
  "src/app/components/MobileBottomNav.tsx",
  "src/app/components/ui/Dialog.tsx",
  "src/app/components/ui/EmptyState.tsx",
  "src/app/components/ui/MediaCard.tsx",
  "src/app/components/ui/MovieInfoDialog.tsx",
  "src/app/components/ui/posterFallback.ts",
  "src/app/globals.css",
  "src/app/lib/kinolumaSupabase.ts",
  "src/app/profile/page.tsx",
  "src/app/profile/profile.css",
  "src/app/styles/tokens.css",
  "src/app/styles/ui.css",
];
const CI_FILES = [".github/ci/verify-ui2-source.mjs", ".github/workflows/ui2-linux-ci.yml"];
// Players, genre routing, admin rating/poster, data, schema and earlier release contracts stay byte-identical.
const UNCHANGED = [
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "src/app/components/VibixPlayer.tsx",
  "src/app/components/PlayerFrameGuard.tsx",
  "src/app/components/CleanDocumentGuard.tsx",
  "src/app/components/PosterImage.tsx",
  "src/app/profile/layout.tsx",
  // Movie page, root layout and loaders stay exactly as in production.
  "src/app/movie/[slug]/MoviePageClient.tsx",
  "src/app/movie/[slug]/loading.tsx",
  "src/app/layout.tsx",
  "src/app/loading.tsx",
  "src/app/profile/loading.tsx",
  "src/app/lib/adminPlayers.ts",
  "src/app/lib/players.ts",
  "src/app/lib/vibix.ts",
  "src/app/lib/vibixPolicy.ts",
  "src/app/lib/useVibixLookup.ts",
  "src/app/lib/playerFrameProbe.ts",
  "src/app/lib/thirdPartySdk.ts",
  "src/app/lib/supabase.ts",
  "src/app/lib/home/homeCatalogRoutes.ts",
  "src/app/lib/movies/movieOverrides.ts",
  "src/app/lib/movies/rating.ts",
  "src/app/api/admin/movies/[slug]/override/route.ts",
  "src/app/admin/movies/[slug]/edit/MovieAdminEditForm.tsx",
  "supabase/migrations/20261111160000_atomic_movie_override_patch.sql",
  ".github/workflows/admin-rating-poster-linux-ci.yml",
  ".github/workflows/genre-navigation-linux-ci.yml",
  ".github/workflows/vibix-linux-release.yml",
];
const UNCHANGED_PREFIXES = ["src/app/data/", "src/app/api/", "src/app/admin/", "supabase/", "src/app/lib/movies/", "src/app/lib/import/"];
// Player wiring inside the movie page must be untouched by the redesign.
const PLAYER_LINE = /VibixPlayer|PlayerFrameGuard|useVibixLookup|selectedPlayer|mergePlayerOptions|isVibixPlayer|frameNotice|player-tab|playerSelection|data-player-on-screen|mobile-back-to-top/;

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const changedFiles = () => git("diff", "--name-only", BASE, "--").split("\n").filter(Boolean);

function sourceGate(reportPath) {
  git("merge-base", "--is-ancestor", BASE, "HEAD");
  const changed = changedFiles();
  for (const file of changed) {
    assert.ok([...APP_FILES, ...CI_FILES].includes(file), "Out-of-scope file changed: " + file);
    assert.ok(!UNCHANGED.includes(file) && !UNCHANGED_PREFIXES.some((prefix) => file.startsWith(prefix)), "Protected file changed: " + file);
  }
  const unchangedBlobs = {};
  for (const file of UNCHANGED) {
    unchangedBlobs[file] = git("rev-parse", "HEAD:" + file).trim();
    assert.equal(unchangedBlobs[file], git("rev-parse", BASE + ":" + file).trim(), "Blob differs from base: " + file);
  }
  const movie = "src/app/movie/[slug]/MoviePageClient.tsx";
  const playerLines = (source) => source.split(/\r?\n/).filter((line) => PLAYER_LINE.test(line)).join("\n");
  assert.equal(playerLines(readFileSync(movie, "utf8")), playerLines(git("show", BASE + ":" + movie)), "Player wiring changed in " + movie);
  assert.ok(!changed.some((file) => file.endsWith(".sql")), "SQL must not change");
  if (reportPath) {
    writeFileSync(reportPath, JSON.stringify({
      schemaVersion: 1, releaseName: "kinoluma-ui2-linux-candidate",
      baseCommit: BASE, releaseCommit: git("rev-parse", "HEAD").trim(), changedFiles: changed,
      changedAppFilesCount: changed.filter((file) => APP_FILES.includes(file)).length,
      trackedDiffSha256: createHash("sha256").update(execFileSync("git", ["diff", "--binary", BASE, "HEAD"], { maxBuffer: 64 * 1024 * 1024 })).digest("hex"),
      unchangedBlobs,
      // Field names follow write-release-manifest.mjs; catalog evidence is inherited because src/app/data is unchanged.
      batchB: { totalImageMutations: 481, inheritedUnchangedFrom: BASE },
      manualOverrides: { preserved: 9, note: "Inherited source evidence; DB not queried" },
      credits: { inheritedFrom: BASE },
      the100: { slug: "the-100-2014", inheritedUnchangedFrom: BASE },
      visualParityEvidence: {
        desktop: "REDESIGN",
        mobile: "REDESIGN",
        note: "UI 2.0 intentionally changes visuals; reviewed by local browser QA at 320-1440px, not by CI screenshots.",
      },
      migrations: { added: 0, note: "UI-only change; Supabase schema untouched" },
      errors: [], pass: true,
    }, null, 2) + "\n");
  }
  console.log("UI2_SOURCE=PASS base=" + BASE + " changed=" + changed.length);
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function artifactGate(directory) {
  const root = realpathSync(directory);
  for (const file of walk(root)) {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    assert.ok(!/(^|\/)(\.env(?:\..*)?|\.qa-tmp|\.deploy-temp|\.claude|\.playwright-mcp)(\/|$)/.test(relative), "Forbidden artifact config: " + relative);
    assert.ok(!/^(?:scripts|src|docs|\.github)\//.test(relative), "Source/test files in artifact: " + relative);
    assert.ok(realpathSync(file).startsWith(root + path.sep), "Escaping artifact symlink: " + relative);
    if (!lstatSync(file).isSymbolicLink() && /\.(?:js|json|html|rsc)$/.test(file) && !relative.startsWith("node_modules/")) {
      assert.ok(!/ci-placeholder|local-qa-placeholder|local-qa-anon-key|127\.0\.0\.1:5432\d/.test(readFileSync(file, "utf8")), "Placeholder build config in artifact: " + relative);
    }
  }
  const staticFiles = walk(path.join(root, ".next/static"));
  const client = staticFiles.filter((file) => file.endsWith(".js")).map((file) => readFileSync(file, "utf8")).join("\n");
  const css = staticFiles.filter((file) => file.endsWith(".css")).map((file) => readFileSync(file, "utf8")).join("\n");
  assert.ok(!/SUPABASE_SERVICE_ROLE_KEY|TMDB_API_KEY|TMDB_ACCESS_TOKEN|VIBIX_API_TOKEN|EXIIM_API_TOKEN|RENDEX_API_TOKEN|KINOPOISK_API_KEY|KINOPOISK_DEV_TOKEN|sb_secret_/.test(client), "Privileged client marker");
  assert.ok(client.includes("678053396"), "VibixPlayer publisher missing from client bundle");
  for (const marker of ["--kl-bg", ".kl-panel", ".kl-dialog", ".kl-card"]) assert.ok(css.includes(marker), "UI 2.0 CSS marker missing: " + marker);
  assert.ok(readFileSync(path.join(root, ".next/BUILD_ID"), "utf8").trim());
  assert.ok(readFileSync(path.join(root, "server.js"), "utf8").includes("next"));
  console.log("STANDALONE_UI2_PAYLOAD=PASS");
}

async function lintGate() {
  const { ESLint } = await import("eslint");
  const eslint = new ESLint();
  const baseFiles = new Set(git("ls-tree", "-r", "--name-only", BASE).split("\n"));
  let inherited = 0;
  for (const file of changedFiles().filter((name) => /\.(?:ts|tsx|mjs)$/.test(name))) {
    const [current] = await eslint.lintText(readFileSync(file, "utf8"), { filePath: file });
    const before = baseFiles.has(file)
      ? (await eslint.lintText(git("show", BASE + ":" + file), { filePath: file }))[0].messages : [];
    // Lines move; rule/severity/message/node and multiplicity must not increase.
    const key = ({ ruleId, severity, message, nodeType }) => JSON.stringify({
      ruleId, severity, nodeType,
      message: message.replace(/:\d+:\d+(?=\n)/g, ":LINE:COL").replace(/\(at line \d+\)/g, "(at line LINE)")
        .replace(/^[ >]*\d+ \|/gm, "|").replace(/^\s*\|/gm, "|"),
    });
    const available = before.map(key);
    for (const diagnostic of current.messages) {
      const index = available.indexOf(key(diagnostic));
      assert.ok(index >= 0, "New ESLint diagnostic: " + file + ":" + diagnostic.line + " " + diagnostic.ruleId);
      available.splice(index, 1);
      inherited++;
    }
  }
  console.log("SCOPED_ESLINT=PASS new=0 inherited=" + inherited);
}

async function runtimeGate(origin) {
  const url = new URL(origin);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname), "Runtime QA must use a loopback server");
  const fetchManual = (page) => fetch(new URL(page, url), { redirect: "manual", signal: AbortSignal.timeout(60000) });
  for (const page of ["/", "/profile", "/movie/the-100-2014", "/movie/rik-i-morti-2013", "/catalog/films", "/catalog/series", "/collections", "/?type=series&genre=drama", "/sitemap.xml", "/robots.txt"]) {
    assert.equal((await fetchManual(page)).status, 200, page);
  }
  assert.equal((await fetchManual("/api/player/vibix")).status, 400, "/api/player/vibix without an id");
  assert.equal((await fetchManual("/definitely-missing-route")).status, 404);
  // Legacy genre paths still redirect into the query contract.
  const legacy = await fetchManual("/boevik/page/2");
  assert.ok([301, 307, 308].includes(legacy.status), "legacy redirect status " + legacy.status);
  assert.match(legacy.headers.get("location") ?? "", /\?genre=boevik&type=all&page=2$/);

  // Existing pages keep their production headers; no second header design is rendered.
  for (const [page, header] of [["/catalog/films", "catalog-header"], ["/collections", "collections-header"], ["/movie/the-100-2014", "topbar"]]) {
    const html = await (await fetchManual(page)).text();
    assert.match(html, new RegExp(`<header class="${header}"`), page + " renders the production header");
    assert.ok(!html.includes("kl-header"), page + " must not render the UI 2.0 header");
  }
  const series = await (await fetchManual("/movie/the-100-2014")).text();
  assert.match(series, /id="player"/, "movie page keeps the player section");

  for (const page of ["/admin/import", "/admin/movies/the-100-2014/edit"]) {
    const status = (await fetchManual(page)).status;
    assert.ok(status < 500, `${page} -> ${status}`);
  }
  const json = { "content-type": "application/json" };
  for (const [method, route, body] of [
    ["PUT", "/api/admin/movies/the-100-2014/override", { rating: 1, poster: "/x.svg" }],
    ["DELETE", "/api/admin/movies/the-100-2014/override", undefined],
  ]) {
    const response = await fetch(new URL(route, url), {
      method, headers: json, body: body && JSON.stringify(body), redirect: "manual", signal: AbortSignal.timeout(60000),
    });
    assert.ok([401, 403].includes(response.status), `${method} ${route} anonymous -> ${response.status}`);
  }
  console.log("UI2_RUNTIME=PASS");
}

const [mode, arg] = process.argv.slice(2);
if (mode === "source") sourceGate(arg);
else if (mode === "artifact") artifactGate(arg);
else if (mode === "lint") await lintGate();
else if (mode === "runtime") await runtimeGate(arg);
else throw new Error("Usage: node verify-ui2-source.mjs source [report.json] | lint | artifact <dir> | runtime <origin>");
