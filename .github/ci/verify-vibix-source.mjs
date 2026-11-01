import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, lstatSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = "ee763fca416ddc878d6069479a74dc4d97960514";
const BASE_TREE = "d9a57d6f84b70a7c0bdcb2fdd5c9889e953b3239";
const RELEASE_COMMIT = "101f70c0c3834d15e28ec1725f3478e5d0bb0901";
const BRANCH = "release/vibix-20261031";
const PUBLISHER_ID = "678053396";
const SDK_URLS = [
  "https://graphicslab.io/sdk/v2/rendex-sdk.min.js",
  "https://alt.graphicslab.io/sdk/v2/rendex-sdk.min.js",
];
// Exact reviewed Vibix Git blobs from RELEASE_COMMIT. CI-only repairs cannot alter application code.
const APP_BLOBS = {
  "docs/VIBIX_LOCAL_POLICY.md": "10c8e63eca7687af02ac1d9c7a2d7775945fdebe",
  "scripts/generate-kinopoisk-requested-pack.mjs": "050e1a40029f817f21f31e6f8fa601436b855bd8",
  "scripts/lib/verified-vibix-mapping.mjs": "bdd3653dc2a8fb09c48314e4604a7c51a57662dd",
  "scripts/vibix-policy.test.mjs": "6308a036610264d5b7f56fef3f9876c8c807ef4d",
  "scripts/vibix.test.mjs": "9ff72ce9e03b7ec17e31b5cbe39a6411e694cc87",
  "src/app/admin/movies/[slug]/edit/MovieAdminEditForm.tsx": "0309f06cea622f7fb3279a96bc84f99727e255a1",
  "src/app/api/player/vibix/route.ts": "28b49c7bf4faf123c661c50333670e027092143b",
  "src/app/components/VibixPlayer.tsx": "8b4aec719b5dc094cc6345f3d15854a58e3997b9",
  "src/app/data/generatedKinopoiskRequested.ts": "1612edac78b68a02b7d8316b7cc5eb13c72d63f8",
  "src/app/data/verifiedVibixMappings.json": "22d4ca0a84a1b07e3cf627eee58251b6d468b44d",
  "src/app/lib/adminPlayers.ts": "074ac5fe4b760173bcfb7600047ff55d6d5e7c22",
  "src/app/lib/players.ts": "b9eef5b517e135163b8c7a106d25dc39e1c33e43",
  "src/app/lib/useVibixLookup.ts": "e97c9b00cd3f9b90052b2b1178d3109ee99f1635",
  "src/app/lib/vibix.ts": "fdec9b372b9a22094d81f1bc68de48dfd4684df3",
  "src/app/lib/vibixLookup.ts": "476f0814d20d8bb0e7e36b1b714226d284efc56e",
  "src/app/lib/vibixPolicy.ts": "cd2a52414d36ec0fbaef1435cf0851a6b4d02866",
  "src/app/movie/[slug]/MoviePageClient.tsx": "480c35252004b4dcbdef87778917c333089ec29c",
  "src/app/movie/[slug]/layout.tsx": "d78da4d107b7a0ea5141eaeefb1cba94516a3fe4",
  "src/app/movie/[slug]/page.tsx": "353a0b870055575667803950bbc229ffc1be8e3d",
};
// Reviewed pre-release hardening (SDK-free admin/profile documents, legacy players compatibility). These blobs
// replace the release-commit blobs of the same path once committed after the release commit.
const HARDENING_BLOBS = {
  "scripts/vibix-hardening.test.mjs": "d8cdc593a444a16735ff4703c6ba7f74f0fda886",
  "src/app/admin/layout.tsx": "893cf4310f312066aa1f23671e8d88930b359a55",
  "src/app/components/CleanDocumentGuard.tsx": "e89edd455dd8cc539b76e41b9a00826b7941721b",
  "src/app/lib/adminPlayers.ts": "36875cd7d19295218d740904ab50f8838cfbc0a4",
  "src/app/lib/players.ts": "525c165649492c792ba3f5511deec27a107bc124",
  "src/app/lib/thirdPartySdk.ts": "edbfb50a8a82b0d565790306010c169851a2c244",
  "src/app/profile/layout.tsx": "4f1fa5f621878cddae04676a9e5d89bcc52c21ef",
};
// Reviewed post-release player order fix: Collapse primary, Vibix first backup, at most two players (as in E.2).
const PLAYER_ORDER_BLOBS = {
  "scripts/vibix-player-order.test.mjs": "41137420fbf5314a3a2f1c4733624907ad9ff5c6",
  "src/app/movie/[slug]/MoviePageClient.tsx": "19ef1846f8f431ad6d9c6c2c257858376820d95a",
};
const CI_FILES = [
  ".github/ci/verify-vibix-source.mjs",
  ".github/workflows/vibix-linux-release.yml",
];
const MODIFIED = [
  "scripts/generate-kinopoisk-requested-pack.mjs",
  "src/app/admin/layout.tsx",
  "src/app/admin/movies/[slug]/edit/MovieAdminEditForm.tsx",
  "src/app/api/player/vibix/route.ts",
  "src/app/data/generatedKinopoiskRequested.ts",
  "src/app/lib/players.ts",
  "src/app/movie/[slug]/MoviePageClient.tsx",
  "src/app/movie/[slug]/page.tsx",
];
// Poster RC, SEO, Batch E.3 and Mobile UX surfaces that a Vibix release must not touch.
const PROTECTED = [
  "src/app/layout.tsx", "src/app/lib/movies/movieOverrides.ts",
  "src/app/api/admin/movies/[slug]/override/route.ts", "src/app/lib/seo.ts",
  "src/app/sitemap.ts", "src/app/robots.ts", "src/app/data/movies.ts",
  "src/app/data/canonicalIdentity.ts", "package.json", "package-lock.json",
  "src/app/HomeClient.tsx", "src/app/catalog/[category]/CatalogPageClient.tsx",
  "src/app/components/MobileBottomNav.tsx", "src/app/profile/page.tsx",
];
const PROTECTED_PREFIXES = ["src/app/lib/episodeGuides/", "scripts/episode-guides/", ".github/workflows/batch-"];
const SPIDER_MAN = {
  canonicalMovieId: "24dfe6d2-d725-4d21-a5bc-94f82d84cea9", slug: "chelovek-pauk-2002", year: "2002",
  kinopoiskId: 838, imdbId: "tt0145487", tmdbId: 557, tmdbNamespace: "movie",
  contentType: "movie", contentId: "325785", publisherId: PUBLISHER_ID,
};
const git = (...args) => execFileSync("git", args, {
  encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"],
}).trim();
const read = (file) => readFileSync(file, "utf8");
const hash = (data) => createHash("sha256").update(data).digest("hex");
const save = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
const count = (text, pattern) => (text.match(pattern) ?? []).length;

