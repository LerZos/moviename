import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  buildCreditDisplayGroups,
  getVisibleCreditPeople,
  normalizeCatalogCredits,
  shouldShowMovieFact,
} from "../src/app/lib/movies/credits.ts";

test("credit groups remain separate and use the cast heading", () => {
  const groups = buildCreditDisplayGroups({
    directors: ["Режиссёр"],
    seriesCreators: ["Создатель"],
    actors: [{ name: "Актёр", role: "Герой" }],
    voiceActors: [{ name: "Сэйю", role: "озвучка" }],
    characters: [{ name: "Персонаж", role: "" }],
    unclassified: [],
  });

  assert.deepEqual(groups.map((group) => group.key), [
    "directors",
    "creators",
    "cast",
    "voice-cast",
    "characters",
  ]);
  assert.equal(groups.find((group) => group.key === "cast")?.title, "Актёрский состав");
});

test("long cast lists reveal all entries without duplicates", () => {
  const people = Array.from({ length: 8 }, (_, index) => ({
    name: `Актёр ${index + 1}`,
    role: `Персонаж ${index + 1}`,
  }));
  const groups = buildCreditDisplayGroups({
    directors: [],
    seriesCreators: [],
    actors: [people[0], { ...people[0] }, ...people.slice(1)],
    voiceActors: [],
    characters: [],
    unclassified: [],
  });

  assert.equal(groups[0].people.length, 8);
  assert.equal(getVisibleCreditPeople(groups[0].people, false).length, 6);
  assert.deepEqual(getVisibleCreditPeople(groups[0].people, true), groups[0].people);
});

test("structured credits replace only duplicate credit facts", () => {
  const credits = normalizeCatalogCredits({
    type: "Сериал",
    facts: [
      { label: "Создатель", value: "Jason Rothenberg" },
      { label: "Страна", value: "США" },
    ],
    verifiedCredits: {
      provenance: "TMDB_ONLY",
      seriesCreators: ["Jason Rothenberg"],
      actors: [{ name: "Eliza Taylor", role: "Clarke Griffin" }],
    },
  });

  assert.equal(shouldShowMovieFact("Создатель", credits), false);
  assert.equal(shouldShowMovieFact("Режиссёр/создатель", credits), false);
  assert.equal(shouldShowMovieFact("Главные герои", credits), false);
  assert.equal(shouldShowMovieFact("Страна", credits), true);
  assert.equal(shouldShowMovieFact("Создатель", { ...credits, seriesCreators: [] }), true);
});

test("movie information and credits are stacked at full width", () => {
  const source = readFileSync(
    new URL("../src/app/movie/[slug]/MoviePageClient.tsx", import.meta.url),
    "utf8",
  );
  const detailsRule = source.match(/\.details-grid\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? "";

  assert.match(detailsRule, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.doesNotMatch(detailsRule, /1\.15fr|0\.85fr/);
  assert.match(source, /className="section-card credits-section/);
  assert.match(source, /data-compact=\{group\.people\.length === 1/);
});
