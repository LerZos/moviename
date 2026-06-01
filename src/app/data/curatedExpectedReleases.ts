import type { ContentType, Movie } from "./movies";

type ExpectedReleaseInput = {
  id: number;
  slug: string;
  title: string;
  originalTitle: string;
  aliases?: string[];
  type?: ContentType;
  year: string;
  premiere: string;
  genres: string[];
  countries?: string[];
  description: string;
  franchise: string;
  director?: string;
};

function escapePosterText(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function splitPosterLine(text: string, maxLength: number, maxLines: number) {
  const words = text.split(" ").filter(Boolean);
  const lines: string[] = [];

  for (const word of words) {
    const currentLine = lines[lines.length - 1];

    if (!currentLine) {
      lines.push(word);
      continue;
    }

    if (`${currentLine} ${word}`.length <= maxLength) {
      lines[lines.length - 1] = `${currentLine} ${word}`;
      continue;
    }

    if (lines.length < maxLines) {
      lines.push(word);
    }
  }

  return lines.length > 0 ? lines.slice(0, maxLines) : [text];
}

function createExpectedPoster(title: string, originalTitle: string, label = "СКОРО") {
  const titleLines = splitPosterLine(title.toUpperCase(), 17, 3);
  const originalLines = splitPosterLine(originalTitle, 24, 2);
  const titleStartY = titleLines.length === 1 ? 490 : titleLines.length === 2 ? 462 : 432;
  const originalStartY = originalLines.length === 1 ? 610 : 588;

  const titleText = titleLines
    .map(
      (line, index) =>
        `<text x="250" y="${titleStartY + index * 44}" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" letter-spacing="-0.5">${escapePosterText(line)}</text>`,
    )
    .join("");

  const originalText = originalLines
    .map(
      (line, index) =>
        `<text x="250" y="${originalStartY + index * 26}" text-anchor="middle" fill="#d4d4d4" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="800" opacity="0.85">${escapePosterText(line)}</text>`,
    )
    .join("");

  const svg = `
    <svg width="500" height="750" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="750" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#18181b"/>
          <stop offset="50%" stop-color="#050505"/>
          <stop offset="100%" stop-color="#000000"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="22%" r="70%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="500" height="750" fill="url(#bg)"/>
      <rect width="500" height="750" fill="url(#glow)"/>
      <rect x="30" y="30" width="440" height="690" rx="38" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>
      <circle cx="250" cy="246" r="116" fill="#ffffff" opacity="0.055"/>
      <path d="M250 132L278 218L369 218L296 271L324 358L250 304L176 358L204 271L131 218L222 218L250 132Z" fill="#ffffff" opacity="0.88"/>
      <rect x="136" y="374" width="228" height="44" rx="22" fill="#ffffff" fill-opacity="0.94"/>
      <text x="250" y="403" text-anchor="middle" fill="#000000" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="900" letter-spacing="4">${escapePosterText(label)}</text>
      ${titleText}
      ${originalText}
      <text x="250" y="674" text-anchor="middle" fill="#737373" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="900">KinoLuma</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getTmdbExpectedPoster(input: {
  title: string;
  originalTitle: string;
  year: string;
  type: ContentType;
}) {
  const params = new URLSearchParams();

  params.set("title", input.title);
  params.set("originalTitle", input.originalTitle);
  params.set("year", input.year);
  params.set("type", input.type);
  params.set("quality", "high");
  params.set("v", "expected-curated-1");

  return `/api/tmdb/poster?${params.toString()}`;
}

function createExpectedRelease(input: ExpectedReleaseInput): Movie {
  const type = input.type ?? "Фильм";
  const posterFallback = createExpectedPoster(input.title, input.originalTitle);
  const facts = [
    { label: "Статус", value: "Ожидаемый релиз" },
    { label: "Премьера", value: input.premiere },
    { label: "Франшиза", value: input.franchise },
    input.director ? { label: "Режиссёр", value: input.director } : null,
  ].filter(Boolean) as Movie["facts"];

  return {
    id: input.id,
    slug: input.slug,
    title: input.title,
    originalTitle: input.originalTitle,
    searchTitles: [
      input.title,
      input.originalTitle,
      input.slug,
      input.franchise,
      "ожидаемые релизы",
      "будущие премьеры",
      "скоро в кино",
      ...(input.aliases ?? []),
    ],
    type,
    year: input.year,
    rating: 0,
    genres: input.genres,
    countries: input.countries ?? ["США"],
    poster: getTmdbExpectedPoster({
      title: input.title,
      originalTitle: input.originalTitle,
      year: input.year,
      type,
    }),
    posterFallbacks: [posterFallback, "/kinoluma-icon.png"],
    description: input.description,
    longDescription: `${input.description} Карточка добавлена в ручную подборку ожидаемых релизов KinoLuma: без документалок, ток-шоу, концертов и случайных будущих карточек с рейтингом 0. Даты и названия указаны только там, где они уже подтверждены публичными релизными материалами.`,
    trailerUrl: "",
    facts,
    source: "kinoluma-curated-expected",
  };
}

export const curatedExpectedReleases: Movie[] = [
  createExpectedRelease({
    id: 900001,
    slug: "dune-part-three-2026",
    title: "Дюна: Часть третья",
    originalTitle: "Dune: Part Three",
    aliases: ["дюна 3", "dune 3", "dune messiah"],
    year: "2026",
    premiere: "18 декабря 2026",
    genres: ["Фантастика", "Приключения", "Драма", "Ожидаемые релизы"],
    description: "Финальная глава кинотрилогии Дени Вильнёва по миру «Дюны» — масштабная фантастика, политика, пустыня и последствия пути Пола Атрейдеса.",
    franchise: "Dune",
    director: "Дени Вильнёв",
  }),
  createExpectedRelease({
    id: 900002,
    slug: "avengers-doomsday-2026",
    title: "Мстители: Судный день",
    originalTitle: "Avengers: Doomsday",
    aliases: ["мстители доктор дум", "avengers doctor doom", "доктор дум", "doomsday"],
    year: "2026",
    premiere: "18 декабря 2026",
    genres: ["Фантастика", "Боевик", "Супергерои", "Ожидаемые релизы"],
    description: "Большой кроссовер Marvel Studios с Доктором Думом и новой стадией MCU. Карточка добавлена как ожидаемый блокбастер, без выдуманных деталей сюжета.",
    franchise: "Marvel Cinematic Universe",
    director: "Джо Руссо, Энтони Руссо",
  }),
  createExpectedRelease({
    id: 900003,
    slug: "spider-man-brand-new-day-2026",
    title: "Человек-паук: Новый день",
    originalTitle: "Spider-Man: Brand New Day",
    aliases: ["человек паук новый день", "spider man 4", "новый человек паук", "том холланд"],
    year: "2026",
    premiere: "31 июля 2026",
    genres: ["Фантастика", "Боевик", "Супергерои", "Ожидаемые релизы"],
    description: "Новая сольная глава про Питера Паркера в MCU после событий «Нет пути домой». Упор — на уличного Человека-паука и новый этап героя.",
    franchise: "Spider-Man / Marvel",
    director: "Дестин Дэниел Креттон",
  }),
  createExpectedRelease({
    id: 900004,
    slug: "the-odyssey-2026",
    title: "Одиссея",
    originalTitle: "The Odyssey",
    aliases: ["кристофер нолан одиссея", "nolan odyssey", "одиссея нолана"],
    year: "2026",
    premiere: "17 июля 2026",
    genres: ["Приключения", "Фэнтези", "Драма", "Ожидаемые релизы"],
    description: "Кристофер Нолан берётся за мифологическое путешествие Одиссея. Один из самых громких авторских блокбастеров 2026 года.",
    franchise: "Christopher Nolan",
    director: "Кристофер Нолан",
  }),
  createExpectedRelease({
    id: 900005,
    slug: "the-hunger-games-sunrise-on-the-reaping-2026",
    title: "Голодные игры: Рассвет жатвы",
    originalTitle: "The Hunger Games: Sunrise on the Reaping",
    aliases: ["новые голодные игры", "рассвет жатвы", "sunrise on the reaping", "haymitch"],
    year: "2026",
    premiere: "20 ноября 2026",
    genres: ["Фантастика", "Драма", "Приключения", "Ожидаемые релизы"],
    description: "Новый фильм во вселенной «Голодных игр» — приквел о молодом Хеймитче и 50-х Голодных играх.",
    franchise: "The Hunger Games",
    director: "Фрэнсис Лоуренс",
  }),
  createExpectedRelease({
    id: 900006,
    slug: "supergirl-2026",
    title: "Супергёрл",
    originalTitle: "Supergirl",
    aliases: ["supergirl woman of tomorrow", "dc supergirl", "супергерл"],
    year: "2026",
    premiere: "26 июня 2026",
    genres: ["Фантастика", "Боевик", "Супергерои", "Ожидаемые релизы"],
    description: "Крупный релиз нового DCU про Кару Зор-Эл. Добавлено как заметная супергеройская премьера, а не случайный шум из рейтингов ожидания.",
    franchise: "DC Universe",
  }),
  createExpectedRelease({
    id: 900007,
    slug: "masters-of-the-universe-2026",
    title: "Властелины Вселенной",
    originalTitle: "Masters of the Universe",
    aliases: ["he man", "химен", "скелетор", "masters of universe"],
    year: "2026",
    premiere: "5 июня 2026",
    genres: ["Фэнтези", "Боевик", "Приключения", "Ожидаемые релизы"],
    description: "Новая игровая версия истории про Хи-Мена, Этернию и противостояние со Скелетором. Франшиза известная, поэтому карточка остаётся в ожидаемых.",
    franchise: "Masters of the Universe",
    director: "Трэвис Найт",
  }),
  createExpectedRelease({
    id: 900008,
    slug: "toy-story-5-2026",
    title: "История игрушек 5",
    originalTitle: "Toy Story 5",
    aliases: ["той стори 5", "buzz woody", "pixar toy story"],
    type: "Мультфильм",
    year: "2026",
    premiere: "19 июня 2026",
    genres: ["Анимация", "Приключения", "Семейный", "Ожидаемые релизы"],
    description: "Возвращение Вуди, Базза и Джесси в пятой части культовой франшизы Pixar. Вот это ожидаемый мультфильм, а не айсберг случайных карточек.",
    franchise: "Toy Story / Pixar",
    director: "Эндрю Стэнтон",
  }),
  createExpectedRelease({
    id: 900009,
    slug: "minions-and-monsters-2026",
    title: "Миньоны и монстры",
    originalTitle: "Minions & Monsters",
    aliases: ["миньоны монстры", "minions monsters", "illumination minions"],
    type: "Мультфильм",
    year: "2026",
    premiere: "1 июля 2026",
    genres: ["Анимация", "Комедия", "Семейный", "Ожидаемые релизы"],
    description: "Новый полнометражный релиз про миньонов от Illumination. Массовая франшиза, узнаваемый бренд и нормальный кандидат для раздела ожиданий.",
    franchise: "Despicable Me / Minions",
  }),
  createExpectedRelease({
    id: 900010,
    slug: "the-legend-of-zelda-2027",
    title: "Легенда о Зельде",
    originalTitle: "The Legend of Zelda",
    aliases: ["zelda movie", "зельда фильм", "линк зельда", "nintendo zelda"],
    year: "2027",
    premiere: "30 апреля 2027",
    genres: ["Фэнтези", "Приключения", "Экранизация игры", "Ожидаемые релизы"],
    description: "Игровая экранизация одной из главных франшиз Nintendo. Большой фэнтези-релиз для тех, кто ждёт не шум, а реально узнаваемые премьеры.",
    franchise: "The Legend of Zelda / Nintendo",
    director: "Уэс Болл",
  }),
  createExpectedRelease({
    id: 900011,
    slug: "how-to-train-your-dragon-2-live-action-2027",
    title: "Как приручить дракона 2",
    originalTitle: "How to Train Your Dragon 2",
    aliases: ["дракон 2 лайв экшен", "how to train your dragon live action 2", "беззубик"],
    year: "2027",
    premiere: "11 июня 2027",
    genres: ["Фэнтези", "Приключения", "Семейный", "Ожидаемые релизы"],
    description: "Продолжение игровой версии «Как приручить дракона». Известная франшиза, понятный интерес и нормальное место в ожидаемых.",
    franchise: "How to Train Your Dragon",
    director: "Дин Деблуа",
  }),
  createExpectedRelease({
    id: 900012,
    slug: "spider-man-beyond-the-spider-verse-2027",
    title: "Человек-паук: За пределами вселенных",
    originalTitle: "Spider-Man: Beyond the Spider-Verse",
    aliases: ["майлз моралес", "spider verse 3", "паучьи вселенные", "за пределами паучьих вселенных"],
    type: "Мультфильм",
    year: "2027",
    premiere: "18 июня 2027",
    genres: ["Анимация", "Фантастика", "Супергерои", "Ожидаемые релизы"],
    description: "Продолжение анимационной саги про Майлза Моралеса и мультивселенную Человека-паука. Один из самых ожидаемых мультфильмов ближайших лет.",
    franchise: "Spider-Verse / Marvel",
  }),
  createExpectedRelease({
    id: 900013,
    slug: "shrek-5-2027",
    title: "Шрек 5",
    originalTitle: "Shrek 5",
    aliases: ["новый шрек", "shrek five", "dreamworks shrek"],
    type: "Мультфильм",
    year: "2027",
    premiere: "30 июня 2027",
    genres: ["Анимация", "Комедия", "Приключения", "Ожидаемые релизы"],
    description: "Пятая часть «Шрека» от DreamWorks. Культовая франшиза возвращается — это ровно тот мультфильм, который должен быть в ожиданиях.",
    franchise: "Shrek / DreamWorks",
  }),
  createExpectedRelease({
    id: 900014,
    slug: "frozen-iii-2027",
    title: "Холодное сердце 3",
    originalTitle: "Frozen III",
    aliases: ["frozen 3", "эльза анна", "холодное сердце три"],
    type: "Мультфильм",
    year: "2027",
    premiere: "24 ноября 2027",
    genres: ["Анимация", "Фэнтези", "Семейный", "Ожидаемые релизы"],
    description: "Третья часть одной из самых известных современных Disney-франшиз. Добавлено как крупный семейный релиз, без лишнего мусора вокруг.",
    franchise: "Frozen / Disney",
  }),
  createExpectedRelease({
    id: 900015,
    slug: "the-batman-part-ii-2027",
    title: "Бэтмен: Часть 2",
    originalTitle: "The Batman Part II",
    aliases: ["бэтмен 2", "the batman 2", "роберт паттинсон бэтмен"],
    year: "2027",
    premiere: "1 октября 2027",
    genres: ["Боевик", "Криминал", "Супергерои", "Ожидаемые релизы"],
    description: "Продолжение мрачной версии Бэтмена с Робертом Паттинсоном. Карточка оставлена как ожидаемый релиз крупной DC-франшизы.",
    franchise: "The Batman / DC",
  }),
  createExpectedRelease({
    id: 900016,
    slug: "avengers-secret-wars-2027",
    title: "Мстители: Секретные войны",
    originalTitle: "Avengers: Secret Wars",
    aliases: ["secret wars", "мстители секретные войны", "avengers 6"],
    year: "2027",
    premiere: "17 декабря 2027",
    genres: ["Фантастика", "Боевик", "Супергерои", "Ожидаемые релизы"],
    description: "Следующий большой фильм Marvel после «Судного дня». Карточка добавлена как крупный будущий кроссовер, без догадок о сюжете.",
    franchise: "Marvel Cinematic Universe",
    director: "Джо Руссо, Энтони Руссо",
  }),
  createExpectedRelease({
    id: 900017,
    slug: "the-lord-of-the-rings-the-hunt-for-gollum-2027",
    title: "Властелин колец: Охота на Голлума",
    originalTitle: "The Lord of the Rings: The Hunt for Gollum",
    aliases: ["охота на голлума", "hunt for gollum", "новый властелин колец", "gollum"],
    year: "2027",
    premiere: "17 декабря 2027",
    genres: ["Фэнтези", "Приключения", "Драма", "Ожидаемые релизы"],
    description: "Возвращение во вселенную Средиземья в новом фильме о Голлуме. Крупная фэнтези-франшиза, поэтому ей место в ожидаемых релизах.",
    franchise: "The Lord of the Rings",
    director: "Энди Серкис",
  }),
];
