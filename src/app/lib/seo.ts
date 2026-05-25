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
    title: "Фильмы смотреть онлайн",
    description:
      "Каталог фильмов KinoLuma: подборки кино на вечер, рейтинги, трейлеры, описания, жанры и страницы просмотра.",
    seoText:
      "В каталоге фильмов KinoLuma собраны разные жанры: фантастика, драма, триллеры, приключения, экшен и авторское кино. На страницах материалов есть краткое описание, подробный блок о фильме, рейтинг, жанры, актёры, трейлер и похожие подборки.",
  },
  {
    slug: "series",
    type: "Сериал",
    label: "Сериалы",
    title: "Сериалы смотреть онлайн",
    description:
      "Каталог сериалов KinoLuma: популярные сериалы, описания сезонов, рейтинги, трейлеры, жанры и страницы просмотра.",
    seoText:
      "Раздел сериалов помогает выбрать историю на несколько вечеров: от драм и фантастики до криминальных проектов, мистики и приключений. У каждого сериала есть карточка с описанием, рейтингом, жанрами, трейлером и подробной страницей.",
  },
  {
    slug: "anime",
    type: "Аниме",
    label: "Аниме",
    title: "Аниме смотреть онлайн",
    description:
      "Каталог аниме KinoLuma: культовые тайтлы, новые истории, трейлеры, рейтинги, жанры и подробные описания.",
    seoText:
      "В разделе аниме собраны тайтлы с сильной атмосферой, яркой визуальной подачей и разными жанрами: экшен, фэнтези, романтика, драма и приключения. Страницы помогают быстро понять сюжет, настроение и формат просмотра.",
  },
  {
    slug: "cartoons",
    type: "Мультфильм",
    label: "Мультфильмы",
    title: "Мультфильмы смотреть онлайн",
    description:
      "Каталог мультфильмов KinoLuma: семейная анимация, приключения, комедии, описания, рейтинги и трейлеры.",
    seoText:
      "Мультфильмы KinoLuma — это анимация для лёгкого вечера, семейного просмотра и красивых приключений. В каталоге можно выбрать мультфильм по жанру, рейтингу, году и описанию.",
  },
  {
    slug: "documentaries",
    type: "Документальный",
    label: "Документальные",
    title: "Документальные фильмы смотреть онлайн",
    description:
      "Каталог документальных фильмов и проектов KinoLuma: природа, технологии, истории людей, рейтинги, трейлеры и описания.",
    seoText:
      "Документальные проекты KinoLuma помогают выбрать материалы о природе, технологиях, обществе, реальных историях и важных темах. У каждого проекта есть описание, жанры, рейтинг и дополнительная информация перед просмотром.",
  },
] as const;

export type CatalogRoute = (typeof catalogRoutes)[number];

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

export function slugifyGenre(genre: string) {
  return genre
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/g, "-")
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
  return getGenresForCatalog(route).find((genre) => slugifyGenre(genre) === genreSlug);
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
  return `${movie.title} (${movie.year}) смотреть онлайн ${getSeoContentKind(movie)}`;
}

export function getMovieSchemaDescription(movie: Movie) {
  return (
    movie.longDescription ||
    movie.description ||
    `${movie.title} (${movie.year}) — ${getSeoContentKind(movie)} на KinoLuma: описание, рейтинг, жанры, трейлер, актёры и подробная информация перед просмотром.`
  );
}

export function trimSeoText(text: string, maxLength = 170) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (cleanText.length <= maxLength) {
    return cleanText;
  }

  return `${cleanText.slice(0, maxLength).replace(/\s+\S*$/, "")}.`;
}

export function getMovieMetaDescription(movie: Movie) {
  const kind = getSeoContentKind(movie);
  const base = movie.description || movie.longDescription || "описание, рейтинг, жанры и трейлер";

  return trimSeoText(
    `${movie.title} (${movie.year}) смотреть онлайн ${kind}. ${base} Рейтинг, жанры, трейлер и подробная информация на KinoLuma.`,
    180,
  );
}

export function getMovieKeywords(movie: Movie) {
  return Array.from(
    new Set(
      [
        movie.title,
        movie.originalTitle,
        ...movie.searchTitles,
        getSeoContentKind(movie),
        movie.type,
        `${movie.title} смотреть онлайн`,
        `${movie.title} ${movie.year}`,
        "KinoLuma",
        "смотреть онлайн",
        "фильмы онлайн",
        "сериалы онлайн",
        "трейлер",
        "описание",
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

export function getMovieJsonLd(movie: Movie) {
  const pageUrl = `${siteUrl}/movie/${movie.slug}`;
  const posterUrl = absoluteUrl(movie.poster);
  const schemaType = getMovieSchemaType(movie);
  const director = getFactValue(movie, ["Режиссёр", "Режиссёры"]);
  const creator = getFactValue(movie, ["Создатель", "Создатели", "Автор", "Рассказчик"]);
  const studio = getFactValue(movie, ["Студия"]);
  const country = getFactValue(movie, ["Страна"]);
  const duration = getFactValue(movie, ["Длительность"]);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    "@id": `${pageUrl}#${schemaType.toLowerCase()}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
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
    isAccessibleForFree: true,
    countryOfOrigin: country,
    duration,
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
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: movie.rating,
      bestRating: 10,
      worstRating: 1,
      ratingCount: 100,
    },
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

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
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
            ? `Да, на странице ${movie.title} есть встроенный трейлер и подробная информация о материале.`
            : `На странице ${movie.title} есть описание, жанры, рейтинг и подробная информация. Трейлер можно добавить после подключения легальной embed-ссылки.`,
        },
      },
    ],
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
          url: "/kinoluma-icon.png",
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
      images: ["/kinoluma-icon.png"],
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

  const title = `${genre}: ${route.label.toLowerCase()} смотреть онлайн`;
  const description = trimSeoText(
    `${genre}: ${route.label.toLowerCase()} в каталоге KinoLuma. Подборка материалов с описаниями, рейтингами, трейлерами, жанрами и подробными страницами просмотра.`,
    180,
  );
  const canonical = `/catalog/${route.slug}/${slugifyGenre(genre)}`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
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
          url: "/kinoluma-icon.png",
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
      images: ["/kinoluma-icon.png"],
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
    ? `${genre}: ${route.label.toLowerCase()} смотреть онлайн`
    : route.title;
  const description = genre
    ? `${genre}: ${route.label.toLowerCase()} в каталоге KinoLuma с описаниями, рейтингами, трейлерами и страницами просмотра.`
    : route.description;

  return removeUndefinedValues({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${absoluteUrl(url)}#collection`,
    name: title,
    description,
    url: absoluteUrl(url),
    isPartOf: {
      "@type": "WebSite",
      name: "KinoLuma",
      url: siteUrl,
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
            ? `В разделе собраны ${route.label.toLowerCase()} жанра «${genre}» с описаниями, рейтингами, трейлерами и подробными страницами.`
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
