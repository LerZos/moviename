import type { CastMember, ContentType, Movie, MovieFaqItem, MovieFact, PlayerProvider } from "./movies";
import { getKinopoiskPoster, getTmdbPoster } from "../lib/imageLinks";

const REQUESTED_SERIES_SOURCE = "kinoluma-requested-animated-series-2026-07";

type RequestedSeriesEntry = {
  id: number;
  kinopoiskId: number;
  tmdbId: number;
  imdbId: string;
  slug: string;
  title: string;
  originalTitle: string;
  searchTitles: string[];
  type: ContentType;
  year: string;
  rating: number;
  genres: string[];
  countries: string[];
  duration: string;
  format: string;
  creators: string;
  seasons: string;
  episodes: string;
  mood: string;
  themes: string;
  description: string;
  longDescription: string;
  trailerUrl: string;
  cast: CastMember[];
};

const requestedSeries: RequestedSeriesEntry[] = [
  {
    id: 930101,
    kinopoiskId: 685246,
    tmdbId: 60625,
    imdbId: "tt2861424",
    slug: "rick-and-morty-2013",
    title: "Рик и Морти",
    originalTitle: "Rick and Morty",
    searchTitles: [
      "Рик и Морти",
      "Rick and Morty",
      "рик морти",
      "rick morty",
      "rick-and-morty-2013",
    ],
    type: "Мультфильм",
    year: "2013",
    rating: 8.9,
    genres: ["Мультфильм", "Комедия", "Фантастика", "Приключения"],
    countries: ["США"],
    duration: "около 23 мин / серия",
    format: "взрослый анимационный сериал",
    creators: "Дэн Хармон, Джастин Ройланд",
    seasons: "9",
    episodes: "91",
    mood: "безумная фантастика, чёрный юмор, мультивселенная",
    themes: "семья, цинизм, свобода выбора, последствия гениальности",
    description:
      "Гениальный Рик втягивает внука Морти в опасные путешествия по измерениям, где фантастика, семейный хаос и чёрная комедия постоянно сталкиваются друг с другом.",
    longDescription:
      "«Рик и Морти» — анимационный сериал 2013 года о гениальном, но разрушительном учёном Рике Санчезе и его внуке Морти. Истории начинаются как фантастические приключения по планетам, временным линиям и альтернативным реальностям, но часто возвращаются к семье, одиночеству и последствиям решений, которые герои пытаются обернуть в шутку.\n\nСериал держится на резком темпе, абсурдной научной фантастике и контрасте между космическим масштабом и бытовыми проблемами семьи Смитов. Его лучше открывать, когда хочется взрослой анимации с сатирой, неожиданными идеями и мрачным юмором.\n\nНа странице KinoLuma добавлены постер, трейлер, факты, актёры озвучки, FAQ и плееры. Карточка не подменяет факты рекламным текстом: основные данные сверены по TMDB и Kinopoisk, а описание написано специально для удобного выбора просмотра.",
    trailerUrl: "https://www.youtube.com/embed/POdJuFbF68A",
    cast: [
      { name: "Крис Парнелл", role: "Джерри Смит" },
      { name: "Спенсер Грэммер", role: "Саммер Смит" },
      { name: "Сара Чок", role: "Бет Смит" },
      { name: "Йен Кардони", role: "Рик Санчез" },
      { name: "Гарри Белден", role: "Морти Смит" },
    ],
  },
  {
    id: 930102,
    kinopoiskId: 449993,
    tmdbId: 1877,
    imdbId: "tt0852863",
    slug: "phineas-and-ferb-2007",
    title: "Финес и Ферб",
    originalTitle: "Phineas and Ferb",
    searchTitles: [
      "Финес и Ферб",
      "Phineas and Ferb",
      "финес ферб",
      "утконос перри",
      "phineas-and-ferb-2007",
    ],
    type: "Мультфильм",
    year: "2007",
    rating: 7.9,
    genres: ["Мультфильм", "Комедия", "Семейный", "Фантастика"],
    countries: ["США"],
    duration: "около 22 мин / серия",
    format: "семейный анимационный сериал",
    creators: "Дэн Повенмайр, Джефф «Свомпи» Марш",
    seasons: "5",
    episodes: "261",
    mood: "летние каникулы, изобретения, музыка и лёгкий абсурд",
    themes: "воображение, братство, тайная жизнь питомца, весёлые планы",
    description:
      "Финес и Ферб каждый день превращают летние каникулы в грандиозный проект, пока Кэндес пытается их разоблачить, а утконос Перри ведёт собственную шпионскую миссию.",
    longDescription:
      "«Финес и Ферб» — семейный анимационный сериал 2007 года о двух сводных братьях, которые не умеют скучать на каникулах. Каждый день они строят аттракционы, машины, сцены и невероятные устройства, а их сестра Кэндес пытается доказать взрослым, что всё это действительно происходит.\n\nПараллельно домашний утконос Перри оказывается секретным агентом и срывает планы доктора Хайнца Фуфелшмертца. Благодаря этой двойной структуре сериал работает и как детская комедия про изобретательность, и как пародия на шпионские истории с песнями, быстрыми шутками и узнаваемым летним настроением.\n\nНа KinoLuma карточка оформлена как полноценная страница: есть постер, трейлер, факты, актёры озвучки, FAQ и два варианта плеера. Описание написано вручную на основе проверенных данных TMDB и Kinopoisk.",
    trailerUrl: "https://www.youtube.com/embed/th9hxCGH_ms",
    cast: [
      { name: "Винсент Мартелла", role: "Финес Флинн" },
      { name: "Дэвид Эрриго мл.", role: "Ферб Флетчер" },
      { name: "Эшли Тисдейл", role: "Кэндес Флинн" },
      { name: "Ди Брэдли Бейкер", role: "Перри-утконос" },
      { name: "Дэн Повенмайр", role: "доктор Фуфелшмертц" },
      { name: "Элисон Стоунер", role: "Изабелла" },
    ],
  },
  {
    id: 930103,
    kinopoiskId: 77164,
    tmdbId: 456,
    imdbId: "tt0096697",
    slug: "the-simpsons-1989",
    title: "Симпсоны",
    originalTitle: "The Simpsons",
    searchTitles: [
      "Симпсоны",
      "The Simpsons",
      "simpsons",
      "гомер симпсон",
      "the-simpsons-1989",
    ],
    type: "Мультфильм",
    year: "1989",
    rating: 8.4,
    genres: ["Мультфильм", "Комедия", "Семейный", "Сатира"],
    countries: ["США"],
    duration: "около 22 мин / серия",
    format: "анимационный ситком",
    creators: "Мэтт Грейнинг",
    seasons: "37",
    episodes: "801",
    mood: "сатира, семейный хаос, Спрингфилд и поп-культура",
    themes: "семья, общество, телевидение, американская повседневность",
    description:
      "Гомер, Мардж, Барт, Лиза и Мэгги живут в Спрингфилде, где обычная семейная жизнь превращается в сатиру на работу, школу, телевидение и современное общество.",
    longDescription:
      "«Симпсоны» — анимационный ситком 1989 года и один из самых узнаваемых сериалов в истории телевидения. В центре — семья из Спрингфилда: Гомер, Мардж, Барт, Лиза и Мэгги. Через их дом, школу, работу и соседей сериал высмеивает привычки общества, медиа, политику, поп-культуру и бытовые странности.\n\nСила «Симпсонов» в том, что за яркой комедией скрывается почти энциклопедия американской повседневности. Серии могут быть семейными, абсурдными, музыкальными, пародийными или неожиданно трогательными, но почти всегда держатся на узнаваемых характерах и городе, который живёт как отдельная вселенная.\n\nНа KinoLuma страница оформлена с постером, трейлером, фактами, FAQ и плеерами. Данные по году, ID, рейтингу и составу сверены через TMDB и Kinopoisk, а описание написано отдельно, чтобы карточка выглядела аккуратно и не была сухой копией базы.",
    trailerUrl: "https://www.youtube.com/embed/_jgYEYERYFQ",
    cast: [
      { name: "Дэн Кастелланета", role: "Гомер Симпсон" },
      { name: "Джулия Кавнер", role: "Мардж Симпсон" },
      { name: "Нэнси Картрайт", role: "Барт Симпсон" },
      { name: "Ярдли Смит", role: "Лиза Симпсон" },
      { name: "Хэнк Азариа", role: "голоса жителей Спрингфилда" },
      { name: "Гарри Ширер", role: "голоса жителей Спрингфилда" },
    ],
  },
];

