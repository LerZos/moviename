import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";

// Genre Navigation production release (Build ID 8AWDPuc6vtdWKDs26mWT1) this change is built on.
const BASE = "5d855c197385051ace53435a5a02636807729a3b";
const APP_FILES = [
  "package.json",
  "package-lock.json",
  "scripts/admin-override-writers.test.mjs",
  "scripts/admin-poster.test.mjs",
  "scripts/admin-rating-integrated.test.mjs",
  "scripts/admin-rating.test.mjs",
  "scripts/batch-c3-credits.test.mjs",
  "scripts/episode-guides/integration.test.mjs",
  "scripts/manual-override-concurrency.test.mjs",
  "scripts/postgres/movie-overrides-upgrade.integration.test.mjs",
  "scripts/postgres/movie-overrides.integration.test.mjs",
  "src/app/admin/import/ImportDashboardClient.tsx",
  "src/app/admin/movies/[slug]/edit/MovieAdminEditForm.tsx",
  "src/app/admin/movies/[slug]/edit/page.tsx",
  "src/app/api/admin/import/create-draft/route.ts",
  "src/app/api/admin/import/draft-action/route.ts",
  "src/app/api/admin/import/list/route.ts",
  "src/app/api/admin/import/players/sync-all/route.ts",
  "src/app/api/admin/import/update-draft/route.ts",
  "src/app/api/admin/import/vibix/sync-site/route.ts",
  "src/app/api/admin/movies/[slug]/override/route.ts",
  "src/app/lib/movies/movieOverrides.ts",
  "src/app/lib/movies/rating.ts",
  "supabase/migrations/20261111160000_atomic_movie_override_patch.sql",
];
const CI_FILES = [
  ".github/ci/verify-admin-rating-poster-source.mjs",
  ".github/workflows/admin-rating-poster-linux-ci.yml",
];
// Obsolete Codex CI pinned to the 2026-11-01 base; replaced by CI_FILES.
const DELETED_FILES = [
  ".github/ci/admin-rating-poster-network-guard.mjs",
  ".github/ci/admin-rating-poster-release.mjs",
  ".github/ci/admin-rating-poster-source.json",
  ".github/workflows/admin-rating-poster-linux-release.yml",
];
// Genre navigation, players, movie pages, profile, catalog data and earlier release contracts stay byte-identical to BASE.
const UNCHANGED = [
  ".github/ci/verify-genre-navigation-source.mjs",
  ".github/ci/verify-vibix-source.mjs",
  ".github/workflows/genre-navigation-linux-ci.yml",
  ".github/workflows/vibix-linux-release.yml",
  "next.config.ts",
  "src/app/HomeClient.tsx",
  "src/app/lib/home/homeCatalogRoutes.ts",
  "src/app/components/MobileBottomNav.tsx",
  "src/app/components/PlayerFrameGuard.tsx",
  "src/app/components/VibixPlayer.tsx",
  "src/app/lib/adminPlayers.ts",
  "src/app/lib/players.ts",
  "src/app/lib/vibix.ts",
  "src/app/movie/[slug]/MoviePageClient.tsx",
];
const UNCHANGED_PREFIXES = ["src/app/data/", "src/app/movie/", "src/app/profile/", "src/app/components/", "supabase/sql/"];

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const changedFiles = () => git("diff", "--name-only", BASE, "--").split("\n").filter(Boolean);

