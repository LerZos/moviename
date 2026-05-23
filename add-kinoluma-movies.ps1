# add-kinoluma-movies.ps1
$ErrorActionPreference = "Stop"

$moviesPath = Join-Path (Get-Location) "src\app\data\movies.ts"

if (!(Test-Path $moviesPath)) {
  throw "Не найден файл: $moviesPath. Запусти скрипт из C:\site\movie-site"
}

$content = [System.IO.File]::ReadAllText($moviesPath, [System.Text.Encoding]::UTF8)

$slugsToAdd = @(
  "the-shawshank-redemption",
  "forrest-gump",
  "the-lord-of-the-rings-the-fellowship-of-the-ring",
  "the-wild-robot",
  "inside-out-2",
  "furiosa-a-mad-max-saga",
  "alien-romulus",
  "a-silent-voice",
  "spirited-away",
  "coraline",
  "planet-earth"
)

$existing = @()
foreach ($slug in $slugsToAdd) {
  if ($content -match "slug:\s*`"$([regex]::Escape($slug))`"") {
    $existing += $slug
  }
}

if ($existing.Count -gt 0) {
  Write-Host "Некоторые фильмы уже есть, скрипт ничего не изменил:" -ForegroundColor Yellow
  $existing | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
  Write-Host "Чтобы не получить дублей, удали эти slug из скрипта или пришли мне git status." -ForegroundColor Yellow
  exit 0
}

$additions = @'
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
      poster: "https://image.tmdb.org/t/p/w500/1lin4LRaUHvYpQCOYggXj6U8QTT.jpg",
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
    }
'@

Copy-Item $moviesPath "$moviesPath.bak" -Force

$pattern = [regex]'(?s)(\r?\n\];\r?\n\r?\nexport function getMovieBySlug)'
if (-not $pattern.IsMatch($content)) {
  throw "Не нашёл конец массива movies перед getMovieBySlug. Файл не изменён."
}

$newContent = $pattern.Replace($content, ",`r`n$additions`r`n`r`n];`r`n`r`nexport function getMovieBySlug", 1)
[System.IO.File]::WriteAllText($moviesPath, $newContent, [System.Text.Encoding]::UTF8)

Write-Host "Готово: добавлены 11 фильмов в src\app\data\movies.ts" -ForegroundColor Green
Write-Host "Создан backup: src\app\data\movies.ts.bak" -ForegroundColor DarkGray
