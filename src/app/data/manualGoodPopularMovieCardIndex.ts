import type { ContentType } from "./movies";
import type { MovieCardIndexItem } from "./movieCardIndex";
import { getKinopoiskPoster, getTmdbPoster } from "../lib/imageLinks";

type ManualGoodPopularCardEntry = {
  id: number;
  kinopoiskId: number;
  slug: string;
  title: string;
  originalTitle: string;
  type: ContentType;
  year: string;
  rating: number;
  genres: string[];
  tmdbId?: number;
  imdbId?: string;
};

const manualGoodPopularCardEntries: ManualGoodPopularCardEntry[] = [
  {
    "id": 970000,
    "kinopoiskId": 6034,
    "slug": "the-secret-life-of-walter-mitty-2013",
    "title": "Невероятная жизнь Уолтера Митти",
    "originalTitle": "The Secret Life of Walter Mitty",
    "type": "Фильм",
    "year": "2013",
    "rating": 0,
    "genres": [
      "Комедия",
      "Приключения",
      "Драма"
    ],
    "imdbId": "tt0359950"
  },
  {
    "id": 970001,
    "kinopoiskId": 2519,
    "slug": "school-of-rock-2003",
    "title": "Школа рока",
    "originalTitle": "School of Rock",
    "type": "Фильм",
    "year": "2003",
    "rating": 0,
    "genres": [
      "Комедия",
      "Музыка",
      "Семейный"
    ],
    "tmdbId": 1584,
    "imdbId": "tt0332379"
  },
  {
    "id": 970002,
    "kinopoiskId": 760763,
    "slug": "chef-2014",
    "title": "Повар на колёсах",
    "originalTitle": "Chef",
    "type": "Фильм",
    "year": "2014",
    "rating": 0,
    "genres": [
      "Комедия",
      "Драма",
      "Приключения"
    ],
    "imdbId": "tt2883512"
  },
  {
    "id": 970003,
    "kinopoiskId": 913703,
    "slug": "hunt-for-the-wilderpeople-2016",
    "title": "Охота на дикарей",
    "originalTitle": "Hunt for the Wilderpeople",
    "type": "Фильм",
    "year": "2016",
    "rating": 0,
    "genres": [
      "Комедия",
      "Приключения",
      "Драма"
    ],
    "tmdbId": 371645,
    "imdbId": "tt4698684"
  },
  {
    "id": 970004,
    "kinopoiskId": 1108494,
    "slug": "instant-family-2018",
    "title": "Семья по-быстрому",
    "originalTitle": "Instant Family",
    "type": "Фильм",
    "year": "2018",
    "rating": 0,
    "genres": [
      "Комедия",
      "Драма",
      "Семейный"
    ],
    "imdbId": "tt7401588"
  },
  {
    "id": 970005,
    "kinopoiskId": 1112132,
    "slug": "hereditary-2018",
    "title": "Реинкарнация",
    "originalTitle": "Hereditary",
    "type": "Фильм",
    "year": "2018",
    "rating": 0,
    "genres": [
      "Ужасы",
      "Драма",
      "Триллер"
    ],
    "imdbId": "tt7784604"
  },
  {
    "id": 970006,
    "kinopoiskId": 590022,
    "slug": "sinister-2012",
    "title": "Синистер",
    "originalTitle": "Sinister",
    "type": "Фильм",
    "year": "2012",
    "rating": 0,
    "genres": [
      "Ужасы",
      "Детектив",
      "Триллер"
    ],
    "tmdbId": 82507,
    "imdbId": "tt1922777"
  },
  {
    "id": 970007,
    "kinopoiskId": 675216,
    "slug": "the-babadook-2014",
    "title": "Бабадук",
    "originalTitle": "The Babadook",
    "type": "Фильм",
    "year": "2014",
    "rating": 0,
    "genres": [
      "Ужасы",
      "Драма",
      "Мистика"
    ],
    "imdbId": "tt2321549"
  },
  {
    "id": 970008,
    "kinopoiskId": 919515,
    "slug": "lights-out-2016",
    "title": "И гаснет свет",
    "originalTitle": "Lights Out",
    "type": "Фильм",
    "year": "2016",
    "rating": 0,
    "genres": [
      "Ужасы",
      "Триллер",
      "Мистика"
    ],
    "imdbId": "tt4786282"
  },
  {
    "id": 970009,
    "kinopoiskId": 494,
    "slug": "the-others-2001",
    "title": "Другие",
    "originalTitle": "The Others",
    "type": "Фильм",
    "year": "2001",
    "rating": 0,
    "genres": [
      "Ужасы",
      "Триллер",
      "Детектив"
    ],
    "tmdbId": 1933,
    "imdbId": "tt0230600"
  },
  {
    "id": 970010,
    "kinopoiskId": 1253633,
    "slug": "the-queens-gambit-2020",
    "title": "Ход королевы",
    "originalTitle": "The Queen's Gambit",
    "type": "Сериал",
    "year": "2020",
    "rating": 0,
    "genres": [
      "Драма",
      "Спорт"
    ],
    "imdbId": "tt10048342"
  },
  {
    "id": 970011,
    "kinopoiskId": 714102,
    "slug": "brooklyn-nine-nine-2013",
    "title": "Бруклин 9-9",
    "originalTitle": "Brooklyn Nine-Nine",
    "type": "Сериал",
    "year": "2013–2021",
    "rating": 0,
    "genres": [
      "Комедия",
      "Криминал"
    ],
    "imdbId": "tt2467372"
  },
  {
    "id": 970012,
    "kinopoiskId": 4295380,
    "slug": "only-murders-in-the-building-2021",
    "title": "Убийства в одном здании",
    "originalTitle": "Only Murders in the Building",
    "type": "Сериал",
    "year": "2021–…",
    "rating": 0,
    "genres": [
      "Комедия",
      "Детектив",
      "Криминал"
    ],
    "imdbId": "tt11691774"
  },
  {
    "id": 970013,
    "kinopoiskId": 472329,
    "slug": "modern-family-2009",
    "title": "Американская семейка",
    "originalTitle": "Modern Family",
    "type": "Сериал",
    "year": "2009–2020",
    "rating": 0,
    "genres": [
      "Комедия",
      "Семейный"
    ],
    "tmdbId": 1421,
    "imdbId": "tt1442437"
  },
  {
    "id": 970014,
    "kinopoiskId": 471825,
    "slug": "community-2009",
    "title": "Сообщество",
    "originalTitle": "Community",
    "type": "Сериал",
    "year": "2009–2015",
    "rating": 0,
    "genres": [
      "Комедия"
    ],
    "tmdbId": 18347,
    "imdbId": "tt1439629"
  },
  {
    "id": 970015,
    "kinopoiskId": 775278,
    "slug": "encanto-2021",
    "title": "Энканто",
    "originalTitle": "Encanto",
    "type": "Мультфильм",
    "year": "2021",
    "rating": 0,
    "genres": [
      "Мультфильм",
      "Музыка",
      "Семейный"
    ],
    "tmdbId": 568124,
    "imdbId": "tt2953050"
  },
  {
    "id": 970016,
    "kinopoiskId": 1146303,
    "slug": "the-mitchells-vs-the-machines-2021",
    "title": "Митчеллы против машин",
    "originalTitle": "The Mitchells vs. the Machines",
    "type": "Мультфильм",
    "year": "2021",
    "rating": 0,
    "genres": [
      "Мультфильм",
      "Комедия",
      "Фантастика"
    ],
    "tmdbId": 501929,
    "imdbId": "tt7979580"
  },
  {
    "id": 970017,
    "kinopoiskId": 1311146,
    "slug": "the-bad-guys-2022",
    "title": "Плохие парни",
    "originalTitle": "The Bad Guys",
    "type": "Мультфильм",
    "year": "2022",
    "rating": 0,
    "genres": [
      "Мультфильм",
      "Комедия",
      "Криминал"
    ],
    "tmdbId": 629542,
    "imdbId": "tt8115900"
  },
  {
    "id": 970018,
    "kinopoiskId": 4512501,
    "slug": "the-sea-beast-2022",
    "title": "Морской монстр",
    "originalTitle": "The Sea Beast",
    "type": "Мультфильм",
    "year": "2022",
    "rating": 0,
    "genres": [
      "Мультфильм",
      "Приключения",
      "Фэнтези"
    ],
    "imdbId": "tt9288046"
  },
  {
    "id": 970019,
    "kinopoiskId": 669880,
    "slug": "the-book-of-life-2014",
    "title": "Книга жизни",
    "originalTitle": "The Book of Life",
    "type": "Мультфильм",
    "year": "2014",
    "rating": 0,
    "genres": [
      "Мультфильм",
      "Фэнтези",
      "Музыка"
    ],
    "imdbId": "tt2262227"
  }
];

function createManualGoodPopularCardPoster(movie: ManualGoodPopularCardEntry) {
  const fallback = getTmdbPoster({
    tmdbId: movie.tmdbId,
    imdbId: movie.imdbId,
    title: movie.title,
    originalTitle: movie.originalTitle,
    year: movie.year,
    type: movie.type,
  });

  return {
    poster: getKinopoiskPoster({ kinopoiskId: movie.kinopoiskId, fallback }),
    posterFallbacks: [fallback],
  };
}

export const manualGoodPopularMovieCardIndex: MovieCardIndexItem[] = manualGoodPopularCardEntries.map((movie) => {
  const posterData = createManualGoodPopularCardPoster(movie);

  return {
    id: movie.id,
    slug: movie.slug,
    title: movie.title,
    type: movie.type,
    year: movie.year,
    rating: movie.rating,
    genres: movie.genres.map((genre) => genre.toLowerCase()),
    ...posterData,
  };
});
