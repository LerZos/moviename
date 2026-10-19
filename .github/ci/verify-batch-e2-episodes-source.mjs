import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, lstatSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = "64620a72d332438b64f9562921c9950efa0e1c24";
const BASE_TREE = "8fd127b7fdbc44ee3ffbd8bdd116357f99cddc92";
const BRANCH = "release/batch-e2-episodes-pilot-20261018";
// Exact reviewed E.1/E.2 Git blobs. CI-only repairs cannot alter application code.
const APP_BLOBS = {
  "package.json": "aacabb3c690d5ba0beccbe2f60a3037835dbfe7d",
  "src/app/data/movies.ts": "1a0805db0b8bbdf8cc6dbddbb45cf54bdaac43d5",
  "src/app/lib/movies/movieOverrides.ts": "565b51d9c1d042f3ad40a6fa39436c632b1e148f",
  "src/app/movie/[slug]/MoviePageClient.tsx": "2c46239aca8f9a6dd003b5eb23316eb809ab61d0",
  "docs/BATCH_E2_INTEGRATION.md": "8338579ee49598a019b7b4cf0e09c74972a4aa4a",
  "docs/BATCH_E2_PILOT.md": "91119339f292c57d02333114d329fde4689fb30c",
  "scripts/episode-guides/accordion.test.mjs": "363cab2576e33ec0979aaeddefa0e5218cf8f2ab",
  "scripts/episode-guides/e1-dry-run.mjs": "a8fe81831030694e4512bc32ecc7a7b08c959c47",
  "scripts/episode-guides/e1.test.mjs": "edc0b0c86f78135143913c9cb5cf618a075017ce",
  "scripts/episode-guides/e2-prepare.mjs": "b69450d3c0502ffde5660dd949b9d58e10d8fad8",
  "scripts/episode-guides/e2-run.mjs": "61aefbe3dc65bb98dad1a160357c663053469b4e",
  "scripts/episode-guides/e2.test.mjs": "46ecfe285c93f558c802d055619e85471609dbc3",
  "scripts/episode-guides/e2Import.ts": "43b4b9521c80cd2336196c9657ba457a78131caf",
  "scripts/episode-guides/e2Normalize.ts": "6bea934aec68bcc37858adddf94c487ffe76fb63",
  "scripts/episode-guides/e2Transport.ts": "7e56848a536a13196523031744f834603de48bc6",
  "scripts/episode-guides/importInfrastructure.ts": "15dfe61cb67aac542083c0fd17fad3c77ba84233",
  "scripts/episode-guides/integration.test.mjs": "2f33093548ada860fa334004f2dd5b5dfe49fdbb",
  "scripts/episode-guides/register-local.mjs": "2605e71c66700982c9c3234f43f717fa0a63a082",
  "src/app/data/episodeGuidePilotAllowlist.ts": "cee3dec2b1ad0b75b9b61b10db7ebaec28dd5cc8",
  "src/app/lib/episodeGuides/checksum.ts": "1e2dee557aa2113e1cca9ee816f911b90cbbec3c",
  "src/app/lib/episodeGuides/loader.ts": "58507138f2e3029ad80aa3975f45928222169b70",
  "src/app/lib/episodeGuides/manifest.ts": "a1de31fb976e8c26b8ee5aa9ca34d2a887ba7163",
  "src/app/lib/episodeGuides/movieIntegration.ts": "dd8970d178ca354c3d89230e5ef34a94fb612c56",
  "src/app/lib/episodeGuides/normalizer.ts": "ab0e64ffbf6489c1a68bdf0e3211d231b6a57ff1",
  "src/app/lib/episodeGuides/snapshots/01c49b47-8e78-48c7-a718-ec2c06824aa1.ts": "10f9d970149b6aa9a5dc9feb1c643c297e48308e",
  "src/app/lib/episodeGuides/snapshots/174f15d5-abe2-433e-9e8e-e65c61391ca2.ts": "c9abef82853f86365cd779ec4c9290f0dd4edb73",
  "src/app/lib/episodeGuides/types.ts": "67ec9861c66e7a1a7ec5e1da2eab24892c2a8ab2",
  "src/app/lib/episodeGuides/verifier.ts": "96892baa5f59a796be117c5387ed8c5c2e405d28"
};
const CI_FILES = [
  ".github/ci/verify-batch-e2-episodes-source.mjs",
  ".github/workflows/batch-e2-episodes-linux-release.yml",
];
const MODIFIED = [
  "package.json", "src/app/data/movies.ts",
  "src/app/lib/movies/movieOverrides.ts", "src/app/movie/[slug]/MoviePageClient.tsx",
];
const PILOTS = [
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
    schemaVersion: 1, releaseName: "kinoluma-batch-e2-episodes-linux-candidate",
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
  save(process.argv[3] ?? "batch-e2-source-verification.json", report);
  console.log("BATCH_E2_SOURCE=PASS files=" + files.length);
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
  assert.equal(Object.values(manifest).filter((item) => item.status === "planned").length, 8);
  const result = [];
  for (const pilot of PILOTS) {
    const snapshot = await loadEpisodeGuideSnapshot(pilot.id);
    assert.equal(snapshot.canonicalMovieId, pilot.id);
    assert.equal(snapshot.slug, pilot.slug);
    assert.deepEqual(snapshot.provider, { source: "tmdb", namespace: "tv", id: pilot.providerId });
    assert.equal(snapshot.verificationStatus, "verified_complete");
    assert.equal(snapshot.checksum, pilot.checksum);
    assert.equal(computeEpisodeGuideChecksum(snapshot), pilot.checksum);
    assert.equal(verifyEpisodeGuideSnapshot(snapshot, getCanonicalIdentityById(pilot.id)).valid, true);
    assert.equal(snapshot.regularSeasons.length, pilot.seasons);
    const regular = snapshot.regularSeasons.flatMap((season) => season.episodes);
    assert.equal(regular.length, pilot.episodes);
    assert.equal(snapshot.specials.length, pilot.specials);
    assert.equal(regular.filter((episode) => episode.russianTitle).length, pilot.episodes);
    assert.equal(snapshot.specials.filter((episode) => episode.russianTitle).length, pilot.russianSpecials);
    assert.ok([...regular, ...snapshot.specials].every((episode) => episode.airDate && episode.originalTitle));
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
  console.log("EPISODE_INTEGRITY=PASS andor=2/24+5 band-of-brothers=1/10+6 the100=7/100 planned=8");
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
      assert.ok(!/synthetic-test-token|kinoluma-offline-qa|\.qa-tmp\/harness/.test(read(file)), "QA fixture in artifact");
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
      assert.ok(text.includes("Спецвыпуски"));
    }
    assert.ok(!/NEXT_HTTP_ERROR_FALLBACK;500/.test(flight), "Server render failed");
  }
  save("batch-e2-runtime.json", { pass: true, cards: cards.map(({ slug, seasons, episodes, specials }) =>
    ({ slug, seasons, episodes, specials })), fullSnapshotPropsVerified: true, network: "loopback-only Linux namespace" });
  console.log("BATCH_E2_SSR=PASS full snapshot values/dates/titles/specials verified");
}

switch (process.argv[2]) {
  case "source": sourceGate(process.argv.includes("--staged")); break;
  case "snapshots": await snapshots(); break;
  case "lint": await lintGate(); break;
  case "artifact": artifactGate(process.argv[3] ?? "release"); break;
  case "runtime": await runtimeGate(); break;
  default: throw new Error("Expected source|snapshots|lint|artifact|runtime");
}
