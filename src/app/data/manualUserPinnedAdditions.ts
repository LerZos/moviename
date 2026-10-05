import type { ContentType, Movie, MovieFact, PlayerProvider } from "./movies";

const SOURCE = "kinoluma-user-pinned-2026-08";

type PinnedEntry = {
  id: number;
  slug: string;
  title: string;
  originalTitle: string;
  searchTitles: string[];
  type: ContentType;
  year: string;
  rating: number;
  genres: string[];
  countries: string[];
  poster: string;
  backdrop?: string;
  description: string;
  longDescription: string;
  trailerUrl: string;
  tmdbId?: number;
  kinopoiskId?: number;
  imdbId: string;
  facts: MovieFact[];
  cast: { name: string; role: string }[];
};

function createPlayers(entry: PinnedEntry): PlayerProvider[] {
  const kind = entry.kinopoiskId ? "kp" : "imdb";
  const id = String(entry.kinopoiskId || entry.imdbId);

  return [
    {
      id: `collapse-${kind}-${id}`,
      name: "Основной",
      type: "collapse",
      provider: "collapse",
      embedUrl: `https://api.ortified.ws/embed/${kind}/${id}?sharing=false&episodesOpen=false`,
      contentKind: kind,
      contentType: kind,
      contentId: id,
    },
  ];
}

function faqFor(entry: PinnedEntry) {
  return [
    {
      question: `О чем ${entry.title}?`,
      answer: entry.description,
    },
    {
      question: `Есть ли на KinoLuma плеер для ${entry.title}?`,
      answer:
        "Да, карточка подключена к основному плееру по проверенному ID. Если провайдер временно не отдаст видео, страница все равно останется оформленной и готовой к просмотру.",
    },
  ];
}