function vibixContract(show) {
  const root = show("src/app/layout.tsx");
  assert.doesNotMatch(root, /rendex-sdk|graphicslab/, "SDK must not load from the root layout");
  const movieLayout = show("src/app/movie/[slug]/layout.tsx");
  for (const url of SDK_URLS) {
    const tags = [...movieLayout.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]).filter((tag) => tag.includes(`src="${url}"`));
    assert.equal(tags.length, 1, "Movie layout must load each official SDK once: " + url);
    assert.match(tags[0], /\basync\b/, "Official SDK must be async: " + url);
  }
  assert.equal(count(movieLayout, /<script\b/g), 2, "Movie layout must not load other scripts");
  assert.doesNotMatch(show("src/app/movie/[slug]/MoviePageClient.tsx"), /rendex-sdk\.min\.js/, "Movie client must not inject SDK");
  const player = show("src/app/components/VibixPlayer.tsx");
  assert.ok(player.includes(`data-publisher-id="${PUBLISHER_ID}"`), "VibixPlayer publisher");
  for (const attribute of ["data-type", "data-id"]) assert.ok(player.includes(attribute + "="), "VibixPlayer " + attribute);
  assert.match(show("src/app/api/player/vibix/route.ts"), new RegExp(`"${PUBLISHER_ID}"`), "Lookup route publisher fallback");
  const generated = show("src/app/data/generatedKinopoiskRequested.ts");
  const base = git("show", BASE + ":src/app/data/generatedKinopoiskRequested.ts");
  for (const type of ["rendex", "collapse", "iframe"]) {
    const pattern = new RegExp(`"type": "${type}"`, "g");
    assert.equal(count(generated, pattern), count(base, pattern), "Provider entries changed: " + type);
  }
  assert.equal(count(generated, /"publisherId": "/g), count(generated, new RegExp(`"publisherId": "${PUBLISHER_ID}"`, "g")), "Foreign publisher in data");
  assert.equal(count(generated, /"id": "rendex-325785"/g), 1, "Spider-Man verified Vibix entry");
  assert.equal(count(generated, /rendex-4904|"contentId": "4904"/g), 0, "Superseded Spider-Man mapping");
  assert.deepEqual(JSON.parse(show("src/app/data/verifiedVibixMappings.json")).map(({ evidence, ...rest }) => {
    assert.ok(evidence);
    return rest;
  }), [SPIDER_MAN], "Verified Vibix mappings");
  return { publisherId: PUBLISHER_ID, sdk: { routeScoped: "src/app/movie/[slug]/layout.tsx", urls: SDK_URLS, rootLayout: "ABSENT" },
    providers: "UNCHANGED_COUNTS", verifiedMappings: 1 };
}

// Admin and profile never render in a document where the movie-only SDK already executed.
function hardeningContract(show) {
  assert.match(show("src/app/admin/layout.tsx"),
    /<CleanDocumentGuard>\s*<AdminAccessGuard>\{children\}<\/AdminAccessGuard>\s*<\/CleanDocumentGuard>/, "Admin must render through CleanDocumentGuard");
  assert.match(show("src/app/profile/layout.tsx"), /<CleanDocumentGuard>\{children\}<\/CleanDocumentGuard>/, "Profile must render through CleanDocumentGuard");
  const guard = show("src/app/components/CleanDocumentGuard.tsx");
  assert.match(guard, /^"use client";/, "Guard must be a client component");
  assert.match(guard, /window\.location\.reload\(\)/, "Guard must start a fresh document");
  const detector = show("src/app/lib/thirdPartySdk.ts");
  for (const marker of ["RendexSDK", "GlareGraphics", "__RENDEX_SDK_V2_LOADED__", "graphicslab.io"]) {
    assert.ok(detector.includes(marker), "SDK detector must cover " + marker);
  }
  return { guardedRoutes: ["/admin", "/profile"], mechanism: "reload into a fresh document after the SDK ran",
    legacyPlayers: "unrepresentable saved records preserved by the admin editor" };
}

function playerOrderContract(show) {
  const page = show("src/app/movie/[slug]/MoviePageClient.tsx");
  assert.match(page, /mergePlayerOptions\(generatedPlayers, currentVibixPlan\.players, retainedPlayers\)/, "Collapse must stay primary");
  assert.match(page, /return normalizePlayerButtonNames\(mergedPlayers\)\.slice\(0, 2\);/, "At most two players");
  return { primary: "collapse", firstBackup: "vibix", maxPlayers: 2 };
}

function sourceGate(local) {
  const ref = "HEAD";
  if (!local) assert.equal(process.env.GITHUB_REF_NAME ?? git("branch", "--show-current"), BRANCH);
  assert.equal(git("rev-parse", BASE + "^{tree}"), BASE_TREE, "Wrong base tree");
  git("merge-base", "--is-ancestor", BASE, "HEAD");
  assert.equal(git("merge-base", BASE, "HEAD"), BASE, "Wrong merge base");
  const commits = git("rev-list", "--reverse", BASE + "..HEAD").split("\n");
  assert.equal(commits[0], RELEASE_COMMIT, "First commit after base must be the reviewed Vibix commit");
  const followUpFiles = [...CI_FILES, ...Object.keys(HARDENING_BLOBS), ...Object.keys(PLAYER_ORDER_BLOBS)];
  let hardeningCommitted = false;
  let playerOrderCommitted = false;
  let parent = BASE;
  for (const [index, commit] of commits.entries()) {
    assert.equal(git("show", "-s", "--format=%P", commit), parent, "Merges are forbidden");
    if (index > 0) {
      const repaired = git("diff", "--name-only", parent, commit).split("\n");
      assert.ok(repaired.every((file) => followUpFiles.includes(file)), "Only CI repairs and reviewed fixes after release commit");
      if (repaired.some((file) => HARDENING_BLOBS[file])) hardeningCommitted = true;
      if (repaired.some((file) => PLAYER_ORDER_BLOBS[file])) playerOrderCommitted = true;
    }
    parent = commit;
  }
  const committedCi = commits.length > 1;
  // Locally the CI files are reviewed as uncommitted additions before the CI commit exists.
  if (local && !committedCi) for (const file of CI_FILES) assert.ok(existsSync(file), "Missing CI file: " + file);
  else assert.ok(committedCi, "CI files must be committed for a release run");
  // Locally the hardening is reviewed in the working tree (normalized blobs) before its commit exists.
  if (!hardeningCommitted) {
    assert.ok(local, "Hardening must be committed for a release run");
    for (const [file, blob] of Object.entries(HARDENING_BLOBS)) {
      assert.equal(git("hash-object", "--", file), blob, "Unreviewed hardening edit: " + file);
    }
  }
  if (!playerOrderCommitted) {
    assert.ok(local, "Player order fix must be committed for a release run");
    for (const [file, blob] of Object.entries(PLAYER_ORDER_BLOBS)) {
      assert.equal(git("hash-object", "--", file), blob, "Unreviewed player order edit: " + file);
    }
  }
  const pinned = { ...APP_BLOBS, ...(hardeningCommitted ? HARDENING_BLOBS : {}),
    ...(playerOrderCommitted ? PLAYER_ORDER_BLOBS : {}) };
  const files = [...new Set([...Object.keys(pinned), ...(committedCi ? CI_FILES : [])])].sort();
  const rows = git("diff", "--no-renames", "--name-status", BASE, ref).split("\n").map((row) => row.split("\t"));
  assert.deepEqual(rows.map(([, file]) => file).sort(), files, "Unexpected or missing release file");
  for (const [status, file] of rows) {
    assert.equal(status, MODIFIED.includes(file) ? "M" : "A", "Deletion/rename/type change: " + file);
    assert.ok(!PROTECTED.includes(file) && !PROTECTED_PREFIXES.some((prefix) => file.startsWith(prefix)), "Protected file changed: " + file);
    assert.match(git("ls-tree", ref, "--", file), /^100644 blob /, "Non-regular source file");
    const content = git("show", ref + ":" + file);
    // Report filenames only; never emit a suspected secret.
    assert.ok(!/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|(?:gh[pousr]_|github_pat_|sb_secret_)[A-Za-z0-9_]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content),
      "Credential material: " + file);
    assert.ok(!/(?:api[_-]?key|access[_-]?token|service[_-]?role[_-]?key|bearer)\s*[:=]?\s*["'][a-zA-Z0-9_-]{24,}["']/i.test(content),
      "Literal credential: " + file);
    if (pinned[file]) assert.equal(git("rev-parse", ref + ":" + file), pinned[file], "Unreviewed application edit: " + file);
  }
  const tracked = git("ls-tree", "-r", "--name-only", ref).split("\n");
  assert.ok(!tracked.some((file) => /(^|\/)(\.env(?:\..*)?|\.deploy-temp|\.qa-tmp|\.claude)(\/|$)/.test(file)), "Forbidden tracked runtime/config file");
  let demoPublisher = "";
  try { demoPublisher = git("grep", "-l", "674953133", ref, "--", "src"); } catch { /* git grep exits 1 when nothing matches */ }
  assert.equal(demoPublisher, "", "Vibix demo publisher in source");
  const vibix = vibixContract((file) => git("show", ref + ":" + file));
  const hardening = { ...hardeningContract(hardeningCommitted ? (file) => git("show", ref + ":" + file) : read),
    committed: hardeningCommitted, files: Object.keys(HARDENING_BLOBS) };
  const playerOrder = { ...playerOrderContract(playerOrderCommitted ? (file) => git("show", ref + ":" + file) : read),
    committed: playerOrderCommitted, files: Object.keys(PLAYER_ORDER_BLOBS) };
  const diff = execFileSync("git", ["diff", "--binary", BASE, ref], { maxBuffer: 64 * 1024 * 1024 });
  const report = {
    schemaVersion: 1, releaseName: "kinoluma-vibix-linux-candidate",
    baseCommit: BASE, approvedRecoveryTreeSha1: BASE_TREE, baseIsAncestor: true,
    mergeBase: BASE, releaseCommit: git("rev-parse", "HEAD"), reviewedVibixCommit: RELEASE_COMMIT,
    releaseTreeSha1: git("rev-parse", "HEAD^{tree}"), local, ciFilesCommitted: committedCi,
    changedFiles: files, changedAppFiles: Object.keys(pinned).sort(),
    changedAppFilesCount: Object.keys(pinned).length, trackedDiffSha256: hash(diff),
    protectedSource: { posterRc: "UNCHANGED", seo: "UNCHANGED", batchE3: "ABSENT", episodeGuides: "UNCHANGED",
      canonicalIdentity: "UNCHANGED", rootLayout: "UNCHANGED", lockfile: "UNCHANGED", mobileUx: "UNCHANGED" },
    vibix, hardening, playerOrder,
    batchB: { totalImageMutations: 481, inheritedUnchangedFrom: BASE },
    manualOverrides: { preserved: 9, note: "Inherited source evidence; DB not queried" },
    credits: { inheritedFrom: BASE, allowlistedCards: 369 },
    the100: { slug: "the-100-2014", seasons: 7, episodes: 100, inheritedUnchangedFrom: BASE },
    knownLimits: ["localhost playback blocked by provider", "admin UI not browser-verified",
      "SDK runs first-party on movie pages (isolated-origin player not implemented)",
      "home sign-in modal not guarded after SPA navigation from a movie page"],
    errors: [], pass: true,
  };
  save(process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : "vibix-source-verification.json", report);
  console.log("VIBIX_SOURCE=PASS files=" + files.length + (local ? " (local)" : ""));
}

async function providerGate() {
  const { requireLocal } = await import("../../scripts/episode-guides/register-local.mjs");
  const { parsePlayerText } = requireLocal("../../src/app/lib/players.ts");
  const players = parsePlayerText([
    "Collapse | collapse | kp | 838",
    "Запасной | iframe | https://example.com/embed/1",
    "Vibix | rendex | movie | 325785",
    "Vibix KP | rendex | kp | 838",
    "Vibix IMDb | rendex | imdb | tt0145487",
  ].join("\n"));
  assert.deepEqual(players.map(({ type, contentType, contentId }) => [type, contentType ?? null, contentId ?? null]), [
    ["collapse", "kp", "838"], ["iframe", null, null], ["rendex", "movie", "325785"],
    ["rendex", "kp", "838"], ["rendex", "imdb", "tt0145487"],
  ], "Player parser must keep every provider");
  assert.ok(players.filter(({ type }) => type === "rendex").every(({ publisherId }) => publisherId === PUBLISHER_ID));
  console.log("VIBIX_PROVIDERS=PASS collapse/iframe/rendex(movie,kp,imdb)");
}

async function lintGate() {
  const { ESLint } = await import("eslint");
  const eslint = new ESLint();
  const files = [...new Set([...Object.keys(APP_BLOBS), ...Object.keys(HARDENING_BLOBS),
    ...Object.keys(PLAYER_ORDER_BLOBS), CI_FILES[0]])]
    .filter((file) => /\.(?:ts|tsx|mjs)$/.test(file));
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
  for (const file of walk(root)) {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    assert.ok(!/(^|\/)(\.env(?:\..*)?|\.qa-tmp|\.deploy-temp|\.claude)(\/|$)/.test(relative), "Forbidden artifact config");
    assert.ok(!/^(?:scripts|src|docs|\.github)\//.test(relative), "Source/test files in artifact");
    const resolved = realpathSync(file);
    assert.ok(resolved.startsWith(root + path.sep), "Escaping artifact symlink");
    if (!lstatSync(file).isSymbolicLink() && /\.(?:js|json|html|rsc)$/.test(file) && !relative.startsWith("node_modules/")) {
      assert.ok(!/synthetic-test-token|kinoluma-offline-qa|local-qa-placeholder|\.qa-tmp\/harness|674953133/.test(read(file)), "QA fixture or foreign publisher in artifact");
    }
  }
  const client = walk(path.join(root, ".next/static")).filter((file) => file.endsWith(".js")).map(read).join("\n");
  assert.ok(!/SUPABASE_SERVICE_ROLE_KEY|TMDB_API_KEY|TMDB_ACCESS_TOKEN|VIBIX_API_TOKEN|EXIIM_API_TOKEN|RENDEX_API_TOKEN|KINOPOISK_API_KEY|KINOPOISK_DEV_TOKEN|sb_secret_/.test(client), "Privileged client marker");
  assert.ok(client.includes(PUBLISHER_ID), "VibixPlayer publisher missing from client bundle");
  assert.ok(read(path.join(root, ".next/BUILD_ID")).trim());
  assert.ok(read(path.join(root, "server.js")).includes("next"));
  console.log("STANDALONE_VIBIX_PAYLOAD=PASS");
}

function flightText(html) {
  return [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)/g)].map((match) => JSON.parse(match[1])).join("");
}

