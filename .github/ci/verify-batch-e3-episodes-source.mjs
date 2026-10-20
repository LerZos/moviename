import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, lstatSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = "ee763fca416ddc878d6069479a74dc4d97960514";
const BASE_TREE = "d9a57d6f84b70a7c0bdcb2fdd5c9889e953b3239";
const BRANCH = "release/batch-e3-episodes-20261020";
// Exact reviewed E.3 Git blobs. CI-only repairs cannot alter application code.
const APP_BLOBS = {
  "package.json": "489e09527a133d732e111a9fd1fa890a3414009e",
  "scripts/episode-guides/e2.test.mjs": "34a5edcb431f4d27e8fc03734e6e6e0e89d9fd7b",
  "scripts/episode-guides/e2Normalize.ts": "2e720550eb60df8842b2d571995a060e74a3efe2",
  "scripts/episode-guides/integration.test.mjs": "0f907dde494a17038cf499c96749bef24737096a",
  "src/app/lib/episodeGuides/loader.ts": "b48cd0da5217097b4c059c97db1306100212742c",
  "src/app/lib/episodeGuides/manifest.ts": "35a2f0f6a53916abb1e2ba9cd870248df051fa7c",
  "src/app/movie/[slug]/MoviePageClient.tsx": "c8fc20c81e2104fe3759251c51a0ca0bc806c687",
  "docs/BATCH_E3_INTEGRATION.md": "5b2c22a629bca1113b10152142cdc9e045ca71d1",
  "docs/BATCH_E3_PILOT.md": "ed906289657fd9f1a3f77795897d02d63cbd8d4b",
  "scripts/episode-guides/e3-prepare.mjs": "b5a6cb5a9ab73c33d9d20d6e76b2e659cffe08f4",
  "scripts/episode-guides/e3-run.mjs": "514872c9596b149e91c3aeefe09725fff209b755",
  "scripts/episode-guides/e3.test.mjs": "6bef6443ac4a22ebea065f397c637ba54c2dddd9",
  "scripts/episode-guides/e3Import.ts": "be26eb73adff01a345048e889ffc51ab9b3d7309",
  "scripts/episode-guides/e3Normalize.ts": "f27cf0b4b74319f9e951b8a3d60b9d5ad6dace1e",
  "scripts/episode-guides/e3Transport.ts": "1cadcdccdebcde2913723528f71537d871aedd10",
  "src/app/lib/episodeGuides/snapshots/42989ff4-cd94-4f82-a7b0-7d75b3a73fe5.ts": "ca84f43f9e2616cc7a48ee2ea01a903b2a2f0800",
  "src/app/lib/episodeGuides/snapshots/bc84cfc1-a6fb-4bc0-9661-24fca39c6363.ts": "5898a243d9550db5bdab3b25dc99732cc392550c",
  "src/app/lib/episodeGuides/snapshots/c5cf7ec6-d093-43b0-84b8-9f903c332451.ts": "4a82b7704f63a6fa37405d5b2450578174dc2d82"
};
const CI_FILES = [
  ".github/ci/verify-batch-e3-episodes-source.mjs",
  ".github/workflows/batch-e3-episodes-linux-release.yml",
];
const MODIFIED = [
  "package.json",
  "scripts/episode-guides/e2.test.mjs",
  "scripts/episode-guides/e2Normalize.ts",
  "scripts/episode-guides/integration.test.mjs",
  "src/app/lib/episodeGuides/loader.ts",
  "src/app/lib/episodeGuides/manifest.ts",
  "src/app/movie/[slug]/MoviePageClient.tsx"
];
const PILOTS = [
  { id: "42989ff4-cd94-4f82-a7b0-7d75b3a73fe5", slug: "bolshaya-malenkaya-lozh-2017",
    providerId: 66292, seasons: 2, episodes: 14, specials: 0, russianSpecials: 0,
    checksum: "sha256:c011de3cdad66c068a2d30fbd536b22176ca8bd7a0c686272285dfd72b9436e9" },
  { id: "c5cf7ec6-d093-43b0-84b8-9f903c332451", slug: "avatar-legenda-ob-aange-2004",
    providerId: 246, seasons: 3, episodes: 61, specials: 24, russianSpecials: 0,
    checksum: "sha256:b157da26e76ff3b8e1fff5965fdfceb7cc2a945a6936cd32752f58290f5ea2cf" },
  { id: "bc84cfc1-a6fb-4bc0-9661-24fca39c6363", slug: "banshi-2013",
    providerId: 41727, seasons: 4, episodes: 38, specials: 0, russianSpecials: 0,
    checksum: "sha256:90746725ae921f51ad6b0c52cf74f49bf5d146764d11746996f0c3194ed804eb" },
  { id: "01c49b47-8e78-48c7-a718-ec2c06824aa1", slug: "band-of-brothers-2001",
    providerId: 4613, seasons: 1, episodes: 10, specials: 6, russianSpecials: 3,
    checksum: "sha256:a7269e8832e1603c97415355542d7cf9bf7fd346eeb92b21367ba424c5bc8c5a" },
  { id: "174f15d5-abe2-433e-9e8e-e65c61391ca2", slug: "andor",
    providerId: 83867, seasons: 2, episodes: 24, specials: 5, russianSpecials: 0,
    checksum: "sha256:39bfdaf2a4fb4331dad448abe2925941e75a424285539dc3f053e21e97ff2ce8" },
];
const git = (...args) => execFileSync("git", args, {
  encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"],
}).trim();
const read = (file) => readFileSync(file, "utf8");
const hash = (data) => createHash("sha256").update(data).digest("hex");
const save = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2) + "\n");

