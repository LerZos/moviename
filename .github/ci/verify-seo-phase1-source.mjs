import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, lstatSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = "76549faafd2b48dd515b40471f1be68e5102b2c8";
const BASE_TREE = "b98efed1bfd92dc72558957dc4e5f2a933c42767";
const BRANCH = "release/seo-phase1-20261101";
// Exact reviewed SEO Phase 1 Git blobs. CI-only repairs cannot alter application code.
const APP_BLOBS = {
  "src/app/HomeClient.tsx": "17b373f35af729484e237509ac8cea770606d570",
  "src/app/catalog/[category]/CatalogPageClient.tsx": "fa23bf0b3e42bad83e74d3a7ac3ed13668b029c4",
  "src/app/loading.tsx": "ca591f6779e6e3b481e3d2cd64579fb98ab73eb6",
  "scripts/seo-crawlable-links.test.mjs": "d58aadf29d839bfe00aa28a29a00254da351cfbf",
};
const CI_FILES = [
  ".github/ci/verify-seo-phase1-source.mjs",
  ".github/workflows/seo-phase1-linux-release.yml",
];
const MODIFIED = [
  "src/app/HomeClient.tsx",
  "src/app/catalog/[category]/CatalogPageClient.tsx",
  "src/app/loading.tsx",
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
  // Vibix, Admin Rating, Poster, Mobile UX, catalog data, overrides, lockfile and old CI
  // are protected by the exact full-tree diff above.
  const tracked = git("ls-tree", "-r", "--name-only", ref).split("\n");
  assert.ok(!tracked.some((file) => /(^|\/)(\.env(?:\..*)?|\.claude|\.deploy-temp|\.qa-tmp)(\/|$)/.test(file)), "Forbidden tracked runtime/config file");
  const diff = execFileSync("git", ["diff", "--binary", BASE, ref], { maxBuffer: 32 * 1024 * 1024 });
  const report = {
    schemaVersion: 1, releaseName: "kinoluma-seo-phase1-linux-candidate",
    baseCommit: BASE, approvedBaseTreeSha1: BASE_TREE, baseIsAncestor: true,
    mergeBase: BASE, releaseCommit: staged ? null : ref,
    releaseTreeSha1: staged ? ref : git("rev-parse", "HEAD^{tree}"),
    staged, changedFiles: files, changedAppFiles: Object.keys(APP_BLOBS),
    changedAppFilesCount: Object.keys(APP_BLOBS).length, trackedDiffSha256: hash(diff),
    protectedSource: { catalogData: "UNCHANGED", canonicalIdentity: "UNCHANGED", manualOverrides: "UNCHANGED",
      players: "UNCHANGED", adminRating: "UNCHANGED", posters: "UNCHANGED", metadata: "UNCHANGED",
      sitemap: "UNCHANGED", oldCI: "UNCHANGED", lockfile: "UNCHANGED" },
    seo: { movieCardAnchors: ["desktop-mock-card", "mobile-v2-card", "movie-card", "catalog-card"],
      noJsFallback: "noscript in root loading.tsx", fixedBrokenLinks: ["/anime", "/cartoon"] },
    visualParityEvidence: { desktop: "PASS", tablet: "PASS", mobile: "PASS",
      note: "Local isolated browser QA completed before release preparation; not repeated in CI." },
    errors: [], pass: true,
  };
  save(process.argv[3] ?? "seo-phase1-source-verification.json", report);
  console.log("SEO_PHASE1_SOURCE=PASS files=" + files.length);
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
  for (const file of walk(root)) {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    assert.ok(!/(^|\/)(\.env(?:\..*)?|\.claude|\.qa-tmp|\.deploy-temp)(\/|$)/.test(relative), "Forbidden artifact config");
    assert.ok(!/^(?:scripts|src|docs|\.github)\//.test(relative), "Source/test files in artifact");
    assert.ok(realpathSync(file).startsWith(root + path.sep), "Escaping artifact symlink");
    if (!lstatSync(file).isSymbolicLink() && /\.(?:js|json|html|rsc)$/.test(file) && !relative.startsWith("node_modules/")) {
      assert.ok(!/KINOLUMA_SEO_QA_ORIGIN/.test(read(file)), "QA fixture in artifact");
    }
  }
  const client = walk(path.join(root, ".next/static")).filter((file) => file.endsWith(".js")).map(read).join("\n");
  assert.ok(!/SUPABASE_SERVICE_ROLE_KEY|TMDB_API_KEY|TMDB_ACCESS_TOKEN|sb_secret_/.test(client), "Privileged client marker");
  assert.ok(read(path.join(root, ".next/BUILD_ID")).trim());
  assert.ok(read(path.join(root, "server.js")).includes("next"));
  console.log("STANDALONE_SEO_PAYLOAD=PASS");
}

async function runtimeGate() {
  const origin = process.argv[3] ?? "http://127.0.0.1:3100";
  assert.equal(new URL(origin).hostname, "127.0.0.1", "Runtime QA must stay loopback");
  const get = async (route) => {
    const response = await fetch(origin + route, { redirect: "error" });
    assert.equal(response.status, 200, route);
    return response.text();
  };
  const canonicals = {};
  for (const route of ["/", "/catalog/films", "/catalog/series", "/catalog/anime", "/catalog/cartoons"]) {
    const html = await get(route);
    // Next.js renders the root canonical as the bare origin.
    const expected = "https://kinoluma.online" + (route === "/" ? "" : route);
    assert.ok(html.includes('rel="canonical" href="' + expected + '"'), route + " canonical");
    canonicals[route] = expected;
    if (route === "/") {
      assert.ok(!/href="\/(?:anime|cartoon)"/.test(html), "Broken legacy header link restored");
      const noscript = html.match(/<noscript>[^]*?<\/noscript>/g) ?? [];
      assert.ok(noscript.some((block) => block.includes("loading-film-navigation")), "No-JS fallback must stay inside noscript");
    }
  }
  save("seo-phase1-runtime.json", { pass: true, canonicals, network: "loopback-only Linux namespace" });
  console.log("SEO_PHASE1_RUNTIME=PASS canonicals=" + Object.keys(canonicals).length);
}

switch (process.argv[2]) {
  case "source": sourceGate(process.argv.includes("--staged")); break;
  case "lint": await lintGate(); break;
  case "artifact": artifactGate(process.argv[3] ?? "release"); break;
  case "runtime": await runtimeGate(); break;
  default: throw new Error("Expected source|lint|artifact|runtime");
}
