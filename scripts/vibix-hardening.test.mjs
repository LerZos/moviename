import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { test } from "node:test";
import { requireLocal } from "./episode-guides/register-local.mjs";

let networkAttempts = 0;
const forbidden = () => { networkAttempts++; throw new Error("NETWORK_FORBIDDEN"); };
globalThis.fetch = http.request = http.get = https.request = https.get = forbidden;
const ts = requireLocal("typescript");
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const sdkModule = new URL("../src/app/lib/thirdPartySdk.ts", import.meta.url);
const loadSdk = () => {
  assert.ok(existsSync(sdkModule), "src/app/lib/thirdPartySdk.ts is missing");
  return requireLocal("../../src/app/lib/thirdPartySdk.ts");
};
const { parsePlayerArray } = requireLocal("../../src/app/lib/players.ts");
const { isUsableSavedPlayer } = requireLocal("../../src/app/lib/vibix.ts");
const { parseAdminPlayers, serializeAdminPlayers } = requireLocal("../../src/app/lib/adminPlayers.ts");
const fakeWindow = (scripts = [], globals = {}) => ({ ...globals, document: { scripts: scripts.map((src) => ({ src })) } });

// Part A: a document that once rendered a movie page keeps the executed SDK; sensitive routes need a fresh document.
test("player SDK detection: official hosts and executed globals, not lookalike hosts", () => {
  const { hasThirdPartyPlayerSdk } = loadSdk();
  for (const src of ["https://graphicslab.io/sdk/v2/rendex-sdk.min.js", "https://alt.graphicslab.io/sdk/v2/rendex-sdk.min.js"]) {
    assert.equal(hasThirdPartyPlayerSdk(fakeWindow([src])), true, src);
  }
  // Removing the tags does not undo executed JavaScript.
  for (const name of ["RendexSDK", "GlareGraphics", "__RENDEX_SDK_V2_LOADED__"]) {
    assert.equal(hasThirdPartyPlayerSdk(fakeWindow([], { [name]: {} })), true, name);
  }
  for (const src of ["", "/_next/static/chunks/main.js", "https://graphicslab.io.evil.invalid/x.js", "https://evilgraphicslab.io/x.js", "not a url"]) {
    assert.equal(hasThirdPartyPlayerSdk(fakeWindow([src])), false, src || "inline");
  }
});
test("clean-document decision: render clean, reload once, fail closed instead of looping", () => {
  const { cleanDocumentAction } = loadSdk();
  const now = 1_000_000;
  const recent = { path: "/admin/import", at: now - 1000 };
  assert.equal(cleanDocumentAction(false, "/admin/import", recent, now, true), "render");
  assert.equal(cleanDocumentAction(true, "/admin/import", null, now, true), "reload");
  assert.equal(cleanDocumentAction(true, "/admin/import", { path: "/profile", at: now - 1000 }, now, true), "reload");
  assert.equal(cleanDocumentAction(true, "/admin/import", { path: "/admin/import", at: now - 60_000 }, now, true), "reload");
  // Only the document produced by that reload, still contaminated before any clean render, is a loop.
  assert.equal(cleanDocumentAction(true, "/admin/import", recent, now, true), "blocked");
  // Quick Back/Forward from a movie page in an already-clean reloaded document must reload again, not block.
  assert.equal(cleanDocumentAction(true, "/admin/import", recent, now, false), "reload");
});
test("admin and profile render only through the clean-document guard; SDK stays movie-only", () => {
  const admin = read("../src/app/admin/layout.tsx");
  assert.match(admin, /<CleanDocumentGuard>\s*<AdminAccessGuard>\{children\}<\/AdminAccessGuard>\s*<\/CleanDocumentGuard>/);
  assert.ok(existsSync(new URL("../src/app/profile/layout.tsx", import.meta.url)), "profile layout is missing");
  assert.match(read("../src/app/profile/layout.tsx"), /<CleanDocumentGuard>\{children\}<\/CleanDocumentGuard>/);
  assert.doesNotMatch(read("../src/app/layout.tsx"), /rendex-sdk|graphicslab/);
});
test("guard renders children on the server and during hydration of a fresh document", () => {
  const source = read("../src/app/components/CleanDocumentGuard.tsx");
  assert.match(source, /^"use client";/);
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", compiled)((id) => {
    if (id === "../lib/thirdPartySdk") return loadSdk();
    if (["react", "react/jsx-runtime"].includes(id)) return requireLocal(id);
    assert.fail("Unexpected guard import: " + id);
  }, loaded, loaded.exports);
  const React = requireLocal("react");
  const html = requireLocal("react-dom/server").renderToStaticMarkup(
    React.createElement(loaded.exports.default, null, React.createElement("p", null, "Admin content")));
  assert.equal(html, "<p>Admin content</p>");
});