function sourceGate(staged) {
  const ref = staged ? git("write-tree") : git("rev-parse", "HEAD");
  const files = [...Object.keys(APP_BLOBS), ...CI_FILES].sort();
  assert.equal(process.env.GITHUB_REF_NAME ?? git("branch", "--show-current"), BRANCH);
  assert.equal(git("rev-parse", BASE + "^{tree}"), BASE_TREE, "Wrong base tree");
  git("merge-base", "--is-ancestor", BASE, "HEAD");
  assert.equal(git("merge-base", BASE, "HEAD"), BASE, "Wrong merge base");
  if (staged) assert.equal(git("rev-parse", "HEAD"), BASE);
  else {
    const commits = git("rev-list", "--reverse", BASE + "..HEAD").split("\n");
    assert.ok(commits.length > 0 && commits[0]);
    let parent = BASE;
    for (const [index, commit] of commits.entries()) {
      assert.equal(git("show", "-s", "--format=%P", commit), parent, "Merges are forbidden");
      if (index > 0) {
        const repaired = git("diff", "--name-only", parent, commit).split("\n");
        assert.ok(repaired.every((file) => CI_FILES.includes(file)), "Only CI repairs after release commit");
      }
      parent = commit;
    }
  }
  const rows = git("diff", "--no-renames", "--name-status", BASE, ref)
    .split("\n").map((row) => row.split("\t"));
  assert.deepEqual(rows.map(([, file]) => file).sort(), files, "Unexpected or missing release file");
  for (const [status, file] of rows) {
    assert.equal(status, MODIFIED.includes(file) ? "M" : "A", "Deletion/rename/type change: " + file);
    assert.match(git("ls-tree", ref, "--", file), /^100644 blob /, "Non-regular source file");
    const content = git("show", ref + ":" + file);
    // Report filenames only; never emit a suspected secret.
    assert.ok(!/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|(?:gh[pousr]_|github_pat_|sb_secret_)[A-Za-z0-9_]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content),
      "Credential material: " + file);
    assert.ok(!/(?:api[_-]?key|access[_-]?token|service[_-]?role[_-]?key)\s*[:=]\s*["'][a-zA-Z0-9_-]{24,}["']/i.test(content),
      "Literal credential: " + file);
    if (APP_BLOBS[file]) assert.equal(git("rev-parse", ref + ":" + file), APP_BLOBS[file], "Unreviewed application edit: " + file);
  }
  // All other base files (registry, providers, The 100, lockfile, old CI, etc.)
  // are protected by exact full-tree diff and the reviewed application blobs.
  const tracked = git("ls-tree", "-r", "--name-only", ref).split("\n");
  assert.ok(!tracked.some((file) => /(^|\/)(\.env(?:\..*)?|\.deploy-temp|\.qa-tmp)(\/|$)/.test(file)), "Forbidden tracked runtime/config file");
  const diff = execFileSync("git", ["diff", "--binary", BASE, ref], { maxBuffer: 32 * 1024 * 1024 });
  const report = {
    schemaVersion: 1, releaseName: "kinoluma-batch-e3-episodes-linux-candidate",
    baseCommit: BASE, approvedRecoveryTreeSha1: BASE_TREE, baseIsAncestor: true,
    mergeBase: BASE, releaseCommit: staged ? null : ref,
    releaseTreeSha1: staged ? ref : git("rev-parse", "HEAD^{tree}"),
    staged, changedFiles: files, changedAppFiles: Object.keys(APP_BLOBS),
    changedAppFilesCount: Object.keys(APP_BLOBS).length, trackedDiffSha256: hash(diff),
    protectedSource: { canonicalIdentity: "UNCHANGED", providerIds: "UNCHANGED",
      smartSearch: "UNCHANGED", the100Data: "UNCHANGED", oldCI: "UNCHANGED", lockfile: "UNCHANGED" },
    batchB: { totalImageMutations: 481, inheritedUnchangedFrom: BASE },
    manualOverrides: { preserved: 9, note: "Inherited source evidence; DB not queried" },
    credits: { inheritedFrom: BASE, allowlistedCards: 369 },
    the100: { slug: "the-100-2014", seasons: 7, episodes: 100, inheritedUnchangedFrom: BASE },
    visualParityEvidence: { desktop: "PASS", mobile: "PASS", reducedMotion: "PASS",
      note: "Previously completed isolated offline QA; not repeated in CI." },
    errors: [], pass: true,
  };
  save(process.argv[3] ?? "batch-e3-source-verification.json", report);
  console.log("BATCH_E3_SOURCE=PASS files=" + files.length);
}

