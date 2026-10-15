import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildCreditDisplayGroups,
  getVisibleCreditPeople,
  isLegacyCastSummaryLabel,
  normalizeCatalogCredits,
  shouldShowMovieFact,
} from "../src/app/lib/movies/credits.ts";

test("live-action cast uses the correct heading and keeps actor-role pairs", () => {
  const credits = normalizeCatalogCredits({
    type: "Фильм",
    cast: [
      { name: "Joaquin Phoenix", role: "Arthur Fleck" },
      { name: "Robert De Niro", role: "" },
    ],
  });
  const cast = buildCreditDisplayGroups(credits).find((group) => group.key === "cast");

  assert.equal(cast?.title, "Актёрский состав");
  assert.equal(
    buildCreditDisplayGroups(credits).filter((group) => group.title === "Актёрский состав").length,
    1,
  );
  assert.deepEqual(cast?.people, [
    { name: "Joaquin Phoenix", role: "Arthur Fleck" },
    { name: "Robert De Niro", role: "" },
  ]);
});

test("duplicate people collapse to one card without inventing a role", () => {
  const groups = buildCreditDisplayGroups({
    directors: [],
    seriesCreators: [],
    actors: [
      { name: "Актёр", role: "" },
      { name: " актёр ", role: "Подтверждённая роль" },
      { name: "Актёр", role: "Другая роль" },
    ],
    voiceActors: [],
    characters: [],
    unclassified: [],
  });

  assert.deepEqual(groups[0].people, [{ name: "Актёр", role: "Подтверждённая роль" }]);
});

test("directors, creators, cast, voice actors and characters remain separate", () => {
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
});

test("long credit lists start collapsed and expand without losing entries", () => {
  const people = Array.from({ length: 9 }, (_, index) => ({
    name: `Актёр ${index + 1}`,
    role: `Персонаж ${index + 1}`,
  }));

  assert.equal(getVisibleCreditPeople(people, false).length, 6);
  assert.deepEqual(getVisibleCreditPeople(people, true), people);
});

test("legacy cast summaries are hidden only by their known labels", () => {
  assert.equal(isLegacyCastSummaryLabel("Главные герои"), true);
  assert.equal(isLegacyCastSummaryLabel("В главных ролях"), true);
  assert.equal(isLegacyCastSummaryLabel("Награды"), false);
  assert.equal(shouldShowMovieFact("Главные герои", true), false);
  assert.equal(shouldShowMovieFact("Главные герои", false), true);
  assert.equal(shouldShowMovieFact("Награды", true), true);
});
