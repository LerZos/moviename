import type { Metadata } from "next";

import { movies, type ContentType, type Movie } from "../data/movies";

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://kinoluma.online"
).replace(/\/$/, "");

export const catalogRoutes = [
  {
    slug: "films",
    type: "Фильм",
    label: "Фильмы",
    title: "Фильмы смотреть онлайн бесплатно",
    description:
      "Фильмы смотреть онлайн на KinoLuma: каталог кино с описаниями, рейтингами, трейлерами, жанрами и страницами просмотра без регистрации.",
    seoText:
      "В каталоге фильмов KinoLuma собраны разные жанры: фантастика, драма, триллеры, приключения, экшен и авторское кино. На страницах материалов есть краткое описание, подробный блок о фильме, рейтинг, жанры, актёры, трейлер и информация перед просмотром онлайн.",
  },
  {
    slug: "series",
    type: "Сериал",
    label: "Сериалы",
    title: "Сериалы смотреть онлайн бесплатно",
    description:
      "Сериалы смотреть онлайн на KinoLuma: популярные проекты, описания сезонов, рейтинги, трейлеры, жанры и страницы просмотра без регистрации.",
    seoText:
      "Раздел сериалов помогает выбрать историю на несколько вечеров: от драм и фантастики до криминальных проектов, мистики и приключений. У каждого сериала есть карточка с описанием, рейтингом, жанрами, трейлером и подробной страницей просмотра онлайн.",
  },
  {
    slug: "anime",
    type: "Аниме",
    label: "Аниме",
    title: "Аниме смотреть онлайн бесплатно",
    description:
      "Аниме смотреть онлайн на KinoLuma: культовые тайтлы, новые истории, трейлеры, рейтинги, жанры и подробные описания без регистрации.",
    seoText:
      "В разделе аниме собраны тайтлы с сильной атмосферой, яркой визуальной подачей и разными жанрами: экшен, фэнтези, романтика, драма и приключения. Страницы помогают быстро понять сюжет, настроение и формат просмотра онлайн.",
  },
  {
    slug: "cartoons",
    type: "Мультфильм",
    label: "Мультфильмы",
    title: "Мультфильмы смотреть онлайн бесплатно",
    description:
      "Мультфильмы смотреть онлайн на KinoLuma: семейная анимация, приключения, комедии, описания, рейтинги и трейлеры без регистрации.",
    seoText:
      "Мультфильмы KinoLuma — это анимация для лёгкого вечера, семейного просмотра и красивых приключений. В каталоге можно выбрать мультфильм по жанру, рейтингу, году, описанию и странице просмотра онлайн.",
  },
] as const;

export type CatalogRoute = (typeof catalogRoutes)[number];

const brandName = "KinoLuma";
const defaultImage = "/kinoluma-icon.png";
const seoOnlineSuffix = "смотреть онлайн бесплатно без регистрации";

function compactText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}