async function snapshots() {
  const { requireLocal } = await import("../../scripts/episode-guides/register-local.mjs");
  const { movies } = requireLocal("../../src/app/data/movies.ts");
  assert.equal(Object.keys(requireLocal.cache).filter((file) => /episodeGuides[/\\]snapshots[/\\]/.test(file)).length, 0);
  const { getCanonicalIdentityById } = requireLocal("../../src/app/data/canonicalIdentity.ts");
  const { episodeGuideSnapshotManifest: manifest } = requireLocal("../../src/app/lib/episodeGuides/manifest.ts");
  const { loadEpisodeGuideSnapshot } = requireLocal("../../src/app/lib/episodeGuides/loader.ts");
  const { computeEpisodeGuideChecksum } = requireLocal("../../src/app/lib/episodeGuides/checksum.ts");
  const { verifyEpisodeGuideSnapshot } = requireLocal("../../src/app/lib/episodeGuides/verifier.ts");
  assert.equal(Object.keys(manifest).length, 10);
  assert.deepEqual(Object.entries(manifest).filter(([, item]) => item.status === "available").map(([id]) => id).sort(),
    PILOTS.map((item) => item.id).sort());
  assert.equal(Object.values(manifest).filter((item) => item.status === "planned").length, 5);
  const { normalizeEpisodeGuideSnapshot } = requireLocal("../../src/app/lib/episodeGuides/normalizer.ts");
  const result = [];
  for (const pilot of PILOTS) {
    const snapshot = await loadEpisodeGuideSnapshot(pilot.id);
    assert.equal(snapshot.canonicalMovieId, pilot.id);
    assert.equal(snapshot.slug, pilot.slug);
    assert.deepEqual(snapshot.provider, { source: "tmdb", namespace: "tv", id: pilot.providerId });
    assert.equal(snapshot.verificationStatus, "verified_complete");
    assert.equal(snapshot.checksum, pilot.checksum);
    assert.equal(computeEpisodeGuideChecksum(snapshot), pilot.checksum);
    assert.equal(normalizeEpisodeGuideSnapshot(snapshot).checksum, pilot.checksum);
    assert.equal(snapshot.sourceLanguage, "en");
    const loaded = Object.keys(requireLocal.cache)
      .filter((file) => /episodeGuides[/\\\\]snapshots[/\\\\]/.test(file))
      .map((file) => path.basename(file, ".ts")).sort();
    assert.deepEqual(loaded, PILOTS.slice(0, result.length + 1).map((item) => item.id).sort());
    assert.equal(verifyEpisodeGuideSnapshot(snapshot, getCanonicalIdentityById(pilot.id)).valid, true);
    assert.equal(snapshot.regularSeasons.length, pilot.seasons);
    const regular = snapshot.regularSeasons.flatMap((season) => season.episodes);
    assert.equal(regular.length, pilot.episodes);
    assert.equal(snapshot.specials.length, pilot.specials);
    assert.equal(regular.filter((episode) => episode.russianTitle).length, pilot.episodes);
    assert.equal(snapshot.specials.filter((episode) => episode.russianTitle).length, pilot.russianSpecials);
    assert.ok(regular.every((episode) => episode.airDate && episode.originalTitle));
    assert.ok(snapshot.regularSeasons.every((season) => season.seasonNumber > 0));
    assert.ok(snapshot.specials.every((episode) => episode.originalTitle));
    assert.equal(snapshot.specials.filter((episode) => !episode.airDate).length, pilot.providerId === 246 ? 15 : 0);
    assert.equal(movies.find((movie) => movie.canonicalMovieId === pilot.id).episodeGuide, undefined);
    result.push({ ...pilot, snapshot });
  }
  for (const [id, entry] of Object.entries(manifest)) if (entry.status === "planned") {
    assert.equal(await loadEpisodeGuideSnapshot(id), null);
    assert.equal(movies.find((movie) => movie.canonicalMovieId === id).episodeGuide, undefined);
  }
  const hundred = movies.find((movie) => movie.slug === "the-100-2014");
  assert.equal(hundred.episodeGuide.length, 7);
  assert.equal(hundred.episodeGuide.flatMap((season) => season.episodes).length, 100);
  for (const file of Object.keys(APP_BLOBS).filter((file) =>
    file.startsWith("src/app/lib/episodeGuides/") && !file.endsWith("/types.ts"))) {
    assert.match(read(file), /^import "server-only";/);
  }
  console.log("EPISODE_INTEGRITY=PASS big-little-lies=2/14+0 avatar=3/61+24 banshee=4/38+0 andor=2/24+5 band-of-brothers=1/10+6 the100=7/100 planned=5");
  return { pilots: result, hundred };
}

