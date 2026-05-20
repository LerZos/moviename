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
      poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
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
    }
];

export function getMovieBySlug(slug: string) {
  return movies.find((movie) => movie.slug === slug);
}
