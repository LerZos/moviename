"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import type { Movie } from "../../data/movies";
import { canResolveTrailerUrl, resolveTrailerUrl } from "../../lib/trailers";

type CatalogCategory = {
  type: string;
  label: string;
  title: string;
  subtitle: string;
  description: string;
};

const INITIAL_VISIBLE_COUNT = 20;
const LOAD_MORE_COUNT = 10;

const catalogCategories: Record<string, CatalogCategory> = {
  films: {
    type: "Фильм",
    label: "Фильмы",
    title: "Все фильмы",
    subtitle: "Большое кино на вечер",
    description:
      "Фильмы KinoLuma для вечера, когда хочется не просто включить на фон, а реально вникнуть в историю фильма.",
  },
  series: {
    type: "Сериал",
    label: "Сериалы",
    title: "Все сериалы",
    subtitle: "Серии, которые затягивают",
    description:
      "Сериалы, где одна серия случайно превращается в три. Классика жанра, никаких вопросов.",
  },
  anime: {
    type: "Аниме",
    label: "Аниме",
    title: "Все аниме",
    subtitle: "Яркие миры и сильные эмоции",
    description:
      "Аниме с атмосферой, динамикой и героями, за которыми интересно следить с первой минуты.",
  },
  cartoons: {
    type: "Мультфильм",
    label: "Мультфильмы",
    title: "Все мультфильмы",
    subtitle: "Анимация для лёгкого вечера",
    description:
      "Добрые, красивые и энергичные мультфильмы для отдыха без лишней тяжести.",
  },
};

const catalogNavItems = [
  { key: "films", label: "Фильмы" },
  { key: "series", label: "Сериалы" },
  { key: "anime", label: "Аниме" },
  { key: "cartoons", label: "Мультфильмы" },
];

const cyrillicToLatinMap: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function normalizeRouteSlug(slug: string | undefined) {
  if (!slug) {
    return "";
  }

  try {
    return decodeURIComponent(slug).toLowerCase();
  } catch {
    return slug.toLowerCase();
  }
}

