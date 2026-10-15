import type { Movie } from "./movies";
import { the100EpisodeGuide } from "./manualThe100Episodes";

// Identity: TMDB TV 48866, IMDb tt2661044, Kinopoisk 733493.
// Images were resolved by KinoLuma's production TMDB TV routes and checked as JPEGs.
export const manualThe100Addition: Movie = {
  id: 950001,
  slug: "the-100-2014",
  title: "Сотня",
  originalTitle: "The 100",
  searchTitles: ["Сотня", "The 100", "the-100-2014"],
  type: "Сериал",
  year: "2014–2020",
  rating: 7.3,
  genres: ["Фантастика", "Драма", "Боевик", "Приключения"],
  countries: ["США"],
  poster: "https://image.tmdb.org/t/p/original/wHIMMLFsk32wIzDmawWkYVbxFCS.jpg",
  backdrop: "https://image.tmdb.org/t/p/original/hTExot1sfn7dHZjGrk0Aiwpntxt.jpg",
  description:
    "После ядерной катастрофы люди живут на орбитальной станции. Чтобы узнать, пригодна ли Земля для жизни, туда отправляют сотню молодых заключённых — и их испытание быстро становится борьбой за выживание.",
  longDescription:
    "«Сотня» — завершённый фантастический сериал о группе молодых людей, которых отправляют с орбитальной станции на Землю спустя почти век после ядерной катастрофы. Им предстоит выяснить, можно ли жить на планете, наладить отношения друг с другом и принимать трудные решения вдали от привычных правил. История сочетает приключение, драму и постапокалиптическую фантастику без раскрытия сюжетных поворотов.",
  trailerUrl: "",
  tmdbNamespace: "tv",
  tmdbId: 48866,
  imdbId: "tt2661044",
  kinopoiskId: 733493,
  releaseDate: "2014-03-19",
  releaseStatus: "Ended",
  runtime: 43,
  seasons: 7,
  episodes: 100,
  episodeGuide: the100EpisodeGuide,
  source: "kinoluma-manual-the-100-2026-10",
  facts: [
    { label: "Создатель", value: "Jason Rothenberg" },
  ],
  verifiedCredits: {
    provenance: "TMDB_ONLY",
    seriesCreators: ["Jason Rothenberg"],
    actors: [
      { name: "Eliza Taylor", role: "Clarke Griffin" },
      { name: "Bob Morley", role: "Bellamy Blake" },
      { name: "Marie Avgeropoulos", role: "Octavia Blake" },
      { name: "Lindsey Morgan", role: "Raven Reyes" },
      { name: "Richard Harmon", role: "John Murphy" },
      { name: "Paige Turco", role: "Dr. Abigail Griffin" },
      { name: "Henry Ian Cusick", role: "Marcus Kane" },
      { name: "Christopher Larkin", role: "Monty Green" },
    ],
  },
};