export function absoluteUrl(url: string) {
  if (!url) {
    return `${siteUrl}/kinoluma-icon.png`;
  }

  if (url.startsWith("http") || url.startsWith("data:")) {
    return url;
  }

  return `${siteUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function getCatalogRoute(slug: string) {
  return catalogRoutes.find((route) => route.slug === slug);
}

export function getCatalogRouteByType(type: ContentType) {
  return catalogRoutes.find((route) => route.type === type) ?? catalogRoutes[0];
}

const cyrillicToLatinMap: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function normalizeGenreSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function legacySlugifyGenre(genre: string) {
  return genre
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugifyGenre(genre: string) {
  return genre
    .toLowerCase()
    .split("")
    .map((char) => cyrillicToLatinMap[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getGenresForCatalog(route: CatalogRoute) {
  return Array.from(
    new Set(
      movies
        .filter((movie) => movie.type === route.type)
        .flatMap((movie) => movie.genres),
    ),
  ).sort((firstGenre, secondGenre) => firstGenre.localeCompare(secondGenre, "ru"));
}

export function getGenreBySlug(route: CatalogRoute, genreSlug: string) {
  const normalizedSlug = normalizeGenreSlug(genreSlug).toLowerCase();

  return getGenresForCatalog(route).find((genre) => {
    return (
      slugifyGenre(genre) === normalizedSlug ||
      legacySlugifyGenre(genre) === normalizedSlug
    );
  });
}

export function getCatalogGenreRoutes() {
  return catalogRoutes.flatMap((route) =>
    getGenresForCatalog(route).map((genre) => ({
      category: route.slug,
      genre: slugifyGenre(genre),
    })),
  );
}

export function getCatalogItems(route: CatalogRoute) {
  return movies.filter((movie) => movie.type === route.type);
}

export function getGenreItems(route: CatalogRoute, genre: string) {
  return getCatalogItems(route).filter((movie) => movie.genres.includes(genre));
}

export function getSeoContentKind(movie: Movie) {
  if (movie.type === "Мультфильм") {
    return "мультфильм";
  }

  if (movie.type === "Аниме") {
    return "аниме";
  }

  if (movie.type === "Сериал") {
    return "сериал";
  }

  if (movie.type === "Документальный") {
    return "документальный фильм";
  }

  if (movie.type === "Фильм" && movie.genres.includes("Анимация")) {
    return "мультфильм";
  }

  return "фильм";
}

export function getMovieSeoTitle(movie: Movie) {
  const kind = getSeoContentKind(movie);

  if (movie.type === "Сериал") {
    return `${movie.title} (${movie.year}) смотреть онлайн сериал бесплатно`;
  }

  if (movie.type === "Аниме") {
    return `${movie.title} (${movie.year}) смотреть онлайн аниме бесплатно`;
  }

  if (movie.type === "Мультфильм" || kind === "мультфильм") {
    return `${movie.title} (${movie.year}) смотреть онлайн мультфильм бесплатно`;
  }

  if (movie.type === "Документальный") {
    return `${movie.title} (${movie.year}) смотреть онлайн документальный фильм бесплатно`;
  }

  return `${movie.title} (${movie.year}) смотреть онлайн фильм бесплатно`;
}

export function getMovieSchemaDescription(movie: Movie) {
  return (
    movie.longDescription ||
    movie.description ||
    `${movie.title} (${movie.year}) — ${getSeoContentKind(movie)} на KinoLuma: описание, рейтинг, жанры, трейлер, актёры и подробная информация перед просмотром.`
  );
}

export function trimSeoText(text: string, maxLength = 170) {
  const cleanText = compactText(text);

  if (cleanText.length <= maxLength) {
    return cleanText;
  }

  return `${cleanText.slice(0, maxLength).replace(/\s+\S*$/, "")}.`;
}

export function getMovieMetaDescription(movie: Movie) {
  const kind = getSeoContentKind(movie);
  const country = getFactValue(movie, ["Страна"]);
  const genres = movie.genres.slice(0, 5).join(", ").toLowerCase();
  const base = movie.description || movie.longDescription || "описание, рейтинг, жанры и трейлер";
  const genrePart = genres ? ` Жанры: ${genres}.` : "";
  const countryPart = country ? ` Страна: ${country}.` : "";

  return trimSeoText(
    `${movie.title} (${movie.year}) — ${kind} смотреть онлайн на KinoLuma без регистрации.${genrePart}${countryPart} Описание, рейтинг, трейлер и информация перед просмотром. ${base}`,
    210,
  );
}

export function getMovieKeywords(movie: Movie) {
  const kind = getSeoContentKind(movie);
  const titleVariants = [
    movie.title,
    movie.originalTitle,
    ...movie.searchTitles,
  ].filter(Boolean);

  return Array.from(
    new Set(
      [
        ...titleVariants,
        ...titleVariants.flatMap((title) => [
          `${title} KinoLuma`,
          `${title} смотреть онлайн`,
          `${title} смотреть онлайн бесплатно`,
          `${title} смотреть онлайн без регистрации`,
          `${title} трейлер`,
          `${title} описание`,
          `${title} рейтинг`,
          `${title} ${movie.year}`,
          `${title} ${movie.year} смотреть онлайн`,
        ]),
        kind,
        movie.type,
        `${kind} смотреть онлайн`,
        `${kind} смотреть онлайн бесплатно`,
        brandName,
        seoOnlineSuffix,
        `${brandName} фильмы`,
        `${brandName} смотреть онлайн`,
        "фильмы онлайн",
        "сериалы онлайн",
        "аниме онлайн",
        "мультфильмы онлайн",
        "трейлеры фильмов",
        "описания фильмов",
        "рейтинги фильмов",
        ...movie.genres,
        String(movie.year),
      ].filter(Boolean),
    ),
  );
}

function getFactValue(movie: Movie, labels: string[]) {
  const normalizedLabels = labels.map((label) => label.toLowerCase());

  return movie.facts?.find((fact) =>
    normalizedLabels.includes(fact.label.toLowerCase()),
  )?.value;
}

export function getMovieSchemaType(movie: Movie) {
  if (movie.type === "Сериал") {
    return "TVSeries";
  }

  if (movie.type === "Аниме") {
    const duration = getFactValue(movie, ["Длительность"]);
  const budget = getFactValue(movie, ["Бюджет"]);
  const contentRating = getFactValue(movie, ["Возраст", "Возрастной рейтинг", "MPAA"]);
    return duration?.toLowerCase().includes("серия") ? "TVSeries" : "Movie";
  }

  return "Movie";
}

function removeUndefinedValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map(removeUndefinedValues)
      .filter((item) => item !== undefined && item !== null);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined && item !== null)
        .map(([key, item]) => [key, removeUndefinedValues(item)]),
    );
  }

  return value;
}

export function getOrganizationJsonLd() {
  return removeUndefinedValues({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}#organization`,
    name: brandName,
    url: siteUrl,
    logo: absoluteUrl(defaultImage),
    image: absoluteUrl(defaultImage),
    sameAs: [siteUrl],
  });
}

