import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  formatMovieRating,
  getManualRatingFromRawJson,
  mergeManualRatingIntoRawJson,
  mergeMovieOverrideData,
  parseManualRatingInput,
  resolveManualMovieRating,
} from "../src/app/lib/movies/rating.ts";

test("admin input accepts both decimal separators and validates the range", () => {
  assert.equal(parseManualRatingInput("7,4"), 7.4);
  assert.equal(parseManualRatingInput("7.4"), 7.4);
  assert.equal(parseManualRatingInput("0"), 0);
  assert.equal(parseManualRatingInput(""), undefined);
  assert.throws(() => parseManualRatingInput("11"), /от 0 до 10/);
  assert.throws(() => parseManualRatingInput("not-a-rating"), /от 0 до 10/);
});

test("saving a manual draft rating preserves raw provider data", () => {
  const before = {
    tmdb: { id: 42, vote_average: 6.1 },
    kinoluma: { manual: true, players: [{ id: "player-1" }] },
  };
  const after = mergeManualRatingIntoRawJson(before, 8.3);

  assert.deepEqual(after.tmdb, before.tmdb);
  assert.deepEqual(after.kinoluma.players, before.kinoluma.players);
  assert.equal(after.kinoluma.manual_rating, 8.3);
  assert.equal(after.kinoluma.manual_movie_rating, 8.3);
  assert.match(after.kinoluma.manual_rating_updated_at, /^\d{4}-\d{2}-\d{2}T/);
});

test("updating only rating preserves every other movie override field", () => {
  const currentOverride = {
    title: "Ручное название",
    description: "Ручное описание",
    poster: "https://example.com/poster.jpg",
    backdrop: "https://example.com/backdrop.jpg",
    facts: [{ label: "Режиссёр", value: "Автор" }],
    cast: [{ name: "Актёр", role: "Роль" }],
    rating: 6.2,
    customField: { keep: true },
  };
  const merged = mergeMovieOverrideData(currentOverride, { rating: 8.4 });

  assert.deepEqual(merged, { ...currentOverride, rating: 8.4 });
  assert.equal(currentOverride.rating, 6.2);
});

test("null or empty input clears only the manual rating override", () => {
  for (const input of [null, ""]) {
    const parsed = parseManualRatingInput(input);
    const merged = mergeMovieOverrideData(
      { title: "Сохранить", rating: 8.1, cast: [{ name: "Актёр" }] },
      {},
      parsed === undefined ? ["rating"] : [],
    );

    assert.deepEqual(merged, {
      title: "Сохранить",
      cast: [{ name: "Актёр" }],
    });
  }
});

test("manual rating aliases are read consistently", () => {
  assert.equal(
    getManualRatingFromRawJson({ kinoluma: { manual_rating: "8,1" } }),
    8.1,
  );
  assert.equal(
    getManualRatingFromRawJson({ kinoluma: { manual_movie_rating: 7.9 } }),
    7.9,
  );
});

test("positive manual rating has priority over automatic values", () => {
  assert.equal(resolveManualMovieRating(9.4, 7.6), 7.6);
  assert.equal(resolveManualMovieRating(9.4, "7,6"), 7.6);
});

test("zero or missing manual rating keeps the existing automatic fallback", () => {
  assert.equal(resolveManualMovieRating(8.2, 0), 8.2);
  assert.equal(resolveManualMovieRating(8.2, null), 8.2);
  assert.equal(resolveManualMovieRating(0, 0), 0);
});

test("a positive rating never renders as Уточняется", () => {
  assert.equal(formatMovieRating(7.4), "★ 7.4");
  assert.equal(formatMovieRating("7,4"), "★ 7.4");
  assert.equal(formatMovieRating(0), "Уточняется");
  assert.equal(formatMovieRating(null), "Уточняется");
});

test("comma input survives the save-read-display round trip", () => {
  const savedRating = parseManualRatingInput("8,6");
  const publicRating = resolveManualMovieRating(0, savedRating);

  assert.equal(savedRating, 8.6);
  assert.equal(publicRating, 8.6);
  assert.equal(formatMovieRating(publicRating), "★ 8.6");
});

test("admin save, read, publish and public display paths use the shared rating rules", async () => {
  const files = await Promise.all([
    readFile("src/app/admin/movies/[slug]/edit/MovieAdminEditForm.tsx", "utf8"),
    readFile("src/app/api/admin/movies/[slug]/override/route.ts", "utf8"),
    readFile("src/app/api/admin/import/update-draft/route.ts", "utf8"),
    readFile("src/app/api/admin/import/list/route.ts", "utf8"),
    readFile("src/app/api/admin/import/draft-action/route.ts", "utf8"),
    readFile("src/app/lib/movies/movieOverrides.ts", "utf8"),
    readFile("src/app/movie/[slug]/MoviePageClient.tsx", "utf8"),
  ]);

  assert.match(files[0], /parseManualRatingInput/);
  assert.match(files[1], /mergeMovieOverrideData/);
  assert.match(files[1], /getMovieOverrideData/);
  assert.match(files[1], /parseManualRatingInput/);
  assert.match(files[2], /mergeManualRatingIntoRawJson/);
  assert.match(files[3], /getDraftRatingState/);
  assert.match(files[4], /getDraftRatingState/);
  assert.match(files[5], /resolveManualMovieRating/);
  assert.match(files[6], /formatMovieRating/);
});
