#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    });
    module._compile(compiled.outputText, filename);
  };
}
const catalogMovies = require("../src/app/data/movies.ts").movies;
if (catalogMovies.length !== 2000) throw new Error("Unexpected production catalog size");
const catalogById = new Map(catalogMovies.map((movie) => [movie.canonicalMovieId, movie]));

const [reportPath, registryPath, historicalPath, tmdbPath, eligibilityPath, planPath, generatedPath] = process.argv.slice(2);
if (!generatedPath) throw new Error("Expected report, registry, historical journal, TMDB journal, eligibility, plan and generated output paths");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readSource = async (path) => {
  const text = await readFile(path, "utf8");
  return { text, sha256: sha256(text) };
};
const [reportSource, registrySource, historicalSource, tmdbSource, eligibilitySource] = await Promise.all(
  [reportPath, registryPath, historicalPath, tmdbPath, eligibilityPath].map(readSource),
);
if (historicalSource.sha256 !== "7239a133cbd3f4dfd3cca8b84ac8b5295d22cb7e75d95d5c2b5b54bdeed1f801" ||
    tmdbSource.sha256 !== "f79540df0632545dad26568ccaaa3abb8481c1fe61066d455935afe8b844844e") {
  throw new Error("Approved journal SHA-256 mismatch");
}
const report = JSON.parse(reportSource.text);
const eligibility = JSON.parse(eligibilitySource.text);
if (report.sourceCommit !== "e6ec7708720e8c1e228d77daa331ccf0f4574615" || report.records?.length !== 665) {
  throw new Error("Unexpected C.2 report baseline");
}
const registry = registrySource.text.split(/\r?\n/)
  .filter((line) => /^\s+\["[a-f0-9-]{36}",/.test(line))
  .map((line) => JSON.parse(line.trim().replace(/,$/, "")));
if (registry.length !== 2000) throw new Error("Unexpected canonical registry size");
const registryById = new Map(registry.map((tuple) => [tuple[0], tuple]));
const reportById = new Map(report.records.map((row) => [row.canonicalMovieId, row]));
const parseJournal = (text) => text.split(/\r?\n/).filter(Boolean).map(JSON.parse);
const historical = parseJournal(historicalSource.text);
const tmdb = parseJournal(tmdbSource.text);
const tmdbDetailsByKey = new Map([...historical, ...tmdb]
  .filter((item) => item.type === "checkpoint" && item.key?.startsWith("tmdb-details:"))
  .map((item) => [item.key, item.value]));
const terminal = (items) => items.filter((item) => item?.canonicalMovieId && item?.status);
const historicalTerminal = terminal(historical);
const tmdbTerminal = terminal(tmdb);
if (historicalTerminal.length !== 200 || tmdbTerminal.length !== 353) throw new Error("Incomplete C.2 journal");
if (eligibility.sourceCommit !== report.sourceCommit || eligibility.counts?.A !== 353 ||
    eligibility.sourceHashes?.registry !== registrySource.sha256 ||
    eligibility.sourceHashes?.journal !== historicalSource.sha256) {
  throw new Error("Eligibility provenance gate failed");
}
const eligibilityById = new Map(eligibility.entries.filter((entry) => entry.lane === "A")
  .map((entry) => [entry.canonicalMovieId, entry]));
for (const result of tmdbTerminal) {
  const row = reportById.get(result.canonicalMovieId);
  const entry = eligibilityById.get(result.canonicalMovieId);
  if (!row || !entry || entry.slug !== row.slug || entry.reasons?.length ||
      entry.identity?.contentType !== row.contentType ||
      entry.identity?.tmdbNamespace !== row.providerIds.tmdbNamespace ||
      entry.identity?.tmdbId !== row.providerIds.tmdbId ||
      entry.identity?.imdbId !== row.providerIds.imdbId ||
      entry.identity?.kinopoiskId !== row.providerIds.kinopoiskId) {
    throw new Error(`TMDB-only eligibility mismatch: ${result.slug}`);
  }
}
const allTerminal = [...historicalTerminal, ...tmdbTerminal];
if (new Set(allTerminal.map((item) => item.canonicalMovieId)).size !== 553) {
  throw new Error("Duplicate canonical identity across C.2 journals");
}
const manualClear = new Map([...historical, ...tmdb]
  .filter((item) => item.type === "checkpoint" && item.key?.startsWith("manual-override:"))
  .map((item) => [item.key.slice("manual-override:".length), item.value?.touchesCredits]));

const normalizeNames = (items, limit) => {
  const seen = new Set();
  return (items ?? []).map((item) => String(item?.name ?? "").trim()).filter((name) => {
    const key = name.toLocaleLowerCase("ru-RU");
    if (!name || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
};
const normalizeActors = (items) => {
  const seen = new Set();
  return (items ?? []).map((item) => ({ name: String(item?.name ?? "").trim(), role: String(item?.role ?? "").trim() }))
    .filter((item) => {
      const key = `${item.name.toLocaleLowerCase("ru-RU")}\0${item.role.toLocaleLowerCase("ru-RU")}`;
      if (!item.name || /\bvoice\b|озвуч/i.test(item.role) || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12);
};
const eligible = [];
const excluded = { REVIEW: 0, BLOCKED: 0, IDENTITY_MISMATCH: 0, PENDING_CROSSCHECK: 0, NO_APPLICABLE_FIELDS: 0 };
let historicalVerifiedWithoutCheckpoint = 0;
for (const result of allTerminal) {
  if (result.status !== "VERIFIED_CANDIDATE") {
    if (result.status === "IDENTITY_MISMATCH") excluded.IDENTITY_MISMATCH += 1;
    else if (result.status.startsWith("BLOCKED") || result.status === "MANUAL_OVERRIDE_CONFLICT") excluded.BLOCKED += 1;
    else excluded.REVIEW += 1;
    continue;
  }
  if (result.poiskKinoCrossCheck === "PENDING") {
    excluded.PENDING_CROSSCHECK += 1;
    continue;
  }
  const row = reportById.get(result.canonicalMovieId);
  const tuple = registryById.get(result.canonicalMovieId);
  const catalogMovie = catalogById.get(result.canonicalMovieId);
  const ids = row?.providerIds;
  const fromTmdbOnly = result.provenance === "TMDB_ONLY";
  const manualState = manualClear.get(result.slug);
  // The earliest historical pilot saved terminal decisions before its override
  // checkpoints were persisted. A VERIFIED terminal still proves that its
  // override gate passed; runtime overrides are checked again before display.
  if (!row || !tuple || !catalogMovie || result.slug !== row.slug || catalogMovie.slug !== row.slug || manualState === true ||
      (fromTmdbOnly && manualState !== false) ||
      row.localIdentity !== "MATCHED_TO_REGISTRY_ONLY" || row.aliasCollisions?.length ||
      tuple[1] !== row.slug || tuple[2] !== row.legacyNumericId || tuple[3] !== row.contentType ||
      (ids.tmdbId && tuple[4] !== ids.tmdbNamespace) || tuple[5] !== ids.tmdbId ||
      tuple[6] !== ids.imdbId || tuple[7] !== ids.kinopoiskId) {
    throw new Error(`Canonical identity or manual override gate failed: ${result.slug}`);
  }
  if (!fromTmdbOnly && manualState === undefined) historicalVerifiedWithoutCheckpoint += 1;
  if (fromTmdbOnly !== tmdbTerminal.includes(result) ||
      (fromTmdbOnly && (result.poiskKinoCrossCheck !== "NOT_APPLICABLE" || ids.kinopoiskId))) {
    throw new Error(`Provenance or cross-check gate failed: ${result.slug}`);
  }
  const resolvedTmdb = result.identity?.tmdb;
  const resolvedKp = result.identity?.kinopoisk;
  if ((!resolvedTmdb && !resolvedKp) ||
      (resolvedTmdb && (ids.tmdbId && resolvedTmdb.id !== ids.tmdbId ||
        ids.tmdbNamespace && resolvedTmdb.namespace !== ids.tmdbNamespace)) ||
      (resolvedKp && resolvedKp.id !== ids.kinopoiskId) ||
      (ids.tmdbId && !resolvedTmdb && ids.kinopoiskId && !resolvedKp)) {
    throw new Error(`Provider identity gate failed: ${result.slug}`);
  }
  const namespace = resolvedTmdb?.namespace ?? ids.tmdbNamespace ?? tuple[4];
  if ((row.contentType === "film" && namespace !== "movie") ||
      (row.contentType === "series" && namespace !== "tv") ||
      (namespace !== "movie" && namespace !== "tv")) {
    throw new Error(`Movie/TV namespace gate failed: ${result.slug}`);
  }
  const tmdbBody = resolvedTmdb && tmdbDetailsByKey.get(`tmdb-details:${resolvedTmdb.namespace}:${resolvedTmdb.id}`)?.body;
  const tmdbDirectors = tmdbBody?.credits?.crew?.filter((person) => person.job === "Director") ?? [];
  const tmdbCreators = tmdbBody?.created_by ?? [];
  const directors = namespace === "movie" && row.missing.production
    ? normalizeNames(tmdbDirectors.length ? tmdbDirectors : result.proposal?.directors, 8) : [];
  const seriesCreators = namespace === "tv" && row.missing.production
    ? normalizeNames(tmdbCreators.length ? tmdbCreators : result.proposal?.creators, 8) : [];
  const isAnimation = row.contentType === "anime" || row.contentType === "cartoon" ||
    (catalogMovie.genres ?? []).some((genre) => /анимац|мульт/i.test(genre));
  const actors = row.missing.performers && !isAnimation
    ? normalizeActors(result.proposal?.actors) : [];
  if (!directors.length && !seriesCreators.length && !actors.length) {
    excluded.NO_APPLICABLE_FIELDS += 1;
    continue;
  }
  eligible.push({
    canonicalMovieId: result.canonicalMovieId,
    slug: row.slug,
    contentType: row.contentType,
    tmdbNamespace: ids.tmdbNamespace,
    tmdbId: ids.tmdbId,
    imdbId: ids.imdbId,
    kinopoiskId: ids.kinopoiskId,
    // Provenance describes actual provider evidence, not merely the journal lane.
    provenance: fromTmdbOnly || resolvedTmdb && !resolvedKp ? "TMDB_ONLY" : "FULLY_VERIFIED",
    fields: {
      ...(directors.length ? { directors } : {}),
      ...(seriesCreators.length ? { seriesCreators } : {}),
      ...(actors.length ? { actors } : {}),
    },
  });
}
eligible.sort((a, b) => a.canonicalMovieId.localeCompare(b.canonicalMovieId));
const counts = (field) => ({
  cards: eligible.filter((entry) => entry.fields[field]?.length).length,
  people: eligible.reduce((sum, entry) => sum + (entry.fields[field]?.length ?? 0), 0),
});
const plan = {
  schemaVersion: 1,
  sourceCommit: report.sourceCommit,
  sourceSha256: {
    report: reportSource.sha256,
    registry: registrySource.sha256,
    historicalJournal: historicalSource.sha256,
    tmdbOnlyJournal: tmdbSource.sha256,
    tmdbOnlyEligibility: eligibilitySource.sha256,
  },
  sourceClaimNotes: eligibility.sourceHashes.report === reportSource.sha256
    ? [] : ["Eligibility recorded an older report SHA-256; all 353 A entries were matched field by field to this report and registry."],
  limits: { directorNames: 8, creatorNames: 8, castMembers: 12 },
  summary: {
    processed: allTerminal.length,
    eligible: eligible.length,
    provenance: {
      FULLY_VERIFIED: eligible.filter((entry) => entry.provenance === "FULLY_VERIFIED").length,
      TMDB_ONLY: eligible.filter((entry) => entry.provenance === "TMDB_ONLY").length,
    },
    fields: { directors: counts("directors"), seriesCreators: counts("seriesCreators"), actors: counts("actors") },
    historicalVerifiedWithoutOverrideCheckpoint: historicalVerifiedWithoutCheckpoint,
    excluded,
  },
  allowlist: eligible,
};
await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
const generated = [
  "// Generated by scripts/generate-batch-c3-credits.mjs. Do not edit by hand.",
  `// Source commit: ${report.sourceCommit}; plan entries: ${eligible.length}.`,
  "",
  'export type GeneratedCanonicalCreditsEntry = {',
  '  canonicalMovieId: string;',
  '  slug: string;',
  '  contentType: "film" | "series" | "anime" | "cartoon" | "documentary";',
  '  tmdbNamespace: "movie" | "tv" | null;',
  '  tmdbId: number | null;',
  '  imdbId: string | null;',
  '  kinopoiskId: number | null;',
  '  provenance: "FULLY_VERIFIED" | "TMDB_ONLY";',
  '  fields: { directors?: readonly string[]; seriesCreators?: readonly string[]; actors?: readonly { name: string; role: string }[] };',
  '};',
  "",
  "export const generatedCanonicalCredits: readonly GeneratedCanonicalCreditsEntry[] = [",
  ...eligible.map((entry) => `  ${JSON.stringify(entry)},`),
  "];",
  "",
].join("\n");
await writeFile(generatedPath, generated);
console.log(JSON.stringify({ planSha256: sha256(`${JSON.stringify(plan, null, 2)}\n`), ...plan.summary }));
