import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { test } from "node:test";
import { requireLocal } from "./episode-guides/register-local.mjs";
import { verifiedVibixForDocument } from "./lib/verified-vibix-mapping.mjs";

let networkAttempts = 0;
const forbidden = () => { networkAttempts++; throw new Error("NETWORK_FORBIDDEN"); };
globalThis.fetch = http.request = http.get = https.request = https.get = forbidden;
const ts = requireLocal("typescript");
const originalTsLoader = requireLocal.extensions[".ts"];
requireLocal.extensions[".ts"] = (module, filename) => {
  if (!filename.endsWith("vibixPolicy.ts")) return originalTsLoader(module, filename);
  module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
};
const { prepareVibixPlan } = requireLocal("../../src/app/lib/vibixPolicy.ts");
const { getCanonicalIdentityBySlug } = requireLocal("../../src/app/data/canonicalIdentity.ts");
const { generatedKinopoiskRequestedMovies } = requireLocal("../../src/app/data/generatedKinopoiskRequested.ts");
const { parseAdminPlayers, serializeAdminPlayers } = requireLocal("../../src/app/lib/adminPlayers.ts");
const { stablePlayerKey, selectedPlayer, mergePlayerOptions } = requireLocal("../../src/app/lib/vibix.ts");
const types = { film: "Фильм", series: "Сериал", anime: "Аниме", cartoon: "Мультфильм", documentary: "Документальный" };
function movie(slug = "chelovek-pauk-2002") {
  const identity = getCanonicalIdentityBySlug(slug);
  assert.ok(identity);
  return { ...identity, id: identity.legacyNumericId, type: types[identity.contentType],
    kinopoiskId: identity.kinopoiskId ?? undefined, imdbId: identity.imdbId ?? undefined,
    tmdbId: identity.tmdbId ?? undefined, year: "2002", players: [] };
}
const film = movie();
const sdk = { id: "manual", name: "Мой Vibix", type: "rendex", provider: "rendex",
  embedUrl: "", contentType: "movie", contentId: "325785", publisherId: "678053396", color1: "#123456" };
const iframe = { id: "frame", name: "Vibix iframe", type: "vibix-iframe", provider: "exiim",
  embedUrl: "https://exiim.cloud/embed/123?design=1" };
const collapse = { id: "collapse", name: "Другой источник", type: "collapse",
  contentId: "838", contentType: "kp", embedUrl: "https://api.ortified.ws/embed/kp/838" };