// Part B: legacy movie_overrides.players records must not be lost by the stricter editor pipeline.
const extra = { id: "x", name: "Запасной", type: "iframe", embedUrl: "https://example.invalid/player" };
const editAnotherLine = (original) => parseAdminPlayers(
  serializeAdminPlayers(original, "Фильм") + "\nНовый | iframe | https://example.invalid/new", "Фильм", original);
test("legacy rendexVideoId-only record is serialized and survives an admin edit", () => {
  const legacy = { id: "rendex-325785", name: "Основной", type: "rendex", embedUrl: "", rendexVideoId: "325785" };
  assert.equal(isUsableSavedPlayer(legacy), true);
  assert.equal(parsePlayerArray([legacy])[0]?.contentId, "325785");
  assert.match(serializeAdminPlayers([legacy], "Фильм"), /rendex \| 678053396 \| movie \| 325785/);
  const next = editAnotherLine([legacy, extra]);
  assert.equal(next.length, 3);
  assert.equal(next[0].rendexVideoId, "325785");
});
for (const [label, record] of [
  ["Russian namespace", { type: "rendex", contentType: "Сериал", contentId: "123" }],
  ["unknown namespace", { type: "rendex", contentType: "anime", contentId: "123" }],
  ["leading-zero ID", { type: "rendex", contentId: "0325785" }],
  ["disabled mapping", { type: "rendex", contentId: "123", disabled: true }],
  ["insecure Vibix iframe", { type: "vibix-iframe", provider: "vibix", embedUrl: "http://vibix.org/embed/1" }],
]) {
  test(`unrepresentable saved record (${label}) is preserved unchanged, still fails closed on the page`, () => {
    const saved = { id: "legacy", name: "Старый", embedUrl: "", ...record };
    const next = editAnotherLine([saved, extra]);
    assert.equal(next.length, 3);
    assert.ok(next.some((player) => player === saved), "saved record must be kept as-is");
    assert.equal(isUsableSavedPlayer(saved), false);
    // An unchanged editor text still returns the original array untouched.
    assert.equal(parseAdminPlayers(serializeAdminPlayers([saved, extra], "Фильм"), "Фильм", [saved, extra]).length, 2);
  });
}
test("re-entering a hidden saved record does not duplicate it on repeated saves", () => {
  let saved = [{ id: "legacy", name: "Старый", embedUrl: "", type: "rendex", contentType: "movie", contentId: "325785", disabled: true }];
  for (let save = 0; save < 3; save++) {
    const shown = serializeAdminPlayers(saved, "Фильм");
    saved = parseAdminPlayers(`${shown ? `${shown}\n` : ""}Старый | rendex | 678053396 | movie | 325785`, "Фильм", saved);
    assert.equal(saved.length, 1, `save ${save + 1} must keep exactly one record`);
  }
});
test("malformed new input is still rejected, not preserved", () => {
  assert.throws(() => parseAdminPlayers("V | rendex | movie | 0123", "Фильм", [extra]), /Некорректная/);
});
test("no network was attempted", () => assert.equal(networkAttempts, 0));
