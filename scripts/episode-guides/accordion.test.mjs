import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createRequire } from "node:module";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const page = readFileSync(new URL("../../src/app/movie/[slug]/MoviePageClient.tsx", import.meta.url), "utf8");
const start = page.indexOf("function EpisodeSeasonAccordion(");
const end = page.indexOf("export default function MoviePageClient(", start);
assert.ok(start >= 0 && end > start);
// Compile the actual production component, not a duplicate test implementation.
// Hook/scheduler fixtures below test lifecycle logic, not browser CSS or hydration.
const compiled = ts.transpileModule(
  'import {useState,useRef,useEffect} from "react";\nexport ' + page.slice(start, end),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } },
).outputText;
function loadAccordion(hooks) {
  const loaded = { exports: {} };
  new Function("require", "module", "exports", compiled)((id) => {
    if (id === "react") return hooks;
    assert.equal(id, "react/jsx-runtime");
    return require(id);
  }, loaded, loaded.exports);
  return loaded.exports.EpisodeSeasonAccordion;
}
const Accordion = loadAccordion(React);
const season = { season: 2, episodes: [
  { number: 1, russianTitle: "Подтверждённое название", originalTitle: "Original", airDate: "2025-04-22" },
  { number: 2, originalTitle: "Original only" },
  { number: 7 },
] };

test("SSR: closed seasons omit episode DOM; first/open season renders optional fields", () => {
  const closed = renderToStaticMarkup(React.createElement(Accordion, { season, initiallyOpen: false }));
  assert.doesNotMatch(closed, /<ol|<li|<time|Original/);
  assert.match(closed, /aria-expanded="false"/);
  assert.match(closed, /aria-controls="episode-season-2-panel"/);
  const open = renderToStaticMarkup(React.createElement(Accordion, { season, initiallyOpen: true }));
  assert.equal((open.match(/<li /g) || []).length, 3);
  assert.equal((open.match(/<time /g) || []).length, 1);
  assert.match(open, /dateTime="2025-04-22">22\.04\.2025<\/time>/);
  assert.match(open, /<strong>Подтверждённое название<\/strong><span>Original<\/span>/);
  assert.match(open, /<strong>Original only<\/strong>/);
  assert.match(open, /<strong>Серия 7<\/strong>/);
  assert.match(open, />3 серии<\/span>/);
  assert.match(open, /type="button"/);
});