function buildPoster(movie: RequestedSeriesEntry) {
  return getKinopoiskPoster({
    kinopoiskId: movie.kinopoiskId,
    fallback: getTmdbPoster({
      tmdbId: movie.tmdbId,
      imdbId: movie.imdbId,
      title: movie.title,
      originalTitle: movie.originalTitle,
      year: movie.year,
      type: movie.type,
    }),
  });
}

function buildPlayers(movie: RequestedSeriesEntry): PlayerProvider[] {
  const kinopoiskId = String(movie.kinopoiskId);

  return [
    {
      id: `collapse-kp-${kinopoiskId}`,
      name: "Основной",
      type: "collapse",
      provider: "collapse",
      embedUrl: `https://api.ortified.ws/embed/kp/${kinopoiskId}?sharing=false&episodesOpen=false`,
      contentKind: "kp",
      contentType: "kp",
      contentId: kinopoiskId,
    },
    {
      id: `factorios-${kinopoiskId}`,
      name: "Запасной 1",
      type: "iframe",
      provider: "factorios",
      embedUrl: `https://tarantino.factorios.live/show/kinopoisk/${kinopoiskId}`,
    },
  ];
}

function buildFacts(movie: RequestedSeriesEntry): MovieFact[] {
  return [
    { label: "Год", value: movie.year },
    { label: "Тип", value: movie.type },
    { label: "Формат", value: movie.format },
    { label: "Страна", value: movie.countries.join(", ") },
    { label: "Длительность", value: movie.duration },
    { label: "Создатели", value: movie.creators },
    { label: "Сезонов", value: movie.seasons },
    { label: "Эпизодов", value: movie.episodes },
    { label: "Настроение", value: movie.mood },
    { label: "Темы", value: movie.themes },
  ];
}

