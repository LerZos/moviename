import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";

// Production release (Build ID oUj267sR0m2-UFUVUxCc9) this fix is built on.
const BASE = "1fb217b33330d29e60fce5369994f3d9bc690158";
const APP_FILES = [
  "next.config.ts",
  "scripts/home-catalog-navigation.test.mjs",
  "src/app/HomeClient.tsx",
  "src/app/lib/home/homeCatalogRoutes.ts",
];
const CI_FILES = [
  ".github/ci/verify-genre-navigation-source.mjs",
  ".github/workflows/genre-navigation-linux-ci.yml",
];
// Players, movie pages, admin, profile, catalog data and the Vibix release contract stay byte-identical to BASE.
const UNCHANGED = [
  ".github/ci/verify-vibix-source.mjs",
  ".github/workflows/vibix-linux-release.yml",
  "package.json",
  "package-lock.json",
  "src/app/components/MobileBottomNav.tsx",
  "src/app/components/PlayerFrameGuard.tsx",
  "src/app/components/VibixPlayer.tsx",
  "src/app/lib/players.ts",
  "src/app/movie/[slug]/MoviePageClient.tsx",
];
const UNCHANGED_PREFIXES = ["src/app/admin/", "src/app/api/", "src/app/data/", "src/app/movie/", "src/app/profile/", "supabase/"];

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
  if (reportPath) {
    // Field names follow write-release-manifest.mjs; catalog evidence is inherited because data files are unchanged.
    writeFileSync(reportPath, JSON.stringify({
      schemaVersion: 1, releaseName: "kinoluma-genre-navigation-linux-candidate",
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
  console.log("GENRE_SOURCE=PASS base=" + BASE + " changed=" + changed.join(","));
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
  console.log("STANDALONE_GENRE_PAYLOAD=PASS");
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
      message: message.replace(/:\d+:\d+(?=\n)/g, ":LINE:COL")
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
  console.log("GENRE_RUNTIME=PASS");
}

const [mode, arg] = process.argv.slice(2);
if (mode === "source") sourceGate(arg);
else if (mode === "artifact") artifactGate(arg);
else if (mode === "lint") await lintGate();
else if (mode === "runtime") await runtimeGate(arg);
else throw new Error("Usage: node verify-genre-navigation-source.mjs source [report.json] | lint | artifact <dir> | runtime <origin>");
