import type { Movie, MovieFact, PlayerProvider } from "./movies";
import { getTmdbPoster } from "../lib/imageLinks";

const MANUAL_HUNDRED_SOURCE = "kinoluma-manual-hundred-movies-v1";

type ManualHundredMovieEntry = Omit<
  Movie,
  "poster" | "posterFallbacks" | "facts" | "players" | "source" | "longDescription"
> & {
  duration: string;
  director: string;
  mood: string;
  themes: string;
};

const rawManualHundredMovieEntries: ManualHundredMovieEntry[] = [
  {
    "id": 982000,
    "slug": "good-will-hunting-1997",
    "title": "Умница Уилл Хантинг",
    "originalTitle": "Good Will Hunting",
    "searchTitles": [
      "умница уилл хантинг",
      "good will hunting",
      "умница уилл хантинг 1997",
      "good will hunting 1997"
    ],
    "type": "Фильм",
    "year": "1997",
    "rating": 8.3,
    "genres": [
      "Драма",
      "Мелодрама"
    ],
    "description": "Драма о талантливом парне из Бостона, который учится принимать свой дар, дружбу и право на собственный выбор.",
    "trailerUrl": "",
    "imdbId": "tt0119217",
    "countries": [
      "США"
    ],
    "duration": "126 мин",
    "director": "Gus Van Sant",
    "mood": "умная, тёплая, разговорная",
    "themes": "талант, дружба, наставничество, взросление"
  },
  {
    "id": 982001,
    "slug": "casino-1995",
    "title": "Казино",
    "originalTitle": "Casino",
    "searchTitles": [
      "казино",
      "casino",
      "казино 1995",
      "casino 1995"
    ],
    "type": "Фильм",
    "year": "1995",
    "rating": 8.2,
    "genres": [
      "Драма",
      "Криминал"
    ],
    "description": "Криминальная сага о мире больших денег, власти и опасных связей вокруг игорного бизнеса Лас-Вегаса.",
    "trailerUrl": "",
    "imdbId": "tt0112641",
    "countries": [
      "США",
      "Франция"
    ],
    "duration": "178 мин",
    "director": "Martin Scorsese",
    "mood": "масштабная, нервная, криминальная",
    "themes": "власть, деньги, доверие, падение"
  },
  {
    "id": 982002,
    "slug": "scarface-1983",
    "title": "Лицо со шрамом",
    "originalTitle": "Scarface",
    "searchTitles": [
      "лицо со шрамом",
      "scarface",
      "лицо со шрамом 1983",
      "scarface 1983"
    ],
    "type": "Фильм",
    "year": "1983",
    "rating": 8.3,
    "genres": [
      "Драма",
      "Криминал"
    ],
    "description": "Жёсткая криминальная история о стремительном взлёте человека, который хочет забрать слишком много и слишком быстро.",
    "trailerUrl": "",
    "imdbId": "tt0086250",
    "countries": [
      "США"
    ],
    "duration": "170 мин",
    "director": "Brian De Palma",
    "mood": "агрессивная, мрачная, культовая",
    "themes": "амбиции, власть, преступный мир, расплата"
  },
  {
    "id": 982003,
    "slug": "heat-1995",
    "title": "Схватка",
    "originalTitle": "Heat",
    "searchTitles": [
      "схватка",
      "heat",
      "схватка 1995",
      "heat 1995"
    ],
    "type": "Фильм",
    "year": "1995",
    "rating": 8.3,
    "genres": [
      "Криминал",
      "Триллер",
      "Драма"
    ],
    "description": "Напряжённый криминальный триллер о противостоянии профессионального грабителя и детектива, которые слишком хорошо понимают друг друга.",
    "trailerUrl": "",
    "imdbId": "tt0113277",
    "countries": [
      "США"
    ],
    "duration": "170 мин",
    "director": "Michael Mann",
    "mood": "холодная, напряжённая, городская",
    "themes": "противостояние, долг, одиночество, риск"
  },
  {
    "id": 982004,
    "slug": "american-beauty-1999",
    "title": "Красота по-американски",
    "originalTitle": "American Beauty",
    "searchTitles": [
      "красота по-американски",
      "american beauty",
      "красота по-американски 1999",
      "american beauty 1999"
    ],
    "type": "Фильм",
    "year": "1999",
    "rating": 8.3,
    "genres": [
      "Драма"
    ],
    "description": "Ироничная драма о внешне благополучной семье, где под красивой оболочкой давно копятся усталость и желание перемен.",
    "trailerUrl": "",
    "imdbId": "tt0169547",
    "countries": [
      "США"
    ],
    "duration": "122 мин",
    "director": "Sam Mendes",
    "mood": "язвительная, меланхоличная, наблюдательная",
    "themes": "семья, кризис, свобода, самообман"
  },
  {
    "id": 982005,
    "slug": "trainspotting-1996",
    "title": "На игле",
    "originalTitle": "Trainspotting",
    "searchTitles": [
      "на игле",
      "trainspotting",
      "на игле 1996",
      "trainspotting 1996"
    ],
    "type": "Фильм",
    "year": "1996",
    "rating": 8.1,
    "genres": [
      "Драма",
      "Криминал"
    ],
    "description": "Энергичная британская драма о компании молодых людей, бегущих от взрослой жизни и последствий своих решений.",
    "trailerUrl": "",
    "imdbId": "tt0117951",
    "countries": [
      "Великобритания"
    ],
    "duration": "93 мин",
    "director": "Danny Boyle",
    "mood": "нервная, быстрая, дерзкая",
    "themes": "зависимость, молодость, выбор, хаос"
  },
  {
    "id": 982006,
    "slug": "the-big-lebowski-1998",
    "title": "Большой Лебовски",
    "originalTitle": "The Big Lebowski",
    "searchTitles": [
      "большой лебовски",
      "the big lebowski",
      "большой лебовски 1998",
      "the big lebowski 1998"
    ],
    "type": "Фильм",
    "year": "1998",
    "rating": 8.1,
    "genres": [
      "Комедия",
      "Криминал"
    ],
    "description": "Абсурдная криминальная комедия о спокойном человеке, которого случайная путаница втягивает в цепочку странных событий.",
    "trailerUrl": "",
    "imdbId": "tt0118715",
    "countries": [
      "США",
      "Великобритания"
    ],
    "duration": "117 мин",
    "director": "Joel Coen",
    "mood": "ироничная, расслабленная, культовая",
    "themes": "абсурд, дружба, случайность, городские легенды"
  },
  {
    "id": 982007,
    "slug": "the-usual-suspects-1995",
    "title": "Подозрительные лица",
    "originalTitle": "The Usual Suspects",
    "searchTitles": [
      "подозрительные лица",
      "the usual suspects",
      "подозрительные лица 1995",
      "the usual suspects 1995"
    ],
    "type": "Фильм",
    "year": "1995",
    "rating": 8.5,
    "genres": [
      "Триллер",
      "Криминал",
      "Драма"
    ],
    "description": "Криминальная головоломка, где рассказ одного свидетеля постепенно превращает ограбление в куда более опасную историю.",
    "trailerUrl": "",
    "imdbId": "tt0114814",
    "countries": [
      "США",
      "Германия"
    ],
    "duration": "106 мин",
    "director": "Bryan Singer",
    "mood": "загадочная, напряжённая, хитрая",
    "themes": "обман, преступление, память, тайна"
  },
  {
    "id": 982008,
    "slug": "la-confidential-1997",
    "title": "Секреты Лос-Анджелеса",
    "originalTitle": "L.A. Confidential",
    "searchTitles": [
      "секреты лос-анджелеса",
      "l.a. confidential",
      "секреты лос-анджелеса 1997",
      "l.a. confidential 1997"
    ],
    "type": "Фильм",
    "year": "1997",
    "rating": 8.2,
    "genres": [
      "Криминал",
      "Драма",
      "Триллер"
    ],
    "description": "Неонуар о полицейских, журналистах и теневой стороне глянцевого Лос-Анджелеса середины прошлого века.",
    "trailerUrl": "",
    "imdbId": "tt0119488",
    "countries": [
      "США"
    ],
    "duration": "138 мин",
    "director": "Curtis Hanson",
    "mood": "стильная, плотная, расследовательская",
    "themes": "коррупция, честь, город, правда"
  },
  {
    "id": 982009,
    "slug": "mystic-river-2003",
    "title": "Таинственная река",
    "originalTitle": "Mystic River",
    "searchTitles": [
      "таинственная река",
      "mystic river",
      "таинственная река 2003",
      "mystic river 2003"
    ],
    "type": "Фильм",
    "year": "2003",
    "rating": 7.9,
    "genres": [
      "Драма",
      "Криминал",
      "Триллер"
    ],
    "description": "Мрачная драма о старой дружбе, травме и расследовании, которое вскрывает давние раны маленького района.",
    "trailerUrl": "",
    "imdbId": "tt0327056",
    "countries": [
      "США",
      "Австралия"
    ],
    "duration": "138 мин",
    "director": "Clint Eastwood",
    "mood": "тяжёлая, сдержанная, драматичная",
    "themes": "прошлое, вина, семья, расследование"
  },
  {
    "id": 982010,
    "slug": "gran-torino-2008",
    "title": "Гран Торино",
    "originalTitle": "Gran Torino",
    "searchTitles": [
      "гран торино",
      "gran torino",
      "гран торино 2008",
      "gran torino 2008"
    ],
    "type": "Фильм",
    "year": "2008",
    "rating": 8.1,
    "genres": [
      "Драма"
    ],
    "description": "Драма о ворчливом ветеране, который неожиданно становится защитником соседей и заново учится видеть людей рядом.",
    "trailerUrl": "",
    "imdbId": "tt1205489",
    "countries": [
      "США",
      "Германия"
    ],
    "duration": "116 мин",
    "director": "Clint Eastwood",
    "mood": "суровая, человечная, сдержанная",
    "themes": "соседи, предубеждения, искупление, старость"
  },
  {
    "id": 982011,
    "slug": "unforgiven-1992",
    "title": "Непрощённый",
    "originalTitle": "Unforgiven",
    "searchTitles": [
      "непрощённый",
      "unforgiven",
      "непрощённый 1992",
      "unforgiven 1992"
    ],
    "type": "Фильм",
    "year": "1992",
    "rating": 8.2,
    "genres": [
      "Вестерн",
      "Драма"
    ],
    "description": "Антивестерн о бывшем стрелке, которому приходится снова выйти на опасную дорогу ради последнего дела.",
    "trailerUrl": "",
    "imdbId": "tt0105695",
    "countries": [
      "США"
    ],
    "duration": "130 мин",
    "director": "Clint Eastwood",
    "mood": "сухая, мрачная, взрослая",
    "themes": "прошлое, насилие, расплата, честь"
  },
  {
    "id": 982012,
    "slug": "the-last-samurai-2003",
    "title": "Последний самурай",
    "originalTitle": "The Last Samurai",
    "searchTitles": [
      "последний самурай",
      "the last samurai",
      "последний самурай 2003",
      "the last samurai 2003"
    ],
    "type": "Фильм",
    "year": "2003",
    "rating": 7.8,
    "genres": [
      "Драма",
      "Военный",
      "История"
    ],
    "description": "Историческая драма о военном, который оказывается между культурами и постепенно находит новый взгляд на честь и долг.",
    "trailerUrl": "",
    "imdbId": "tt0325710",
    "countries": [
      "США",
      "Новая Зеландия",
      "Япония"
    ],
    "duration": "154 мин",
    "director": "Edward Zwick",
    "mood": "эпическая, благородная, созерцательная",
    "themes": "честь, традиции, долг, перемены"
  },
  {
    "id": 982013,
    "slug": "the-patriot-2000",
    "title": "Патриот",
    "originalTitle": "The Patriot",
    "searchTitles": [
      "патриот",
      "the patriot",
      "патриот 2000",
      "the patriot 2000"
    ],
    "type": "Фильм",
    "year": "2000",
    "rating": 7.2,
    "genres": [
      "Драма",
      "Военный",
      "История"
    ],
    "description": "Историческая драма о фермере и отце, которого война вынуждает снова взяться за оружие.",
    "trailerUrl": "",
    "imdbId": "tt0187393",
    "countries": [
      "США",
      "Германия"
    ],
    "duration": "165 мин",
    "director": "Roland Emmerich",
    "mood": "эпическая, драматичная, военная",
    "themes": "семья, война, свобода, жертва"
  },
  {
    "id": 982014,
    "slug": "kingdom-of-heaven-2005",
    "title": "Царство небесное",
    "originalTitle": "Kingdom of Heaven",
    "searchTitles": [
      "царство небесное",
      "kingdom of heaven",
      "царство небесное 2005",
      "kingdom of heaven 2005"
    ],
    "type": "Фильм",
    "year": "2005",
    "rating": 7.3,
    "genres": [
      "Драма",
      "История",
      "Приключения"
    ],
    "description": "Историческая эпопея о кузнеце, который попадает в центр борьбы за Иерусалим и ищет личный смысл среди большой войны.",
    "trailerUrl": "",
    "imdbId": "tt0320661",
    "countries": [
      "США",
      "Великобритания",
      "Испания"
    ],
    "duration": "144 мин",
    "director": "Ridley Scott",
    "mood": "масштабная, историческая, торжественная",
    "themes": "вера, война, честь, выбор"
  },
  {
    "id": 982015,
    "slug": "master-and-commander-2003",
    "title": "Хозяин морей: На краю Земли",
    "originalTitle": "Master and Commander: The Far Side of the World",
    "searchTitles": [
      "хозяин морей: на краю земли",
      "master and commander: the far side of the world",
      "хозяин морей: на краю земли 2003",
      "master and commander: the far side of the world 2003"
    ],
    "type": "Фильм",
    "year": "2003",
    "rating": 7.5,
    "genres": [
      "Приключения",
      "Драма",
      "Военный"
    ],
    "description": "Морское приключение о капитане и команде, которые преследуют опасный корабль через океан и проверяют себя на прочность.",
    "trailerUrl": "",
    "imdbId": "tt0311113",
    "countries": [
      "США"
    ],
    "duration": "138 мин",
    "director": "Peter Weir",
    "mood": "морская, точная, приключенческая",
    "themes": "лидерство, команда, долг, риск"
  },
  {
    "id": 982016,
    "slug": "the-last-of-the-mohicans-1992",
    "title": "Последний из могикан",
    "originalTitle": "The Last of the Mohicans",
    "searchTitles": [
      "последний из могикан",
      "the last of the mohicans",
      "последний из могикан 1992",
      "the last of the mohicans 1992"
    ],
    "type": "Фильм",
    "year": "1992",
    "rating": 7.6,
    "genres": [
      "Приключения",
      "Драма",
      "Военный"
    ],
    "description": "Историческое приключение о войне, семье и любви на фоне жестокого столкновения миров.",
    "trailerUrl": "",
    "imdbId": "tt0104691",
    "countries": [
      "США"
    ],
    "duration": "112 мин",
    "director": "Michael Mann",
    "mood": "романтическая, напряжённая, природная",
    "themes": "любовь, война, выживание, верность"
  },
  {
    "id": 982017,
    "slug": "dances-with-wolves-1990",
    "title": "Танцующий с волками",
    "originalTitle": "Dances with Wolves",
    "searchTitles": [
      "танцующий с волками",
      "dances with wolves",
      "танцующий с волками 1990",
      "dances with wolves 1990"
    ],
    "type": "Фильм",
    "year": "1990",
    "rating": 8.0,
    "genres": [
      "Драма",
      "Вестерн",
      "Приключения"
    ],
    "description": "Большая вестерн-драма о человеке, который меняет взгляд на мир после встречи с другой культурой и жизнью на границе.",
    "trailerUrl": "",
    "imdbId": "tt0099348",
    "countries": [
      "США",
      "Великобритания"
    ],
    "duration": "181 мин",
    "director": "Kevin Costner",
    "mood": "широкая, созерцательная, гуманистическая",
    "themes": "культура, дружба, природа, перемены"
  },
  {
    "id": 982018,
    "slug": "sleepers-1996",
    "title": "Спящие",
    "originalTitle": "Sleepers",
    "searchTitles": [
      "спящие",
      "sleepers",
      "спящие 1996",
      "sleepers 1996"
    ],
    "type": "Фильм",
    "year": "1996",
    "rating": 7.5,
    "genres": [
      "Драма",
      "Криминал",
      "Триллер"
    ],
    "description": "Драма о друзьях детства, чья жизнь меняется после трагических событий и возвращается к ним через годы.",
    "trailerUrl": "",
    "imdbId": "tt0117665",
    "countries": [
      "США"
    ],
    "duration": "147 мин",
    "director": "Barry Levinson",
    "mood": "мрачная, эмоциональная, судебная",
    "themes": "дружба, травма, справедливость, прошлое"
  },
  {
    "id": 982019,
    "slug": "donnie-brasco-1997",
    "title": "Донни Браско",
    "originalTitle": "Donnie Brasco",
    "searchTitles": [
      "донни браско",
      "donnie brasco",
      "донни браско 1997",
      "donnie brasco 1997"
    ],
    "type": "Фильм",
    "year": "1997",
    "rating": 7.7,
    "genres": [
      "Криминал",
      "Драма"
    ],
    "description": "Криминальная драма о работе под прикрытием, где служебная задача постепенно становится личным испытанием.",
    "trailerUrl": "",
    "imdbId": "tt0119008",
    "countries": [
      "США"
    ],
    "duration": "127 мин",
    "director": "Mike Newell",
    "mood": "напряжённая, психологичная, криминальная",
    "themes": "доверие, двойная жизнь, долг, дружба"
  },
  {
    "id": 982020,
    "slug": "carlitos-way-1993",
    "title": "Путь Карлито",
    "originalTitle": "Carlito's Way",
    "searchTitles": [
      "путь карлито",
      "carlito's way",
      "путь карлито 1993",
      "carlito's way 1993"
    ],
    "type": "Фильм",
    "year": "1993",
    "rating": 7.9,
    "genres": [
      "Драма",
      "Криминал",
      "Триллер"
    ],
    "description": "Криминальная драма о человеке, который пытается выбраться из прошлого, но старые связи не отпускают так просто.",
    "trailerUrl": "",
    "imdbId": "tt0106519",
    "countries": [
      "США"
    ],
    "duration": "144 мин",
    "director": "Brian De Palma",
    "mood": "меланхоличная, криминальная, напряжённая",
    "themes": "прошлое, свобода, любовь, опасность"
  },
  {
    "id": 982021,
    "slug": "a-bronx-tale-1993",
    "title": "Бронкская история",
    "originalTitle": "A Bronx Tale",
    "searchTitles": [
      "бронкская история",
      "a bronx tale",
      "бронкская история 1993",
      "a bronx tale 1993"
    ],
    "type": "Фильм",
    "year": "1993",
    "rating": 7.8,
    "genres": [
      "Драма",
      "Криминал"
    ],
    "description": "История взросления в районе, где подросток учится различать уважение, страх и настоящую силу характера.",
    "trailerUrl": "",
    "imdbId": "tt0106489",
    "countries": [
      "США"
    ],
    "duration": "121 мин",
    "director": "Robert De Niro",
    "mood": "тёплая, уличная, взрослеющая",
    "themes": "семья, район, выбор, взросление"
  },
  {
    "id": 982022,
    "slug": "true-romance-1993",
    "title": "Настоящая любовь",
    "originalTitle": "True Romance",
    "searchTitles": [
      "настоящая любовь",
      "true romance",
      "настоящая любовь 1993",
      "true romance 1993"
    ],
    "type": "Фильм",
    "year": "1993",
    "rating": 7.9,
    "genres": [
      "Криминал",
      "Мелодрама",
      "Триллер"
    ],
    "description": "Криминальная романтика о паре, которая пытается убежать от опасных людей и удержать своё чувство на бешеной скорости.",
    "trailerUrl": "",
    "imdbId": "tt0108399",
    "countries": [
      "США",
      "Франция"
    ],
    "duration": "119 мин",
    "director": "Tony Scott",
    "mood": "дерзкая, романтичная, опасная",
    "themes": "любовь, побег, преступление, свобода"
  },
  {
    "id": 982023,
    "slug": "jackie-brown-1997",
    "title": "Джеки Браун",
    "originalTitle": "Jackie Brown",
    "searchTitles": [
      "джеки браун",
      "jackie brown",
      "джеки браун 1997",
      "jackie brown 1997"
    ],
    "type": "Фильм",
    "year": "1997",
    "rating": 7.5,
    "genres": [
      "Криминал",
      "Драма",
      "Триллер"
    ],
    "description": "Криминальная история о стюардессе, которая пытается перехитрить сразу несколько опасных игроков.",
    "trailerUrl": "",
    "imdbId": "tt0119396",
    "countries": [
      "США"
    ],
    "duration": "154 мин",
    "director": "Quentin Tarantino",
    "mood": "стильная, разговорная, криминальная",
    "themes": "план, деньги, риск, самостоятельность"
  },
  {
    "id": 982024,
    "slug": "cape-fear-1991",
    "title": "Мыс страха",
    "originalTitle": "Cape Fear",
    "searchTitles": [
      "мыс страха",
      "cape fear",
      "мыс страха 1991",
      "cape fear 1991"
    ],
    "type": "Фильм",
    "year": "1991",
    "rating": 7.3,
    "genres": [
      "Триллер",
      "Криминал"
    ],
    "description": "Психологический триллер о семье адвоката, которую преследует человек из прошлого с опасной одержимостью.",
    "trailerUrl": "",
    "imdbId": "tt0101540",
    "countries": [
      "США"
    ],
    "duration": "128 мин",
    "director": "Martin Scorsese",
    "mood": "тревожная, давящая, напряжённая",
    "themes": "месть, страх, семья, прошлое"
  },
  {
    "id": 982025,
    "slug": "the-untouchables-1987",
    "title": "Неприкасаемые",
    "originalTitle": "The Untouchables",
    "searchTitles": [
      "неприкасаемые",
      "the untouchables",
      "неприкасаемые 1987",
      "the untouchables 1987"
    ],
    "type": "Фильм",
    "year": "1987",
    "rating": 7.8,
    "genres": [
      "Криминал",
      "Драма",
      "Триллер"
    ],
    "description": "Криминальная драма о группе агентов, которые бросают вызов могущественной преступной системе.",
    "trailerUrl": "",
    "imdbId": "tt0094226",
    "countries": [
      "США"
    ],
    "duration": "119 мин",
    "director": "Brian De Palma",
    "mood": "классическая, напряжённая, героическая",
    "themes": "закон, коррупция, команда, риск"
  },
  {
    "id": 982026,
    "slug": "road-to-perdition-2002",
    "title": "Проклятый путь",
    "originalTitle": "Road to Perdition",
    "searchTitles": [
      "проклятый путь",
      "road to perdition",
      "проклятый путь 2002",
      "road to perdition 2002"
    ],
    "type": "Фильм",
    "year": "2002",
    "rating": 7.7,
    "genres": [
      "Драма",
      "Криминал",
      "Триллер"
    ],
    "description": "Мрачная криминальная драма об отце и сыне, которые бегут от последствий предательства в мире мафии.",
    "trailerUrl": "",
    "imdbId": "tt0257044",
    "countries": [
      "США"
    ],
    "duration": "117 мин",
    "director": "Sam Mendes",
    "mood": "сдержанная, трагичная, атмосферная",
    "themes": "отец и сын, предательство, путь, расплата"
  },
  {
    "id": 982027,
    "slug": "eastern-promises-2007",
    "title": "Порок на экспорт",
    "originalTitle": "Eastern Promises",
    "searchTitles": [
      "порок на экспорт",
      "eastern promises",
      "порок на экспорт 2007",
      "eastern promises 2007"
    ],
    "type": "Фильм",
    "year": "2007",
    "rating": 7.6,
    "genres": [
      "Криминал",
      "Драма",
      "Триллер"
    ],
    "description": "Криминальный триллер о женщине, которая выходит на след опасной организации после загадочного случая в больнице.",
    "trailerUrl": "",
    "imdbId": "tt0765443",
    "countries": [
      "Великобритания",
      "Канада",
      "США"
    ],
    "duration": "100 мин",
    "director": "David Cronenberg",
    "mood": "холодная, тревожная, криминальная",
    "themes": "тайна, насилие, долг, расследование"
  },
  {
    "id": 982028,
    "slug": "a-history-of-violence-2005",
    "title": "Оправданная жестокость",
    "originalTitle": "A History of Violence",
    "searchTitles": [
      "оправданная жестокость",
      "a history of violence",
      "оправданная жестокость 2005",
      "a history of violence 2005"
    ],
    "type": "Фильм",
    "year": "2005",
    "rating": 7.4,
    "genres": [
      "Драма",
      "Криминал",
      "Триллер"
    ],
    "description": "Триллер о спокойной семье, чья жизнь рушится после поступка, который привлекает внимание людей из прошлого.",
    "trailerUrl": "",
    "imdbId": "tt0399146",
    "countries": [
      "США",
      "Канада"
    ],
    "duration": "96 мин",
    "director": "David Cronenberg",
    "mood": "напряжённая, психологичная, жёсткая",
    "themes": "прошлое, семья, насилие, личность"
  },
  {
    "id": 982029,
    "slug": "collateral-2004",
    "title": "Соучастник",
    "originalTitle": "Collateral",
    "searchTitles": [
      "соучастник",
      "collateral",
      "соучастник 2004",
      "collateral 2004"
    ],
    "type": "Фильм",
    "year": "2004",
    "rating": 7.5,
    "genres": [
      "Триллер",
      "Криминал",
      "Драма"
    ],
    "description": "Ночной триллер о таксисте, который оказывается заложником хладнокровного пассажира с опасным маршрутом.",
    "trailerUrl": "",
    "imdbId": "tt0369339",
    "countries": [
      "США"
    ],
    "duration": "120 мин",
    "director": "Michael Mann",
    "mood": "ночная, стильная, напряжённая",
    "themes": "случайность, выбор, город, опасность"
  },
  {
    "id": 982030,
    "slug": "inside-man-2006",
    "title": "Не пойман — не вор",
    "originalTitle": "Inside Man",
    "searchTitles": [
      "не пойман — не вор",
      "inside man",
      "не пойман — не вор 2006",
      "inside man 2006"
    ],
    "type": "Фильм",
    "year": "2006",
    "rating": 7.6,
    "genres": [
      "Триллер",
      "Криминал",
      "Драма"
    ],
    "description": "Криминальный триллер о банковском ограблении, где каждый шаг выглядит частью более крупного плана.",
    "trailerUrl": "",
    "imdbId": "tt0454848",
    "countries": [
      "США"
    ],
    "duration": "129 мин",
    "director": "Spike Lee",
    "mood": "хитрая, динамичная, городская",
    "themes": "ограбление, переговоры, план, тайна"
  },
  {
    "id": 982031,
    "slug": "the-town-2010",
    "title": "Город воров",
    "originalTitle": "The Town",
    "searchTitles": [
      "город воров",
      "the town",
      "город воров 2010",
      "the town 2010"
    ],
    "type": "Фильм",
    "year": "2010",
    "rating": 7.5,
    "genres": [
      "Криминал",
      "Драма",
      "Триллер"
    ],
    "description": "Криминальная драма о грабителе из Бостона, который пытается выйти из старой жизни, пока круг сжимается.",
    "trailerUrl": "",
    "imdbId": "tt0840361",
    "countries": [
      "США"
    ],
    "duration": "125 мин",
    "director": "Ben Affleck",
    "mood": "напряжённая, городская, драматичная",
    "themes": "ограбления, любовь, район, риск"
  },
  {
    "id": 982032,
    "slug": "gone-baby-gone-2007",
    "title": "Прощай, детка, прощай",
    "originalTitle": "Gone Baby Gone",
    "searchTitles": [
      "прощай, детка, прощай",
      "gone baby gone",
      "прощай, детка, прощай 2007",
      "gone baby gone 2007"
    ],
    "type": "Фильм",
    "year": "2007",
    "rating": 7.6,
    "genres": [
      "Драма",
      "Криминал",
      "Детектив"
    ],
    "description": "Детективная драма о поисках пропавшей девочки, где моральный выбор становится сложнее самого расследования.",
    "trailerUrl": "",
    "imdbId": "tt0452623",
    "countries": [
      "США"
    ],
    "duration": "114 мин",
    "director": "Ben Affleck",
    "mood": "мрачная, моральная, расследовательская",
    "themes": "выбор, семья, правда, район"
  },
  {
    "id": 982033,
    "slug": "the-assassination-of-jesse-james-2007",
    "title": "Как трусливый Роберт Форд убил Джесси Джеймса",
    "originalTitle": "The Assassination of Jesse James by the Coward Robert Ford",
    "searchTitles": [
      "как трусливый роберт форд убил джесси джеймса",
      "the assassination of jesse james by the coward robert ford",
      "как трусливый роберт форд убил джесси джеймса 2007",
      "the assassination of jesse james by the coward robert ford 2007"
    ],
    "type": "Фильм",
    "year": "2007",
    "rating": 7.5,
    "genres": [
      "Вестерн",
      "Драма",
      "История"
    ],
    "description": "Медитативный вестерн о легенде, зависти и человеке, который слишком близко подошёл к своему кумиру.",
    "trailerUrl": "",
    "imdbId": "tt0443680",
    "countries": [
      "США",
      "Канада",
      "Великобритания"
    ],
    "duration": "160 мин",
    "director": "Andrew Dominik",
    "mood": "медленная, красивая, трагичная",
    "themes": "легенда, зависть, слава, предательство"
  },
  {
    "id": 982034,
    "slug": "3-10-to-yuma-2007",
    "title": "Поезд на Юму",
    "originalTitle": "3:10 to Yuma",
    "searchTitles": [
      "поезд на юму",
      "3:10 to yuma",
      "поезд на юму 2007",
      "3:10 to yuma 2007"
    ],
    "type": "Фильм",
    "year": "2007",
    "rating": 7.6,
    "genres": [
      "Вестерн",
      "Драма",
      "Криминал"
    ],
    "description": "Вестерн о фермере, который берётся доставить опасного преступника к поезду и проверить собственную смелость.",
    "trailerUrl": "",
    "imdbId": "tt0381849",
    "countries": [
      "США"
    ],
    "duration": "122 мин",
    "director": "James Mangold",
    "mood": "напряжённая, пыльная, моральная",
    "themes": "честь, долг, страх, выбор"
  },
  {
    "id": 982035,
    "slug": "tombstone-1993",
    "title": "Тумстоун",
    "originalTitle": "Tombstone",
    "searchTitles": [
      "тумстоун",
      "tombstone",
      "тумстоун 1993",
      "tombstone 1993"
    ],
    "type": "Фильм",
    "year": "1993",
    "rating": 7.8,
    "genres": [
      "Вестерн",
      "Драма",
      "История"
    ],
    "description": "Классический вестерн о городе, где старые стрелки и новые конфликты быстро доводят ситуацию до взрыва.",
    "trailerUrl": "",
    "imdbId": "tt0108358",
    "countries": [
      "США"
    ],
    "duration": "130 мин",
    "director": "George P. Cosmatos",
    "mood": "классическая, харизматичная, напряжённая",
    "themes": "дружба, закон, дуэль, город"
  },
  {
    "id": 982036,
    "slug": "open-range-2003",
    "title": "Открытый простор",
    "originalTitle": "Open Range",
    "searchTitles": [
      "открытый простор",
      "open range",
      "открытый простор 2003",
      "open range 2003"
    ],
    "type": "Фильм",
    "year": "2003",
    "rating": 7.4,
    "genres": [
      "Вестерн",
      "Драма"
    ],
    "description": "Вестерн о свободных пастухах, которые сталкиваются с жестокой властью маленького города.",
    "trailerUrl": "",
    "imdbId": "tt0316356",
    "countries": [
      "США"
    ],
    "duration": "139 мин",
    "director": "Kevin Costner",
    "mood": "спокойная, принципиальная, пыльная",
    "themes": "свобода, честь, земля, справедливость"
  },
  {
    "id": 982037,
    "slug": "the-grey-2011",
    "title": "Схватка",
    "originalTitle": "The Grey",
    "searchTitles": [
      "схватка",
      "the grey",
      "схватка 2011",
      "the grey 2011"
    ],
    "type": "Фильм",
    "year": "2011",
    "rating": 6.8,
    "genres": [
      "Триллер",
      "Драма",
      "Приключения"
    ],
    "description": "Суровый триллер о людях, оказавшихся в ледяной глуши после катастрофы и вынужденных бороться за каждый шаг.",
    "trailerUrl": "",
    "imdbId": "tt1601913",
    "countries": [
      "США"
    ],
    "duration": "117 мин",
    "director": "Joe Carnahan",
    "mood": "холодная, выживальческая, мрачная",
    "themes": "выживание, страх, природа, воля"
  },
  {
    "id": 982038,
    "slug": "the-fighter-2010",
    "title": "Боец",
    "originalTitle": "The Fighter",
    "searchTitles": [
      "боец",
      "the fighter",
      "боец 2010",
      "the fighter 2010"
    ],
    "type": "Фильм",
    "year": "2010",
    "rating": 7.8,
    "genres": [
      "Драма",
      "Спорт",
      "Биография"
    ],
    "description": "Спортивная драма о боксёре, семье и попытке выйти из тени чужих ожиданий.",
    "trailerUrl": "",
    "imdbId": "tt0964517",
    "countries": [
      "США"
    ],
    "duration": "116 мин",
    "director": "David O. Russell",
    "mood": "эмоциональная, спортивная, семейная",
    "themes": "спорт, семья, шанс, дисциплина"
  },
  {
    "id": 982039,
    "slug": "cinderella-man-2005",
    "title": "Нокдаун",
    "originalTitle": "Cinderella Man",
    "searchTitles": [
      "нокдаун",
      "cinderella man",
      "нокдаун 2005",
      "cinderella man 2005"
    ],
    "type": "Фильм",
    "year": "2005",
    "rating": 8.0,
    "genres": [
      "Драма",
      "Биография",
      "Спорт"
    ],
    "description": "Вдохновляющая спортивная драма о боксёре, который возвращается на ринг в тяжёлое время ради семьи.",
    "trailerUrl": "",
    "imdbId": "tt0352248",
    "countries": [
      "США"
    ],
    "duration": "144 мин",
    "director": "Ron Howard",
    "mood": "вдохновляющая, классическая, драматичная",
    "themes": "семья, стойкость, спорт, надежда"
  },
  {
    "id": 982040,
    "slug": "moneyball-2011",
    "title": "Человек, который изменил всё",
    "originalTitle": "Moneyball",
    "searchTitles": [
      "человек, который изменил всё",
      "moneyball",
      "человек, который изменил всё 2011",
      "moneyball 2011"
    ],
    "type": "Фильм",
    "year": "2011",
    "rating": 7.6,
    "genres": [
      "Драма",
      "Биография",
      "Спорт"
    ],
    "description": "Драма о менеджере бейсбольной команды, который ищет новый способ побеждать, когда денег почти нет.",
    "trailerUrl": "",
    "imdbId": "tt1210166",
    "countries": [
      "США"
    ],
    "duration": "133 мин",
    "director": "Bennett Miller",
    "mood": "умная, спокойная, спортивная",
    "themes": "аналитика, риск, команда, стратегия"
  },
  {
    "id": 982041,
    "slug": "the-blind-side-2009",
    "title": "Невидимая сторона",
    "originalTitle": "The Blind Side",
    "searchTitles": [
      "невидимая сторона",
      "the blind side",
      "невидимая сторона 2009",
      "the blind side 2009"
    ],
    "type": "Фильм",
    "year": "2009",
    "rating": 7.6,
    "genres": [
      "Драма",
      "Биография",
      "Спорт"
    ],
    "description": "Спортивная драма о подростке, семье и шансе, который меняет траекторию жизни.",
    "trailerUrl": "",
    "imdbId": "tt0878804",
    "countries": [
      "США"
    ],
    "duration": "129 мин",
    "director": "John Lee Hancock",
    "mood": "тёплая, семейная, вдохновляющая",
    "themes": "семья, поддержка, спорт, шанс"
  },
  {
    "id": 982042,
    "slug": "remember-the-titans-2000",
    "title": "Вспоминая титанов",
    "originalTitle": "Remember the Titans",
    "searchTitles": [
      "вспоминая титанов",
      "remember the titans",
      "вспоминая титанов 2000",
      "remember the titans 2000"
    ],
    "type": "Фильм",
    "year": "2000",
    "rating": 7.8,
    "genres": [
      "Драма",
      "Биография",
      "Спорт"
    ],
    "description": "Спортивная драма о школьной команде, которая учится играть вместе в период больших общественных напряжений.",
    "trailerUrl": "",
    "imdbId": "tt0210945",
    "countries": [
      "США"
    ],
    "duration": "113 мин",
    "director": "Boaz Yakin",
    "mood": "командная, вдохновляющая, энергичная",
    "themes": "команда, доверие, спорт, единство"
  },
  {
    "id": 982043,
    "slug": "coach-carter-2005",
    "title": "Тренер Картер",
    "originalTitle": "Coach Carter",
    "searchTitles": [
      "тренер картер",
      "coach carter",
      "тренер картер 2005",
      "coach carter 2005"
    ],
    "type": "Фильм",
    "year": "2005",
    "rating": 7.3,
    "genres": [
      "Драма",
      "Спорт"
    ],
    "description": "Спортивная драма о тренере, который требует от команды дисциплины не только на площадке, но и в жизни.",
    "trailerUrl": "",
    "imdbId": "tt0393162",
    "countries": [
      "США",
      "Германия"
    ],
    "duration": "136 мин",
    "director": "Thomas Carter",
    "mood": "строгая, мотивирующая, школьная",
    "themes": "дисциплина, команда, учёба, спорт"
  },
  {
    "id": 982044,
    "slug": "any-given-sunday-1999",
    "title": "Каждое воскресенье",
    "originalTitle": "Any Given Sunday",
    "searchTitles": [
      "каждое воскресенье",
      "any given sunday",
      "каждое воскресенье 1999",
      "any given sunday 1999"
    ],
    "type": "Фильм",
    "year": "1999",
    "rating": 6.9,
    "genres": [
      "Драма",
      "Спорт"
    ],
    "description": "Энергичная спортивная драма о профессиональной команде, давлении побед и цене большой игры.",
    "trailerUrl": "",
    "imdbId": "tt0146838",
    "countries": [
      "США"
    ],
    "duration": "162 мин",
    "director": "Oliver Stone",
    "mood": "шумная, жёсткая, соревновательная",
    "themes": "команда, бизнес, спорт, давление"
  },
  {
    "id": 982045,
    "slug": "moon-2009",
    "title": "Луна 2112",
    "originalTitle": "Moon",
    "searchTitles": [
      "луна 2112",
      "moon",
      "луна 2112 2009",
      "moon 2009"
    ],
    "type": "Фильм",
    "year": "2009",
    "rating": 7.8,
    "genres": [
      "Фантастика",
      "Драма",
      "Детектив"
    ],
    "description": "Камерная фантастика о человеке на лунной станции, который начинает сомневаться в собственной реальности.",
    "trailerUrl": "",
    "imdbId": "tt1182345",
    "countries": [
      "Великобритания",
      "США"
    ],
    "duration": "97 мин",
    "director": "Duncan Jones",
    "mood": "одинокая, загадочная, камерная",
    "themes": "изоляция, память, личность, тайна"
  },
  {
    "id": 982046,
    "slug": "minority-report-2002",
    "title": "Особое мнение",
    "originalTitle": "Minority Report",
    "searchTitles": [
      "особое мнение",
      "minority report",
      "особое мнение 2002",
      "minority report 2002"
    ],
    "type": "Фильм",
    "year": "2002",
    "rating": 7.6,
    "genres": [
      "Фантастика",
      "Триллер",
      "Детектив"
    ],
    "description": "Фантастический триллер о будущем, где преступления пытаются остановить до их совершения, но система даёт сбой.",
    "trailerUrl": "",
    "imdbId": "tt0181689",
    "countries": [
      "США"
    ],
    "duration": "145 мин",
    "director": "Steven Spielberg",
    "mood": "динамичная, футуристичная, детективная",
    "themes": "свобода, контроль, будущее, выбор"
  },
  {
    "id": 982047,
    "slug": "sunshine-2007",
    "title": "Пекло",
    "originalTitle": "Sunshine",
    "searchTitles": [
      "пекло",
      "sunshine",
      "пекло 2007",
      "sunshine 2007"
    ],
    "type": "Фильм",
    "year": "2007",
    "rating": 7.2,
    "genres": [
      "Фантастика",
      "Триллер",
      "Драма"
    ],
    "description": "Космический триллер о команде, которая летит к Солнцу с миссией, от которой зависит будущее Земли.",
    "trailerUrl": "",
    "imdbId": "tt0448134",
    "countries": [
      "Великобритания",
      "США"
    ],
    "duration": "107 мин",
    "director": "Danny Boyle",
    "mood": "напряжённая, космическая, тревожная",
    "themes": "миссия, жертва, космос, команда"
  },
  {
    "id": 982048,
    "slug": "gattaca-1997",
    "title": "Гаттака",
    "originalTitle": "Gattaca",
    "searchTitles": [
      "гаттака",
      "gattaca",
      "гаттака 1997",
      "gattaca 1997"
    ],
    "type": "Фильм",
    "year": "1997",
    "rating": 7.7,
    "genres": [
      "Фантастика",
      "Драма",
      "Триллер"
    ],
    "description": "Элегантная фантастика о мире генетического отбора и человеке, который не хочет соглашаться с чужим приговором.",
    "trailerUrl": "",
    "imdbId": "tt0119177",
    "countries": [
      "США"
    ],
    "duration": "106 мин",
    "director": "Andrew Niccol",
    "mood": "холодная, умная, вдохновляющая",
    "themes": "мечта, контроль, личность, будущее"
  },
  {
    "id": 982049,
    "slug": "equilibrium-2002",
    "title": "Эквилибриум",
    "originalTitle": "Equilibrium",
    "searchTitles": [
      "эквилибриум",
      "equilibrium",
      "эквилибриум 2002",
      "equilibrium 2002"
    ],
    "type": "Фильм",
    "year": "2002",
    "rating": 7.3,
    "genres": [
      "Фантастика",
      "Боевик",
      "Триллер"
    ],
    "description": "Антиутопический боевик о мире без эмоций и человеке системы, который начинает чувствовать больше, чем разрешено.",
    "trailerUrl": "",
    "imdbId": "tt0238380",
    "countries": [
      "США"
    ],
    "duration": "107 мин",
    "director": "Kurt Wimmer",
    "mood": "стильная, мрачная, динамичная",
    "themes": "контроль, эмоции, бунт, свобода"
  },
  {
    "id": 982050,
    "slug": "12-monkeys-1995",
    "title": "12 обезьян",
    "originalTitle": "Twelve Monkeys",
    "searchTitles": [
      "12 обезьян",
      "twelve monkeys",
      "12 обезьян 1995",
      "twelve monkeys 1995"
    ],
    "type": "Фильм",
    "year": "1995",
    "rating": 8.0,
    "genres": [
      "Фантастика",
      "Триллер",
      "Детектив"
    ],
    "description": "Фантастический триллер о путешествиях во времени, памяти и попытке понять, где заканчивается реальность.",
    "trailerUrl": "",
    "imdbId": "tt0114746",
    "countries": [
      "США"
    ],
    "duration": "129 мин",
    "director": "Terry Gilliam",
    "mood": "параноидальная, загадочная, странная",
    "themes": "время, память, болезнь, судьба"
  },
  {
    "id": 982051,
    "slug": "dark-city-1998",
    "title": "Тёмный город",
    "originalTitle": "Dark City",
    "searchTitles": [
      "тёмный город",
      "dark city",
      "тёмный город 1998",
      "dark city 1998"
    ],
    "type": "Фильм",
    "year": "1998",
    "rating": 7.6,
    "genres": [
      "Фантастика",
      "Детектив",
      "Триллер"
    ],
    "description": "Неонуарная фантастика о человеке без памяти, который пытается раскрыть тайну города, где ночь не заканчивается.",
    "trailerUrl": "",
    "imdbId": "tt0118929",
    "countries": [
      "Австралия",
      "США"
    ],
    "duration": "100 мин",
    "director": "Alex Proyas",
    "mood": "мрачная, неонуарная, загадочная",
    "themes": "память, город, личность, контроль"
  },
  {
    "id": 982052,
    "slug": "brazil-1985",
    "title": "Бразилия",
    "originalTitle": "Brazil",
    "searchTitles": [
      "бразилия",
      "brazil",
      "бразилия 1985",
      "brazil 1985"
    ],
    "type": "Фильм",
    "year": "1985",
    "rating": 7.9,
    "genres": [
      "Фантастика",
      "Драма",
      "Комедия"
    ],
    "description": "Сатирическая антиутопия о маленьком человеке в огромной бюрократической машине и мечте вырваться наружу.",
    "trailerUrl": "",
    "imdbId": "tt0088846",
    "countries": [
      "Великобритания",
      "США"
    ],
    "duration": "132 мин",
    "director": "Terry Gilliam",
    "mood": "абсурдная, мрачная, сатирическая",
    "themes": "бюрократия, мечта, система, свобода"
  },
  {
    "id": 982053,
    "slug": "the-ring-2002",
    "title": "Звонок",
    "originalTitle": "The Ring",
    "searchTitles": [
      "звонок",
      "the ring",
      "звонок 2002",
      "the ring 2002"
    ],
    "type": "Фильм",
    "year": "2002",
    "rating": 7.1,
    "genres": [
      "Ужасы",
      "Детектив",
      "Триллер"
    ],
    "description": "Мистический триллер о загадочной видеозаписи и расследовании, где каждая новая деталь только усиливает тревогу.",
    "trailerUrl": "",
    "imdbId": "tt0298130",
    "countries": [
      "США",
      "Япония"
    ],
    "duration": "115 мин",
    "director": "Gore Verbinski",
    "mood": "тревожная, мистическая, холодная",
    "themes": "тайна, страх, расследование, проклятие"
  },
  {
    "id": 982054,
    "slug": "saw-2004",
    "title": "Пила: Игра на выживание",
    "originalTitle": "Saw",
    "searchTitles": [
      "пила: игра на выживание",
      "saw",
      "пила: игра на выживание 2004",
      "saw 2004"
    ],
    "type": "Фильм",
    "year": "2004",
    "rating": 7.6,
    "genres": [
      "Ужасы",
      "Триллер",
      "Детектив"
    ],
    "description": "Камерный триллер-головоломка о людях, которые просыпаются в ловушке и пытаются понять правила опасной игры.",
    "trailerUrl": "",
    "imdbId": "tt0387564",
    "countries": [
      "США"
    ],
    "duration": "103 мин",
    "director": "James Wan",
    "mood": "жёсткая, загадочная, напряжённая",
    "themes": "выбор, ловушка, страх, расследование"
  },
  {
    "id": 982055,
    "slug": "it-follows-2014",
    "title": "Оно следует",
    "originalTitle": "It Follows",
    "searchTitles": [
      "оно следует",
      "it follows",
      "оно следует 2014",
      "it follows 2014"
    ],
    "type": "Фильм",
    "year": "2014",
    "rating": 6.8,
    "genres": [
      "Ужасы",
      "Триллер",
      "Детектив"
    ],
    "description": "Атмосферный хоррор о невидимой угрозе, которая медленно и неотвратимо приближается.",
    "trailerUrl": "",
    "imdbId": "tt3235888",
    "countries": [
      "США"
    ],
    "duration": "100 мин",
    "director": "David Robert Mitchell",
    "mood": "медленная, тревожная, атмосферная",
    "themes": "страх, взросление, преследование, неизбежность"
  },
  {
    "id": 982056,
    "slug": "the-princess-bride-1987",
    "title": "Принцесса-невеста",
    "originalTitle": "The Princess Bride",
    "searchTitles": [
      "принцесса-невеста",
      "the princess bride",
      "принцесса-невеста 1987",
      "the princess bride 1987"
    ],
    "type": "Фильм",
    "year": "1987",
    "rating": 8.0,
    "genres": [
      "Фэнтези",
      "Приключения",
      "Комедия"
    ],
    "description": "Сказочное приключение с дуэлями, романтикой и мягким юмором, которое играет с классическими историями о героях.",
    "trailerUrl": "",
    "imdbId": "tt0093779",
    "countries": [
      "США"
    ],
    "duration": "98 мин",
    "director": "Rob Reiner",
    "mood": "добрая, ироничная, сказочная",
    "themes": "любовь, приключение, сказка, дружба"
  },
  {
    "id": 982057,
    "slug": "mrs-doubtfire-1993",
    "title": "Миссис Даутфайр",
    "originalTitle": "Mrs. Doubtfire",
    "searchTitles": [
      "миссис даутфайр",
      "mrs. doubtfire",
      "миссис даутфайр 1993",
      "mrs. doubtfire 1993"
    ],
    "type": "Фильм",
    "year": "1993",
    "rating": 7.1,
    "genres": [
      "Комедия",
      "Драма",
      "Семейный"
    ],
    "description": "Семейная комедия о человеке, который придумывает необычный способ быть ближе к детям после расставания.",
    "trailerUrl": "",
    "imdbId": "tt0107614",
    "countries": [
      "США"
    ],
    "duration": "125 мин",
    "director": "Chris Columbus",
    "mood": "тёплая, семейная, комедийная",
    "themes": "семья, дети, ответственность, любовь"
  },
  {
    "id": 982058,
    "slug": "hook-1991",
    "title": "Капитан Крюк",
    "originalTitle": "Hook",
    "searchTitles": [
      "капитан крюк",
      "hook",
      "капитан крюк 1991",
      "hook 1991"
    ],
    "type": "Фильм",
    "year": "1991",
    "rating": 6.8,
    "genres": [
      "Фэнтези",
      "Приключения",
      "Семейный"
    ],
    "description": "Семейное фэнтези о взрослом Питере Пэне, которому приходится вспомнить детство и вернуться в мир приключений.",
    "trailerUrl": "",
    "imdbId": "tt0102057",
    "countries": [
      "США"
    ],
    "duration": "142 мин",
    "director": "Steven Spielberg",
    "mood": "сказочная, ностальгическая, семейная",
    "themes": "детство, семья, воображение, приключение"
  },
  {
    "id": 982059,
    "slug": "matilda-1996",
    "title": "Матильда",
    "originalTitle": "Matilda",
    "searchTitles": [
      "матильда",
      "matilda",
      "матильда 1996",
      "matilda 1996"
    ],
    "type": "Фильм",
    "year": "1996",
    "rating": 7.0,
    "genres": [
      "Комедия",
      "Семейный",
      "Фэнтези"
    ],
    "description": "Семейная комедия о необычной девочке, которая находит силу, знания и друзей в мире взрослых правил.",
    "trailerUrl": "",
    "imdbId": "tt0117008",
    "countries": [
      "США"
    ],
    "duration": "98 мин",
    "director": "Danny DeVito",
    "mood": "добрая, озорная, школьная",
    "themes": "детство, смелость, школа, справедливость"
  },
  {
    "id": 982060,
    "slug": "babe-1995",
    "title": "Бэйб: Четвероногий малыш",
    "originalTitle": "Babe",
    "searchTitles": [
      "бэйб: четвероногий малыш",
      "babe",
      "бэйб: четвероногий малыш 1995",
      "babe 1995"
    ],
    "type": "Фильм",
    "year": "1995",
    "rating": 6.9,
    "genres": [
      "Семейный",
      "Драма",
      "Комедия"
    ],
    "description": "Тёплая семейная история о поросёнке, который неожиданно находит своё место среди пастушьих собак.",
    "trailerUrl": "",
    "imdbId": "tt0112431",
    "countries": [
      "Австралия",
      "США"
    ],
    "duration": "91 мин",
    "director": "Chris Noonan",
    "mood": "добрая, мягкая, семейная",
    "themes": "мечта, ферма, дружба, уверенность"
  },
  {
    "id": 982061,
    "slug": "mousehunt-1997",
    "title": "Мышиная охота",
    "originalTitle": "MouseHunt",
    "searchTitles": [
      "мышиная охота",
      "mousehunt",
      "мышиная охота 1997",
      "mousehunt 1997"
    ],
    "type": "Фильм",
    "year": "1997",
    "rating": 6.5,
    "genres": [
      "Комедия",
      "Семейный"
    ],
    "description": "Комедия о двух братьях, которые пытаются избавиться от крошечной мыши, но получают настоящий домашний хаос.",
    "trailerUrl": "",
    "imdbId": "tt0119715",
    "countries": [
      "США"
    ],
    "duration": "98 мин",
    "director": "Gore Verbinski",
    "mood": "шумная, фарсовая, лёгкая",
    "themes": "дом, хаос, братья, комедия положений"
  },
  {
    "id": 982062,
    "slug": "notting-hill-1999",
    "title": "Ноттинг Хилл",
    "originalTitle": "Notting Hill",
    "searchTitles": [
      "ноттинг хилл",
      "notting hill",
      "ноттинг хилл 1999",
      "notting hill 1999"
    ],
    "type": "Фильм",
    "year": "1999",
    "rating": 7.2,
    "genres": [
      "Мелодрама",
      "Комедия",
      "Драма"
    ],
    "description": "Романтическая комедия о скромном владельце книжного магазина и мировой звезде, которые пытаются быть обычными людьми рядом друг с другом.",
    "trailerUrl": "",
    "imdbId": "tt0125439",
    "countries": [
      "Великобритания",
      "США"
    ],
    "duration": "124 мин",
    "director": "Roger Michell",
    "mood": "мягкая, романтичная, британская",
    "themes": "любовь, слава, случайность, доверие"
  },
  {
    "id": 982063,
    "slug": "about-time-2013",
    "title": "Бойфренд из будущего",
    "originalTitle": "About Time",
    "searchTitles": [
      "бойфренд из будущего",
      "about time",
      "бойфренд из будущего 2013",
      "about time 2013"
    ],
    "type": "Фильм",
    "year": "2013",
    "rating": 7.8,
    "genres": [
      "Мелодрама",
      "Фантастика",
      "Драма"
    ],
    "description": "Романтическая история с фантастическим допущением о времени, любви и умении ценить обычные дни.",
    "trailerUrl": "",
    "imdbId": "tt2194499",
    "countries": [
      "Великобритания"
    ],
    "duration": "123 мин",
    "director": "Richard Curtis",
    "mood": "тёплая, светлая, романтичная",
    "themes": "время, семья, любовь, выбор"
  },
  {
    "id": 982064,
    "slug": "10-things-i-hate-about-you-1999",
    "title": "10 причин моей ненависти",
    "originalTitle": "10 Things I Hate About You",
    "searchTitles": [
      "10 причин моей ненависти",
      "10 things i hate about you",
      "10 причин моей ненависти 1999",
      "10 things i hate about you 1999"
    ],
    "type": "Фильм",
    "year": "1999",
    "rating": 7.3,
    "genres": [
      "Мелодрама",
      "Комедия",
      "Драма"
    ],
    "description": "Подростковая романтическая комедия о характерных героях, школьных правилах и чувствах, которые сложно спрятать.",
    "trailerUrl": "",
    "imdbId": "tt0147800",
    "countries": [
      "США"
    ],
    "duration": "97 мин",
    "director": "Gil Junger",
    "mood": "остроумная, лёгкая, школьная",
    "themes": "любовь, школа, характер, взросление"
  },
  {
    "id": 982065,
    "slug": "crazy-stupid-love-2011",
    "title": "Эта дурацкая любовь",
    "originalTitle": "Crazy, Stupid, Love.",
    "searchTitles": [
      "эта дурацкая любовь",
      "crazy, stupid, love.",
      "эта дурацкая любовь 2011",
      "crazy, stupid, love. 2011"
    ],
    "type": "Фильм",
    "year": "2011",
    "rating": 7.4,
    "genres": [
      "Мелодрама",
      "Комедия",
      "Драма"
    ],
    "description": "Романтическая комедия о людях разного возраста, которые пытаются заново понять любовь, уверенность и честность.",
    "trailerUrl": "",
    "imdbId": "tt1570728",
    "countries": [
      "США"
    ],
    "duration": "118 мин",
    "director": "Glenn Ficarra, John Requa",
    "mood": "лёгкая, взрослая, романтичная",
    "themes": "отношения, семья, вторые шансы, самоирония"
  },
  {
    "id": 982066,
    "slug": "the-handmaiden-2016",
    "title": "Служанка",
    "originalTitle": "The Handmaiden",
    "searchTitles": [
      "служанка",
      "the handmaiden",
      "служанка 2016",
      "the handmaiden 2016"
    ],
    "type": "Фильм",
    "year": "2016",
    "rating": 8.1,
    "genres": [
      "Триллер",
      "Драма",
      "Мелодрама"
    ],
    "description": "Изысканный психологический триллер о планах, притяжении и тайнах, где каждый слой истории меняет взгляд на героев.",
    "trailerUrl": "",
    "imdbId": "tt4016934",
    "countries": [
      "Корея Южная"
    ],
    "duration": "145 мин",
    "director": "Park Chan-wook",
    "mood": "изящная, напряжённая, чувственная",
    "themes": "обман, свобода, власть, тайна"
  },
  {
    "id": 982067,
    "slug": "burning-2018",
    "title": "Пылающий",
    "originalTitle": "Burning",
    "searchTitles": [
      "пылающий",
      "burning",
      "пылающий 2018",
      "burning 2018"
    ],
    "type": "Фильм",
    "year": "2018",
    "rating": 7.5,
    "genres": [
      "Драма",
      "Детектив",
      "Триллер"
    ],
    "description": "Медленная загадочная драма о встрече трёх людей, после которой обычная реальность начинает тревожно распадаться.",
    "trailerUrl": "",
    "imdbId": "tt7282468",
    "countries": [
      "Корея Южная",
      "Япония"
    ],
    "duration": "148 мин",
    "director": "Lee Chang-dong",
    "mood": "медленная, тревожная, загадочная",
    "themes": "ревность, пустота, тайна, одиночество"
  },
  {
    "id": 982068,
    "slug": "city-of-god-2002",
    "title": "Город Бога",
    "originalTitle": "City of God",
    "searchTitles": [
      "город бога",
      "city of god",
      "город бога 2002",
      "city of god 2002"
    ],
    "type": "Фильм",
    "year": "2002",
    "rating": 8.6,
    "genres": [
      "Криминал",
      "Драма"
    ],
    "description": "Энергичная криминальная драма о жизни района, где детство слишком быстро сталкивается с насилием и властью улиц.",
    "trailerUrl": "",
    "imdbId": "tt0317248",
    "countries": [
      "Бразилия",
      "Франция",
      "Германия"
    ],
    "duration": "130 мин",
    "director": "Fernando Meirelles, Kátia Lund",
    "mood": "живая, жёсткая, стремительная",
    "themes": "район, взросление, преступность, выживание"
  },
  {
    "id": 982069,
    "slug": "downfall-2004",
    "title": "Бункер",
    "originalTitle": "Downfall",
    "searchTitles": [
      "бункер",
      "downfall",
      "бункер 2004",
      "downfall 2004"
    ],
    "type": "Фильм",
    "year": "2004",
    "rating": 8.2,
    "genres": [
      "Драма",
      "Военный",
      "История"
    ],
    "description": "Историческая драма о последних днях режима, показанная через замкнутое пространство и нарастающее ощущение конца.",
    "trailerUrl": "",
    "imdbId": "tt0363163",
    "countries": [
      "Германия",
      "Австрия",
      "Италия"
    ],
    "duration": "156 мин",
    "director": "Oliver Hirschbiegel",
    "mood": "тяжёлая, историческая, камерная",
    "themes": "война, власть, крах, ответственность"
  },
  {
    "id": 982070,
    "slug": "another-round-2020",
    "title": "Ещё по одной",
    "originalTitle": "Another Round",
    "searchTitles": [
      "ещё по одной",
      "another round",
      "ещё по одной 2020",
      "another round 2020"
    ],
    "type": "Фильм",
    "year": "2020",
    "rating": 7.7,
    "genres": [
      "Драма",
      "Комедия"
    ],
    "description": "Драмеди о школьных учителях, которые решают провести рискованный эксперимент и неожиданно сталкиваются с собой.",
    "trailerUrl": "",
    "imdbId": "tt10288566",
    "countries": [
      "Дания",
      "Швеция",
      "Нидерланды"
    ],
    "duration": "117 мин",
    "director": "Thomas Vinterberg",
    "mood": "горькая, человечная, живая",
    "themes": "дружба, кризис, привычки, свобода"
  },
  {
    "id": 982071,
    "slug": "crouching-tiger-hidden-dragon-2000",
    "title": "Крадущийся тигр, затаившийся дракон",
    "originalTitle": "Crouching Tiger, Hidden Dragon",
    "searchTitles": [
      "крадущийся тигр, затаившийся дракон",
      "crouching tiger, hidden dragon",
      "крадущийся тигр, затаившийся дракон 2000",
      "crouching tiger, hidden dragon 2000"
    ],
    "type": "Фильм",
    "year": "2000",
    "rating": 7.9,
    "genres": [
      "Боевик",
      "Драма",
      "Фэнтези"
    ],
    "description": "Поэтичная приключенческая драма о воинах, тайных чувствах и легендарном мече, вокруг которого сходятся судьбы.",
    "trailerUrl": "",
    "imdbId": "tt0190332",
    "countries": [
      "Тайвань",
      "Гонконг",
      "США",
      "Китай"
    ],
    "duration": "120 мин",
    "director": "Ang Lee",
    "mood": "изящная, воздушная, меланхоличная",
    "themes": "честь, любовь, свобода, мастерство"
  },
  {
    "id": 982072,
    "slug": "hero-2002",
    "title": "Герой",
    "originalTitle": "Hero",
    "searchTitles": [
      "герой",
      "hero",
      "герой 2002",
      "hero 2002"
    ],
    "type": "Фильм",
    "year": "2002",
    "rating": 7.9,
    "genres": [
      "Боевик",
      "Драма",
      "История"
    ],
    "description": "Визуальная историческая притча о воинах, памяти и цене решения, которое может изменить судьбу страны.",
    "trailerUrl": "",
    "imdbId": "tt0299977",
    "countries": [
      "Китай",
      "Гонконг"
    ],
    "duration": "99 мин",
    "director": "Zhang Yimou",
    "mood": "красивая, притчевая, торжественная",
    "themes": "честь, власть, жертва, легенда"
  },
  {
    "id": 982073,
    "slug": "house-of-flying-daggers-2004",
    "title": "Дом летающих кинжалов",
    "originalTitle": "House of Flying Daggers",
    "searchTitles": [
      "дом летающих кинжалов",
      "house of flying daggers",
      "дом летающих кинжалов 2004",
      "house of flying daggers 2004"
    ],
    "type": "Фильм",
    "year": "2004",
    "rating": 7.5,
    "genres": [
      "Боевик",
      "Драма",
      "Мелодрама"
    ],
    "description": "Романтическая приключенческая драма о тайной организации, преследовании и чувствах, которым трудно доверять.",
    "trailerUrl": "",
    "imdbId": "tt0385004",
    "countries": [
      "Китай",
      "Гонконг"
    ],
    "duration": "119 мин",
    "director": "Zhang Yimou",
    "mood": "визуальная, романтичная, трагичная",
    "themes": "любовь, предательство, долг, красота"
  },
  {
    "id": 982074,
    "slug": "ip-man-2008",
    "title": "Ип Ман",
    "originalTitle": "Ip Man",
    "searchTitles": [
      "ип ман",
      "ip man",
      "ип ман 2008",
      "ip man 2008"
    ],
    "type": "Фильм",
    "year": "2008",
    "rating": 8.0,
    "genres": [
      "Боевик",
      "Биография",
      "Драма"
    ],
    "description": "Биографическая драма о мастере боевых искусств, который сохраняет достоинство и школу в тяжёлое время.",
    "trailerUrl": "",
    "imdbId": "tt1220719",
    "countries": [
      "Гонконг",
      "Китай"
    ],
    "duration": "106 мин",
    "director": "Wilson Yip",
    "mood": "сдержанная, боевитая, уважительная",
    "themes": "мастерство, честь, стойкость, семья"
  },
  {
    "id": 982075,
    "slug": "the-raid-redemption-2011",
    "title": "Рейд",
    "originalTitle": "The Raid: Redemption",
    "searchTitles": [
      "рейд",
      "the raid: redemption",
      "рейд 2011",
      "the raid: redemption 2011"
    ],
    "type": "Фильм",
    "year": "2011",
    "rating": 7.6,
    "genres": [
      "Боевик",
      "Триллер",
      "Криминал"
    ],
    "description": "Мощный боевик о спецотряде, который оказывается заперт в многоэтажке, полной вооружённых противников.",
    "trailerUrl": "",
    "imdbId": "tt1899353",
    "countries": [
      "Индонезия",
      "Франция",
      "США"
    ],
    "duration": "101 мин",
    "director": "Gareth Evans",
    "mood": "безостановочная, жёсткая, адреналиновая",
    "themes": "выживание, команда, бой, ловушка"
  },
  {
    "id": 982076,
    "slug": "ong-bak-2003",
    "title": "Онг Бак",
    "originalTitle": "Ong-Bak: The Thai Warrior",
    "searchTitles": [
      "онг бак",
      "ong-bak: the thai warrior",
      "онг бак 2003",
      "ong-bak: the thai warrior 2003"
    ],
    "type": "Фильм",
    "year": "2003",
    "rating": 7.1,
    "genres": [
      "Боевик",
      "Криминал",
      "Триллер"
    ],
    "description": "Тайский боевик о молодом бойце, который отправляется в город, чтобы вернуть святыню своей деревни.",
    "trailerUrl": "",
    "imdbId": "tt0368909",
    "countries": [
      "Таиланд"
    ],
    "duration": "105 мин",
    "director": "Prachya Pinkaew",
    "mood": "физическая, прямая, энергичная",
    "themes": "боевые искусства, честь, деревня, путь"
  },
  {
    "id": 982077,
    "slug": "the-man-from-nowhere-2010",
    "title": "Человек из ниоткуда",
    "originalTitle": "The Man from Nowhere",
    "searchTitles": [
      "человек из ниоткуда",
      "the man from nowhere",
      "человек из ниоткуда 2010",
      "the man from nowhere 2010"
    ],
    "type": "Фильм",
    "year": "2010",
    "rating": 7.7,
    "genres": [
      "Боевик",
      "Криминал",
      "Триллер"
    ],
    "description": "Криминальный боевик о молчаливом человеке с прошлым, который идёт на всё ради спасения девочки.",
    "trailerUrl": "",
    "imdbId": "tt1527788",
    "countries": [
      "Корея Южная"
    ],
    "duration": "119 мин",
    "director": "Lee Jeong-beom",
    "mood": "мрачная, быстрая, эмоциональная",
    "themes": "защита, прошлое, месть, риск"
  },
  {
    "id": 982078,
    "slug": "the-iron-giant-1999",
    "title": "Стальной гигант",
    "originalTitle": "The Iron Giant",
    "searchTitles": [
      "стальной гигант",
      "the iron giant",
      "стальной гигант 1999",
      "the iron giant 1999"
    ],
    "type": "Мультфильм",
    "year": "1999",
    "rating": 8.1,
    "genres": [
      "Мультфильм",
      "Фантастика",
      "Семейный"
    ],
    "description": "Тёплый анимационный фильм о мальчике и огромном роботе, который учится выбирать, кем ему быть.",
    "trailerUrl": "",
    "imdbId": "tt0129167",
    "countries": [
      "США"
    ],
    "duration": "86 мин",
    "director": "Brad Bird",
    "mood": "добрая, ретро, трогательная",
    "themes": "дружба, выбор, страх, человечность"
  },
  {
    "id": 982079,
    "slug": "the-prince-of-egypt-1998",
    "title": "Принц Египта",
    "originalTitle": "The Prince of Egypt",
    "searchTitles": [
      "принц египта",
      "the prince of egypt",
      "принц египта 1998",
      "the prince of egypt 1998"
    ],
    "type": "Мультфильм",
    "year": "1998",
    "rating": 7.2,
    "genres": [
      "Мультфильм",
      "Драма",
      "Приключения"
    ],
    "description": "Масштабный анимационный фильм о судьбе, братстве и пути человека, которому приходится принять тяжёлое предназначение.",
    "trailerUrl": "",
    "imdbId": "tt0120794",
    "countries": [
      "США"
    ],
    "duration": "99 мин",
    "director": "Brenda Chapman, Steve Hickner, Simon Wells",
    "mood": "эпическая, торжественная, семейная",
    "themes": "семья, вера, свобода, ответственность"
  },
  {
    "id": 982080,
    "slug": "fantastic-mr-fox-2009",
    "title": "Бесподобный мистер Фокс",
    "originalTitle": "Fantastic Mr. Fox",
    "searchTitles": [
      "бесподобный мистер фокс",
      "fantastic mr. fox",
      "бесподобный мистер фокс 2009",
      "fantastic mr. fox 2009"
    ],
    "type": "Мультфильм",
    "year": "2009",
    "rating": 7.9,
    "genres": [
      "Мультфильм",
      "Комедия",
      "Приключения"
    ],
    "description": "Стильная кукольная комедия о лисе, который никак не может отказаться от авантюр и втягивает семью в рискованный план.",
    "trailerUrl": "",
    "imdbId": "tt0432283",
    "countries": [
      "США"
    ],
    "duration": "87 мин",
    "director": "Wes Anderson",
    "mood": "сухо-ироничная, уютная, стильная",
    "themes": "семья, хитрость, свобода, характер"
  },
  {
    "id": 982081,
    "slug": "kubo-and-the-two-strings-2016",
    "title": "Кубо. Легенда о самурае",
    "originalTitle": "Kubo and the Two Strings",
    "searchTitles": [
      "кубо. легенда о самурае",
      "kubo and the two strings",
      "кубо. легенда о самурае 2016",
      "kubo and the two strings 2016"
    ],
    "type": "Мультфильм",
    "year": "2016",
    "rating": 7.7,
    "genres": [
      "Мультфильм",
      "Фэнтези",
      "Приключения"
    ],
    "description": "Анимационное фэнтези о мальчике, волшебной музыке и путешествии, где память становится силой.",
    "trailerUrl": "",
    "imdbId": "tt4302938",
    "countries": [
      "США"
    ],
    "duration": "102 мин",
    "director": "Travis Knight",
    "mood": "красивая, сказочная, трогательная",
    "themes": "семья, память, путь, магия"
  },
  {
    "id": 982082,
    "slug": "paranorman-2012",
    "title": "Паранорман, или Как приручить зомби",
    "originalTitle": "ParaNorman",
    "searchTitles": [
      "паранорман, или как приручить зомби",
      "paranorman",
      "паранорман, или как приручить зомби 2012",
      "paranorman 2012"
    ],
    "type": "Мультфильм",
    "year": "2012",
    "rating": 7.0,
    "genres": [
      "Мультфильм",
      "Фэнтези",
      "Комедия"
    ],
    "description": "Остроумный мультфильм о мальчике, который видит то, что другим недоступно, и должен спасти город от старого страха.",
    "trailerUrl": "",
    "imdbId": "tt1623288",
    "countries": [
      "США"
    ],
    "duration": "92 мин",
    "director": "Chris Butler, Sam Fell",
    "mood": "ироничная, готическая, добрая",
    "themes": "смелость, город, страх, принятие"
  },
  {
    "id": 982083,
    "slug": "chicken-run-2000",
    "title": "Побег из курятника",
    "originalTitle": "Chicken Run",
    "searchTitles": [
      "побег из курятника",
      "chicken run",
      "побег из курятника 2000",
      "chicken run 2000"
    ],
    "type": "Мультфильм",
    "year": "2000",
    "rating": 7.1,
    "genres": [
      "Мультфильм",
      "Комедия",
      "Приключения"
    ],
    "description": "Кукольная комедия о курицах, которые планируют большой побег с фермы и не собираются становиться ужином.",
    "trailerUrl": "",
    "imdbId": "tt0120630",
    "countries": [
      "Великобритания",
      "США"
    ],
    "duration": "84 мин",
    "director": "Peter Lord, Nick Park",
    "mood": "изобретательная, смешная, приключенческая",
    "themes": "побег, команда, свобода, находчивость"
  },
  {
    "id": 982084,
    "slug": "wallace-and-gromit-curse-of-the-were-rabbit-2005",
    "title": "Уоллес и Громит: Проклятие кролика-оборотня",
    "originalTitle": "Wallace & Gromit: The Curse of the Were-Rabbit",
    "searchTitles": [
      "уоллес и громит: проклятие кролика-оборотня",
      "wallace & gromit: the curse of the were-rabbit",
      "уоллес и громит: проклятие кролика-оборотня 2005",
      "wallace & gromit: the curse of the were-rabbit 2005"
    ],
    "type": "Мультфильм",
    "year": "2005",
    "rating": 7.5,
    "genres": [
      "Мультфильм",
      "Комедия",
      "Приключения"
    ],
    "description": "Кукольная комедия о паре изобретателей, которые пытаются защитить город от загадочного овощного бедствия.",
    "trailerUrl": "",
    "imdbId": "tt0312004",
    "countries": [
      "Великобритания",
      "США"
    ],
    "duration": "85 мин",
    "director": "Steve Box, Nick Park",
    "mood": "британская, смешная, уютная",
    "themes": "изобретения, дружба, город, тайна"
  },
  {
    "id": 982085,
    "slug": "the-secret-of-kells-2009",
    "title": "Тайна Келлс",
    "originalTitle": "The Secret of Kells",
    "searchTitles": [
      "тайна келлс",
      "the secret of kells",
      "тайна келлс 2009",
      "the secret of kells 2009"
    ],
    "type": "Мультфильм",
    "year": "2009",
    "rating": 7.5,
    "genres": [
      "Мультфильм",
      "Фэнтези",
      "Приключения"
    ],
    "description": "Визуально необычный мультфильм о мальчике, книге и мире за стенами аббатства, где легенда становится живой.",
    "trailerUrl": "",
    "imdbId": "tt0485601",
    "countries": [
      "Ирландия",
      "Франция",
      "Бельгия"
    ],
    "duration": "75 мин",
    "director": "Tomm Moore, Nora Twomey",
    "mood": "сказочная, рисованная, мягкая",
    "themes": "книги, воображение, смелость, легенда"
  },
  {
    "id": 982086,
    "slug": "mary-and-max-2009",
    "title": "Мэри и Макс",
    "originalTitle": "Mary and Max",
    "searchTitles": [
      "мэри и макс",
      "mary and max",
      "мэри и макс 2009",
      "mary and max 2009"
    ],
    "type": "Мультфильм",
    "year": "2009",
    "rating": 8.1,
    "genres": [
      "Мультфильм",
      "Драма",
      "Комедия"
    ],
    "description": "Трогательная пластилиновая история о переписке девочки и одинокого взрослого, которые находят друг в друге поддержку.",
    "trailerUrl": "",
    "imdbId": "tt0978762",
    "countries": [
      "Австралия"
    ],
    "duration": "92 мин",
    "director": "Adam Elliot",
    "mood": "грустная, человечная, тёплая",
    "themes": "дружба, одиночество, письма, принятие"
  },
  {
    "id": 982087,
    "slug": "the-reader-2008",
    "title": "Чтец",
    "originalTitle": "The Reader",
    "searchTitles": [
      "чтец",
      "the reader",
      "чтец 2008",
      "the reader 2008"
    ],
    "type": "Фильм",
    "year": "2008",
    "rating": 7.6,
    "genres": [
      "Драма",
      "Мелодрама"
    ],
    "description": "Драма о воспоминаниях, вине и связи, которая спустя годы получает болезненное историческое измерение.",
    "trailerUrl": "",
    "imdbId": "tt0976051",
    "countries": [
      "Германия",
      "США"
    ],
    "duration": "124 мин",
    "director": "Stephen Daldry",
    "mood": "сдержанная, драматичная, моральная",
    "themes": "память, вина, прошлое, взросление"
  },
  {
    "id": 982088,
    "slug": "atonement-2007",
    "title": "Искупление",
    "originalTitle": "Atonement",
    "searchTitles": [
      "искупление",
      "atonement",
      "искупление 2007",
      "atonement 2007"
    ],
    "type": "Фильм",
    "year": "2007",
    "rating": 7.8,
    "genres": [
      "Драма",
      "Мелодрама",
      "Военный"
    ],
    "description": "Драма о любви, ошибке и последствиях одного решения, которое меняет жизни нескольких людей.",
    "trailerUrl": "",
    "imdbId": "tt0783233",
    "countries": [
      "Великобритания",
      "Франция",
      "США"
    ],
    "duration": "123 мин",
    "director": "Joe Wright",
    "mood": "красивая, трагичная, романтическая",
    "themes": "любовь, вина, война, память"
  },
  {
    "id": 982089,
    "slug": "the-hours-2002",
    "title": "Часы",
    "originalTitle": "The Hours",
    "searchTitles": [
      "часы",
      "the hours",
      "часы 2002",
      "the hours 2002"
    ],
    "type": "Фильм",
    "year": "2002",
    "rating": 7.5,
    "genres": [
      "Драма",
      "Мелодрама"
    ],
    "description": "Тонкая драма о трёх женщинах в разные эпохи, чьи жизни связывает книга и внутреннее чувство несвободы.",
    "trailerUrl": "",
    "imdbId": "tt0274558",
    "countries": [
      "США",
      "Великобритания"
    ],
    "duration": "110 мин",
    "director": "Stephen Daldry",
    "mood": "меланхоличная, литературная, камерная",
    "themes": "время, выбор, одиночество, жизнь"
  },
  {
    "id": 982090,
    "slug": "billy-elliot-2000",
    "title": "Билли Эллиот",
    "originalTitle": "Billy Elliot",
    "searchTitles": [
      "билли эллиот",
      "billy elliot",
      "билли эллиот 2000",
      "billy elliot 2000"
    ],
    "type": "Фильм",
    "year": "2000",
    "rating": 7.7,
    "genres": [
      "Драма",
      "Комедия"
    ],
    "description": "Драма о мальчике из шахтёрского города, который выбирает танец вопреки ожиданиям семьи и окружения.",
    "trailerUrl": "",
    "imdbId": "tt0249462",
    "countries": [
      "Великобритания",
      "Франция"
    ],
    "duration": "110 мин",
    "director": "Stephen Daldry",
    "mood": "тёплая, упрямая, вдохновляющая",
    "themes": "мечта, семья, класс, смелость"
  },
  {
    "id": 982091,
    "slug": "finding-neverland-2004",
    "title": "Волшебная страна",
    "originalTitle": "Finding Neverland",
    "searchTitles": [
      "волшебная страна",
      "finding neverland",
      "волшебная страна 2004",
      "finding neverland 2004"
    ],
    "type": "Фильм",
    "year": "2004",
    "rating": 7.7,
    "genres": [
      "Драма",
      "Биография",
      "Семейный"
    ],
    "description": "Биографическая драма о писателе, дружбе и воображении, из которого рождается известная сказочная история.",
    "trailerUrl": "",
    "imdbId": "tt0308644",
    "countries": [
      "США",
      "Великобритания"
    ],
    "duration": "106 мин",
    "director": "Marc Forster",
    "mood": "нежная, литературная, грустная",
    "themes": "воображение, дружба, семья, творчество"
  },
  {
    "id": 982092,
    "slug": "the-queen-2006",
    "title": "Королева",
    "originalTitle": "The Queen",
    "searchTitles": [
      "королева",
      "the queen",
      "королева 2006",
      "the queen 2006"
    ],
    "type": "Фильм",
    "year": "2006",
    "rating": 7.3,
    "genres": [
      "Драма",
      "Биография"
    ],
    "description": "Сдержанная драма о периоде, когда личная скорбь, традиции и общественное ожидание сталкиваются особенно остро.",
    "trailerUrl": "",
    "imdbId": "tt0436697",
    "countries": [
      "Великобритания",
      "Франция",
      "Италия"
    ],
    "duration": "103 мин",
    "director": "Stephen Frears",
    "mood": "спокойная, политичная, наблюдательная",
    "themes": "долг, образ, традиции, кризис"
  },
  {
    "id": 982093,
    "slug": "doubt-2008",
    "title": "Сомнение",
    "originalTitle": "Doubt",
    "searchTitles": [
      "сомнение",
      "doubt",
      "сомнение 2008",
      "doubt 2008"
    ],
    "type": "Фильм",
    "year": "2008",
    "rating": 7.5,
    "genres": [
      "Драма",
      "Детектив"
    ],
    "description": "Камерная драма о подозрении, вере и конфликте людей, каждый из которых уверен в собственной правоте.",
    "trailerUrl": "",
    "imdbId": "tt0918927",
    "countries": [
      "США"
    ],
    "duration": "104 мин",
    "director": "John Patrick Shanley",
    "mood": "напряжённая, разговорная, моральная",
    "themes": "вера, власть, подозрение, правда"
  },
  {
    "id": 982094,
    "slug": "revolutionary-road-2008",
    "title": "Дорога перемен",
    "originalTitle": "Revolutionary Road",
    "searchTitles": [
      "дорога перемен",
      "revolutionary road",
      "дорога перемен 2008",
      "revolutionary road 2008"
    ],
    "type": "Фильм",
    "year": "2008",
    "rating": 7.3,
    "genres": [
      "Драма",
      "Мелодрама"
    ],
    "description": "Драма о паре, которая пытается вырваться из красивой, но тесной жизни и сталкивается с ценой несбывшихся надежд.",
    "trailerUrl": "",
    "imdbId": "tt0959337",
    "countries": [
      "США",
      "Великобритания"
    ],
    "duration": "119 мин",
    "director": "Sam Mendes",
    "mood": "тяжёлая, семейная, психологичная",
    "themes": "брак, мечта, разочарование, свобода"
  },
  {
    "id": 982095,
    "slug": "the-artist-2011",
    "title": "Артист",
    "originalTitle": "The Artist",
    "searchTitles": [
      "артист",
      "the artist",
      "артист 2011",
      "the artist 2011"
    ],
    "type": "Фильм",
    "year": "2011",
    "rating": 7.9,
    "genres": [
      "Драма",
      "Комедия",
      "Мелодрама"
    ],
    "description": "Чёрно-белая история о звезде немого кино, которая переживает приход новой эпохи и учится меняться.",
    "trailerUrl": "",
    "imdbId": "tt1655442",
    "countries": [
      "Франция",
      "Бельгия",
      "США"
    ],
    "duration": "100 мин",
    "director": "Michel Hazanavicius",
    "mood": "лёгкая, ностальгическая, элегантная",
    "themes": "кино, слава, перемены, любовь"
  },
  {
    "id": 982096,
    "slug": "hugo-2011",
    "title": "Хранитель времени",
    "originalTitle": "Hugo",
    "searchTitles": [
      "хранитель времени",
      "hugo",
      "хранитель времени 2011",
      "hugo 2011"
    ],
    "type": "Фильм",
    "year": "2011",
    "rating": 7.5,
    "genres": [
      "Драма",
      "Приключения",
      "Семейный"
    ],
    "description": "Семейное приключение о мальчике на вокзале, тайном механизме и любви к раннему кино.",
    "trailerUrl": "",
    "imdbId": "tt0970179",
    "countries": [
      "США",
      "Великобритания",
      "Франция"
    ],
    "duration": "126 мин",
    "director": "Martin Scorsese",
    "mood": "волшебная, кинематографичная, семейная",
    "themes": "кино, тайна, семья, изобретения"
  },
  {
    "id": 982097,
    "slug": "philomena-2013",
    "title": "Филомена",
    "originalTitle": "Philomena",
    "searchTitles": [
      "филомена",
      "philomena",
      "филомена 2013",
      "philomena 2013"
    ],
    "type": "Фильм",
    "year": "2013",
    "rating": 7.6,
    "genres": [
      "Драма",
      "Биография",
      "Комедия"
    ],
    "description": "Драма с мягкой иронией о женщине и журналисте, которые вместе ищут следы давней семейной истории.",
    "trailerUrl": "",
    "imdbId": "tt2431286",
    "countries": [
      "Великобритания",
      "США",
      "Франция"
    ],
    "duration": "98 мин",
    "director": "Stephen Frears",
    "mood": "человечная, спокойная, горько-смешная",
    "themes": "семья, память, прощение, поиск"
  },
  {
    "id": 982098,
    "slug": "spotlight-2015",
    "title": "В центре внимания",
    "originalTitle": "Spotlight",
    "searchTitles": [
      "в центре внимания",
      "spotlight",
      "в центре внимания 2015",
      "spotlight 2015"
    ],
    "type": "Фильм",
    "year": "2015",
    "rating": 8.1,
    "genres": [
      "Драма",
      "Биография",
      "Криминал"
    ],
    "description": "Журналистская драма о редакции, которая шаг за шагом раскрывает масштабную историю и цену молчания.",
    "trailerUrl": "",
    "imdbId": "tt1895587",
    "countries": [
      "США"
    ],
    "duration": "129 мин",
    "director": "Tom McCarthy",
    "mood": "собранная, серьёзная, расследовательская",
    "themes": "журналистика, правда, ответственность, команда"
  },
  {
    "id": 982099,
    "slug": "room-2015",
    "title": "Комната",
    "originalTitle": "Room",
    "searchTitles": [
      "комната",
      "room",
      "комната 2015",
      "room 2015"
    ],
    "type": "Фильм",
    "year": "2015",
    "rating": 8.1,
    "genres": [
      "Драма",
      "Триллер"
    ],
    "description": "Сильная драма о матери и ребёнке, которые пытаются выйти из замкнутого мира к нормальной жизни и новым страхам.",
    "trailerUrl": "",
    "imdbId": "tt3170832",
    "countries": [
      "Ирландия",
      "Канада",
      "Великобритания",
      "США"
    ],
    "duration": "118 мин",
    "director": "Lenny Abrahamson",
    "mood": "эмоциональная, камерная, надеждная",
    "themes": "материнство, свобода, травма, восстановление"
  }
];