async function lintGate() {
  const { ESLint } = await import("eslint");
  const eslint = new ESLint();
  const files = [...Object.keys(APP_BLOBS), CI_FILES[0]].filter((file) => /\.(?:ts|tsx|mjs)$/.test(file));
  let inheritedErrors = 0;
  let inheritedWarnings = 0;
  for (const file of files) {
    const [current] = await eslint.lintText(read(file), { filePath: file });
    const before = MODIFIED.includes(file)
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
      if (diagnostic.severity === 2) inheritedErrors++;
      else inheritedWarnings++;
    }
  }
  console.log("SCOPED_ESLINT=PASS new=0 inheritedErrors=" + inheritedErrors + " inheritedWarnings=" + inheritedWarnings);
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function artifactGate(directory) {
  const root = realpathSync(directory);
  const files = walk(root);
  for (const file of files) {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    assert.ok(!/(^|\/)(\.env(?:\..*)?|\.qa-tmp|\.deploy-temp)(\/|$)/.test(relative), "Forbidden artifact config");
    assert.ok(!/^(?:scripts|src|docs|\.github)\//.test(relative), "Source/test files in artifact");
    const resolved = realpathSync(file);
    assert.ok(resolved.startsWith(root + path.sep), "Escaping artifact symlink");
    if (!lstatSync(file).isSymbolicLink() && /\.(?:js|json|html|rsc)$/.test(file) && !relative.startsWith("node_modules/")) {
      assert.ok(!/synthetic-test-token|kinoluma-offline-qa|kinoluma-e3-ui-|Offline preview|QA_EXTERNAL_BLOCKED|\.qa-tmp\/harness/.test(read(file)), "QA fixture in artifact");
    }
  }
  const client = walk(path.join(root, ".next/static")).filter((file) => file.endsWith(".js")).map(read).join("\n");
  for (const pilot of PILOTS) assert.ok(!client.includes(pilot.checksum), "Full snapshot leaked to client index");
  assert.ok(!/SUPABASE_SERVICE_ROLE_KEY|TMDB_API_KEY|TMDB_ACCESS_TOKEN|sb_secret_/.test(client), "Privileged client marker");
  const server = walk(path.join(root, ".next/server")).filter((file) => file.endsWith(".js")).map(read).join("\n");
  for (const pilot of PILOTS) assert.ok(server.includes(pilot.checksum), "Snapshot missing from standalone server chunks");
  assert.ok(read(path.join(root, ".next/BUILD_ID")).trim());
  assert.ok(read(path.join(root, "server.js")).includes("next"));
  console.log("STANDALONE_EPISODE_PAYLOAD=PASS");
}

function flightArray(flight, key) {
  const marker = JSON.stringify(key) + ":";
  const start = flight.indexOf(marker);
  assert.ok(start >= 0, "Missing RSC field " + key);
  const offset = start + marker.length;
  assert.equal(flight[offset], "[");
  let depth = 0, quoted = false, escaped = false;
  for (let index = offset; index < flight.length; index++) {
    const char = flight[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === "[") depth++;
    else if (char === "]" && --depth === 0) return JSON.parse(flight.slice(offset, index + 1));
  }
  throw new Error("Incomplete RSC array");
}

async function runtimeGate() {
  const origin = process.argv[3] ?? "http://127.0.0.1:3100";
  assert.equal(new URL(origin).hostname, "127.0.0.1", "Runtime QA must stay loopback");
  const { pilots, hundred } = await snapshots();
  const toEpisode = ({ episodeNumber, ...rest }) => ({ number: episodeNumber, ...rest });
  const cards = pilots.map(({ snapshot, ...pilot }) => ({
    ...pilot,
    guide: snapshot.regularSeasons.map(({ seasonNumber, episodes }) => ({ season: seasonNumber, episodes: episodes.map(toEpisode) })),
    specialGuide: snapshot.specials.map(toEpisode),
  }));
  cards.push({ slug: hundred.slug, seasons: 7, episodes: 100, guide: hundred.episodeGuide });
  for (const card of cards) {
    const response = await fetch(origin + "/movie/" + card.slug, { redirect: "error" });
    assert.equal(response.status, 200, card.slug);
    const html = await response.text();
    const text = html.replace(/<!--\s*-->/g, "");
    assert.ok(html.includes('rel="canonical" href="https://kinoluma.online/movie/' + card.slug + '"'), card.slug + " canonical");
    assert.ok(text.includes("Сезоны и серии") && text.includes("Сезон " + card.seasons));
    const flight = [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)/g)]
      .map((match) => JSON.parse(match[1])).join("");
    assert.deepEqual(flightArray(flight, "episodeGuide"), card.guide, card.slug + " complete ordinary guide");
    if (card.specialGuide) {
      assert.deepEqual(flightArray(flight, "episodeSpecials"), card.specialGuide, card.slug + " specials");
      assert.equal(text.includes('id="episode-specials-title"'), card.specialGuide.length > 0, card.slug + " separate specials section");
    }
    assert.equal((text.match(/class="episode-item"/g) ?? []).length, card.guide[0].episodes.length,
      card.slug + " only initially open season mounted in SSR");
    assert.ok(!/NEXT_HTTP_ERROR_FALLBACK;500/.test(flight), "Server render failed");
  }
  const sitemapResponse = await fetch(origin + "/sitemap.xml", { redirect: "error" });
  assert.equal(sitemapResponse.status, 200);
  const sitemap = await sitemapResponse.text();
  for (const card of cards) assert.ok(sitemap.includes("<loc>https://kinoluma.online/movie/" + card.slug + "</loc>"), card.slug + " sitemap");
  save("batch-e3-runtime.json", { pass: true, cards: cards.map(({ slug, seasons, episodes, specials }) =>
    ({ slug, seasons, episodes, specials })), fullSnapshotPropsVerified: true, network: "loopback-only Linux namespace" });
  console.log("BATCH_E3_SSR=PASS full snapshot values/dates/titles/specials verified");
}

switch (process.argv[2]) {
  case "source": sourceGate(process.argv.includes("--staged")); break;
  case "snapshots": await snapshots(); break;
  case "lint": await lintGate(); break;
  case "artifact": artifactGate(process.argv[3] ?? "release"); break;
  case "runtime": await runtimeGate(); break;
  default: throw new Error("Expected source|snapshots|lint|artifact|runtime");
}
