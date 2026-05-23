export type ContentType = "Фильм" | "Сериал" | "Аниме" | "Мультфильм" | "Документальный";

export type MovieFact = {
  label: string;
  value: string;
};

export type CastMember = {
  name: string;
  role: string;
};

export type PlayerProvider = {
  id: string;
  name: string;
  embedUrl: string;
};

export type Movie = {
  id: number;
  slug: string;
  title: string;
  originalTitle: string;
  searchTitles: string[];
  type: ContentType;
  year: string;
  rating: number;
  genres: string[];
  poster: string;
  posterFallbacks?: string[];
  description: string;
  trailerUrl: string;
  longDescription?: string;
  facts?: MovieFact[];
  cast?: CastMember[];
  players?: PlayerProvider[];
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

function createCartoonPoster(
  title: string,
  originalTitle: string,
  accent = "#facc15",
  secondary = "#fb7185",
) {
  const titleLines = splitPosterLine(title.toUpperCase(), 16, 3);
  const originalLines = splitPosterLine(originalTitle, 24, 2);
  const titleStartY = titleLines.length === 1 ? 500 : titleLines.length === 2 ? 470 : 440;
  const originalStartY = originalLines.length === 1 ? 608 : 586;

  const titleText = titleLines
    .map(
      (line, index) =>
        `<text x="250" y="${titleStartY + index * 45}" text-anchor="middle" fill="#ffffff" stroke="#111827" stroke-opacity="0.35" stroke-width="6" paint-order="stroke" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="900" letter-spacing="-0.5">${escapePosterText(line)}</text>`,
    )
    .join("");

  const originalText = originalLines
    .map(
      (line, index) =>
        `<text x="250" y="${originalStartY + index * 26}" text-anchor="middle" fill="#f8fafc" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="800" opacity="0.86">${escapePosterText(line)}</text>`,
    )
    .join("");

  const svg = `
    <svg width="500" height="750" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="750" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="48%" stop-color="#111827"/>
          <stop offset="100%" stop-color="#030712"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="20%" r="70%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.70"/>
          <stop offset="56%" stop-color="${secondary}" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="shade" x1="0" y1="0" x2="0" y2="750" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
          <stop offset="58%" stop-color="#000000" stop-opacity="0.10"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.70"/>
        </linearGradient>
      </defs>

      <rect width="500" height="750" fill="url(#bg)"/>
      <rect width="500" height="750" fill="url(#glow)"/>
      <circle cx="94" cy="142" r="46" fill="${accent}" opacity="0.82"/>
      <circle cx="410" cy="176" r="72" fill="${secondary}" opacity="0.72"/>
      <circle cx="382" cy="446" r="108" fill="${accent}" opacity="0.18"/>
      <path d="M80 538C150 438 224 478 288 354C336 260 370 246 436 204" stroke="#ffffff" stroke-opacity="0.17" stroke-width="72" stroke-linecap="round"/>
      <path d="M120 176C176 116 262 104 328 148C398 194 414 286 362 354C308 424 198 410 148 340C106 282 78 222 120 176Z" fill="#ffffff" opacity="0.10"/>
      <path d="M166 274C198 236 242 236 274 274C306 236 350 236 382 274" stroke="#ffffff" stroke-opacity="0.36" stroke-width="18" stroke-linecap="round"/>
      <circle cx="190" cy="258" r="15" fill="#ffffff" opacity="0.72"/>
      <circle cx="350" cy="258" r="15" fill="#ffffff" opacity="0.72"/>
      <path d="M210 348C246 382 300 382 336 348" stroke="${accent}" stroke-opacity="0.82" stroke-width="16" stroke-linecap="round"/>
      <g fill="#ffffff" opacity="0.70">
        <circle cx="82" cy="340" r="3"/><circle cx="132" cy="476" r="2.5"/><circle cx="326" cy="112" r="3"/><circle cx="422" cy="356" r="2.5"/><circle cx="236" cy="170" r="2.5"/>
      </g>
      <rect width="500" height="750" fill="url(#shade)"/>
      <rect x="28" y="28" width="444" height="694" rx="34" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2"/>
      <text x="64" y="86" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="900" letter-spacing="3">МУЛЬТФИЛЬМ</text>
      <rect x="134" y="366" width="232" height="44" rx="22" fill="#020617" fill-opacity="0.46" stroke="#ffffff" stroke-opacity="0.16"/>
      <text x="250" y="394" text-anchor="middle" fill="${accent}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="900" letter-spacing="3">MOVIEHUB KIDS</text>
      ${titleText}
      ${originalText}
      <rect x="150" y="646" width="200" height="42" rx="21" fill="#ffffff" fill-opacity="0.94"/>
      <text x="250" y="672" text-anchor="middle" fill="#000000" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="900">Смотреть легально</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const movies: Movie[] = [
  {
      id: 1,
      slug: "dune-part-two",
      title: "Дюна: Часть вторая",
      originalTitle: "Dune: Part Two",
      searchTitles: ["дюна", "дюна 2", "дюна часть 2", "дюна часть вторая"],
      type: "Фильм",
      year: "2024",
      rating: 8.5,
      genres: ["Фантастика", "Приключения", "Драма"],
      poster: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
      description: "Эпическая фантастика о власти, пустыне и судьбе.",
      trailerUrl: "https://www.youtube.com/embed/Way9Dexny3w",
      longDescription:
        "Пол Атрейдес объединяется с Чани и фременами, чтобы отомстить тем, кто уничтожил его семью. Но чем ближе он подходит к власти, тем сильнее становится выбор между личной любовью и судьбой всей вселенной.",
      facts: [
        { label: "Год", value: "2024" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "166 мин" },
        { label: "Бюджет", value: "$190 млн" },
        { label: "Студия", value: "Legendary Pictures" },
        { label: "Дистрибьютор", value: "Warner Bros. Pictures" },
        { label: "Режиссёр", value: "Denis Villeneuve" },
      ],
      cast: [
        { name: "Timothée Chalamet", role: "Пол Атрейдес" },
        { name: "Zendaya", role: "Чани" },
        { name: "Rebecca Ferguson", role: "Леди Джессика" },
        { name: "Javier Bardem", role: "Стилгар" },
        { name: "Austin Butler", role: "Фейд-Раута Харконнен" },
        { name: "Florence Pugh", role: "Принцесса Ирулан" },
        { name: "Josh Brolin", role: "Гурни Халлек" },
        { name: "Dave Bautista", role: "Глоссу Раббан" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 2,
      slug: "oppenheimer",
      title: "Оппенгеймер",
      originalTitle: "Oppenheimer",
      searchTitles: ["оппенгеймер", "опенгеймер"],
      type: "Фильм",
      year: "2023",
      rating: 8.3,
      genres: ["Биография", "Драма", "История"],
      poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
      description: "История учёного, который изменил ход XX века.",
      trailerUrl: "https://www.youtube.com/embed/uYPbbksJxIg",
      longDescription:
        "История Дж. Роберта Оппенгеймера показывает путь учёного, который оказался в центре Манхэттенского проекта. Это напряжённая биографическая драма о гениальности, ответственности и последствиях решений, которые меняют историю.",
      facts: [
        { label: "Год", value: "2023" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США, Великобритания" },
        { label: "Длительность", value: "180 мин" },
        { label: "Бюджет", value: "$100 млн" },
        { label: "Студия", value: "Universal Pictures" },
        { label: "Режиссёр", value: "Christopher Nolan" },
        { label: "Жанры", value: "Биография, Драма, История" },
      ],
      cast: [
        { name: "Cillian Murphy", role: "Дж. Роберт Оппенгеймер" },
        { name: "Emily Blunt", role: "Китти Оппенгеймер" },
        { name: "Matt Damon", role: "Лесли Гровс" },
        { name: "Robert Downey Jr.", role: "Льюис Штраус" },
        { name: "Florence Pugh", role: "Джин Тэтлок" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 3,
      slug: "interstellar",
      title: "Интерстеллар",
      originalTitle: "Interstellar",
      searchTitles: ["интерстеллар", "интерстелар", "межзвездный", "межзвёздный"],
      type: "Фильм",
      year: "2014",
      rating: 8.7,
      genres: ["Фантастика", "Драма", "Приключения"],
      poster: "https://avatars.mds.yandex.net/get-kinopoisk-image/1704946/ef2f5aa6-daf6-4b71-acb1-40dd61d9c692/600x900",
      description: "Путешествие через космос ради спасения человечества.",
      trailerUrl: "https://www.youtube.com/embed/2LqzF5WauAw",
      longDescription:
        "В будущем Земля становится всё менее пригодной для жизни, и группа исследователей отправляется через червоточину искать новый дом для человечества. Это фантастика о времени, семье и надежде, где космос огромен, а главная ставка — человеческая связь.",
      facts: [
        { label: "Год", value: "2014" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США, Великобритания" },
        { label: "Длительность", value: "169 мин" },
        { label: "Бюджет", value: "$165 млн" },
        { label: "Студия", value: "Paramount Pictures, Warner Bros." },
        { label: "Режиссёр", value: "Christopher Nolan" },
        { label: "Темы", value: "Космос, семья, время" },
      ],
      cast: [
        { name: "Matthew McConaughey", role: "Купер" },
        { name: "Anne Hathaway", role: "Амелия Бранд" },
        { name: "Jessica Chastain", role: "Мёрф" },
        { name: "Mackenzie Foy", role: "Юная Мёрф" },
        { name: "Michael Caine", role: "Профессор Бранд" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 4,
      slug: "the-batman",
      title: "Бэтмен",
      originalTitle: "The Batman",
      searchTitles: ["бетмен", "бэтмен", "бэтман", "batman"],
      type: "Фильм",
      year: "2022",
      rating: 7.8,
      genres: ["Криминал", "Драма", "Экшен"],
      poster: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
      description: "Мрачная детективная история о Готэме.",
      trailerUrl: "https://www.youtube.com/embed/mqqft2x_Aa4",
      longDescription:
        "Брюс Уэйн только начинает понимать, каким символом может стать Бэтмен для Готэма. Детективное расследование приводит его к загадкам Риддлера, коррупции города и вопросу: достаточно ли страха, чтобы изменить систему.",
      facts: [
        { label: "Год", value: "2022" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "176 мин" },
        { label: "Бюджет", value: "$185–200 млн" },
        { label: "Студия", value: "Warner Bros., DC Films" },
        { label: "Режиссёр", value: "Matt Reeves" },
        { label: "Настроение", value: "Мрачно, детективно, нуарно" },
      ],
      cast: [
        { name: "Robert Pattinson", role: "Брюс Уэйн / Бэтмен" },
        { name: "Zoë Kravitz", role: "Селина Кайл" },
        { name: "Paul Dano", role: "Риддлер" },
        { name: "Jeffrey Wright", role: "Джеймс Гордон" },
        { name: "Colin Farrell", role: "Пингвин" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 5,
      slug: "spider-man-across-the-spider-verse",
      title: "Человек-паук: Паутина вселенных",
      originalTitle: "Spider-Man: Across the Spider-Verse",
      searchTitles: [
        "человек паук",
        "человек-паук",
        "спайдермен",
        "через вселенные",
        "паутина вселенных",
        "spider man",
        "spiderman",
      ],
      type: "Фильм",
      year: "2023",
      rating: 8.6,
      genres: ["Анимация", "Экшен", "Приключения"],
      poster: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
      description: "Стильная мультивселенная Человека-паука.",
      trailerUrl: "https://www.youtube.com/embed/shW9i6k8cB0",
      longDescription:
        "Майлз Моралес сталкивается с огромной паутиной альтернативных миров и версий Человека-паука. Мультвселенная проверяет его дружбу, выбор и право самому решать, каким героем он станет.",
      facts: [
        { label: "Год", value: "2023" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "140 мин" },
        { label: "Бюджет", value: "$100 млн" },
        { label: "Студия", value: "Sony Pictures Animation" },
        { label: "Режиссёры", value: "Joaquim Dos Santos, Kemp Powers, Justin K. Thompson" },
        { label: "Формат", value: "Анимационный фильм" },
      ],
      cast: [
        { name: "Майлз Моралес", role: "Человек-паук из своей вселенной" },
        { name: "Гвен Стейси", role: "Паук-Гвен и важная союзница" },
        { name: "Мигель О’Хара", role: "Spider-Man 2099" },
        { name: "Питер Б. Паркер", role: "Опытный наставник" },
        { name: "Пятно", role: "Злодей, который становится опаснее, чем кажется" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 6,
      slug: "avatar-the-way-of-water",
      title: "Аватар: Путь воды",
      originalTitle: "Avatar: The Way of Water",
      searchTitles: ["аватар", "аватар путь воды", "путь воды"],
      type: "Фильм",
      year: "2022",
      rating: 7.6,
      genres: ["Фантастика", "Приключения", "Экшен"],
      poster: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
      description: "Возвращение на Пандору и история семьи Салли.",
      trailerUrl: "https://www.youtube.com/embed/6AvFHlKS6OE",
      longDescription:
        "Джейк Салли и Нейтири строят семью на Пандоре, но старая угроза снова находит их. История уходит к океаническим кланам, где героям приходится учиться новым правилам выживания и защищать близких.",
      facts: [
        { label: "Год", value: "2022" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "192 мин" },
        { label: "Бюджет", value: "$350–460 млн" },
        { label: "Студия", value: "20th Century Studios, Lightstorm" },
        { label: "Режиссёр", value: "James Cameron" },
        { label: "Мир", value: "Пандора" },
      ],
      cast: [
        { name: "Sam Worthington", role: "Джейк Салли" },
        { name: "Zoe Saldaña", role: "Нейтири" },
        { name: "Sigourney Weaver", role: "Кири" },
        { name: "Britain Dalton", role: "Ло’ак" },
        { name: "Kate Winslet", role: "Ронал" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 7,
      slug: "stranger-things",
      title: "Очень странные дела",
      originalTitle: "Stranger Things",
      searchTitles: ["очень странные дела", "странные дела", "странгер тингс"],
      type: "Сериал",
      year: "2016",
      rating: 8.7,
      genres: ["Фантастика", "Ужасы", "Драма"],
      poster: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
      description: "Друзья, тайны маленького города и паранормальные события.",
      trailerUrl: "https://www.youtube.com/embed/b9EkMc79ZSU",
      longDescription:
        "В маленьком городке Хокинс исчезновение мальчика открывает дверь к секретным экспериментам, параллельному миру и очень странным событиям. Сериал смешивает дружбу, подростковые приключения и фантастический хоррор без лишней мрачности.",
      facts: [
        { label: "Год", value: "2016" },
        { label: "Тип", value: "Сериал" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "42–150 мин / серия" },
        { label: "Бюджет", value: "до $30 млн за серию" },
        { label: "Студия", value: "Netflix, 21 Laps" },
        { label: "Создатели", value: "The Duffer Brothers" },
        { label: "Сезонов", value: "4+" },
      ],
      cast: [
        { name: "Милли Бобби Браун", role: "Одиннадцать" },
        { name: "Финн Вулфхард", role: "Майк Уилер" },
        { name: "Ноа Шнапп", role: "Уилл Байерс" },
        { name: "Гейтен Матараццо", role: "Дастин Хендерсон" },
        { name: "Дэвид Харбор", role: "Джим Хоппер" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 8,
      slug: "the-last-of-us",
      title: "Одни из нас",
      originalTitle: "The Last of Us",
      searchTitles: ["одни из нас", "последние из нас", "ласт оф ас"],
      type: "Сериал",
      year: "2023",
      rating: 8.7,
      genres: ["Драма", "Фантастика", "Приключения"],
      poster: "https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",
      description: "История выживания, доверия и опасного путешествия.",
      trailerUrl: "https://www.youtube.com/embed/uLtkt8BonwM",
      longDescription:
        "После глобальной катастрофы контрабандист Джоэл должен провести девочку Элли через опасную страну. Сериал держится на напряжении, доверии и постепенной связи двух людей, которым приходится выживать вместе.",
      facts: [
        { label: "Год", value: "2023" },
        { label: "Тип", value: "Сериал" },
        { label: "Страна", value: "США, Канада" },
        { label: "Длительность", value: "43–81 мин / серия" },
        { label: "Бюджет", value: "более $10 млн за серию" },
        { label: "Студия", value: "HBO, PlayStation Productions" },
        { label: "Создатели", value: "Craig Mazin, Neil Druckmann" },
        { label: "Основа", value: "Игра The Last of Us" },
      ],
      cast: [
        { name: "Pedro Pascal", role: "Джоэл" },
        { name: "Bella Ramsey", role: "Элли" },
        { name: "Anna Torv", role: "Тесс" },
        { name: "Gabriel Luna", role: "Томми" },
        { name: "Merle Dandridge", role: "Марлин" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 9,
      slug: "wednesday",
      title: "Уэнсдей",
      originalTitle: "Wednesday",
      searchTitles: ["уэнсдей", "венсдей", "уенздей", "венздей", "среда"],
      type: "Сериал",
      year: "2022",
      rating: 8.1,
      genres: ["Комедия", "Мистика", "Фэнтези"],
      poster: "https://image.tmdb.org/t/p/w500/jeGtaMwGxPmQN5xM4ClnwPQcNQz.jpg",
      description: "Мрачная, ироничная история Уэнсдей Аддамс.",
      trailerUrl: "https://www.youtube.com/embed/Q73UhUTs6y0",
      longDescription:
        "Уэнсдей Аддамс поступает в академию Невермор и быстро оказывается в центре загадочного расследования. Её холодная логика, сарказм и странные видения превращают школьную историю в мистический детектив.",
      facts: [
        { label: "Год", value: "2022" },
        { label: "Тип", value: "Сериал" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "47–59 мин / серия" },
        { label: "Бюджет", value: "не раскрыт" },
        { label: "Студия", value: "Netflix, MGM Television" },
        { label: "Создатели", value: "Alfred Gough, Miles Millar" },
        { label: "Настроение", value: "Мистика, чёрный юмор, детектив" },
      ],
      cast: [
        { name: "Jenna Ortega", role: "Уэнсдей Аддамс" },
        { name: "Emma Myers", role: "Энид Синклер" },
        { name: "Catherine Zeta-Jones", role: "Мортиша Аддамс" },
        { name: "Luis Guzmán", role: "Гомес Аддамс" },
        { name: "Gwendoline Christie", role: "Лариса Уимс" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 10,
      slug: "house-of-the-dragon",
      title: "Дом дракона",
      originalTitle: "House of the Dragon",
      searchTitles: ["дом дракона", "драконы", "таргариены", "дом таргариенов"],
      type: "Сериал",
      year: "2022",
      rating: 8.4,
      genres: ["Фэнтези", "Драма", "Приключения"],
      poster: "https://image.tmdb.org/t/p/w500/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg",
      description: "История дома Таргариенов до событий Игры престолов.",
      trailerUrl: "https://www.youtube.com/embed/DotnJ7tTA34",
      longDescription:
        "История дома Таргариенов показывает борьбу за наследование Железного трона задолго до событий Игры престолов. Семейные союзы, амбиции и драконы постепенно превращают дворцовый конфликт в большую войну.",
      facts: [
        { label: "Год", value: "2022" },
        { label: "Тип", value: "Сериал" },
        { label: "Страна", value: "США, Великобритания" },
        { label: "Длительность", value: "54–68 мин / серия" },
        { label: "Бюджет", value: "до $20 млн за серию" },
        { label: "Студия", value: "HBO" },
        { label: "Создатели", value: "Ryan Condal, George R. R. Martin" },
        { label: "Мир", value: "Вестерос" },
      ],
      cast: [
        { name: "Emma D’Arcy", role: "Рейнира Таргариен" },
        { name: "Matt Smith", role: "Деймон Таргариен" },
        { name: "Olivia Cooke", role: "Алисента Хайтауэр" },
        { name: "Paddy Considine", role: "Визерис I" },
        { name: "Ewan Mitchell", role: "Эймонд Таргариен" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 11,
      slug: "breaking-bad",
      title: "Во все тяжкие",
      originalTitle: "Breaking Bad",
      searchTitles: ["во все тяжкие", "брейкинг бэд", "брейкинг бед"],
      type: "Сериал",
      year: "2008",
      rating: 9.5,
      genres: ["Драма", "Криминал", "Триллер"],
      poster: "https://image.tmdb.org/t/p/w500/3xnWaLQjelJDDF7LT1WBo6f4BRe.jpg",
      description: "Один из самых известных криминальных сериалов.",
      trailerUrl: "https://www.youtube.com/embed/HhesaQXLuRY",
      longDescription:
        "Учитель химии Уолтер Уайт получает тяжёлый диагноз и решает заработать для семьи незаконным способом. Его путь от отчаяния к власти становится одной из самых напряжённых криминальных историй на телевидении.",
      facts: [
        { label: "Год", value: "2008" },
        { label: "Тип", value: "Сериал" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "47 мин / серия" },
        { label: "Бюджет", value: "около $3 млн за серию" },
        { label: "Студия", value: "AMC, Sony Pictures Television" },
        { label: "Создатель", value: "Vince Gilligan" },
        { label: "Сезонов", value: "5" },
      ],
      cast: [
        { name: "Bryan Cranston", role: "Уолтер Уайт" },
        { name: "Aaron Paul", role: "Джесси Пинкман" },
        { name: "Anna Gunn", role: "Скайлер Уайт" },
        { name: "Dean Norris", role: "Хэнк Шрейдер" },
        { name: "Bob Odenkirk", role: "Сол Гудман" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 12,
      slug: "game-of-thrones",
      title: "Игра престолов",
      originalTitle: "Game of Thrones",
      searchTitles: ["игра престолов", "престолы", "гейм оф тронс"],
      type: "Сериал",
      year: "2011",
      rating: 9.2,
      genres: ["Фэнтези", "Драма", "Приключения"],
      poster: "https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
      description: "Борьба за власть, интриги и великие дома Вестероса.",
      trailerUrl: "https://www.youtube.com/embed/KYKpcWuZDYs",
      longDescription:
        "Вестерос живёт интригами, войнами и борьбой великих домов за Железный трон. Пока люди делят власть, за Стеной поднимается угроза, перед которой политические амбиции выглядят подозрительно мелкими.",
      facts: [
        { label: "Год", value: "2011" },
        { label: "Тип", value: "Сериал" },
        { label: "Страна", value: "США, Великобритания" },
        { label: "Длительность", value: "50–80 мин / серия" },
        { label: "Бюджет", value: "$6–15 млн за серию" },
        { label: "Студия", value: "HBO" },
        { label: "Создатели", value: "David Benioff, D. B. Weiss" },
        { label: "Сезонов", value: "8" },
      ],
      cast: [
        { name: "Kit Harington", role: "Джон Сноу" },
        { name: "Emilia Clarke", role: "Дейенерис Таргариен" },
        { name: "Peter Dinklage", role: "Тирион Ланнистер" },
        { name: "Maisie Williams", role: "Арья Старк" },
        { name: "Lena Headey", role: "Серсея Ланнистер" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 13,
      slug: "attack-on-titan",
      title: "Атака титанов",
      originalTitle: "Attack on Titan",
      searchTitles: ["атака титанов", "атака титан", "титаны", "шингеки"],
      type: "Аниме",
      year: "2013",
      rating: 9.1,
      genres: ["Аниме", "Экшен", "Драма"],
      poster: "https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg",
      description: "Люди против гигантов и большая тайна за стенами.",
      trailerUrl: "https://www.youtube.com/embed/3xNH23QkNpk",
      longDescription:
        "Люди живут за огромными стенами, защищаясь от титанов. Когда стены перестают быть гарантией безопасности, Эрен, Микаса и Армин оказываются в истории, где враг не всегда так прост, как кажется.",
      facts: [
        { label: "Год", value: "2013" },
        { label: "Тип", value: "Аниме" },
        { label: "Страна", value: "Япония" },
        { label: "Длительность", value: "24 мин / серия" },
        { label: "Бюджет", value: "не раскрыт" },
        { label: "Студия", value: "Wit Studio, MAPPA" },
        { label: "Автор", value: "Hajime Isayama" },
        { label: "Оригинал", value: "Манга Shingeki no Kyojin" },
      ],
      cast: [
        { name: "Эрен Йегер", role: "Солдат, одержимый свободой" },
        { name: "Микаса Аккерман", role: "Защитница и один из сильнейших бойцов" },
        { name: "Армин Арлерт", role: "Стратег и голос разума" },
        { name: "Леви Аккерман", role: "Капитан разведкорпуса" },
        { name: "Райнер Браун", role: "Воин с тяжёлой тайной" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 14,
      slug: "demon-slayer",
      title: "Истребитель демонов",
      originalTitle: "Demon Slayer",
      searchTitles: [
        "клинок рассекающий демонов",
        "клинок",
        "демон слейер",
        "истребитель демонов",
      ],
      type: "Аниме",
      year: "2019",
      rating: 8.6,
      genres: ["Аниме", "Экшен", "Фэнтези"],
      poster: "https://image.tmdb.org/t/p/w500/1IMWXXlET7jWahhPbXcBwZxgyqe.jpg",
      description: "История Танджиро и его пути охотника на демонов.",
      trailerUrl: "https://www.youtube.com/embed/VQGCKyvzIM4",
      longDescription:
        "Танджиро Камадо теряет семью и отправляется в путь, чтобы помочь сестре Нэдзуко. Аниме сочетает красивую боевую постановку, семейную мотивацию и историю о стойкости даже перед невозможным.",
      facts: [
        { label: "Год", value: "2019" },
        { label: "Тип", value: "Аниме" },
        { label: "Страна", value: "Япония" },
        { label: "Длительность", value: "23 мин / серия" },
        { label: "Бюджет", value: "не раскрыт" },
        { label: "Студия", value: "ufotable" },
        { label: "Автор", value: "Koyoharu Gotouge" },
        { label: "Оригинал", value: "Манга Kimetsu no Yaiba" },
      ],
      cast: [
        { name: "Танджиро Камадо", role: "Охотник на демонов с добрым сердцем" },
        { name: "Нэдзуко Камадо", role: "Сестра Танджиро" },
        { name: "Зеницу Агацума", role: "Тревожный, но талантливый мечник" },
        { name: "Иносукэ Хашибира", role: "Дикий и прямолинейный боец" },
        { name: "Гию Томиока", role: "Хашира воды" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 15,
      slug: "your-name",
      title: "Твоё имя",
      originalTitle: "Your Name",
      searchTitles: ["твое имя", "твоё имя", "киминокава", "кими но на ва"],
      type: "Аниме",
      year: "2016",
      rating: 8.4,
      genres: ["Аниме", "Романтика", "Драма"],
      poster: "https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6babgKnONONX.jpg",
      description: "Красивая история о связи двух людей через расстояние.",
      trailerUrl: "https://www.youtube.com/embed/xU47nhruN-Q",
      longDescription:
        "Мицуха и Таки неожиданно начинают обмениваться телами, хотя живут в разных местах и почти не знают друг друга. Из лёгкой фантазии история постепенно превращается в эмоциональную драму о времени, памяти и связи.",
      facts: [
        { label: "Год", value: "2016" },
        { label: "Тип", value: "Аниме" },
        { label: "Страна", value: "Япония" },
        { label: "Длительность", value: "107 мин" },
        { label: "Бюджет", value: "около $3,7 млн" },
        { label: "Студия", value: "CoMix Wave Films" },
        { label: "Режиссёр", value: "Makoto Shinkai" },
        { label: "Формат", value: "Полнометражное аниме" },
      ],
      cast: [
        { name: "Мицуха Миямидзу", role: "Девушка из горного городка" },
        { name: "Таки Татибана", role: "Школьник из Токио" },
        { name: "Тэсси", role: "Друг Мицухи" },
        { name: "Саяка", role: "Подруга Мицухи" },
        { name: "Хитоha Миямидзу", role: "Бабушка Мицухи" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 16,
      slug: "naruto",
      title: "Наруто",
      originalTitle: "Naruto",
      searchTitles: ["наруто", "наруто узумаки", "uzumaki naruto"],
      type: "Аниме",
      year: "2002",
      rating: 8.4,
      genres: ["Аниме", "Экшен", "Приключения"],
      poster: "https://image.tmdb.org/t/p/w500/vauCEnR7CiyBDzRCeElKkCaXIYu.jpg",
      description: "История юного ниндзя, который мечтает стать Хокаге.",
      trailerUrl: "https://www.youtube.com/embed/-G9BqkgZXRA",
      longDescription:
        "Наруто Узумаки мечтает стать Хокаге, хотя многие в деревне относятся к нему настороженно. Это длинная история о дружбе, упорстве, командной работе и желании доказать, что прошлое не обязано определять будущее.",
      facts: [
        { label: "Год", value: "2002" },
        { label: "Тип", value: "Аниме" },
        { label: "Страна", value: "Япония" },
        { label: "Длительность", value: "23 мин / серия" },
        { label: "Бюджет", value: "не раскрыт" },
        { label: "Студия", value: "Pierrot" },
        { label: "Автор", value: "Masashi Kishimoto" },
        { label: "Оригинал", value: "Манга Naruto" },
      ],
      cast: [
        { name: "Наруто Узумаки", role: "Ниндзя, который хочет стать Хокаге" },
        { name: "Саске Учиха", role: "Талантливый соперник и товарищ" },
        { name: "Сакура Харуно", role: "Участница команды 7" },
        { name: "Какаши Хатаке", role: "Наставник команды 7" },
        { name: "Ирука Умино", role: "Первый учитель, поверивший в Наруто" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 17,
      slug: "planet-earth-ii",
      title: "Планета Земля 2",
      originalTitle: "Planet Earth II",
      searchTitles: ["планета земля", "планета земля 2", "земля 2", "природа"],
      type: "Документальный",
      year: "2016",
      rating: 9.5,
      genres: ["Документальный", "Природа"],
      poster: "https://image.tmdb.org/t/p/w500/5maYKYzWpE68ycxGh1luu4P2LOS.jpg",
      description: "Документальный проект о природе и жизни на Земле.",
      trailerUrl: "https://www.youtube.com/embed/c8aFcHFu8QM",
      longDescription:
        "Документальный проект показывает разные уголки Земли с редкой близостью к природе. Каждая серия раскрывает экосистемы, где жизнь выглядит как самый дорогой спецэффект — только без CGI и с очень терпеливыми операторами.",
      facts: [
        { label: "Год", value: "2016" },
        { label: "Тип", value: "Документальный" },
        { label: "Страна", value: "Великобритания" },
        { label: "Длительность", value: "50 мин / серия" },
        { label: "Бюджет", value: "не раскрыт" },
        { label: "Студия", value: "BBC Natural History Unit" },
        { label: "Рассказчик", value: "David Attenborough" },
        { label: "Серий", value: "6" },
      ],
      cast: [
        { name: "David Attenborough", role: "Рассказчик" },
        { name: "Команда BBC Earth", role: "Съёмочная группа" },
        { name: "Дикая природа", role: "Главный герой проекта" },
        { name: "Острова, горы и джунгли", role: "Ключевые локации" },
        { name: "Планета Земля", role: "Общий фокус истории" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 18,
      slug: "our-planet",
      title: "Наша планета",
      originalTitle: "Our Planet",
      searchTitles: ["наша планета", "планета", "природа"],
      type: "Документальный",
      year: "2019",
      rating: 9.2,
      genres: ["Документальный", "Природа"],
      poster: "https://image.tmdb.org/t/p/w500/wRSnArnQBmeUYb5GWDU595bGsBr.jpg",
      description: "Красивый документальный сериал о планете и её экосистемах.",
      trailerUrl: "https://www.youtube.com/embed/0_pu6A5YG1o",
      longDescription:
        "Сериал исследует красоту и хрупкость природного мира, показывая разные экосистемы планеты. Это документальное путешествие о животных, климате и будущем, которое зависит от решений людей.",
      facts: [
        { label: "Год", value: "2019" },
        { label: "Тип", value: "Документальный" },
        { label: "Страна", value: "Великобритания" },
        { label: "Длительность", value: "48–53 мин / серия" },
        { label: "Бюджет", value: "не раскрыт" },
        { label: "Студия", value: "Silverback Films, Netflix" },
        { label: "Рассказчик", value: "David Attenborough" },
        { label: "Серий", value: "8" },
      ],
      cast: [
        { name: "David Attenborough", role: "Рассказчик" },
        { name: "Silverback Films", role: "Съёмочная команда" },
        { name: "Океаны, леса и ледники", role: "Ключевые миры проекта" },
        { name: "Дикие животные", role: "Главные участники" },
        { name: "Земля", role: "Главная тема сериала" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 19,
      slug: "the-social-dilemma",
      title: "Социальная дилемма",
      originalTitle: "The Social Dilemma",
      searchTitles: [
        "социальная дилемма",
        "соц дилемма",
        "социальные сети",
        "дилемма",
      ],
      type: "Документальный",
      year: "2020",
      rating: 7.6,
      genres: ["Документальный", "Технологии"],
      poster: "https://upload.wikimedia.org/wikipedia/en/2/27/Social_dilemma_xlg.jpg",
      description: "Документальная история о влиянии соцсетей на людей.",
      trailerUrl: "https://www.youtube.com/embed/uaaC57tcci0",
      longDescription:
        "Документальный фильм разбирает, как социальные платформы удерживают внимание и влияют на поведение пользователей. Это не страшилка про технологии, а повод внимательнее смотреть на алгоритмы, которые каждый день смотрят на нас в ответ.",
      facts: [
        { label: "Год", value: "2020" },
        { label: "Тип", value: "Документальный" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "94 мин" },
        { label: "Бюджет", value: "не раскрыт" },
        { label: "Студия", value: "Exposure Labs, Netflix" },
        { label: "Режиссёр", value: "Jeff Orlowski" },
        { label: "Темы", value: "Соцсети, алгоритмы, внимание" },
      ],
      cast: [
        { name: "Tristan Harris", role: "Бывший специалист Google и эксперт по этике технологий" },
        { name: "Jaron Lanier", role: "Технологический эксперт и автор" },
        { name: "Shoshana Zuboff", role: "Исследовательница цифровой экономики" },
        { name: "Tim Kendall", role: "Бывший руководитель Pinterest" },
        { name: "Эксперты индустрии", role: "Участники интервью" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 20,
      slug: "inception",
      title: "Начало",
      originalTitle: "Inception",
      searchTitles: ["начало", "инсепшн", "сны", "сон"],
      type: "Фильм",
      year: "2010",
      rating: 8.8,
      genres: ["Фантастика", "Экшен", "Триллер"],
      poster: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
      description:
        "Команда специалистов проникает в сны, где идея может стать оружием.",
      trailerUrl: "https://www.youtube.com/embed/YoHD9XEInc0",
      longDescription:
        "Дом Кобб и его команда умеют проникать в сны и извлекать идеи. Новая миссия требует сделать обратное — внедрить мысль так глубоко, чтобы человек считал её собственной.",
      facts: [
        { label: "Год", value: "2010" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США, Великобритания" },
        { label: "Длительность", value: "148 мин" },
        { label: "Бюджет", value: "$160 млн" },
        { label: "Студия", value: "Warner Bros., Legendary, Syncopy" },
        { label: "Режиссёр", value: "Christopher Nolan" },
        { label: "Темы", value: "Сны, память, вина" },
      ],
      cast: [
        { name: "Leonardo DiCaprio", role: "Дом Кобб" },
        { name: "Joseph Gordon-Levitt", role: "Артур" },
        { name: "Elliot Page", role: "Ариадна" },
        { name: "Tom Hardy", role: "Имс" },
        { name: "Marion Cotillard", role: "Мол" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 21,
      slug: "the-matrix",
      title: "Матрица",
      originalTitle: "The Matrix",
      searchTitles: ["матрица", "нео", "морфеус"],
      type: "Фильм",
      year: "1999",
      rating: 8.7,
      genres: ["Фантастика", "Экшен"],
      poster: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
      description:
        "Киберпанк-классика о реальности, свободе выбора и красной таблетке.",
      trailerUrl: "https://www.youtube.com/embed/vKQi3bBA1y8",
      longDescription:
        "Хакер Нео узнаёт, что привычная реальность может быть всего лишь системой контроля. Вместе с Морфеусом и Тринити он выходит за пределы иллюзии и сталкивается с вопросом выбора.",
      facts: [
        { label: "Год", value: "1999" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США, Австралия" },
        { label: "Длительность", value: "136 мин" },
        { label: "Бюджет", value: "$63 млн" },
        { label: "Студия", value: "Warner Bros." },
        { label: "Режиссёры", value: "Lana Wachowski, Lilly Wachowski" },
        { label: "Темы", value: "Свобода, реальность, выбор" },
      ],
      cast: [
        { name: "Keanu Reeves", role: "Нео" },
        { name: "Carrie-Anne Moss", role: "Тринити" },
        { name: "Laurence Fishburne", role: "Морфеус" },
        { name: "Hugo Weaving", role: "Агент Смит" },
        { name: "Gloria Foster", role: "Пифия" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 22,
      slug: "mad-max-fury-road",
      title: "Безумный Макс: Дорога ярости",
      originalTitle: "Mad Max: Fury Road",
      searchTitles: ["безумный макс", "дорога ярости", "макс"],
      type: "Фильм",
      year: "2015",
      rating: 8.1,
      genres: ["Экшен", "Приключения", "Фантастика"],
      poster: "https://image.tmdb.org/t/p/w500/hA2ple9q4qnwxp3hKVNhroipsir.jpg",
      description: "Пыль, скорость и безумная погоня через пустоши.",
      trailerUrl: "https://www.youtube.com/embed/hEJnMQG9ev8",
      longDescription:
        "В постапокалиптической пустоши Макс оказывается втянут в побег Фуриосы и её союзниц. Фильм почти не отпускает педаль газа и превращает дорогу в историю о свободе и выживании.",
      facts: [
        { label: "Год", value: "2015" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "Австралия, США" },
        { label: "Длительность", value: "120 мин" },
        { label: "Бюджет", value: "$150 млн" },
        { label: "Студия", value: "Warner Bros., Village Roadshow" },
        { label: "Режиссёр", value: "George Miller" },
        { label: "Настроение", value: "Скорость, пыль, адреналин" },
      ],
      cast: [
        { name: "Tom Hardy", role: "Макс Рокатански" },
        { name: "Charlize Theron", role: "Императрица Фуриоса" },
        { name: "Nicholas Hoult", role: "Накс" },
        { name: "Hugh Keays-Byrne", role: "Несмертный Джо" },
        { name: "Zoë Kravitz", role: "Тост" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 23,
      slug: "the-dark-knight",
      title: "Тёмный рыцарь",
      originalTitle: "The Dark Knight",
      searchTitles: ["темный рыцарь", "тёмный рыцарь", "джокер", "бетмен"],
      type: "Фильм",
      year: "2008",
      rating: 9.0,
      genres: ["Экшен", "Криминал", "Драма"],
      poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
      description:
        "Готэм сталкивается с хаосом, который невозможно просто арестовать.",
      trailerUrl: "https://www.youtube.com/embed/EXeTwQWrcwY",
      longDescription:
        "Бэтмен, Гордон и Харви Дент пытаются очистить Готэм от преступности, но Джокер превращает город в проверку моральных границ. Это супергеройский фильм, который играет по правилам криминальной драмы.",
      facts: [
        { label: "Год", value: "2008" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США, Великобритания" },
        { label: "Длительность", value: "152 мин" },
        { label: "Бюджет", value: "$185 млн" },
        { label: "Студия", value: "Warner Bros., Legendary, DC" },
        { label: "Режиссёр", value: "Christopher Nolan" },
        { label: "Настроение", value: "Криминальная драма, хаос, выбор" },
      ],
      cast: [
        { name: "Christian Bale", role: "Брюс Уэйн / Бэтмен" },
        { name: "Heath Ledger", role: "Джокер" },
        { name: "Aaron Eckhart", role: "Харви Дент" },
        { name: "Gary Oldman", role: "Джеймс Гордон" },
        { name: "Michael Caine", role: "Альфред" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 24,
      slug: "blade-runner-2049",
      title: "Бегущий по лезвию 2049",
      originalTitle: "Blade Runner 2049",
      searchTitles: ["бегущий по лезвию", "бегущий по лезвию 2049", "репликанты"],
      type: "Фильм",
      year: "2017",
      rating: 8.0,
      genres: ["Фантастика", "Драма", "Триллер"],
      poster: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
      description:
        "Медленная, стильная и холодная фантастика о памяти и личности.",
      trailerUrl: "https://www.youtube.com/embed/gCcx85zbxz4",
      longDescription:
        "Офицер K раскрывает тайну, способную изменить баланс между людьми и репликантами. Его расследование приводит к Рику Декарду и вопросу, что вообще делает личность настоящей.",
      facts: [
        { label: "Год", value: "2017" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США, Канада, Венгрия" },
        { label: "Длительность", value: "164 мин" },
        { label: "Бюджет", value: "$150–185 млн" },
        { label: "Студия", value: "Warner Bros., Alcon Entertainment" },
        { label: "Режиссёр", value: "Denis Villeneuve" },
        { label: "Настроение", value: "Неонуар, меланхолия, киберпанк" },
      ],
      cast: [
        { name: "Ryan Gosling", role: "K" },
        { name: "Harrison Ford", role: "Рик Декард" },
        { name: "Ana de Armas", role: "Джой" },
        { name: "Sylvia Hoeks", role: "Лав" },
        { name: "Jared Leto", role: "Ниандер Уоллес" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 25,
      slug: "top-gun-maverick",
      title: "Топ Ган: Мэверик",
      originalTitle: "Top Gun: Maverick",
      searchTitles: ["топ ган", "мэверик", "маверик", "лучший стрелок"],
      type: "Фильм",
      year: "2022",
      rating: 8.2,
      genres: ["Экшен", "Драма"],
      poster: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
      description: "Возвращение легендарного пилота и зрелищные воздушные сцены.",
      trailerUrl: "https://www.youtube.com/embed/giXco2jaZ_4",
      longDescription:
        "Пит Митчелл возвращается в программу Top Gun, чтобы подготовить молодых пилотов к опасной миссии. Старые решения, новые ученики и полёты на пределе делают историю одновременно зрелищной и личной.",
      facts: [
        { label: "Год", value: "2022" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "130 мин" },
        { label: "Бюджет", value: "$170–177 млн" },
        { label: "Студия", value: "Paramount Pictures, Skydance" },
        { label: "Режиссёр", value: "Joseph Kosinski" },
        { label: "Темы", value: "Наставничество, риск, команда" },
      ],
      cast: [
        { name: "Tom Cruise", role: "Пит «Мэверик» Митчелл" },
        { name: "Miles Teller", role: "Брэдли «Рустер» Брэдшоу" },
        { name: "Jennifer Connelly", role: "Пенни Бенджамин" },
        { name: "Glen Powell", role: "Джейк «Хэнгман» Серезин" },
        { name: "Val Kilmer", role: "Том «Айсмен» Казански" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 26,
      slug: "arrival",
      title: "Прибытие",
      originalTitle: "Arrival",
      searchTitles: ["прибытие", "arrival", "пришельцы", "язык пришельцев"],
      type: "Фильм",
      year: "2016",
      rating: 7.9,
      genres: ["Фантастика", "Драма"],
      poster: "https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
      description:
        "Контакт с внеземной цивилизацией превращается в загадку языка и времени.",
      trailerUrl: "https://www.youtube.com/embed/tFMo3UJ4B4g",
      longDescription:
        "Когда на Землю прибывают загадочные корабли, лингвист Луиза Бэнкс пытается понять язык пришельцев. Чем глубже она погружается в коммуникацию, тем сильнее меняется её восприятие времени и выбора.",
      facts: [
        { label: "Год", value: "2016" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США, Канада" },
        { label: "Длительность", value: "116 мин" },
        { label: "Бюджет", value: "$47 млн" },
        { label: "Студия", value: "Paramount Pictures, FilmNation" },
        { label: "Режиссёр", value: "Denis Villeneuve" },
        { label: "Темы", value: "Язык, время, контакт" },
      ],
      cast: [
        { name: "Amy Adams", role: "Луиза Бэнкс" },
        { name: "Jeremy Renner", role: "Иэн Доннелли" },
        { name: "Forest Whitaker", role: "Полковник Вебер" },
        { name: "Michael Stuhlbarg", role: "Агент Халперн" },
        { name: "Эбботт и Костелло", role: "Пришельцы-гептаподы" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 27,
      slug: "tenet",
      title: "Довод",
      originalTitle: "Tenet",
      searchTitles: ["довод", "tenet", "время", "инверсия"],
      type: "Фильм",
      year: "2020",
      rating: 7.3,
      genres: ["Фантастика", "Экшен", "Триллер"],
      poster: "https://image.tmdb.org/t/p/w500/aCIFMriQh8rvhxpN1IWGgvH0Tlg.jpg",
      description:
        "Шпионский экшен, где время работает не так, как привык зритель.",
      trailerUrl: "https://www.youtube.com/embed/LdOM0x0XDMo",
      longDescription:
        "Безымянный агент попадает в мир инверсии времени, где действия могут идти вперёд и назад одновременно. Миссия превращается в шпионскую головоломку, где причина и следствие не всегда стоят в привычном порядке.",
      facts: [
        { label: "Год", value: "2020" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США, Великобритания" },
        { label: "Длительность", value: "150 мин" },
        { label: "Бюджет", value: "$200 млн" },
        { label: "Студия", value: "Warner Bros., Syncopy" },
        { label: "Режиссёр", value: "Christopher Nolan" },
        { label: "Темы", value: "Время, шпионаж, инверсия" },
      ],
      cast: [
        { name: "John David Washington", role: "Протагонист" },
        { name: "Robert Pattinson", role: "Нил" },
        { name: "Elizabeth Debicki", role: "Кэт" },
        { name: "Kenneth Branagh", role: "Андрей Сатор" },
        { name: "Dimple Kapadia", role: "Прия" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 28,
      slug: "edge-of-tomorrow",
      title: "Грань будущего",
      originalTitle: "Edge of Tomorrow",
      searchTitles: [
        "грань будущего",
        "edge of tomorrow",
        "день сурка",
        "будущее",
      ],
      type: "Фильм",
      year: "2014",
      rating: 7.9,
      genres: ["Фантастика", "Экшен"],
      poster: "https://image.tmdb.org/t/p/w500/uUHvlkLavotfGsNtosDy8ShsIYF.jpg",
      description:
        "Солдат снова и снова проживает один день, чтобы найти путь к победе.",
      trailerUrl: "https://www.youtube.com/embed/yUmSVcttXnI",
      longDescription:
        "Майор Кейдж попадает во временную петлю и снова переживает один и тот же день битвы. Каждая попытка становится тренировкой, а союз с Ритой Вратаски — шансом найти слабое место противника.",
      facts: [
        { label: "Год", value: "2014" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США, Канада" },
        { label: "Длительность", value: "113 мин" },
        { label: "Бюджет", value: "$178 млн" },
        { label: "Студия", value: "Warner Bros., Village Roadshow" },
        { label: "Режиссёр", value: "Doug Liman" },
        { label: "Темы", value: "Петля времени, война, рост героя" },
      ],
      cast: [
        { name: "Tom Cruise", role: "Уильям Кейдж" },
        { name: "Emily Blunt", role: "Рита Вратаски" },
        { name: "Bill Paxton", role: "Сержант Фаррелл" },
        { name: "Brendan Gleeson", role: "Генерал Бригам" },
        { name: "Noah Taylor", role: "Доктор Картер" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 29,
      slug: "john-wick-chapter-4",
      title: "Джон Уик 4",
      originalTitle: "John Wick: Chapter 4",
      searchTitles: ["джон уик", "джон вик", "уик 4", "wick"],
      type: "Фильм",
      year: "2023",
      rating: 7.7,
      genres: ["Экшен", "Криминал", "Триллер"],
      poster: "https://image.tmdb.org/t/p/w500/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg",
      description:
        "Стильный боевик о человеке, которому лучше не мешать отдыхать.",
      trailerUrl: "https://www.youtube.com/embed/qEVUtrk8_B4",
      longDescription:
        "Джон Уик ищет путь к свободе от Высокого стола, но каждый шаг открывает новых врагов и старые долги. Четвёртая глава делает ставку на стиль, правила мира киллеров и почти балетную боевую постановку.",
      facts: [
        { label: "Год", value: "2023" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "169 мин" },
        { label: "Бюджет", value: "$100 млн" },
        { label: "Студия", value: "Lionsgate, Thunder Road" },
        { label: "Режиссёр", value: "Chad Stahelski" },
        { label: "Настроение", value: "Неон, дуэли, экшен" },
      ],
      cast: [
        { name: "Keanu Reeves", role: "Джон Уик" },
        { name: "Donnie Yen", role: "Кейн" },
        { name: "Bill Skarsgård", role: "Маркиз де Грамон" },
        { name: "Hiroyuki Sanada", role: "Симадзу" },
        { name: "Ian McShane", role: "Уинстон" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 30,
      slug: "the-prestige",
      title: "Престиж",
      originalTitle: "The Prestige",
      searchTitles: ["престиж", "the prestige", "фокусники", "магия"],
      type: "Фильм",
      year: "2006",
      rating: 8.5,
      genres: ["Драма", "Триллер", "Фантастика"],
      poster: "https://image.tmdb.org/t/p/w500/bdN3gXuIZYaJP7ftKK2sU0nPtEA.jpg",
      description: "Соперничество двух иллюзионистов превращается в одержимость.",
      trailerUrl: "https://www.youtube.com/embed/o4gHCmTQDVI",
      longDescription:
        "Два иллюзиониста превращают профессиональное соперничество в опасную одержимость. Каждый трюк требует жертвы, а настоящая тайна оказывается не только на сцене, но и в том, что герои готовы скрывать.",
      facts: [
        { label: "Год", value: "2006" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США, Великобритания" },
        { label: "Длительность", value: "130 мин" },
        { label: "Бюджет", value: "$40 млн" },
        { label: "Студия", value: "Warner Bros., Touchstone, Syncopy" },
        { label: "Режиссёр", value: "Christopher Nolan" },
        { label: "Темы", value: "Одержимость, тайна, цена успеха" },
      ],
      cast: [
        { name: "Hugh Jackman", role: "Роберт Энжиер" },
        { name: "Christian Bale", role: "Альфред Борден" },
        { name: "Michael Caine", role: "Каттер" },
        { name: "Scarlett Johansson", role: "Оливия" },
        { name: "David Bowie", role: "Никола Тесла" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 31,
      slug: "gravity",
      title: "Гравитация",
      originalTitle: "Gravity",
      searchTitles: ["гравитация", "gravity", "космос"],
      type: "Фильм",
      year: "2013",
      rating: 7.7,
      genres: ["Фантастика", "Драма", "Триллер"],
      poster: "https://image.tmdb.org/t/p/w500/kZ2nZw8D681aphje8NJi8EfbL1U.jpg",
      description: "Выживание в космосе, где тишина страшнее любого монстра.",
      trailerUrl: "https://www.youtube.com/embed/OiTiKOy59o4",
      longDescription:
        "После аварии на орбите доктор Райан Стоун пытается выжить в космосе, где каждая ошибка может стать последней. Минималистичная история держит напряжение на расстоянии вытянутого скафандра.",
      facts: [
        { label: "Год", value: "2013" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США, Великобритания, Мексика" },
        { label: "Длительность", value: "91 мин" },
        { label: "Бюджет", value: "$100 млн" },
        { label: "Студия", value: "Warner Bros., Heyday Films" },
        { label: "Режиссёр", value: "Alfonso Cuarón" },
        { label: "Темы", value: "Выживание, космос, одиночество" },
      ],
      cast: [
        { name: "Sandra Bullock", role: "Райан Стоун" },
        { name: "George Clooney", role: "Мэтт Ковальски" },
        { name: "Ed Harris", role: "Голос центра управления" },
        { name: "Орбита Земли", role: "Главная опасная локация" },
        { name: "Космический мусор", role: "Катализатор катастрофы" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 32,
      slug: "the-super-mario-galaxy-movie",
      title: "Супер Марио Галактика в кино",
      originalTitle: "The Super Mario Galaxy Movie",
      searchTitles: [
        "супер марио",
        "марио галактика",
        "super mario galaxy",
        "mario galaxy movie",
        "новинки 2026",
      ],
      type: "Фильм",
      year: "2026",
      rating: 8.1,
      genres: ["Анимация", "Приключения", "Комедия"],
      poster:
        "https://upload.wikimedia.org/wikipedia/en/thumb/b/bf/The_Super_Mario_Galaxy_Movie_poster.jpeg/250px-The_Super_Mario_Galaxy_Movie_poster.jpeg",
      posterFallbacks: [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/The_Super_Mario_Galaxy_Movie_%282026%29_Poster.jpg/1080px-The_Super_Mario_Galaxy_Movie_%282026%29_Poster.jpg",
      ],
      description:
        "Космическое анимационное приключение по миру Super Mario: ярко, быстро и семейно.",
      trailerUrl: "https://www.youtube.com/embed/wJ3S26JMW5M",
      longDescription:
        "Новое анимационное приключение переносит мир Super Mario в космический масштаб. В центре остаются дружба, скорость, яркий визуальный стиль и большая галактическая авантюра для всей семьи.",
      facts: [
        { label: "Год", value: "2026" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США, Япония" },
        { label: "Длительность", value: "будет объявлена" },
        { label: "Бюджет", value: "будет объявлен" },
        { label: "Студия", value: "Illumination, Nintendo" },
        { label: "Дистрибьютор", value: "Universal Pictures" },
        { label: "Формат", value: "Анимационный фильм" },
      ],
      cast: [
        { name: "Марио", role: "Главный герой и мастер прыжков" },
        { name: "Луиджи", role: "Брат Марио и верный союзник" },
        { name: "Принцесса Пич", role: "Лидер Грибного королевства" },
        { name: "Боузер", role: "Главная угроза приключения" },
        { name: "Розалина", role: "Космическая фигура мира Mario" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 33,
      slug: "project-hail-mary",
      title: "Проект “Аве Мария”",
      originalTitle: "Project Hail Mary",
      searchTitles: [
        "проект аве мария",
        "project hail mary",
        "райан гослинг",
        "космос",
        "новинки 2026",
      ],
      type: "Фильм",
      year: "2026",
      rating: 8.4,
      genres: ["Фантастика", "Драма", "Приключения"],
      poster:
        "https://image.tmdb.org/t/p/w500/h5FcFJzoeIjimuGhQ5Dw598T2Vu.jpg",
      posterFallbacks: [
        "https://upload.wikimedia.org/wikipedia/en/3/3b/Project_Hail_Mary_poster.jpg",
        "https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/Project_Hail_Mary_poster.jpg/500px-Project_Hail_Mary_poster.jpg",
      ],
      description:
        "Научно-фантастическая история о миссии, где один человек должен найти шанс для спасения Земли.",
      trailerUrl: "https://www.youtube.com/embed/kZnc7YqBoI8",
      longDescription:
        "Учёный Райланд Грейс просыпается на космическом корабле и постепенно понимает, что от его миссии зависит будущее Земли. Это научная фантастика о разуме, одиночестве и неожиданной дружбе там, где её никто не планировал.",
      facts: [
        { label: "Год", value: "2026" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "будет объявлена" },
        { label: "Бюджет", value: "не раскрыт" },
        { label: "Студия", value: "Amazon MGM Studios" },
        { label: "Режиссёры", value: "Phil Lord, Christopher Miller" },
        { label: "Основа", value: "Роман Andy Weir" },
      ],
      cast: [
        { name: "Ryan Gosling", role: "Райланд Грейс" },
        { name: "Рокки", role: "Неожиданный союзник из космоса" },
        { name: "Ева Стратт", role: "Руководительница кризисной миссии" },
        { name: "Команда проекта", role: "Люди, ищущие шанс для Земли" },
        { name: "Земля", role: "Ставка всей истории" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 34,
      slug: "michael",
      title: "Майкл",
      originalTitle: "Michael",
      searchTitles: [
        "майкл",
        "michael",
        "michael jackson",
        "майкл джексон",
        "биография",
        "новинки 2026",
      ],
      type: "Фильм",
      year: "2026",
      rating: 7.8,
      genres: ["Биография", "Музыка", "Драма"],
      poster:
        "https://upload.wikimedia.org/wikipedia/en/3/37/Michael_%282026_film_poster%29.png",
      posterFallbacks: [
        "https://upload.wikimedia.org/wikipedia/en/thumb/3/37/Michael_%282026_film_poster%29.png/500px-Michael_%282026_film_poster%29.png",
      ],
      description:
        "Музыкальная биографическая драма о сцене, славе и цене большой легенды.",
      trailerUrl: "https://www.youtube.com/embed/3k1vW9iXD_c",
      longDescription:
        "Биографическая драма рассказывает о пути Майкла Джексона, сцене, славе и давлении большой легенды. Фильм делает акцент на музыке, семье и цене публичного успеха.",
      facts: [
        { label: "Год", value: "2026" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "будет объявлена" },
        { label: "Бюджет", value: "не раскрыт" },
        { label: "Студия", value: "Lionsgate, Universal Pictures" },
        { label: "Режиссёр", value: "Antoine Fuqua" },
        { label: "Формат", value: "Музыкальная биография" },
      ],
      cast: [
        { name: "Jaafar Jackson", role: "Майкл Джексон" },
        { name: "Colman Domingo", role: "Джо Джексон" },
        { name: "Nia Long", role: "Кэтрин Джексон" },
        { name: "Miles Teller", role: "Джон Бранка" },
        { name: "Музыкальная сцена", role: "Главное пространство истории" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 35,
      slug: "the-devil-wears-prada-2",
      title: "Дьявол носит Prada 2",
      originalTitle: "The Devil Wears Prada 2",
      searchTitles: [
        "дьявол носит прада",
        "дьявол носит prada 2",
        "the devil wears prada 2",
        "новинки 2026",
      ],
      type: "Фильм",
      year: "2026",
      rating: 7.7,
      genres: ["Драма", "Комедия"],
      poster:
        "https://upload.wikimedia.org/wikipedia/en/9/97/The_Devil_Wears_Prada_2_%28film_poster%29.png",
      posterFallbacks: [
        "https://upload.wikimedia.org/wikipedia/en/thumb/9/97/The_Devil_Wears_Prada_2_%28film_poster%29.png/500px-The_Devil_Wears_Prada_2_%28film_poster%29.png",
      ],
      description:
        "Возвращение в мир моды, редакций и идеального холодного взгляда.",
      trailerUrl: "https://www.youtube.com/embed/7Y4H0lQNTp0",
      longDescription:
        "Продолжение возвращает зрителя в мир модной индустрии, редакций и карьерных решений. Герои снова сталкиваются с амбициями, переменами медиа и тем самым взглядом Миранды, который громче любого дедлайна.",
      facts: [
        { label: "Год", value: "2026" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "будет объявлена" },
        { label: "Бюджет", value: "не раскрыт" },
        { label: "Студия", value: "20th Century Studios" },
        { label: "Режиссёр", value: "David Frankel" },
        { label: "Жанры", value: "Драма, Комедия" },
      ],
      cast: [
        { name: "Meryl Streep", role: "Миранда Пристли" },
        { name: "Anne Hathaway", role: "Энди Сакс" },
        { name: "Emily Blunt", role: "Эмили Чарлтон" },
        { name: "Stanley Tucci", role: "Найджел" },
        { name: "Runway", role: "Модный журнал и поле битвы дедлайнов" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 36,
      slug: "scream-7",
      title: "Крик 7",
      originalTitle: "Scream 7",
      searchTitles: ["крик 7", "scream 7", "ghostface", "ужасы", "новинки 2026"],
      type: "Фильм",
      year: "2026",
      rating: 7.1,
      genres: ["Ужасы", "Триллер"],
      poster:
        "https://upload.wikimedia.org/wikipedia/en/c/c2/Scream_7_%28poster%29.jpg",
      posterFallbacks: [
        "https://image.tmdb.org/t/p/w500/jcejzY3BakzUVvRX3I4bsDQPlTd.jpg",
        "https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/Scream_7_%28poster%29.jpg/500px-Scream_7_%28poster%29.jpg",
      ],
      description:
        "Новая глава слэшера: маска возвращается, а спокойная жизнь снова оказывается слишком подозрительной.",
      trailerUrl: "https://www.youtube.com/embed/4g8OciWNJn4",
      longDescription:
        "Новая глава возвращает Ghostface и знакомую игру с правилами слэшера. История строится вокруг угрозы, подозрений и персонажей, которым снова приходится разбираться, кто скрывается за маской.",
      facts: [
        { label: "Год", value: "2026" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "будет объявлена" },
        { label: "Бюджет", value: "не раскрыт" },
        { label: "Студия", value: "Spyglass Media, Paramount Pictures" },
        { label: "Режиссёр", value: "Kevin Williamson" },
        { label: "Формат", value: "Слэшер" },
      ],
      cast: [
        { name: "Neve Campbell", role: "Сидни Прескотт" },
        { name: "Courteney Cox", role: "Гейл Уэзерс" },
        { name: "Ghostface", role: "Главная угроза" },
        { name: "Новые герои", role: "Следующее поколение жертв и подозреваемых" },
        { name: "Вудсборо", role: "Место, где спокойствие обычно недолгое" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 37,
      slug: "mercy",
      title: "Милосердие",
      originalTitle: "Mercy",
      searchTitles: ["милосердие", "mercy", "фантастический триллер", "новинки 2026"],
      type: "Фильм",
      year: "2026",
      rating: 7.2,
      genres: ["Фантастика", "Экшен", "Триллер"],
      poster:
        "https://upload.wikimedia.org/wikipedia/en/4/43/Mercy_2026_poster.jpeg",
      posterFallbacks: [
        "https://upload.wikimedia.org/wikipedia/en/thumb/4/43/Mercy_2026_poster.jpeg/500px-Mercy_2026_poster.jpeg",
      ],
      description:
        "Фантастический триллер о будущем, где система правосудия стала слишком быстрой.",
      trailerUrl: "https://www.youtube.com/embed/dwpKyuu5D7w",
      longDescription:
        "Фантастический триллер переносит зрителя в будущее, где система правосудия стала слишком быстрой и технологичной. Герою приходится доказывать свою правоту в мире, где ошибка алгоритма может стоить слишком дорого.",
      facts: [
        { label: "Год", value: "2026" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "будет объявлена" },
        { label: "Бюджет", value: "не раскрыт" },
        { label: "Студия", value: "Amazon MGM Studios" },
        { label: "Режиссёр", value: "Timur Bekmambetov" },
        { label: "Жанры", value: "Фантастика, Экшен, Триллер" },
      ],
      cast: [
        { name: "Chris Pratt", role: "Главный герой" },
        { name: "Rebecca Ferguson", role: "Ключевая фигура расследования" },
        { name: "Система правосудия", role: "Главный конфликт будущего" },
        { name: "Обвиняемый", role: "Человек против машины решений" },
        { name: "Город будущего", role: "Локация технологичного триллера" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 38,
      slug: "wonder-man",
      title: "Wonder Man",
      originalTitle: "Wonder Man",
      searchTitles: ["wonder man", "вандер мен", "marvel", "марвел", "новинки 2026"],
      type: "Сериал",
      year: "2026",
      rating: 7.5,
      genres: ["Экшен", "Комедия", "Фантастика"],
      poster:
        "https://cdn.marvel.com/content/2x/call_back_e16_1sheetbusshelter_rd2_v1b_rs_mech4.jpg",
      posterFallbacks: [
        "https://upload.wikimedia.org/wikipedia/en/thumb/b/bd/Wonder_Man_%28TV_series%29_logo.png/500px-Wonder_Man_%28TV_series%29_logo.png",
      ],
      description:
        "Сериал про актёра, супергеройскую роль и момент, когда кастинг становится слишком реальным.",
      trailerUrl: "https://www.youtube.com/embed/wHuWmjXsReU",
      longDescription:
        "Саймон Уильямс оказывается в мире киноиндустрии и супергеройской славы. Сериал обещает смешать Marvel-экшен, сатиру на Голливуд и историю человека, для которого роль может стать реальнее контракта.",
      facts: [
        { label: "Год", value: "2026" },
        { label: "Тип", value: "Сериал" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "будет объявлена" },
        { label: "Бюджет", value: "не раскрыт" },
        { label: "Студия", value: "Marvel Studios" },
        { label: "Создатель", value: "Andrew Guest" },
        { label: "Вселенная", value: "Marvel Cinematic Universe" },
      ],
      cast: [
        { name: "Yahya Abdul-Mateen II", role: "Саймон Уильямс / Wonder Man" },
        { name: "Ben Kingsley", role: "Тревор Слэттери" },
        { name: "Hollywood set", role: "Мир актёрской славы" },
        { name: "Marvel-индустрия", role: "Комедийный фон истории" },
        { name: "Супергеройская роль", role: "Главный поворот сюжета" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 39,
      slug: "star-trek-starfleet-academy",
      title: "Звёздный путь: Академия Звёздного флота",
      originalTitle: "Star Trek: Starfleet Academy",
      searchTitles: [
        "звездный путь академия",
        "звёздный путь академия",
        "star trek starfleet academy",
        "starfleet academy",
        "новинки 2026",
      ],
      type: "Сериал",
      year: "2026",
      rating: 7.6,
      genres: ["Фантастика", "Приключения", "Драма"],
      poster:
        "https://treknews.net/wp-content/uploads/2025/07/SFA_Overhead_PR_Vert_CTA_4x5_1080x1350-819x1024.jpg",
      posterFallbacks: [
        "https://cdn.mos.cms.futurecdn.net/EYiH8Dr2rgCdRP6VxEJZt4.jpg",
        "https://blog.trekcore.com/wp-content/uploads/2025/12/sfa-key-art-cast.jpg",
      ],
      description:
        "Новая группа курсантов учится выживать в академии, дружбе и большой космической ответственности.",
      trailerUrl: "https://www.youtube.com/embed/rHDDzcyNWGs",
      longDescription:
        "Сериал переносит фокус на молодых курсантов Академии Звёздного флота. Им предстоит учиться, ошибаться, дружить и сталкиваться с космическими вызовами, где экзамены иногда выглядят подозрительно похожими на спасение галактики.",
      facts: [
        { label: "Год", value: "2026" },
        { label: "Тип", value: "Сериал" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "будет объявлена" },
        { label: "Бюджет", value: "не раскрыт" },
        { label: "Студия", value: "CBS Studios, Secret Hideout" },
        { label: "Создатели", value: "Alex Kurtzman, Noga Landau" },
        { label: "Вселенная", value: "Star Trek" },
      ],
      cast: [
        { name: "Курсанты Академии", role: "Новая команда Звёздного флота" },
        { name: "Holly Hunter", role: "Капитан и наставница академии" },
        { name: "Paul Giamatti", role: "Сезонный антагонист" },
        { name: "Преподаватели флота", role: "Опытные наставники" },
        { name: "Звёздный флот", role: "Главная система и мечта героев" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 40,
      slug: "the-lion-king-1994",
      title: "Король Лев",
      originalTitle: "The Lion King",
      searchTitles: ["король лев", "симба", "the lion king", "lion king", "дисней", "мультфильмы"],
      type: "Мультфильм",
      year: "1994",
      rating: 8.5,
      genres: ["Анимация", "Приключения", "Семейный", "Музыка", "Драма"],
      poster: "https://upload.wikimedia.org/wikipedia/ru/thumb/6/62/Lion_king_ver1.jpg/330px-Lion_king_ver1.jpg",
      description:
        "Большая история взросления, ответственности и возвращения домой под музыку, которую сложно не подпевать.",
      trailerUrl: "https://www.youtube.com/embed/lFzVJEksoDY",
      longDescription:
        "Юный Симба должен понять, что значит быть наследником, другом и настоящим лидером. Это мультфильм о семье, смелости и выборе, который делает героя героем — без лишнего пафоса, но с очень мощным сердцем.",
      facts: [
        { label: "Год", value: "1994" },
        { label: "Тип", value: "Мультфильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "88 мин" },
        { label: "Бюджет", value: "$45 млн" },
        { label: "Студия", value: "Walt Disney Pictures" },
        { label: "Настроение", value: "Эпично, тепло, музыкально" },
        { label: "Темы", value: "Семья, ответственность, взросление" },
      ],
      cast: [
        { name: "Симба", role: "Юный наследник, который учится быть лидером" },
        { name: "Муфаса", role: "Мудрый король и отец Симбы" },
        { name: "Нала", role: "Смелая подруга Симбы" },
        { name: "Тимон и Пумба", role: "Комедийный дуэт и команда поддержки" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 41,
      slug: "toy-story",
      title: "История игрушек",
      originalTitle: "Toy Story",
      searchTitles: ["история игрушек", "toy story", "вуди", "базз", "пиксар", "мультфильмы"],
      type: "Мультфильм",
      year: "1995",
      rating: 8.3,
      genres: ["Анимация", "Комедия", "Приключения", "Семейный", "Фэнтези"],
      poster: "https://upload.wikimedia.org/wikipedia/ru/thumb/a/a6/Toy_Story_1995_Poster.jpg/250px-Toy_Story_1995_Poster.jpg",
      description:
        "Игрушки оживают, дружба проходит стресс-тест, а ревность получает урок размером с космический скафандр.",
      trailerUrl: "https://www.youtube.com/embed/v-PjgYDrg70",
      longDescription:
        "Вуди всегда был любимой игрушкой Энди, пока в комнате не появился Базз Лайтер. Их соперничество быстро превращается в приключение, где важно не доказать, кто главный, а научиться быть командой.",
      facts: [
        { label: "Год", value: "1995" },
        { label: "Тип", value: "Мультфильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "81 мин" },
        { label: "Бюджет", value: "$30 млн" },
        { label: "Студия", value: "Pixar Animation Studios" },
        { label: "Настроение", value: "Весело, быстро, ностальгично" },
        { label: "Темы", value: "Дружба, ревность, принятие перемен" },
      ],
      cast: [
        { name: "Вуди", role: "Верный ковбой и лидер игрушек" },
        { name: "Базз Лайтер", role: "Космический рейнджер с большим самомнением" },
        { name: "Бо Пип", role: "Спокойная и уверенная союзница" },
        { name: "Мистер Картофельная Голова", role: "Сарказм на ножках" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
      ],
    },
  {
      id: 42,
      slug: "wall-e",
      title: "ВАЛЛ·И",
      originalTitle: "WALL·E",
      searchTitles: ["валли", "валл и", "wall-e", "walle", "робот", "пиксар", "мультфильмы"],
      type: "Мультфильм",
      year: "2008",
      rating: 8.4,
      genres: ["Анимация", "Фантастика", "Приключения", "Семейный", "Романтика"],
      poster: "https://upload.wikimedia.org/wikipedia/ru/c/c4/WALL-E_poster.png",
      description:
        "Маленький робот, большая планета и почти немой мультфильм, который говорит громче многих блокбастеров.",
      trailerUrl: "https://www.youtube.com/embed/CZ1CATNbXg0",
      longDescription:
        "ВАЛЛ·И годами убирает заброшенную Землю и однажды встречает ЕВУ — робота, который меняет его привычный мир. Получается нежная фантастика о заботе, одиночестве и надежде на второй шанс для планеты.",
      facts: [
        { label: "Год", value: "2008" },
        { label: "Тип", value: "Мультфильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "98 мин" },
        { label: "Бюджет", value: "$180 млн" },
        { label: "Студия", value: "Pixar Animation Studios" },
        { label: "Настроение", value: "Трогательно, умно, атмосферно" },
        { label: "Темы", value: "Экология, одиночество, надежда" },
      ],
      cast: [
        { name: "ВАЛЛ·И", role: "Робот-уборщик с огромным сердцем" },
        { name: "ЕВА", role: "Разведывательный робот и новый смысл путешествия" },
        { name: "MO", role: "Робот-чистюля, которому досталась сложная смена" },
        { name: "Капитан", role: "Человек, который заново учится выбирать" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
      ],
    },
  {
      id: 43,
      slug: "shrek",
      title: "Шрэк",
      originalTitle: "Shrek",
      searchTitles: ["шрек", "shrek", "осел", "фиона", "dreamworks", "мультфильмы"],
      type: "Мультфильм",
      year: "2001",
      rating: 7.9,
      genres: ["Анимация", "Комедия", "Приключения", "Семейный", "Фэнтези"],
      poster: "https://upload.wikimedia.org/wikipedia/ru/thumb/3/39/Shrek.jpg/330px-Shrek.jpg",
      description:
        "Сказка, которая пришла в болото, перевернула правила жанра и доказала: герой не обязан быть глянцевым.",
      trailerUrl: "https://www.youtube.com/embed/CwXOrWvPBPk",
      longDescription:
        "Огр Шрэк просто хочет вернуть спокойствие своему болоту, но получает квест с принцессой, говорящим Ослом и кучей сказочных проблем. Это комедия о принятии себя, дружбе и том, что первое впечатление часто ошибается громче всех.",
      facts: [
        { label: "Год", value: "2001" },
        { label: "Тип", value: "Мультфильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "90 мин" },
        { label: "Бюджет", value: "$60 млн" },
        { label: "Студия", value: "DreamWorks Animation" },
        { label: "Настроение", value: "Иронично, смешно, сказочно" },
        { label: "Темы", value: "Самопринятие, дружба, любовь" },
      ],
      cast: [
        { name: "Шрэк", role: "Огр, который ценит тишину и честность" },
        { name: "Осёл", role: "Друг, который говорит больше, чем нужно, но всегда вовремя" },
        { name: "Фиона", role: "Принцесса с характером и собственным секретом" },
        { name: "Лорд Фаркуад", role: "Злодей с большим самомнением" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
      ],
    },
  {
      id: 44,
      slug: "ratatouille",
      title: "Рататуй",
      originalTitle: "Ratatouille",
      searchTitles: ["рататуй", "ratatouille", "реми", "повар", "пиксар", "мультфильмы"],
      type: "Мультфильм",
      year: "2007",
      rating: 8.1,
      genres: ["Анимация", "Комедия", "Семейный", "Драма", "Кулинария"],
      poster: "https://upload.wikimedia.org/wikipedia/ru/thumb/d/d1/Ratatui.jpg/330px-Ratatui.jpg",
      description:
        "Крыса мечтает стать шеф-поваром в Париже. Звучит как хаос, но получается один из самых вкусных мультфильмов.",
      trailerUrl: "https://www.youtube.com/embed/NgsQ8mVkN8w",
      longDescription:
        "Реми обожает готовить, хотя мир не очень готов принять крысу на кухне. Вместе с неуклюжим Лингвини он пытается доказать, что талант может появиться там, где его никто не ждёт.",
      facts: [
        { label: "Год", value: "2007" },
        { label: "Тип", value: "Мультфильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "111 мин" },
        { label: "Бюджет", value: "$150 млн" },
        { label: "Студия", value: "Pixar Animation Studios" },
        { label: "Настроение", value: "Уютно, вдохновляюще, вкусно" },
        { label: "Темы", value: "Мечта, талант, смелость быть собой" },
      ],
      cast: [
        { name: "Реми", role: "Маленький гурман с большим талантом" },
        { name: "Лингвини", role: "Неуклюжий помощник, которому нужен шанс" },
        { name: "Колетт", role: "Профессионал, который держит кухню в форме" },
        { name: "Антон Эго", role: "Критик, чей взгляд решает многое" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
      ],
    },
  {
      id: 45,
      slug: "inside-out",
      title: "Головоломка",
      originalTitle: "Inside Out",
      searchTitles: ["головоломка", "inside out", "радость", "печаль", "эмоции", "пиксар", "мультфильмы"],
      type: "Мультфильм",
      year: "2015",
      rating: 8.1,
      genres: ["Анимация", "Комедия", "Семейный", "Драма", "Фэнтези"],
      poster: "https://upload.wikimedia.org/wikipedia/ru/1/18/%D0%93%D0%BE%D0%BB%D0%BE%D0%B2%D0%BE%D0%BB%D0%BE%D0%BC%D0%BA%D0%B0_2015.jpg",
      description:
        "Путешествие по эмоциям внутри головы, где Радость и Печаль наконец перестают спорить за пульт управления.",
      trailerUrl: "https://www.youtube.com/embed/yRUAzGQ3nSY",
      longDescription:
        "Райли переезжает в новый город, а её эмоции пытаются справиться с переменами. Мультфильм показывает, что грусть — не ошибка системы, а важная часть взросления и понимания себя.",
      facts: [
        { label: "Год", value: "2015" },
        { label: "Тип", value: "Мультфильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "95 мин" },
        { label: "Бюджет", value: "$175 млн" },
        { label: "Студия", value: "Pixar Animation Studios" },
        { label: "Настроение", value: "Добро, умно, эмоционально" },
        { label: "Темы", value: "Эмоции, переезд, взросление" },
      ],
      cast: [
        { name: "Радость", role: "Эмоция, которая хочет всё исправить улыбкой" },
        { name: "Печаль", role: "Эмоция, без которой нельзя понять себя" },
        { name: "Райли", role: "Девочка, которая проходит через большие перемены" },
        { name: "Брезгливость", role: "Внутренний фильтр стиля и подозрительной брокколи" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
      ],
    },
  {
      id: 46,
      slug: "coco",
      title: "Тайна Коко",
      originalTitle: "Coco",
      searchTitles: ["тайна коко", "коко", "coco", "мигель", "музыка", "пиксар", "мультфильмы"],
      type: "Мультфильм",
      year: "2017",
      rating: 8.4,
      genres: ["Анимация", "Музыка", "Семейный", "Приключения", "Фэнтези"],
      poster: "https://upload.wikimedia.org/wikipedia/ru/thumb/d/d7/Coco_%282017_film%29_logo.jpg/330px-Coco_%282017_film%29_logo.jpg",
      description:
        "Музыкальное путешествие в мир памяти, семьи и мечты, после которого слово “прабабушка” звучит особенно тепло.",
      trailerUrl: "https://www.youtube.com/embed/Rvr68u6k5sI",
      longDescription:
        "Мигель мечтает стать музыкантом, хотя в его семье музыка под запретом. Попав в удивительный мир предков, он узнаёт, почему память о близких может быть сильнее времени.",
      facts: [
        { label: "Год", value: "2017" },
        { label: "Тип", value: "Мультфильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "105 мин" },
        { label: "Бюджет", value: "$175–225 млн" },
        { label: "Студия", value: "Pixar Animation Studios" },
        { label: "Настроение", value: "Музыкально, ярко, трогательно" },
        { label: "Темы", value: "Семья, память, мечта" },
      ],
      cast: [
        { name: "Мигель", role: "Мальчик, который хочет играть музыку" },
        { name: "Гектор", role: "Весёлый проводник с важной тайной" },
        { name: "Мама Коко", role: "Сердце семейной истории" },
        { name: "Эрнесто де ла Крус", role: "Кумир, за блеском которого скрыто не всё" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
      ],
    },
  {
      id: 47,
      slug: "how-to-train-your-dragon",
      title: "Как приручить дракона",
      originalTitle: "How to Train Your Dragon",
      searchTitles: ["как приручить дракона", "иккинг", "беззубик", "how to train your dragon", "dreamworks", "мультфильмы"],
      type: "Мультфильм",
      year: "2010",
      rating: 8.1,
      genres: ["Анимация", "Приключения", "Семейный", "Фэнтези", "Экшен"],
      poster: "https://upload.wikimedia.org/wikipedia/ru/thumb/a/a3/How_to_Train_Your_Dragon.jpg/250px-How_to_Train_Your_Dragon.jpg",
      description:
        "Парень-викинг и дракон доказывают деревне, что дружба иногда сильнее традиций и громких топоров.",
      trailerUrl: "https://www.youtube.com/embed/oKiYuIsPxYk",
      longDescription:
        "Иккинг живёт среди викингов, которые привыкли сражаться с драконами. Но встреча с Беззубиком меняет всё: вместо врага он видит живое существо, друга и шанс изменить будущее своего народа.",
      facts: [
        { label: "Год", value: "2010" },
        { label: "Тип", value: "Мультфильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "98 мин" },
        { label: "Бюджет", value: "$165 млн" },
        { label: "Студия", value: "DreamWorks Animation" },
        { label: "Настроение", value: "Приключенчески, тепло, зрелищно" },
        { label: "Темы", value: "Дружба, доверие, смелость" },
      ],
      cast: [
        { name: "Иккинг", role: "Юный викинг, который думает иначе" },
        { name: "Беззубик", role: "Дракон, который становится другом" },
        { name: "Астрид", role: "Сильная и внимательная союзница" },
        { name: "Стоик", role: "Отец Иккинга и вождь деревни" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
      ],
    },
  {
      id: 48,
      slug: "the-shawshank-redemption",
      title: "Побег из Шоушенка",
      originalTitle: "The Shawshank Redemption",
      searchTitles: ["побег из шоушенка", "шоушенк", "shawshank redemption", "shawshank"],
      type: "Фильм",
      year: "1994",
      rating: 9.3,
      genres: ["Драма", "Криминал"],
      poster: "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
      description: "История надежды, дружбы и внутренней свободы за стенами тюрьмы.",
      trailerUrl: "https://www.youtube.com/embed/PLl99DlL6b4",
      longDescription:
        "Банкир Энди Дюфрейн попадает в тюрьму Шоушенк и сталкивается с системой, которая пытается стереть личность. Его спокойствие, ум и дружба с Рэдом превращают мрачную историю в фильм о надежде, которая работает тише, чем молоток, но сильнее стены.",
      facts: [
        { label: "Год", value: "1994" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "142 мин" },
        { label: "Студия", value: "Castle Rock Entertainment" },
        { label: "Режиссёр", value: "Frank Darabont" },
        { label: "Основа", value: "Повесть Stephen King" },
        { label: "Темы", value: "Надежда, дружба, свобода" },
      ],
      cast: [
        { name: "Tim Robbins", role: "Энди Дюфрейн" },
        { name: "Morgan Freeman", role: "Эллис «Рэд» Реддинг" },
        { name: "Bob Gunton", role: "Начальник тюрьмы Нортон" },
        { name: "William Sadler", role: "Хейвуд" },
        { name: "Clancy Brown", role: "Капитан Хэдли" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 49,
      slug: "forrest-gump",
      title: "Форрест Гамп",
      originalTitle: "Forrest Gump",
      searchTitles: ["форрест гамп", "форест гамп", "forrest gump", "гамп"],
      type: "Фильм",
      year: "1994",
      rating: 8.8,
      genres: ["Драма", "Романтика", "Комедия"],
      poster: "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
      description: "Трогательная история человека, который проходит через эпоху с открытым сердцем.",
      trailerUrl: "https://www.youtube.com/embed/bLvqoHBptjg",
      longDescription:
        "Форрест Гамп видит мир проще многих, но именно это помогает ему прожить удивительную жизнь. Он оказывается рядом с большими событиями истории, сохраняет верность близким и доказывает: доброта иногда быстрее любой стратегии.",
      facts: [
        { label: "Год", value: "1994" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "142 мин" },
        { label: "Студия", value: "Paramount Pictures" },
        { label: "Режиссёр", value: "Robert Zemeckis" },
        { label: "Основа", value: "Роман Winston Groom" },
        { label: "Темы", value: "Судьба, любовь, доброта" },
      ],
      cast: [
        { name: "Tom Hanks", role: "Форрест Гамп" },
        { name: "Robin Wright", role: "Дженни Карран" },
        { name: "Gary Sinise", role: "Лейтенант Дэн" },
        { name: "Mykelti Williamson", role: "Бабба" },
        { name: "Sally Field", role: "Миссис Гамп" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 50,
      slug: "the-lord-of-the-rings-the-fellowship-of-the-ring",
      title: "Властелин колец: Братство кольца",
      originalTitle: "The Lord of the Rings: The Fellowship of the Ring",
      searchTitles: ["властелин колец", "братство кольца", "lord of the rings", "fellowship of the ring"],
      type: "Фильм",
      year: "2001",
      rating: 8.9,
      genres: ["Фэнтези", "Приключения", "Драма"],
      poster: "https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg",
      description: "Начало большого путешествия через Средиземье ради уничтожения кольца.",
      trailerUrl: "https://www.youtube.com/embed/V75dMMIW2B4",
      longDescription:
        "Фродо получает кольцо, от которого зависит судьба Средиземья. Вместе с Братством он начинает путь, где дружба, смелость и маленький шаг вперёд оказываются важнее громких титулов и древних пророчеств.",
      facts: [
        { label: "Год", value: "2001" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "Новая Зеландия, США" },
        { label: "Длительность", value: "178 мин" },
        { label: "Студия", value: "New Line Cinema, WingNut Films" },
        { label: "Режиссёр", value: "Peter Jackson" },
        { label: "Основа", value: "Роман J. R. R. Tolkien" },
        { label: "Мир", value: "Средиземье" },
      ],
      cast: [
        { name: "Elijah Wood", role: "Фродо Бэггинс" },
        { name: "Ian McKellen", role: "Гэндальф" },
        { name: "Viggo Mortensen", role: "Арагорн" },
        { name: "Sean Astin", role: "Сэм" },
        { name: "Orlando Bloom", role: "Леголас" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 51,
      slug: "the-wild-robot",
      title: "Дикий робот",
      originalTitle: "The Wild Robot",
      searchTitles: ["дикий робот", "wild robot", "робот роз", "роз"],
      type: "Мультфильм",
      year: "2024",
      rating: 8.2,
      genres: ["Анимация", "Приключения", "Семейный", "Фантастика"],
      poster: "https://image.tmdb.org/t/p/w500/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg",
      description: "Робот оказывается на диком острове и учится понимать жизнь вокруг.",
      trailerUrl: "https://www.youtube.com/embed/67vbA5ZJdKQ",
      longDescription:
        "Робот ROZZUM попадает на необитаемый остров и пытается выжить среди животных. Постепенно она учится заботе, языку природы и дружбе, превращаясь из машины с инструкциями в героя с сердцем.",
      facts: [
        { label: "Год", value: "2024" },
        { label: "Тип", value: "Мультфильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "102 мин" },
        { label: "Студия", value: "DreamWorks Animation" },
        { label: "Режиссёр", value: "Chris Sanders" },
        { label: "Основа", value: "Книга Peter Brown" },
        { label: "Темы", value: "Забота, природа, адаптация" },
      ],
      cast: [
        { name: "Роз", role: "Робот, который учится жить среди природы" },
        { name: "Брайтбилл", role: "Гусёнок и важная связь Роз" },
        { name: "Финк", role: "Лис и неожиданный союзник" },
        { name: "Пинктейл", role: "Опытная мама-опоссум" },
        { name: "Жители острова", role: "Дикая, шумная и честная школа жизни" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
      ],
    },
  {
      id: 52,
      slug: "inside-out-2",
      title: "Головоломка 2",
      originalTitle: "Inside Out 2",
      searchTitles: ["головоломка 2", "inside out 2", "эмоции", "тревожность", "райли"],
      type: "Мультфильм",
      year: "2024",
      rating: 7.6,
      genres: ["Анимация", "Комедия", "Семейный", "Драма"],
      poster: "https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg",
      description: "У Райли появляются новые эмоции, и в голове снова начинается ремонт без предупреждения.",
      trailerUrl: "https://www.youtube.com/embed/LEjhY15eCx0",
      longDescription:
        "Райли взрослеет, а вместе с ней меняется и штаб эмоций. Радость, Печаль и старые знакомые сталкиваются с новыми чувствами, которые делают подростковый возраст сложным, смешным и очень узнаваемым.",
      facts: [
        { label: "Год", value: "2024" },
        { label: "Тип", value: "Мультфильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "96 мин" },
        { label: "Студия", value: "Pixar Animation Studios" },
        { label: "Режиссёр", value: "Kelsey Mann" },
        { label: "Продолжение", value: "Головоломка" },
        { label: "Темы", value: "Взросление, эмоции, самооценка" },
      ],
      cast: [
        { name: "Райли", role: "Девочка, которая взрослеет" },
        { name: "Радость", role: "Эмоция, которая всё ещё хочет как лучше" },
        { name: "Печаль", role: "Эмоция, без которой не собрать себя" },
        { name: "Тревожность", role: "Новая эмоция с планами на всё сразу" },
        { name: "Зависть", role: "Новая участница внутренней команды" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
      ],
    },
  {
      id: 53,
      slug: "furiosa-a-mad-max-saga",
      title: "Фуриоса: Хроники Безумного Макса",
      originalTitle: "Furiosa: A Mad Max Saga",
      searchTitles: ["фуриоса", "furiosa", "безумный макс", "mad max saga"],
      type: "Фильм",
      year: "2024",
      rating: 7.5,
      genres: ["Экшен", "Приключения", "Фантастика"],
      poster: "https://image.tmdb.org/t/p/w500/iADOJ8Zymht2JPMoy3R7xceZprc.jpg",
      description: "История Фуриосы до Дороги ярости: пустошь, власть и выживание.",
      trailerUrl: "https://www.youtube.com/embed/XJMuhwVlca4",
      longDescription:
        "Юная Фуриоса оказывается вырвана из родного места и попадает в жестокий мир пустоши. На пути к свободе ей приходится изучить правила силы, союзы и цену мести в мире, где бензин иногда звучит как валюта судьбы.",
      facts: [
        { label: "Год", value: "2024" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "Австралия, США" },
        { label: "Длительность", value: "148 мин" },
        { label: "Студия", value: "Warner Bros., Village Roadshow" },
        { label: "Режиссёр", value: "George Miller" },
        { label: "Связь", value: "Приквел к Дороге ярости" },
        { label: "Настроение", value: "Пыльно, быстро, сурово" },
      ],
      cast: [
        { name: "Anya Taylor-Joy", role: "Фуриоса" },
        { name: "Chris Hemsworth", role: "Дементус" },
        { name: "Tom Burke", role: "Преторианец Джек" },
        { name: "Alyla Browne", role: "Юная Фуриоса" },
        { name: "Lachy Hulme", role: "Несмертный Джо" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 54,
      slug: "alien-romulus",
      title: "Чужой: Ромул",
      originalTitle: "Alien: Romulus",
      searchTitles: ["чужой ромул", "alien romulus", "чужой", "ксеноморф"],
      type: "Фильм",
      year: "2024",
      rating: 7.1,
      genres: ["Ужасы", "Фантастика", "Триллер"],
      poster: "https://image.tmdb.org/t/p/w500/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg",
      description: "Космический хоррор о группе молодых людей и очень плохой находке.",
      trailerUrl: "https://www.youtube.com/embed/x0XDEhP4MQs",
      longDescription:
        "Группа молодых колонистов исследует заброшенную космическую станцию и сталкивается с угрозой, которую лучше было бы оставить в темноте. Фильм возвращает франшизу к тесным коридорам, саспенсу и ощущению, что космос не любит любопытных.",
      facts: [
        { label: "Год", value: "2024" },
        { label: "Тип", value: "Фильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "119 мин" },
        { label: "Студия", value: "20th Century Studios" },
        { label: "Режиссёр", value: "Fede Álvarez" },
        { label: "Вселенная", value: "Alien" },
        { label: "Настроение", value: "Напряжённо, мрачно, клаустрофобно" },
      ],
      cast: [
        { name: "Cailee Spaeny", role: "Рейн" },
        { name: "David Jonsson", role: "Энди" },
        { name: "Archie Renaux", role: "Тайлер" },
        { name: "Isabela Merced", role: "Кей" },
        { name: "Ксеноморф", role: "Причина не заходить в странные коридоры" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
      id: 55,
      slug: "a-silent-voice",
      title: "Форма голоса",
      originalTitle: "A Silent Voice",
      searchTitles: ["форма голоса", "a silent voice", "koe no katachi", "голос формы"],
      type: "Аниме",
      year: "2016",
      rating: 8.1,
      genres: ["Аниме", "Драма", "Школа"],
      poster: "https://image.tmdb.org/t/p/w500/tuFaWiqX0TXoWu7DGNcmX3UW7sT.jpg",
      description: "Школьная драма о вине, взрослении и попытке наладить связь.",
      trailerUrl: "https://www.youtube.com/embed/nfK6UgLra7g",
      longDescription:
        "Сёя пытается исправить ошибки прошлого и снова встретиться с Сёко, девочкой, над которой когда-то издевался. Это тихая, эмоциональная история о принятии, ответственности и сложном пути к прощению.",
      facts: [
        { label: "Год", value: "2016" },
        { label: "Тип", value: "Аниме" },
        { label: "Страна", value: "Япония" },
        { label: "Длительность", value: "130 мин" },
        { label: "Студия", value: "Kyoto Animation" },
        { label: "Режиссёр", value: "Naoko Yamada" },
        { label: "Основа", value: "Манга Yoshitoki Ōima" },
        { label: "Темы", value: "Прощение, вина, общение" },
      ],
      cast: [
        { name: "Сёя Исида", role: "Парень, который пытается измениться" },
        { name: "Сёко Нисимия", role: "Девочка, с которой он хочет восстановить связь" },
        { name: "Юдзуру Нисимия", role: "Сестра Сёко" },
        { name: "Наока Уэно", role: "Одноклассница с непростым характером" },
        { name: "Томохиро Нагацука", role: "Друг, который появляется очень вовремя" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
      ],
    },
  {
      id: 56,
      slug: "spirited-away",
      title: "Унесённые призраками",
      originalTitle: "Spirited Away",
      searchTitles: ["унесенные призраками", "унесённые призраками", "spirited away", "тихиро", "хаку"],
      type: "Аниме",
      year: "2001",
      rating: 8.6,
      genres: ["Аниме", "Фэнтези", "Приключения"],
      poster: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
      description: "Волшебное путешествие девочки в мир духов, где нужно найти смелость.",
      trailerUrl: "https://www.youtube.com/embed/ByXuk9QqQkk",
      longDescription:
        "Тихиро попадает в загадочный мир духов и должна найти способ спасти родителей. История смешивает сказку, взросление и невероятную атмосферу, где каждый новый персонаж будто пришёл из сна, который слишком хорошо нарисовали.",
      facts: [
        { label: "Год", value: "2001" },
        { label: "Тип", value: "Аниме" },
        { label: "Страна", value: "Япония" },
        { label: "Длительность", value: "125 мин" },
        { label: "Студия", value: "Studio Ghibli" },
        { label: "Режиссёр", value: "Hayao Miyazaki" },
        { label: "Формат", value: "Полнометражное аниме" },
        { label: "Темы", value: "Смелость, взросление, память" },
      ],
      cast: [
        { name: "Тихиро Огино", role: "Девочка, которая учится быть смелой" },
        { name: "Хаку", role: "Таинственный союзник" },
        { name: "Юбаба", role: "Хозяйка купален" },
        { name: "Безликий", role: "Дух, которому очень нужна связь" },
        { name: "Камадзи", role: "Хранитель котельной" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
      ],
    },
  {
      id: 57,
      slug: "coraline",
      title: "Коралина в Стране Кошмаров",
      originalTitle: "Coraline",
      searchTitles: ["коралина", "coraline", "страна кошмаров", "кукольная анимация"],
      type: "Мультфильм",
      year: "2009",
      rating: 7.8,
      genres: ["Анимация", "Фэнтези", "Приключения", "Мистика"],
      poster: "https://image.tmdb.org/t/p/w500/4jeFXQYytChdZYE9JYO7Un87IlW.jpg",
      description: "Кукольная сказка с мрачной атмосферой и очень подозрительной идеальной реальностью.",
      trailerUrl: "https://www.youtube.com/embed/m9bOpeuvNwY",
      longDescription:
        "Коралина находит дверь в альтернативный мир, где всё кажется ярче и лучше. Но чем дольше она там остаётся, тем яснее становится: идеальная версия дома может просить слишком дорогую цену.",
      facts: [
        { label: "Год", value: "2009" },
        { label: "Тип", value: "Мультфильм" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "100 мин" },
        { label: "Студия", value: "Laika" },
        { label: "Режиссёр", value: "Henry Selick" },
        { label: "Основа", value: "Повесть Neil Gaiman" },
        { label: "Формат", value: "Покадровая анимация" },
      ],
      cast: [
        { name: "Коралина Джонс", role: "Девочка с любопытством сильнее страха" },
        { name: "Другая Мама", role: "Слишком идеальная хозяйка другого мира" },
        { name: "Кот", role: "Проводник и независимый эксперт по странностям" },
        { name: "Уайби", role: "Сосед и неожиданный помощник" },
        { name: "Другой мир", role: "Место, где уют быстро становится ловушкой" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
      ],
    },
  {
      id: 58,
      slug: "planet-earth",
      title: "Планета Земля",
      originalTitle: "Planet Earth",
      searchTitles: ["планета земля", "planet earth", "bbc earth", "природа", "документальный"],
      type: "Документальный",
      year: "2006",
      rating: 9.4,
      genres: ["Документальный", "Природа"],
      poster: "https://kinogo.media/uploads/posts/2021-10/1634926941_iphone360_279548.jpg",
      posterFallbacks: [
        "https://upload.wikimedia.org/wikipedia/en/thumb/7/7f/Planet_Earth_DVD_cover.jpg/330px-Planet_Earth_DVD_cover.jpg"
      ],
      description: "Классический документальный проект BBC о природе и самых удивительных местах планеты.",
      trailerUrl: "https://www.youtube.com/embed/lMta7k46JWE",
      longDescription:
        "«Планета Земля» показывает разные экосистемы и редкие моменты жизни дикой природы. Это документальное путешествие, где настоящие пейзажи выглядят так, будто природа сама решила снять дорогой блокбастер без спецэффектов.",
      facts: [
        { label: "Год", value: "2006" },
        { label: "Тип", value: "Документальный" },
        { label: "Страна", value: "Великобритания" },
        { label: "Длительность", value: "около 50 мин / серия" },
        { label: "Студия", value: "BBC Natural History Unit" },
        { label: "Рассказчик", value: "David Attenborough" },
        { label: "Серий", value: "11" },
        { label: "Темы", value: "Природа, экосистемы, животные" },
      ],
      cast: [
        { name: "David Attenborough", role: "Рассказчик" },
        { name: "BBC Earth", role: "Съёмочная команда" },
        { name: "Дикая природа", role: "Главный герой проекта" },
        { name: "Горы, океаны и леса", role: "Ключевые локации" },
        { name: "Планета Земля", role: "Главная тема проекта" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
  {
    "slug": "gladiator",
    "title": "Гладиатор",
    "originalTitle": "Gladiator",
    "searchTitles": [
      "гладиатор",
      "gladiator",
      "максимус",
      "рим"
    ],
    "type": "Фильм",
    "year": "2000",
    "rating": 8.5,
    "genres": [
      "История",
      "Драма",
      "Экшен",
      "Приключения"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg",
    "posterFallbacks": [
      "https://upload.wikimedia.org/wikipedia/en/8/8d/Gladiator_ver1.jpg"
    ],
    "description": "Историческая драма о генерале, который теряет всё и выходит на арену ради справедливости.",
    "trailerUrl": "https://www.youtube.com/embed/P5ieIbInFpg",
    "longDescription": "Максимус был верным генералом Рима, но предательство лишает его семьи, статуса и будущего. На арене Колизея он превращает борьбу за выживание в вызов императорской власти и легенду о чести.",
    "facts": [
      {
        "label": "Год",
        "value": "2000"
      },
      {
        "label": "Тип",
        "value": "Фильм"
      },
      {
        "label": "Страна",
        "value": "США, Великобритания"
      },
      {
        "label": "Длительность",
        "value": "155 мин"
      },
      {
        "label": "Студия",
        "value": "DreamWorks Pictures, Universal Pictures"
      },
      {
        "label": "Режиссёр",
        "value": "Ridley Scott"
      },
      {
        "label": "Настроение",
        "value": "Эпично, драматично, масштабно"
      },
      {
        "label": "Темы",
        "value": "Месть, честь, власть"
      }
    ],
    "cast": [
      {
        "name": "Russell Crowe",
        "role": "Максимус"
      },
      {
        "name": "Joaquin Phoenix",
        "role": "Коммод"
      },
      {
        "name": "Connie Nielsen",
        "role": "Луцилла"
      },
      {
        "name": "Oliver Reed",
        "role": "Проксимо"
      },
      {
        "name": "Richard Harris",
        "role": "Марк Аврелий"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 59
  },
  {
    "slug": "pulp-fiction",
    "title": "Криминальное чтиво",
    "originalTitle": "Pulp Fiction",
    "searchTitles": [
      "криминальное чтиво",
      "pulp fiction",
      "тарантино",
      "винсент и джулс"
    ],
    "type": "Фильм",
    "year": "1994",
    "rating": 8.9,
    "genres": [
      "Криминал",
      "Драма",
      "Комедия"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    "posterFallbacks": [
      "https://upload.wikimedia.org/wikipedia/en/8/82/Pulp_Fiction_cover.jpg"
    ],
    "description": "Нелинейная криминальная классика с диалогами, которые давно ушли в цитаты.",
    "trailerUrl": "https://www.youtube.com/embed/s7EdQ4FqbhY",
    "longDescription": "Несколько историй из криминального Лос-Анджелеса переплетаются вокруг случайностей, странных решений и людей, которые слишком уверены, что контролируют ситуацию. Фильм держится на ритме, стиле и разговорах, где каждое слово работает на атмосферу.",
    "facts": [
      {
        "label": "Год",
        "value": "1994"
      },
      {
        "label": "Тип",
        "value": "Фильм"
      },
      {
        "label": "Страна",
        "value": "США"
      },
      {
        "label": "Длительность",
        "value": "154 мин"
      },
      {
        "label": "Студия",
        "value": "Miramax"
      },
      {
        "label": "Режиссёр",
        "value": "Quentin Tarantino"
      },
      {
        "label": "Настроение",
        "value": "Стильно, иронично, криминально"
      },
      {
        "label": "Темы",
        "value": "Случайность, мораль, поп-культура"
      }
    ],
    "cast": [
      {
        "name": "John Travolta",
        "role": "Винсент Вега"
      },
      {
        "name": "Samuel L. Jackson",
        "role": "Джулс Уиннфилд"
      },
      {
        "name": "Uma Thurman",
        "role": "Миа Уоллес"
      },
      {
        "name": "Bruce Willis",
        "role": "Бутч Куллидж"
      },
      {
        "name": "Ving Rhames",
        "role": "Марселлас Уоллес"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 60
  },
  {
    "slug": "fight-club",
    "title": "Бойцовский клуб",
    "originalTitle": "Fight Club",
    "searchTitles": [
      "бойцовский клуб",
      "fight club",
      "тайлер дерден"
    ],
    "type": "Фильм",
    "year": "1999",
    "rating": 8.8,
    "genres": [
      "Драма",
      "Триллер"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    "posterFallbacks": [
      "https://upload.wikimedia.org/wikipedia/en/f/fc/Fight_Club_poster.jpg"
    ],
    "description": "Психологическая история о пустоте, бунте и правилах, о которых все всё равно говорят.",
    "trailerUrl": "https://www.youtube.com/embed/qtRKdVHc-cE",
    "longDescription": "Безымянный герой застрял в рутине и бессоннице, пока знакомство с Тайлером Дерденом не открывает ему новый способ чувствовать себя живым. Но личный протест быстро вырастает в опасную систему, которую уже трудно остановить.",
    "facts": [
      {
        "label": "Год",
        "value": "1999"
      },
      {
        "label": "Тип",
        "value": "Фильм"
      },
      {
        "label": "Страна",
        "value": "США, Германия"
      },
      {
        "label": "Длительность",
        "value": "139 мин"
      },
      {
        "label": "Студия",
        "value": "20th Century Fox, Regency Enterprises"
      },
      {
        "label": "Режиссёр",
        "value": "David Fincher"
      },
      {
        "label": "Настроение",
        "value": "Мрачно, нервно, провокационно"
      },
      {
        "label": "Темы",
        "value": "Идентичность, потребление, контроль"
      }
    ],
    "cast": [
      {
        "name": "Edward Norton",
        "role": "Рассказчик"
      },
      {
        "name": "Brad Pitt",
        "role": "Тайлер Дерден"
      },
      {
        "name": "Helena Bonham Carter",
        "role": "Марла Сингер"
      },
      {
        "name": "Meat Loaf",
        "role": "Роберт Полсон"
      },
      {
        "name": "Jared Leto",
        "role": "Ангельское лицо"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 61
  },
  {
    "slug": "se7en",
    "title": "Семь",
    "originalTitle": "Se7en",
    "searchTitles": [
      "семь",
      "seven",
      "se7en",
      "финчер",
      "детектив"
    ],
    "type": "Фильм",
    "year": "1995",
    "rating": 8.6,
    "genres": [
      "Триллер",
      "Криминал",
      "Драма"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/191nKfP0ehp3uIvWqgPbFmI4lv9.jpg",
    "posterFallbacks": [
      "https://upload.wikimedia.org/wikipedia/en/6/68/Seven_%28movie%29_poster.jpg"
    ],
    "description": "Мрачный детектив о двух напарниках и серии преступлений, построенных как страшная головоломка.",
    "trailerUrl": "https://www.youtube.com/embed/znmZoVkCjpI",
    "longDescription": "Опытный детектив Сомерсет и молодой Миллс расследуют цепочку преступлений, связанных с семью грехами. Город будто сам становится участником дела: дождливым, уставшим и полным тревожных подсказок.",
    "facts": [
      {
        "label": "Год",
        "value": "1995"
      },
      {
        "label": "Тип",
        "value": "Фильм"
      },
      {
        "label": "Страна",
        "value": "США"
      },
      {
        "label": "Длительность",
        "value": "127 мин"
      },
      {
        "label": "Студия",
        "value": "New Line Cinema"
      },
      {
        "label": "Режиссёр",
        "value": "David Fincher"
      },
      {
        "label": "Настроение",
        "value": "Мрачно, напряжённо, детективно"
      },
      {
        "label": "Темы",
        "value": "Справедливость, вина, одержимость"
      }
    ],
    "cast": [
      {
        "name": "Brad Pitt",
        "role": "Дэвид Миллс"
      },
      {
        "name": "Morgan Freeman",
        "role": "Уильям Сомерсет"
      },
      {
        "name": "Gwyneth Paltrow",
        "role": "Трейси Миллс"
      },
      {
        "name": "Kevin Spacey",
        "role": "Джон Доу"
      },
      {
        "name": "R. Lee Ermey",
        "role": "Капитан полиции"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 62
  },
  {
    "slug": "the-godfather",
    "title": "Крёстный отец",
    "originalTitle": "The Godfather",
    "searchTitles": [
      "крестный отец",
      "крёстный отец",
      "godfather",
      "корлеоне"
    ],
    "type": "Фильм",
    "year": "1972",
    "rating": 9.2,
    "genres": [
      "Криминал",
      "Драма"
    ],
    "poster": "https://images.kinorium.com/movie/poster/2060815/w1500_51470371.jpg",
    "posterFallbacks": [
      "https://upload.wikimedia.org/wikipedia/en/1/1c/Godfather_ver1.jpg"
    ],
    "description": "Криминальная сага о семье Корлеоне, власти и цене наследия.",
    "trailerUrl": "https://www.youtube.com/embed/sY1S34973zA",
    "longDescription": "Семья Корлеоне живёт по своим правилам, где честь, бизнес и насилие опасно близки. Майкл сначала держится в стороне от дел семьи, но обстоятельства постепенно превращают его в человека, от которого зависит будущее клана.",
    "facts": [
      {
        "label": "Год",
        "value": "1972"
      },
      {
        "label": "Тип",
        "value": "Фильм"
      },
      {
        "label": "Страна",
        "value": "США"
      },
      {
        "label": "Длительность",
        "value": "175 мин"
      },
      {
        "label": "Студия",
        "value": "Paramount Pictures"
      },
      {
        "label": "Режиссёр",
        "value": "Francis Ford Coppola"
      },
      {
        "label": "Настроение",
        "value": "Величественно, напряжённо, классически"
      },
      {
        "label": "Темы",
        "value": "Семья, власть, наследие"
      }
    ],
    "cast": [
      {
        "name": "Marlon Brando",
        "role": "Вито Корлеоне"
      },
      {
        "name": "Al Pacino",
        "role": "Майкл Корлеоне"
      },
      {
        "name": "James Caan",
        "role": "Сонни Корлеоне"
      },
      {
        "name": "Diane Keaton",
        "role": "Кей Адамс"
      },
      {
        "name": "Robert Duvall",
        "role": "Том Хейген"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 63
  },
  {
    "slug": "the-green-mile",
    "title": "Зелёная миля",
    "originalTitle": "The Green Mile",
    "searchTitles": [
      "зеленая миля",
      "зелёная миля",
      "green mile",
      "джон коффи"
    ],
    "type": "Фильм",
    "year": "1999",
    "rating": 8.6,
    "genres": [
      "Драма",
      "Фэнтези",
      "Криминал"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg",
    "posterFallbacks": [
      "https://upload.wikimedia.org/wikipedia/en/c/ce/Green_mile.jpg"
    ],
    "description": "Трогательная драма о надзирателях, заключённом и чуде, которое трудно объяснить.",
    "trailerUrl": "https://www.youtube.com/embed/Ki4haFrqSrw",
    "longDescription": "Пол Эджкомб работает в тюремном блоке смертников и привык не удивляться людям. Но появление Джона Коффи меняет его взгляд на добро, страх и чудеса, которые могут прийти в самое тяжёлое место.",
    "facts": [
      {
        "label": "Год",
        "value": "1999"
      },
      {
        "label": "Тип",
        "value": "Фильм"
      },
      {
        "label": "Страна",
        "value": "США"
      },
      {
        "label": "Длительность",
        "value": "189 мин"
      },
      {
        "label": "Студия",
        "value": "Warner Bros., Castle Rock Entertainment"
      },
      {
        "label": "Режиссёр",
        "value": "Frank Darabont"
      },
      {
        "label": "Настроение",
        "value": "Трогательно, мистически, человечно"
      },
      {
        "label": "Темы",
        "value": "Сострадание, вина, чудо"
      }
    ],
    "cast": [
      {
        "name": "Tom Hanks",
        "role": "Пол Эджкомб"
      },
      {
        "name": "Michael Clarke Duncan",
        "role": "Джон Коффи"
      },
      {
        "name": "David Morse",
        "role": "Брут Хауэлл"
      },
      {
        "name": "Sam Rockwell",
        "role": "Уильям Уортон"
      },
      {
        "name": "Bonnie Hunt",
        "role": "Джан Эджкомб"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 64
  },
  {
    "slug": "whiplash",
    "title": "Одержимость",
    "originalTitle": "Whiplash",
    "searchTitles": [
      "одержимость",
      "whiplash",
      "барабанщик",
      "джаз"
    ],
    "type": "Фильм",
    "year": "2014",
    "rating": 8.5,
    "genres": [
      "Драма",
      "Музыка"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/7fn624j5lj3xTme2SgiLCeuedmO.jpg",
    "posterFallbacks": [
      "https://upload.wikimedia.org/wikipedia/en/0/01/Whiplash_poster.jpg"
    ],
    "description": "Жёсткая музыкальная драма о таланте, давлении и цене идеального темпа.",
    "trailerUrl": "https://www.youtube.com/embed/7d_jQycdQGo",
    "longDescription": "Молодой барабанщик Эндрю хочет стать великим, но встреча с преподавателем Флетчером превращает обучение в психологическое испытание. Фильм звучит как дуэль: громко, точно и без права на фальшивую ноту.",
    "facts": [
      {
        "label": "Год",
        "value": "2014"
      },
      {
        "label": "Тип",
        "value": "Фильм"
      },
      {
        "label": "Страна",
        "value": "США"
      },
      {
        "label": "Длительность",
        "value": "106 мин"
      },
      {
        "label": "Студия",
        "value": "Bold Films, Blumhouse Productions"
      },
      {
        "label": "Режиссёр",
        "value": "Damien Chazelle"
      },
      {
        "label": "Настроение",
        "value": "Нервно, энергично, музыкально"
      },
      {
        "label": "Темы",
        "value": "Талант, дисциплина, давление"
      }
    ],
    "cast": [
      {
        "name": "Miles Teller",
        "role": "Эндрю Ниман"
      },
      {
        "name": "J. K. Simmons",
        "role": "Теренс Флетчер"
      },
      {
        "name": "Melissa Benoist",
        "role": "Николь"
      },
      {
        "name": "Paul Reiser",
        "role": "Джим Ниман"
      },
      {
        "name": "Austin Stowell",
        "role": "Райан"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 65
  },
  {
    "slug": "parasite",
    "title": "Паразиты",
    "originalTitle": "Parasite",
    "searchTitles": [
      "паразиты",
      "parasite",
      "кино корея",
      "бон джун хо"
    ],
    "type": "Фильм",
    "year": "2019",
    "rating": 8.5,
    "genres": [
      "Драма",
      "Триллер",
      "Комедия"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    "posterFallbacks": [
      "https://upload.wikimedia.org/wikipedia/en/5/53/Parasite_%282019_film%29.png"
    ],
    "description": "Социальный триллер, где чужой дом становится сценой для очень неудобной правды.",
    "trailerUrl": "https://www.youtube.com/embed/5xH0HfJHsaY",
    "longDescription": "Семья Кимов постепенно устраивается работать в богатый дом, используя смекалку и риск. Но за красивым фасадом прячется больше слоёв, чем кажется, и каждая лестница в этом фильме ведёт к новой правде о неравенстве.",
    "facts": [
      {
        "label": "Год",
        "value": "2019"
      },
      {
        "label": "Тип",
        "value": "Фильм"
      },
      {
        "label": "Страна",
        "value": "Южная Корея"
      },
      {
        "label": "Длительность",
        "value": "132 мин"
      },
      {
        "label": "Студия",
        "value": "Barunson E&A"
      },
      {
        "label": "Режиссёр",
        "value": "Bong Joon-ho"
      },
      {
        "label": "Настроение",
        "value": "Умно, напряжённо, сатирично"
      },
      {
        "label": "Темы",
        "value": "Классы, семья, выживание"
      }
    ],
    "cast": [
      {
        "name": "Song Kang-ho",
        "role": "Ким Ки-тэк"
      },
      {
        "name": "Choi Woo-shik",
        "role": "Ки-у"
      },
      {
        "name": "Park So-dam",
        "role": "Ки-джон"
      },
      {
        "name": "Jang Hye-jin",
        "role": "Чхун-сук"
      },
      {
        "name": "Lee Sun-kyun",
        "role": "Пак Дон-ик"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 66
  },
  {
    "slug": "joker-2019",
    "title": "Джокер",
    "originalTitle": "Joker",
    "searchTitles": [
      "джокер",
      "joker",
      "артур флек",
      "dc"
    ],
    "type": "Фильм",
    "year": "2019",
    "rating": 8.4,
    "genres": [
      "Драма",
      "Криминал",
      "Триллер"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
    "posterFallbacks": [
      "https://upload.wikimedia.org/wikipedia/en/e/e1/Joker_%282019_film%29_poster.jpg"
    ],
    "description": "Мрачная история Артура Флека и города, который не умеет слышать слабых.",
    "trailerUrl": "https://www.youtube.com/embed/zAGVQLHvwOY",
    "longDescription": "Артур Флек пытается быть комиком и удержаться на плаву в безразличном Готэме. Его путь постепенно превращается в историю о боли, одиночестве и опасной силе образа, который город сам помогает создать.",
    "facts": [
      {
        "label": "Год",
        "value": "2019"
      },
      {
        "label": "Тип",
        "value": "Фильм"
      },
      {
        "label": "Страна",
        "value": "США, Канада"
      },
      {
        "label": "Длительность",
        "value": "122 мин"
      },
      {
        "label": "Студия",
        "value": "Warner Bros., DC Films"
      },
      {
        "label": "Режиссёр",
        "value": "Todd Phillips"
      },
      {
        "label": "Настроение",
        "value": "Мрачно, психологически, тревожно"
      },
      {
        "label": "Темы",
        "value": "Одиночество, образ, общество"
      }
    ],
    "cast": [
      {
        "name": "Joaquin Phoenix",
        "role": "Артур Флек / Джокер"
      },
      {
        "name": "Robert De Niro",
        "role": "Мюррей Франклин"
      },
      {
        "name": "Zazie Beetz",
        "role": "Софи Дюмонд"
      },
      {
        "name": "Frances Conroy",
        "role": "Пенни Флек"
      },
      {
        "name": "Brett Cullen",
        "role": "Томас Уэйн"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 67
  },
  {
    "slug": "chernobyl",
    "title": "Чернобыль",
    "originalTitle": "Chernobyl",
    "searchTitles": [
      "чернобыль",
      "chernobyl",
      "hbo",
      "авария"
    ],
    "type": "Сериал",
    "year": "2019",
    "rating": 9.3,
    "genres": [
      "Драма",
      "История",
      "Мини-сериал"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg",
    "description": "Мини-сериал о катастрофе, решениях людей и цене молчания.",
    "trailerUrl": "https://www.youtube.com/embed/s9APLXM9Ei8",
    "longDescription": "После взрыва на Чернобыльской АЭС учёные, ликвидаторы и чиновники оказываются перед реальностью, которую нельзя отменить приказом. Сериал показывает не только катастрофу, но и борьбу фактов против страха и политического удобства.",
    "facts": [
      {
        "label": "Год",
        "value": "2019"
      },
      {
        "label": "Тип",
        "value": "Сериал"
      },
      {
        "label": "Страна",
        "value": "США, Великобритания"
      },
      {
        "label": "Длительность",
        "value": "60–72 мин / серия"
      },
      {
        "label": "Студия",
        "value": "HBO, Sky UK"
      },
      {
        "label": "Создатель",
        "value": "Craig Mazin"
      },
      {
        "label": "Настроение",
        "value": "Сдержанно, напряжённо, исторично"
      },
      {
        "label": "Темы",
        "value": "Правда, ответственность, последствия"
      }
    ],
    "cast": [
      {
        "name": "Jared Harris",
        "role": "Валерий Легасов"
      },
      {
        "name": "Stellan Skarsgård",
        "role": "Борис Щербина"
      },
      {
        "name": "Emily Watson",
        "role": "Ульяна Хомюк"
      },
      {
        "name": "Paul Ritter",
        "role": "Анатолий Дятлов"
      },
      {
        "name": "Jessie Buckley",
        "role": "Людмила Игнатенко"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 68
  },
  {
    "slug": "sherlock",
    "title": "Шерлок",
    "originalTitle": "Sherlock",
    "searchTitles": [
      "шерлок",
      "sherlock",
      "холмс",
      "ватсон"
    ],
    "type": "Сериал",
    "year": "2010",
    "rating": 9.1,
    "genres": [
      "Детектив",
      "Криминал",
      "Драма"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg",
    "description": "Современная версия Холмса, где дедукция работает быстрее уведомлений на телефоне.",
    "trailerUrl": "https://www.youtube.com/embed/qlcWFoNqZHc",
    "longDescription": "Шерлок Холмс и доктор Ватсон расследуют дела в современном Лондоне, где классическая дедукция встречается с технологиями, медиа и очень странными преступниками. Сериал делает знакомого героя быстрым, остроумным и опасно наблюдательным.",
    "facts": [
      {
        "label": "Год",
        "value": "2010"
      },
      {
        "label": "Тип",
        "value": "Сериал"
      },
      {
        "label": "Страна",
        "value": "Великобритания"
      },
      {
        "label": "Длительность",
        "value": "около 90 мин / серия"
      },
      {
        "label": "Студия",
        "value": "BBC"
      },
      {
        "label": "Создатели",
        "value": "Steven Moffat, Mark Gatiss"
      },
      {
        "label": "Настроение",
        "value": "Остроумно, детективно, динамично"
      },
      {
        "label": "Темы",
        "value": "Логика, дружба, загадки"
      }
    ],
    "cast": [
      {
        "name": "Benedict Cumberbatch",
        "role": "Шерлок Холмс"
      },
      {
        "name": "Martin Freeman",
        "role": "Джон Ватсон"
      },
      {
        "name": "Andrew Scott",
        "role": "Джим Мориарти"
      },
      {
        "name": "Mark Gatiss",
        "role": "Майкрофт Холмс"
      },
      {
        "name": "Una Stubbs",
        "role": "Миссис Хадсон"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 69
  },
  {
    "slug": "better-call-saul",
    "title": "Лучше звоните Солу",
    "originalTitle": "Better Call Saul",
    "searchTitles": [
      "лучше звоните солу",
      "better call saul",
      "сол гудман",
      "джимми макгилл"
    ],
    "type": "Сериал",
    "year": "2015",
    "rating": 9.0,
    "genres": [
      "Драма",
      "Криминал"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/fC2HDm5t0kHl7mTm7jxMR31b7by.jpg",
    "description": "История превращения Джимми Макгилла в адвоката, которого лучше не недооценивать.",
    "trailerUrl": "https://www.youtube.com/embed/HN4oydykJFc",
    "longDescription": "Джимми Макгилл пытается построить карьеру юриста честно, хитро и иногда слишком творчески. Сериал показывает медленную, точную трансформацию человека, который умеет говорить красиво, но всё чаще выбирает опасные обходные пути.",
    "facts": [
      {
        "label": "Год",
        "value": "2015"
      },
      {
        "label": "Тип",
        "value": "Сериал"
      },
      {
        "label": "Страна",
        "value": "США"
      },
      {
        "label": "Длительность",
        "value": "46–69 мин / серия"
      },
      {
        "label": "Студия",
        "value": "AMC, Sony Pictures Television"
      },
      {
        "label": "Создатели",
        "value": "Vince Gilligan, Peter Gould"
      },
      {
        "label": "Настроение",
        "value": "Медленно, умно, драматично"
      },
      {
        "label": "Темы",
        "value": "Выбор, амбиции, мораль"
      }
    ],
    "cast": [
      {
        "name": "Bob Odenkirk",
        "role": "Джимми Макгилл / Сол Гудман"
      },
      {
        "name": "Rhea Seehorn",
        "role": "Ким Уэкслер"
      },
      {
        "name": "Jonathan Banks",
        "role": "Майк Эрмантраут"
      },
      {
        "name": "Michael McKean",
        "role": "Чак Макгилл"
      },
      {
        "name": "Giancarlo Esposito",
        "role": "Густаво Фринг"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 70
  },
  {
    "slug": "the-boys",
    "title": "Пацаны",
    "originalTitle": "The Boys",
    "searchTitles": [
      "пацаны",
      "the boys",
      "homelander",
      "хоумлендер",
      "супергерои"
    ],
    "type": "Сериал",
    "year": "2019",
    "rating": 8.7,
    "genres": [
      "Экшен",
      "Сатира",
      "Драма",
      "Супергерои"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/stTEycfG9928HYGEISBFaG1ngjM.jpg",
    "description": "Сатирический сериал о мире, где супергерои стали брендами, а бренды — почти властью.",
    "trailerUrl": "https://www.youtube.com/embed/M1bhOaLV4FU",
    "longDescription": "В мире, где супергерои работают на корпорацию и живут как знаменитости, группа обычных людей пытается показать их настоящую сторону. Сериал смешивает экшен, сатиру и мрачный взгляд на культ популярности.",
    "facts": [
      {
        "label": "Год",
        "value": "2019"
      },
      {
        "label": "Тип",
        "value": "Сериал"
      },
      {
        "label": "Страна",
        "value": "США"
      },
      {
        "label": "Длительность",
        "value": "55–68 мин / серия"
      },
      {
        "label": "Студия",
        "value": "Amazon Studios, Sony Pictures Television"
      },
      {
        "label": "Создатель",
        "value": "Eric Kripke"
      },
      {
        "label": "Настроение",
        "value": "Дерзко, сатирично, жёстко"
      },
      {
        "label": "Темы",
        "value": "Власть, медиа, ответственность"
      }
    ],
    "cast": [
      {
        "name": "Karl Urban",
        "role": "Билли Бутчер"
      },
      {
        "name": "Jack Quaid",
        "role": "Хьюи Кэмпбелл"
      },
      {
        "name": "Antony Starr",
        "role": "Хоумлендер"
      },
      {
        "name": "Erin Moriarty",
        "role": "Старлайт"
      },
      {
        "name": "Laz Alonso",
        "role": "Молоко матери"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 71
  },
  {
    "slug": "peaky-blinders",
    "title": "Острые козырьки",
    "originalTitle": "Peaky Blinders",
    "searchTitles": [
      "острые козырьки",
      "peaky blinders",
      "томас шелби",
      "шелби"
    ],
    "type": "Сериал",
    "year": "2013",
    "rating": 8.8,
    "genres": [
      "Криминал",
      "Драма",
      "История"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg",
    "description": "Криминальная сага о семье Шелби, амбициях и очень опасном стиле.",
    "trailerUrl": "https://www.youtube.com/embed/oVzVdvGIC7U",
    "longDescription": "После Первой мировой войны Томас Шелби превращает семейную банду в растущую силу Бирмингема. В сериале политика, бизнес и криминал идут рядом, а каждый шаг вверх требует новой сделки с совестью.",
    "facts": [
      {
        "label": "Год",
        "value": "2013"
      },
      {
        "label": "Тип",
        "value": "Сериал"
      },
      {
        "label": "Страна",
        "value": "Великобритания"
      },
      {
        "label": "Длительность",
        "value": "55–65 мин / серия"
      },
      {
        "label": "Студия",
        "value": "BBC"
      },
      {
        "label": "Создатель",
        "value": "Steven Knight"
      },
      {
        "label": "Настроение",
        "value": "Стильно, мрачно, криминально"
      },
      {
        "label": "Темы",
        "value": "Семья, власть, амбиции"
      }
    ],
    "cast": [
      {
        "name": "Cillian Murphy",
        "role": "Томас Шелби"
      },
      {
        "name": "Paul Anderson",
        "role": "Артур Шелби"
      },
      {
        "name": "Helen McCrory",
        "role": "Полли Грей"
      },
      {
        "name": "Sophie Rundle",
        "role": "Ада Шелби"
      },
      {
        "name": "Tom Hardy",
        "role": "Альфи Соломонс"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 72
  },
  {
    "slug": "dark",
    "title": "Тьма",
    "originalTitle": "Dark",
    "searchTitles": [
      "тьма",
      "dark",
      "винден",
      "путешествие во времени"
    ],
    "type": "Сериал",
    "year": "2017",
    "rating": 8.7,
    "genres": [
      "Фантастика",
      "Драма",
      "Детектив"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg",
    "description": "Немецкая фантастическая загадка, где семейные тайны путаются со временем.",
    "trailerUrl": "https://www.youtube.com/embed/rrwycJ08PSA",
    "longDescription": "В маленьком городе Винден исчезновение ребёнка открывает цепочку событий, связанную с несколькими поколениями. Сериал превращает путешествия во времени в семейный лабиринт, где каждое решение отзывается далеко вперёд и назад.",
    "facts": [
      {
        "label": "Год",
        "value": "2017"
      },
      {
        "label": "Тип",
        "value": "Сериал"
      },
      {
        "label": "Страна",
        "value": "Германия"
      },
      {
        "label": "Длительность",
        "value": "44–73 мин / серия"
      },
      {
        "label": "Студия",
        "value": "Netflix, Wiedemann & Berg"
      },
      {
        "label": "Создатели",
        "value": "Baran bo Odar, Jantje Friese"
      },
      {
        "label": "Настроение",
        "value": "Мрачно, сложно, атмосферно"
      },
      {
        "label": "Темы",
        "value": "Время, семья, судьба"
      }
    ],
    "cast": [
      {
        "name": "Louis Hofmann",
        "role": "Йонас Канвальд"
      },
      {
        "name": "Lisa Vicari",
        "role": "Марта Нильсен"
      },
      {
        "name": "Maja Schöne",
        "role": "Ханна Канвальд"
      },
      {
        "name": "Oliver Masucci",
        "role": "Ульрих Нильсен"
      },
      {
        "name": "Andreas Pietschmann",
        "role": "Незнакомец"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 73
  },
  {
    "slug": "the-mandalorian",
    "title": "Мандалорец",
    "originalTitle": "The Mandalorian",
    "searchTitles": [
      "мандалорец",
      "the mandalorian",
      "мандо",
      "гроґу",
      "грогу",
      "baby yoda"
    ],
    "type": "Сериал",
    "year": "2019",
    "rating": 8.7,
    "genres": [
      "Фантастика",
      "Приключения",
      "Экшен"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg",
    "description": "Космический вестерн о наёмнике, который неожиданно получает очень маленькую ответственность.",
    "trailerUrl": "https://www.youtube.com/embed/aOC8E8z_ifw",
    "longDescription": "Одинокий мандалорский охотник за головами выполняет задания на окраинах галактики, пока встреча с загадочным ребёнком не меняет его путь. Сериал соединяет дух приключений, вестерн и мир Star Wars без лишнего шума.",
    "facts": [
      {
        "label": "Год",
        "value": "2019"
      },
      {
        "label": "Тип",
        "value": "Сериал"
      },
      {
        "label": "Страна",
        "value": "США"
      },
      {
        "label": "Длительность",
        "value": "30–50 мин / серия"
      },
      {
        "label": "Студия",
        "value": "Lucasfilm"
      },
      {
        "label": "Создатель",
        "value": "Jon Favreau"
      },
      {
        "label": "Настроение",
        "value": "Приключенчески, космически, спокойно круто"
      },
      {
        "label": "Темы",
        "value": "Защита, честь, путь"
      }
    ],
    "cast": [
      {
        "name": "Pedro Pascal",
        "role": "Дин Джарин / Мандалорец"
      },
      {
        "name": "Grogu",
        "role": "Таинственный ребёнок"
      },
      {
        "name": "Carl Weathers",
        "role": "Гриф Карга"
      },
      {
        "name": "Gina Carano",
        "role": "Кара Дьюн"
      },
      {
        "name": "Giancarlo Esposito",
        "role": "Мофф Гидеон"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 74
  },
  {
    "slug": "arcane",
    "title": "Аркейн",
    "originalTitle": "Arcane",
    "searchTitles": [
      "аркейн",
      "arcane",
      "league of legends",
      "джинкс",
      "вай"
    ],
    "type": "Сериал",
    "year": "2021",
    "rating": 9.0,
    "genres": [
      "Анимация",
      "Фэнтези",
      "Драма",
      "Экшен"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
    "description": "Анимационная драма о двух городах, двух сёстрах и цене прогресса.",
    "trailerUrl": "https://www.youtube.com/embed/fXmAurh012s",
    "longDescription": "Пилтовер и Заун живут рядом, но разделены статусом, технологиями и обидами. История Вай и Джинкс показывает, как личная травма и политический конфликт могут сломать связь, которая казалась неразрушимой.",
    "facts": [
      {
        "label": "Год",
        "value": "2021"
      },
      {
        "label": "Тип",
        "value": "Сериал"
      },
      {
        "label": "Страна",
        "value": "США, Франция"
      },
      {
        "label": "Длительность",
        "value": "39–44 мин / серия"
      },
      {
        "label": "Студия",
        "value": "Riot Games, Fortiche"
      },
      {
        "label": "Создатели",
        "value": "Christian Linke, Alex Yee"
      },
      {
        "label": "Настроение",
        "value": "Красиво, драматично, зрелищно"
      },
      {
        "label": "Темы",
        "value": "Сёстры, прогресс, раскол"
      }
    ],
    "cast": [
      {
        "name": "Вай",
        "role": "Сильная и упрямая защитница"
      },
      {
        "name": "Джинкс",
        "role": "Хаотичная героиня с болью внутри"
      },
      {
        "name": "Джейс",
        "role": "Изобретатель и политик"
      },
      {
        "name": "Виктор",
        "role": "Учёный, ищущий новый путь"
      },
      {
        "name": "Кейтлин",
        "role": "Следовательница из Пилтовера"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 75
  },
  {
    "slug": "death-note",
    "title": "Тетрадь смерти",
    "originalTitle": "Death Note",
    "searchTitles": [
      "тетрадь смерти",
      "death note",
      "лайт",
      "л",
      "рьюк"
    ],
    "type": "Аниме",
    "year": "2006",
    "rating": 8.9,
    "genres": [
      "Аниме",
      "Триллер",
      "Детектив",
      "Сверхъестественное"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/iigTJJskR1PcjjXqxdyJwVB3BoU.jpg",
    "description": "Интеллектуальная дуэль о школьнике, тетради и власти решать чужие судьбы.",
    "trailerUrl": "https://www.youtube.com/embed/NlJZ-YgAt-c",
    "longDescription": "Лайт Ягами находит тетрадь, способную убивать людей, чьи имена в неё записаны. Его идея справедливости быстро сталкивается с расследованием загадочного L, и история превращается в шахматную партию между двумя гениями.",
    "facts": [
      {
        "label": "Год",
        "value": "2006"
      },
      {
        "label": "Тип",
        "value": "Аниме"
      },
      {
        "label": "Страна",
        "value": "Япония"
      },
      {
        "label": "Длительность",
        "value": "23 мин / серия"
      },
      {
        "label": "Студия",
        "value": "Madhouse"
      },
      {
        "label": "Оригинал",
        "value": "Манга Tsugumi Ohba и Takeshi Obata"
      },
      {
        "label": "Настроение",
        "value": "Напряжённо, интеллектуально, мрачно"
      },
      {
        "label": "Темы",
        "value": "Власть, справедливость, контроль"
      }
    ],
    "cast": [
      {
        "name": "Лайт Ягами",
        "role": "Владелец тетради"
      },
      {
        "name": "L",
        "role": "Гениальный детектив"
      },
      {
        "name": "Рюк",
        "role": "Синигами-наблюдатель"
      },
      {
        "name": "Миса Аманэ",
        "role": "Айдол и союзница Лайта"
      },
      {
        "name": "Соичиро Ягами",
        "role": "Отец Лайта и полицейский"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 76
  },
  {
    "slug": "jujutsu-kaisen",
    "title": "Магическая битва",
    "originalTitle": "Jujutsu Kaisen",
    "searchTitles": [
      "магическая битва",
      "jujutsu kaisen",
      "дзюдзюцу кайсен",
      "юдзи",
      "годжо"
    ],
    "type": "Аниме",
    "year": "2020",
    "rating": 8.6,
    "genres": [
      "Аниме",
      "Экшен",
      "Фэнтези",
      "Сверхъестественное"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/fHpKWq9ayzSk8nSwqRuaAUemRKh.jpg",
    "description": "Динамичное аниме о проклятиях, магии и учениках, которым рано расслабляться.",
    "trailerUrl": "https://www.youtube.com/embed/pkKu9hLT-t8",
    "longDescription": "Юдзи Итадори оказывается связан с могущественным проклятием и поступает в школу магов, где учатся бороться с опасными сущностями. Аниме быстро переключается между юмором, боевой постановкой и серьёзными ставками.",
    "facts": [
      {
        "label": "Год",
        "value": "2020"
      },
      {
        "label": "Тип",
        "value": "Аниме"
      },
      {
        "label": "Страна",
        "value": "Япония"
      },
      {
        "label": "Длительность",
        "value": "24 мин / серия"
      },
      {
        "label": "Студия",
        "value": "MAPPA"
      },
      {
        "label": "Оригинал",
        "value": "Манга Gege Akutami"
      },
      {
        "label": "Настроение",
        "value": "Быстро, эффектно, сверхъестественно"
      },
      {
        "label": "Темы",
        "value": "Дружба, долг, проклятия"
      }
    ],
    "cast": [
      {
        "name": "Юдзи Итадори",
        "role": "Ученик магической школы"
      },
      {
        "name": "Мегуми Фусигуро",
        "role": "Спокойный и сильный маг"
      },
      {
        "name": "Нобара Кугисаки",
        "role": "Уверенная боевая союзница"
      },
      {
        "name": "Сатору Годжо",
        "role": "Наставник с пугающей силой"
      },
      {
        "name": "Сукуна",
        "role": "Король проклятий"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 77
  },
  {
    "slug": "fullmetal-alchemist-brotherhood",
    "title": "Стальной алхимик: Братство",
    "originalTitle": "Fullmetal Alchemist: Brotherhood",
    "searchTitles": [
      "стальной алхимик",
      "fullmetal alchemist",
      "brotherhood",
      "эдвард элрик"
    ],
    "type": "Аниме",
    "year": "2009",
    "rating": 9.1,
    "genres": [
      "Аниме",
      "Приключения",
      "Фэнтези",
      "Драма"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/5ZFUEOULaVml7pQuXxhpR2SmVUw.jpg",
    "description": "История двух братьев, алхимии и закона равноценного обмена.",
    "trailerUrl": "https://www.youtube.com/embed/2uq34TeWEdQ",
    "longDescription": "Эдвард и Альфонс Элрики ищут способ вернуть потерянное после трагического эксперимента. Их путь раскрывает не только правила алхимии, но и большую политическую тайну, где цена силы всегда оказывается личной.",
    "facts": [
      {
        "label": "Год",
        "value": "2009"
      },
      {
        "label": "Тип",
        "value": "Аниме"
      },
      {
        "label": "Страна",
        "value": "Япония"
      },
      {
        "label": "Длительность",
        "value": "24 мин / серия"
      },
      {
        "label": "Студия",
        "value": "Bones"
      },
      {
        "label": "Оригинал",
        "value": "Манга Hiromu Arakawa"
      },
      {
        "label": "Настроение",
        "value": "Эпично, драматично, приключенчески"
      },
      {
        "label": "Темы",
        "value": "Семья, цена силы, искупление"
      }
    ],
    "cast": [
      {
        "name": "Эдвард Элрик",
        "role": "Стальной алхимик"
      },
      {
        "name": "Альфонс Элрик",
        "role": "Брат Эдварда в доспехах"
      },
      {
        "name": "Рой Мустанг",
        "role": "Огненный алхимик"
      },
      {
        "name": "Уинри Рокбелл",
        "role": "Механик и близкая подруга"
      },
      {
        "name": "Скар",
        "role": "Мститель с тяжёлым прошлым"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 78
  },
  {
    "slug": "one-piece",
    "title": "Ван-Пис",
    "originalTitle": "One Piece",
    "searchTitles": [
      "ван пис",
      "ван-пис",
      "one piece",
      "луффи",
      "пираты"
    ],
    "type": "Аниме",
    "year": "1999",
    "rating": 9.0,
    "genres": [
      "Аниме",
      "Приключения",
      "Экшен",
      "Комедия"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/cMD9Ygz11zjJzAovURpO75Qg7rT.jpg",
    "description": "Большое пиратское приключение о мечтах, команде и поиске легендарного сокровища.",
    "trailerUrl": "https://www.youtube.com/embed/S8_YwFLCh4U",
    "longDescription": "Монки Д. Луффи собирает команду, чтобы отправиться к Гранд Лайн и найти сокровище One Piece. За весёлым приключением скрывается огромный мир, где дружба, свобода и мечты важнее любой карты.",
    "facts": [
      {
        "label": "Год",
        "value": "1999"
      },
      {
        "label": "Тип",
        "value": "Аниме"
      },
      {
        "label": "Страна",
        "value": "Япония"
      },
      {
        "label": "Длительность",
        "value": "24 мин / серия"
      },
      {
        "label": "Студия",
        "value": "Toei Animation"
      },
      {
        "label": "Оригинал",
        "value": "Манга Eiichiro Oda"
      },
      {
        "label": "Настроение",
        "value": "Весело, масштабно, приключенчески"
      },
      {
        "label": "Темы",
        "value": "Свобода, дружба, мечта"
      }
    ],
    "cast": [
      {
        "name": "Монки Д. Луффи",
        "role": "Капитан Пиратов Соломенной Шляпы"
      },
      {
        "name": "Ророноа Зоро",
        "role": "Мечник команды"
      },
      {
        "name": "Нами",
        "role": "Навигатор"
      },
      {
        "name": "Санджи",
        "role": "Кок и боец"
      },
      {
        "name": "Усопп",
        "role": "Стрелок и рассказчик"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 79
  },
  {
    "slug": "chainsaw-man",
    "title": "Человек-бензопила",
    "originalTitle": "Chainsaw Man",
    "searchTitles": [
      "человек бензопила",
      "человек-бензопила",
      "chainsaw man",
      "дэнджи",
      "почита"
    ],
    "type": "Аниме",
    "year": "2022",
    "rating": 8.5,
    "genres": [
      "Аниме",
      "Экшен",
      "Фэнтези",
      "Драма"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/npdB6eFzizki0WaZ1OvKcJrWe97.jpg",
    "description": "Безумное и энергичное аниме о парне, демонах и мечте о нормальной жизни.",
    "trailerUrl": "https://www.youtube.com/embed/v4yLeNt-kCU",
    "longDescription": "Дэнджи живёт в долгах и охотится на демонов вместе с Почитой, пока обстоятельства не превращают его в Человека-бензопилу. История сочетает экшен, абсурдный юмор и очень человеческое желание просто жить лучше.",
    "facts": [
      {
        "label": "Год",
        "value": "2022"
      },
      {
        "label": "Тип",
        "value": "Аниме"
      },
      {
        "label": "Страна",
        "value": "Япония"
      },
      {
        "label": "Длительность",
        "value": "24 мин / серия"
      },
      {
        "label": "Студия",
        "value": "MAPPA"
      },
      {
        "label": "Оригинал",
        "value": "Манга Tatsuki Fujimoto"
      },
      {
        "label": "Настроение",
        "value": "Дико, энергично, странно трогательно"
      },
      {
        "label": "Темы",
        "value": "Мечты, выживание, доверие"
      }
    ],
    "cast": [
      {
        "name": "Дэнджи",
        "role": "Парень, ставший Человеком-бензопилой"
      },
      {
        "name": "Почита",
        "role": "Демон-бензопила и друг"
      },
      {
        "name": "Макима",
        "role": "Загадочная руководительница"
      },
      {
        "name": "Аки Хаякава",
        "role": "Охотник на демонов"
      },
      {
        "name": "Пауэр",
        "role": "Демон крови с ярким характером"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 80
  },
  {
    "slug": "cyberpunk-edgerunners",
    "title": "Киберпанк: Бегущие по краю",
    "originalTitle": "Cyberpunk: Edgerunners",
    "searchTitles": [
      "киберпанк",
      "cyberpunk edgerunners",
      "бегущие по краю",
      "дэвид мартинес"
    ],
    "type": "Аниме",
    "year": "2022",
    "rating": 8.6,
    "genres": [
      "Аниме",
      "Фантастика",
      "Экшен",
      "Драма"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/7jSWOc6jWSw5hZ78HB8Hw3pJxuk.jpg",
    "description": "Неоновая история Найт-Сити о скорости, мечтах и цене улучшений.",
    "trailerUrl": "https://www.youtube.com/embed/JtqIas3bYhg",
    "longDescription": "Дэвид Мартинес попадает в мир наёмников, имплантов и больших рисков. Найт-Сити обещает быстрый подъём, но каждая новая возможность там почти всегда требует слишком дорогой оплаты.",
    "facts": [
      {
        "label": "Год",
        "value": "2022"
      },
      {
        "label": "Тип",
        "value": "Аниме"
      },
      {
        "label": "Страна",
        "value": "Япония, Польша"
      },
      {
        "label": "Длительность",
        "value": "24–27 мин / серия"
      },
      {
        "label": "Студия",
        "value": "Studio Trigger, CD Projekt Red"
      },
      {
        "label": "Основа",
        "value": "Вселенная Cyberpunk 2077"
      },
      {
        "label": "Настроение",
        "value": "Неоново, быстро, трагично"
      },
      {
        "label": "Темы",
        "value": "Амбиции, город, цена силы"
      }
    ],
    "cast": [
      {
        "name": "Дэвид Мартинес",
        "role": "Парень, который хочет вырваться выше"
      },
      {
        "name": "Люси",
        "role": "Нетраннер и ключевая союзница"
      },
      {
        "name": "Мэйн",
        "role": "Лидер команды"
      },
      {
        "name": "Ребекка",
        "role": "Боевая и резкая участница команды"
      },
      {
        "name": "Киви",
        "role": "Опытная нетраннерша"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 81
  },
  {
    "slug": "vinland-saga",
    "title": "Сага о Винланде",
    "originalTitle": "Vinland Saga",
    "searchTitles": [
      "сага о винланде",
      "vinland saga",
      "торфинн",
      "викинги"
    ],
    "type": "Аниме",
    "year": "2019",
    "rating": 8.8,
    "genres": [
      "Аниме",
      "История",
      "Драма",
      "Приключения"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/rDBHXTuQQAw0o4AdVwfKKhYzWvS.jpg",
    "description": "Историческая аниме-драма о мести, взрослении и поиске настоящей свободы.",
    "trailerUrl": "https://www.youtube.com/embed/f8JrZ7Q_p-8",
    "longDescription": "Торфинн растёт в мире викингов, войн и личной мести. Но чем дальше идёт его путь, тем сильнее история смещается от битв к вопросу: что значит жить свободно и не повторять круг насилия.",
    "facts": [
      {
        "label": "Год",
        "value": "2019"
      },
      {
        "label": "Тип",
        "value": "Аниме"
      },
      {
        "label": "Страна",
        "value": "Япония"
      },
      {
        "label": "Длительность",
        "value": "24 мин / серия"
      },
      {
        "label": "Студия",
        "value": "Wit Studio, MAPPA"
      },
      {
        "label": "Оригинал",
        "value": "Манга Makoto Yukimura"
      },
      {
        "label": "Настроение",
        "value": "Сурово, исторично, драматично"
      },
      {
        "label": "Темы",
        "value": "Месть, свобода, взросление"
      }
    ],
    "cast": [
      {
        "name": "Торфинн",
        "role": "Юный воин, ищущий свой путь"
      },
      {
        "name": "Аскеладд",
        "role": "Хитрый лидер наёмников"
      },
      {
        "name": "Торс",
        "role": "Отец Торфинна"
      },
      {
        "name": "Кнуд",
        "role": "Принц с непростой судьбой"
      },
      {
        "name": "Торкель",
        "role": "Сильнейший воин и любитель битв"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 82
  },
  {
    "slug": "cowboy-bebop",
    "title": "Ковбой Бибоп",
    "originalTitle": "Cowboy Bebop",
    "searchTitles": [
      "ковбой бибоп",
      "cowboy bebop",
      "спайк",
      "джаз",
      "космос"
    ],
    "type": "Аниме",
    "year": "1998",
    "rating": 8.9,
    "genres": [
      "Аниме",
      "Фантастика",
      "Приключения",
      "Драма"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/xDiXDfZwC6XYC6fxHI1jl3A3Ill.jpg",
    "description": "Космический нуар с джазом, охотниками за головами и прошлым, от которого не улететь.",
    "trailerUrl": "https://www.youtube.com/embed/RI08P5SaJNU",
    "longDescription": "Экипаж корабля Bebop берётся за разные задания по всей Солнечной системе. За лёгким стилем и музыкой скрываются одиночество, старые ошибки и истории людей, которые постоянно пытаются догнать завтрашний день.",
    "facts": [
      {
        "label": "Год",
        "value": "1998"
      },
      {
        "label": "Тип",
        "value": "Аниме"
      },
      {
        "label": "Страна",
        "value": "Япония"
      },
      {
        "label": "Длительность",
        "value": "24 мин / серия"
      },
      {
        "label": "Студия",
        "value": "Sunrise"
      },
      {
        "label": "Режиссёр",
        "value": "Shinichirō Watanabe"
      },
      {
        "label": "Настроение",
        "value": "Стильно, джазово, меланхолично"
      },
      {
        "label": "Темы",
        "value": "Прошлое, свобода, одиночество"
      }
    ],
    "cast": [
      {
        "name": "Спайк Шпигель",
        "role": "Охотник за головами с прошлым"
      },
      {
        "name": "Джет Блэк",
        "role": "Капитан Bebop"
      },
      {
        "name": "Фэй Валентайн",
        "role": "Авантюристка с долгами"
      },
      {
        "name": "Эд",
        "role": "Гениальная хакерша"
      },
      {
        "name": "Эйн",
        "role": "Очень умный пёс"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 83
  },
  {
    "slug": "kung-fu-panda",
    "title": "Кунг-фу Панда",
    "originalTitle": "Kung Fu Panda",
    "searchTitles": [
      "кунг фу панда",
      "kung fu panda",
      "по",
      "панда"
    ],
    "type": "Мультфильм",
    "year": "2008",
    "rating": 7.6,
    "genres": [
      "Анимация",
      "Комедия",
      "Приключения",
      "Семейный"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/wWt4JYXTg5Wr3xBW2phBrMKgp3x.jpg",
    "description": "История ленивого мечтателя По, который внезапно получает шанс стать воином.",
    "trailerUrl": "https://www.youtube.com/embed/PXi3Mv6KMzY",
    "longDescription": "По обожает лапшу и кунг-фу, но сам не похож на легендарного героя. Когда его неожиданно выбирают Воином Дракона, ему приходится доказать, что сила может прятаться там, где её никто не ищет.",
    "facts": [
      {
        "label": "Год",
        "value": "2008"
      },
      {
        "label": "Тип",
        "value": "Мультфильм"
      },
      {
        "label": "Страна",
        "value": "США"
      },
      {
        "label": "Длительность",
        "value": "92 мин"
      },
      {
        "label": "Студия",
        "value": "DreamWorks Animation"
      },
      {
        "label": "Режиссёры",
        "value": "John Stevenson, Mark Osborne"
      },
      {
        "label": "Настроение",
        "value": "Весело, тепло, боевито"
      },
      {
        "label": "Темы",
        "value": "Самопринятие, вера, мастерство"
      }
    ],
    "cast": [
      {
        "name": "По",
        "role": "Панда, который мечтает о кунг-фу"
      },
      {
        "name": "Шифу",
        "role": "Строгий наставник"
      },
      {
        "name": "Тигрица",
        "role": "Сильная участница Пятёрки"
      },
      {
        "name": "Тай Лунг",
        "role": "Опасный противник"
      },
      {
        "name": "Мастер Угвей",
        "role": "Мудрый учитель"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      }
    ],
    "id": 84
  },
  {
    "slug": "zootopia",
    "title": "Зверополис",
    "originalTitle": "Zootopia",
    "searchTitles": [
      "зверополис",
      "zootopia",
      "зутопия",
      "джуди хоппс",
      "ник уайлд"
    ],
    "type": "Мультфильм",
    "year": "2016",
    "rating": 8.0,
    "genres": [
      "Анимация",
      "Комедия",
      "Приключения",
      "Детектив"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/hlK0e0wAQ3VLuJcsfIYPvb4JVud.jpg",
    "description": "Детективная история в городе животных, где маленькая крольчиха берётся за большое дело.",
    "trailerUrl": "https://www.youtube.com/embed/jWM0ct-OLsM",
    "longDescription": "Джуди Хоппс приезжает в Зверополис, чтобы стать настоящим полицейским, но быстро понимает: мечта требует больше, чем энтузиазм. Вместе с хитрым Ником Уайлдом она расследует дело, которое меняет взгляд города на самого себя.",
    "facts": [
      {
        "label": "Год",
        "value": "2016"
      },
      {
        "label": "Тип",
        "value": "Мультфильм"
      },
      {
        "label": "Страна",
        "value": "США"
      },
      {
        "label": "Длительность",
        "value": "108 мин"
      },
      {
        "label": "Студия",
        "value": "Walt Disney Animation Studios"
      },
      {
        "label": "Режиссёры",
        "value": "Byron Howard, Rich Moore"
      },
      {
        "label": "Настроение",
        "value": "Ярко, смешно, детективно"
      },
      {
        "label": "Темы",
        "value": "Предрассудки, дружба, смелость"
      }
    ],
    "cast": [
      {
        "name": "Джуди Хоппс",
        "role": "Крольчиха-полицейская"
      },
      {
        "name": "Ник Уайлд",
        "role": "Хитрый лис и неожиданный напарник"
      },
      {
        "name": "Буйволсон",
        "role": "Начальник полиции"
      },
      {
        "name": "Газелле",
        "role": "Поп-звезда города"
      },
      {
        "name": "Леодор Златогрив",
        "role": "Мэр Зверополиса"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      }
    ],
    "id": 85
  },
  {
    "slug": "moana",
    "title": "Моана",
    "originalTitle": "Moana",
    "searchTitles": [
      "моана",
      "moana",
      "мауи",
      "океан"
    ],
    "type": "Мультфильм",
    "year": "2016",
    "rating": 7.6,
    "genres": [
      "Анимация",
      "Приключения",
      "Семейный",
      "Музыка"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/4JeejGugONWpJkbnvL12hVoYEDa.jpg",
    "description": "Музыкальное приключение о девушке, океане и поиске своего пути.",
    "trailerUrl": "https://www.youtube.com/embed/LKFuXETZUsI",
    "longDescription": "Моана отправляется за риф, чтобы спасти свой остров и понять, кем она хочет быть. На пути ей помогает полубог Мауи, а главным наставником становится сам океан — довольно нестандартный, но эффектный коуч.",
    "facts": [
      {
        "label": "Год",
        "value": "2016"
      },
      {
        "label": "Тип",
        "value": "Мультфильм"
      },
      {
        "label": "Страна",
        "value": "США"
      },
      {
        "label": "Длительность",
        "value": "107 мин"
      },
      {
        "label": "Студия",
        "value": "Walt Disney Animation Studios"
      },
      {
        "label": "Режиссёры",
        "value": "Ron Clements, John Musker"
      },
      {
        "label": "Настроение",
        "value": "Ярко, музыкально, приключенчески"
      },
      {
        "label": "Темы",
        "value": "Семья, путь, смелость"
      }
    ],
    "cast": [
      {
        "name": "Моана",
        "role": "Дочь вождя и будущая путешественница"
      },
      {
        "name": "Мауи",
        "role": "Полубог с большим эго"
      },
      {
        "name": "Тала",
        "role": "Бабушка Моаны"
      },
      {
        "name": "Таматоа",
        "role": "Краб, который слишком любит блеск"
      },
      {
        "name": "Океан",
        "role": "Самый водный помощник"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      }
    ],
    "id": 86
  },
  {
    "slug": "the-incredibles",
    "title": "Суперсемейка",
    "originalTitle": "The Incredibles",
    "searchTitles": [
      "суперсемейка",
      "the incredibles",
      "мистер исключительный",
      "pixar"
    ],
    "type": "Мультфильм",
    "year": "2004",
    "rating": 8.0,
    "genres": [
      "Анимация",
      "Экшен",
      "Комедия",
      "Семейный"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/2LqaLgk4Z226KkgPJuiOQ58wvrm.jpg",
    "description": "Семейная супергеройская история о том, что спасать мир проще, когда дома есть поддержка.",
    "trailerUrl": "https://www.youtube.com/embed/-UaGUdNJdRQ",
    "longDescription": "Семья Парр пытается жить обычной жизнью после запрета супергероев, но прошлое и новые угрозы быстро возвращают их в дело. Мультфильм смешивает экшен, семейную драму и отличный ретро-стиль.",
    "facts": [
      {
        "label": "Год",
        "value": "2004"
      },
      {
        "label": "Тип",
        "value": "Мультфильм"
      },
      {
        "label": "Страна",
        "value": "США"
      },
      {
        "label": "Длительность",
        "value": "115 мин"
      },
      {
        "label": "Студия",
        "value": "Pixar Animation Studios"
      },
      {
        "label": "Режиссёр",
        "value": "Brad Bird"
      },
      {
        "label": "Настроение",
        "value": "Динамично, семейно, супергеройски"
      },
      {
        "label": "Темы",
        "value": "Семья, принятие, команда"
      }
    ],
    "cast": [
      {
        "name": "Боб Парр",
        "role": "Мистер Исключительный"
      },
      {
        "name": "Хелен Парр",
        "role": "Эластика"
      },
      {
        "name": "Виолетта",
        "role": "Дочь с силовыми полями"
      },
      {
        "name": "Шастик",
        "role": "Очень быстрый сын"
      },
      {
        "name": "Синдром",
        "role": "Злодей с обидой и гаджетами"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      }
    ],
    "id": 87
  },
  {
    "slug": "cosmos-a-spacetime-odyssey",
    "title": "Космос: Пространство и время",
    "originalTitle": "Cosmos: A Spacetime Odyssey",
    "searchTitles": [
      "космос пространство и время",
      "cosmos",
      "нил деграсс тайсон",
      "документальный космос"
    ],
    "type": "Документальный",
    "year": "2014",
    "rating": 9.3,
    "genres": [
      "Документальный",
      "Наука",
      "Космос"
    ],
    "poster": "https://kinogo.online/uploads/posts/2021-03/1615665601-1144240884.jpg",
    "description": "Документальное путешествие по Вселенной, науке и месту человека в огромном космосе.",
    "trailerUrl": "https://www.youtube.com/embed/XFF2ECZ8m1A",
    "longDescription": "Нил Деграсс Тайсон ведёт зрителя через историю науки, строение Вселенной и идеи, которые изменили наше понимание мира. Проект объясняет сложные вещи через визуальные образы и чувство удивления.",
    "facts": [
      {
        "label": "Год",
        "value": "2014"
      },
      {
        "label": "Тип",
        "value": "Документальный"
      },
      {
        "label": "Страна",
        "value": "США"
      },
      {
        "label": "Длительность",
        "value": "около 44 мин / серия"
      },
      {
        "label": "Студия",
        "value": "Cosmos Studios, Fuzzy Door Productions"
      },
      {
        "label": "Ведущий",
        "value": "Neil deGrasse Tyson"
      },
      {
        "label": "Настроение",
        "value": "Познавательно, красиво, масштабно"
      },
      {
        "label": "Темы",
        "value": "Космос, наука, история идей"
      }
    ],
    "cast": [
      {
        "name": "Neil deGrasse Tyson",
        "role": "Ведущий"
      },
      {
        "name": "Ann Druyan",
        "role": "Автор и продюсер"
      },
      {
        "name": "Carl Sagan",
        "role": "Духовное наследие проекта"
      },
      {
        "name": "Корабль воображения",
        "role": "Визуальный проводник"
      },
      {
        "name": "Вселенная",
        "role": "Главная тема"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 88
  },
  {
    "slug": "free-solo",
    "title": "Фри-соло",
    "originalTitle": "Free Solo",
    "searchTitles": [
      "фри соло",
      "free solo",
      "alex honnold",
      "эль капитан"
    ],
    "type": "Документальный",
    "year": "2018",
    "rating": 8.1,
    "genres": [
      "Документальный",
      "Спорт",
      "Биография"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/v4QfYZMACODlWul9doN9RxE99ag.jpg",
    "description": "Документальный фильм об Алексe Хоннольде и восхождении, где нет права на ошибку.",
    "trailerUrl": "https://www.youtube.com/embed/urRVZ4SW7WU",
    "longDescription": "Алекс Хоннольд готовится к свободному прохождению стены Эль-Капитан без страховки. Фильм показывает не только физическую подготовку, но и психологию человека, который умеет управлять страхом иначе, чем большинство людей.",
    "facts": [
      {
        "label": "Год",
        "value": "2018"
      },
      {
        "label": "Тип",
        "value": "Документальный"
      },
      {
        "label": "Страна",
        "value": "США"
      },
      {
        "label": "Длительность",
        "value": "100 мин"
      },
      {
        "label": "Студия",
        "value": "National Geographic Documentary Films"
      },
      {
        "label": "Режиссёры",
        "value": "Elizabeth Chai Vasarhelyi, Jimmy Chin"
      },
      {
        "label": "Настроение",
        "value": "Напряжённо, вдохновляюще, честно"
      },
      {
        "label": "Темы",
        "value": "Риск, концентрация, мечта"
      }
    ],
    "cast": [
      {
        "name": "Alex Honnold",
        "role": "Скалолаз"
      },
      {
        "name": "Jimmy Chin",
        "role": "Режиссёр и оператор"
      },
      {
        "name": "Elizabeth Chai Vasarhelyi",
        "role": "Режиссёр"
      },
      {
        "name": "Tommy Caldwell",
        "role": "Скалолаз и друг"
      },
      {
        "name": "Эль-Капитан",
        "role": "Главная стена фильма"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 89
  },
  {
    "slug": "the-last-dance",
    "title": "Последний танец",
    "originalTitle": "The Last Dance",
    "searchTitles": [
      "последний танец",
      "the last dance",
      "майкл джордан",
      "chicago bulls"
    ],
    "type": "Документальный",
    "year": "2020",
    "rating": 9.1,
    "genres": [
      "Документальный",
      "Спорт",
      "Биография"
    ],
    "poster": "https://image.tmdb.org/t/p/w500/zU0htwkhNvBQdVSIKB9s6hgVeFK.jpg",
    "description": "Документальный сериал о Майкле Джордане, Chicago Bulls и сезоне, ставшем легендой.",
    "trailerUrl": "https://www.youtube.com/embed/N9Z9JtNcCWY",
    "longDescription": "Проект возвращает зрителя в финальный чемпионский сезон Chicago Bulls и показывает, как строилась одна из самых известных спортивных династий. Это история таланта, давления, лидерства и команды, которая стала символом эпохи.",
    "facts": [
      {
        "label": "Год",
        "value": "2020"
      },
      {
        "label": "Тип",
        "value": "Документальный"
      },
      {
        "label": "Страна",
        "value": "США"
      },
      {
        "label": "Длительность",
        "value": "около 50 мин / серия"
      },
      {
        "label": "Студия",
        "value": "ESPN Films, Netflix"
      },
      {
        "label": "Режиссёр",
        "value": "Jason Hehir"
      },
      {
        "label": "Настроение",
        "value": "Динамично, спортивно, ностальгично"
      },
      {
        "label": "Темы",
        "value": "Лидерство, команда, победа"
      }
    ],
    "cast": [
      {
        "name": "Michael Jordan",
        "role": "Главный герой"
      },
      {
        "name": "Scottie Pippen",
        "role": "Игрок Chicago Bulls"
      },
      {
        "name": "Dennis Rodman",
        "role": "Игрок Chicago Bulls"
      },
      {
        "name": "Phil Jackson",
        "role": "Тренер"
      },
      {
        "name": "Chicago Bulls",
        "role": "Команда эпохи"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 90
  },
  {
    "slug": "my-octopus-teacher",
    "title": "Мой учитель — осьминог",
    "originalTitle": "My Octopus Teacher",
    "searchTitles": [
      "мой учитель осьминог",
      "my octopus teacher",
      "осьминог",
      "документальный океан"
    ],
    "type": "Документальный",
    "year": "2020",
    "rating": 8.1,
    "genres": [
      "Документальный",
      "Природа"
    ],
    "poster": "https://avatars.mds.yandex.net/get-kinopoisk-image/1704946/d331d388-d5f6-43af-8911-c4b60d863484/600x900",
    "description": "Тихий документальный фильм о необычной связи человека и осьминога в подводном лесу.",
    "trailerUrl": "https://www.youtube.com/embed/3s0LTDhqe5A",
    "longDescription": "Крейг Фостер каждый день возвращается в холодные воды у побережья Южной Африки и наблюдает за жизнью осьминога. Постепенно это становится историей о внимании, восстановлении и уважении к природе.",
    "facts": [
      {
        "label": "Год",
        "value": "2020"
      },
      {
        "label": "Тип",
        "value": "Документальный"
      },
      {
        "label": "Страна",
        "value": "Южная Африка"
      },
      {
        "label": "Длительность",
        "value": "85 мин"
      },
      {
        "label": "Студия",
        "value": "Netflix, Off the Fence"
      },
      {
        "label": "Режиссёры",
        "value": "Pippa Ehrlich, James Reed"
      },
      {
        "label": "Настроение",
        "value": "Спокойно, красиво, созерцательно"
      },
      {
        "label": "Темы",
        "value": "Природа, связь, внимание"
      }
    ],
    "cast": [
      {
        "name": "Craig Foster",
        "role": "Наблюдатель и рассказчик"
      },
      {
        "name": "Осьминог",
        "role": "Главная героиня наблюдений"
      },
      {
        "name": "Подводный лес",
        "role": "Ключевая локация"
      },
      {
        "name": "Pippa Ehrlich",
        "role": "Режиссёр"
      },
      {
        "name": "James Reed",
        "role": "Режиссёр"
      }
    ],
    "players": [
      {
        "id": "player-1",
        "name": "Плеер 1",
        "embedUrl": ""
      },
      {
        "id": "player-2",
        "name": "Плеер 2",
        "embedUrl": ""
      },
      {
        "id": "player-3",
        "name": "Плеер 3",
        "embedUrl": ""
      }
    ],
    "id": 91
  },
  {
      id: 92,
      slug: "scorpion",
      title: "Скорпион",
      originalTitle: "Scorpion",
      searchTitles: ["Скорпион", "Scorpion"],
      type: "Сериал",
      year: "2014 - 2018",
      rating: 7,
      genres: [
        "Боевик",
        "Триллер",
        "Драма",
        "Криминал",
      ],
      poster: "https://kinopoisk-ru.clstorage.net/2a95Th371/ce5fd6dh031/9C3Jy3slmvceAtTBAgdMaA3T7Ev5QhuB-Qxj2-8i3oj_tcRKPTkOiHomYozQy71zd3cihjkMsqduTj_qGBXe5XT-yNyp4s1iCZAGQQFSDe9IEDsbfJAOEP5ItI046RKC8z-Yw7LzBoNid_EcFtxqZqdnNQQ9GvSiq9KxbAxZjfv67oeKsX0S_BHTGEWJRI_lFJRnTKlF1gbrDKFVoKPeDrG710s4O81A6HAy3QfU6SfnpzoOvdSsrKrYv_DIUgV5fOWEQz0yH_WQ1NPJy04LL9JTZI3vDZEBa4ujnWqgnoa9eZPIPLvGAms5t5fDVCtl5uBwgnXbJe6qE300QtbJOXzmT4-8_lO-kVXeRw-LR2ySUywL4cJYBuoK494laJiOfjlURfO9S0Gqdz3ZSNDor6VvfMR1nK1nLl7wOUMcBnl2KULD939a9d4amkrASwXmUpIjhCgOXE7mQqgb6KYcBvq620W1_8fB6zdx3cdVoWEv6TqPNJLpaCYX_3ZO1QQ9vm5LQn-3Uz_QGt4MRA2Nahsb44ciBt7Eaw2gEuCikwQw_t5OeP1CCKVzfZkGWiohrWb7TT2Zr6tuFnK6DthLsjjsDM6_vJF3FFyZTwxECK1cHeQCKUcfRisFKd2lJdeLN3TSwP-zzUxsv7GZDtVsL6Hju040kimurtR0eEUfTXl-pkoLfjXSeljc2EHDxYlgFZzgwurGnMFpAK2TLKoYALp1XoS2tA-L7_rwEk0YoGxtr78DvBElr-dVsv-F2U30seLLQ3-_EPyfEBdDC0QE7Z_Z4Mqny1FCo0fiEqhvU8-wtFQFNjtOjGf69pFBH2zk5GW3jjhSIihsX754z5HB8njhgs97Nxo3FliWTQWFRaTQHGiNIgZbCWiOa1OpppRCPv9UA77wTovjdH7Xg1-kZGio-Mv7GarqJBl4PQrViXx1qsnJ-zqVMBqZEI2IS4fqnFknj-_Jm4hjhi-UKOYeQHm2nI1-Oc5CobQ52AdSqGOlbv2E81xuaqXZ9blLmUe-ce2LAfZymnpR3deCAk6AZ94Sro0kiVCAKcSs1Knj2Mu595WCunDHgqe-MpxF36nnZu2_C_pV5uotEXC6SxlOsLpug8e-MtL1XtCbBEfLxiBbFW2Pow-eAOrML9Zna5cIeHmSSju7QUKoM33TwNij4KYqfgu7niqoL9x_cExWzvRwKkoKNnfa8B-bGMLDB0xi0hPvhSnPEIXjg2NSKmvVhrYz20s_8EZPbPg4FUNd6i3sKjpPvRNn5qJdtHXOkAl0N6yPzfM23XyTnNYIRwyHJZSSbsVsB9SBZo7iEeeum0r-P9UNcjpNBKLxv90DGCLtp-02AvAeYmukl7T1i1FHcXyjREb_upT0W9sQQwUKRqxV2ibDYAsXyGwGJVRt4JwLM76ey7N5jUJrOTeaBhXr5C6nfcq80OqgZBYw90XYDTL46EwF8XBbfZJQ38iJQgOiH5Pow6INX8YnCKCVZqqVhv73Uwq3dc5JYrq-mAncomQh7vsPPBrtJOYfPvgL0c929aCAQ_n3Wn8QGZECyAvE7d4cJYjiyZJI4UCsFewmFgj989sL_fyFxOP3-FEO2KPnZGD_ijuTLagjm3OxC1HPePXhz4xzvtpyFtxcycrNS6IXXmXELkJShGcAqFXh5xsKMrZTDTg3zMUlvneUSVfubOTptoVwWeznKxb8uEyfQz147IOKsfdbNR_VVkpExY6sHdvuC6AGU4avAuBYJCMZiD111o78uMIFKLn-F4maa-ahaX6D_5VmZC_dv7TOHwmzcCbAxLy6GvhSF1cJiczE4xUUKAVnDlfBaMrsm6fmWYf_OZeFdvWKh2pwPhxNEqKv524_RDRcKusvWXi3y55IOzStC4M58ts8mZfazIWCwWSfnG3CZ0ebBqPLpFToIpQO-LWbizrygcFpsPASTltlaWihP8t8UKpm71Y9sYjfTj34LIyMcnPc8xPU28uFC4ijFNXozKlN2k6rx2pR4CIXyjZ9GoH8P0WAIvl2EUSfrajmbrfCPZDiYGyX9neGlYd1-usNRPa1Ev1fEpDLQsDOrBzUpkwmCdEN6MTk0-3n0QO29FfDPDDFx6y5uZKE0ujpr-v_yvBRb67j3Dq-wlEMNDBkC0l6fZtykRNbCE2EDyOcUyfIrgiUTywPYRLgIFnM-nOciTBxjkIr-HjTjNUtZqjgdEa0niNn5lZ79EwYTji6LoXJvLLTfBeZ2cGEBo3m0NJtwKLPl8LnBSVY7SJWw3B0l80yugoN7Hp3HcDWIWAtLz5L-1wmr6bUsD1FGE_2MiXIBPo8kLUf05ZPA8yBapvWbUUuQdBG50ovkOYikcvz_luK_TXJxeU5uFLOGivo6OY-SnTSK-8mHDJ3AhmOs_itD4I0uFx4UlcTicFCyGCXla7Lp8rUSuePodImr1dJ-_MTBPI3DAcn8T1fR9Xjo6Zm_QXyWurtb5k1f8RSjHJ14ceF_DqUdZOXGcULTQlmXFEkj-cCV89hwyOe56YTQXqynMM8eEYIa_j8lQBUoixtKTKN_FIn7mzVu34FmgP8eS3Ij3w4VX2SHBkMyU2JIJRcZABuydNB50AoWeFol0w48xbL8DWOhaI5_1FO0KptaSvzS3Kbqatlk_cwAh1AMvypR417fZf2nFhXS48EjCBSWmBC70ETRC-HJVztqFiJc7sSwXA9zcvkNvgcRFSibG_htwp_1iyv4ln_OExeTHzyJAzKu_OYf5RTXgNLigkvlNZkRW6CGwLvCiTRoupUSjKyFgg2-MuKozvx1YETZOBnrz8AMpYmoKCc_HFFUE-492RFS_I4FbRQkRfAQgcArROaaQ9jyJBGIM3j2KQtH8kyMpOCt7kHhKyzNB-AV2EhZ651Q7IeqWdsVPY0ih7Msr_tg84081z8Ud_ZzIQNhqXaEK6MKgKbjq5CZ9Am6hxBNj_dgbSwggsv-Xndg1PqqahgNwO41q5oKw",
      posterFallbacks: [],
      description: "Динамичный сериал о команде гениальных специалистов, которые решают самые опасные и сложные кризисы для правительства и обычных людей, используя интеллект там, где бессильны обычные методы.",
      trailerUrl: "https://www.youtube.com/watch?v=vkQo84TxzHA",
      longDescription: "Захватывающий американский сериал в жанре драмы, боевика и техно-триллера о команде выдающихся гениев во главе с Уолтером О’Брайеном, обладающим одним из самых высоких IQ в мире. Вместе они работают на правительство США и берутся за самые сложные и опасные миссии: предотвращают кибератаки, спасают людей во время катастроф, взломов, авиакризисов и международных угроз. Каждый участник команды обладает уникальными способностями в области программирования, инженерии, математики, психологии и механики, что помогает им находить решения там, где обычные спецслужбы бессильны. Сериал «Scorpion» сочетает напряженный сюжет, высокие технологии, экшен, расследования, юмор и человеческие отношения, показывая, как гениальный интеллект помогает спасать жизни и бороться с глобальными угрозами. Отличный выбор для любителей сериалов про хакеров, технологии, спецоперации, искусственный интеллект, командную работу и нестандартные расследования.",
      facts: [
        { label: "Год", value: "2014 - 2018" },
        { label: "Тип", value: "Сериал" },
        { label: "Страна", value: "США" },
        { label: "Длительность", value: "43 Минуты серия" },
        { label: "Студия", value: "CBS Television Studios" },
        { label: "Режиссёр", value: "Сэм Хилл" },
      ],
      cast: [
        { name: "Elyes Gabel", role: "Уолтер О’Брайен" },
        { name: "Katharine McPhee", role: "Пейдж Динин" },
        { name: "Eddie Kaye Thomas", role: "Тоби Кёртис" },
        { name: "Jadyn Wong", role: "Хэппи Куинн" },
        { name: "Ari Stidham", role: "Сильвестр Додд" },
        { name: "Robert Patrick", role: "Кэб Галло" },
        { name: "Riley B. Smith", role: "Ральф Динин" },
      ],
      players: [
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ],
    },
];

export function getMovieBySlug(slug: string) {
  return movies.find((movie) => movie.slug === slug);
}
