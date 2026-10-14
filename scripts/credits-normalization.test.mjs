import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeCatalogCredits } from "../src/app/lib/movies/credits.ts";

test("film directors and actors stay separate from ambiguous creator labels", () => {
  const movie = {
    type: "Фильм",
    facts: [
      { label: "Режиссёры", value: "А. Режиссёр, Б. Режиссёр" },
      { label: "Режиссёр/создатель", value: "Неоднозначное имя" },
    ],
    cast: [{ name: "Актёр", role: "Персонаж" }],
  };

  const credits = normalizeCatalogCredits(movie);
  assert.deepEqual(credits.directors, ["А. Режиссёр", "Б. Режиссёр"]);
  assert.deepEqual(credits.seriesCreators, []);
  assert.deepEqual(credits.actors, movie.cast);
});

test("series creator is not relabeled as director", () => {
  const credits = normalizeCatalogCredits({
    type: "Сериал",
    facts: [
      { label: "Создатель", value: "Автор сериала" },
      { label: "Режиссёр", value: "Неоднозначный импорт" },
    ],
    cast: [{ name: "Исполнитель", role: "Герой" }],
  });

  assert.deepEqual(credits.directors, []);
  assert.deepEqual(credits.seriesCreators, ["Автор сериала"]);
  assert.equal(credits.actors[0].name, "Исполнитель");
});

test("anime characters are not presented as actors or voice actors", () => {
  const credits = normalizeCatalogCredits({
    type: "Аниме",
    cast: [
      { name: "Герой", role: "ученик" },
      { name: "Сэйю", role: "озвучка" },
    ],
  });

  assert.deepEqual(credits.characters, [{ name: "Герой", role: "ученик" }]);
  assert.deepEqual(credits.voiceActors, [{ name: "Сэйю", role: "озвучка" }]);
  assert.deepEqual(credits.actors, []);
});

test("cartoon voice credits require explicit evidence; other cast stays unclassified", () => {
  const explicit = normalizeCatalogCredits({
    type: "Мультфильм",
    facts: [{ label: "Озвучка / главные роли", value: "Исполнитель" }],
    cast: [{ name: "Исполнитель", role: "Персонаж" }],
  });
  const ambiguous = normalizeCatalogCredits({
    type: "Мультфильм",
    cast: [{ name: "Имя", role: "главная роль" }],
  });

  assert.equal(explicit.voiceActors.length, 1);
  assert.equal(ambiguous.voiceActors.length, 0);
  assert.equal(ambiguous.unclassified.length, 1);
});

test("animation in film and series categories is not automatically live-action cast", () => {
  for (const type of ["Фильм", "Сериал"]) {
    const credits = normalizeCatalogCredits({
      type,
      genres: ["Анимация"],
      cast: [{ name: "Неоднозначное имя", role: "главная роль" }],
    });
    assert.equal(credits.actors.length, 0);
    assert.equal(credits.unclassified.length, 1);
  }
});

test("production personnel inside legacy cast are not relabeled as actors", () => {
  const credits = normalizeCatalogCredits({
    type: "Сериал",
    genres: ["Драма"],
    cast: [{ name: "Автор", role: "создатель" }],
  });
  assert.equal(credits.actors.length, 0);
  assert.equal(credits.unclassified.length, 1);
});

test("final movie overrides are consumed without changing canonical identity", () => {
  const movie = {
    id: 7,
    canonicalMovieId: "kl-7",
    slug: "example",
    tmdbId: 42,
    imdbId: "tt1234567",
    type: "Сериал",
    facts: [{ label: "Создатели", value: "Ручной автор, Ручной автор" }],
    cast: [{ name: "Ручной актёр", role: "Актёр" }],
  };
  const before = structuredClone(movie);
  const credits = normalizeCatalogCredits(movie);

  assert.deepEqual(credits.seriesCreators, ["Ручной автор"]);
  assert.equal(credits.actors[0].name, "Ручной актёр");
  assert.deepEqual(movie, before);
});