export function getWebSiteJsonLd() {
  return removeUndefinedValues({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}#website`,
    name: brandName,
    alternateName: ["КиноЛума", "Kino Luma"],
    url: siteUrl,
    inLanguage: "ru-RU",
    publisher: {
      "@id": `${siteUrl}#organization`,
    },
    description:
      "KinoLuma — онлайн-каталог фильмов, сериалов, аниме и мультфильмов с описаниями, рейтингами, трейлерами и страницами просмотра.",
  });
}

export function getHomePageJsonLd() {
  return removeUndefinedValues({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteUrl}#webpage`,
    url: siteUrl,
    name: "KinoLuma — фильмы, сериалы, аниме и мультфильмы смотреть онлайн",
    description:
      "Онлайн-каталог KinoLuma с фильмами, сериалами, аниме и мультфильмами: описания, рейтинги, трейлеры, жанры и страницы просмотра.",
    inLanguage: "ru-RU",
    isPartOf: {
      "@id": `${siteUrl}#website`,
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: absoluteUrl(defaultImage),
      contentUrl: absoluteUrl(defaultImage),
      width: 512,
      height: 512,
      caption: "KinoLuma",
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: movies.length,
      itemListElement: movies.slice(0, 30).map((movie, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteUrl}/movie/${movie.slug}`,
        name: `${movie.title} (${movie.year})`,
      })),
    },
  });
}

export function getMovieJsonLd(movie: Movie) {
  const pageUrl = `${siteUrl}/movie/${movie.slug}`;
  const posterUrl = absoluteUrl(movie.poster);
  const schemaType = getMovieSchemaType(movie);
  const director = getFactValue(movie, ["Режиссёр", "Режиссёры"]);
  const creator = getFactValue(movie, ["Создатель", "Создатели", "Автор", "Рассказчик"]);
  const studio = getFactValue(movie, ["Студия"]);
  const country = getFactValue(movie, ["Страна"]);
  const duration = getFactValue(movie, ["Длительность"]);
  const budget = getFactValue(movie, ["Бюджет"]);
  const contentRating = getFactValue(movie, ["Возраст", "Возрастной рейтинг", "MPAA"]);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    "@id": `${pageUrl}#${schemaType.toLowerCase()}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
      name: getMovieSeoTitle(movie),
      description: getMovieMetaDescription(movie),
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: posterUrl,
        contentUrl: posterUrl,
        width: 500,
        height: 750,
        caption: `Постер ${movie.title} (${movie.year})`,
      },
    },
    name: movie.title,
    alternateName: movie.originalTitle,
    description: getMovieSchemaDescription(movie),
    url: pageUrl,
    image: posterUrl,
    thumbnailUrl: posterUrl,
    datePublished: String(movie.year),
    genre: movie.genres,
    inLanguage: "ru-RU",
    keywords: getMovieKeywords(movie).join(", "),
    provider: {
      "@type": "Organization",
      name: brandName,
      url: siteUrl,
    },
    isAccessibleForFree: true,
    potentialAction: {
      "@type": "WatchAction",
      target: pageUrl,
      name: `Смотреть ${movie.title} онлайн на KinoLuma`,
    },
    countryOfOrigin: country,
    duration,
    budget,
    contentRating,
    productionCompany: studio
      ? {
          "@type": "Organization",
          name: studio,
        }
      : undefined,
    actor: movie.cast?.map((person) => ({
      "@type": "Person",
      name: person.name,
      characterName: person.role,
    })),
    director: director
      ? director.split(",").map((name) => ({
          "@type": "Person",
          name: name.trim(),
        }))
      : undefined,
    creator: creator
      ? creator.split(",").map((name) => ({
          "@type": "Person",
          name: name.trim(),
        }))
      : undefined,
    aggregateRating: movie.rating > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: movie.rating,
          bestRating: 10,
          worstRating: 1,
          ratingCount: 100,
        }
      : undefined,
    trailer: movie.trailerUrl
      ? {
          "@type": "VideoObject",
          name: `Трейлер — ${movie.title}`,
          description: `Трейлер: ${movie.title} (${movie.year}).`,
          embedUrl: movie.trailerUrl,
          thumbnailUrl: posterUrl,
          uploadDate: `${movie.year}-01-01`,
        }
      : undefined,
    identifier: movie.kinopoiskId
      ? {
          "@type": "PropertyValue",
          propertyID: "Kinopoisk ID",
          value: movie.kinopoiskId,
        }
      : undefined,
    sameAs: movie.kinopoiskId
      ? [
          `https://www.kinopoisk.ru/${schemaType === "TVSeries" ? "series" : "film"}/${movie.kinopoiskId}/`,
        ]
      : undefined,
  };

  return removeUndefinedValues(jsonLd);
}