async function runtimeGate() {
  const origin = process.argv[3] ?? "http://127.0.0.1:3100";
  assert.equal(new URL(origin).hostname, "127.0.0.1", "Runtime QA must stay loopback");
  const cards = [
    { slug: "chelovek-pauk-2002", plan: "verified", contentId: "325785" },
    { slug: "banshi-2013", plan: "legacy_unverified", contentId: "782" },
    { slug: "attack-on-titan", plan: "external", contentId: "749374" },
  ];
  for (const card of cards) {
    const response = await fetch(origin + "/movie/" + card.slug, { redirect: "error" });
    assert.equal(response.status, 200, card.slug);
    const html = await response.text();
    assert.ok(html.includes('rel="canonical" href="https://kinoluma.online/movie/' + card.slug + '"'), card.slug + " canonical");
    const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? "";
    for (const url of SDK_URLS) {
      const tags = [...head.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]).filter((tag) => tag.includes(`src="${url}"`));
      assert.equal(tags.length, 1, card.slug + " SDK in head once: " + url);
      assert.match(tags[0], /\basync=""/, card.slug + " SDK async");
    }
    const flight = flightText(html);
    assert.ok(flight.includes(`"status":"${card.plan}"`), card.slug + " Vibix plan " + card.plan);
    assert.ok(flight.includes(`"contentId":"${card.contentId}"`) && flight.includes(`"publisherId":"${PUBLISHER_ID}"`), card.slug + " Vibix identity");
    assert.ok(!/NEXT_HTTP_ERROR_FALLBACK;500/.test(flight), "Server render failed: " + card.slug);
  }
  const outside = {};
  for (const route of ["/", "/catalog/films", "/profile", "/admin/import"]) {
    const response = await fetch(origin + route, { redirect: "manual" });
    const html = await response.text();
    // Serialized player data may mention scriptSrc; only actual script/preload tags load the SDK.
    assert.ok(!/<(?:script|link)\b[^>]*rendex-sdk/.test(html), "SDK leaked outside movie pages: " + route);
    // A fresh document renders guarded routes directly; the reload placeholder is client-only.
    assert.ok(!html.includes("Открываю страницу"), "Clean-document guard placeholder in SSR: " + route);
    outside[route] = response.status;
  }
  const sitemap = await (await fetch(origin + "/sitemap.xml")).text();
  for (const { slug } of cards) assert.ok(sitemap.includes("https://kinoluma.online/movie/" + slug), "Sitemap " + slug);
  const invalid = await fetch(origin + "/api/player/vibix");
  assert.equal(invalid.status, 400, "Lookup without IDs");
  const unconfigured = await fetch(origin + "/api/player/vibix?kpId=838");
  assert.equal(unconfigured.status, 503, "Lookup without server token");
  assert.equal((await unconfigured.json()).status, "unconfigured");
  assert.match(unconfigured.headers.get("cache-control") ?? "", /no-store/);
  save("vibix-runtime.json", { pass: true, cards, sdkAbsentOn: outside, sitemap: "PASS",
    lookup: { invalid: 400, unconfigured: 503 }, network: "loopback-only Linux namespace" });
  console.log("VIBIX_SSR=PASS cards=" + cards.length + " sdkScoped=movie-only lookup=400/503");
}

switch (process.argv[2]) {
  case "source": sourceGate(process.argv.includes("--local")); break;
  case "providers": await providerGate(); break;
  case "lint": await lintGate(); break;
  case "artifact": artifactGate(process.argv[3] ?? "release"); break;
  case "runtime": await runtimeGate(); break;
  default: throw new Error("Expected source|providers|lint|artifact|runtime");
}