function legacySlugifyGenre(genre: string) {
  return genre
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clientSlugifyGenre(genre: string) {
  return genre
    .toLowerCase()
    .split("")
    .map((char) => cyrillicToLatinMap[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCategoryKey(category: string | string[] | undefined) {
  if (Array.isArray(category)) {
    return category[0] ?? "";
  }

  return category ?? "";
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .trim();
}

function isExpectedRelease(item: Movie) {
  const source = (item.source ?? "").toLowerCase();
  const genres = item.genres.map((genre) => genre.toLowerCase());
  const factsText = (item.facts ?? [])
    .map((fact) => `${fact.label} ${fact.value}`)
    .join(" ")
    .toLowerCase();
  const numericYear = Number.parseInt(item.year, 10);
  const isFutureYear =
    Number.isFinite(numericYear) && numericYear > new Date().getFullYear();

  return (
    source.includes("kinoluma-curated-expected") ||
    source.includes("ожидаемых") ||
    genres.some((genre) => genre.includes("ожидаем")) ||
    factsText.includes("ожидаемый") ||
    (item.rating <= 0 && isFutureYear)
  );
}

function getRatingBadgeText(item: Movie) {
  if (!Number.isFinite(item.rating) || item.rating <= 0) {
    return isExpectedRelease(item) ? "Ждём" : "—";
  }

  return `★ ${Number.isInteger(item.rating) ? item.rating : item.rating.toFixed(1)}`;
}

function getRatingDetailsText(item: Movie) {
  if (!Number.isFinite(item.rating) || item.rating <= 0) {
    return isExpectedRelease(item) ? "Рейтинг появится после премьеры" : "Рейтинг уточняется";
  }

  return `★ ${Number.isInteger(item.rating) ? item.rating : item.rating.toFixed(1)} / 10`;
}

function readNumberArrayFromStorage(key: string) {
  try {
    const savedValue = window.localStorage.getItem(key);

    if (!savedValue) {
      return [];
    }

    const parsedValue = JSON.parse(savedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((value) => typeof value === "number");
  } catch {
    return [];
  }
}

type ModalIconButtonProps = {
  isActive: boolean;
  ariaLabel: string;
  title: string;
  onClick: () => void;
  children: ReactNode;
};

function ModalIconButton({
  isActive,
  ariaLabel,
  title,
  onClick,
  children,
}: ModalIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 w-12 items-center justify-center rounded-full border text-white transition duration-200 active:scale-95 ${
        isActive
          ? "border-white bg-white/15 shadow-[0_0_18px_rgba(255,255,255,0.18)]"
          : "border-white/20 bg-black hover:border-white/50 hover:bg-white/10"
      }`}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12L15 14" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.2 5.8C18.4 4 15.5 4 13.7 5.8L12 7.5L10.3 5.8C8.5 4 5.6 4 3.8 5.8C2 7.6 2 10.5 3.8 12.3L12 20.5L20.2 12.3C22 10.5 22 7.6 20.2 5.8Z" />
    </svg>
  );
}

function DislikeIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7.5 3.8H4.7C3.8 3.8 3 4.6 3 5.5V12C3 12.9 3.8 13.7 4.7 13.7H7.5" />
      <path d="M7.5 3.8H16.3C17.4 3.8 18.4 4.5 18.8 5.5L20.7 10.2C21.2 11.5 20.3 12.9 18.9 12.9H15.5L16.2 16.8C16.4 18 15.5 19.2 14.3 19.2C13.6 19.2 13 18.8 12.7 18.2L9.4 12.9H7.5V3.8Z" />
    </svg>
  );
}

function getSearchText(item: Movie) {
  return normalizeText(
    [
      item.title,
      item.originalTitle,
      ...item.searchTitles,
      item.type,
      item.year,
      ...item.genres,
    ].join(" "),
  );
}

function escapeSvgText(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function getPosterFallback(title: string) {
  const safeTitle = escapeSvgText(
    title
      .split(" ")
      .filter(Boolean)
      .slice(0, 4)
      .join(" ")
      .toUpperCase(),
  );

  const svg = `
    <svg width="500" height="750" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="750" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#242424"/>
          <stop offset="48%" stop-color="#090909"/>
          <stop offset="100%" stop-color="#000000"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="22%" r="60%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="500" height="750" fill="url(#bg)"/>
      <rect width="500" height="750" fill="url(#glow)"/>
      <rect x="34" y="34" width="432" height="682" rx="34" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2"/>
      <circle cx="250" cy="300" r="118" fill="#ffffff" opacity="0.045"/>
      <text x="250" y="356" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="900">KinoLuma</text>
      <text x="250" y="424" text-anchor="middle" fill="#d4d4d4" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="900">${safeTitle}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function CatalogMovieCard({
  item,
  index,
  onOpenDetails,
  onOpenTrailer,
}: {
  item: Movie;
  index: number;
  onOpenDetails: (item: Movie) => void;
  onOpenTrailer: (item: Movie) => void;
}) {
  const [posterSrc, setPosterSrc] = useState(item.poster);
  const [isPosterFallback, setIsPosterFallback] = useState(false);
  const canPlayTrailer = canResolveTrailerUrl(item);

  return (
    <article
      className="catalog-card"
      style={{ transitionDelay: `${Math.min(index * 20, 160)}ms` }}
    >
      <button
        type="button"
        onClick={() => onOpenDetails(item)}
        className="catalog-card-poster"
        aria-label={`Открыть ${item.title}`}
      >
        <img
          src={posterSrc}
          alt={item.title}
          loading={index < 8 ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          className="catalog-card-image"
          onError={() => {
            if (isPosterFallback) {
              return;
            }

            setIsPosterFallback(true);
            setPosterSrc(getPosterFallback(item.title));
          }}
        />

        <div className="catalog-card-poster-shade" />

        <span className="catalog-card-type">{item.type}</span>
        <span className="catalog-card-rating">{getRatingBadgeText(item)}</span>
      </button>

      <div className="catalog-card-body">
        <div className="catalog-card-meta">
          <span>{item.year}</span>
          <span>{item.genres[0]}</span>
        </div>

        <button
          type="button"
          onClick={() => onOpenDetails(item)}
          className="catalog-card-title"
        >
          {item.title}
        </button>

        <p className="catalog-card-original">{item.originalTitle}</p>
        <p className="catalog-card-description">{item.description}</p>

        <div className="catalog-card-tags">
          {item.genres.slice(0, 2).map((genre) => (
            <span key={genre}>{genre}</span>
          ))}
        </div>

        <div className="catalog-card-actions">
          <button
            type="button"
            onClick={() => onOpenTrailer(item)}
            disabled={!canPlayTrailer}
            className={`catalog-card-primary ${canPlayTrailer ? "" : "catalog-card-primary-disabled"}`}
            title={canPlayTrailer ? "Смотреть трейлер" : "Трейлер пока не добавлен"}
          >
            {canPlayTrailer ? "Трейлер" : "Нет трейлера"}
          </button>

          <button
            type="button"
            onClick={() => onOpenDetails(item)}
            className="catalog-card-secondary"
          >
            Подробнее
          </button>
        </div>
      </div>
    </article>
  );
}

type CatalogPageClientProps = {
  categorySlug?: string;
  genreSlug?: string;
  initialContent?: Movie[];
};

export default function CatalogCategoryPage({
  categorySlug,
  genreSlug,
  initialContent,
}: CatalogPageClientProps) {
  const router = useRouter();
  const params = useParams<{ category?: string | string[]; genre?: string | string[] }>();
  const categoryKey = categorySlug ?? getCategoryKey(params.category);
  const activeGenreSlug = genreSlug ?? getCategoryKey(params.genre);
  const category = catalogCategories[categoryKey];
  const content = useMemo(() => initialContent ?? [], [initialContent]);

  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("Все");
  const [sortMode, setSortMode] = useState<"popular" | "year" | "az">("popular");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [selectedItem, setSelectedItem] = useState<Movie | null>(null);
  const [trailerItem, setTrailerItem] = useState<Movie | null>(null);
  const [isDetailsClosing, setIsDetailsClosing] = useState(false);
  const [isTrailerClosing, setIsTrailerClosing] = useState(false);
  const [watchLaterIds, setWatchLaterIds] = useState<number[]>([]);
  const [likedItemIds, setLikedItemIds] = useState<number[]>([]);
  const [dislikedItemIds, setDislikedItemIds] = useState<number[]>([]);
  const [isMovieActionsLoaded, setIsMovieActionsLoaded] = useState(false);

  const categoryItems = useMemo(() => {
    if (!category) {
      return [];
    }

    return content.filter((item) => item.type === category.type);
  }, [category, content]);

  const genres = useMemo(() => {
    return [
      "Все",
      ...Array.from(new Set(categoryItems.flatMap((item) => item.genres))).sort(),
    ];
  }, [categoryItems]);

  const routeGenre = useMemo(() => {
    if (!activeGenreSlug) {
      return "Все";
    }

    const normalizedActiveGenreSlug = normalizeRouteSlug(activeGenreSlug);

    return (
      genres.find((genre) => {
        return (
          clientSlugifyGenre(genre) === normalizedActiveGenreSlug ||
          legacySlugifyGenre(genre) === normalizedActiveGenreSlug
        );
      }) ?? "Все"
    );
  }, [activeGenreSlug, genres]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    return categoryItems
      .filter((item) => {
        const matchesSearch =
          normalizedSearch === "" || getSearchText(item).includes(normalizedSearch);
        const matchesGenre =
          selectedGenre === "Все" || item.genres.includes(selectedGenre);

        return matchesSearch && matchesGenre;
      })
      .sort((firstItem, secondItem) => {
        if (sortMode === "year") {
          return Number(secondItem.year) - Number(firstItem.year);
        }

        if (sortMode === "az") {
          return firstItem.title.localeCompare(secondItem.title, "ru");
        }

        return secondItem.rating - firstItem.rating;
      });
  }, [categoryItems, search, selectedGenre, sortMode]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMoreItems = visibleItems.length < filteredItems.length;

  useEffect(() => {
    setSelectedGenre(routeGenre);
  }, [routeGenre]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [categoryKey, search, selectedGenre, sortMode]);


  function openDetails(item: Movie) {
    setTrailerItem(null);
    setIsTrailerClosing(false);
    setSelectedItem(item);
    setIsDetailsClosing(false);
  }

  async function openTrailer(item: Movie) {
    const trailerUrl = await resolveTrailerUrl(item);

    if (!trailerUrl) {
      return;
    }

    setSelectedItem(null);
    setIsDetailsClosing(false);
    setTrailerItem({ ...item, trailerUrl });
    setIsTrailerClosing(false);
  }

  function openContent(item: Movie) {
    router.push(`/movie/${item.slug}`);
  }

  function closeDetailsModal() {
    setIsDetailsClosing(true);

    window.setTimeout(() => {
      setSelectedItem(null);
      setIsDetailsClosing(false);
    }, 180);
  }

  function closeTrailerModal() {
    setIsTrailerClosing(true);

    window.setTimeout(() => {
      setTrailerItem(null);
      setIsTrailerClosing(false);
    }, 180);
  }

  function toggleWatchLater(itemId: number) {
    setWatchLaterIds((currentIds) =>
      currentIds.includes(itemId)
        ? currentIds.filter((id) => id !== itemId)
        : [...currentIds, itemId],
    );
  }

  function toggleLiked(itemId: number) {
    setLikedItemIds((currentIds) =>
      currentIds.includes(itemId)
        ? currentIds.filter((id) => id !== itemId)
        : [...currentIds, itemId],
    );

    setDislikedItemIds((currentIds) =>
      currentIds.includes(itemId) ? currentIds.filter((id) => id !== itemId) : currentIds,
    );
  }

  function toggleDisliked(itemId: number) {
    setDislikedItemIds((currentIds) =>
      currentIds.includes(itemId)
        ? currentIds.filter((id) => id !== itemId)
        : [...currentIds, itemId],
    );

    setLikedItemIds((currentIds) =>
      currentIds.includes(itemId) ? currentIds.filter((id) => id !== itemId) : currentIds,
    );
  }

  useEffect(() => {
    setWatchLaterIds(readNumberArrayFromStorage("kinoluma-watch-later"));
    setLikedItemIds(readNumberArrayFromStorage("kinoluma-liked-items"));
    setDislikedItemIds(readNumberArrayFromStorage("kinoluma-disliked-items"));
    setIsMovieActionsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isMovieActionsLoaded) {
      return;
    }

    window.localStorage.setItem(
      "kinoluma-watch-later",
      JSON.stringify(watchLaterIds),
    );
  }, [watchLaterIds, isMovieActionsLoaded]);

  useEffect(() => {
    if (!isMovieActionsLoaded) {
      return;
    }

    window.localStorage.setItem(
      "kinoluma-liked-items",
      JSON.stringify(likedItemIds),
    );
  }, [likedItemIds, isMovieActionsLoaded]);

  useEffect(() => {
    if (!isMovieActionsLoaded) {
      return;
    }

    window.localStorage.setItem(
      "kinoluma-disliked-items",
      JSON.stringify(dislikedItemIds),
    );
  }, [dislikedItemIds, isMovieActionsLoaded]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (selectedItem) {
        closeDetailsModal();
      }

      if (trailerItem) {
        closeTrailerModal();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedItem, trailerItem]);

  if (!category) {
    return (
      <main className="kinoluma-catalog min-h-screen bg-black px-6 py-24 text-white">
        <style>{catalogStyles}</style>

        <div className="catalog-bg-elements" aria-hidden="true">
          <span className="catalog-bg-ring catalog-bg-ring-left" />
          <span className="catalog-bg-ring catalog-bg-ring-right" />
          <span className="catalog-bg-line catalog-bg-line-one" />
          <span className="catalog-bg-line catalog-bg-line-two" />
        </div>

        <div className="catalog-not-found">
          <p>KinoLuma</p>
          <h1>Категория не найдена</h1>
          <span>Такой полки пока нет. Даже у кинотеатра иногда заканчиваются залы.</span>

          <button type="button" onClick={() => router.push("/")}> 
            На главную
          </button>
        </div>
      </main>
    );
  }

  const catalogFaqItems = [
    {
      question:
        selectedGenre === "Все"
          ? `Что есть в разделе ${category.label}?`
          : `Что есть в подборке «${selectedGenre}»?`,
      answer:
        selectedGenre === "Все"
          ? category.description
          : `В подборке «${selectedGenre}» собраны ${category.label.toLowerCase()} с описаниями, рейтингами, трейлерами и подробными страницами.`,
    },
    {
      question: "Можно ли выбрать материал по жанру?",
      answer: "Да, жанры в каталоге переключаются прямо на этой странице. ",
    },
  ];

  return (
    <main className="kinoluma-catalog min-h-screen overflow-x-hidden bg-black text-white">
      <style>{catalogStyles}</style>

      <div className="catalog-bg-elements" aria-hidden="true">
        <span className="catalog-bg-ring catalog-bg-ring-left" />
        <span className="catalog-bg-ring catalog-bg-ring-right" />
        <span className="catalog-bg-line catalog-bg-line-one" />
        <span className="catalog-bg-line catalog-bg-line-two" />
        <span className="catalog-bg-dot catalog-bg-dot-one" />
        <span className="catalog-bg-dot catalog-bg-dot-two" />
      </div>

      <header className="catalog-header">
        <Link href="/" className="catalog-brand" aria-label="KinoLuma — на главную">
          <img
            src="/kinoluma-icon.png"
            alt="KinoLuma"
            className="catalog-brand-logo"
            draggable={false}
          />
          <span className="catalog-brand-text">KinoLuma</span>
        </Link>

        <nav className="catalog-header-nav" aria-label="Каталоги KinoLuma">
          {catalogNavItems.map((item) => (
            <Link
              key={item.key}
              href={`/catalog/${item.key}`}
              className={categoryKey === item.key ? "is-active" : ""}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="catalog-home-button"
        >
          На главную
        </button>
      </header>

      <section className="catalog-hero">
        <div className="catalog-hero-inner">
          <div className="catalog-hero-copy">
            <p className="catalog-kicker">{category.label}</p>
            <h1>{category.title}</h1>
            <h2>{category.subtitle}</h2>
            <p className="catalog-description">{category.description}</p>
          </div>

          <div className="catalog-hero-panel">
            <span>В каталоге</span>
            <strong>{categoryItems.length}</strong>
            <p>{category.label.toLowerCase()}</p>
          </div>
        </div>
      </section>

      <section className="catalog-controls-section">
        <div className="catalog-controls">
          <label className="catalog-search" htmlFor="catalog-search-input">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20L16.2 16.2" />
            </svg>

            <input
              id="catalog-search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Найти ${category.label.toLowerCase()}...`}
            />
          </label>

          <div className="catalog-sort-tabs" aria-label="Сортировка">
            <button
              type="button"
              onClick={() => setSortMode("popular")}
              className={sortMode === "popular" ? "is-active" : ""}
            >
              По рейтингу
            </button>
            <button
              type="button"
              onClick={() => setSortMode("year")}
              className={sortMode === "year" ? "is-active" : ""}
            >
              Новее
            </button>
            <button
              type="button"
              onClick={() => setSortMode("az")}
              className={sortMode === "az" ? "is-active" : ""}
            >
              А–Я
            </button>
          </div>
        </div>

        <div className="catalog-genre-row" aria-label="Жанры">
          {genres.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => {
                setSelectedGenre(genre);
                setVisibleCount(INITIAL_VISIBLE_COUNT);
              }}
              className={selectedGenre === genre ? "is-active" : ""}
            >
              {genre}
            </button>
          ))}
        </div>
      </section>

      <section className="catalog-grid-section">
        <div className="catalog-section-topline">
          <div>
            <p>Каталог</p>
            <h3>
              Показано {visibleItems.length} из {filteredItems.length}
            </h3>
          </div>

          {(search || selectedGenre !== "Все") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedGenre("Все");
                router.push(`/catalog/${categoryKey}`);
              }}
            >
              Сбросить фильтры
            </button>
          )}
        </div>

        {visibleItems.length > 0 ? (
          <>
            <div className="catalog-grid">
              {visibleItems.map((item, index) => (
                <CatalogMovieCard
                  key={item.id}
                  item={item}
                  index={index}
                  onOpenDetails={openDetails}
                  onOpenTrailer={openTrailer}
                />
              ))}
            </div>

            {hasMoreItems && (
              <div className="catalog-more-wrap">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((currentCount) => currentCount + LOAD_MORE_COUNT)
                  }
                  className="catalog-more-button"
                >
                  <span>Ещё</span>

                  <span className="catalog-more-button-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      className="catalog-more-button-svg"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 10L12 15L17 10" />
                    </svg>
                  </span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="catalog-empty-state">
            <h3>Ничего не найдено</h3>
            <p>Попробуй другой запрос или сбрось фильтры.</p>
          </div>
        )}
      </section>

      <section className="catalog-faq-section">
        <div className="catalog-section-topline catalog-faq-topline">
          <div>
            <p>FAQ</p>
            <h3>Вопросы по разделу</h3>
          </div>
        </div>

        <div className="catalog-faq-grid">
          {catalogFaqItems.map((item) => (
            <article key={item.question} className="catalog-faq-card">
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      {selectedItem && (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDetailsModal();
            }
          }}
          className={`details-modal-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur ${
            isDetailsClosing ? "modal-overlay-close" : "modal-overlay-open"
          }`}
        >
          <div
            className={`details-modal-card relative grid max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl md:grid-cols-[320px_1fr] ${
              isDetailsClosing ? "modal-window-close" : "modal-window-open"
            }`}
          >
            <button
              type="button"
              onClick={closeDetailsModal}
              className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black px-3 py-1 text-xl font-bold text-white transition duration-200 hover:bg-white hover:text-black"
              aria-label="Закрыть"
            >
              ×
            </button>

            <div className="details-modal-poster h-[520px] bg-neutral-900">
              <img
                src={selectedItem.poster}
                alt={selectedItem.title}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = getPosterFallback(selectedItem.title);
                }}
              />
            </div>

            <div className="details-modal-content p-8">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
                {selectedItem.type}
              </p>

              <h3 className="mt-3 text-4xl font-black">
                {selectedItem.title}
              </h3>

              <p className="mt-2 text-xl font-bold text-neutral-500">
                {selectedItem.originalTitle}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-black">
                  {getRatingDetailsText(selectedItem)}
                </span>

                <span className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-neutral-300">
                  {selectedItem.year}
                </span>
              </div>

              <p className="mt-6 text-lg leading-relaxed text-neutral-300">
                {selectedItem.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {selectedItem.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-white/10 px-3 py-1 text-sm text-neutral-300"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              <div className="details-modal-actions mt-8 flex flex-wrap items-center gap-3">
                {canResolveTrailerUrl(selectedItem) ? (
                  <button
                    type="button"
                    onClick={() => openTrailer(selectedItem)}
                    className="rounded border-2 border-white bg-white px-6 py-3 font-black text-black transition duration-200 hover:bg-black hover:text-white hover:shadow-[0_0_22px_rgba(255,255,255,0.25)] active:scale-[0.98]"
                  >
                    Смотреть трейлер
                  </button>
                ) : (
                  <span className="rounded border border-white/10 bg-black/50 px-6 py-3 font-bold text-neutral-500">
                    Трейлер скоро
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => openContent(selectedItem)}
                  className="rounded border border-white bg-white px-6 py-3 font-bold text-black transition duration-200 hover:bg-black hover:text-white hover:shadow-[0_0_22px_rgba(255,255,255,0.25)] active:scale-[0.98]"
                  title="Открыть страницу фильма"
                >
                  Смотреть контент
                </button>

                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/60 p-1.5">
                  <ModalIconButton
                    isActive={watchLaterIds.includes(selectedItem.id)}
                    onClick={() => toggleWatchLater(selectedItem.id)}
                    ariaLabel={
                      watchLaterIds.includes(selectedItem.id)
                        ? "Убрать из смотреть позже"
                        : "Добавить в смотреть позже"
                    }
                    title={
                      watchLaterIds.includes(selectedItem.id)
                        ? "Убрать из смотреть позже"
                        : "Смотреть позже"
                    }
                  >
                    <ClockIcon />
                  </ModalIconButton>

                  <ModalIconButton
                    isActive={likedItemIds.includes(selectedItem.id)}
                    onClick={() => toggleLiked(selectedItem.id)}
                    ariaLabel={
                      likedItemIds.includes(selectedItem.id)
                        ? "Убрать лайк"
                        : "Фильм понравился"
                    }
                    title={
                      likedItemIds.includes(selectedItem.id)
                        ? "Убрать лайк"
                        : "Понравилось"
                    }
                  >
                    <HeartIcon filled={likedItemIds.includes(selectedItem.id)} />
                  </ModalIconButton>

                  <ModalIconButton
                    isActive={dislikedItemIds.includes(selectedItem.id)}
                    onClick={() => toggleDisliked(selectedItem.id)}
                    ariaLabel={
                      dislikedItemIds.includes(selectedItem.id)
                        ? "Убрать дизлайк"
                        : "Фильм не понравился"
                    }
                    title={
                      dislikedItemIds.includes(selectedItem.id)
                        ? "Убрать дизлайк"
                        : "Не понравилось"
                    }
                  >
                    <DislikeIcon filled={dislikedItemIds.includes(selectedItem.id)} />
                  </ModalIconButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {trailerItem && (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeTrailerModal();
            }
          }}
          className={`trailer-modal-overlay fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4 backdrop-blur ${
            isTrailerClosing ? "modal-overlay-close" : "modal-overlay-open"
          }`}
        >
          <div
            className={`trailer-modal-card relative w-full max-w-5xl rounded-2xl border border-white/10 bg-neutral-950 p-4 shadow-2xl ${
              isTrailerClosing ? "modal-window-close" : "modal-window-open"
            }`}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
                  Трейлер
                </p>

                <h3 className="mt-1 text-2xl font-black">
                  {trailerItem.title}
                </h3>

                <p className="mt-1 text-sm font-bold text-neutral-500">
                  {trailerItem.originalTitle}
                </p>
              </div>

              <button
                type="button"
                onClick={closeTrailerModal}
                className="rounded-full border border-white/10 bg-black px-4 py-2 text-xl font-bold text-white transition duration-200 hover:bg-white hover:text-black"
                aria-label="Закрыть трейлер"
              >
                ×
              </button>
            </div>

            <div className="aspect-video overflow-hidden rounded-xl bg-black">
              <iframe
                src={trailerItem.trailerUrl}
                title={`${trailerItem.originalTitle} trailer`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const catalogStyles = `
  .kinoluma-catalog {
    position: relative;
    color-scheme: dark;
    background:
      radial-gradient(circle at 18% -8%, rgba(255, 255, 255, 0.05), transparent 26%),
      radial-gradient(circle at 86% 12%, rgba(255, 255, 255, 0.035), transparent 24%),
      linear-gradient(180deg, #020202 0%, #000000 46%, #030303 100%);
  }

  .kinoluma-catalog::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.022) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.018) 1px, transparent 1px);
    background-size: 72px 72px;
    mask-image: radial-gradient(circle at 50% 0%, black 0%, transparent 62%);
    opacity: 0.34;
  }

  .kinoluma-catalog::after {
    content: "";
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 50% 0%, transparent 0%, rgba(0, 0, 0, 0.28) 48%, rgba(0, 0, 0, 0.88) 100%);
  }

  .catalog-bg-elements {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .catalog-bg-ring,
  .catalog-bg-line,
  .catalog-bg-dot {
    position: absolute;
    display: block;
  }

  .catalog-bg-ring {
    width: 420px;
    height: 420px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 999px;
    box-shadow: inset 0 0 60px rgba(255, 255, 255, 0.018);
  }

  .catalog-bg-ring-left {
    left: -190px;
    top: 118px;
  }

  .catalog-bg-ring-right {
    right: -210px;
    top: 280px;
    width: 520px;
    height: 520px;
    border-color: rgba(255, 255, 255, 0.045);
  }

  .catalog-bg-line {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.09), transparent);
    opacity: 0.52;
    transform: rotate(-12deg);
  }

  .catalog-bg-line-one {
    left: 8%;
    top: 300px;
    width: 440px;
  }

  .catalog-bg-line-two {
    right: 4%;
    top: 190px;
    width: 320px;
    transform: rotate(16deg);
    opacity: 0.38;
  }

  .catalog-bg-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.2);
    box-shadow: 0 0 24px rgba(255, 255, 255, 0.18);
  }

  .catalog-bg-dot-one {
    left: 16%;
    top: 252px;
  }

  .catalog-bg-dot-two {
    right: 24%;
    top: 420px;
    opacity: 0.62;
  }

  .catalog-header,
  .catalog-hero,
  .catalog-controls-section,
  .catalog-grid-section,
  .catalog-not-found {
    position: relative;
    z-index: 2;
  }

  .catalog-header {
    position: sticky;
    top: 0;
    z-index: 50;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 18px;
    width: 100%;
    min-height: 78px;
    padding: 0 clamp(18px, 4vw, 42px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(22px);
    -webkit-backdrop-filter: blur(22px);
  }

  .catalog-brand {
    display: inline-flex;
    align-items: center;
    gap: 13px;
    min-width: 0;
    color: #ffffff;
    text-decoration: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .catalog-brand-logo {
    display: block;
    width: 46px;
    height: 46px;
    min-width: 46px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 13px;
    background: #050505;
    object-fit: cover;
    box-shadow: none;
    pointer-events: none;
    -webkit-user-drag: none;
  }

  .catalog-brand-text {
    font-size: 17px;
    font-weight: 1000;
    letter-spacing: 0.01em;
  }

  .catalog-header-nav {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: center;
    gap: 7px;
    overflow-x: auto;
    padding: 8px 4px;
    scrollbar-width: none;
  }

  .catalog-header-nav::-webkit-scrollbar {
    display: none;
  }

  .catalog-header-nav a {
    display: inline-flex;
    flex: 0 0 auto;
    min-height: 38px;
    align-items: center;
    justify-content: center;
    padding: 0 15px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.018)),
      rgba(255, 255, 255, 0.025);
    color: rgba(255, 255, 255, 0.72);
    font-size: 12px;
    font-weight: 1000;
    text-decoration: none;
    white-space: nowrap;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.055);
    transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, color 180ms ease, box-shadow 180ms ease;
  }

  .catalog-header-nav a:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.07);
    color: #ffffff;
  }

  .catalog-header-nav a.is-active {
    border-color: #ffffff;
    background: #ffffff;
    color: #000000;
    box-shadow: 0 16px 44px rgba(255, 255, 255, 0.08);
  }

  .catalog-header-nav a:active {
    transform: scale(0.96);
  }

  .catalog-home-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    padding: 0 19px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.92);
    color: #000000;
    font-size: 13px;
    font-weight: 1000;
    cursor: pointer;
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.42);
    transition: transform 180ms ease, background 180ms ease, color 180ms ease, border-color 180ms ease;
  }

  .catalog-home-button:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.28);
    background: #111111;
    color: #ffffff;
  }

  .catalog-home-button:active {
    transform: scale(0.97);
  }

  .catalog-hero {
    overflow: hidden;
    padding: clamp(44px, 6vw, 78px) clamp(18px, 4vw, 42px) clamp(26px, 4vw, 42px);
  }

  .catalog-hero-inner {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 28px;
    align-items: end;
    width: min(100%, 1480px);
    margin: 0 auto;
  }

  .catalog-kicker {
    margin: 0;
    color: #737373;
    font-size: 13px;
    font-weight: 1000;
    letter-spacing: 0.32em;
    text-transform: uppercase;
  }

  .catalog-hero h1 {
    margin: 14px 0 0;
    color: #ffffff;
    font-size: clamp(42px, 6.4vw, 92px);
    font-weight: 1000;
    letter-spacing: -0.07em;
    line-height: 0.92;
  }

  .catalog-hero h2 {
    margin: 14px 0 0;
    color: rgba(255, 255, 255, 0.86);
    font-size: clamp(20px, 2.8vw, 32px);
    font-weight: 1000;
    letter-spacing: -0.045em;
  }

  .catalog-description {
    max-width: 760px;
    margin: 16px 0 0;
    color: #8d8d8d;
    font-size: clamp(14px, 1.45vw, 17px);
    line-height: 1.7;
  }

  .catalog-hero-panel {
    min-width: 194px;
    padding: 22px;
    border: 1px solid rgba(255, 255, 255, 0.095);
    border-radius: 28px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.065), rgba(255, 255, 255, 0.028)),
      rgba(5, 5, 5, 0.76);
    box-shadow:
      0 24px 90px rgba(0, 0, 0, 0.55),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .catalog-hero-panel span,
  .catalog-hero-panel p {
    display: block;
    margin: 0;
    color: #787878;
    font-size: 12px;
    font-weight: 1000;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .catalog-hero-panel strong {
    display: block;
    margin-top: 8px;
    color: #ffffff;
    font-size: 58px;
    font-weight: 1000;
    letter-spacing: -0.08em;
    line-height: 0.95;
  }

  .catalog-hero-panel p {
    margin-top: 10px;
    letter-spacing: 0;
    text-transform: none;
  }

  .catalog-controls-section {
    width: min(100%, 1480px);
    margin: 0 auto;
    padding: 0 clamp(18px, 4vw, 42px) 30px;
  }

  .catalog-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    width: 100%;
    padding: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 28px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.018)),
      rgba(5, 5, 5, 0.74);
    box-shadow: 0 24px 90px rgba(0, 0, 0, 0.44);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .catalog-search {
    display: flex;
    flex: 1 1 320px;
    min-width: 0;
    align-items: center;
    gap: 12px;
    height: 50px;
    padding: 0 16px;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.66);
    color: #ffffff;
  }

  .catalog-search svg {
    width: 20px;
    height: 20px;
    flex: 0 0 auto;
    color: #7a7a7a;
  }

  .catalog-search input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: #ffffff;
    font-size: 14px;
    font-weight: 800;
  }

  .catalog-search input::placeholder {
    color: #6f6f6f;
  }

  .catalog-sort-tabs {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 6px;
    padding: 5px;
    border: 1px solid rgba(255, 255, 255, 0.075);
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.62);
  }

  .catalog-sort-tabs button,
  .catalog-genre-row a,
  .catalog-genre-row button,
  .catalog-section-topline button {
    border: 0;
    color: #a3a3a3;
    cursor: pointer;
    font-weight: 1000;
    transition: transform 180ms ease, background 180ms ease, color 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
  }

  .catalog-sort-tabs button {
    min-height: 40px;
    padding: 0 15px;
    border-radius: 999px;
    background: transparent;
    font-size: 12px;
    white-space: nowrap;
  }

  .catalog-sort-tabs button:hover,
  .catalog-sort-tabs button.is-active {
    background: #ffffff;
    color: #000000;
  }

  .catalog-sort-tabs button:active,
  .catalog-genre-row a:active,
  .catalog-genre-row button:active,
  .catalog-section-topline button:active,
  .catalog-more-button:active {
    transform: scale(0.96);
  }

  .catalog-genre-row {
    display: flex;
    gap: 8px;
    width: 100%;
    margin-top: 14px;
    overflow-x: auto;
    padding: 4px 0 8px;
    scrollbar-width: none;
  }

  .catalog-genre-row::-webkit-scrollbar {
    display: none;
  }

  .catalog-genre-row a,
  .catalog-genre-row button {
    display: inline-flex;
    flex: 0 0 auto;
    min-height: 38px;
    align-items: center;
    justify-content: center;
    padding: 0 15px;
    border: 1px solid rgba(255, 255, 255, 0.105);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.035);
    font-size: 12px;
    line-height: 1;
    text-align: center;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.055);
  }

  .catalog-genre-row a:hover,
  .catalog-genre-row a.is-active,
  .catalog-genre-row button:hover,
  .catalog-genre-row button.is-active {
    border-color: rgba(255, 255, 255, 0.24);
    background: #ffffff;
    color: #000000;
  }

  .catalog-grid-section {
    width: min(100%, 1480px);
    margin: 0 auto;
    padding: 0 clamp(18px, 4vw, 42px) 86px;
  }

  .catalog-section-topline {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 20px;
    margin: 8px 0 20px;
  }

  .catalog-section-topline p {
    margin: 0;
    color: #727272;
    font-size: 12px;
    font-weight: 1000;
    letter-spacing: 0.24em;
    text-transform: uppercase;
  }

  .catalog-section-topline h3 {
    margin: 5px 0 0;
    color: #ffffff;
    font-size: 24px;
    font-weight: 1000;
    letter-spacing: -0.04em;
  }

  .catalog-section-topline button {
    min-height: 40px;
    padding: 0 16px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.055);
    font-size: 12px;
  }

  .catalog-section-topline button:hover {
    background: #ffffff;
    color: #000000;
  }

  .catalog-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 22px;
  }

  .catalog-card {
    min-width: 0;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 26px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.042), rgba(255, 255, 255, 0.018)),
      #050505;
    box-shadow:
      0 28px 90px rgba(0, 0, 0, 0.46),
      inset 0 1px 0 rgba(255, 255, 255, 0.065);
    opacity: 0;
    transform: translateY(12px);
    animation: catalogCardIn 420ms ease forwards;
    transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
  }

  .catalog-card:hover {
    transform: translateY(-5px);
    border-color: rgba(255, 255, 255, 0.22);
    box-shadow:
      0 34px 110px rgba(0, 0, 0, 0.66),
      0 0 38px rgba(255, 255, 255, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }

  @keyframes catalogCardIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .catalog-card-poster {
    position: relative;
    display: block;
    width: 100%;
    aspect-ratio: 2 / 3;
    overflow: hidden;
    border: 0;
    padding: 0;
    background: #0f0f0f;
    color: #ffffff;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }

  .catalog-card-image {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    transition: transform 500ms ease, filter 500ms ease;
  }

  .catalog-card:hover .catalog-card-image {
    transform: scale(1.045);
    filter: brightness(1.06);
  }

  .catalog-card-poster-shade {
    position: absolute;
    inset: auto 0 0;
    height: 45%;
    background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.78));
    pointer-events: none;
  }

  .catalog-card-type,
  .catalog-card-rating {
    position: absolute;
    top: 12px;
    display: inline-flex;
    align-items: center;
    min-height: 27px;
    border-radius: 999px;
    padding: 0 10px;
    font-size: 11px;
    font-weight: 1000;
    line-height: 1;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.32);
  }

  .catalog-card-type {
    left: 12px;
    max-width: calc(100% - 84px);
    overflow: hidden;
    background: rgba(0, 0, 0, 0.74);
    color: #ffffff;
    text-overflow: ellipsis;
    white-space: nowrap;
    backdrop-filter: blur(12px);
  }

  .catalog-card-rating {
    right: 12px;
    background: #ffffff;
    color: #000000;
  }

  .catalog-card-body {
    padding: 16px;
  }

  .catalog-card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: #737373;
    font-size: 12px;
    font-weight: 800;
  }

  .catalog-card-meta span:last-child {
    min-width: 0;
    overflow: hidden;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .catalog-card-title {
    display: -webkit-box;
    width: 100%;
    min-height: 44px;
    margin-top: 10px;
    overflow: hidden;
    border: 0;
    padding: 0;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    background: transparent;
    color: #ffffff;
    font-size: 18px;
    font-weight: 1000;
    letter-spacing: -0.03em;
    line-height: 1.18;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    transition: color 180ms ease;
  }

  .catalog-card-title:hover {
    color: #d4d4d4;
  }

  .catalog-card-original {
    margin: 6px 0 0;
    overflow: hidden;
    color: #737373;
    font-size: 13px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .catalog-card-description {
    display: -webkit-box;
    min-height: 62px;
    margin: 12px 0 0;
    overflow: hidden;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    color: #949494;
    font-size: 13px;
    line-height: 1.55;
  }

  .catalog-card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    min-height: 30px;
    margin-top: 14px;
  }

  .catalog-card-tags span {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 10px;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.035);
    color: #c7c7c7;
    font-size: 11px;
    font-weight: 800;
  }

  .catalog-card-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
    margin-top: 16px;
  }

  .catalog-card-primary,
  .catalog-card-secondary {
    display: inline-flex;
    min-height: 40px;
    align-items: center;
    justify-content: center;
    border-radius: 13px;
    font-size: 13px;
    font-weight: 1000;
    text-decoration: none;
    cursor: pointer;
    transition: transform 180ms ease, background 180ms ease, color 180ms ease, border-color 180ms ease;
  }

  .catalog-card-primary {
    border: 1px solid #ffffff;
    background: #ffffff;
    color: #000000;
  }

  .catalog-card-secondary {
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.035);
    color: #ffffff;
  }

  .catalog-card-primary:hover,
  .catalog-card-secondary:hover {
    transform: translateY(-1px);
  }

  .catalog-card-primary:hover {
    background: #0c0c0c;
    color: #ffffff;
  }

  .catalog-card-secondary:hover {
    border-color: rgba(255, 255, 255, 0.28);
    background: rgba(255, 255, 255, 0.08);
  }

  .catalog-card-primary:active,
  .catalog-card-secondary:active {
    transform: scale(0.97);
  }

  .catalog-more-wrap {
    display: flex;
    justify-content: center;
    padding-top: 46px;
    padding-bottom: 10px;
  }

  .catalog-more-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 13px;
    min-width: 148px;
    height: 56px;
    padding: 0 27px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 999px;
    background:
      radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.18), transparent 48%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.095), rgba(255, 255, 255, 0.045)),
      rgba(8, 8, 8, 0.86);
    color: #ffffff;
    font-size: 15px;
    font-weight: 1000;
    letter-spacing: 0.01em;
    line-height: 1;
    box-shadow:
      0 28px 80px rgba(0, 0, 0, 0.78),
      0 0 0 1px rgba(255, 255, 255, 0.035) inset,
      0 1px 0 rgba(255, 255, 255, 0.16) inset;
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    cursor: pointer;
    transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
  }

  .catalog-more-button:hover {
    transform: translateY(-3px);
    border-color: rgba(255, 255, 255, 0.28);
    background:
      radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.24), transparent 52%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.06)),
      rgba(14, 14, 14, 0.92);
    box-shadow:
      0 34px 95px rgba(0, 0, 0, 0.86),
      0 0 38px rgba(255, 255, 255, 0.07),
      0 0 0 1px rgba(255, 255, 255, 0.055) inset,
      0 1px 0 rgba(255, 255, 255, 0.2) inset;
  }

  .catalog-more-button-icon {
    display: flex;
    width: 28px;
    height: 28px;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.11);
    color: #ffffff;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.12) inset,
      0 10px 28px rgba(0, 0, 0, 0.36);
    transition: transform 180ms ease, background 180ms ease;
  }

  .catalog-more-button-svg {
    width: 16px;
    height: 16px;
  }

  .catalog-more-button:hover .catalog-more-button-icon {
    transform: translateY(2px);
    background: rgba(255, 255, 255, 0.17);
  }

  .catalog-empty-state,
  .catalog-not-found {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 32px;
    background: rgba(255, 255, 255, 0.032);
    box-shadow: 0 28px 100px rgba(0, 0, 0, 0.5);
    text-align: center;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .catalog-faq-section {
    width: min(100%, 1480px);
    margin: -34px auto 86px;
    padding: 0 clamp(18px, 4vw, 42px);
  }

  .catalog-faq-topline {
    margin-bottom: 18px;
  }

  .catalog-faq-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .catalog-faq-card {
    border: 1px solid rgba(255, 255, 255, 0.085);
    border-radius: 24px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.028)),
      rgba(0, 0, 0, 0.58);
    padding: 20px;
    box-shadow:
      0 24px 70px rgba(0, 0, 0, 0.42),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .catalog-faq-card h3 {
    margin: 0 0 9px;
    color: #ffffff;
    font-size: 16px;
    font-weight: 1000;
  }

  .catalog-faq-card p {
    margin: 0;
    color: #aaaaaa;
    font-size: 14px;
    line-height: 1.75;
  }

  .catalog-empty-state {
    padding: 52px 24px;
  }

  .catalog-empty-state h3,
  .catalog-not-found h1 {
    margin: 0;
    color: #ffffff;
    font-weight: 1000;
    letter-spacing: -0.04em;
  }

  .catalog-empty-state h3 {
    font-size: 28px;
  }

  .catalog-empty-state p,
  .catalog-not-found span {
    display: block;
    margin-top: 10px;
    color: #8a8a8a;
    font-size: 15px;
    line-height: 1.6;
  }

  .catalog-not-found {
    width: min(100%, 620px);
    margin: 0 auto;
    padding: 46px 24px;
  }

  .catalog-not-found p {
    margin: 0;
    color: #737373;
    font-size: 13px;
    font-weight: 1000;
    letter-spacing: 0.28em;
    text-transform: uppercase;
  }

  .catalog-not-found h1 {
    margin-top: 14px;
    font-size: 40px;
  }

  .catalog-not-found button {
    min-height: 44px;
    margin-top: 26px;
    padding: 0 20px;
    border: 1px solid #ffffff;
    border-radius: 999px;
    background: #ffffff;
    color: #000000;
    font-weight: 1000;
    cursor: pointer;
  }


  @keyframes modalOverlayOpen {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes modalOverlayClose {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes modalWindowOpen {
    from {
      opacity: 0;
      transform: translateY(18px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes modalWindowClose {
    from {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateY(12px) scale(0.97);
    }
  }

  .modal-overlay-open {
    animation: modalOverlayOpen 180ms ease-out forwards;
  }

  .modal-overlay-close {
    animation: modalOverlayClose 180ms ease-in forwards;
  }

  .modal-window-open {
    animation: modalWindowOpen 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .modal-window-close {
    animation: modalWindowClose 170ms ease-in forwards;
  }

  .details-modal-overlay {
    align-items: center !important;
    padding: 24px !important;
  }

  .details-modal-card {
    width: min(100%, 980px) !important;
    max-height: min(86vh, 720px) !important;
    overflow: hidden !important;
    border-radius: 28px !important;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.018)),
      #060606 !important;
    box-shadow:
      0 34px 120px rgba(0, 0, 0, 0.88),
      inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
  }

  .details-modal-poster {
    height: auto !important;
    min-height: 100% !important;
  }

  .details-modal-content {
    overflow-y: auto !important;
  }


  @media (max-width: 1280px) {
    .catalog-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @media (max-width: 1024px) {
    .catalog-hero-inner {
      grid-template-columns: 1fr;
    }

    .catalog-hero-panel {
      width: 100%;
      max-width: 340px;
    }

    .catalog-controls {
      align-items: stretch;
      flex-direction: column;
    }

    .catalog-sort-tabs {
      width: 100%;
      justify-content: center;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .catalog-sort-tabs::-webkit-scrollbar {
      display: none;
    }

    .catalog-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .catalog-faq-grid {
      grid-template-columns: 1fr;
    }

    .catalog-faq-section {
      margin-top: -24px;
      margin-bottom: 72px;
    }

    .catalog-header {
      grid-template-columns: minmax(0, 1fr) auto;
      min-height: 70px;
      padding: 0 14px;
    }

    .catalog-header-nav {
      grid-column: 1 / -1;
      grid-row: 2;
      justify-content: flex-start;
      margin: 0 -14px;
      padding: 0 14px 12px;
    }

    .catalog-header-nav a {
      min-height: 36px;
      padding: 0 13px;
      font-size: 11px;
    }

    .catalog-brand-logo {
      width: 42px;
      height: 42px;
      min-width: 42px;
      border-radius: 12px;
    }

    .catalog-brand-text {
      font-size: 16px;
    }

    .catalog-home-button {
      min-height: 38px;
      padding: 0 14px;
      font-size: 12px;
    }

    .catalog-hero {
      padding-top: 34px;
    }

    .catalog-hero h1 {
      font-size: 42px;
    }

    .catalog-hero h2 {
      font-size: 20px;
    }

    .catalog-description {
      font-size: 14px;
    }

    .catalog-sort-tabs {
      justify-content: flex-start;
    }

    .catalog-section-topline {
      align-items: flex-start;
      flex-direction: column;
    }

    .catalog-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .catalog-card {
      border-radius: 20px;
    }

    .catalog-card-body {
      padding: 12px;
    }

    .catalog-card-title {
      min-height: 39px;
      font-size: 16px;
    }

    .catalog-card-description {
      min-height: 58px;
      font-size: 12px;
    }

    .catalog-card-actions {
      grid-template-columns: 1fr;
    }

    .catalog-more-wrap {
      padding-top: 34px;
    }

    .catalog-more-button {
      min-width: 138px;
      height: 54px;
      padding: 0 24px;
    }
  }


  @media (max-width: 760px) {
    .details-modal-overlay,
    .trailer-modal-overlay {
      align-items: flex-end !important;
      padding: 0 !important;
    }

    .details-modal-card,
    .trailer-modal-card {
      width: 100% !important;
      max-width: 100% !important;
      max-height: 94dvh !important;
      border-right: 0 !important;
      border-bottom: 0 !important;
      border-left: 0 !important;
      border-radius: 28px 28px 0 0 !important;
      overflow-y: auto !important;
    }

    .details-modal-card {
      grid-template-columns: 1fr !important;
    }

    .details-modal-poster {
      height: min(58vh, 360px) !important;
    }

    .details-modal-content {
      padding: 22px 18px 26px !important;
    }

    .details-modal-content h3 {
      font-size: clamp(30px, 10vw, 40px) !important;
      line-height: 0.98;
      letter-spacing: -0.06em;
    }

    .details-modal-content .mt-6.text-lg {
      font-size: 15px;
      line-height: 1.7;
    }

    .details-modal-actions {
      display: grid !important;
      grid-template-columns: 1fr;
      align-items: stretch !important;
      gap: 10px !important;
    }

    .details-modal-actions > button {
      width: 100%;
      min-height: 48px;
      border-radius: 15px;
    }

    .details-modal-actions > div {
      justify-content: center;
      border-radius: 18px;
    }

    .trailer-modal-card {
      padding: 18px !important;
    }

    .trailer-modal-card h3 {
      font-size: 22px;
      line-height: 1.1;
    }
  }


  @media (max-width: 430px) {
    .catalog-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Patch: более аккуратная шапка, компактный hero и нормальные жанры */
  .catalog-header {
    position: sticky !important;
    top: 0 !important;
    z-index: 50 !important;
    display: grid !important;
    grid-template-columns: auto minmax(0, 1fr) auto !important;
    align-items: center !important;
    gap: 18px !important;
    min-height: 84px !important;
    padding: 14px clamp(18px, 4vw, 42px) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.075) !important;
    background: rgba(0, 0, 0, 0.86) !important;
    backdrop-filter: blur(18px) !important;
    -webkit-backdrop-filter: blur(18px) !important;
  }

  .catalog-brand {
    min-width: max-content !important;
  }

  .catalog-header-nav {
    justify-content: center !important;
    max-width: 100% !important;
  }

  .catalog-hero {
    padding-top: clamp(42px, 5vw, 64px) !important;
    padding-bottom: clamp(28px, 4vw, 42px) !important;
  }

  .catalog-hero-inner,
  .catalog-controls-section,
  .catalog-grid-section,
  .catalog-faq-section {
    width: min(100% - 36px, 1320px) !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  .catalog-hero h1 {
    max-width: 900px !important;
    font-size: clamp(44px, 6vw, 78px) !important;
    letter-spacing: -0.065em !important;
  }

  .catalog-hero h2 {
    font-size: clamp(22px, 2.5vw, 32px) !important;
  }

  .catalog-description {
    max-width: 780px !important;
  }

  .catalog-controls {
    align-items: stretch !important;
    border-radius: 26px !important;
  }

  .catalog-genre-row {
    flex-wrap: wrap !important;
    overflow: visible !important;
    max-height: none !important;
    gap: 10px !important;
    padding: 14px 0 4px !important;
  }

  .catalog-genre-row a,
  .catalog-genre-row button {
    display: inline-flex !important;
    min-height: 40px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 17px !important;
    line-height: 1 !important;
    text-align: center !important;
    text-decoration: none !important;
  }

  @media (max-width: 900px) {
    .catalog-header {
      grid-template-columns: 1fr !important;
      gap: 12px !important;
      min-height: auto !important;
    }

    .catalog-brand {
      justify-self: center !important;
    }

    .catalog-home-button {
      display: none !important;
    }

    .catalog-header-nav {
      justify-content: flex-start !important;
      width: 100% !important;
    }

    .catalog-hero-inner {
      grid-template-columns: 1fr !important;
    }

    .catalog-hero-panel {
      display: none !important;
    }

    .catalog-controls {
      display: grid !important;
      grid-template-columns: 1fr !important;
    }

    .catalog-sort-tabs {
      justify-content: center !important;
      width: 100% !important;
      overflow-x: auto !important;
    }
  }

`;