export function getMovieWebPageJsonLd(movie: Movie) {
  const pageUrl = `${siteUrl}/movie/${movie.slug}`;
  const posterUrl = absoluteUrl(movie.poster);

  return removeUndefinedValues({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: getMovieSeoTitle(movie),
    description: getMovieMetaDescription(movie),
    inLanguage: "ru-RU",
    isPartOf: {
      "@id": `${siteUrl}#website`,
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: posterUrl,
      contentUrl: posterUrl,
      width: 500,
      height: 750,
      caption: `Постер ${movie.title} (${movie.year})`,
    },
    mainEntity: {
      "@id": `${pageUrl}#${getMovieSchemaType(movie).toLowerCase()}`,
    },
  });
}

export function getBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function getMovieBreadcrumbJsonLd(movie: Movie) {
  const route = getCatalogRouteByType(movie.type);

  return getBreadcrumbJsonLd([
    { name: "KinoLuma", url: "/" },
    { name: route.label, url: `/catalog/${route.slug}` },
    { name: movie.title, url: `/movie/${movie.slug}` },
  ]);
}

export function getMovieFaqJsonLd(movie: Movie) {
  const kind = getSeoContentKind(movie);
  const rating = movie.rating > 0 ? `${movie.rating.toFixed(1)} из 10` : undefined;
  const budget = getFactValue(movie, ["Бюджет"]);
  const heroes =
    getFactValue(movie, ["Главные герои", "Главные персонажи"]) ||
    movie.cast?.slice(0, 5).map((person) => `${person.name} — ${person.role}`).join(", ");

  const mainEntity = [
    {
      "@type": "Question",
      name: `О чём ${movie.title}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: getMovieSchemaDescription(movie),
      },
    },
    {
      "@type": "Question",
      name: `К какому жанру относится ${movie.title}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${movie.title} (${movie.year}) — ${kind}. Основные жанры: ${movie.genres.join(", ")}.`,
      },
    },
    {
      "@type": "Question",
      name: `Есть ли трейлер ${movie.title}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: movie.trailerUrl
          ? `Да, на странице ${movie.title} есть встроенный трейлер, описание, рейтинг, факты и информация перед просмотром.`
          : `На странице ${movie.title} есть описание, жанры, рейтинг и подробная информация. Трейлер можно добавить после подключения корректной embed-ссылки.`,
      },
    },
    rating
      ? {
          "@type": "Question",
          name: `Какой рейтинг у ${movie.title}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Рейтинг ${movie.title} на KinoLuma: ${rating}. Оценка показана в карточке и может уточняться при обновлении каталога.`,
          },
        }
      : undefined,
    heroes
      ? {
          "@type": "Question",
          name: `Кто главные герои ${movie.title}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `В карточке ${movie.title} указаны главные герои: ${heroes}.`,
          },
        }
      : undefined,
    budget
      ? {
          "@type": "Question",
          name: `Какой бюджет у ${movie.title}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `В карточке ${movie.title} указан бюджет: ${budget}.`,
          },
        }
      : undefined,
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}

