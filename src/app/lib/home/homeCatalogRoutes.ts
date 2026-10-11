export const HOME_CATALOG_PAGE_SIZE = 9;

export type HomeGenreRoute = {
  genre: string;
  slug: string;
  aliases?: string[];
};

export type HomeTypeRoute = {
  type: string;
  slug: string;
  aliases?: string[];
};

export const homeGenreRoutes: HomeGenreRoute[] = [
  { genre: "Боевик", slug: "boevik", aliases: ["action"] },
  { genre: "Драма", slug: "drama" },
  { genre: "Комедия", slug: "comedy" },
  { genre: "Ужасы", slug: "scary", aliases: ["horror", "uzhasy"] },
  { genre: "Триллер", slug: "thriller" },
  { genre: "Фантастика", slug: "fantastic", aliases: ["sci-fi", "fantastika"] },
  { genre: "Фэнтези", slug: "fantasy" },
  { genre: "Детектив", slug: "detective" },
  { genre: "Криминал", slug: "criminal", aliases: ["crime"] },
  { genre: "Приключения", slug: "adventure" },
  { genre: "Мультфильм", slug: "cartoon", aliases: ["cartoons"] },
  { genre: "Аниме", slug: "anime" },
  { genre: "Семейный", slug: "family" },
  { genre: "Мелодрама", slug: "melodrama" },
  { genre: "Документальный", slug: "documentary" },
  { genre: "История", slug: "history", aliases: ["historical"] },
];

export const homeTypeRoutes: HomeTypeRoute[] = [
  { type: "Фильм", slug: "film", aliases: ["films", "movie", "movies"] },
  { type: "Сериал", slug: "series", aliases: ["serial", "show", "shows"] },
  { type: "Аниме", slug: "anime" },
  { type: "Мультфильм", slug: "cartoon", aliases: ["cartoons", "animation"] },
];

export function getHomeGenreBySlug(slug?: string | null) {
  if (!slug) return null;

  const normalizedSlug = slug.toLowerCase();

  return (
    homeGenreRoutes.find((route) => {
      return route.slug === normalizedSlug || route.aliases?.includes(normalizedSlug);
    }) ?? null
  );
}

export function getHomeGenreSlug(genre: string) {
  return homeGenreRoutes.find((route) => route.genre === genre)?.slug ?? "";
}

export function getHomeTypeBySlug(slug?: string | null) {
  if (!slug) return "Все";

  const normalizedSlug = slug.toLowerCase();

  return (
    homeTypeRoutes.find((route) => {
      return route.slug === normalizedSlug || route.aliases?.includes(normalizedSlug);
    })?.type ?? "Все"
  );
}

export function getHomeTypeSlug(type: string) {
  return homeTypeRoutes.find((route) => route.type === type)?.slug ?? "";
}

export function getHomeCatalogPath(genre: string, page: number) {
  const safePage = Math.max(1, Math.floor(page));
  const genreSlug = getHomeGenreSlug(genre);
  const pagePart = safePage > 1 ? `/page/${safePage}` : "";

  if (genreSlug) {
    return `/${genreSlug}${pagePart}`;
  }

  return pagePart || "/";
}

export function getHomeCatalogPathWithType(genre: string, page: number, type: string) {
  return getHomeCatalogPath(genre, page);
}

