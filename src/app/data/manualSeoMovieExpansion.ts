import type { CastMember, Movie, MovieFact, MovieFaqItem } from "./movies";
import { createKinoLumaPoster, getTmdbPoster } from "../lib/imageLinks";

const MANUAL_SEO_SOURCE = "kinoluma-manual-seo-expansion-100-v1";

type ManualSeoMovieExpansionEntry = Omit<
  Movie,
  "poster" | "posterFallbacks" | "facts" | "faq" | "players" | "source" | "longDescription" | "description"
> & {
  duration: string;
  director: string;
  mood: string;
  themes: string;
  summary: string;
  cast: CastMember[];
};

const rawManualSeoMovieExpansionEntries: ManualSeoMovieExpansionEntry[] = [
  {
    "slug": "coherence-2013",
    "title": "Связь",
    "originalTitle": "Coherence",
    "year": "2013",
    "rating": 7.2,
    "genres": [
      "Фантастика",
      "Триллер",
      "Детектив"
    ],
    "countries": [
      "США",
      "Великобритания"
    ],
    "duration": "89 мин",
    "director": "James Ward Byrkit",
    "mood": "камерное напряжение, паранойя, разговорная фантастика",
    "themes": "случайность, двойники, выбор, хрупкость реальности",
    "summary": "Гости обычного ужина сталкиваются с событием, после которого привычная реальность начинает рассыпаться на тревожные варианты.",
    "imdbId": "tt2866360",
    "cast": [
      {
        "name": "Emily Baldoni",
        "role": "Эм"
      },
      {
        "name": "Maury Sterling",
        "role": "Кевин"
      },
      {
        "name": "Nicholas Brendon",
        "role": "Майк"
      },
      {
        "name": "Lorene Scafaria",
        "role": "Ли"
      }
    ],
    "id": 984000,
    "type": "Фильм",
    "searchTitles": [
      "связь",
      "coherence",
      "связь 2013",
      "coherence 2013"
    ],
    "trailerUrl": "",
    "seoTitle": "Связь (2013) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Связь (2013) — фантастика, триллер, детектив: рейтинг 7.2, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "annihilation-2018",
    "title": "Аннигиляция",
    "originalTitle": "Annihilation",
    "year": "2018",
    "rating": 6.8,
    "genres": [
      "Фантастика",
      "Драма",
      "Триллер"
    ],
    "countries": [
      "США",
      "Великобритания"
    ],
    "duration": "115 мин",
    "director": "Alex Garland",
    "mood": "гипнотическая, тревожная, медитативная фантастика",
    "themes": "мутация, память, саморазрушение, неизвестность",
    "summary": "Учёная входит в загадочную зону, где природа меняет правила жизни, а личные воспоминания становятся не менее опасными, чем внешняя угроза.",
    "imdbId": "tt2798920",
    "cast": [
      {
        "name": "Natalie Portman",
        "role": "Лина"
      },
      {
        "name": "Jennifer Jason Leigh",
        "role": "доктор Вентресс"
      },
      {
        "name": "Gina Rodriguez",
        "role": "Аня Торенсен"
      },
      {
        "name": "Tessa Thompson",
        "role": "Джози Радек"
      }
    ],
    "id": 984001,
    "type": "Фильм",
    "searchTitles": [
      "аннигиляция",
      "annihilation",
      "аннигиляция 2018",
      "annihilation 2018"
    ],
    "trailerUrl": "",
    "seoTitle": "Аннигиляция (2018) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Аннигиляция (2018) — фантастика, драма, триллер: рейтинг 6.8, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "children-of-men-2006",
    "title": "Дитя человеческое",
    "originalTitle": "Children of Men",
    "year": "2006",
    "rating": 7.9,
    "genres": [
      "Фантастика",
      "Драма",
      "Триллер"
    ],
    "countries": [
      "Великобритания",
      "США"
    ],
    "duration": "109 мин",
    "director": "Alfonso Cuarón",
    "mood": "мрачная, нервная, реалистичная антиутопия",
    "themes": "надежда, миграция, насилие системы, будущее",
    "summary": "В мире без новых детей разочарованный человек получает шанс сопроводить девушку, от которой может зависеть продолжение человеческой истории.",
    "imdbId": "tt0206634",
    "cast": [
      {
        "name": "Clive Owen",
        "role": "Тео Фарон"
      },
      {
        "name": "Julianne Moore",
        "role": "Джулиан Тейлор"
      },
      {
        "name": "Clare-Hope Ashitey",
        "role": "Ки"
      },
      {
        "name": "Michael Caine",
        "role": "Джаспер Палмер"
      }
    ],
    "id": 984002,
    "type": "Фильм",
    "searchTitles": [
      "дитя человеческое",
      "children of men",
      "дитя человеческое 2006",
      "children of men 2006"
    ],
    "trailerUrl": "",
    "seoTitle": "Дитя человеческое (2006) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Дитя человеческое (2006) — фантастика, драма, триллер: рейтинг 7.9, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-fountain-2006",
    "title": "Фонтан",
    "originalTitle": "The Fountain",
    "year": "2006",
    "rating": 7.2,
    "genres": [
      "Фантастика",
      "Драма",
      "Мелодрама"
    ],
    "countries": [
      "США",
      "Канада"
    ],
    "duration": "96 мин",
    "director": "Darren Aronofsky",
    "mood": "поэтичная, визуальная, философская притча",
    "themes": "любовь, смерть, принятие, поиск бессмертия",
    "summary": "Три связанные линии превращают историю любви и утраты в размышление о том, как человек пытается победить время.",
    "imdbId": "tt0414993",
    "cast": [
      {
        "name": "Hugh Jackman",
        "role": "Том / Томми"
      },
      {
        "name": "Rachel Weisz",
        "role": "Иззи / королева Изабель"
      },
      {
        "name": "Ellen Burstyn",
        "role": "доктор Лиллиан Гузетти"
      }
    ],
    "id": 984003,
    "type": "Фильм",
    "searchTitles": [
      "фонтан",
      "the fountain",
      "фонтан 2006",
      "the fountain 2006"
    ],
    "trailerUrl": "",
    "seoTitle": "Фонтан (2006) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Фонтан (2006) — фантастика, драма, мелодрама: рейтинг 7.2, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-fall-2006",
    "title": "Запределье",
    "originalTitle": "The Fall",
    "year": "2006",
    "rating": 7.8,
    "genres": [
      "Фэнтези",
      "Драма",
      "Приключения"
    ],
    "countries": [
      "США",
      "Индия",
      "Великобритания"
    ],
    "duration": "117 мин",
    "director": "Tarsem Singh",
    "mood": "сказочная, яркая, меланхоличная одиссея",
    "themes": "воображение, дружба, боль, сила рассказа",
    "summary": "Каскадёр в больнице рассказывает девочке фантастическую историю, и вымысел постепенно начинает отражать его собственную рану.",
    "imdbId": "tt0460791",
    "cast": [
      {
        "name": "Lee Pace",
        "role": "Рой Уокер"
      },
      {
        "name": "Catinca Untaru",
        "role": "Александрия"
      },
      {
        "name": "Justine Waddell",
        "role": "сестра Эвелин"
      }
    ],
    "id": 984004,
    "type": "Фильм",
    "searchTitles": [
      "запределье",
      "the fall",
      "запределье 2006",
      "the fall 2006"
    ],
    "trailerUrl": "",
    "seoTitle": "Запределье (2006) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Запределье (2006) — фэнтези, драма, приключения: рейтинг 7.8, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "pride-and-prejudice-2005",
    "title": "Гордость и предубеждение",
    "originalTitle": "Pride & Prejudice",
    "year": "2005",
    "rating": 7.8,
    "genres": [
      "Драма",
      "Мелодрама"
    ],
    "countries": [
      "Великобритания",
      "Франция",
      "США"
    ],
    "duration": "129 мин",
    "director": "Joe Wright",
    "mood": "изящная, романтичная, остроумная классика",
    "themes": "семья, выбор, предубеждение, чувство собственного достоинства",
    "summary": "Элизабет Беннет учится отличать гордость от честности, а первое впечатление — от настоящего характера человека.",
    "imdbId": "tt0414387",
    "cast": [
      {
        "name": "Keira Knightley",
        "role": "Элизабет Беннет"
      },
      {
        "name": "Matthew Macfadyen",
        "role": "мистер Дарси"
      },
      {
        "name": "Donald Sutherland",
        "role": "мистер Беннет"
      },
      {
        "name": "Brenda Blethyn",
        "role": "миссис Беннет"
      }
    ],
    "id": 984005,
    "type": "Фильм",
    "searchTitles": [
      "гордость и предубеждение",
      "pride & prejudice",
      "гордость и предубеждение 2005",
      "pride & prejudice 2005"
    ],
    "trailerUrl": "",
    "seoTitle": "Гордость и предубеждение (2005) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Гордость и предубеждение (2005) — драма, мелодрама: рейтинг 7.8, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-theory-of-everything-2014",
    "title": "Вселенная Стивена Хокинга",
    "originalTitle": "The Theory of Everything",
    "year": "2014",
    "rating": 7.7,
    "genres": [
      "Биография",
      "Драма",
      "Мелодрама"
    ],
    "countries": [
      "Великобритания",
      "Япония",
      "США"
    ],
    "duration": "123 мин",
    "director": "James Marsh",
    "mood": "человечная, вдохновляющая, камерная биография",
    "themes": "наука, любовь, болезнь, стойкость",
    "summary": "Биографическая драма показывает не только научный путь Стивена Хокинга, но и сложную семейную историю рядом с ним.",
    "imdbId": "tt2980516",
    "cast": [
      {
        "name": "Eddie Redmayne",
        "role": "Стивен Хокинг"
      },
      {
        "name": "Felicity Jones",
        "role": "Джейн Хокинг"
      },
      {
        "name": "Charlie Cox",
        "role": "Джонатан Джонс"
      },
      {
        "name": "Emily Watson",
        "role": "Берил Уайлд"
      }
    ],
    "id": 984006,
    "type": "Фильм",
    "searchTitles": [
      "вселенная стивена хокинга",
      "the theory of everything",
      "вселенная стивена хокинга 2014",
      "the theory of everything 2014"
    ],
    "trailerUrl": "",
    "seoTitle": "Вселенная Стивена Хокинга (2014) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Вселенная Стивена Хокинга (2014) — биография, драма, мелодрама: рейтинг 7.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "ford-v-ferrari-2019",
    "title": "Ford против Ferrari",
    "originalTitle": "Ford v Ferrari",
    "year": "2019",
    "rating": 8.1,
    "genres": [
      "Биография",
      "Драма",
      "Спорт"
    ],
    "countries": [
      "США"
    ],
    "duration": "152 мин",
    "director": "James Mangold",
    "mood": "драйвовая, мужская, спортивная драма",
    "themes": "гонки, инженерия, дружба, давление корпораций",
    "summary": "Автоконструктор и гонщик пытаются собрать машину, способную бросить вызов Ferrari на трассе, где скорость проверяет характер.",
    "imdbId": "tt1950186",
    "cast": [
      {
        "name": "Matt Damon",
        "role": "Кэрролл Шелби"
      },
      {
        "name": "Christian Bale",
        "role": "Кен Майлз"
      },
      {
        "name": "Jon Bernthal",
        "role": "Ли Якокка"
      },
      {
        "name": "Caitríona Balfe",
        "role": "Молли Майлз"
      }
    ],
    "id": 984007,
    "type": "Фильм",
    "searchTitles": [
      "ford против ferrari",
      "ford v ferrari",
      "ford против ferrari 2019",
      "ford v ferrari 2019"
    ],
    "trailerUrl": "",
    "seoTitle": "Ford против Ferrari (2019) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Ford против Ferrari (2019) — биография, драма, спорт: рейтинг 8.1, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "warrior-2011",
    "title": "Воин",
    "originalTitle": "Warrior",
    "year": "2011",
    "rating": 8.1,
    "genres": [
      "Драма",
      "Спорт",
      "Боевик"
    ],
    "countries": [
      "США"
    ],
    "duration": "140 мин",
    "director": "Gavin O'Connor",
    "mood": "жёсткая, эмоциональная, спортивная драма",
    "themes": "семья, вина, братство, борьба",
    "summary": "Два брата с разными ранами выходят на один турнир, где физическая схватка становится разговором о семье и прощении.",
    "imdbId": "tt1291584",
    "cast": [
      {
        "name": "Tom Hardy",
        "role": "Томми Конлон"
      },
      {
        "name": "Joel Edgerton",
        "role": "Брендан Конлон"
      },
      {
        "name": "Nick Nolte",
        "role": "Пэдди Конлон"
      },
      {
        "name": "Jennifer Morrison",
        "role": "Тесс Конлон"
      }
    ],
    "id": 984008,
    "type": "Фильм",
    "searchTitles": [
      "воин",
      "warrior",
      "воин 2011",
      "warrior 2011"
    ],
    "trailerUrl": "",
    "seoTitle": "Воин (2011) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Воин (2011) — драма, спорт, боевик: рейтинг 8.1, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "prisoners-2013",
    "title": "Пленницы",
    "originalTitle": "Prisoners",
    "year": "2013",
    "rating": 8.1,
    "genres": [
      "Триллер",
      "Драма",
      "Детектив"
    ],
    "countries": [
      "США"
    ],
    "duration": "153 мин",
    "director": "Denis Villeneuve",
    "mood": "мрачная, давящая, морально напряжённая",
    "themes": "родительство, отчаяние, справедливость, границы выбора",
    "summary": "После исчезновения детей отец и детектив идут разными путями, и каждый шаг проверяет, где заканчивается поиск правды и начинается опасная одержимость.",
    "imdbId": "tt1392214",
    "cast": [
      {
        "name": "Hugh Jackman",
        "role": "Келлер Довер"
      },
      {
        "name": "Jake Gyllenhaal",
        "role": "детектив Локи"
      },
      {
        "name": "Viola Davis",
        "role": "Нэнси Бирч"
      },
      {
        "name": "Paul Dano",
        "role": "Алекс Джонс"
      }
    ],
    "id": 984009,
    "type": "Фильм",
    "searchTitles": [
      "пленницы",
      "prisoners",
      "пленницы 2013",
      "prisoners 2013"
    ],
    "trailerUrl": "",
    "seoTitle": "Пленницы (2013) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Пленницы (2013) — триллер, драма, детектив: рейтинг 8.1, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "sicario-2015",
    "title": "Убийца",
    "originalTitle": "Sicario",
    "year": "2015",
    "rating": 7.7,
    "genres": [
      "Триллер",
      "Криминал",
      "Драма"
    ],
    "countries": [
      "США",
      "Мексика",
      "Гонконг"
    ],
    "duration": "121 мин",
    "director": "Denis Villeneuve",
    "mood": "сухая, тревожная, силовая операция",
    "themes": "закон, граница, месть, серая мораль",
    "summary": "Агент ФБР попадает в операцию против картеля и быстро понимает, что официальные правила там работают хуже, чем тишина и страх.",
    "imdbId": "tt3397884",
    "cast": [
      {
        "name": "Emily Blunt",
        "role": "Кейт Мейсер"
      },
      {
        "name": "Benicio del Toro",
        "role": "Алехандро"
      },
      {
        "name": "Josh Brolin",
        "role": "Мэтт Грейвер"
      },
      {
        "name": "Daniel Kaluuya",
        "role": "Реджи Уэйн"
      }
    ],
    "id": 984010,
    "type": "Фильм",
    "searchTitles": [
      "убийца",
      "sicario",
      "убийца 2015",
      "sicario 2015"
    ],
    "trailerUrl": "",
    "seoTitle": "Убийца (2015) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Убийца (2015) — триллер, криминал, драма: рейтинг 7.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "hell-or-high-water-2016",
    "title": "Любой ценой",
    "originalTitle": "Hell or High Water",
    "year": "2016",
    "rating": 7.6,
    "genres": [
      "Криминал",
      "Драма",
      "Триллер"
    ],
    "countries": [
      "США"
    ],
    "duration": "102 мин",
    "director": "David Mackenzie",
    "mood": "пыльная, грустная, напряжённая неовестерн-драма",
    "themes": "семья, долги, земля, цена свободы",
    "summary": "Братья грабят банки в техасской глубинке, а уставший рейнджер пытается понять, что за отчаяние толкает их вперёд.",
    "imdbId": "tt2582782",
    "cast": [
      {
        "name": "Chris Pine",
        "role": "Тоби Ховард"
      },
      {
        "name": "Ben Foster",
        "role": "Таннер Ховард"
      },
      {
        "name": "Jeff Bridges",
        "role": "Маркус Хэмилтон"
      },
      {
        "name": "Gil Birmingham",
        "role": "Альберто Паркер"
      }
    ],
    "id": 984011,
    "type": "Фильм",
    "searchTitles": [
      "любой ценой",
      "hell or high water",
      "любой ценой 2016",
      "hell or high water 2016"
    ],
    "trailerUrl": "",
    "seoTitle": "Любой ценой (2016) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Любой ценой (2016) — криминал, драма, триллер: рейтинг 7.6, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "wind-river-2017",
    "title": "Ветреная река",
    "originalTitle": "Wind River",
    "year": "2017",
    "rating": 7.7,
    "genres": [
      "Драма",
      "Триллер",
      "Криминал"
    ],
    "countries": [
      "США",
      "Великобритания",
      "Канада"
    ],
    "duration": "107 мин",
    "director": "Taylor Sheridan",
    "mood": "ледяная, скорбная, расследовательская",
    "themes": "утрата, изоляция, справедливость, территория",
    "summary": "Охотник и агент ФБР расследуют гибель девушки в резервации, где суровый ландшафт скрывает не меньше боли, чем улики.",
    "imdbId": "tt5362988",
    "cast": [
      {
        "name": "Jeremy Renner",
        "role": "Кори Ламберт"
      },
      {
        "name": "Elizabeth Olsen",
        "role": "Джейн Бэннер"
      },
      {
        "name": "Gil Birmingham",
        "role": "Мартин Хансон"
      },
      {
        "name": "Graham Greene",
        "role": "Бен"
      }
    ],
    "id": 984012,
    "type": "Фильм",
    "searchTitles": [
      "ветреная река",
      "wind river",
      "ветреная река 2017",
      "wind river 2017"
    ],
    "trailerUrl": "",
    "seoTitle": "Ветреная река (2017) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Ветреная река (2017) — драма, триллер, криминал: рейтинг 7.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "nocturnal-animals-2016",
    "title": "Под покровом ночи",
    "originalTitle": "Nocturnal Animals",
    "year": "2016",
    "rating": 7.5,
    "genres": [
      "Драма",
      "Триллер"
    ],
    "countries": [
      "США"
    ],
    "duration": "116 мин",
    "director": "Tom Ford",
    "mood": "стильная, холодная, психологически колкая",
    "themes": "искусство, месть, вина, прошлое",
    "summary": "Галеристка получает роман бывшего мужа, и вымышленная жестокая история начинает звучать как личное обвинение.",
    "imdbId": "tt4550098",
    "cast": [
      {
        "name": "Amy Adams",
        "role": "Сьюзан Морроу"
      },
      {
        "name": "Jake Gyllenhaal",
        "role": "Эдвард / Тони"
      },
      {
        "name": "Michael Shannon",
        "role": "Бобби Андес"
      },
      {
        "name": "Aaron Taylor-Johnson",
        "role": "Рэй Маркус"
      }
    ],
    "id": 984013,
    "type": "Фильм",
    "searchTitles": [
      "под покровом ночи",
      "nocturnal animals",
      "под покровом ночи 2016",
      "nocturnal animals 2016"
    ],
    "trailerUrl": "",
    "seoTitle": "Под покровом ночи (2016) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Под покровом ночи (2016) — драма, триллер: рейтинг 7.5, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-farewell-2019",
    "title": "Прощание",
    "originalTitle": "The Farewell",
    "year": "2019",
    "rating": 7.5,
    "genres": [
      "Драма",
      "Комедия"
    ],
    "countries": [
      "США",
      "Китай"
    ],
    "duration": "100 мин",
    "director": "Lulu Wang",
    "mood": "нежная, семейная, горько-смешная",
    "themes": "семья, эмиграция, традиции, молчание",
    "summary": "Американка китайского происхождения возвращается к семье, где любовь выражают не прямотой, а сложным общим решением.",
    "imdbId": "tt8637428",
    "cast": [
      {
        "name": "Awkwafina",
        "role": "Билли"
      },
      {
        "name": "Zhao Shuzhen",
        "role": "Най Най"
      },
      {
        "name": "Tzi Ma",
        "role": "Хайян"
      },
      {
        "name": "Diana Lin",
        "role": "Цзянь"
      }
    ],
    "id": 984014,
    "type": "Фильм",
    "searchTitles": [
      "прощание",
      "the farewell",
      "прощание 2019",
      "the farewell 2019"
    ],
    "trailerUrl": "",
    "seoTitle": "Прощание (2019) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Прощание (2019) — драма, комедия: рейтинг 7.5, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "minari-2020",
    "title": "Минари",
    "originalTitle": "Minari",
    "year": "2020",
    "rating": 7.4,
    "genres": [
      "Драма"
    ],
    "countries": [
      "США"
    ],
    "duration": "115 мин",
    "director": "Lee Isaac Chung",
    "mood": "тихая, семейная, тёпло-горькая",
    "themes": "эмиграция, дом, труд, поколение",
    "summary": "Корейская семья строит ферму в американской глубинке, где мечта о доме требует терпения, риска и взаимной поддержки.",
    "imdbId": "tt10633456",
    "cast": [
      {
        "name": "Steven Yeun",
        "role": "Джейкоб"
      },
      {
        "name": "Yeri Han",
        "role": "Моника"
      },
      {
        "name": "Alan Kim",
        "role": "Дэвид"
      },
      {
        "name": "Youn Yuh-jung",
        "role": "Сун-джа"
      }
    ],
    "id": 984015,
    "type": "Фильм",
    "searchTitles": [
      "минари",
      "minari",
      "минари 2020",
      "minari 2020"
    ],
    "trailerUrl": "",
    "seoTitle": "Минари (2020) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Минари (2020) — драма: рейтинг 7.4, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "past-lives-2023",
    "title": "Прошлые жизни",
    "originalTitle": "Past Lives",
    "year": "2023",
    "rating": 7.8,
    "genres": [
      "Драма",
      "Мелодрама"
    ],
    "countries": [
      "США",
      "Южная Корея"
    ],
    "duration": "106 мин",
    "director": "Celine Song",
    "mood": "тонкая, взрослая, тихо-романтичная",
    "themes": "память, выбор, миграция, несбывшееся",
    "summary": "Двое людей из детства встречаются спустя годы и разговаривают не только о чувствах, но и о версиях жизни, которые могли случиться.",
    "imdbId": "tt13238346",
    "cast": [
      {
        "name": "Greta Lee",
        "role": "Нора"
      },
      {
        "name": "Teo Yoo",
        "role": "Хэ Сон"
      },
      {
        "name": "John Magaro",
        "role": "Артур"
      }
    ],
    "id": 984016,
    "type": "Фильм",
    "searchTitles": [
      "прошлые жизни",
      "past lives",
      "прошлые жизни 2023",
      "past lives 2023"
    ],
    "trailerUrl": "",
    "seoTitle": "Прошлые жизни (2023) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Прошлые жизни (2023) — драма, мелодрама: рейтинг 7.8, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-worst-person-in-the-world-2021",
    "title": "Худший человек на свете",
    "originalTitle": "The Worst Person in the World",
    "year": "2021",
    "rating": 7.7,
    "genres": [
      "Драма",
      "Комедия",
      "Мелодрама"
    ],
    "countries": [
      "Норвегия",
      "Франция",
      "Швеция",
      "Дания"
    ],
    "duration": "128 мин",
    "director": "Joachim Trier",
    "mood": "ироничная, взрослая, живая история поиска себя",
    "themes": "самоопределение, любовь, тридцатилетие, свобода",
    "summary": "Молодая женщина меняет решения, отношения и профессию, пытаясь честно понять, чего хочет от собственной жизни.",
    "imdbId": "tt10370710",
    "cast": [
      {
        "name": "Renate Reinsve",
        "role": "Юлие"
      },
      {
        "name": "Anders Danielsen Lie",
        "role": "Аксель"
      },
      {
        "name": "Herbert Nordrum",
        "role": "Эйвинд"
      }
    ],
    "id": 984017,
    "type": "Фильм",
    "searchTitles": [
      "худший человек на свете",
      "the worst person in the world",
      "худший человек на свете 2021",
      "the worst person in the world 2021"
    ],
    "trailerUrl": "",
    "seoTitle": "Худший человек на свете (2021) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Худший человек на свете (2021) — драма, комедия, мелодрама: рейтинг 7.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-hunt-2012",
    "title": "Охота",
    "originalTitle": "Jagten",
    "year": "2012",
    "rating": 8.3,
    "genres": [
      "Драма"
    ],
    "countries": [
      "Дания",
      "Швеция"
    ],
    "duration": "115 мин",
    "director": "Thomas Vinterberg",
    "mood": "тяжёлая, сдержанная, социально напряжённая",
    "themes": "репутация, доверие, страх, коллективное давление",
    "summary": "Одна ошибка в восприятии превращает жизнь воспитателя в испытание, где правда проигрывает скорости слухов.",
    "imdbId": "tt2106476",
    "cast": [
      {
        "name": "Mads Mikkelsen",
        "role": "Лукас"
      },
      {
        "name": "Thomas Bo Larsen",
        "role": "Тео"
      },
      {
        "name": "Annika Wedderkopp",
        "role": "Клара"
      }
    ],
    "id": 984018,
    "type": "Фильм",
    "searchTitles": [
      "охота",
      "jagten",
      "охота 2012",
      "jagten 2012"
    ],
    "trailerUrl": "",
    "seoTitle": "Охота (2012) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Охота (2012) — драма: рейтинг 8.3, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-lives-of-others-2006",
    "title": "Жизнь других",
    "originalTitle": "Das Leben der Anderen",
    "year": "2006",
    "rating": 8.4,
    "genres": [
      "Драма",
      "Триллер"
    ],
    "countries": [
      "Германия",
      "Франция"
    ],
    "duration": "137 мин",
    "director": "Florian Henckel von Donnersmarck",
    "mood": "сдержанная, историческая, морально точная",
    "themes": "наблюдение, совесть, искусство, государственный контроль",
    "summary": "Офицер спецслужб следит за писателем и постепенно сталкивается с человеческой стороной тех, кого должен только контролировать.",
    "imdbId": "tt0405094",
    "cast": [
      {
        "name": "Ulrich Mühe",
        "role": "Герд Вислер"
      },
      {
        "name": "Martina Gedeck",
        "role": "Криста-Мария Зиланд"
      },
      {
        "name": "Sebastian Koch",
        "role": "Георг Драйман"
      }
    ],
    "id": 984019,
    "type": "Фильм",
    "searchTitles": [
      "жизнь других",
      "das leben der anderen",
      "жизнь других 2006",
      "das leben der anderen 2006"
    ],
    "trailerUrl": "",
    "seoTitle": "Жизнь других (2006) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Жизнь других (2006) — драма, триллер: рейтинг 8.4, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "a-separation-2011",
    "title": "Развод Надера и Симин",
    "originalTitle": "Jodaeiye Nader az Simin",
    "year": "2011",
    "rating": 8.3,
    "genres": [
      "Драма"
    ],
    "countries": [
      "Иран",
      "Франция",
      "Австралия"
    ],
    "duration": "123 мин",
    "director": "Asghar Farhadi",
    "mood": "реалистичная, напряжённая, морально многослойная",
    "themes": "семья, правда, долг, социальное давление",
    "summary": "Семейный конфликт запускает цепочку решений, где каждый герой по-своему прав и по-своему загнан обстоятельствами.",
    "imdbId": "tt1832382",
    "cast": [
      {
        "name": "Leila Hatami",
        "role": "Симин"
      },
      {
        "name": "Peyman Moaadi",
        "role": "Надер"
      },
      {
        "name": "Sareh Bayat",
        "role": "Разие"
      },
      {
        "name": "Shahab Hosseini",
        "role": "Ходжат"
      }
    ],
    "id": 984020,
    "type": "Фильм",
    "searchTitles": [
      "развод надера и симин",
      "jodaeiye nader az simin",
      "развод надера и симин 2011",
      "jodaeiye nader az simin 2011"
    ],
    "trailerUrl": "",
    "seoTitle": "Развод Надера и Симин (2011) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Развод Надера и Симин (2011) — драма: рейтинг 8.3, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "shoplifters-2018",
    "title": "Магазинные воришки",
    "originalTitle": "Manbiki kazoku",
    "year": "2018",
    "rating": 7.9,
    "genres": [
      "Драма",
      "Криминал"
    ],
    "countries": [
      "Япония"
    ],
    "duration": "121 мин",
    "director": "Hirokazu Kore-eda",
    "mood": "тихая, человечная, горько-семейная",
    "themes": "бедность, выбранная семья, забота, закон",
    "summary": "Небогатая семья принимает маленькую девочку, и история постепенно спрашивает, что делает людей родными на самом деле.",
    "imdbId": "tt8075192",
    "cast": [
      {
        "name": "Lily Franky",
        "role": "Осаму"
      },
      {
        "name": "Sakura Ando",
        "role": "Нобуё"
      },
      {
        "name": "Mayu Matsuoka",
        "role": "Аки"
      },
      {
        "name": "Kairi Jō",
        "role": "Сёта"
      }
    ],
    "id": 984021,
    "type": "Фильм",
    "searchTitles": [
      "магазинные воришки",
      "manbiki kazoku",
      "магазинные воришки 2018",
      "manbiki kazoku 2018"
    ],
    "trailerUrl": "",
    "seoTitle": "Магазинные воришки (2018) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Магазинные воришки (2018) — драма, криминал: рейтинг 7.9, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "decision-to-leave-2022",
    "title": "Решение уйти",
    "originalTitle": "Heojil kyolshim",
    "year": "2022",
    "rating": 7.3,
    "genres": [
      "Детектив",
      "Мелодрама",
      "Триллер"
    ],
    "countries": [
      "Южная Корея"
    ],
    "duration": "138 мин",
    "director": "Park Chan-wook",
    "mood": "элегантная, загадочная, чувственная головоломка",
    "themes": "одержимость, расследование, желание, недосказанность",
    "summary": "Детектив расследует смерть мужчины и всё сильнее запутывается в чувствах к главной подозреваемой.",
    "imdbId": "tt12477480",
    "cast": [
      {
        "name": "Tang Wei",
        "role": "Со-рэ"
      },
      {
        "name": "Park Hae-il",
        "role": "Хэ-джун"
      },
      {
        "name": "Lee Jung-hyun",
        "role": "Чон-ан"
      }
    ],
    "id": 984022,
    "type": "Фильм",
    "searchTitles": [
      "решение уйти",
      "heojil kyolshim",
      "решение уйти 2022",
      "heojil kyolshim 2022"
    ],
    "trailerUrl": "",
    "seoTitle": "Решение уйти (2022) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Решение уйти (2022) — детектив, мелодрама, триллер: рейтинг 7.3, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "drive-my-car-2021",
    "title": "Сядь за руль моей машины",
    "originalTitle": "Drive My Car",
    "year": "2021",
    "rating": 7.5,
    "genres": [
      "Драма"
    ],
    "countries": [
      "Япония"
    ],
    "duration": "179 мин",
    "director": "Ryusuke Hamaguchi",
    "mood": "медленная, литературная, терапевтическая драма",
    "themes": "утрата, театр, молчание, доверие",
    "summary": "Режиссёр готовит постановку и через поездки с молодой водительницей постепенно возвращается к разговору о собственном горе.",
    "imdbId": "tt14039582",
    "cast": [
      {
        "name": "Hidetoshi Nishijima",
        "role": "Юсукэ Кафуку"
      },
      {
        "name": "Toko Miura",
        "role": "Мисаки Ватари"
      },
      {
        "name": "Reika Kirishima",
        "role": "Ото"
      }
    ],
    "id": 984023,
    "type": "Фильм",
    "searchTitles": [
      "сядь за руль моей машины",
      "drive my car",
      "сядь за руль моей машины 2021",
      "drive my car 2021"
    ],
    "trailerUrl": "",
    "seoTitle": "Сядь за руль моей машины (2021) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Сядь за руль моей машины (2021) — драма: рейтинг 7.5, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "memories-of-murder-2003",
    "title": "Воспоминания об убийстве",
    "originalTitle": "Salinui chueok",
    "year": "2003",
    "rating": 8.1,
    "genres": [
      "Криминал",
      "Драма",
      "Детектив"
    ],
    "countries": [
      "Южная Корея"
    ],
    "duration": "132 мин",
    "director": "Bong Joon Ho",
    "mood": "мрачная, ироничная, беспокойная криминальная драма",
    "themes": "расследование, бессилие, провинция, правда",
    "summary": "Детективы в корейской провинции пытаются поймать серийного преступника, но методы и обстоятельства постоянно работают против них.",
    "imdbId": "tt0353969",
    "cast": [
      {
        "name": "Song Kang-ho",
        "role": "Пак Ту-ман"
      },
      {
        "name": "Kim Sang-kyung",
        "role": "Со Тхэ-юн"
      },
      {
        "name": "Kim Roi-ha",
        "role": "Чо Ён-гу"
      }
    ],
    "id": 984024,
    "type": "Фильм",
    "searchTitles": [
      "воспоминания об убийстве",
      "salinui chueok",
      "воспоминания об убийстве 2003",
      "salinui chueok 2003"
    ],
    "trailerUrl": "",
    "seoTitle": "Воспоминания об убийстве (2003) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Воспоминания об убийстве (2003) — криминал, драма, детектив: рейтинг 8.1, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-wailing-2016",
    "title": "Вопль",
    "originalTitle": "Goksung",
    "year": "2016",
    "rating": 7.4,
    "genres": [
      "Ужасы",
      "Детектив",
      "Триллер"
    ],
    "countries": [
      "Южная Корея"
    ],
    "duration": "156 мин",
    "director": "Na Hong-jin",
    "mood": "густая, фольклорная, тревожная мистерия",
    "themes": "суеверия, страх, вина, деревенская паника",
    "summary": "Полицейский сталкивается с чередой странных событий в деревне, где каждый новый ответ только усиливает ощущение угрозы.",
    "imdbId": "tt5215952",
    "cast": [
      {
        "name": "Kwak Do-won",
        "role": "Чон-гу"
      },
      {
        "name": "Hwang Jung-min",
        "role": "Иль-гван"
      },
      {
        "name": "Chun Woo-hee",
        "role": "Му-мён"
      }
    ],
    "id": 984025,
    "type": "Фильм",
    "searchTitles": [
      "вопль",
      "goksung",
      "вопль 2016",
      "goksung 2016"
    ],
    "trailerUrl": "",
    "seoTitle": "Вопль (2016) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Вопль (2016) — ужасы, детектив, триллер: рейтинг 7.4, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "train-to-busan-2016",
    "title": "Поезд в Пусан",
    "originalTitle": "Busanhaeng",
    "year": "2016",
    "rating": 7.6,
    "genres": [
      "Ужасы",
      "Боевик",
      "Триллер"
    ],
    "countries": [
      "Южная Корея"
    ],
    "duration": "118 мин",
    "director": "Yeon Sang-ho",
    "mood": "быстрая, эмоциональная, клаустрофобная",
    "themes": "семья, паника, самопожертвование, выживание",
    "summary": "Пассажиры скоростного поезда оказываются в ловушке во время эпидемии, где скорость движения не гарантирует спасения.",
    "imdbId": "tt5700672",
    "cast": [
      {
        "name": "Gong Yoo",
        "role": "Сок-у"
      },
      {
        "name": "Jung Yu-mi",
        "role": "Сон-гён"
      },
      {
        "name": "Ma Dong-seok",
        "role": "Сан-хва"
      },
      {
        "name": "Kim Su-an",
        "role": "Су-ан"
      }
    ],
    "id": 984026,
    "type": "Фильм",
    "searchTitles": [
      "поезд в пусан",
      "busanhaeng",
      "поезд в пусан 2016",
      "busanhaeng 2016"
    ],
    "trailerUrl": "",
    "seoTitle": "Поезд в Пусан (2016) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Поезд в Пусан (2016) — ужасы, боевик, триллер: рейтинг 7.6, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "in-the-mood-for-love-2000",
    "title": "Любовное настроение",
    "originalTitle": "Fa yeung nin wah",
    "year": "2000",
    "rating": 8.1,
    "genres": [
      "Драма",
      "Мелодрама"
    ],
    "countries": [
      "Гонконг",
      "Франция"
    ],
    "duration": "98 мин",
    "director": "Wong Kar-wai",
    "mood": "утончённая, меланхоличная, почти музыкальная",
    "themes": "невысказанная любовь, одиночество, память, этикет",
    "summary": "Два соседа замечают измены супругов и сближаются так осторожно, будто каждое слово может нарушить хрупкое равновесие.",
    "imdbId": "tt0118694",
    "cast": [
      {
        "name": "Tony Leung Chiu-wai",
        "role": "Чоу Мо-ван"
      },
      {
        "name": "Maggie Cheung",
        "role": "Су Ли-чжэнь"
      },
      {
        "name": "Rebecca Pan",
        "role": "миссис Сун"
      }
    ],
    "id": 984027,
    "type": "Фильм",
    "searchTitles": [
      "любовное настроение",
      "fa yeung nin wah",
      "любовное настроение 2000",
      "fa yeung nin wah 2000"
    ],
    "trailerUrl": "",
    "seoTitle": "Любовное настроение (2000) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Любовное настроение (2000) — драма, мелодрама: рейтинг 8.1, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "lost-in-translation-2003",
    "title": "Трудности перевода",
    "originalTitle": "Lost in Translation",
    "year": "2003",
    "rating": 7.7,
    "genres": [
      "Драма",
      "Комедия"
    ],
    "countries": [
      "США",
      "Япония"
    ],
    "duration": "102 мин",
    "director": "Sofia Coppola",
    "mood": "ночная, мягкая, городская меланхолия",
    "themes": "одиночество, случайная близость, взросление, чужой город",
    "summary": "Актёр и молодая женщина встречаются в Токио и находят друг в друге тихую поддержку посреди усталости и неопределённости.",
    "imdbId": "tt0335266",
    "cast": [
      {
        "name": "Bill Murray",
        "role": "Боб Харрис"
      },
      {
        "name": "Scarlett Johansson",
        "role": "Шарлотта"
      },
      {
        "name": "Giovanni Ribisi",
        "role": "Джон"
      }
    ],
    "id": 984028,
    "type": "Фильм",
    "searchTitles": [
      "трудности перевода",
      "lost in translation",
      "трудности перевода 2003",
      "lost in translation 2003"
    ],
    "trailerUrl": "",
    "seoTitle": "Трудности перевода (2003) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Трудности перевода (2003) — драма, комедия: рейтинг 7.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "frances-ha-2012",
    "title": "Милая Фрэнсис",
    "originalTitle": "Frances Ha",
    "year": "2012",
    "rating": 7.4,
    "genres": [
      "Драма",
      "Комедия"
    ],
    "countries": [
      "США",
      "Бразилия"
    ],
    "duration": "86 мин",
    "director": "Noah Baumbach",
    "mood": "лёгкая, неловкая, честная городская комедия",
    "themes": "дружба, взросление, мечта, самоирония",
    "summary": "Фрэнсис мечется между работой, дружбой и мечтой о танце, превращая обычные неудачи в портрет взросления без пафоса.",
    "imdbId": "tt2347569",
    "cast": [
      {
        "name": "Greta Gerwig",
        "role": "Фрэнсис"
      },
      {
        "name": "Mickey Sumner",
        "role": "Софи"
      },
      {
        "name": "Adam Driver",
        "role": "Лев"
      }
    ],
    "id": 984029,
    "type": "Фильм",
    "searchTitles": [
      "милая фрэнсис",
      "frances ha",
      "милая фрэнсис 2012",
      "frances ha 2012"
    ],
    "trailerUrl": "",
    "seoTitle": "Милая Фрэнсис (2012) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Милая Фрэнсис (2012) — драма, комедия: рейтинг 7.4, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "little-miss-sunshine-2006",
    "title": "Маленькая мисс Счастье",
    "originalTitle": "Little Miss Sunshine",
    "year": "2006",
    "rating": 7.8,
    "genres": [
      "Драма",
      "Комедия"
    ],
    "countries": [
      "США"
    ],
    "duration": "101 мин",
    "director": "Jonathan Dayton, Valerie Faris",
    "mood": "тёплая, странная, семейная роуд-комедия",
    "themes": "семья, провал, поддержка, принятие",
    "summary": "Семья с ворохом проблем едет через страну на детский конкурс, и сама дорога оказывается важнее победы.",
    "imdbId": "tt0449059",
    "cast": [
      {
        "name": "Abigail Breslin",
        "role": "Олив"
      },
      {
        "name": "Greg Kinnear",
        "role": "Ричард"
      },
      {
        "name": "Toni Collette",
        "role": "Шерил"
      },
      {
        "name": "Steve Carell",
        "role": "Фрэнк"
      },
      {
        "name": "Alan Arkin",
        "role": "дедушка Эдвин"
      },
      {
        "name": "Paul Dano",
        "role": "Дуэйн"
      }
    ],
    "id": 984030,
    "type": "Фильм",
    "searchTitles": [
      "маленькая мисс счастье",
      "little miss sunshine",
      "маленькая мисс счастье 2006",
      "little miss sunshine 2006"
    ],
    "trailerUrl": "",
    "seoTitle": "Маленькая мисс Счастье (2006) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Маленькая мисс Счастье (2006) — драма, комедия: рейтинг 7.8, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "sing-street-2016",
    "title": "Синг Стрит",
    "originalTitle": "Sing Street",
    "year": "2016",
    "rating": 7.9,
    "genres": [
      "Драма",
      "Комедия",
      "Музыка"
    ],
    "countries": [
      "Ирландия",
      "Великобритания",
      "США"
    ],
    "duration": "106 мин",
    "director": "John Carney",
    "mood": "яркая, музыкальная, подростковая надежда",
    "themes": "музыка, первая любовь, побег, взросление",
    "summary": "Подросток в Дублине 1980-х собирает группу, чтобы впечатлить девушку и придумать себе будущее громче школьных проблем.",
    "imdbId": "tt3544112",
    "cast": [
      {
        "name": "Ferdia Walsh-Peelo",
        "role": "Конор"
      },
      {
        "name": "Lucy Boynton",
        "role": "Рафина"
      },
      {
        "name": "Jack Reynor",
        "role": "Брендан"
      }
    ],
    "id": 984031,
    "type": "Фильм",
    "searchTitles": [
      "синг стрит",
      "sing street",
      "синг стрит 2016",
      "sing street 2016"
    ],
    "trailerUrl": "",
    "seoTitle": "Синг Стрит (2016) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Синг Стрит (2016) — драма, комедия, музыка: рейтинг 7.9, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "once-2007",
    "title": "Однажды",
    "originalTitle": "Once",
    "year": "2007",
    "rating": 7.8,
    "genres": [
      "Драма",
      "Мелодрама",
      "Музыка"
    ],
    "countries": [
      "Ирландия"
    ],
    "duration": "86 мин",
    "director": "John Carney",
    "mood": "скромная, музыкальная, очень живая",
    "themes": "творчество, случайная встреча, честность, город",
    "summary": "Уличный музыкант и эмигрантка записывают песни, в которых их короткая встреча звучит честнее многих признаний.",
    "imdbId": "tt0907657",
    "cast": [
      {
        "name": "Glen Hansard",
        "role": "парень"
      },
      {
        "name": "Markéta Irglová",
        "role": "девушка"
      }
    ],
    "id": 984032,
    "type": "Фильм",
    "searchTitles": [
      "однажды",
      "once",
      "однажды 2007",
      "once 2007"
    ],
    "trailerUrl": "",
    "seoTitle": "Однажды (2007) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Однажды (2007) — драма, мелодрама, музыка: рейтинг 7.8, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "begin-again-2013",
    "title": "Хоть раз в жизни",
    "originalTitle": "Begin Again",
    "year": "2013",
    "rating": 7.4,
    "genres": [
      "Драма",
      "Комедия",
      "Музыка"
    ],
    "countries": [
      "США"
    ],
    "duration": "104 мин",
    "director": "John Carney",
    "mood": "светлая, городская, музыкальная перезагрузка",
    "themes": "музыка, расставание, второй шанс, Нью-Йорк",
    "summary": "Певица и продюсер записывают альбом прямо на улицах Нью-Йорка, превращая неудачи в новый творческий маршрут.",
    "imdbId": "tt1980929",
    "cast": [
      {
        "name": "Keira Knightley",
        "role": "Гретта"
      },
      {
        "name": "Mark Ruffalo",
        "role": "Дэн"
      },
      {
        "name": "Adam Levine",
        "role": "Дэйв"
      }
    ],
    "id": 984033,
    "type": "Фильм",
    "searchTitles": [
      "хоть раз в жизни",
      "begin again",
      "хоть раз в жизни 2013",
      "begin again 2013"
    ],
    "trailerUrl": "",
    "seoTitle": "Хоть раз в жизни (2013) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Хоть раз в жизни (2013) — драма, комедия, музыка: рейтинг 7.4, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "whale-rider-2002",
    "title": "Оседлавший кита",
    "originalTitle": "Whale Rider",
    "year": "2002",
    "rating": 7.5,
    "genres": [
      "Драма",
      "Семейный"
    ],
    "countries": [
      "Новая Зеландия",
      "Германия"
    ],
    "duration": "101 мин",
    "director": "Niki Caro",
    "mood": "духовная, семейная, прибрежная драма",
    "themes": "традиции, лидерство, девочка-героиня, наследие",
    "summary": "Девочка из народа маори стремится доказать, что право вести семью определяется не ожиданиями, а внутренней силой.",
    "imdbId": "tt0298228",
    "cast": [
      {
        "name": "Keisha Castle-Hughes",
        "role": "Пайкеа"
      },
      {
        "name": "Rawiri Paratene",
        "role": "Коро"
      },
      {
        "name": "Vicky Haughton",
        "role": "Нэнни Флауэрс"
      }
    ],
    "id": 984034,
    "type": "Фильм",
    "searchTitles": [
      "оседлавший кита",
      "whale rider",
      "оседлавший кита 2002",
      "whale rider 2002"
    ],
    "trailerUrl": "",
    "seoTitle": "Оседлавший кита (2002) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Оседлавший кита (2002) — драма, семейный: рейтинг 7.5, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "only-lovers-left-alive-2013",
    "title": "Выживут только любовники",
    "originalTitle": "Only Lovers Left Alive",
    "year": "2013",
    "rating": 7.2,
    "genres": [
      "Фэнтези",
      "Драма",
      "Мелодрама"
    ],
    "countries": [
      "Великобритания",
      "Германия",
      "Греция",
      "Франция"
    ],
    "duration": "123 мин",
    "director": "Jim Jarmusch",
    "mood": "ночная, ироничная, декадентская меланхолия",
    "themes": "вечность, искусство, любовь, усталость от мира",
    "summary": "Два древних вампира живут музыкой, книгами и взаимной нежностью, пока внешний хаос снова не нарушает их хрупкий покой.",
    "imdbId": "tt1714915",
    "cast": [
      {
        "name": "Tilda Swinton",
        "role": "Ева"
      },
      {
        "name": "Tom Hiddleston",
        "role": "Адам"
      },
      {
        "name": "Mia Wasikowska",
        "role": "Ава"
      },
      {
        "name": "John Hurt",
        "role": "Марлоу"
      }
    ],
    "id": 984035,
    "type": "Фильм",
    "searchTitles": [
      "выживут только любовники",
      "only lovers left alive",
      "выживут только любовники 2013",
      "only lovers left alive 2013"
    ],
    "trailerUrl": "",
    "seoTitle": "Выживут только любовники (2013) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Выживут только любовники (2013) — фэнтези, драма, мелодрама: рейтинг 7.2, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "seven-psychopaths-2012",
    "title": "Семь психопатов",
    "originalTitle": "Seven Psychopaths",
    "year": "2012",
    "rating": 7.1,
    "genres": [
      "Криминал",
      "Комедия"
    ],
    "countries": [
      "Великобритания",
      "США"
    ],
    "duration": "110 мин",
    "director": "Martin McDonagh",
    "mood": "чёрная, болтливая, криминально-абсурдная",
    "themes": "сценарии, насилие, дружба, творческий тупик",
    "summary": "Сценарист ищет идею для фильма и попадает в историю с похищенной собакой, где персонажи опаснее любой выдумки.",
    "imdbId": "tt1931533",
    "cast": [
      {
        "name": "Colin Farrell",
        "role": "Марти"
      },
      {
        "name": "Sam Rockwell",
        "role": "Билли"
      },
      {
        "name": "Christopher Walken",
        "role": "Ханс"
      },
      {
        "name": "Woody Harrelson",
        "role": "Чарли"
      }
    ],
    "id": 984036,
    "type": "Фильм",
    "searchTitles": [
      "семь психопатов",
      "seven psychopaths",
      "семь психопатов 2012",
      "seven psychopaths 2012"
    ],
    "trailerUrl": "",
    "seoTitle": "Семь психопатов (2012) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Семь психопатов (2012) — криминал, комедия: рейтинг 7.1, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-banshees-of-inisherin-2022",
    "title": "Банши Инишерина",
    "originalTitle": "The Banshees of Inisherin",
    "year": "2022",
    "rating": 7.7,
    "genres": [
      "Драма",
      "Комедия"
    ],
    "countries": [
      "Ирландия",
      "Великобритания",
      "США"
    ],
    "duration": "114 мин",
    "director": "Martin McDonagh",
    "mood": "сухая, островная, трагикомичная",
    "themes": "дружба, обида, одиночество, упрямство",
    "summary": "На маленьком острове один мужчина внезапно прекращает дружбу с другим, и простая ссора разрастается до почти мифического масштаба.",
    "imdbId": "tt11813216",
    "cast": [
      {
        "name": "Colin Farrell",
        "role": "Падрик"
      },
      {
        "name": "Brendan Gleeson",
        "role": "Колм"
      },
      {
        "name": "Kerry Condon",
        "role": "Шивон"
      },
      {
        "name": "Barry Keoghan",
        "role": "Доминик"
      }
    ],
    "id": 984037,
    "type": "Фильм",
    "searchTitles": [
      "банши инишерина",
      "the banshees of inisherin",
      "банши инишерина 2022",
      "the banshees of inisherin 2022"
    ],
    "trailerUrl": "",
    "seoTitle": "Банши Инишерина (2022) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Банши Инишерина (2022) — драма, комедия: рейтинг 7.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "rocknrolla-2008",
    "title": "Рок-н-рольщик",
    "originalTitle": "RocknRolla",
    "year": "2008",
    "rating": 7.2,
    "genres": [
      "Боевик",
      "Криминал",
      "Комедия"
    ],
    "countries": [
      "Великобритания",
      "США",
      "Франция"
    ],
    "duration": "114 мин",
    "director": "Guy Ritchie",
    "mood": "быстрая, хулиганская, криминальная мозаика",
    "themes": "деньги, недвижимость, банда, обман",
    "summary": "Лондонские аферисты, бизнесмены и бандиты гоняются за деньгами и картиной, постоянно путаясь в чужих схемах.",
    "imdbId": "tt1032755",
    "cast": [
      {
        "name": "Gerard Butler",
        "role": "Один-Два"
      },
      {
        "name": "Tom Wilkinson",
        "role": "Ленни Коул"
      },
      {
        "name": "Thandiwe Newton",
        "role": "Стелла"
      },
      {
        "name": "Mark Strong",
        "role": "Арчи"
      },
      {
        "name": "Idris Elba",
        "role": "Мамблз"
      }
    ],
    "id": 984038,
    "type": "Фильм",
    "searchTitles": [
      "рок-н-рольщик",
      "rocknrolla",
      "рок-н-рольщик 2008",
      "rocknrolla 2008"
    ],
    "trailerUrl": "",
    "seoTitle": "Рок-н-рольщик (2008) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Рок-н-рольщик (2008) — боевик, криминал, комедия: рейтинг 7.2, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "kiss-kiss-bang-bang-2005",
    "title": "Поцелуй навылет",
    "originalTitle": "Kiss Kiss Bang Bang",
    "year": "2005",
    "rating": 7.5,
    "genres": [
      "Криминал",
      "Комедия",
      "Детектив"
    ],
    "countries": [
      "США"
    ],
    "duration": "103 мин",
    "director": "Shane Black",
    "mood": "язвительная, нуарная, быстрая комедия",
    "themes": "Голливуд, расследование, случайность, самоирония",
    "summary": "Мелкий вор случайно оказывается на кастинге и втягивается в расследование, где киношные клише начинают стрелять по-настоящему.",
    "imdbId": "tt0373469",
    "cast": [
      {
        "name": "Robert Downey Jr.",
        "role": "Гарри Локхарт"
      },
      {
        "name": "Val Kilmer",
        "role": "Перри ван Шрайк"
      },
      {
        "name": "Michelle Monaghan",
        "role": "Хармони Фейт Лейн"
      }
    ],
    "id": 984039,
    "type": "Фильм",
    "searchTitles": [
      "поцелуй навылет",
      "kiss kiss bang bang",
      "поцелуй навылет 2005",
      "kiss kiss bang bang 2005"
    ],
    "trailerUrl": "",
    "seoTitle": "Поцелуй навылет (2005) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Поцелуй навылет (2005) — криминал, комедия, детектив: рейтинг 7.5, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "brick-2005",
    "title": "Кирпич",
    "originalTitle": "Brick",
    "year": "2005",
    "rating": 7.2,
    "genres": [
      "Детектив",
      "Триллер",
      "Драма"
    ],
    "countries": [
      "США"
    ],
    "duration": "110 мин",
    "director": "Rian Johnson",
    "mood": "нуарная, школьная, сухо-загадочная",
    "themes": "расследование, подростки, кодекс, одиночка",
    "summary": "Старшеклассник расследует исчезновение бывшей девушки так, будто коридоры школы стали улицами классического нуара.",
    "imdbId": "tt0393109",
    "cast": [
      {
        "name": "Joseph Gordon-Levitt",
        "role": "Брендан"
      },
      {
        "name": "Nora Zehetner",
        "role": "Лора"
      },
      {
        "name": "Lukas Haas",
        "role": "Пин"
      }
    ],
    "id": 984040,
    "type": "Фильм",
    "searchTitles": [
      "кирпич",
      "brick",
      "кирпич 2005",
      "brick 2005"
    ],
    "trailerUrl": "",
    "seoTitle": "Кирпич (2005) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Кирпич (2005) — детектив, триллер, драма: рейтинг 7.2, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "blue-ruin-2013",
    "title": "Синяя руина",
    "originalTitle": "Blue Ruin",
    "year": "2013",
    "rating": 7.1,
    "genres": [
      "Триллер",
      "Криминал",
      "Драма"
    ],
    "countries": [
      "США",
      "Франция"
    ],
    "duration": "90 мин",
    "director": "Jeremy Saulnier",
    "mood": "холодная, неловко-реалистичная, напряжённая",
    "themes": "месть, семья, ошибка, последствия",
    "summary": "Обычный человек решает отомстить и быстро понимает, что реальная месть не похожа на аккуратный жанровый план.",
    "imdbId": "tt2359024",
    "cast": [
      {
        "name": "Macon Blair",
        "role": "Дуайт"
      },
      {
        "name": "Devin Ratray",
        "role": "Бен"
      },
      {
        "name": "Amy Hargreaves",
        "role": "Сэм"
      }
    ],
    "id": 984041,
    "type": "Фильм",
    "searchTitles": [
      "синяя руина",
      "blue ruin",
      "синяя руина 2013",
      "blue ruin 2013"
    ],
    "trailerUrl": "",
    "seoTitle": "Синяя руина (2013) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Синяя руина (2013) — триллер, криминал, драма: рейтинг 7.1, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "green-room-2015",
    "title": "Зелёная комната",
    "originalTitle": "Green Room",
    "year": "2015",
    "rating": 7.0,
    "genres": [
      "Триллер",
      "Ужасы",
      "Криминал"
    ],
    "countries": [
      "США"
    ],
    "duration": "95 мин",
    "director": "Jeremy Saulnier",
    "mood": "жёсткая, клаустрофобная, панк-напряжённая",
    "themes": "ловушка, выживание, музыка, насилие",
    "summary": "Панк-группа становится свидетелем преступления после концерта и оказывается заперта в месте, где каждый выход слишком дорог.",
    "imdbId": "tt4062536",
    "cast": [
      {
        "name": "Anton Yelchin",
        "role": "Пэт"
      },
      {
        "name": "Imogen Poots",
        "role": "Эмбер"
      },
      {
        "name": "Patrick Stewart",
        "role": "Дарси"
      },
      {
        "name": "Alia Shawkat",
        "role": "Сэм"
      }
    ],
    "id": 984042,
    "type": "Фильм",
    "searchTitles": [
      "зелёная комната",
      "green room",
      "зелёная комната 2015",
      "green room 2015"
    ],
    "trailerUrl": "",
    "seoTitle": "Зелёная комната (2015) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Зелёная комната (2015) — триллер, ужасы, криминал: рейтинг 7.0, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-gift-2015",
    "title": "Подарок",
    "originalTitle": "The Gift",
    "year": "2015",
    "rating": 7.0,
    "genres": [
      "Триллер",
      "Детектив",
      "Драма"
    ],
    "countries": [
      "США",
      "Австралия"
    ],
    "duration": "108 мин",
    "director": "Joel Edgerton",
    "mood": "приглушённая, бытовая, психологически неприятная",
    "themes": "прошлое, вина, манипуляция, семейная тревога",
    "summary": "Супружеская пара встречает знакомого из прошлого, и вежливые подарки постепенно превращаются в угрозу для их удобной жизни.",
    "imdbId": "tt4178092",
    "cast": [
      {
        "name": "Jason Bateman",
        "role": "Саймон"
      },
      {
        "name": "Rebecca Hall",
        "role": "Робин"
      },
      {
        "name": "Joel Edgerton",
        "role": "Гордо"
      }
    ],
    "id": 984043,
    "type": "Фильм",
    "searchTitles": [
      "подарок",
      "the gift",
      "подарок 2015",
      "the gift 2015"
    ],
    "trailerUrl": "",
    "seoTitle": "Подарок (2015) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Подарок (2015) — триллер, детектив, драма: рейтинг 7.0, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "run-2020",
    "title": "Взаперти",
    "originalTitle": "Run",
    "year": "2020",
    "rating": 6.7,
    "genres": [
      "Триллер",
      "Детектив"
    ],
    "countries": [
      "США"
    ],
    "duration": "90 мин",
    "director": "Aneesh Chaganty",
    "mood": "быстрая, домашняя, параноидальная",
    "themes": "контроль, материнство, секреты, побег",
    "summary": "Девушка, живущая под постоянной опекой матери, начинает замечать детали, которые делают заботу похожей на ловушку.",
    "imdbId": "tt8633478",
    "cast": [
      {
        "name": "Sarah Paulson",
        "role": "Диана"
      },
      {
        "name": "Kiera Allen",
        "role": "Хлоя"
      }
    ],
    "id": 984044,
    "type": "Фильм",
    "searchTitles": [
      "взаперти",
      "run",
      "взаперти 2020",
      "run 2020"
    ],
    "trailerUrl": "",
    "seoTitle": "Взаперти (2020) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Взаперти (2020) — триллер, детектив: рейтинг 6.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "hush-2016",
    "title": "Тишина",
    "originalTitle": "Hush",
    "year": "2016",
    "rating": 6.6,
    "genres": [
      "Триллер",
      "Ужасы"
    ],
    "countries": [
      "США"
    ],
    "duration": "82 мин",
    "director": "Mike Flanagan",
    "mood": "минималистичная, напряжённая, домашняя осада",
    "themes": "изоляция, внимание, выживание, тишина",
    "summary": "Глухая писательница в уединённом доме вынуждена бороться за жизнь, полагаясь на наблюдательность и хладнокровие.",
    "imdbId": "tt5022702",
    "cast": [
      {
        "name": "Kate Siegel",
        "role": "Мэдди"
      },
      {
        "name": "John Gallagher Jr.",
        "role": "человек в маске"
      },
      {
        "name": "Michael Trucco",
        "role": "Джон"
      }
    ],
    "id": 984045,
    "type": "Фильм",
    "searchTitles": [
      "тишина",
      "hush",
      "тишина 2016",
      "hush 2016"
    ],
    "trailerUrl": "",
    "seoTitle": "Тишина (2016) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Тишина (2016) — триллер, ужасы: рейтинг 6.6, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "oculus-2013",
    "title": "Окулус",
    "originalTitle": "Oculus",
    "year": "2013",
    "rating": 6.5,
    "genres": [
      "Ужасы",
      "Детектив"
    ],
    "countries": [
      "США"
    ],
    "duration": "104 мин",
    "director": "Mike Flanagan",
    "mood": "психологическая, зеркальная, тревожная",
    "themes": "память, семья, иллюзия, травма",
    "summary": "Брат и сестра пытаются доказать, что трагедию их семьи вызвало старинное зеркало, но прошлое снова начинает подменять реальность.",
    "imdbId": "tt2388715",
    "cast": [
      {
        "name": "Karen Gillan",
        "role": "Кэйли"
      },
      {
        "name": "Brenton Thwaites",
        "role": "Тим"
      },
      {
        "name": "Katee Sackhoff",
        "role": "Мари"
      },
      {
        "name": "Rory Cochrane",
        "role": "Алан"
      }
    ],
    "id": 984046,
    "type": "Фильм",
    "searchTitles": [
      "окулус",
      "oculus",
      "окулус 2013",
      "oculus 2013"
    ],
    "trailerUrl": "",
    "seoTitle": "Окулус (2013) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Окулус (2013) — ужасы, детектив: рейтинг 6.5, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-invisible-guest-2016",
    "title": "Невидимый гость",
    "originalTitle": "Contratiempo",
    "year": "2016",
    "rating": 8.0,
    "genres": [
      "Детектив",
      "Триллер",
      "Криминал"
    ],
    "countries": [
      "Испания"
    ],
    "duration": "106 мин",
    "director": "Oriol Paulo",
    "mood": "закрученная, разговорная, испанская головоломка",
    "themes": "алиби, вина, манипуляция, версия событий",
    "summary": "Успешный бизнесмен готовится к защите по делу об убийстве, а адвокат шаг за шагом разбирает его историю на противоречия.",
    "imdbId": "tt4857264",
    "cast": [
      {
        "name": "Mario Casas",
        "role": "Адриан Дория"
      },
      {
        "name": "Ana Wagener",
        "role": "Вирхиния Гудман"
      },
      {
        "name": "Bárbara Lennie",
        "role": "Лаура Видаль"
      }
    ],
    "id": 984047,
    "type": "Фильм",
    "searchTitles": [
      "невидимый гость",
      "contratiempo",
      "невидимый гость 2016",
      "contratiempo 2016"
    ],
    "trailerUrl": "",
    "seoTitle": "Невидимый гость (2016) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Невидимый гость (2016) — детектив, триллер, криминал: рейтинг 8.0, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-body-2012",
    "title": "Тело",
    "originalTitle": "El cuerpo",
    "year": "2012",
    "rating": 7.6,
    "genres": [
      "Триллер",
      "Детектив"
    ],
    "countries": [
      "Испания"
    ],
    "duration": "112 мин",
    "director": "Oriol Paulo",
    "mood": "ночная, загадочная, аккуратно обманчивая",
    "themes": "секреты, исчезновение, ревность, расследование",
    "summary": "Из морга исчезает тело влиятельной женщины, и расследование быстро превращается в игру подозрений между живыми.",
    "imdbId": "tt1937149",
    "cast": [
      {
        "name": "José Coronado",
        "role": "Хайме Пенья"
      },
      {
        "name": "Hugo Silva",
        "role": "Алекс Ульоа"
      },
      {
        "name": "Belén Rueda",
        "role": "Майка"
      },
      {
        "name": "Aura Garrido",
        "role": "Карла"
      }
    ],
    "id": 984048,
    "type": "Фильм",
    "searchTitles": [
      "тело",
      "el cuerpo",
      "тело 2012",
      "el cuerpo 2012"
    ],
    "trailerUrl": "",
    "seoTitle": "Тело (2012) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Тело (2012) — триллер, детектив: рейтинг 7.6, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "wild-tales-2014",
    "title": "Дикие истории",
    "originalTitle": "Relatos salvajes",
    "year": "2014",
    "rating": 8.1,
    "genres": [
      "Комедия",
      "Драма",
      "Триллер"
    ],
    "countries": [
      "Аргентина",
      "Испания"
    ],
    "duration": "122 мин",
    "director": "Damián Szifron",
    "mood": "чёрная, взрывная, сатирическая антология",
    "themes": "месть, абсурд, социальное давление, срыв",
    "summary": "Несколько историй показывают людей на грани, когда маленькая несправедливость неожиданно превращается в большой взрыв.",
    "imdbId": "tt3011894",
    "cast": [
      {
        "name": "Ricardo Darín",
        "role": "Симон"
      },
      {
        "name": "Oscar Martínez",
        "role": "Маурисио"
      },
      {
        "name": "Leonardo Sbaraglia",
        "role": "Диего"
      },
      {
        "name": "Érica Rivas",
        "role": "Ромина"
      }
    ],
    "id": 984049,
    "type": "Фильм",
    "searchTitles": [
      "дикие истории",
      "relatos salvajes",
      "дикие истории 2014",
      "relatos salvajes 2014"
    ],
    "trailerUrl": "",
    "seoTitle": "Дикие истории (2014) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Дикие истории (2014) — комедия, драма, триллер: рейтинг 8.1, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "perfect-strangers-2016",
    "title": "Идеальные незнакомцы",
    "originalTitle": "Perfetti sconosciuti",
    "year": "2016",
    "rating": 7.7,
    "genres": [
      "Драма",
      "Комедия"
    ],
    "countries": [
      "Италия"
    ],
    "duration": "97 мин",
    "director": "Paolo Genovese",
    "mood": "разговорная, едкая, камерная комедия положений",
    "themes": "секреты, дружба, брак, цифровая открытость",
    "summary": "Друзья за ужином решают читать вслух все входящие сообщения, и простая игра быстро вскрывает слишком много тайн.",
    "imdbId": "tt4901306",
    "cast": [
      {
        "name": "Giuseppe Battiston",
        "role": "Пеппе"
      },
      {
        "name": "Anna Foglietta",
        "role": "Карлотта"
      },
      {
        "name": "Marco Giallini",
        "role": "Рокко"
      },
      {
        "name": "Edoardo Leo",
        "role": "Козимо"
      }
    ],
    "id": 984050,
    "type": "Фильм",
    "searchTitles": [
      "идеальные незнакомцы",
      "perfetti sconosciuti",
      "идеальные незнакомцы 2016",
      "perfetti sconosciuti 2016"
    ],
    "trailerUrl": "",
    "seoTitle": "Идеальные незнакомцы (2016) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Идеальные незнакомцы (2016) — драма, комедия: рейтинг 7.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-intouchables-2011",
    "title": "1+1",
    "originalTitle": "Intouchables",
    "year": "2011",
    "rating": 8.5,
    "genres": [
      "Драма",
      "Комедия",
      "Биография"
    ],
    "countries": [
      "Франция"
    ],
    "duration": "112 мин",
    "director": "Olivier Nakache, Éric Toledano",
    "mood": "тёплая, энергичная, дружеская драмеди",
    "themes": "дружба, достоинство, забота, разные миры",
    "summary": "Аристократ после травмы нанимает помощника без привычной осторожности, и между ними возникает дружба, меняющая обоих.",
    "imdbId": "tt1675434",
    "cast": [
      {
        "name": "François Cluzet",
        "role": "Филипп"
      },
      {
        "name": "Omar Sy",
        "role": "Дрисс"
      },
      {
        "name": "Anne Le Ny",
        "role": "Ивонн"
      },
      {
        "name": "Audrey Fleurot",
        "role": "Магали"
      }
    ],
    "id": 984051,
    "type": "Фильм",
    "searchTitles": [
      "1+1",
      "intouchables",
      "1+1 2011",
      "intouchables 2011"
    ],
    "trailerUrl": "",
    "seoTitle": "1+1 (2011) смотреть онлайн фильм KinoLuma",
    "seoDescription": "1+1 (2011) — драма, комедия, биография: рейтинг 8.5, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-vast-of-night-2019",
    "title": "Бескрайняя ночь",
    "originalTitle": "The Vast of Night",
    "year": "2019",
    "rating": 6.7,
    "genres": [
      "Фантастика",
      "Детектив",
      "Триллер"
    ],
    "countries": [
      "США"
    ],
    "duration": "91 мин",
    "director": "Andrew Patterson",
    "mood": "ретро, ночная, радиофантастика малых деталей",
    "themes": "радио, провинция, тайна, любопытство",
    "summary": "В маленьком городке 1950-х телефонная операторша и радиоведущий ловят странный сигнал, который меняет обычную ночь.",
    "imdbId": "tt6803046",
    "cast": [
      {
        "name": "Sierra McCormick",
        "role": "Фэй"
      },
      {
        "name": "Jake Horowitz",
        "role": "Эверетт"
      },
      {
        "name": "Gail Cronauer",
        "role": "Мэйбл"
      }
    ],
    "id": 984052,
    "type": "Фильм",
    "searchTitles": [
      "бескрайняя ночь",
      "the vast of night",
      "бескрайняя ночь 2019",
      "the vast of night 2019"
    ],
    "trailerUrl": "",
    "seoTitle": "Бескрайняя ночь (2019) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Бескрайняя ночь (2019) — фантастика, детектив, триллер: рейтинг 6.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "columbus-2017",
    "title": "Коламбус",
    "originalTitle": "Columbus",
    "year": "2017",
    "rating": 7.2,
    "genres": [
      "Драма"
    ],
    "countries": [
      "США"
    ],
    "duration": "104 мин",
    "director": "Kogonada",
    "mood": "созерцательная, архитектурная, тихая драма",
    "themes": "архитектура, забота, застой, взросление",
    "summary": "Сын заболевшего учёного и местная девушка разговаривают среди модернистской архитектуры о долге, страхе и возможном будущем.",
    "imdbId": "tt5990474",
    "cast": [
      {
        "name": "John Cho",
        "role": "Джин"
      },
      {
        "name": "Haley Lu Richardson",
        "role": "Кейси"
      },
      {
        "name": "Parker Posey",
        "role": "Элеанор"
      },
      {
        "name": "Rory Culkin",
        "role": "Гэбриел"
      }
    ],
    "id": 984053,
    "type": "Фильм",
    "searchTitles": [
      "коламбус",
      "columbus",
      "коламбус 2017",
      "columbus 2017"
    ],
    "trailerUrl": "",
    "seoTitle": "Коламбус (2017) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Коламбус (2017) — драма: рейтинг 7.2, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "after-yang-2021",
    "title": "После Янга",
    "originalTitle": "After Yang",
    "year": "2021",
    "rating": 6.7,
    "genres": [
      "Фантастика",
      "Драма"
    ],
    "countries": [
      "США"
    ],
    "duration": "96 мин",
    "director": "Kogonada",
    "mood": "тихая, футуристическая, семейная медитация",
    "themes": "память, искусственный интеллект, семья, утрата",
    "summary": "Семья пытается восстановить андроида-компаньона и через его воспоминания заново понимает собственные связи.",
    "imdbId": "tt8633462",
    "cast": [
      {
        "name": "Colin Farrell",
        "role": "Джейк"
      },
      {
        "name": "Jodie Turner-Smith",
        "role": "Кира"
      },
      {
        "name": "Justin H. Min",
        "role": "Янг"
      },
      {
        "name": "Malea Emma Tjandrawidjaja",
        "role": "Мика"
      }
    ],
    "id": 984054,
    "type": "Фильм",
    "searchTitles": [
      "после янга",
      "after yang",
      "после янга 2021",
      "after yang 2021"
    ],
    "trailerUrl": "",
    "seoTitle": "После Янга (2021) смотреть онлайн фильм KinoLuma",
    "seoDescription": "После Янга (2021) — фантастика, драма: рейтинг 6.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "prospect-2018",
    "title": "Перспектива",
    "originalTitle": "Prospect",
    "year": "2018",
    "rating": 6.3,
    "genres": [
      "Фантастика",
      "Триллер",
      "Драма"
    ],
    "countries": [
      "США",
      "Канада"
    ],
    "duration": "100 мин",
    "director": "Christopher Caldwell, Zeek Earl",
    "mood": "грязная, инди-фантастика, выживание на чужой планете",
    "themes": "доверие, добыча, опасная сделка, взросление",
    "summary": "Отец и дочь высаживаются на токсичной луне ради редкой добычи, но чужая планета быстро ломает их расчёт.",
    "imdbId": "tt7946422",
    "cast": [
      {
        "name": "Sophie Thatcher",
        "role": "Си"
      },
      {
        "name": "Pedro Pascal",
        "role": "Эзра"
      },
      {
        "name": "Jay Duplass",
        "role": "Деймон"
      }
    ],
    "id": 984055,
    "type": "Фильм",
    "searchTitles": [
      "перспектива",
      "prospect",
      "перспектива 2018",
      "prospect 2018"
    ],
    "trailerUrl": "",
    "seoTitle": "Перспектива (2018) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Перспектива (2018) — фантастика, триллер, драма: рейтинг 6.3, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "safety-not-guaranteed-2012",
    "title": "Безопасность не гарантируется",
    "originalTitle": "Safety Not Guaranteed",
    "year": "2012",
    "rating": 6.9,
    "genres": [
      "Комедия",
      "Драма",
      "Фантастика"
    ],
    "countries": [
      "США"
    ],
    "duration": "86 мин",
    "director": "Colin Trevorrow",
    "mood": "инди, странная, мягко-фантастическая комедия",
    "themes": "доверие, одиночество, вера в невозможное, второй шанс",
    "summary": "Журналисты проверяют объявление о путешествии во времени и находят человека, которому, возможно, важнее быть услышанным, чем доказать свою правоту.",
    "imdbId": "tt1862079",
    "cast": [
      {
        "name": "Aubrey Plaza",
        "role": "Дариус"
      },
      {
        "name": "Mark Duplass",
        "role": "Кеннет"
      },
      {
        "name": "Jake Johnson",
        "role": "Джефф"
      }
    ],
    "id": 984056,
    "type": "Фильм",
    "searchTitles": [
      "безопасность не гарантируется",
      "safety not guaranteed",
      "безопасность не гарантируется 2012",
      "safety not guaranteed 2012"
    ],
    "trailerUrl": "",
    "seoTitle": "Безопасность не гарантируется (2012) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Безопасность не гарантируется (2012) — комедия, драма, фантастика: рейтинг 6.9, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "sound-of-metal-2019",
    "title": "Звук металла",
    "originalTitle": "Sound of Metal",
    "year": "2019",
    "rating": 7.7,
    "genres": [
      "Драма",
      "Музыка"
    ],
    "countries": [
      "США",
      "Бельгия"
    ],
    "duration": "120 мин",
    "director": "Darius Marder",
    "mood": "сдержанная, телесная, эмоционально честная",
    "themes": "слух, зависимость, принятие, идентичность",
    "summary": "Барабанщик теряет слух и вынужден перестроить не только профессию, но и представление о тишине, помощи и себе.",
    "imdbId": "tt5363618",
    "cast": [
      {
        "name": "Riz Ahmed",
        "role": "Рубен"
      },
      {
        "name": "Olivia Cooke",
        "role": "Лу"
      },
      {
        "name": "Paul Raci",
        "role": "Джо"
      }
    ],
    "id": 984057,
    "type": "Фильм",
    "searchTitles": [
      "звук металла",
      "sound of metal",
      "звук металла 2019",
      "sound of metal 2019"
    ],
    "trailerUrl": "",
    "seoTitle": "Звук металла (2019) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Звук металла (2019) — драма, музыка: рейтинг 7.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-peanut-butter-falcon-2019",
    "title": "Арахисовый сокол",
    "originalTitle": "The Peanut Butter Falcon",
    "year": "2019",
    "rating": 7.6,
    "genres": [
      "Драма",
      "Комедия",
      "Приключения"
    ],
    "countries": [
      "США"
    ],
    "duration": "97 мин",
    "director": "Tyler Nilson, Michael Schwartz",
    "mood": "солнечная, дорожная, дружеская сказка",
    "themes": "мечта, свобода, дружба, принятие",
    "summary": "Молодой парень сбегает из учреждения, чтобы стать рестлером, и находит попутчика, которому самому нужен новый путь.",
    "imdbId": "tt4364194",
    "cast": [
      {
        "name": "Zack Gottsagen",
        "role": "Зак"
      },
      {
        "name": "Shia LaBeouf",
        "role": "Тайлер"
      },
      {
        "name": "Dakota Johnson",
        "role": "Элеанор"
      }
    ],
    "id": 984058,
    "type": "Фильм",
    "searchTitles": [
      "арахисовый сокол",
      "the peanut butter falcon",
      "арахисовый сокол 2019",
      "the peanut butter falcon 2019"
    ],
    "trailerUrl": "",
    "seoTitle": "Арахисовый сокол (2019) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Арахисовый сокол (2019) — драма, комедия, приключения: рейтинг 7.6, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "leave-no-trace-2018",
    "title": "Не оставляй следов",
    "originalTitle": "Leave No Trace",
    "year": "2018",
    "rating": 7.1,
    "genres": [
      "Драма"
    ],
    "countries": [
      "США",
      "Канада"
    ],
    "duration": "109 мин",
    "director": "Debra Granik",
    "mood": "тихая, лесная, бережная драма",
    "themes": "отец и дочь, травма, свобода, общество",
    "summary": "Отец и дочь живут вне обычной системы, но встреча с миром заставляет их по-разному взглянуть на безопасность и дом.",
    "imdbId": "tt3892172",
    "cast": [
      {
        "name": "Ben Foster",
        "role": "Уилл"
      },
      {
        "name": "Thomasin McKenzie",
        "role": "Том"
      },
      {
        "name": "Dale Dickey",
        "role": "Дейл"
      }
    ],
    "id": 984059,
    "type": "Фильм",
    "searchTitles": [
      "не оставляй следов",
      "leave no trace",
      "не оставляй следов 2018",
      "leave no trace 2018"
    ],
    "trailerUrl": "",
    "seoTitle": "Не оставляй следов (2018) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Не оставляй следов (2018) — драма: рейтинг 7.1, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "first-reformed-2017",
    "title": "Дневник пастыря",
    "originalTitle": "First Reformed",
    "year": "2017",
    "rating": 7.1,
    "genres": [
      "Драма",
      "Триллер"
    ],
    "countries": [
      "США",
      "Великобритания",
      "Австралия"
    ],
    "duration": "113 мин",
    "director": "Paul Schrader",
    "mood": "аскетичная, тревожная, духовная драма",
    "themes": "вера, экологическая тревога, вина, одиночество",
    "summary": "Пастор маленькой церкви ведёт дневник и всё глубже погружается в кризис веры, тела и ответственности за мир.",
    "imdbId": "tt6053438",
    "cast": [
      {
        "name": "Ethan Hawke",
        "role": "Эрнст Толлер"
      },
      {
        "name": "Amanda Seyfried",
        "role": "Мэри"
      },
      {
        "name": "Cedric the Entertainer",
        "role": "пастор Джефферс"
      }
    ],
    "id": 984060,
    "type": "Фильм",
    "searchTitles": [
      "дневник пастыря",
      "first reformed",
      "дневник пастыря 2017",
      "first reformed 2017"
    ],
    "trailerUrl": "",
    "seoTitle": "Дневник пастыря (2017) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Дневник пастыря (2017) — драма, триллер: рейтинг 7.1, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "first-cow-2019",
    "title": "Первая корова",
    "originalTitle": "First Cow",
    "year": "2019",
    "rating": 7.1,
    "genres": [
      "Драма",
      "Вестерн"
    ],
    "countries": [
      "США"
    ],
    "duration": "122 мин",
    "director": "Kelly Reichardt",
    "mood": "медленная, земная, нежная история фронтира",
    "themes": "дружба, выживание, предпринимательство, природа",
    "summary": "Повар и иммигрант в Орегоне XIX века придумывают маленькое дело, которое держится на дружбе и очень рискованном молоке.",
    "imdbId": "tt9231040",
    "cast": [
      {
        "name": "John Magaro",
        "role": "Куки"
      },
      {
        "name": "Orion Lee",
        "role": "Кинг-Лу"
      },
      {
        "name": "Toby Jones",
        "role": "главный фактор"
      }
    ],
    "id": 984061,
    "type": "Фильм",
    "searchTitles": [
      "первая корова",
      "first cow",
      "первая корова 2019",
      "first cow 2019"
    ],
    "trailerUrl": "",
    "seoTitle": "Первая корова (2019) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Первая корова (2019) — драма, вестерн: рейтинг 7.1, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "pig-2021",
    "title": "Свинья",
    "originalTitle": "Pig",
    "year": "2021",
    "rating": 6.9,
    "genres": [
      "Драма",
      "Триллер"
    ],
    "countries": [
      "США",
      "Великобритания"
    ],
    "duration": "92 мин",
    "director": "Michael Sarnoski",
    "mood": "молчаливая, скорбная, неожиданно нежная",
    "themes": "утрата, ремесло, память, гастрономия",
    "summary": "Одинокий добытчик трюфелей ищет украденную свинью и через этот поиск возвращается к миру, от которого давно ушёл.",
    "imdbId": "tt11003218",
    "cast": [
      {
        "name": "Nicolas Cage",
        "role": "Роб"
      },
      {
        "name": "Alex Wolff",
        "role": "Амир"
      },
      {
        "name": "Adam Arkin",
        "role": "Дариус"
      }
    ],
    "id": 984062,
    "type": "Фильм",
    "searchTitles": [
      "свинья",
      "pig",
      "свинья 2021",
      "pig 2021"
    ],
    "trailerUrl": "",
    "seoTitle": "Свинья (2021) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Свинья (2021) — драма, триллер: рейтинг 6.9, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-green-knight-2021",
    "title": "Легенда о Зелёном рыцаре",
    "originalTitle": "The Green Knight",
    "year": "2021",
    "rating": 6.6,
    "genres": [
      "Фэнтези",
      "Драма",
      "Приключения"
    ],
    "countries": [
      "США",
      "Канада",
      "Ирландия",
      "Великобритания"
    ],
    "duration": "130 мин",
    "director": "David Lowery",
    "mood": "мистическая, медленная, средневековая притча",
    "themes": "честь, страх, искушение, взросление героя",
    "summary": "Сэр Гавейн отправляется навстречу странному испытанию, где рыцарская слава оказывается менее простой, чем легенды о ней.",
    "imdbId": "tt9243804",
    "cast": [
      {
        "name": "Dev Patel",
        "role": "Гавейн"
      },
      {
        "name": "Alicia Vikander",
        "role": "Эссель / леди"
      },
      {
        "name": "Joel Edgerton",
        "role": "лорд"
      }
    ],
    "id": 984063,
    "type": "Фильм",
    "searchTitles": [
      "легенда о зелёном рыцаре",
      "the green knight",
      "легенда о зелёном рыцаре 2021",
      "the green knight 2021"
    ],
    "trailerUrl": "",
    "seoTitle": "Легенда о Зелёном рыцаре (2021) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Легенда о Зелёном рыцаре (2021) — фэнтези, драма, приключения: рейтинг 6.6, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "shiva-baby-2020",
    "title": "Шива Бэйби",
    "originalTitle": "Shiva Baby",
    "year": "2020",
    "rating": 7.1,
    "genres": [
      "Комедия",
      "Драма"
    ],
    "countries": [
      "США",
      "Канада"
    ],
    "duration": "77 мин",
    "director": "Emma Seligman",
    "mood": "нервная, тесная, социально-неловкая комедия",
    "themes": "семья, секреты, тревога, взрослая неловкость",
    "summary": "Студентка приходит на семейные поминки и сталкивается там почти со всеми людьми, от которых хотела бы держаться подальше.",
    "imdbId": "tt11317142",
    "cast": [
      {
        "name": "Rachel Sennott",
        "role": "Даниэль"
      },
      {
        "name": "Molly Gordon",
        "role": "Майя"
      },
      {
        "name": "Polly Draper",
        "role": "Дебби"
      }
    ],
    "id": 984064,
    "type": "Фильм",
    "searchTitles": [
      "шива бэйби",
      "shiva baby",
      "шива бэйби 2020",
      "shiva baby 2020"
    ],
    "trailerUrl": "",
    "seoTitle": "Шива Бэйби (2020) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Шива Бэйби (2020) — комедия, драма: рейтинг 7.1, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "saint-maud-2019",
    "title": "Святая Мод",
    "originalTitle": "Saint Maud",
    "year": "2019",
    "rating": 6.7,
    "genres": [
      "Ужасы",
      "Драма",
      "Триллер"
    ],
    "countries": [
      "Великобритания"
    ],
    "duration": "84 мин",
    "director": "Rose Glass",
    "mood": "мрачная, религиозная, психологически тревожная",
    "themes": "вера, одиночество, одержимость, забота",
    "summary": "Медсестра, ухаживающая за умирающей пациенткой, всё глубже убеждается, что её личная миссия имеет священный смысл.",
    "imdbId": "tt7557108",
    "cast": [
      {
        "name": "Morfydd Clark",
        "role": "Мод"
      },
      {
        "name": "Jennifer Ehle",
        "role": "Аманда"
      }
    ],
    "id": 984065,
    "type": "Фильм",
    "searchTitles": [
      "святая мод",
      "saint maud",
      "святая мод 2019",
      "saint maud 2019"
    ],
    "trailerUrl": "",
    "seoTitle": "Святая Мод (2019) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Святая Мод (2019) — ужасы, драма, триллер: рейтинг 6.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-rider-2017",
    "title": "Наездник",
    "originalTitle": "The Rider",
    "year": "2017",
    "rating": 7.4,
    "genres": [
      "Драма",
      "Вестерн"
    ],
    "countries": [
      "США"
    ],
    "duration": "104 мин",
    "director": "Chloé Zhao",
    "mood": "тихая, природная, полудокументальная драма",
    "themes": "травма, идентичность, родео, принятие",
    "summary": "Молодой ковбой после травмы пытается понять, кем он останется, если больше не сможет жить прежней скоростью.",
    "imdbId": "tt6217608",
    "cast": [
      {
        "name": "Brady Jandreau",
        "role": "Брейди"
      },
      {
        "name": "Tim Jandreau",
        "role": "Уэйн"
      },
      {
        "name": "Lilly Jandreau",
        "role": "Лилли"
      }
    ],
    "id": 984066,
    "type": "Фильм",
    "searchTitles": [
      "наездник",
      "the rider",
      "наездник 2017",
      "the rider 2017"
    ],
    "trailerUrl": "",
    "seoTitle": "Наездник (2017) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Наездник (2017) — драма, вестерн: рейтинг 7.4, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "all-of-us-strangers-2023",
    "title": "Мы всем чужие",
    "originalTitle": "All of Us Strangers",
    "year": "2023",
    "rating": 7.7,
    "genres": [
      "Драма",
      "Фэнтези",
      "Мелодрама"
    ],
    "countries": [
      "Великобритания",
      "США"
    ],
    "duration": "105 мин",
    "director": "Andrew Haigh",
    "mood": "призрачная, интимная, болезненно нежная",
    "themes": "память, любовь, семья, одиночество",
    "summary": "Сценарист встречает соседа и одновременно возвращается к образам родителей, превращая личную тоску в разговор с прошлым.",
    "imdbId": "tt21192142",
    "cast": [
      {
        "name": "Andrew Scott",
        "role": "Адам"
      },
      {
        "name": "Paul Mescal",
        "role": "Гарри"
      },
      {
        "name": "Claire Foy",
        "role": "мать"
      },
      {
        "name": "Jamie Bell",
        "role": "отец"
      }
    ],
    "id": 984067,
    "type": "Фильм",
    "searchTitles": [
      "мы всем чужие",
      "all of us strangers",
      "мы всем чужие 2023",
      "all of us strangers 2023"
    ],
    "trailerUrl": "",
    "seoTitle": "Мы всем чужие (2023) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Мы всем чужие (2023) — драма, фэнтези, мелодрама: рейтинг 7.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "broker-2022",
    "title": "Посредник",
    "originalTitle": "Broker",
    "year": "2022",
    "rating": 7.1,
    "genres": [
      "Драма"
    ],
    "countries": [
      "Южная Корея",
      "Япония"
    ],
    "duration": "129 мин",
    "director": "Hirokazu Kore-eda",
    "mood": "дорожная, человечная, мягко-грустная",
    "themes": "материнство, найденная семья, вина, шанс",
    "summary": "Люди, связанные с беби-боксом, отправляются в странное путешествие, где незаконный поступок постепенно обрастает человеческими мотивами.",
    "imdbId": "tt13056052",
    "cast": [
      {
        "name": "Song Kang-ho",
        "role": "Сан-хён"
      },
      {
        "name": "Gang Dong-won",
        "role": "Дон-су"
      },
      {
        "name": "Bae Doona",
        "role": "Су-джин"
      },
      {
        "name": "Lee Ji-eun",
        "role": "Со-ён"
      }
    ],
    "id": 984068,
    "type": "Фильм",
    "searchTitles": [
      "посредник",
      "broker",
      "посредник 2022",
      "broker 2022"
    ],
    "trailerUrl": "",
    "seoTitle": "Посредник (2022) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Посредник (2022) — драма: рейтинг 7.1, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-quiet-girl-2022",
    "title": "Тихая девочка",
    "originalTitle": "An Cailín Ciúin",
    "year": "2022",
    "rating": 7.7,
    "genres": [
      "Драма"
    ],
    "countries": [
      "Ирландия"
    ],
    "duration": "95 мин",
    "director": "Colm Bairéad",
    "mood": "нежная, тихая, летняя семейная драма",
    "themes": "детство, забота, молчание, безопасность",
    "summary": "Замкнутую девочку отправляют на лето к родственникам, и в новом доме она впервые ощущает, что тишина может быть спокойной.",
    "imdbId": "tt15109082",
    "cast": [
      {
        "name": "Catherine Clinch",
        "role": "Кейт"
      },
      {
        "name": "Carrie Crowley",
        "role": "Эйблин"
      },
      {
        "name": "Andrew Bennett",
        "role": "Шон"
      }
    ],
    "id": 984069,
    "type": "Фильм",
    "searchTitles": [
      "тихая девочка",
      "an cailín ciúin",
      "тихая девочка 2022",
      "an cailín ciúin 2022"
    ],
    "trailerUrl": "",
    "seoTitle": "Тихая девочка (2022) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Тихая девочка (2022) — драма: рейтинг 7.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "close-2022",
    "title": "Близко",
    "originalTitle": "Close",
    "year": "2022",
    "rating": 7.8,
    "genres": [
      "Драма"
    ],
    "countries": [
      "Бельгия",
      "Франция",
      "Нидерланды"
    ],
    "duration": "104 мин",
    "director": "Lukas Dhont",
    "mood": "хрупкая, подростковая, болезненно честная",
    "themes": "дружба, взросление, давление окружения, вина",
    "summary": "Дружба двух мальчиков меняется под взглядом школы и взрослых, показывая, как легко нежность становится поводом для защиты.",
    "imdbId": "tt9660502",
    "cast": [
      {
        "name": "Eden Dambrine",
        "role": "Лео"
      },
      {
        "name": "Gustav De Waele",
        "role": "Реми"
      },
      {
        "name": "Émilie Dequenne",
        "role": "Софи"
      }
    ],
    "id": 984070,
    "type": "Фильм",
    "searchTitles": [
      "близко",
      "close",
      "близко 2022",
      "close 2022"
    ],
    "trailerUrl": "",
    "seoTitle": "Близко (2022) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Близко (2022) — драма: рейтинг 7.8, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "petite-maman-2021",
    "title": "Маленькая мама",
    "originalTitle": "Petite maman",
    "year": "2021",
    "rating": 7.4,
    "genres": [
      "Драма",
      "Фэнтези"
    ],
    "countries": [
      "Франция"
    ],
    "duration": "72 мин",
    "director": "Céline Sciamma",
    "mood": "тихая, сказочная, очень бережная",
    "themes": "детство, мать и дочь, память, утрата",
    "summary": "Девочка после семейной потери встречает в лесу ровесницу, и эта встреча мягко меняет её понимание матери.",
    "imdbId": "tt13204490",
    "cast": [
      {
        "name": "Joséphine Sanz",
        "role": "Нелли"
      },
      {
        "name": "Gabrielle Sanz",
        "role": "Марион"
      },
      {
        "name": "Nina Meurisse",
        "role": "мама"
      }
    ],
    "id": 984071,
    "type": "Фильм",
    "searchTitles": [
      "маленькая мама",
      "petite maman",
      "маленькая мама 2021",
      "petite maman 2021"
    ],
    "trailerUrl": "",
    "seoTitle": "Маленькая мама (2021) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Маленькая мама (2021) — драма, фэнтези: рейтинг 7.4, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "holy-spider-2022",
    "title": "Священный паук",
    "originalTitle": "Holy Spider",
    "year": "2022",
    "rating": 7.3,
    "genres": [
      "Криминал",
      "Драма",
      "Триллер"
    ],
    "countries": [
      "Дания",
      "Германия",
      "Швеция",
      "Франция"
    ],
    "duration": "118 мин",
    "director": "Ali Abbasi",
    "mood": "жёсткая, социальная, расследовательская",
    "themes": "преступление, общественное лицемерие, журналистика, страх",
    "summary": "Журналистка расследует серию убийств и сталкивается не только с преступником, но и с системой взглядов вокруг него.",
    "imdbId": "tt18550140",
    "cast": [
      {
        "name": "Zar Amir Ebrahimi",
        "role": "Рахими"
      },
      {
        "name": "Mehdi Bajestani",
        "role": "Саид"
      }
    ],
    "id": 984072,
    "type": "Фильм",
    "searchTitles": [
      "священный паук",
      "holy spider",
      "священный паук 2022",
      "holy spider 2022"
    ],
    "trailerUrl": "",
    "seoTitle": "Священный паук (2022) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Священный паук (2022) — криминал, драма, триллер: рейтинг 7.3, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "hit-the-road-2021",
    "title": "В путь",
    "originalTitle": "Jadde khaki",
    "year": "2021",
    "rating": 7.3,
    "genres": [
      "Драма"
    ],
    "countries": [
      "Иран"
    ],
    "duration": "93 мин",
    "director": "Panah Panahi",
    "mood": "дорожная, грустно-смешная, семейная",
    "themes": "семья, дорога, прощание, молчаливая тревога",
    "summary": "Иранская семья едет через страну, скрывая истинную цель поездки за шутками, музыкой и бытовыми спорами.",
    "imdbId": "tt14812782",
    "cast": [
      {
        "name": "Pantea Panahiha",
        "role": "мать"
      },
      {
        "name": "Hassan Madjooni",
        "role": "отец"
      },
      {
        "name": "Rayan Sarlak",
        "role": "младший брат"
      }
    ],
    "id": 984073,
    "type": "Фильм",
    "searchTitles": [
      "в путь",
      "jadde khaki",
      "в путь 2021",
      "jadde khaki 2021"
    ],
    "trailerUrl": "",
    "seoTitle": "В путь (2021) смотреть онлайн фильм KinoLuma",
    "seoDescription": "В путь (2021) — драма: рейтинг 7.3, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "riders-of-justice-2020",
    "title": "Рыцари справедливости",
    "originalTitle": "Retfærdighedens ryttere",
    "year": "2020",
    "rating": 7.5,
    "genres": [
      "Боевик",
      "Комедия",
      "Драма"
    ],
    "countries": [
      "Дания",
      "Швеция",
      "Финляндия"
    ],
    "duration": "116 мин",
    "director": "Anders Thomas Jensen",
    "mood": "чёрная, странная, эмоциональная криминальная комедия",
    "themes": "месть, случайность, травма, найденная команда",
    "summary": "Военный возвращается домой после трагедии и вместе с эксцентричными аналитиками пытается понять, была ли она случайной.",
    "imdbId": "tt11655202",
    "cast": [
      {
        "name": "Mads Mikkelsen",
        "role": "Маркус"
      },
      {
        "name": "Nikolaj Lie Kaas",
        "role": "Отто"
      },
      {
        "name": "Andrea Heick Gadeberg",
        "role": "Матильда"
      }
    ],
    "id": 984074,
    "type": "Фильм",
    "searchTitles": [
      "рыцари справедливости",
      "retfærdighedens ryttere",
      "рыцари справедливости 2020",
      "retfærdighedens ryttere 2020"
    ],
    "trailerUrl": "",
    "seoTitle": "Рыцари справедливости (2020) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Рыцари справедливости (2020) — боевик, комедия, драма: рейтинг 7.5, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-guilty-2018",
    "title": "Виновный",
    "originalTitle": "Den skyldige",
    "year": "2018",
    "rating": 7.5,
    "genres": [
      "Триллер",
      "Криминал",
      "Драма"
    ],
    "countries": [
      "Дания"
    ],
    "duration": "85 мин",
    "director": "Gustav Möller",
    "mood": "телефонная, камерная, нервная",
    "themes": "ошибка, вина, голос, ограниченная информация",
    "summary": "Диспетчер экстренной службы получает тревожный звонок и пытается спасти женщину, почти ничего не видя и слишком многое додумывая.",
    "imdbId": "tt6742252",
    "cast": [
      {
        "name": "Jakob Cedergren",
        "role": "Асгер Хольм"
      },
      {
        "name": "Jessica Dinnage",
        "role": "Ибен"
      }
    ],
    "id": 984075,
    "type": "Фильм",
    "searchTitles": [
      "виновный",
      "den skyldige",
      "виновный 2018",
      "den skyldige 2018"
    ],
    "trailerUrl": "",
    "seoTitle": "Виновный (2018) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Виновный (2018) — триллер, криминал, драма: рейтинг 7.5, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "force-majeure-2014",
    "title": "Форс-мажор",
    "originalTitle": "Turist",
    "year": "2014",
    "rating": 7.2,
    "genres": [
      "Драма",
      "Комедия"
    ],
    "countries": [
      "Швеция",
      "Франция",
      "Норвегия",
      "Дания"
    ],
    "duration": "120 мин",
    "director": "Ruben Östlund",
    "mood": "неловкая, холодная, семейно-сатирическая",
    "themes": "брак, страх, мужественность, самообман",
    "summary": "Семейный отпуск на горнолыжном курорте меняется после одного инстинктивного поступка, который невозможно просто забыть.",
    "imdbId": "tt2121382",
    "cast": [
      {
        "name": "Johannes Kuhnke",
        "role": "Томас"
      },
      {
        "name": "Lisa Loven Kongsli",
        "role": "Эбба"
      },
      {
        "name": "Clara Wettergren",
        "role": "Вера"
      }
    ],
    "id": 984076,
    "type": "Фильм",
    "searchTitles": [
      "форс-мажор",
      "turist",
      "форс-мажор 2014",
      "turist 2014"
    ],
    "trailerUrl": "",
    "seoTitle": "Форс-мажор (2014) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Форс-мажор (2014) — драма, комедия: рейтинг 7.2, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "victoria-2015",
    "title": "Виктория",
    "originalTitle": "Victoria",
    "year": "2015",
    "rating": 7.6,
    "genres": [
      "Криминал",
      "Драма",
      "Триллер"
    ],
    "countries": [
      "Германия"
    ],
    "duration": "138 мин",
    "director": "Sebastian Schipper",
    "mood": "ночная, импульсивная, снятая как один рывок",
    "themes": "случайная встреча, город, риск, молодость",
    "summary": "Испанка в ночном Берлине знакомится с компанией парней, и обычная прогулка постепенно превращается в опасный бег без паузы.",
    "imdbId": "tt4226388",
    "cast": [
      {
        "name": "Laia Costa",
        "role": "Виктория"
      },
      {
        "name": "Frederick Lau",
        "role": "Зонне"
      },
      {
        "name": "Franz Rogowski",
        "role": "Боксер"
      }
    ],
    "id": 984077,
    "type": "Фильм",
    "searchTitles": [
      "виктория",
      "victoria",
      "виктория 2015",
      "victoria 2015"
    ],
    "trailerUrl": "",
    "seoTitle": "Виктория (2015) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Виктория (2015) — криминал, драма, триллер: рейтинг 7.6, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "mustang-2015",
    "title": "Мустанг",
    "originalTitle": "Mustang",
    "year": "2015",
    "rating": 7.6,
    "genres": [
      "Драма"
    ],
    "countries": [
      "Турция",
      "Франция",
      "Германия"
    ],
    "duration": "97 мин",
    "director": "Deniz Gamze Ergüven",
    "mood": "солнечная, горькая, бунтарская подростковая драма",
    "themes": "сестринство, свобода, традиции, взросление",
    "summary": "Пять сестёр в турецкой деревне сталкиваются с запретами взрослых и пытаются сохранить радость, близость и право на выбор.",
    "imdbId": "tt3966404",
    "cast": [
      {
        "name": "Güneş Şensoy",
        "role": "Лале"
      },
      {
        "name": "Doğa Zeynep Doğuşlu",
        "role": "Нур"
      },
      {
        "name": "Tuğba Sunguroğlu",
        "role": "Сельма"
      }
    ],
    "id": 984078,
    "type": "Фильм",
    "searchTitles": [
      "мустанг",
      "mustang",
      "мустанг 2015",
      "mustang 2015"
    ],
    "trailerUrl": "",
    "seoTitle": "Мустанг (2015) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Мустанг (2015) — драма: рейтинг 7.6, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "girlhood-2014",
    "title": "Девичья банда",
    "originalTitle": "Bande de filles",
    "year": "2014",
    "rating": 6.9,
    "genres": [
      "Драма"
    ],
    "countries": [
      "Франция"
    ],
    "duration": "113 мин",
    "director": "Céline Sciamma",
    "mood": "городская, подростковая, энергичная",
    "themes": "дружба, идентичность, класс, свобода",
    "summary": "Подросток из парижского пригорода присоединяется к компании девушек и впервые пробует примерить на себя другую силу.",
    "imdbId": "tt3655522",
    "cast": [
      {
        "name": "Karidja Touré",
        "role": "Марьем"
      },
      {
        "name": "Assa Sylla",
        "role": "Леди"
      },
      {
        "name": "Lindsay Karamoh",
        "role": "Адиату"
      }
    ],
    "id": 984079,
    "type": "Фильм",
    "searchTitles": [
      "девичья банда",
      "bande de filles",
      "девичья банда 2014",
      "bande de filles 2014"
    ],
    "trailerUrl": "",
    "seoTitle": "Девичья банда (2014) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Девичья банда (2014) — драма: рейтинг 6.9, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-lunchbox-2013",
    "title": "Ланчбокс",
    "originalTitle": "The Lunchbox",
    "year": "2013",
    "rating": 7.8,
    "genres": [
      "Драма",
      "Мелодрама"
    ],
    "countries": [
      "Индия",
      "Франция",
      "Германия",
      "США"
    ],
    "duration": "104 мин",
    "director": "Ritesh Batra",
    "mood": "мягкая, городская, меланхоличная мелодрама",
    "themes": "письма, одиночество, еда, случайная связь",
    "summary": "Ошибка службы доставки обедов соединяет домохозяйку и офисного служащего, которые начинают говорить друг с другом через записки.",
    "imdbId": "tt2350496",
    "cast": [
      {
        "name": "Irrfan Khan",
        "role": "Сааджан"
      },
      {
        "name": "Nimrat Kaur",
        "role": "Ила"
      },
      {
        "name": "Nawazuddin Siddiqui",
        "role": "Шейх"
      }
    ],
    "id": 984080,
    "type": "Фильм",
    "searchTitles": [
      "ланчбокс",
      "the lunchbox",
      "ланчбокс 2013",
      "the lunchbox 2013"
    ],
    "trailerUrl": "",
    "seoTitle": "Ланчбокс (2013) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Ланчбокс (2013) — драма, мелодрама: рейтинг 7.8, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-salesman-2016",
    "title": "Коммивояжёр",
    "originalTitle": "Forushande",
    "year": "2016",
    "rating": 7.7,
    "genres": [
      "Драма",
      "Триллер"
    ],
    "countries": [
      "Иран",
      "Франция"
    ],
    "duration": "124 мин",
    "director": "Asghar Farhadi",
    "mood": "бытовая, морально напряжённая, театральная",
    "themes": "брак, честь, месть, вина",
    "summary": "Супружеская пара после нападения в новой квартире всё глубже втягивается в конфликт между болью, гордостью и справедливостью.",
    "imdbId": "tt5186714",
    "cast": [
      {
        "name": "Shahab Hosseini",
        "role": "Эмад"
      },
      {
        "name": "Taraneh Alidoosti",
        "role": "Рана"
      },
      {
        "name": "Babak Karimi",
        "role": "Бабак"
      }
    ],
    "id": 984081,
    "type": "Фильм",
    "searchTitles": [
      "коммивояжёр",
      "forushande",
      "коммивояжёр 2016",
      "forushande 2016"
    ],
    "trailerUrl": "",
    "seoTitle": "Коммивояжёр (2016) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Коммивояжёр (2016) — драма, триллер: рейтинг 7.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-past-2013",
    "title": "Прошлое",
    "originalTitle": "Le passé",
    "year": "2013",
    "rating": 7.7,
    "genres": [
      "Драма",
      "Детектив"
    ],
    "countries": [
      "Франция",
      "Италия",
      "Иран"
    ],
    "duration": "130 мин",
    "director": "Asghar Farhadi",
    "mood": "семейная, разговорная, постепенно вскрывающаяся",
    "themes": "развод, память, вина, недоговорённость",
    "summary": "Мужчина возвращается во Францию оформить развод и оказывается внутри чужого семейного узла, где старые решения всё ещё болят.",
    "imdbId": "tt2404463",
    "cast": [
      {
        "name": "Bérénice Bejo",
        "role": "Мари"
      },
      {
        "name": "Ali Mosaffa",
        "role": "Ахмад"
      },
      {
        "name": "Tahar Rahim",
        "role": "Самир"
      }
    ],
    "id": 984082,
    "type": "Фильм",
    "searchTitles": [
      "прошлое",
      "le passé",
      "прошлое 2013",
      "le passé 2013"
    ],
    "trailerUrl": "",
    "seoTitle": "Прошлое (2013) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Прошлое (2013) — драма, детектив: рейтинг 7.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "monsieur-lazhar-2011",
    "title": "Господин Лазар",
    "originalTitle": "Monsieur Lazhar",
    "year": "2011",
    "rating": 7.5,
    "genres": [
      "Драма",
      "Комедия"
    ],
    "countries": [
      "Канада"
    ],
    "duration": "94 мин",
    "director": "Philippe Falardeau",
    "mood": "деликатная, школьная, терапевтическая драма",
    "themes": "утрата, дети, учитель, адаптация",
    "summary": "Алжирский эмигрант становится учителем в классе, пережившем трагедию, и сам учится говорить о боли без громких жестов.",
    "imdbId": "tt2011971",
    "cast": [
      {
        "name": "Mohamed Fellag",
        "role": "Бахир Лазар"
      },
      {
        "name": "Sophie Nélisse",
        "role": "Алис"
      },
      {
        "name": "Émilien Néron",
        "role": "Симон"
      }
    ],
    "id": 984083,
    "type": "Фильм",
    "searchTitles": [
      "господин лазар",
      "monsieur lazhar",
      "господин лазар 2011",
      "monsieur lazhar 2011"
    ],
    "trailerUrl": "",
    "seoTitle": "Господин Лазар (2011) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Господин Лазар (2011) — драма, комедия: рейтинг 7.5, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "capernaum-2018",
    "title": "Капернаум",
    "originalTitle": "Capharnaüm",
    "year": "2018",
    "rating": 8.4,
    "genres": [
      "Драма"
    ],
    "countries": [
      "Ливан",
      "Франция",
      "США"
    ],
    "duration": "126 мин",
    "director": "Nadine Labaki",
    "mood": "тяжёлая, уличная, социально острая",
    "themes": "детство, бедность, выживание, ответственность взрослых",
    "summary": "Мальчик из бедного района подаёт в суд на родителей, и его история разворачивается как обвинение миру взрослых.",
    "imdbId": "tt8267604",
    "cast": [
      {
        "name": "Zain Al Rafeea",
        "role": "Зейн"
      },
      {
        "name": "Yordanos Shiferaw",
        "role": "Рахиль"
      },
      {
        "name": "Boluwatife Treasure Bankole",
        "role": "Йонас"
      }
    ],
    "id": 984084,
    "type": "Фильм",
    "searchTitles": [
      "капернаум",
      "capharnaüm",
      "капернаум 2018",
      "capharnaüm 2018"
    ],
    "trailerUrl": "",
    "seoTitle": "Капернаум (2018) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Капернаум (2018) — драма: рейтинг 8.4, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "wadjda-2012",
    "title": "Ваджда",
    "originalTitle": "Wadjda",
    "year": "2012",
    "rating": 7.5,
    "genres": [
      "Драма",
      "Семейный"
    ],
    "countries": [
      "Саудовская Аравия",
      "Германия"
    ],
    "duration": "98 мин",
    "director": "Haifaa al-Mansour",
    "mood": "светлая, упрямая, социально точная",
    "themes": "детская мечта, велосипед, свобода, традиции",
    "summary": "Девочка мечтает купить велосипед и ищет способ заработать, несмотря на правила, которые будто заранее решают за неё.",
    "imdbId": "tt2258858",
    "cast": [
      {
        "name": "Waad Mohammed",
        "role": "Ваджда"
      },
      {
        "name": "Reem Abdullah",
        "role": "мать"
      },
      {
        "name": "Abdullrahman Al Gohani",
        "role": "Абдулла"
      }
    ],
    "id": 984085,
    "type": "Фильм",
    "searchTitles": [
      "ваджда",
      "wadjda",
      "ваджда 2012",
      "wadjda 2012"
    ],
    "trailerUrl": "",
    "seoTitle": "Ваджда (2012) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Ваджда (2012) — драма, семейный: рейтинг 7.5, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "theeb-2014",
    "title": "Волчонок",
    "originalTitle": "Theeb",
    "year": "2014",
    "rating": 7.2,
    "genres": [
      "Драма",
      "Приключения",
      "Триллер"
    ],
    "countries": [
      "Иордания",
      "ОАЭ",
      "Катар",
      "Великобритания"
    ],
    "duration": "100 мин",
    "director": "Naji Abu Nowar",
    "mood": "пустынная, взрослеющая, напряжённая",
    "themes": "братство, выживание, доверие, война",
    "summary": "Мальчик-бедуин отправляется с братом в пустыню и оказывается в мире взрослых опасностей, где доверие стоит слишком дорого.",
    "imdbId": "tt3170902",
    "cast": [
      {
        "name": "Jacir Eid Al-Hwietat",
        "role": "Волчонок"
      },
      {
        "name": "Hussein Salameh",
        "role": "Хусейн"
      },
      {
        "name": "Hassan Mutlag",
        "role": "странник"
      }
    ],
    "id": 984086,
    "type": "Фильм",
    "searchTitles": [
      "волчонок",
      "theeb",
      "волчонок 2014",
      "theeb 2014"
    ],
    "trailerUrl": "",
    "seoTitle": "Волчонок (2014) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Волчонок (2014) — драма, приключения, триллер: рейтинг 7.2, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-secret-in-their-eyes-2009",
    "title": "Тайна в его глазах",
    "originalTitle": "El secreto de sus ojos",
    "year": "2009",
    "rating": 8.2,
    "genres": [
      "Драма",
      "Криминал",
      "Детектив"
    ],
    "countries": [
      "Аргентина",
      "Испания"
    ],
    "duration": "129 мин",
    "director": "Juan José Campanella",
    "mood": "меланхоличная, детективная, романтически-трагичная",
    "themes": "память, правосудие, любовь, одержимость",
    "summary": "Бывший судебный служащий возвращается к старому делу и одновременно к чувствам, которые так и не смог произнести.",
    "imdbId": "tt1305806",
    "cast": [
      {
        "name": "Ricardo Darín",
        "role": "Бенхамин Эспосито"
      },
      {
        "name": "Soledad Villamil",
        "role": "Ирен Менендес"
      },
      {
        "name": "Pablo Rago",
        "role": "Рикардо Моралес"
      }
    ],
    "id": 984087,
    "type": "Фильм",
    "searchTitles": [
      "тайна в его глазах",
      "el secreto de sus ojos",
      "тайна в его глазах 2009",
      "el secreto de sus ojos 2009"
    ],
    "trailerUrl": "",
    "seoTitle": "Тайна в его глазах (2009) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Тайна в его глазах (2009) — драма, криминал, детектив: рейтинг 8.2, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "nine-queens-2000",
    "title": "Девять королев",
    "originalTitle": "Nueve reinas",
    "year": "2000",
    "rating": 7.9,
    "genres": [
      "Криминал",
      "Драма",
      "Триллер"
    ],
    "countries": [
      "Аргентина"
    ],
    "duration": "114 мин",
    "director": "Fabián Bielinsky",
    "mood": "ловкая, аферистская, городская",
    "themes": "обман, доверие, деньги, двойное дно",
    "summary": "Два мошенника пытаются провернуть сделку с редкими марками, но в их мире каждый жест может быть частью чужой игры.",
    "imdbId": "tt0247586",
    "cast": [
      {
        "name": "Ricardo Darín",
        "role": "Маркос"
      },
      {
        "name": "Gastón Pauls",
        "role": "Хуан"
      },
      {
        "name": "Leticia Brédice",
        "role": "Валерия"
      }
    ],
    "id": 984088,
    "type": "Фильм",
    "searchTitles": [
      "девять королев",
      "nueve reinas",
      "девять королев 2000",
      "nueve reinas 2000"
    ],
    "trailerUrl": "",
    "seoTitle": "Девять королев (2000) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Девять королев (2000) — криминал, драма, триллер: рейтинг 7.9, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "elite-squad-2007",
    "title": "Элитный отряд",
    "originalTitle": "Tropa de Elite",
    "year": "2007",
    "rating": 8.0,
    "genres": [
      "Боевик",
      "Криминал",
      "Драма"
    ],
    "countries": [
      "Бразилия",
      "США",
      "Аргентина"
    ],
    "duration": "115 мин",
    "director": "José Padilha",
    "mood": "жёсткая, нервная, социально-криминальная",
    "themes": "полиция, коррупция, фавелы, насилие системы",
    "summary": "Командир спецподразделения в Рио пытается найти замену и одновременно удержаться в мире, где закон и жестокость переплетены.",
    "imdbId": "tt0861739",
    "cast": [
      {
        "name": "Wagner Moura",
        "role": "капитан Насименто"
      },
      {
        "name": "André Ramiro",
        "role": "Матис"
      },
      {
        "name": "Caio Junqueira",
        "role": "Нето"
      }
    ],
    "id": 984089,
    "type": "Фильм",
    "searchTitles": [
      "элитный отряд",
      "tropa de elite",
      "элитный отряд 2007",
      "tropa de elite 2007"
    ],
    "trailerUrl": "",
    "seoTitle": "Элитный отряд (2007) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Элитный отряд (2007) — боевик, криминал, драма: рейтинг 8.0, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-motorcycle-diaries-2004",
    "title": "Дневники мотоциклиста",
    "originalTitle": "Diarios de motocicleta",
    "year": "2004",
    "rating": 7.7,
    "genres": [
      "Биография",
      "Драма",
      "Приключения"
    ],
    "countries": [
      "Аргентина",
      "США",
      "Чили",
      "Перу"
    ],
    "duration": "126 мин",
    "director": "Walter Salles",
    "mood": "дорожная, молодая, пробуждающая",
    "themes": "путешествие, взросление, Латинская Америка, социальное сознание",
    "summary": "Два друга едут через Южную Америку, и дорога постепенно меняет взгляд молодого Эрнесто на континент и людей.",
    "imdbId": "tt0318462",
    "cast": [
      {
        "name": "Gael García Bernal",
        "role": "Эрнесто Гевара"
      },
      {
        "name": "Rodrigo de la Serna",
        "role": "Альберто Гранадо"
      },
      {
        "name": "Mía Maestro",
        "role": "Чичина"
      }
    ],
    "id": 984090,
    "type": "Фильм",
    "searchTitles": [
      "дневники мотоциклиста",
      "diarios de motocicleta",
      "дневники мотоциклиста 2004",
      "diarios de motocicleta 2004"
    ],
    "trailerUrl": "",
    "seoTitle": "Дневники мотоциклиста (2004) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Дневники мотоциклиста (2004) — биография, драма, приключения: рейтинг 7.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "y-tu-mama-tambien-2001",
    "title": "И твою маму тоже",
    "originalTitle": "Y tu mamá también",
    "year": "2001",
    "rating": 7.7,
    "genres": [
      "Драма"
    ],
    "countries": [
      "Мексика"
    ],
    "duration": "106 мин",
    "director": "Alfonso Cuarón",
    "mood": "жаркая, дорожная, взрослая драма",
    "themes": "молодость, желание, дружба, социальный фон",
    "summary": "Двое друзей и взрослая попутчица отправляются к вымышленному пляжу, а путешествие становится проверкой их свободы и дружбы.",
    "imdbId": "tt0245574",
    "cast": [
      {
        "name": "Gael García Bernal",
        "role": "Хулио"
      },
      {
        "name": "Diego Luna",
        "role": "Теноч"
      },
      {
        "name": "Maribel Verdú",
        "role": "Луиса"
      }
    ],
    "id": 984091,
    "type": "Фильм",
    "searchTitles": [
      "и твою маму тоже",
      "y tu mamá también",
      "и твою маму тоже 2001",
      "y tu mamá también 2001"
    ],
    "trailerUrl": "",
    "seoTitle": "И твою маму тоже (2001) смотреть онлайн фильм KinoLuma",
    "seoDescription": "И твою маму тоже (2001) — драма: рейтинг 7.7, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "amores-perros-2000",
    "title": "Сука любовь",
    "originalTitle": "Amores perros",
    "year": "2000",
    "rating": 8.0,
    "genres": [
      "Драма",
      "Триллер"
    ],
    "countries": [
      "Мексика"
    ],
    "duration": "154 мин",
    "director": "Alejandro G. Iñárritu",
    "mood": "рваная, городская, болезненно эмоциональная",
    "themes": "случай, любовь, насилие, пересечение судеб",
    "summary": "Автомобильная авария связывает несколько историй в Мехико, где любовь часто приходит вместе с болью и неправильным выбором.",
    "imdbId": "tt0245712",
    "cast": [
      {
        "name": "Emilio Echevarría",
        "role": "Эль Чиво"
      },
      {
        "name": "Gael García Bernal",
        "role": "Октавио"
      },
      {
        "name": "Goya Toledo",
        "role": "Валерия"
      }
    ],
    "id": 984092,
    "type": "Фильм",
    "searchTitles": [
      "сука любовь",
      "amores perros",
      "сука любовь 2000",
      "amores perros 2000"
    ],
    "trailerUrl": "",
    "seoTitle": "Сука любовь (2000) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Сука любовь (2000) — драма, триллер: рейтинг 8.0, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-orphanage-2007",
    "title": "Приют",
    "originalTitle": "El orfanato",
    "year": "2007",
    "rating": 7.4,
    "genres": [
      "Ужасы",
      "Драма",
      "Детектив"
    ],
    "countries": [
      "Испания",
      "Мексика"
    ],
    "duration": "105 мин",
    "director": "J. A. Bayona",
    "mood": "готическая, печальная, семейная мистерия",
    "themes": "материнство, дом, детство, тайна",
    "summary": "Женщина возвращается в бывший приют и сталкивается с исчезновением сына, где страх неотделим от памяти места.",
    "imdbId": "tt0464141",
    "cast": [
      {
        "name": "Belén Rueda",
        "role": "Лаура"
      },
      {
        "name": "Fernando Cayo",
        "role": "Карлос"
      },
      {
        "name": "Roger Príncep",
        "role": "Симон"
      },
      {
        "name": "Geraldine Chaplin",
        "role": "Аврора"
      }
    ],
    "id": 984093,
    "type": "Фильм",
    "searchTitles": [
      "приют",
      "el orfanato",
      "приют 2007",
      "el orfanato 2007"
    ],
    "trailerUrl": "",
    "seoTitle": "Приют (2007) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Приют (2007) — ужасы, драма, детектив: рейтинг 7.4, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-sea-inside-2004",
    "title": "Море внутри",
    "originalTitle": "Mar adentro",
    "year": "2004",
    "rating": 8.0,
    "genres": [
      "Биография",
      "Драма"
    ],
    "countries": [
      "Испания",
      "Франция",
      "Италия"
    ],
    "duration": "125 мин",
    "director": "Alejandro Amenábar",
    "mood": "спокойная, философская, человеческая драма",
    "themes": "достоинство, свобода выбора, любовь, тело",
    "summary": "История Рамона Сампедро показывает спор о праве распоряжаться собственной жизнью через разговоры, чувства и память о море.",
    "imdbId": "tt0369702",
    "cast": [
      {
        "name": "Javier Bardem",
        "role": "Рамон Сампедро"
      },
      {
        "name": "Belén Rueda",
        "role": "Хулия"
      },
      {
        "name": "Lola Dueñas",
        "role": "Роса"
      }
    ],
    "id": 984094,
    "type": "Фильм",
    "searchTitles": [
      "море внутри",
      "mar adentro",
      "море внутри 2004",
      "mar adentro 2004"
    ],
    "trailerUrl": "",
    "seoTitle": "Море внутри (2004) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Море внутри (2004) — биография, драма: рейтинг 8.0, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-artifice-girl-2022",
    "title": "Искусственная девочка",
    "originalTitle": "The Artifice Girl",
    "year": "2022",
    "rating": 6.6,
    "genres": [
      "Фантастика",
      "Триллер",
      "Драма"
    ],
    "countries": [
      "США"
    ],
    "duration": "95 мин",
    "director": "Franklin Ritch",
    "mood": "разговорная, технологичная, этически тревожная",
    "themes": "искусственный интеллект, ответственность, контроль, защита детей",
    "summary": "Команда использует цифровой образ для расследований, но созданный инструмент постепенно ставит перед людьми более сложные вопросы.",
    "imdbId": "",
    "cast": [
      {
        "name": "Tatum Matthews",
        "role": "Черри"
      },
      {
        "name": "David Girard",
        "role": "Эймос"
      },
      {
        "name": "Sinda Nichols",
        "role": "Дина"
      },
      {
        "name": "Lance Henriksen",
        "role": "Гарет"
      }
    ],
    "id": 984095,
    "type": "Фильм",
    "searchTitles": [
      "искусственная девочка",
      "the artifice girl",
      "искусственная девочка 2022",
      "the artifice girl 2022"
    ],
    "trailerUrl": "",
    "seoTitle": "Искусственная девочка (2022) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Искусственная девочка (2022) — фантастика, триллер, драма: рейтинг 6.6, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "beyond-the-infinite-two-minutes-2020",
    "title": "За двумя бесконечными минутами",
    "originalTitle": "Beyond the Infinite Two Minutes",
    "year": "2020",
    "rating": 7.3,
    "genres": [
      "Фантастика",
      "Комедия"
    ],
    "countries": [
      "Япония"
    ],
    "duration": "70 мин",
    "director": "Kanta Yamaguchi",
    "mood": "изобретательная, смешная, миниатюрная фантастика",
    "themes": "петля времени, кафе, импровизация, любопытство",
    "summary": "Владелец кафе обнаруживает экран, который показывает события на две минуты вперёд, и маленькая находка быстро превращается в хаос.",
    "imdbId": "",
    "cast": [
      {
        "name": "Kazunari Tosa",
        "role": "Като"
      },
      {
        "name": "Aki Asakura",
        "role": "Мэгуми"
      },
      {
        "name": "Riko Fujitani",
        "role": "Ая"
      }
    ],
    "id": 984096,
    "type": "Фильм",
    "searchTitles": [
      "за двумя бесконечными минутами",
      "beyond the infinite two minutes",
      "за двумя бесконечными минутами 2020",
      "beyond the infinite two minutes 2020"
    ],
    "trailerUrl": "",
    "seoTitle": "За двумя бесконечными минутами (2020) смотреть онлайн фильм KinoLuma",
    "seoDescription": "За двумя бесконечными минутами (2020) — фантастика, комедия: рейтинг 7.3, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "one-cut-of-the-dead-2017",
    "title": "Зомби одним планом!",
    "originalTitle": "One Cut of the Dead",
    "year": "2017",
    "rating": 7.6,
    "genres": [
      "Комедия",
      "Ужасы"
    ],
    "countries": [
      "Япония"
    ],
    "duration": "96 мин",
    "director": "Shinichiro Ueda",
    "mood": "хаотичная, мета-комедийная, очень изобретательная",
    "themes": "съёмочная группа, импровизация, жанровая игра, командная паника",
    "summary": "Съёмки дешёвого зомби-фильма идут настолько странно, что сам процесс постепенно становится главным аттракционом.",
    "imdbId": "tt7914416",
    "cast": [
      {
        "name": "Takayuki Hamatsu",
        "role": "Такаяки"
      },
      {
        "name": "Yuzuki Akiyama",
        "role": "Тинацу"
      },
      {
        "name": "Harumi Shuhama",
        "role": "Нао"
      }
    ],
    "id": 984097,
    "type": "Фильм",
    "searchTitles": [
      "зомби одним планом!",
      "one cut of the dead",
      "зомби одним планом! 2017",
      "one cut of the dead 2017"
    ],
    "trailerUrl": "",
    "seoTitle": "Зомби одним планом! (2017) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Зомби одним планом! (2017) — комедия, ужасы: рейтинг 7.6, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "the-kid-detective-2020",
    "title": "Детектив-подросток",
    "originalTitle": "The Kid Detective",
    "year": "2020",
    "rating": 7.0,
    "genres": [
      "Комедия",
      "Драма",
      "Детектив"
    ],
    "countries": [
      "Канада"
    ],
    "duration": "99 мин",
    "director": "Evan Morgan",
    "mood": "сухая, печальная, ироничная детективная история",
    "themes": "взросление, неудача, расследование, детская слава",
    "summary": "Бывший юный сыщик застрял в образе местной легенды и получает дело, которое слишком серьёзно для его привычной игры.",
    "imdbId": "tt8980602",
    "cast": [
      {
        "name": "Adam Brody",
        "role": "Эйб Эпплбаум"
      },
      {
        "name": "Sophie Nélisse",
        "role": "Кэролайн"
      },
      {
        "name": "Tzi Ma",
        "role": "мистер Чанг"
      }
    ],
    "id": 984098,
    "type": "Фильм",
    "searchTitles": [
      "детектив-подросток",
      "the kid detective",
      "детектив-подросток 2020",
      "the kid detective 2020"
    ],
    "trailerUrl": "",
    "seoTitle": "Детектив-подросток (2020) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Детектив-подросток (2020) — комедия, драма, детектив: рейтинг 7.0, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  },
  {
    "slug": "mass-2021",
    "title": "Месса",
    "originalTitle": "Mass",
    "year": "2021",
    "rating": 7.6,
    "genres": [
      "Драма"
    ],
    "countries": [
      "США"
    ],
    "duration": "111 мин",
    "director": "Fran Kranz",
    "mood": "камерная, болезненная, разговорная драма",
    "themes": "потеря, вина, прощение, родительская боль",
    "summary": "Две пары родителей встречаются в закрытой комнате для разговора, который годами был невозможен и слишком нужен всем участникам.",
    "imdbId": "tt11389748",
    "cast": [
      {
        "name": "Reed Birney",
        "role": "Ричард"
      },
      {
        "name": "Ann Dowd",
        "role": "Линда"
      },
      {
        "name": "Jason Isaacs",
        "role": "Джей"
      },
      {
        "name": "Martha Plimpton",
        "role": "Гейл"
      }
    ],
    "id": 984099,
    "type": "Фильм",
    "searchTitles": [
      "месса",
      "mass",
      "месса 2021",
      "mass 2021"
    ],
    "trailerUrl": "",
    "seoTitle": "Месса (2021) смотреть онлайн фильм KinoLuma",
    "seoDescription": "Месса (2021) — драма: рейтинг 7.6, постер, актёры, факты и удобная карточка для выбора фильма на KinoLuma."
  }
];

function createManualSeoFacts(movie: ManualSeoMovieExpansionEntry): MovieFact[] {
  return [
    { label: "Год", value: movie.year },
    { label: "Тип", value: movie.type },
    { label: "Страна", value: movie.countries?.join(", ") || "" },
    { label: "Длительность", value: movie.duration },
    { label: "Режиссёр", value: movie.director },
    { label: "Настроение", value: movie.mood },
    { label: "Темы", value: movie.themes },
    { label: "Рейтинг", value: movie.rating.toFixed(1) },
  ].filter((fact) => Boolean(fact.value));
}

function createManualSeoLongDescription(movie: ManualSeoMovieExpansionEntry) {
  const genres = movie.genres.join(", ").toLowerCase();
  const castText = movie.cast.slice(0, 4).map((person) => `${person.name} — ${person.role}`).join(", ");

  return [
    `«${movie.title}» (${movie.year}) — фильм в жанрах ${genres}. ${movie.summary}`,
    `Карточка добавлена точечно: указан рейтинг ${movie.rating.toFixed(1)} из 10, страна ${movie.countries?.join(", ") || "уточняется"}, длительность ${movie.duration} и режиссёр ${movie.director}. В блоке ролей отображаются: ${castText}.`,
    `По настроению это ${movie.mood}. Главные темы: ${movie.themes}. Такой текст помогает зрителю понять атмосферу до просмотра, а странице — выглядеть живой, без одинаковых шаблонных ответов и пустой «звёздочки вместо рейтинга».`,
  ].join("\n\n");
}

function createManualSeoFaq(movie: ManualSeoMovieExpansionEntry, index: number): MovieFaqItem[] {
  const genres = movie.genres.slice(0, 3).join(", ").toLowerCase();
  const country = movie.countries?.join(", ") || "уточняется";
  const castText = movie.cast.slice(0, 3).map((person) => `${person.name} — ${person.role}`).join(", ");
  const questionVariants = [
    [
      `Чем выделяется «${movie.title}» среди похожих фильмов?`,
      `«${movie.title}» держится на сочетании ${genres} и настроения: ${movie.mood}. В центре карточки не сухой пересказ, а понятный ориентир — ${movie.summary.toLowerCase()}`,
    ],
    [
      `Какое настроение у фильма «${movie.title}»?`,
      `Настроение фильма можно описать так: ${movie.mood}. Лучше выбирать его, когда хочется истории про ${movie.themes}, а не просто фонового просмотра.` ,
    ],
    [
      `Кому может понравиться «${movie.title}»?`,
      `Фильм подойдёт зрителям, которые любят ${genres} и истории, где важны ${movie.themes}. Если хочется быстро понять тон перед запуском, эта карточка даёт нужный минимум без спойлерного пересказа.`,
    ],
    [
      `Какие актёры указаны в карточке «${movie.title}»?`,
      `В карточке указаны ключевые роли: ${castText}. Блок актёров сделан отдельными строками, чтобы длинные имена и роли не слипались в одну нечитаемую плашку.`,
    ],
    [
      `Почему «${movie.title}» добавлен в каталог KinoLuma?`,
      `Это узнаваемая и полезная позиция для каталога: ${country}, ${movie.year}, ${movie.duration}, рейтинг ${movie.rating.toFixed(1)}. Она расширяет выбор в жанрах ${genres} и не дублирует старые карточки.`,
    ],
    [
      `На что обратить внимание при просмотре «${movie.title}»?`,
      `Обратите внимание на работу режиссёра ${movie.director} и на темы: ${movie.themes}. Именно они помогают фильму не раствориться среди соседних карточек каталога.`,
    ],
  ];

  const offset = index % questionVariants.length;
  return [
    questionVariants[offset],
    questionVariants[(offset + 1) % questionVariants.length],
    questionVariants[(offset + 2) % questionVariants.length],
    questionVariants[(offset + 3) % questionVariants.length],
    questionVariants[(offset + 4) % questionVariants.length],
  ].map(([question, answer]) => ({ question, answer }));
}

function createManualSeoPosterFallback(movie: ManualSeoMovieExpansionEntry) {
  return createKinoLumaPoster(movie.title, movie.originalTitle, "ФИЛЬМ");
}

export const manualSeoMovieExpansionAdditions: Movie[] = rawManualSeoMovieExpansionEntries.map((movie, index) => {
  const poster = getTmdbPoster({
    imdbId: movie.imdbId,
    title: movie.title,
    originalTitle: movie.originalTitle,
    year: movie.year,
    type: movie.type,
  });

  return {
    ...movie,
    description: movie.summary,
    poster,
    posterFallbacks: [createManualSeoPosterFallback(movie)],
    facts: createManualSeoFacts(movie),
    faq: createManualSeoFaq(movie, index),
    longDescription: createManualSeoLongDescription(movie),
    source: MANUAL_SEO_SOURCE,
  };
});

export const manualSeoMovieExpansionCardIndex = manualSeoMovieExpansionAdditions.map((movie) => ({
  id: movie.id,
  slug: movie.slug,
  title: movie.title,
  type: movie.type,
  year: movie.year,
  rating: movie.rating,
  genres: movie.genres,
  poster: movie.poster,
  posterFallbacks: movie.posterFallbacks,
}));