export function getCatalogMetadata(slug: string): Metadata {
  const route = getCatalogRoute(slug);

  if (!route) {
    return {
      title: "Категория не найдена",
      description: "Такой категории нет в каталоге KinoLuma.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonical = `/catalog/${route.slug}`;

  return {
    metadataBase: new URL(siteUrl),
    title: route.title,
    description: route.description,
    keywords: [
      brandName,
      route.label,
      route.title,
      `${route.label} смотреть онлайн`,
      `${route.label} смотреть онлайн бесплатно`,
      `${route.label} смотреть онлайн без регистрации`,
      "трейлеры",
      "описания",
      "рейтинги",
    ],
    alternates: {
      canonical,
    },
    openGraph: {
      title: route.title,
      description: route.description,
      url: canonical,
      siteName: "KinoLuma",
      locale: "ru_RU",
      type: "website",
      images: [
        {
          url: defaultImage,
          width: 512,
          height: 512,
          alt: "KinoLuma",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: route.title,
      description: route.description,
      images: [defaultImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export function getGenreMetadata(categorySlug: string, genreSlug: string): Metadata {
  const route = getCatalogRoute(categorySlug);

  if (!route) {
    return {
      title: "Жанр не найден",
      description: "Такого жанра нет в каталоге KinoLuma.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const genre = getGenreBySlug(route, genreSlug);

  if (!genre) {
    return {
      title: "Жанр не найден",
      description: "Такого жанра нет в каталоге KinoLuma.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${genre}: ${route.label.toLowerCase()} смотреть онлайн бесплатно`;
  const description = trimSeoText(
    `${genre}: ${route.label.toLowerCase()} смотреть онлайн на KinoLuma без регистрации. Подборка материалов с описаниями, рейтингами, трейлерами, жанрами и подробными страницами просмотра.`,
    190,
  );
  const canonical = `/catalog/${route.slug}/${slugifyGenre(genre)}`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    keywords: [
      brandName,
      genre,
      route.label,
      `${genre} ${route.label.toLowerCase()} смотреть онлайн`,
      `${genre} ${route.label.toLowerCase()} смотреть онлайн бесплатно`,
      `${genre} ${route.label.toLowerCase()} без регистрации`,
      "трейлеры",
      "описания",
      "рейтинги",
    ],
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "KinoLuma",
      locale: "ru_RU",
      type: "website",
      images: [
        {
          url: defaultImage,
          width: 512,
          height: 512,
          alt: "KinoLuma",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [defaultImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export function getCollectionPageJsonLd(route: CatalogRoute, items: Movie[], genre?: string) {
  const url = genre
    ? `/catalog/${route.slug}/${slugifyGenre(genre)}`
    : `/catalog/${route.slug}`;
  const title = genre
    ? `${genre}: ${route.label.toLowerCase()} смотреть онлайн бесплатно`
    : route.title;
  const description = genre
    ? `${genre}: ${route.label.toLowerCase()} смотреть онлайн на KinoLuma с описаниями, рейтингами, трейлерами и страницами просмотра.`
    : route.description;

  return removeUndefinedValues({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${absoluteUrl(url)}#collection`,
    name: title,
    description,
    url: absoluteUrl(url),
    isPartOf: {
      "@id": `${siteUrl}#website`,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.slice(0, 24).map((movie, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteUrl}/movie/${movie.slug}`,
        name: movie.title,
      })),
    },
  });
}

export function getCatalogFaqJsonLd(route: CatalogRoute, genre?: string) {
  const label = genre ? `${genre}: ${route.label.toLowerCase()}` : route.label.toLowerCase();

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Что есть в разделе ${label}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: genre
            ? `В разделе собраны ${route.label.toLowerCase()} жанра «${genre}» с описаниями, рейтингами, трейлерами и подробными страницами просмотра онлайн.`
            : route.seoText,
        },
      },
      {
        "@type": "Question",
        name: "Можно ли выбрать материал по жанру?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Да, в каталоге есть жанровые фильтры и отдельные SEO-страницы жанров для удобной навигации.",
        },
      },
    ],
  };
}
