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

  const normalizedSlug = slug.trim().toLowerCase();

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

  const normalizedSlug = slug.trim().toLowerCase();

  return (
    homeTypeRoutes.find((route) => {
      return route.slug === normalizedSlug || route.aliases?.includes(normalizedSlug);
    })?.type ?? "Все"
  );
}

export function getHomeTypeSlug(type: string) {
  return homeTypeRoutes.find((route) => route.type === type)?.slug ?? "";
}

export type HomeCatalogState = { genre: string; type: string; page: number };

function safeHomePage(page: number) {
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function parseHomeCatalogSearch(search: string): HomeCatalogState {
  const params = new URLSearchParams(search);
  // Ambiguous repeated values reset only that filter, irrespective of order.
  const single = (key: string) => params.getAll(key).length === 1 ? params.get(key) : null;
  const page = single("page");
  return {
    genre: getHomeGenreBySlug(single("genre"))?.genre ?? "Все",
    type: getHomeTypeBySlug(single("type")),
    page: page && /^\d+$/.test(page) ? safeHomePage(Number(page)) : 1,
  };
}

export function getHomeCatalogPath(genre: string, page: number) {
  return getHomeCatalogPathWithType(genre, page, "Все");
}

export function getHomeCatalogPathWithType(
  genre: string,
  page: number,
  type: string,
  location?: Pick<Location, "search" | "hash">,
) {
  const safePage = safeHomePage(page);
  const genreSlug = getHomeGenreSlug(genre);
  const typeSlug = getHomeTypeSlug(type);
  const params = new URLSearchParams(location?.search);
  for (const key of ["genre", "type", "page"]) params.delete(key);
  if (genreSlug) params.set("genre", genreSlug);
  if (genreSlug || typeSlug || safePage > 1) params.set("type", typeSlug || "all");
  if (safePage > 1) params.set("page", String(safePage));
  const query = params.toString();
  return `/${query ? `?${query}` : ""}${location?.hash ?? ""}`;
}

// Earlier builds pushed /{genre} and /{genre}/page/{n}; those paths never had a
// route, so send old bookmarks to the query contract instead of a 404.
// The old nav linked /anime and /cartoon for the content type, so those win over the genre.
export function getLegacyHomeCatalogRedirects() {
  return [
    ...homeGenreRoutes.flatMap((route) => {
      const slugs = [route.slug, ...(route.aliases ?? [])].join("|");
      const typeSlug = homeTypeRoutes.find((typeRoute) => typeRoute.slug === route.slug)?.slug;
      const query = typeSlug ? `type=${typeSlug}` : `genre=${route.slug}&type=all`;
      return [
        {
          source: `/:genre(${slugs})`,
          destination: `/?${query}`,
          permanent: false,
        },
        {
          source: `/:genre(${slugs})/page/:page(\\d+)`,
          destination: `/?${query}&page=:page`,
          permanent: false,
        },
      ];
    }),
    {
      source: "/page/:page(\\d+)",
      destination: "/?type=all&page=:page",
      permanent: false,
    },
  ];
}

