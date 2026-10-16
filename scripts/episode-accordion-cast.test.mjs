import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const root = new URL("../", import.meta.url);

function loadLocalTypeScript(relativePath, modules = {}) {
  const source = readFileSync(new URL(relativePath, root), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  const requireLocal = (specifier) => {
    if (!(specifier in modules)) throw new Error(`Unexpected import: ${specifier}`);
    return modules[specifier];
  };
  new Function("require", "module", "exports", compiled)(requireLocal, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const inlineCredits = {
  provenance: "TMDB_ONLY",
  seriesCreators: ["Jason Rothenberg"],
  actors: [{ name: "Eliza Taylor", role: "Clarke Griffin" }],
};
const baseMovie = {
  canonicalMovieId: "manual-the-100",
  slug: "the-100-2014",
  type: "Сериал",
  tmdbNamespace: "tv",
  tmdbId: 48866,
  imdbId: "tt2661044",
  kinopoiskId: 733493,
  verifiedCredits: inlineCredits,
};

const emptyGeneratedCredits = { generatedCanonicalCredits: [] };
const { attachVerifiedCredits } = loadLocalTypeScript(
  "src/app/lib/movies/verifiedCredits.ts",
  { "../../data/generatedCanonicalCredits": emptyGeneratedCredits },
);

const preserved = attachVerifiedCredits(baseMovie, null);
assert.deepEqual(preserved.verifiedCredits, inlineCredits);
assert.equal(preserved.verifiedCredits.actors[0].role, "Clarke Griffin");

const manualOverride = attachVerifiedCredits(baseMovie, { facts: [{ label: "Создатель", value: "Manual" }] });
assert.equal(manualOverride.verifiedCredits, undefined);

const generatedCredits = {
  generatedCanonicalCredits: [{
    canonicalMovieId: "manual-the-100",
    slug: "the-100-2014",
    contentType: "series",
    tmdbNamespace: "tv",
    tmdbId: 48866,
    imdbId: "tt2661044",
    kinopoiskId: 733493,
    provenance: "FULLY_VERIFIED",
    fields: { actors: [{ name: "Generated Actor", role: "Verified Role" }] },
  }],
};
const generatedModule = loadLocalTypeScript(
  "src/app/lib/movies/verifiedCredits.ts",
  { "../../data/generatedCanonicalCredits": generatedCredits },
);
assert.deepEqual(generatedModule.attachVerifiedCredits(baseMovie, null).verifiedCredits.actors, [
  { name: "Generated Actor", role: "Verified Role" },
]);

const moviePage = readFileSync(
  new URL("src/app/movie/[slug]/MoviePageClient.tsx", root),
  "utf8",
);
assert.match(moviePage, /aria-expanded=\{isOpen\}/);
assert.match(moviePage, /aria-controls=\{panelId\}/);
assert.match(moviePage, /grid-template-rows:\s*0fr/);
assert.match(moviePage, /grid-template-rows:\s*1fr/);
assert.match(moviePage, /grid-template-rows 300ms ease/);
assert.match(moviePage, /opacity 250ms ease/);
assert.match(moviePage, /prefers-reduced-motion:\s*reduce/);
assert.match(moviePage, /episode-season-trigger\[aria-expanded="true"\]/);

console.log("EPISODE_ACCORDION_CAST=PASS");