function createManualHundredFacts(movie: ManualHundredMovieEntry): MovieFact[] {
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

function createManualHundredLongDescription(movie: ManualHundredMovieEntry) {
  const kind = movie.type === "Мультфильм" ? "мультфильм" : "фильм";
  const genres = movie.genres.join(", ").toLowerCase();
  const country = movie.countries?.join(", ") || "";

  return [
    `«${movie.title}» (${movie.year}) — ${kind} в жанрах ${genres}. ${movie.description}`,
    `На странице есть постер, жанры, рейтинг, расширенная информация, факты и трейлер, если он доступен через общий поиск сайта. Важные сведения не выдумываются: страна — ${country || "указана при наличии данных"}, длительность — ${movie.duration}, режиссёр — ${movie.director}.`,
    `По настроению это ${movie.mood} история. Темы карточки: ${movie.themes}. Такой текст помогает быстро понять атмосферу перед просмотром и делает блок «О фильме» живым, а не сухой табличкой для роботов.`,
  ].join("\n\n");
}

function createManualHundredPlayers(movie: ManualHundredMovieEntry): PlayerProvider[] {
  if (!movie.kinopoiskId) return [];

  const id = String(movie.kinopoiskId);

  return [
    {
      id: `collapse-kp-${id}`,
      name: "Основной",
      type: "collapse",
      provider: "collapse",
      embedUrl: `https://api.ortified.ws/embed/kp/${id}?sharing=false&episodesOpen=false`,
      contentKind: "kp",
      contentType: "kp",
      contentId: id,
    },
    {
      id: `factorios-${id}`,
      name: "Запасной 1",
      type: "iframe",
      provider: "factorios",
      embedUrl: `https://tarantino.factorios.live/show/kinopoisk/${id}`,
    },
  ];
}

export const manualHundredMovieAdditions: Movie[] = rawManualHundredMovieEntries.map((movie) => {
  const poster = getTmdbPoster({
    imdbId: movie.imdbId,
    title: movie.title,
    originalTitle: movie.originalTitle,
    year: movie.year,
    type: movie.type,
  });
  const players = createManualHundredPlayers(movie);

  return {
    ...movie,
    poster,
    posterFallbacks: [poster],
    facts: createManualHundredFacts(movie),
    longDescription: createManualHundredLongDescription(movie),
    players: players.length > 0 ? players : undefined,
    source: MANUAL_HUNDRED_SOURCE,
  };
});