function buildFaq(movie: RequestedSeriesEntry): MovieFaqItem[] {
  return [
    {
      question: `О чём ${movie.title}?`,
      answer: movie.description,
    },
    {
      question: `${movie.title} подойдёт для семейного просмотра?`,
      answer:
        movie.slug === "rick-and-morty-2013"
          ? "Сериал рассчитан на взрослую аудиторию: в нём много чёрного юмора, грубой сатиры и фантастического абсурда."
          : "Да, это семейная анимация, но отдельные шутки и культурные отсылки могут быть интереснее подросткам и взрослым.",
    },
    {
      question: `Есть ли на KinoLuma трейлер и плееры для ${movie.title}?`,
      answer:
        "Да, в карточку добавлены трейлер, основной плеер и запасной вариант просмотра, если провайдеры доступны.",
    },
  ];
}

export const manualRequestedSeriesAdditions: Movie[] = requestedSeries.map((movie) => ({
  id: movie.id,
  kinopoiskId: movie.kinopoiskId,
  tmdbId: movie.tmdbId,
  imdbId: movie.imdbId,
  slug: movie.slug,
  title: movie.title,
  originalTitle: movie.originalTitle,
  searchTitles: movie.searchTitles,
  type: movie.type,
  year: movie.year,
  rating: movie.rating,
  genres: movie.genres,
  countries: movie.countries,
  poster: buildPoster(movie),
  description: movie.description,
  trailerUrl: movie.trailerUrl,
  source: REQUESTED_SERIES_SOURCE,
  seoTitle: `${movie.title} (${movie.year}) смотреть онлайн мультсериал KinoLuma`,
  seoDescription: `${movie.title} (${movie.year}) — ${movie.genres.join(", ").toLowerCase()}: постер, трейлер, описание, факты, FAQ и плееры на KinoLuma.`,
  longDescription: movie.longDescription,
  facts: buildFacts(movie),
  faq: buildFaq(movie),
  cast: movie.cast,
  players: buildPlayers(movie),
}));
