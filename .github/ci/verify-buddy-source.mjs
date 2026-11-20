import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

// Admin Rating + Poster production release (Build ID YOphvyhUVH9GVGz2tSdZF) this hotfix is built on.
const BASE = "14f1dffbed70df2ace849f20fbd276041fa12886";
const APP_FILES = [
  "scripts/batch-c3-credits.test.mjs",
  "scripts/buddy-2026.test.mjs",
  "src/app/data/manualBuddyAddition.ts",
  "src/app/data/manualCanonicalMovieAdditions.ts",
  "src/app/data/movieCardIndex.ts",
  "src/app/data/movies.ts",
  "src/app/data/profileCatalogItems.ts",
];
const CI_FILES = [
  ".github/ci/runtime-qa.mjs",
  ".github/ci/verify-buddy-source.mjs",
  ".github/ci/write-release-manifest.mjs",
  ".github/workflows/buddy-hotfix-linux-ci.yml",
];
// Catalog-only hotfix: players, pages, admin, navigation, profile and schema stay byte-identical to BASE.
const UNCHANGED = [
  ".github/ci/verify-admin-rating-poster-source.mjs",
  ".github/workflows/admin-rating-poster-linux-ci.yml",
  "next.config.ts",
  "package.json",
  "package-lock.json",
  "src/app/HomeClient.tsx",
  "src/app/sitemap.ts",
  "src/app/lib/seo.ts",
  "src/app/lib/players.ts",
  "src/app/lib/vibix.ts",
  "src/app/lib/vibixPolicy.ts",
  "src/app/lib/search/searchEngine.ts",
  "src/app/lib/movies/movieOverrides.ts",
  "src/app/data/generatedCanonicalMovieRegistry.ts",
  "src/app/data/generatedCanonicalCredits.ts",
  "src/app/data/generatedCanonicalMovieMetadata.ts",
  "src/app/data/verifiedVibixMappings.json",
  "src/app/data/movieSlugs.ts",
  "src/app/movie/[slug]/MoviePageClient.tsx",
  "src/app/movie/[slug]/page.tsx",
];
const PROTECTED_PREFIXES = ["src/app/admin/", "src/app/api/", "src/app/components/", "src/app/profile/", "src/app/catalog/", "src/app/movie/", "supabase/"];

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const changedFiles = () => git("diff", "--name-only", BASE, "--").split("\n").filter(Boolean);

function sourceGate(reportPath) {
  git("merge-base", "--is-ancestor", BASE, "HEAD");
  const changed = changedFiles();
  for (const file of changed) {
    assert.ok([...APP_FILES, ...CI_FILES].includes(file), "Out-of-scope file changed: " + file);
    assert.ok(!UNCHANGED.includes(file) && !PROTECTED_PREFIXES.some((prefix) => file.startsWith(prefix)), "Protected file changed: " + file);
  }
  const unchangedBlobs = {};
  for (const file of UNCHANGED) {
    unchangedBlobs[file] = git("rev-parse", "HEAD:" + file).trim();
    assert.equal(unchangedBlobs[file], git("rev-parse", BASE + ":" + file).trim(), "Blob differs from base: " + file);
  }
  // Existing catalog data may only gain lines: no other card is edited or removed.
  for (const file of APP_FILES.filter((name) => name.startsWith("src/app/data/") && name !== "src/app/data/manualBuddyAddition.ts")) {
    const removed = git("diff", "--numstat", BASE, "HEAD", "--", file).trim().split(/\s+/)[1];
    assert.equal(removed, "0", "Existing catalog lines removed in " + file);
  }
  if (reportPath) {
    writeFileSync(reportPath, JSON.stringify({
      schemaVersion: 1, releaseName: "kinoluma-buddy-2026-hotfix-linux-candidate",
      baseCommit: BASE, releaseCommit: git("rev-parse", "HEAD").trim(), changedFiles: changed,
      changedAppFilesCount: changed.filter((file) => APP_FILES.includes(file)).length,
      trackedDiffSha256: createHash("sha256").update(execFileSync("git", ["diff", "--binary", BASE, "HEAD"], { maxBuffer: 64 * 1024 * 1024 })).digest("hex"),
      unchangedBlobs,
      buddy: { slug: "buddy-2026", tmdbId: 1514026, imdbId: "tt37281055", kinopoiskId: 8549783 },
      batchB: { totalImageMutations: 481, inheritedUnchangedFrom: BASE },
      manualOverrides: { preserved: 9, note: "Inherited source evidence; DB not queried" },
      credits: { inheritedFrom: BASE },
      the100: { slug: "the-100-2014", inheritedUnchangedFrom: BASE },
      errors: [], pass: true,
    }, null, 2) + "\n");
  }
  console.log("BUDDY_SOURCE=PASS base=" + BASE + " changed=" + changed.join(","));
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
    const key = ({ ruleId, severity, message }) => JSON.stringify({ ruleId, severity, message });
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
  const get = (path) => fetch(new URL(path, url), { redirect: "manual", signal: AbortSignal.timeout(60000) });

  const pageResponse = await get("/movie/buddy-2026");
  assert.equal(pageResponse.status, 200, "/movie/buddy-2026");
  const page = await pageResponse.text();
  assert.match(page, /<title>[^<]*Бадди[^<]*<\/title>/, "Buddy page title");
  assert.match(page, /rel="canonical" href="https:\/\/kinoluma\.online\/movie\/buddy-2026"/, "Buddy canonical URL");
  assert.match(page, /1BdZbNvl1SfrrX8J9X5tQzN6Ivu/, "Buddy poster");
  assert.match(page, /0mil0YgOtu8/, "Buddy trailer");
  assert.match(page, /Каспер Келли/, "Buddy director");
  assert.match(page, /Кристин Милиоти/, "Buddy cast");
  assert.match(page, /"@type":"Movie"/, "Buddy must render as a film");
  assert.doesNotMatch(page, /"@type":"TVSeries"/, "Buddy must not render as a series");

  for (const query of ["бадди", "Бадди", "buddy", "Buddy"]) {
    const { items } = await (await get("/api/search?q=" + encodeURIComponent(query))).json();
    assert.equal(items[0]?.slug, "buddy-2026", "search " + query);
    assert.equal(items[0]?.type, "Фильм", "search type " + query);
    assert.equal(items.filter((item) => item.slug === "buddy-2026").length, 1, "search duplicate " + query);
  }

  const sitemap = await (await get("/sitemap.xml")).text();
  assert.equal((sitemap.match(/\/movie\/buddy-2026</g) ?? []).length, 1, "sitemap entry");
  for (const path of ["/movie/the-100-2014", "/movie/interstellar", "/movie/rik-i-morti-2013", "/catalog/films", "/"]) {
    assert.equal((await get(path)).status, 200, path);
  }
  console.log("BUDDY_RUNTIME=PASS");
}

const [mode, arg] = process.argv.slice(2);
if (mode === "source") sourceGate(arg);
else if (mode === "lint") await lintGate();
else if (mode === "runtime") await runtimeGate(arg);
else throw new Error("Usage: node verify-buddy-source.mjs source [report.json] | lint | runtime <origin>");
