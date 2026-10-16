import assert from "node:assert/strict";
import test from "node:test";

import {
  correctKeyboardLayout,
  dedupeSearchCatalog,
  normalizeSearchText,
  searchCatalog,
} from "../src/app/lib/search/searchEngine.ts";

const items = [
  {
    id: 67,
    canonicalMovieId: "67a3ab42-c257-4cc3-a2d5-b5cb79f6c2d3",
    slug: "joker-2019",
    title: "Джокер",
    originalTitle: "Joker",
    searchTitles: ["Артур Флек"],
    type: "Фильм",
    year: "2019",
    rating: 8.4,
    genres: ["Драма"],
    kinopoiskId: 1048334,
  },
  {
    id: 298,
    canonicalMovieId: "7c422d8c-d13a-4cf1-84c5-49792df53267",
    slug: "joker",
    title: "Джокер",
    originalTitle: "Joker",
    searchTitles: ["Batman / DC"],
    type: "Фильм",
    year: "2019",
    rating: 8.4,
    genres: ["Драма"],
    tmdbId: 475557,
    imdbId: "tt7286456",
  },
  {
    id: 299,
    canonicalMovieId: "joker-sequel",
    slug: "joker-folie-deux",
    title: "Джокер: Безумие на двоих",
    originalTitle: "Joker: Folie à Deux",
    searchTitles: [],
    type: "Фильм",
    year: "2024",
    rating: 5.2,
    genres: ["Драма"],
    tmdbId: 889737,
  },
  {
    id: 2001,
    canonicalMovieId: "the-100",
    slug: "the-100-2014",
    title: "Сотня",
    originalTitle: "The 100",
    searchTitles: ["The Hundred", "100"],
    type: "Сериал",
    year: "2014–2020",
    rating: 7.7,
    genres: ["Фантастика"],
    tmdbId: 48866,
    imdbId: "tt2661044",
  },
];

test("normalizes Cyrillic, punctuation and diacritics", () => {
  assert.equal(normalizeSearchText("  Joker: Folie à Deux! "), "joker folie a deux");
  assert.equal(normalizeSearchText("Ёлки"), "елки");
  assert.equal(normalizeSearchText("Тайна"), "тайна");
});

test("corrects an English keyboard layout used for a Russian query", () => {
  assert.equal(correctKeyboardLayout("l;jrth"), "джокер");
});

test("deduplicates reviewed canonical aliases and chooses the current card", () => {
  const deduplicated = dedupeSearchCatalog(items);
  assert.equal(deduplicated.length, 3);
  assert.equal(searchCatalog(items, "joker")[0]?.slug, "joker");
  assert.equal(searchCatalog(items, "Артур Флек")[0]?.slug, "joker");
});

test("does not merge matching titles without canonical identity", () => {
  const unresolved = [
    { ...items[0], id: 9001, canonicalMovieId: undefined, slug: "unknown-one" },
    { ...items[0], id: 9002, canonicalMovieId: undefined, slug: "unknown-two" },
  ];
  assert.equal(dedupeSearchCatalog(unresolved).length, 2);
});

test("does not merge matching titles with different unreviewed canonical identities", () => {
  const distinct = [
    { ...items[0], id: 9101, canonicalMovieId: "distinct-a", slug: "distinct-a" },
    { ...items[0], id: 9102, canonicalMovieId: "distinct-b", slug: "distinct-b" },
  ];
  assert.equal(dedupeSearchCatalog(distinct).length, 2);
});

test("ranks exact Russian and English titles before a related sequel", () => {
  assert.equal(searchCatalog(items, "джокер")[0]?.slug, "joker");
  assert.equal(searchCatalog(items, "joker")[0]?.slug, "joker");
  assert.equal(searchCatalog(items, "джокер").filter((item) => item.slug === "joker").length, 1);
});

test("supports layout correction and a conservative typo", () => {
  assert.equal(searchCatalog(items, "l;jrth")[0]?.slug, "joker");
  assert.equal(searchCatalog(items, "джокир")[0]?.slug, "joker");
});

test("supports original and alternative titles for The 100", () => {
  assert.equal(searchCatalog(items, "The 100")[0]?.slug, "the-100-2014");
  assert.equal(searchCatalog(items, "Сотня")[0]?.slug, "the-100-2014");
  assert.equal(searchCatalog(items, "sotnya")[0]?.slug, "the-100-2014");
  assert.equal(searchCatalog(items, "The Hun")[0]?.slug, "the-100-2014");
});

test("ranks an exact alternative title above another movie's prefix", () => {
  const exactAlias = { ...items[3], searchTitles: ["Hundred"] };
  const prefixOnly = {
    ...items[2],
    id: 9201,
    canonicalMovieId: "hundred-prefix",
    slug: "hundred-days",
    title: "Hundred Days",
    originalTitle: "Hundred Days",
    searchTitles: [],
  };
  assert.equal(searchCatalog([prefixOnly, exactAlias], "Hundred")[0]?.slug, "the-100-2014");
});

test("keeps similarly named but distinct canonical movies separate", () => {
  const results = searchCatalog(items, "джокер");
  assert.deepEqual(results.map((item) => item.slug), ["joker", "joker-folie-deux"]);
});
