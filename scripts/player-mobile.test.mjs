import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const pageSource = readFileSync(new URL("../src/app/movie/[slug]/MoviePageClient.tsx", import.meta.url), "utf8");
const vibixPlayerSource = readFileSync(new URL("../src/app/components/VibixPlayer.tsx", import.meta.url), "utf8");

// The <=760px block is the last .player-tabs rule that sets grid columns, so it decides the phone layout.
function mobileBlock() {
  const start = pageSource.indexOf("@media (max-width: 760px)");
  assert.notEqual(start, -1);
  const end = pageSource.indexOf("@media (max-width: 390px)", start);
  assert.notEqual(end, -1);
  return pageSource.slice(start, end);
}

test("phone player tabs share the row between at most two players", () => {
  const block = mobileBlock();
  const tabs = block.slice(block.indexOf(".player-tabs {"), block.indexOf("}", block.indexOf(".player-tabs {")));
  assert.doesNotMatch(tabs, /repeat\(3,/, "an empty third column squeezes Основной / Запасной 1 at 320px");
  assert.match(tabs, /grid-auto-flow: column;/);
  assert.match(tabs, /grid-auto-columns: minmax\(0, 1fr\);/);
  assert.match(pageSource, /return normalizePlayerButtonNames\(mergedPlayers\)\.slice\(0, 2\);/);
});

test("the mobile back-to-top button hides while the player is on screen", () => {
  assert.match(pageSource, /data-player-on-screen=\{isPlayerBoxOnScreen \? "true" : undefined\}/);
  assert.match(pageSource, /<div ref=\{playerBoxRef\} className=\{isVibixPlayer\(activePlayer\)/);
  const block = mobileBlock();
  const rule = block.slice(block.indexOf('body:has(#player[data-player-on-screen="true"]) .mobile-back-to-top {'));
  assert.match(rule, /^[^}]*opacity: 0;[^}]*pointer-events: none;/);
});

test("visitor-facing player texts do not show the provider's technical name", () => {
  const texts = [...vibixPlayerSource.matchAll(/"([^"]*[А-Яа-яЁё][^"]*)"/g)].map(([, text]) => text);
  assert.ok(texts.includes("Загрузка плеера…"));
  assert.ok(texts.length >= 4);
  for (const text of texts) assert.doesNotMatch(text, /vibix|rendex|exiim/i, text);
});
