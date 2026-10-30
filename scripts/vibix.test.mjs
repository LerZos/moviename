import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { test } from "node:test";
import { requireLocal } from "./episode-guides/register-local.mjs";

let networkAttempts = 0;
const forbidden = () => { networkAttempts++; throw new Error("NETWORK_FORBIDDEN"); };
globalThis.fetch = forbidden;
http.request = http.get = https.request = https.get = forbidden;
const lib = requireLocal("../../src/app/lib/vibix.ts");
const players = requireLocal("../../src/app/lib/players.ts");
const { lookupVibix } = requireLocal("../../src/app/lib/vibixLookup.ts");
const ts = requireLocal("typescript");
const saved = { id: "saved", name: "Vibix", type: "vibix-iframe", provider: "exiim", embedUrl: "https://exiim.cloud/embed/123" };
const other = { id: "collapse", name: "Collapse", type: "collapse", embedUrl: "https://api.ortified.ws/embed/kp/326" };
const fixture = { id: 123, type: "movie", kp_id: 326, imdb_id: "tt0111161", iframe_url: saved.embedUrl };
const options = { kpId: "326", imdbId: "tt0111161", baseUrl: "https://vibix.invalid", token: "fixture-not-a-credential", publisherId: "1" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

for (const [status, expected] of [[401, "auth_error"], [403, "auth_error"], [404, "upstream_error"], [429, "rate_limited"], [500, "upstream_error"]]) {
  test(`HTTP ${status}: ${expected}, no retry or false not-found`, async () => {
    let calls = 0;
    const outcome = await lookupVibix({ ...options, fetcher: async () => { calls++; return json({ message: "private upstream detail" }, status); } });
    assert.deepEqual(outcome, { status: expected, player: null });
    assert.equal(calls, 1);
    assert.deepEqual(lib.mergePlayerOptions([other], [saved], []), [other, saved]);
  });
}
test("successful lookup preserves provider identity and validates conflicting IDs", async () => {
  const found = await lookupVibix({ ...options, fetcher: async () => json({ data: fixture }) });
  assert.equal(found.status, "found");
  assert.equal(found.player.embedUrl, saved.embedUrl);
  for (const patch of [{ kp_id: 111 }, { imdb_id: "tt999" }, { iframe_url: "https://evil.invalid/embed/1" }]) {
    assert.equal((await lookupVibix({ ...options, fetcher: async () => json({ data: { ...fixture, ...patch } }) })).status, "invalid_response");
  }
});
test("explicit empty success permits one alternate ID; null/malformed is not absence", async () => {
  const paths = [];
  const outcome = await lookupVibix({ ...options, fetcher: async (url) => { paths.push(url); return json(paths.length === 1 ? { success: true, data: null } : fixture); } });
  assert.equal(outcome.status, "found");
  assert.equal(paths.length, 2);
  assert.match(paths[1], /imdb\/tt0111161$/);
  assert.equal((await lookupVibix({ ...options, fetcher: async () => json({ success: true, data: null }) })).status, "not_found");
  for (const payload of [null, {}, { data: [] }, { data: null }, { success: false }, { name: "Only a title" }]) {
    assert.equal((await lookupVibix({ ...options, fetcher: async () => json(payload) })).status, "invalid_response");
  }
  assert.equal((await lookupVibix({ ...options, fetcher: async () => new Response("not json") })).status, "invalid_response");
});
test("timeout aborts upstream; no retry, credentials remain private", async () => {
  let calls = 0;
  const outcome = await lookupVibix({ ...options, timeoutMs: 10, fetcher: async (_, init) => {
    calls++;
    assert.equal(init.redirect, "error");
    return new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
  } });
  assert.deepEqual(outcome, { status: "timeout", player: null });
  assert.equal(calls, 1);
  assert.doesNotMatch(JSON.stringify(outcome), /fixture-not-a-credential|private upstream/);
});
test("request cancellation and missing configuration make zero upstream calls", async () => {
  const controller = new AbortController(); controller.abort();
  const never = async () => assert.fail("unexpected upstream");
  assert.equal((await lookupVibix({ ...options, signal: controller.signal, fetcher: never })).status, "upstream_error");
  assert.equal((await lookupVibix({ ...options, token: "", fetcher: never })).status, "unconfigured");
});
test("unsafe/unrecognised/revoked embeds rejected, known provider URL preserved", () => {
  assert.equal(lib.isUsableSavedPlayer(saved), true);
  for (const url of ["http://exiim.cloud/embed/1", "javascript:alert(1)", "https://exiim.cloud.evil.invalid/embed/1", "https://user:pass@exiim.cloud/embed/1", "https://vibix.org/", "https://vibix.org/api/token"]) {
    assert.equal(lib.isUsableSavedPlayer({ ...saved, embedUrl: url }), false);
  }
  assert.equal(lib.isUsableSavedPlayer({ ...saved, revoked: true }), false);
  assert.equal(lib.isVibixPlayer({ ...saved, type: "iframe" }), true);
  for (const flag of ["disabled", "revoked", "expired"]) {
    assert.deepEqual(players.parsePlayerArray([{ ...saved, [flag]: true }]), []);
  }
});

test("lookup player payload requires usable, typed fields, not merely a truthy object", () => {
  assert.equal(lib.isVibixLookupPlayer(saved), true);
  for (const value of [null, {}, [], {...saved, contentId:123}, {...saved, type:"unknown"},
    {...saved, embedUrl:"javascript:alert(1)"}, {...saved, contentType:"tmdb"}]) {
    assert.equal(lib.isVibixLookupPlayer(value), false);
  }
});

test("provider namespace is required for SDK, but not for an already validated iframe", async () => {
  const run = (body, movieType) => lookupVibix({...options, movieType, fetcher:async()=>json(body)});
  assert.equal((await run({id:123})).status, "invalid_response");
  assert.equal((await run({iframe_url:saved.embedUrl})).status, "found");
  assert.equal((await run({...fixture,type:"serial"}, "Фильм")).status, "invalid_response");
  assert.equal((await run(fixture, "Сериал")).status, "invalid_response");
  const sdk = await run({id:123,type:"serial",kp_id:326}, "Сериал");
  assert.equal(sdk.player.contentType, "series");
  assert.equal(sdk.player.contentId, "123");
  assert.notEqual(sdk.player.contentId, options.kpId);
});

test("in-flight cancellation reaches transport and a slow response body also times out", async () => {
  const controller = new AbortController();
  let started;
  const ready = new Promise(resolve=>{started=resolve;});
  const pending = lookupVibix({...options, signal:controller.signal, fetcher:async(_, init)=>{
    started();
    return new Promise((_,reject)=>init.signal.addEventListener("abort",()=>reject(Error("aborted")),{once:true}));
  }});
  await ready; controller.abort();
  assert.equal((await pending).status, "upstream_error");
  const bodyTimeout=await lookupVibix({...options,timeoutMs:10,fetcher:async(_, init)=>({
    ok:true,status:200,json:()=>new Promise((_,reject)=>init.signal.addEventListener("abort",()=>reject(Error("aborted")),{once:true})),
  })});
  assert.equal(bodyTimeout.status, "timeout");
});

test("API route maps typed outcomes without exposing upstream details or caching", async () => {
  const source = readFileSync(new URL("../src/app/api/player/vibix/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const loaded={exports:{}};
  let outcome, calls=0;
  new Function("require","module","exports","process",compiled)((id)=>{
    if(id==="next/server") return {NextResponse:{json:(body,init)=>Response.json(body,init)}};
    if(id.endsWith("/vibixLookup")) return {lookupVibix:async()=>{calls++;return outcome;}};
    if(id.endsWith("/vibix")) return lib;
    assert.fail("Unexpected route import");
  },loaded,loaded.exports,{env:{}});
  const invalid=await loaded.exports.GET(new Request("http://localhost/api/player/vibix?imdbId=invalid"));
  assert.equal(invalid.status,400); assert.equal(calls,0);
  for(const [status,httpStatus] of [["found",200],["not_found",200],["auth_error",503],["rate_limited",429],["timeout",504],["upstream_error",502],["invalid_response",502],["unconfigured",503]]) {
    outcome={status,player:status==="found"?saved:null};
    const response=await loaded.exports.GET(new Request("http://localhost/api/player/vibix?imdbId=tt0111161"));
    assert.equal(response.status,httpStatus);
    assert.equal(response.headers.get("Cache-Control"),"private, no-store");
    assert.deepEqual(await response.json(),{ok:httpStatus===200,...outcome});
  }
});
test("dedupe keeps saved object and iframe identity despite a late themed response", () => {
  const late = { ...saved, id: "different", embedUrl: `${saved.embedUrl}?design=1&sharing=false` };
  const merged = lib.mergePlayerOptions([other], [saved], [late]);
  assert.deepEqual(merged, [other, saved]);
  const selection = { movieKey: "A", playerKey: lib.stablePlayerKey(saved) };
  assert.equal(lib.selectedPlayer(merged, selection, "A"), saved);
  assert.equal(lib.selectedPlayer([other], selection, "A"), other);
  assert.equal(lib.selectedPlayer(merged, selection, "B"), other);
});
for (const [kind, id] of [["kp", "326"], ["imdb", "tt0111161"], ["movie", "326"], ["series", "326"]]) {
  test(`official ${kind} HTML/object/text roundtrip retains namespace and ID`, () => {
    for (const input of [
      `<ins data-publisher-id="1" data-type="${kind}" data-id="${id}"></ins>`,
      `Vibix | rendex | ${kind} | ${id}`,
      `Vibix | rendex | 1 | ${kind} | ${id}`,
      [{ type: "rendex", contentType: kind, contentId: id }],
    ]) {
      const parsed = players.parsePlayerText(input);
      assert.equal(parsed.length, 1);
      assert.equal(parsed[0].contentType, kind);
      assert.equal(parsed[0].contentId, id);
      const roundtrip = players.parsePlayerText(players.playersToText(parsed))[0];
      assert.equal(roundtrip.contentType, kind);
      assert.equal(roundtrip.contentId, id);
    }
  });
}
test("invalid SDK IDs cannot silently become a movie or publisher ID", () => {
  for (const input of ["Vibix | rendex | imdb | 123", "Vibix | rendex | 99 | imdb | invalid", '<ins data-type="tmdb" data-id="326"></ins>']) assert.deepEqual(players.parsePlayerText(input), []);
  assert.equal(players.parsePlayerText("Vibix | rendex | 123")[0].contentId, "123");
  const movie = players.parsePlayerText("Vibix | rendex | movie | 123")[0];
  const series = players.parsePlayerText("Vibix | rendex | series | 123")[0];
  assert.notEqual(lib.stablePlayerKey(movie), lib.stablePlayerKey(series));
});
test("Collapse and generic iframe keep their original behaviour", () => {
  assert.deepEqual(lib.mergePlayerOptions([other], [{ id: "other", name: "Other", embedUrl: "https://example.invalid/player" }]).map(p => p.id), ["collapse", "other"]);
  assert.match(players.buildAutoPlayers({ kinopoiskId: 326, movieType: "Фильм" })[0].embedUrl, /ortified/);
  assert.match(players.parsePlayerText("Other | iframe | https://example.invalid/player")[0].embedUrl, /example.invalid/);
});

function loadHook(hooks) {
  const source = readFileSync(new URL("../src/app/lib/useVibixLookup.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", compiled)((id) => {
    if (id === "react") return hooks;
    assert.equal(id, "./vibix"); return lib;
  }, loaded, loaded.exports);
  return loaded.exports.useVibixLookup;
}
test("actual lookup hook ignores late A success/error after B; disabled saved iframe makes no request", async () => {
  let state = null, dependencies, cleanup, effect;
  const hook = loadHook({
    useState: () => [state, (value) => { state = value; }],
    useEffect(fn, deps) { if (!dependencies || deps.some((v, i) => v !== dependencies[i])) { effect = fn; dependencies = deps; } },
  });
  const requests = [];
  const before = globalThis.fetch;
  globalThis.fetch = (url, init) => new Promise((resolve, reject) => requests.push({ url, signal: init.signal, resolve, reject }));
  const render = (movieKey, enabled = true) => {
    const value = hook({ movieKey, kpId: 326, movieType: "Фильм", enabled });
    if (effect) { cleanup?.(); cleanup = effect(); effect = null; }
    return value;
  };
  try {
    assert.equal(render("saved", false).status, "idle"); assert.equal(requests.length, 0);
    assert.equal(render("A").status, "loading");
    assert.equal(render("B").player, null); assert.equal(requests[0].signal.aborted, true);
    requests[1].resolve(json({ status: "found", player: { ...saved, contentId: "123" } }));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(render("B").status, "found");
    requests[0].reject(new Error("late A error"));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(render("B").status, "found");
    render("C"); render("D");
    requests[2].resolve(json({ status: "found", player: { ...saved, contentId: "333" } }));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(render("D").player, null);
    for(const response of [new Response("not json"),json({status:"toString"}),json({status:"found",player:{...saved,contentId:123}})]) {
      const key="invalid-"+requests.length;
      render(key);
      requests.at(-1).resolve(response);
      await new Promise(resolve=>setImmediate(resolve));
      assert.equal(render(key).status,"invalid_response");
    }
  } finally { cleanup?.(); globalThis.fetch = before; }
});
test("actual component SSR retains legacy series default, IMDb strings, theme and iframe accessibility", () => {
  const source=readFileSync(new URL("../src/app/components/VibixPlayer.tsx",import.meta.url),"utf8");
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const loaded={exports:{}};
  new Function("require","module","exports",compiled)((id)=>{
    if(id==="next/script") return {default:()=>null};
    if(id==="../lib/vibix") return lib;
    if(["react","react/jsx-runtime"].includes(id)) return requireLocal(id);
    assert.fail("Unexpected player import");
  },loaded,loaded.exports);
  const React=requireLocal("react");
  const {renderToStaticMarkup}=requireLocal("react-dom/server");
  const render=(player,movieType)=>renderToStaticMarkup(React.createElement(loaded.exports.default,{player,title:"Тест",movieType}));
  const legacy=render({...saved,type:"rendex",contentId:"123",embedUrl:""},"Сериал");
  assert.match(legacy,/data-type="series"/);
  assert.match(legacy,/data-design="1"/);
  assert.match(render({...saved,type:"rendex",contentId:"123",publisherId:"different-publisher",embedUrl:""}),/data-publisher-id="678053396"/);
  assert.doesNotMatch(legacy,/data-voiceover-only/);
  assert.match(render({...saved,type:"rendex",contentType:"imdb",contentId:"tt0111161",embedUrl:""}),/data-id="tt0111161"/);
  const iframe=render(saved);
  assert.match(iframe,/title="Vibix — Тест"/);
  assert.match(iframe,/allowFullScreen=""/i);
  assert.match(iframe,/role="status"/);
  assert.match(iframe,/Загрузка окна Vibix/);
  assert.doesNotMatch(iframe,/Видео доступно/);
});

test("movie route exposes both official asynchronous SDK scripts once in head, not site-wide", () => {
  const root=readFileSync(new URL("../src/app/layout.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(root,/rendex-sdk|graphicslab/);
  const source=readFileSync(new URL("../src/app/movie/[slug]/layout.tsx",import.meta.url),"utf8");
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const loaded={exports:{}};
  new Function("require","module","exports",compiled)((id)=>{
    if(id==="react/jsx-runtime") return requireLocal(id);
    assert.fail("Unexpected layout import");
  },loaded,loaded.exports);
  const React=requireLocal("react");
  const page=React.createElement("html",null,React.createElement("head"),React.createElement("body",null,React.createElement(loaded.exports.default,null,"Fixture")));
  const html=requireLocal("react-dom/server").renderToString(page);
  const head=html.match(/<head>([\s\S]*?)<\/head>/)?.[1];
  assert.ok(head);
  assert.match(html,/<body>Fixture<\/body>/);
  for(const url of ["https://graphicslab.io/sdk/v2/rendex-sdk.min.js","https://alt.graphicslab.io/sdk/v2/rendex-sdk.min.js"]) {
    const tags=[...html.matchAll(/<script\b[^>]*>/g)].map(m=>m[0]).filter(tag=>tag.includes(`src="${url}"`));
    assert.equal(tags.length,1);
    assert.match(tags[0],/\basync=""/);
    assert.ok(head.includes(tags[0]));
  }
});

for(const preexisting of [true,false]) test(`SDK iframe ${preexisting ? "already inserted" : "inserted later"} clears loading without modifying the embed`, () => {
  const source=readFileSync(new URL("../src/app/components/VibixPlayer.tsx",import.meta.url),"utf8");
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const loaded={exports:{}};
  let effect,mutation,hasFrame=preexisting,disconnected=false,cleared=false,stateIndex=0;
  const updates=[];
  const node={querySelector(selector){assert.equal(selector,"iframe");return hasFrame ? {} : null;}};
  const hooks={
    useRef:()=>({current:node}),
    useState(initial){const index=stateIndex++;return [initial,value=>updates.push([index,value])];},
    useEffect(fn){effect=fn;},
  };
  class Observer {
    constructor(fn){mutation=fn;}
    observe(target){assert.equal(target,node);}
    disconnect(){disconnected=true;}
  }
  new Function("require","module","exports","MutationObserver","setTimeout","clearTimeout",compiled)((id)=>{
    if(id==="react") return hooks;
    if(id==="react/jsx-runtime") return requireLocal(id);
    if(id==="../lib/vibix") return lib;
    assert.fail("Unexpected player import");
  },loaded,loaded.exports,Observer,()=>123,id=>{assert.equal(id,123);cleared=true;});
  loaded.exports.default({player:{...saved,type:"rendex",contentId:"123",embedUrl:""},title:"Fixture"});
  const cleanup=effect();
  if(!preexisting) {assert.deepEqual(updates,[]);hasFrame=true;mutation();}
  assert.deepEqual(updates,[[0,true],[1,""]]);
  cleanup();assert.ok(disconnected);assert.ok(cleared);
});

test("no real network was attempted", () => assert.equal(networkAttempts, 0));
