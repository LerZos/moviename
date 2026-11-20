import type { Movie } from "./movies";

// Identity: TMDB movie 1514026, IMDb tt37281055, Kinopoisk 8549783 (cross-checked 2026-11-20:
// same director, writers, cast, 96 min runtime and US release date on all three sources).
// Poster and backdrop are TMDB images; the trailer is the official teaser from Roadside Attractions.
// Rating source: IMDb 6.6 / 10 (26 187 votes) observed 2026-11-20. Public text stays provider-neutral.
export const manualBuddyAddition: Movie = {
  id: 950002,
  slug: "buddy-2026",
  title: "Бадди",
  originalTitle: "Buddy",
  searchTitles: ["Бадди", "Buddy", "Приятель", "Бадди 2026", "Buddy 2026", "buddy-2026"],
  type: "Фильм",
  year: "2026",
  rating: 6.6,
  genres: ["Ужасы", "Комедия", "Фэнтези"],
  countries: ["США"],
  poster: "https://image.tmdb.org/t/p/w500/1BdZbNvl1SfrrX8J9X5tQzN6Ivu.jpg",
  backdrop: "https://image.tmdb.org/t/p/original/i8Y6RYLaeoYXP8ncDjyCpp5ttFv.jpg",
  description:
    "В солнечном детском телешоу оранжевый единорог Бадди учит ребят петь, танцевать и дружить. Но когда одна девочка отказывается играть по правилам, в этом идеальном мире начинают проступать трещины.",
  longDescription:
    "«Бадди» — хоррор-комедия Каспера Келли о мире яркой детской передачи в духе конца 1990-х. Компания детей проводит дни рядом с ведущим шоу — плюшевым оранжевым единорогом Бадди, который всегда улыбается, поёт песенки и учит быть добрыми. Когда новая участница не хочет подыгрывать, за сладкой картинкой постепенно проступает что-то тревожное.\n\nФильм соединяет пастельную эстетику детского телевидения, абсурдный юмор и жанровое напряжение. В ролях — Кристин Милиоти, Дилейни Куинн, Тофер Грейс; голосами персонажей шоу говорят Киган-Майкл Кей, Майкл Шеннон и Пэттон Освальт.",
  trailerUrl: "https://www.youtube.com/embed/0mil0YgOtu8",
  tmdbNamespace: "movie",
  tmdbId: 1514026,
  imdbId: "tt37281055",
  kinopoiskId: 8549783,
  runtime: 96,
  releaseDate: "2026-08-28",
  releaseStatus: "Released",
  source: "kinoluma-manual-buddy-2026-11",
  facts: [
    { label: "Сценарий", value: "Каспер Келли, Джейми Кинг" },
    { label: "Мировая премьера", value: "22 января 2026" },
  ],
  verifiedCredits: {
    provenance: "FULLY_VERIFIED",
    directors: ["Каспер Келли"],
    actors: [
      { name: "Кристин Милиоти", role: "Грейс" },
      { name: "Дилейни Куинн", role: "Фредди" },
      { name: "Тофер Грейс", role: "Бен" },
      { name: "Киган-Майкл Кей", role: "Бадди / Тёмный Бадди (голос)" },
      { name: "Майкл Шеннон", role: "Вилли (голос)" },
      { name: "Пэттон Освальт", role: "Страппи (голос)" },
      { name: "Тристан Бордерс", role: "Оливер" },
      { name: "Мэдисон Скай Полан", role: "Ханна" },
      { name: "Калеб Уильямс", role: "Уэйд" },
    ],
  },
};
