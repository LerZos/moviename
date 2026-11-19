import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

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

function sourceGate() {
  git("merge-base", "--is-ancestor", BASE, "HEAD");
  const changed = changedFiles();
  for (const file of changed) {
    assert.ok([...APP_FILES, ...CI_FILES].includes(file), "Out-of-scope file changed: " + file);
    assert.ok(!UNCHANGED.includes(file) && !UNCHANGED_PREFIXES.some((prefix) => file.startsWith(prefix)), "Protected file changed: " + file);
  }
  for (const file of UNCHANGED) {
    assert.equal(git("rev-parse", "HEAD:" + file).trim(), git("rev-parse", BASE + ":" + file).trim(), "Blob differs from base: " + file);
  }
  console.log("GENRE_SOURCE=PASS base=" + BASE + " changed=" + changed.join(","));
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
  for (const path of ["/movie/rik-i-morti-2013", "/catalog/films", "/collections", "/sitemap.xml", "/robots.txt"]) {
    assert.equal((await fetchManual(path)).status, 200, path);
  }
  const home = await (await fetchManual("/?genre=drama&type=series&page=2")).text();
  assert.match(home, /href="\/\?type=film"/);
  assert.match(home, /href="\/\?type=series"/);
  assert.match(home, /href="\/\?type=anime"/);
  assert.match(home, /href="\/\?type=cartoon"/);
  assert.equal((await fetchManual("/definitely-missing-route")).status, 404);
  console.log("GENRE_RUNTIME=PASS");
}

const [mode, arg] = process.argv.slice(2);
if (mode === "source") sourceGate();
else if (mode === "lint") await lintGate();
else if (mode === "runtime") await runtimeGate(arg);
else throw new Error("Usage: node verify-genre-navigation-source.mjs source|lint|runtime <origin>");