test("SSR: specials keep own numbering and title fallback, no duplicated translation", () => {
  const html = renderToStaticMarkup(React.createElement(Accordion, {
    season: { season: 0, episodes: [{ number: 99, originalTitle: "Behind the scenes" },
      { number: 3, originalTitle: "Same", russianTitle: "Same" }] },
    initiallyOpen: true, title: "Спецвыпуски",
  }));
  assert.match(html, /Спецвыпуски/);
  assert.match(html, />2 серии<\/span>/);
  assert.match(html, /episode-season-0-panel/);
  assert.match(html, /episode-number">99</);
  assert.match(html, /<strong>Behind the scenes<\/strong>/);
  assert.doesNotMatch(html, /<time|Сезон 0|<span>Same<\/span>/);
});

function harness(context, { initiallyOpen = false, reduced = false } = {}) {
  const states = [], refs = [], effects = [];
  let stateIndex = 0, refIndex = 0, first = true, tree, now = 0, nextId = 0;
  const frames = new Map(), timers = new Map();
  const hooks = {
    useState(initial) {
      const index = stateIndex++;
      if (first) states[index] = initial;
      return [states[index], (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
    },
    useRef(initial) {
      const index = refIndex++;
      if (first) refs[index] = { current: initial };
      return refs[index];
    },
    useEffect(effect) { if (first) effects.push(effect); },
  };
  const component = loadAccordion(hooks);
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalRaf = Object.getOwnPropertyDescriptor(globalThis, "requestAnimationFrame");
  const originalCancel = Object.getOwnPropertyDescriptor(globalThis, "cancelAnimationFrame");
  globalThis.window = { matchMedia: () => ({ matches: reduced }) };
  globalThis.requestAnimationFrame = (callback) => { frames.set(++nextId, callback); return nextId; };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  context.mock.method(globalThis, "setTimeout", (callback, delay) => { timers.set(++nextId, { callback, due: now + delay }); return nextId; });
  context.mock.method(globalThis, "clearTimeout", (id) => timers.delete(id));
  context.after(() => {
    for (const [key, descriptor] of [["window", originalWindow], ["requestAnimationFrame", originalRaf], ["cancelAnimationFrame", originalCancel]]) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const render = () => {
    stateIndex = refIndex = 0;
    tree = component({ season, initiallyOpen });
    first = false;
  };
  render();
  const cleanups = effects.map((effect) => effect());
  return {
    click() { tree.props.children[0].props.onClick(); render(); },
    frame() {
      const pending = [...frames.values()]; frames.clear();
      for (const callback of pending) callback();
      render();
    },
    advance(ms) {
      now += ms;
      for (const [id, timer] of timers) if (timer.due <= now) { timers.delete(id); timer.callback(); }
      render();
    },
    transition(propertyName = "grid-template-rows", ownTarget = true) {
      const target = {};
      tree.props.children[1].props.onTransitionEnd({ propertyName, target, currentTarget: ownTarget ? target : {} });
      render();
    },
    get open() { return tree.props.children[0].props["aria-expanded"]; },
    get mounted() { return renderToStaticMarkup(tree).includes('<ol class="episode-list">'); },
    get pending() { return frames.size + timers.size; },
    unmount() { cleanups.forEach((cleanup) => cleanup?.()); },
  };
}

test("lazy mount paints closed list before entry, retains exit DOM until own grid transition", (context) => {
  const ui = harness(context);
  assert.equal(ui.mounted, false);
  ui.click();
  assert.equal(ui.mounted, true);
  assert.equal(ui.open, false);
  ui.frame(); ui.frame();
  assert.equal(ui.open, true);
  ui.click();
  assert.equal(ui.open, false);
  ui.advance(299);
  assert.equal(ui.mounted, true);
  ui.transition("opacity");
  ui.transition("grid-template-rows", false);
  assert.equal(ui.mounted, true);
  ui.transition();
  assert.equal(ui.mounted, false);
  assert.equal(ui.pending, 0);
});

test("rapid open/close/reopen cancels stale frames/timers; lost transition has fallback", (context) => {
  const ui = harness(context);
  ui.click(); ui.click(); // close during entry staging
  ui.frame(); ui.frame();
  assert.equal(ui.open, false);
  ui.advance(350);
  assert.equal(ui.mounted, false);
  ui.click(); ui.frame(); ui.frame(); ui.click();
  ui.advance(100); ui.click(); // reopen during exit
  ui.transition(); // late close transition must not unmount open content
  ui.advance(1000);
  assert.equal(ui.open, true);
  assert.equal(ui.mounted, true);
  ui.click(); ui.advance(350);
  assert.equal(ui.mounted, false);
  ui.click(); ui.unmount();
  assert.equal(ui.pending, 0);
});

test("reduced motion mounts/unmounts immediately without scheduled animation", (context) => {
  const ui = harness(context, { reduced: true });
  ui.click();
  assert.equal(ui.open, true);
  assert.equal(ui.mounted, true);
  ui.click();
  assert.equal(ui.open, false);
  assert.equal(ui.mounted, false);
  assert.equal(ui.pending, 0);
});

test("initially open first season cleans up pending exit on component unmount", (context) => {
  const ui = harness(context, { initiallyOpen: true });
  assert.equal(ui.open, true);
  assert.equal(ui.mounted, true);
  ui.click(); ui.unmount();
  assert.equal(ui.pending, 0);
});