test("Spider-Man correction retains canonical/provider identity and verified SDK ID", () => {
  const entry = generatedKinopoiskRequestedMovies.find((item) => item.slug === film.slug);
  assert.equal(film.canonicalMovieId, "24dfe6d2-d725-4d21-a5bc-94f82d84cea9");
  assert.deepEqual([entry.year, entry.kinopoiskId, entry.imdbId, entry.tmdbId], ["2002", 838, "tt0145487", 557]);
  const plan = prepareVibixPlan({ ...entry, canonicalMovieId: film.canonicalMovieId });
  assert.equal(plan.status, "verified");
  assert.equal(plan.players[0].contentId, "325785");
  assert.equal(plan.players[0].contentType, "movie");
  assert.equal(plan.players[0].id, "rendex-325785");
});
test("generator guard pins the correction and fails on conflicting identity", () => {
  const doc = { id: 838, year: 2002, externalId: { imdb: "tt0145487", tmdb: 557 } };
  assert.equal(verifiedVibixForDocument(doc, "Фильм").contentId, "325785");
  for (const patch of [{year: 2023}, {externalId: {imdb:"tt999",tmdb:557}}, {externalId:{imdb:"tt0145487",tmdb:1}}]) {
    assert.throws(() => verifiedVibixForDocument({...doc,...patch}, "Фильм"), /identity conflict/);
  }
  assert.equal(verifiedVibixForDocument({ id: 1 }, "Фильм"), null);
  const generator = readFileSync(new URL("./generate-kinopoisk-requested-pack.mjs", import.meta.url), "utf8");
  assert.match(generator, /verified \? null : await findVibixVideo/);
});
test("canonical KP creates official kp SDK without API credentials", () => {
  const plan = prepareVibixPlan(film);
  assert.equal(plan.status, "external");
  assert.deepEqual([plan.players[0].contentType, plan.players[0].contentId], ["kp", "838"]);
  assert.equal(plan.players[0].publisherId, "678053396");
});
test("canonical IMDb fallback preserves tt and does not use TMDB", () => {
  const plan = prepareVibixPlan(movie("steins-gate"));
  assert.equal(plan.status, "external");
  assert.deepEqual([plan.players[0].contentType, plan.players[0].contentId], ["imdb", "tt1910272"]);
});
test("saved official KP/IMDb records are checked against registry, not labelled legacy", () => {
  for (const [contentType,contentId] of [["kp","838"],["imdb","tt0145487"]]) {
    const player = {...sdk,contentType,contentId};
    const plan = prepareVibixPlan({...film,players:[player]});
    assert.equal(plan.status,"external");
    assert.deepEqual(plan.players,[player]);
    assert.equal(prepareVibixPlan({...film,players:[{...player,contentId:contentType==="kp"?"1":"tt1"}]}).status,"identity_conflict");
  }
});
test("movie/series namespace cannot silently cross; external IDs remain external", () => {
  const series = movie("banshi-2013");
  assert.equal(prepareVibixPlan(series).players[0].contentType, "kp");
  assert.equal(prepareVibixPlan({...series,players:[sdk]}).status, "identity_conflict");
  assert.equal(prepareVibixPlan({...film,players:[{...sdk,contentType:"series"}]}).status, "identity_conflict");
});
test("missing identity never generates an ID from title or TMDB", () => {
  const plan = prepareVibixPlan({ ...film, slug: "unknown-title", canonicalMovieId: undefined, tmdbId: 325785 });
  assert.equal(plan.status, "unverified_identity");
  assert.deepEqual(plan.players, []);
});
test("conflicting canonical UUID, KP, IMDb, TMDB or type fail closed", () => {
  for (const patch of [{canonicalMovieId:"wrong"}, {kinopoiskId:1}, {imdbId:"tt999"}, {tmdbId:1}, {tmdbNamespace:"tv"}, {type:"Сериал"}]) {
    assert.equal(prepareVibixPlan({...film,...patch}).status, "identity_conflict");
  }
});
test("legacy unverified mapping is preserved, never promoted to manual proof", () => {
  const legacy = {...sdk, contentId:"4904"};
  const plan = prepareVibixPlan({...film,players:[legacy]});
  assert.equal(plan.status, "legacy_unverified");
  assert.deepEqual(plan.players, [legacy]);
  assert.equal(legacy.vibixProvenance, undefined);
});
test("explicitly labelled generated mapping may yield to verified external identity", () => {
  const generated = {...sdk,contentId:"4904",vibixProvenance:{source:"legacy-generated"}};
  const plan = prepareVibixPlan({...film,players:[generated]});
  assert.equal(plan.status, "external");
  assert.equal(plan.players[0].contentType, "kp");
});
test("explicit manual confirmation binds mapping to canonical identity and player key", () => {
  const manual = parseAdminPlayers(serializeAdminPlayers([iframe]), film.type, [iframe], film);
  const plan = prepareVibixPlan({...film, players:manual});
  assert.equal(plan.status, "verified");
  assert.equal(plan.players[0].embedUrl, iframe.embedUrl);
  assert.equal(prepareVibixPlan({...movie("banshi-2013"),players:manual}).status, "identity_conflict");
  assert.equal(prepareVibixPlan({...film,players:[{...manual[0],embedUrl:"https://exiim.cloud/embed/456"}]}).status, "identity_conflict");
});
for (const [kind,id] of [["movie","325785"],["series","782"],["kp","838"],["imdb","tt0145487"]]) {
  test(`admin round-trip: ${kind}, publisher, colors, proof and alternatives`, () => {
    const initial = [{...sdk,contentType:kind,contentId:id},iframe,collapse];
    const text = serializeAdminPlayers(initial);
    const parsed = parseAdminPlayers(text, "Фильм", initial);
    assert.deepEqual(parsed, initial);
    const plain = parseAdminPlayers(text, "Фильм");
    assert.equal(plain[0].contentType, kind);
    assert.equal(plain[0].contentId,id);
    assert.equal(plain[1].embedUrl,iframe.embedUrl);
    assert.equal(plain.length,3);
    assert.equal(serializeAdminPlayers(plain),text);
  });
}
test("admin preserves manual settings when editing another source, rejects malformed IDs", () => {
  const initial = parseAdminPlayers(serializeAdminPlayers([sdk,iframe]), film.type, [sdk,iframe], film);
  const next = parseAdminPlayers(serializeAdminPlayers(initial) + "\nЗапасной | iframe | https://example.invalid/video",film.type,initial);
  assert.deepEqual(next.slice(0,2),initial);
  assert.equal(next.length,3);
  for (const text of ["V | rendex | imdb | 123", "V | rendex | kp | -1", "V | rendex | movie | tt123", "V | vibix | http://exiim.cloud/embed/1"]) {
    assert.throws(() => parseAdminPlayers(text), /Некорректная/);
  }
  assert.equal(parseAdminPlayers("V | rendex | 782","Сериал")[0].contentType,"series");
});
test("saved manual settings and alternatives survive choice merging and SPA transitions", () => {
  const manual = parseAdminPlayers(serializeAdminPlayers([sdk]),film.type,[sdk],film);
  const selected = prepareVibixPlan({...film,players:manual}).players;
  const merged = mergePlayerOptions(selected,[collapse],[iframe]);
  assert.equal(merged.length,3);
  assert.equal(merged[0].color1,sdk.color1);
  const selection = { movieKey:"A",playerKey:stablePlayerKey(iframe) };
  assert.equal(selectedPlayer(merged,selection,"A"),iframe);
  assert.equal(selectedPlayer(merged,selection,"B"),merged[0]);
});
test("actual MoviePage passes server plan, gates lookup, retains lazy mounting and keyed remount", () => {
  const page = readFileSync(new URL("../src/app/movie/[slug]/page.tsx",import.meta.url),"utf8");
  const client = readFileSync(new URL("../src/app/movie/[slug]/MoviePageClient.tsx",import.meta.url),"utf8");
  assert.match(page,/vibixPlan=\{prepareVibixPlan\(movie\)\}/);
  assert.match(client,/enabled: !vibixPlan && isPlayerVisible/);
  assert.match(client,/vibixPlan\?\.movieKey === movieKey/);
  assert.match(client,/visibleMovieKey === movieKey/);
  assert.match(client,/VibixPlayer key=\{\x60\$\{movieKey\}/);
  const admin = readFileSync(new URL("../src/app/admin/movies/[slug]/edit/MovieAdminEditForm.tsx",import.meta.url),"utf8");
  assert.match(admin,/parseAdminPlayers\(/);
  assert.match(admin,/formData.get\("verifyVibix"\) === "on"/);
});
test("no network was attempted",()=>assert.equal(networkAttempts,0));