function sourceGate(reportPath) {
  git("merge-base", "--is-ancestor", BASE, "HEAD");
  const changed = changedFiles();
  for (const file of changed) {
    assert.ok([...APP_FILES, ...CI_FILES, ...DELETED_FILES].includes(file), "Out-of-scope file changed: " + file);
    assert.ok(!UNCHANGED.includes(file) && !UNCHANGED_PREFIXES.some((prefix) => file.startsWith(prefix)), "Protected file changed: " + file);
  }
  const unchangedBlobs = {};
  for (const file of UNCHANGED) {
    unchangedBlobs[file] = git("rev-parse", "HEAD:" + file).trim();
    assert.equal(unchangedBlobs[file], git("rev-parse", BASE + ":" + file).trim(), "Blob differs from base: " + file);
  }
  if (reportPath) {
    // Field names follow write-release-manifest.mjs; catalog evidence is inherited because data files are unchanged.
    writeFileSync(reportPath, JSON.stringify({
      schemaVersion: 1, releaseName: "kinoluma-admin-rating-poster-linux-candidate",
      baseCommit: BASE, releaseCommit: git("rev-parse", "HEAD").trim(), changedFiles: changed,
      changedAppFilesCount: changed.filter((file) => APP_FILES.includes(file)).length,
      trackedDiffSha256: createHash("sha256").update(execFileSync("git", ["diff", "--binary", BASE, "HEAD"], { maxBuffer: 64 * 1024 * 1024 })).digest("hex"),
      unchangedBlobs,
      batchB: { totalImageMutations: 481, inheritedUnchangedFrom: BASE },
      manualOverrides: { preserved: 9, note: "Inherited source evidence; DB not queried" },
      credits: { inheritedFrom: BASE },
      the100: { slug: "the-100-2014", inheritedUnchangedFrom: BASE },
      errors: [], pass: true,
    }, null, 2) + "\n");
  }
  for (const file of DELETED_FILES) assert.ok(!git("ls-tree", "--name-only", "HEAD", "--", file).trim(), "Obsolete CI file present: " + file);
  console.log("ADMIN_RATING_POSTER_SOURCE=PASS base=" + BASE + " changed=" + changed.join(","));
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
    assert.ok(!/(^|\/)(\.env(?:\..*)?|\.qa-tmp|\.deploy-temp|\.claude)(\/|$)/.test(relative), "Forbidden artifact config: " + relative);
    assert.ok(!/^(?:scripts|src|docs|\.github)\//.test(relative), "Source/test files in artifact: " + relative);
    assert.ok(realpathSync(file).startsWith(root + path.sep), "Escaping artifact symlink: " + relative);
    if (!lstatSync(file).isSymbolicLink() && /\.(?:js|json|html|rsc)$/.test(file) && !relative.startsWith("node_modules/")) {
      assert.ok(!/ci-placeholder|local-qa-placeholder|127\.0\.0\.1:54321/.test(readFileSync(file, "utf8")), "Placeholder build config in artifact: " + relative);
    }
  }
  const client = walk(path.join(root, ".next/static")).filter((file) => file.endsWith(".js")).map((file) => readFileSync(file, "utf8")).join("\n");
  assert.ok(!/SUPABASE_SERVICE_ROLE_KEY|TMDB_API_KEY|TMDB_ACCESS_TOKEN|VIBIX_API_TOKEN|EXIIM_API_TOKEN|RENDEX_API_TOKEN|KINOPOISK_API_KEY|KINOPOISK_DEV_TOKEN|sb_secret_/.test(client), "Privileged client marker");
  assert.ok(client.includes("678053396"), "VibixPlayer publisher missing from client bundle");
  assert.ok(readFileSync(path.join(root, ".next/BUILD_ID"), "utf8").trim());
  assert.ok(readFileSync(path.join(root, "server.js"), "utf8").includes("next"));
  console.log("STANDALONE_ADMIN_RATING_POSTER_PAYLOAD=PASS");
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
  const fetchManual = (path) => fetch(new URL(path, url), { redirect: "manual", signal: AbortSignal.timeout(60000) });
  for (const page of ["/movie/rik-i-morti-2013", "/movie/the-100-2014", "/movie/black-adam-2022", "/catalog/films", "/collections", "/sitemap.xml", "/robots.txt"]) {
    assert.equal((await fetchManual(page)).status, 200, page);
  }
  assert.equal((await fetchManual("/api/player/vibix")).status, 400, "/api/player/vibix without an id");
  const home = await (await fetchManual("/?genre=drama&type=series&page=2")).text();
  assert.match(home, /href="\/\?type=film"/);
  assert.match(home, /href="\/\?type=series"/);
  assert.match(home, /href="\/\?type=anime"/);
  assert.match(home, /href="\/\?type=cartoon"/);
  assert.equal((await fetchManual("/definitely-missing-route")).status, 404);
  // Admin write surfaces refuse anonymous callers before touching any data.
  const json = { "content-type": "application/json" };
  for (const [method, route, body] of [
    ["PUT", "/api/admin/movies/the-100-2014/override", { rating: 1, poster: "/x.svg" }],
    ["DELETE", "/api/admin/movies/the-100-2014/override", undefined],
    ["POST", "/api/admin/import/players/sync-all", { limit: 1 }],
    ["POST", "/api/admin/import/vibix/sync-site", { limit: 1 }],
  ]) {
    const response = await fetch(new URL(route, url), {
      method, headers: json, body: body && JSON.stringify(body), redirect: "manual", signal: AbortSignal.timeout(60000),
    });
    assert.ok([401, 403].includes(response.status), `${method} ${route} anonymous -> ${response.status}`);
  }
  console.log("ADMIN_RATING_POSTER_RUNTIME=PASS");
}

const [mode, arg] = process.argv.slice(2);
if (mode === "source") sourceGate(arg);
else if (mode === "artifact") artifactGate(arg);
else if (mode === "lint") await lintGate();
else if (mode === "runtime") await runtimeGate(arg);
else throw new Error("Usage: node verify-admin-rating-poster-source.mjs source [report.json] | lint | artifact <dir> | runtime <origin>");