const pinnedEntries: PinnedEntry[] = [
  {
    id: 940101,
    slug: "rik-i-morti-2013",
    title: "Рик и Морти",
    originalTitle: "Rick and Morty",
    searchTitles: ["Рик и Морти", "Rick and Morty", "рик морти", "rick morty", "rik-i-morti-2013"],
    type: "Мультфильм",
    year: "2013",
    rating: 8.9,
    genres: ["Мультфильм", "Комедия", "Фантастика", "Приключения"],
    countries: ["США"],
    poster: "https://image.tmdb.org/t/p/w500/5qfd0e2uMbVInX3YdeFbDsfxi1t.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/yYNa1nqvNK94xZz3eKyfvZdAvPi.jpg",
    description:
      "Гениальный и совершенно невыносимый Рик втягивает внука Морти в опасные путешествия по измерениям, где научная фантастика постоянно сталкивается с семейным хаосом.",
    longDescription:
      "«Рик и Морти» держится на безумных идеях, черном юморе и резком контрасте между космическими приключениями и обычной семейной жизнью. В центре истории Рик Санчез, ученый с почти безграничными возможностями, и Морти, который чаще всего просто пытается выжить рядом с ним.\n\nНа KinoLuma карточка закреплена вручную: постер больше не берется из случайной выдачи и не должен меняться между поиском, подсказками и страницей.",
    trailerUrl: "https://www.youtube.com/embed/POdJuFbF68A",
    tmdbId: 60625,
    kinopoiskId: 685246,
    imdbId: "tt2861424",
    facts: [
      { label: "Формат", value: "анимационный сериал для взрослых" },
      { label: "Длительность", value: "около 23 мин / серия" },
      { label: "Создатели", value: "Дэн Хармон, Джастин Ройланд" },
      { label: "Сезонов", value: "9" },
      { label: "Темы", value: "мультивселенная, семья, цинизм, последствия выбора" },
    ],
    cast: [
      { name: "Крис Парнелл", role: "Джерри Смит" },
      { name: "Спенсер Грэммер", role: "Саммер Смит" },
      { name: "Сара Чок", role: "Бет Смит" },
      { name: "Йен Кардони", role: "Рик Санчез" },
      { name: "Гарри Белден", role: "Морти Смит" },
    ],
  },
  {
    id: 940102,
    slug: "steins-gate",
    title: "Врата Штейна",
    originalTitle: "Steins;Gate",
    searchTitles: ["Врата Штейна", "Steins;Gate", "Steins Gate", "штейнс гейт", "steins-gate"],
    type: "Аниме",
    year: "2011",
    rating: 8.8,
    genres: ["Аниме", "Фантастика", "Триллер", "Драма"],
    countries: ["Япония"],
    poster: "https://image.tmdb.org/t/p/w500/5zxePQEsUKLYDh2kpXGQAeInjUU.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/6S6UXZV6GGEvowHF5qTzbTOY9Yf.jpg",
    description:
      "Фантастический триллер о друзьях, которые случайно находят способ менять прошлое и быстро понимают, что любопытство может стоить слишком дорого.",
    longDescription:
      "«Врата Штейна» начинается почти как странная комедия про самодельные эксперименты, но постепенно превращается в напряженную драму о времени, выборе и цене попыток исправить прошлое.\n\nПостер закреплен вручную, чтобы страница и быстрый поиск показывали одну и ту же аккуратную обложку.",
    trailerUrl: "https://www.youtube.com/embed/uMYhjVwp0Fk",
    tmdbId: 42509,
    imdbId: "tt1910272",
    facts: [
      { label: "Формат", value: "аниме-сериал" },
      { label: "Длительность", value: "около 24 мин / серия" },
      { label: "Студия", value: "White Fox" },
      { label: "Создатели", value: "5pb., Nitroplus" },
      { label: "Темы", value: "время, выбор, последствия, дружба" },
    ],
    cast: [
      { name: "Ринтаро Окабэ", role: "самопровозглашенный ученый" },
      { name: "Курису Макисэ", role: "исследовательница" },
      { name: "Маюри Сиина", role: "подруга лаборатории" },
      { name: "Итару Хасида", role: "хакер" },
    ],
  },
  {
    id: 940103,
    slug: "family-guy-1999",
    title: "Гриффины",
    originalTitle: "Family Guy",
    searchTitles: ["Гриффины", "Family Guy", "Питер Гриффин", "Стьюи Гриффин", "Брайан Гриффин", "family-guy-1999"],
    type: "Мультфильм",
    year: "1999",
    rating: 7.7,
    genres: ["Мультфильм", "Комедия", "Сатира", "Для взрослых"],
    countries: ["США"],
    poster: "https://image.tmdb.org/t/p/w500/gSseviIbjMhlHZkFvPhxFAbdJOn.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/9zcbqSxdsRMZWHYtyCd1nXPr2xq.jpg",
    description:
      "Абсурдный мультсериал о семье Гриффинов из Куахога, где бытовая жизнь превращается в поток пародий, сатиры и внезапных шуток.",
    longDescription:
      "«Гриффины» строятся вокруг Питера, Лоис, их детей и говорящего пса Брайана. Сериал легко перескакивает от семейных конфликтов к поп-культурным пародиям, черному юмору и нарочно нелепым вставкам.\n\nНа KinoLuma карточка оформлена как взрослый анимационный ситком: с прямым постером, трейлером, актерами озвучки, фактами и плеером.",
    trailerUrl: "https://www.youtube.com/embed/7hRxWGo49oc",
    tmdbId: 1434,
    kinopoiskId: 161101,
    imdbId: "tt0182576",
    facts: [
      { label: "Формат", value: "анимационный ситком для взрослых" },
      { label: "Длительность", value: "около 22 мин / серия" },
      { label: "Создатель", value: "Сет Макфарлейн" },
      { label: "Страна", value: "США" },
      { label: "Темы", value: "семья, поп-культура, пародия, американская повседневность" },
    ],
    cast: [
      { name: "Сет Макфарлейн", role: "Питер / Стьюи / Брайан" },
      { name: "Алекс Борштейн", role: "Лоис Гриффин" },
      { name: "Сет Грин", role: "Крис Гриффин" },
      { name: "Мила Кунис", role: "Мег Гриффин" },
      { name: "Майк Генри", role: "Кливленд Браун" },
      { name: "Патрик Уорбертон", role: "Джо Суонсон" },
    ],
  },
  {
    id: 940104,
    slug: "oregairu-2013",
    title: "Розовая пора моей школьной жизни сплошной обман",
    originalTitle: "My Teen Romantic Comedy SNAFU",
    searchTitles: ["Oregairu", "Орегаиру", "Розовая пора моей школьной жизни", "My Teen Romantic Comedy SNAFU", "Yahari Ore no Seishun Love Comedy wa Machigatteiru", "oregairu-2013"],
    type: "Аниме",
    year: "2013",
    rating: 7.9,
    genres: ["Аниме", "Романтика", "Комедия", "Драма", "Школа"],
    countries: ["Япония"],
    poster: "https://image.tmdb.org/t/p/w500/b1bFaxgZuuoGTglODi30J7stkgM.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/bGXQO9vBZuDnYcIGciIZfaYJg1g.jpg",
    description:
      "Циничный одиночка Хатиман попадает в школьный клуб помощи и вместе с Юкино и Юи разбирается не только с чужими проблемами, но и со своими чувствами.",
    longDescription:
      "Oregairu выглядит как школьная романтическая комедия, но быстро становится историей про одиночество, самообман и то, как трудно говорить честно даже с близкими людьми. Хатиман Хикигая привык защищаться сарказмом, Юкино держится холодной логики, а Юи пытается сохранить тепло между всеми.\n\nКарточка оформлена для KinoLuma с прямым постером, кратким SEO-описанием, актерами, фактами и подключенным плеером по IMDb ID.",
    trailerUrl: "https://www.youtube.com/embed/u-bpwWPNEpE",
    tmdbId: 65676,
    imdbId: "tt2703720",
    facts: [
      { label: "Формат", value: "аниме-сериал" },
      { label: "Длительность", value: "около 24 мин / серия" },
      { label: "Студия", value: "Brain's Base, feel." },
      { label: "Создатель", value: "Ватару Ватари" },
      { label: "Темы", value: "школа, одиночество, дружба, взросление, чувства" },
    ],
    cast: [
      { name: "Хатиман Хикигая", role: "циничный участник клуба помощи" },
      { name: "Юкино Юкиносита", role: "глава клуба помощи" },
      { name: "Юи Юигахама", role: "эмоциональный центр компании" },
      { name: "Сидзука Хирацука", role: "учительница" },
    ],
  },
  {
    id: 940105,
    slug: "moriarty-the-patriot-2020",
    title: "Патриотизм Мориарти",
    originalTitle: "Moriarty the Patriot",
    searchTitles: ["Moriarty the Patriot", "Патриотизм Мориарти", "Юкоку но Мориарти", "Yuukoku no Moriarty", "moriarty-the-patriot-2020"],
    type: "Аниме",
    year: "2020",
    rating: 8.0,
    genres: ["Аниме", "Детектив", "Триллер", "История"],
    countries: ["Япония"],
    poster: "https://image.tmdb.org/t/p/w500/49ya1Rg4dqYSC83OF6DkPUt4JZr.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/wL9S8MtHDM3F2aSxdRkuS50fT2n.jpg",
    description:
      "Уильям Джеймс Мориарти объявляет войну жестокой социальной системе викторианской Британии и становится криминальным консультантом ради нового мира.",
    longDescription:
      "«Патриотизм Мориарти» переосмысляет миф о противнике Шерлока Холмса и ставит в центр не злодея ради злодейства, а человека с холодным планом и болезненным чувством справедливости. Здесь детективная интрига смешивается с исторической драмой, классовым конфликтом и дуэлью интеллектов.\n\nКарточка добавлена с прямым TMDB-постером, фактами, основными героями и плеером.",
    trailerUrl: "https://www.youtube.com/embed/4REhyrzmEkk",
    tmdbId: 100281,
    imdbId: "tt12831098",
    facts: [
      { label: "Формат", value: "аниме-сериал" },
      { label: "Длительность", value: "около 24 мин / серия" },
      { label: "Студия", value: "Production I.G" },
      { label: "Режиссер", value: "Кадзуя Номура" },
      { label: "Темы", value: "справедливость, классы, преступление, Шерлок Холмс" },
    ],
    cast: [
      { name: "Уильям Джеймс Мориарти", role: "криминальный консультант" },
      { name: "Луис Джеймс Мориарти", role: "младший брат" },
      { name: "Альберт Джеймс Мориарти", role: "старший брат" },
      { name: "Шерлок Холмс", role: "детектив" },
      { name: "Себастьян Моран", role: "союзник Мориарти" },
    ],
  },
  {
    id: 940106,
    slug: "tomodachi-game-2022",
    title: "Игра друзей",
    originalTitle: "Tomodachi Game",
    searchTitles: ["Игра друзей", "Tomodachi Game", "Томодати гейм", "Томодачи гейм", "tomodachi-game-2022"],
    type: "Аниме",
    year: "2022",
    rating: 7.5,
    genres: ["Аниме", "Триллер", "Психология", "Игра"],
    countries: ["Япония"],
    poster: "https://image.tmdb.org/t/p/w500/zaTE4e9vJwHVaXHebK3eN11TtnK.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/gShG3bfgmtacqd1D8W7XHnCx2Ed.jpg",
    description:
      "Группа школьных друзей оказывается в долговой игре, где каждое испытание проверяет, что сильнее: доверие, страх или желание спасти себя.",
    longDescription:
      "«Игра друзей» берет простую идею доверия между близкими людьми и превращает ее в нервный психологический триллер. Чем дальше герои проходят испытания, тем сильнее становится вопрос: действительно ли они знают друг друга.\n\nКарточка оформлена с прямым постером, трейлером, фактами, героями и плеером по IMDb ID.",
    trailerUrl: "https://www.youtube.com/embed/_G9PXylkC2s",
    tmdbId: 137718,
    imdbId: "tt15830678",
    facts: [
      { label: "Формат", value: "аниме-сериал" },
      { label: "Длительность", value: "около 23 мин / серия" },
      { label: "Студия", value: "Okuruto Noboru" },
      { label: "Автор", value: "Микото Ямагути, Юки Сато" },
      { label: "Темы", value: "доверие, долг, предательство, психологические игры" },
    ],
    cast: [
      { name: "Юити Катагири", role: "главный участник игры" },
      { name: "Сихо Савараги", role: "подруга Юити" },
      { name: "Тэнти Микаса", role: "друг из группы" },
      { name: "Макото Сибэ", role: "участник игры" },
      { name: "Ютори Кокороги", role: "участница игры" },
    ],
  },
  {
    id: 940107,
    slug: "squid-game-2021",
    title: "Игра в кальмара",
    originalTitle: "Squid Game",
    searchTitles: ["Игра в кальмара", "Squid Game", "кальмар", "игра кальмара", "squid-game-2021"],
    type: "Сериал",
    year: "2021",
    rating: 8.0,
    genres: ["Сериал", "Триллер", "Драма", "Выживание"],
    countries: ["Южная Корея"],
    poster: "https://image.tmdb.org/t/p/w500/1QdXdRYfktUSONkl1oD5gc6Be0s.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/oaGvjB0DvdhXhOAuADfHb261ZHa.jpg",
    description:
      "Люди с огромными долгами соглашаются участвовать в детских играх за гигантский приз, но проигрыш здесь означает смерть.",
    longDescription:
      "«Игра в кальмара» соединяет социальную драму, жесткий триллер на выживание и простые игры, которые становятся кошмаром. Сериал держит напряжение за счет понятных правил, яркой визуальной формы и героев, которым действительно нечего терять.\n\nНа KinoLuma карточка добавлена с прямым постером, трейлером, фактами, актерами и плеером.",
    trailerUrl: "https://www.youtube.com/embed/oqxAJKy0ii4",
    tmdbId: 93405,
    kinopoiskId: 1301710,
    imdbId: "tt10919420",
    facts: [
      { label: "Формат", value: "сериал" },
      { label: "Длительность", value: "около 55 мин / серия" },
      { label: "Создатель", value: "Хван Дон-хек" },
      { label: "Студия", value: "Netflix" },
      { label: "Темы", value: "долги, выживание, неравенство, моральный выбор" },
    ],
    cast: [
      { name: "Ли Джон-джэ", role: "Сон Ги-хун" },
      { name: "Пак Хэ-су", role: "Чо Сан-у" },
      { name: "Чон Хо-ён", role: "Кан Сэ-бёк" },
      { name: "О Ён-су", role: "О Иль-нам" },
      { name: "Ви Ха-джун", role: "Хван Джун-хо" },
    ],
  },
  {
    id: 940108,
    slug: "the-boondocks-2005",
    title: "Гетто",
    originalTitle: "The Boondocks",
    searchTitles: ["Гетто", "The Boondocks", "Бундокс", "Boondocks", "Хьюи Фримен", "Райли Фримен", "the-boondocks-2005"],
    type: "Мультфильм",
    year: "2005",
    rating: 7.9,
    genres: ["Мультфильм", "Комедия", "Сатира", "Драма", "Боевик"],
    countries: ["США", "Южная Корея"],
    poster: "https://image.tmdb.org/t/p/w500/xaEYTpi4vOJLVbqZd6ZZjk4G0uK.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/qxxF0gO63tQ4JHCC2uRrnlkcH3f.jpg",
    description:
      "Семья Фрименов переезжает из южного Чикаго в спокойный белый пригород, где Хьюи и Райли быстро превращают новую жизнь в жесткую сатиру на Америку, рэп-культуру и расовые стереотипы.",
    longDescription:
      "«Гетто» — взрослый анимационный сериал Аарона МакГрудера о Хьюи и Райли Фрименах, которые вместе с дедушкой Робертом переезжают в пригород Вудкрест. Снаружи это история про семейку в новом районе, но внутри — едкая политическая и социальная сатира с боевыми сценами, рэп-культурой и очень резким юмором.\n\nКарточка добавлена вручную: закреплен прямой постер, указаны Kinopoisk, IMDb и TMDB ID, главные роли, факты и основной плеер.",
    trailerUrl: "https://www.youtube.com/embed/zVBCaVn0o5E",
    tmdbId: 2604,
    kinopoiskId: 401157,
    imdbId: "tt0373732",
    facts: [
      { label: "Формат", value: "анимационный сериал для взрослых" },
      { label: "Длительность", value: "около 22 мин / серия" },
      { label: "Создатель", value: "Аарон МакГрудер" },
      { label: "Сезонов", value: "4" },
      { label: "Эпизодов", value: "55" },
      { label: "Темы", value: "сатира, расовые стереотипы, хип-хоп, политика, пригород" },
    ],
    cast: [
      { name: "Реджина Кинг", role: "Хьюи Фримен / Райли Фримен" },
      { name: "Джон Уизерспун", role: "Роберт Фримен" },
      { name: "Гари Энтони Уильямс", role: "Дядя Рукус" },
      { name: "Седрик Ярбро", role: "Том Дюбуа" },
      { name: "Джилл Тэлли", role: "Сара Дюбуа" },
      { name: "Гэбби Солейл", role: "Джазмин Дюбуа" },
    ],
  },
  {
    id: 940109,
    slug: "lesbian-space-princess-2025",
    title: "Космическая принцесса-лесбиянка",
    originalTitle: "Lesbian Space Princess",
    searchTitles: [
      "Космическая принцесса-лесбиянка",
      "Космическая принцесса лесбиянка",
      "Lesbian Space Princess",
      "Лесбийская космическая принцесса",
      "Princess Saira",
      "Saira",
      "lesbian-space-princess-2025",
    ],
    type: "Мультфильм",
    year: "2025",
    rating: 6.0,
    genres: ["Мультфильм", "Комедия", "Фантастика", "Фэнтези", "Романтика"],
    countries: ["Австралия"],
    poster:
      "/api/tmdb/poster?tmdbId=1333141&imdbId=tt29781139&title=Космическая+принцесса-лесбиянка&originalTitle=Lesbian+Space+Princess&year=2025&type=Мультфильм&quality=high&v=lsp-1",
    backdrop:
      "/api/tmdb/backdrop?tmdbId=1333141&imdbId=tt29781139&title=Космическая+принцесса-лесбиянка&originalTitle=Lesbian+Space+Princess&year=2025&type=Мультфильм&v=lsp-1",
    description:
      "Интровертная принцесса Сайра отправляется в яркое космическое путешествие, чтобы спасти бывшую девушку-охотницу за головами от Straight White Maliens.",
    longDescription:
      "«Космическая принцесса-лесбиянка» — австралийская взрослая анимационная комедия о Сайре, застенчивой принцессе из далекой квир-галактики. После расставания с Кики она получает шанс доказать себе, что способна на большее: бывшую похищают Straight White Maliens, а для спасения нужна королевская лабрис — оружие, которое появляется только через уверенность в себе.\n\nФильм смешивает космическую фантастику, романтическую комедию, фэнтези и дерзкий фестивальный юмор. В карточке закреплены IMDb и TMDb ID, трейлер, главные роли, факты и основной плеер, чтобы мультфильм нормально находился в поиске KinoLuma и попадал в sitemap.",
    trailerUrl: "https://www.youtube.com/embed/Fqp2DgQCm9Y",
    tmdbId: 1333141,
    imdbId: "tt29781139",
    facts: [
      { label: "Формат", value: "полнометражный анимационный фильм для взрослых" },
      { label: "Длительность", value: "87 мин" },
      { label: "Режиссеры", value: "Эмма Хаф Хоббс, Лила Варгезе" },
      { label: "Сценарий", value: "Эмма Хаф Хоббс, Лила Варгезе" },
      { label: "Студия", value: "We Made A Thing Studios" },
      { label: "Темы", value: "самопринятие, квир-фантастика, космическое приключение, расставание, уверенность" },
    ],
    cast: [
      { name: "Шабана Азиз", role: "принцесса Сайра" },
      { name: "Берни Ван Тил", role: "Кики Разрушительница" },
      { name: "Джемма Чуа-Тран", role: "Уиллоу" },
      { name: "Ричард Роксбург", role: "Корабль" },
      { name: "Квин Конг", role: "Блейд" },
      { name: "Марк Самуал Бонанно", role: "лидер Maliens" },
    ],
  },
  {
    id: 940110,
    slug: "the-mentalist-2008",
    title: "Менталист",
    originalTitle: "The Mentalist",
    searchTitles: [
      "Менталист",
      "The Mentalist",
      "Патрик Джейн",
      "Patrick Jane",
      "Тереза Лисбон",
      "Красный Джон",
      "the-mentalist-2008",
    ],
    type: "Сериал",
    year: "2008",
    rating: 8.1,
    genres: ["Сериал", "Детектив", "Криминал", "Драма", "Триллер"],
    countries: ["США"],
    poster:
      "/api/tmdb/poster?tmdbId=5920&imdbId=tt1196946&kpId=412344&title=Менталист&originalTitle=The+Mentalist&year=2008&type=Сериал&quality=high&v=mentalist-1",
    backdrop:
      "/api/tmdb/backdrop?tmdbId=5920&imdbId=tt1196946&title=Менталист&originalTitle=The+Mentalist&year=2008&type=Сериал&v=mentalist-1",
    description:
      "Бывший экстрасенс Патрик Джейн помогает Калифорнийскому бюро расследований раскрывать сложные дела, используя наблюдательность, психологию и умение читать людей.",
    longDescription:
      "«Менталист» — детективный сериал о Патрике Джейне, человеке с болезненным прошлым и почти пугающей внимательностью к деталям. Когда-то он выдавал себя за медиума, но после личной трагедии начинает помогать полиции: вместо магии здесь холодное чтение, психология, провокации и умение замечать то, что остальные пропускают.\n\nНа KinoLuma карточка оформлена как полноценный сериал: закреплены IMDb, Kinopoisk и TMDb ID, добавлены главные роли, факты, трейлер и основной плеер по Кинопоиску. Это помогает странице нормально находиться через поиск, попадать в sitemap и открываться без случайной подмены постера.",
    trailerUrl: "https://www.youtube.com/embed/cdWbA5vH4S8",
    tmdbId: 5920,
    kinopoiskId: 412344,
    imdbId: "tt1196946",
    facts: [
      { label: "Формат", value: "детективный сериал" },
      { label: "Длительность", value: "около 43 мин / серия" },
      { label: "Сезонов", value: "7" },
      { label: "Эпизодов", value: "151" },
      { label: "Создатель", value: "Бруно Хеллер" },
      { label: "Премьера", value: "23 сентября 2008" },
      { label: "Статус", value: "Завершён" },
      { label: "Темы", value: "психология, расследования, месть, манипуляции, Кровавый Джон" },
    ],
    cast: [
      { name: "Саймон Бейкер", role: "Патрик Джейн" },
      { name: "Робин Танни", role: "Тереза Лисбон" },
      { name: "Тим Кэнг", role: "Кимбалл Чо" },
      { name: "Оуэйн Йомен", role: "Уэйн Ригсби" },
      { name: "Аманда Ригетти", role: "Грейс Ван Пелт" },
      { name: "Рокуэлл Паркер", role: "Джейн в детстве" },
    ],
  },
  {
    id: 940111,
    slug: "wayne-2019",
    title: "Уэйн",
    originalTitle: "Wayne",
    searchTitles: [
      "Уэйн",
      "Wayne",
      "Вэйн",
      "Марк МакКенна",
      "Сиара Браво",
      "Дел",
      "wayne-2019",
    ],
    type: "Сериал",
    year: "2019",
    rating: 8.3,
    genres: ["Сериал", "Боевик", "Комедия", "Драма", "Триллер"],
    countries: ["США"],
    poster:
      "/api/tmdb/poster?tmdbId=84231&imdbId=tt7765404&kpId=1167154&title=Уэйн&originalTitle=Wayne&year=2019&type=Сериал&quality=high&v=wayne-1",
    backdrop:
      "/api/tmdb/backdrop?tmdbId=84231&imdbId=tt7765404&title=Уэйн&originalTitle=Wayne&year=2019&type=Сериал&v=wayne-1",
    description:
      "Шестнадцатилетний Уэйн вместе с Дел отправляется из Бостона во Флориду, чтобы вернуть украденный Pontiac Trans Am его покойного отца.",
    longDescription:
      "«Уэйн» — дерзкий роуд-муви сериал о подростке, который выглядит как ходячая проблема, но внутри держится за собственное чувство справедливости. Уэйн не умеет проходить мимо чужой жестокости, постоянно ввязывается в драки и вместе с Дел отправляется через полстраны, чтобы вернуть машину отца.\n\nНа KinoLuma карточка закреплена вручную: добавлены IMDb, Kinopoisk и TMDb ID, постер, фон, главные роли, факты, трейлер и основной плеер. Сериал короткий, злой, смешной и живой - хороший вариант, когда хочется истории с драйвом, подростковой яростью и черным юмором без затянутых сезонов.",
    trailerUrl: "https://www.youtube.com/embed/PFOtvHtyW8s",
    tmdbId: 84231,
    kinopoiskId: 1167154,
    imdbId: "tt7765404",
    facts: [
      { label: "Формат", value: "сериал" },
      { label: "Длительность", value: "около 30-35 мин / серия" },
      { label: "Сезонов", value: "1" },
      { label: "Эпизодов", value: "10" },
      { label: "Создатель", value: "Шон Симмонс" },
      { label: "Премьера", value: "16 января 2019" },
      { label: "Статус", value: "Отменён" },
      { label: "Темы", value: "роуд-муви, месть, подростковый бунт, черная комедия, дружба" },
    ],
    cast: [
      { name: "Марк МакКенна", role: "Уэйн МакКаллоу" },
      { name: "Сиара Браво", role: "Делайла «Дел» Лучетти" },
      { name: "Джошуа Дж. Уильямс", role: "Орландо Хайкс" },
      { name: "Дин Уинтерс", role: "Бобби Лучетти" },
      { name: "Стивен Кирин", role: "сержант Геллер" },
      { name: "Джеймс Эрл", role: "офицер Джей" },
    ],
  },
  {
    id: 940112,
    slug: "crank-2006",
    title: "Адреналин",
    originalTitle: "Crank",
    searchTitles: [
      "Адреналин",
      "Crank",
      "Крэнк",
      "Джейсон Стэйтем",
      "Чев Челиос",
      "crank-2006",
    ],
    type: "Фильм",
    year: "2006",
    rating: 7.1,
    genres: ["Фильм", "Боевик", "Триллер", "Криминал"],
    countries: ["США", "Великобритания"],
    poster:
      "/api/tmdb/poster?tmdbId=1948&imdbId=tt0479884&kpId=180609&title=Адреналин&originalTitle=Crank&year=2006&type=Фильм&quality=high&v=crank-1",
    backdrop:
      "/api/tmdb/backdrop?tmdbId=1948&imdbId=tt0479884&title=Адреналин&originalTitle=Crank&year=2006&type=Фильм&v=crank-1",
    description:
      "Наёмник Чев Челиос просыпается с ядом в крови: чтобы выжить, ему приходится постоянно держать адреналин на пределе и одновременно искать тех, кто его подставил.",
    longDescription:
      "«Адреналин» — бешеный боевик с Джейсоном Стэйтемом, где сама идея выживания превращается в гонку без тормозов. Чев Челиос должен постоянно двигаться, злиться, рисковать и поднимать пульс, потому что остановка для него почти равна смерти.\n\nФильм держится на скорости, чёрном юморе и нарочито нервной подаче: это история про месть, криминальный хаос и героя, который буквально не может позволить себе остановиться.",
    trailerUrl: "",
    tmdbId: 1948,
    kinopoiskId: 180609,
    imdbId: "tt0479884",
    facts: [
      { label: "Формат", value: "полнометражный фильм" },
      { label: "Длительность", value: "88 мин" },
      { label: "Режиссёры", value: "Марк Невелдайн, Брайан Тейлор" },
      { label: "Премьера", value: "1 сентября 2006" },
      { label: "Статус", value: "Вышел" },
      { label: "Темы", value: "погоня, месть, криминал, выживание, безумный темп" },
    ],
    cast: [
      { name: "Джейсон Стэйтем", role: "Чев Челиос" },
      { name: "Эми Смарт", role: "Ив" },
      { name: "Хосе Пабло Кантильо", role: "Рики Верона" },
      { name: "Эфрен Рамирес", role: "Кайло" },
      { name: "Дуайт Йоакам", role: "Док Майлз" },
      { name: "Карлос Санс", role: "Карлито" },
    ],
  },
  {
    id: 940113,
    slug: "crank-high-voltage-2009",
    title: "Адреналин 2: Высокое напряжение",
    originalTitle: "Crank: High Voltage",
    searchTitles: [
      "Адреналин 2",
      "Адреналин 2: Высокое напряжение",
      "Crank High Voltage",
      "Crank: High Voltage",
      "Чев Челиос",
      "Джейсон Стэйтем",
      "crank-high-voltage-2009",
    ],
    type: "Фильм",
    year: "2009",
    rating: 6.5,
    genres: ["Фильм", "Боевик", "Триллер", "Криминал", "Комедия"],
    countries: ["США"],
    poster:
      "/api/tmdb/poster?tmdbId=15092&imdbId=tt1121931&kpId=397541&title=Адреналин+2%3A+Высокое+напряжение&originalTitle=Crank%3A+High+Voltage&year=2009&type=Фильм&quality=high&v=crank2-1",
    backdrop:
      "/api/tmdb/backdrop?tmdbId=15092&imdbId=tt1121931&title=Адреналин+2%3A+Высокое+напряжение&originalTitle=Crank%3A+High+Voltage&year=2009&type=Фильм&v=crank2-1",
    description:
      "Чев Челиос возвращается после почти невозможного падения и снова вынужден гнаться по городу: теперь его сердце заменено устройством, которому нужна постоянная подзарядка.",
    longDescription:
      "«Адреналин 2: Высокое напряжение» продолжает историю Чева Челиоса в ещё более безумном ритме. Вместо яда теперь проблема в искусственном сердце: герою приходится искать заряд, срывать планы врагов и снова превращать Лос-Анджелес в одну большую погоню.\n\nСиквел усиливает комедийный абсурд, криминальный хаос и клиповую энергию первой части. Это кино для тех, кому нужен громкий, резкий и предельно бодрый боевик без долгого разгона.",
    trailerUrl: "",
    tmdbId: 15092,
    kinopoiskId: 397541,
    imdbId: "tt1121931",
    facts: [
      { label: "Формат", value: "полнометражный фильм" },
      { label: "Длительность", value: "96 мин" },
      { label: "Режиссёры", value: "Марк Невелдайн, Брайан Тейлор" },
      { label: "Премьера", value: "16 апреля 2009" },
      { label: "Статус", value: "Вышел" },
      { label: "Темы", value: "погоня, электричество, криминал, сиквел, чёрный юмор" },
    ],
    cast: [
      { name: "Джейсон Стэйтем", role: "Чев Челиос" },
      { name: "Эми Смарт", role: "Ив" },
      { name: "Клифтон Коллинз мл.", role: "Эль Гурон" },
      { name: "Эфрен Рамирес", role: "Венус" },
      { name: "Бай Лин", role: "Риа" },
      { name: "Дуайт Йоакам", role: "Док Майлз" },
    ],
  },
];

export const manualUserPinnedAdditions: Movie[] = pinnedEntries.map((entry) => ({
  id: entry.id,
  slug: entry.slug,
  title: entry.title,
  originalTitle: entry.originalTitle,
  searchTitles: entry.searchTitles,
  type: entry.type,
  year: entry.year,
  rating: entry.rating,
  genres: entry.genres,
  countries: entry.countries,
  poster: entry.poster,
  posterFallbacks: [entry.poster],
  backdrop: entry.backdrop,
  description: entry.description,
  longDescription: entry.longDescription,
  trailerUrl: entry.trailerUrl,
  tmdbId: entry.tmdbId,
  kinopoiskId: entry.kinopoiskId,
  imdbId: entry.imdbId,
  source: SOURCE,
  seoTitle: `${entry.title} (${entry.year}) смотреть онлайн на KinoLuma`,
  seoDescription: `${entry.title} (${entry.year}) - ${entry.genres.join(", ").toLowerCase()}: описание, трейлер, актеры, факты и плеер на KinoLuma.`,
  facts: entry.facts,
  cast: entry.cast,
  faq: faqFor(entry),
  players: createPlayers(entry),
}));
