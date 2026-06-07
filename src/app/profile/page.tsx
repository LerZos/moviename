"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Bookmark,
  Check,
  Clock,
  Film,
  Heart,
  LogOut,
  Play,
  ThumbsDown,
  Trash2,
  X,
} from "lucide-react";

import MobileBottomNav from "../components/MobileBottomNav";
import {
  profileCatalogItems as catalogItems,
  type ProfileCatalogItem,
} from "../data/profileCatalogItems";
import { supabase } from "../lib/supabase";
import { getResolvedTrailerUrl } from "../lib/trailers";
import {
  clearMovieActions,
  emptyMovieActionState,
  getCurrentSupabaseUser,
  loadMovieActions,
  mapSupabaseUser,
  removeCurrentUserFromStorage,
  saveCurrentUserToStorage,
  syncMovieAction,
} from "../lib/kinolumaSupabase";

type CatalogItem = ProfileCatalogItem;

type CatalogItemDetails = {
  description: string;
  trailerUrl: string;
};

type CurrentUser = {
  id: string;
  name: string;
  email: string;
};

type ProfileTab = "overview" | "watchLater" | "reactions";
type ProfileSort = "recent" | "rating" | "year" | "title";
type AuthMode = "login" | "register";

const PROFILE_LOAD_TIMEOUT_MS = 4500;

function waitForProfileFallback<T>(ms: number, value: T) {
  return new Promise<T>((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

function escapeSvgText(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createGeneratedPoster(
  title: string,
  originalTitle: string,
  type: string,
) {
  const safeTitle = escapeSvgText(title);
  const safeOriginalTitle = escapeSvgText(originalTitle);
  const safeType = escapeSvgText(type);

  const svg = `
    <svg width="500" height="750" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="500" height="750" fill="#050505"/>
      <rect x="24" y="24" width="452" height="702" rx="28" fill="#111111" stroke="#3f3f46" stroke-width="2"/>
      <circle cx="250" cy="245" r="84" fill="#18181b" stroke="#737373" stroke-width="2"/>
      <circle cx="210" cy="215" r="8" fill="#f5f5f5"/>
      <circle cx="285" cy="220" r="8" fill="#f5f5f5"/>
      <circle cx="245" cy="285" r="8" fill="#f5f5f5"/>
      <line x1="210" y1="215" x2="285" y2="220" stroke="#a3a3a3" stroke-width="3"/>
      <line x1="285" y1="220" x2="245" y2="285" stroke="#a3a3a3" stroke-width="3"/>
      <line x1="245" y1="285" x2="210" y2="215" stroke="#a3a3a3" stroke-width="3"/>
      <text x="250" y="405" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="34" font-weight="800">${safeTitle}</text>
      <text x="250" y="455" text-anchor="middle" fill="#a3a3a3" font-family="Arial" font-size="22" font-weight="600">${safeOriginalTitle}</text>
      <rect x="142" y="515" width="216" height="48" rx="24" fill="#ffffff"/>
      <text x="250" y="546" text-anchor="middle" fill="#000000" font-family="Arial" font-size="18" font-weight="800">${safeType}</text>
      <text x="250" y="645" text-anchor="middle" fill="#737373" font-family="Arial" font-size="18" font-weight="600">KinoLuma</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getPosterFallback(title: string, originalTitle: string, type: string) {
  return createGeneratedPoster(title, originalTitle, type);
}

function getCatalogItemDetails(item: CatalogItem): CatalogItemDetails {
  return {
    description: item.description,
    trailerUrl: item.trailerUrl,
  };
}

function getInitials(name: string) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "U";
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

function readCurrentUserFromStorage() {
  try {
    const savedUser = window.localStorage.getItem("kinoluma-current-user");

    if (!savedUser) {
      return null;
    }

    const parsedUser = JSON.parse(savedUser) as CurrentUser;

    if (parsedUser?.id && parsedUser?.name && parsedUser?.email) {
      return parsedUser;
    }

    return null;
  } catch {
    return null;
  }
}

function loadLocalActions() {
  return {
    watchLaterIds: readNumberArrayFromStorage("kinoluma-watch-later"),
    likedItemIds: readNumberArrayFromStorage("kinoluma-liked-items"),
    dislikedItemIds: readNumberArrayFromStorage("kinoluma-disliked-items"),
  };
}

function saveNumberArrayToStorage(key: string, ids: number[]) {
  window.localStorage.setItem(key, JSON.stringify(ids));
}

function getItemsByIds(ids: number[]) {
  return ids
    .map((id) => catalogItems.find((item) => item.id === id))
    .filter((item): item is CatalogItem => Boolean(item));
}

function getYearValue(item: CatalogItem) {
  const year = Number(item.year);
  return Number.isFinite(year) ? year : 0;
}

function sortCatalogItems(items: CatalogItem[], sort: ProfileSort) {
  const sortedItems = [...items];

  switch (sort) {
    case "rating":
      return sortedItems.sort(
        (first, second) =>
          second.rating - first.rating ||
          getYearValue(second) - getYearValue(first) ||
          first.title.localeCompare(second.title, "ru"),
      );

    case "year":
      return sortedItems.sort(
        (first, second) =>
          getYearValue(second) - getYearValue(first) ||
          second.rating - first.rating ||
          first.title.localeCompare(second.title, "ru"),
      );

    case "title":
      return sortedItems.sort((first, second) =>
        first.title.localeCompare(second.title, "ru"),
      );

    case "recent":
    default:
      return sortedItems.reverse();
  }
}

function StatCard({
  title,
  value,
  text,
  icon,
}: {
  title: string;
  value: number;
  text: string;
  icon: ReactNode;
}) {
  return (
    <article className="stat-card">
      <div className="stat-icon">{icon}</div>
      <p className="stat-title">{title}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-text">{text}</p>
    </article>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "tab-button tab-button-active" : "tab-button"}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SortControls({
  value,
  onChange,
}: {
  value: ProfileSort;
  onChange: (value: ProfileSort) => void;
}) {
  const options: Array<{ value: ProfileSort; label: string }> = [
    { value: "recent", label: "Новые" },
    { value: "rating", label: "Рейтинг" },
    { value: "year", label: "Год" },
    { value: "title", label: "А-Я" },
  ];

  return (
    <section className="sort-card" aria-label="Сортировка списков профиля">
      <div>
        <p className="eyebrow">Сортировка</p>
        <strong>Порядок карточек</strong>
      </div>

      <div className="sort-actions">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={
              value === option.value
                ? "sort-button sort-button-active"
                : "sort-button"
            }
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      <a href="/" className="small-link-button">
        Перейти в каталог
      </a>
    </div>
  );
}

function MovieCard({
  item,
  badge,
  onOpen,
  onRemove,
}: {
  item: CatalogItem;
  badge: string;
  onOpen: (item: CatalogItem) => void;
  onRemove?: () => void;
}) {
  return (
    <article className="movie-card">
      <button
        type="button"
        className="movie-card-main"
        onClick={() => onOpen(item)}
        aria-label={`Открыть ${item.title}`}
      >
        <div className="movie-poster-wrap">
          <img
            src={item.poster}
            alt={item.title}
            className="movie-poster"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = getPosterFallback(
                item.title,
                item.originalTitle,
                item.type,
              );
            }}
          />

          <div className="poster-shade" />

          <div className="movie-badge">{badge}</div>

          <div className="movie-rating">★ {item.rating}</div>

          <div className="movie-title-block">
            <h3>{item.title}</h3>
            <p>{item.originalTitle}</p>
          </div>
        </div>

        <div className="movie-info">
          <div className="movie-tags">
            <span>{item.type}</span>
            <span>{item.year}</span>
            <span>{item.genres[0]}</span>
          </div>
        </div>
      </button>

      {onRemove && (
        <button className="remove-button" onClick={onRemove}>
          <Trash2 size={16} strokeWidth={2.4} aria-hidden="true" />
          Убрать
        </button>
      )}
    </article>
  );
}

function MovieRail({
  items,
  badge,
  emptyTitle,
  emptyText,
  emptyIcon,
  onOpen,
  onRemove,
}: {
  items: CatalogItem[];
  badge: string;
  emptyTitle: string;
  emptyText: string;
  emptyIcon: ReactNode;
  onOpen: (item: CatalogItem) => void;
  onRemove?: (itemId: number) => void;
}) {
  if (items.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} text={emptyText} />;
  }

  return (
    <div className="movie-rail">
      {items.map((item) => (
        <MovieCard
          key={item.id}
          item={item}
          badge={badge}
          onOpen={onOpen}
          onRemove={onRemove ? () => onRemove(item.id) : undefined}
        />
      ))}
    </div>
  );
}

function DetailsModal({
  item,
  isClosing,
  watchLaterIds,
  likedItemIds,
  dislikedItemIds,
  onClose,
  onToggleWatchLater,
  onToggleLiked,
  onToggleDisliked,
}: {
  item: CatalogItem;
  isClosing: boolean;
  watchLaterIds: number[];
  likedItemIds: number[];
  dislikedItemIds: number[];
  onClose: () => void;
  onToggleWatchLater: (itemId: number) => void;
  onToggleLiked: (itemId: number) => void;
  onToggleDisliked: (itemId: number) => void;
}) {
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const details = getCatalogItemDetails(item);
  const normalizedTrailerUrl = getResolvedTrailerUrl({ ...item, trailerUrl: details.trailerUrl });
  const isWatchLater = watchLaterIds.includes(item.id);
  const isLiked = likedItemIds.includes(item.id);
  const isDisliked = dislikedItemIds.includes(item.id);

  return (
    <div
      className={
        isClosing
          ? "details-overlay details-overlay-close"
          : "details-overlay details-overlay-open"
      }
      onClick={onClose}
    >
      <section
        className={
          isClosing
            ? "details-modal details-modal-close"
            : "details-modal details-modal-open"
        }
        onClick={(event) => event.stopPropagation()}
        aria-modal="true"
        role="dialog"
      >
        <button
          type="button"
          className="details-close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <X size={22} strokeWidth={2.6} aria-hidden="true" />
        </button>

        <div className="details-poster-side">
          <img
            src={item.poster}
            alt={item.title}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = getPosterFallback(
                item.title,
                item.originalTitle,
                item.type,
              );
            }}
          />
          <div className="details-poster-shadow" />
        </div>

        <div className="details-content-side">
          <p className="eyebrow">{item.type}</p>

          <h2>{item.title}</h2>
          <p className="details-original-title">{item.originalTitle}</p>

          <div className="details-meta-row">
            <span className="details-rating">★ {item.rating} / 10</span>
            <span>{item.year}</span>
            {item.genres.map((genre) => (
              <span key={genre}>{genre}</span>
            ))}
          </div>

          <p className="details-description">{details.description}</p>

          <div className="details-actions">
            <button
              type="button"
              className={isWatchLater ? "modal-action active" : "modal-action"}
              onClick={() => onToggleWatchLater(item.id)}
            >
              {isWatchLater ? (
                <Check size={17} strokeWidth={2.6} aria-hidden="true" />
              ) : (
                <Bookmark size={17} strokeWidth={2.4} aria-hidden="true" />
              )}
              {isWatchLater ? "В списке" : "Смотреть позже"}
            </button>

            <button
              type="button"
              className={isLiked ? "modal-action active" : "modal-action"}
              onClick={() => onToggleLiked(item.id)}
            >
              <Heart
                size={17}
                strokeWidth={2.4}
                fill={isLiked ? "currentColor" : "none"}
                aria-hidden="true"
              />
              Нравится
            </button>

            <button
              type="button"
              className={isDisliked ? "modal-action active" : "modal-action"}
              onClick={() => onToggleDisliked(item.id)}
            >
              <ThumbsDown
                size={17}
                strokeWidth={2.4}
                fill={isDisliked ? "currentColor" : "none"}
                aria-hidden="true"
              />
              {isDisliked ? "Не понравилось" : "Не нравится"}
            </button>
          </div>

          {normalizedTrailerUrl ? (
            <div className="trailer-block">
              <button
                type="button"
                className="trailer-toggle"
                onClick={() => setIsTrailerOpen((current) => !current)}
              >
                <Play size={17} strokeWidth={2.4} aria-hidden="true" />
                {isTrailerOpen ? "Скрыть трейлер" : "Смотреть трейлер"}
              </button>

              {isTrailerOpen && (
                <div className="trailer-frame-wrap">
                  <iframe
                    src={normalizedTrailerUrl}
                    title={`Трейлер: ${item.title}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="details-note">
              Для этого материала трейлер пока не подключён.
            </p>
          )}

          <p className="details-note">
            Управляй списками и реакциями прямо здесь, не теряя контекст
            выбранного фильма.
          </p>
        </div>
      </section>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  count,
  children,
}: {
  eyebrow: string;
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="section-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>

        {typeof count === "number" && (
          <span className="count-pill">{count}</span>
        )}
      </div>

      {children}
    </section>
  );
}

export default function ProfilePage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [watchLaterIds, setWatchLaterIds] = useState<number[]>([]);
  const [likedItemIds, setLikedItemIds] = useState<number[]>([]);
  const [dislikedItemIds, setDislikedItemIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [profileSort, setProfileSort] = useState<ProfileSort>("recent");
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [isDetailsClosing, setIsDetailsClosing] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;


    async function initializeProfile() {
      const localActions = loadLocalActions();
      const savedUser = readCurrentUserFromStorage();

      if (savedUser) {
        setCurrentUser(savedUser);
        setWatchLaterIds(localActions.watchLaterIds);
        setLikedItemIds(localActions.likedItemIds);
        setDislikedItemIds(localActions.dislikedItemIds);
        setIsLoaded(true);
      }

      try {
        const user = await Promise.race([
          getCurrentSupabaseUser(),
          waitForProfileFallback(PROFILE_LOAD_TIMEOUT_MS, null),
        ]);

        if (!isMounted) {
          return;
        }

        if (!user) {
          if (savedUser) {
            setCurrentUser(savedUser);
          } else {
            setCurrentUser(null);
            removeCurrentUserFromStorage();
          }

          setWatchLaterIds(localActions.watchLaterIds);
          setLikedItemIds(localActions.likedItemIds);
          setDislikedItemIds(localActions.dislikedItemIds);
          setIsLoaded(true);
          return;
        }

        const mappedUser = mapSupabaseUser(user);
        setCurrentUser(mappedUser);
        saveCurrentUserToStorage(mappedUser);

        const actions = await Promise.race([
          loadMovieActions().catch(() => localActions),
          waitForProfileFallback(PROFILE_LOAD_TIMEOUT_MS, localActions),
        ]);

        if (!isMounted) {
          return;
        }

        setWatchLaterIds(actions.watchLaterIds);
        setLikedItemIds(actions.likedItemIds);
        setDislikedItemIds(actions.dislikedItemIds);
        setIsLoaded(true);
      } catch (error) {
        console.error("Не удалось загрузить профиль Supabase:", error);

        if (!isMounted) {
          return;
        }

        setCurrentUser(savedUser);
        setWatchLaterIds(localActions.watchLaterIds);
        setLikedItemIds(localActions.likedItemIds);
        setDislikedItemIds(localActions.dislikedItemIds);
        setIsLoaded(true);
      }
    }

    void initializeProfile();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) {
          return;
        }

        if (!session?.user) {
          if (event === "SIGNED_OUT") {
            const localActions = loadLocalActions();

            setCurrentUser(null);
            setWatchLaterIds(localActions.watchLaterIds);
            setLikedItemIds(localActions.likedItemIds);
            setDislikedItemIds(localActions.dislikedItemIds);
            removeCurrentUserFromStorage();
            setIsLoaded(true);
          }

          return;
        }

        const mappedUser = mapSupabaseUser(session.user);
        setCurrentUser(mappedUser);
        saveCurrentUserToStorage(mappedUser);
        setIsLoaded(true);

        const localActions = loadLocalActions();
        const actions = await Promise.race([
          loadMovieActions().catch(() => localActions),
          waitForProfileFallback(PROFILE_LOAD_TIMEOUT_MS, localActions),
        ]);

        if (!isMounted) {
          return;
        }

        setWatchLaterIds(actions.watchLaterIds);
        setLikedItemIds(actions.likedItemIds);
        setDislikedItemIds(actions.dislikedItemIds);
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function checkAdminAccess() {
      if (!currentUser) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
          if (isMounted) {
            setIsAdmin(false);
          }
          return;
        }

        const response = await fetch("/api/admin/me", {
          headers: {
            authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (isMounted) {
          setIsAdmin(response.ok);
        }
      } catch {
        if (isMounted) {
          setIsAdmin(false);
        }
      }
    }

    void checkAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeItemDetails();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedItem]);

  const watchLaterItems = useMemo(
    () => getItemsByIds(watchLaterIds),
    [watchLaterIds],
  );

  const likedItems = useMemo(() => getItemsByIds(likedItemIds), [likedItemIds]);

  const dislikedItems = useMemo(
    () => getItemsByIds(dislikedItemIds),
    [dislikedItemIds],
  );

  const sortedWatchLaterItems = useMemo(
    () => sortCatalogItems(watchLaterItems, profileSort),
    [watchLaterItems, profileSort],
  );

  const sortedLikedItems = useMemo(
    () => sortCatalogItems(likedItems, profileSort),
    [likedItems, profileSort],
  );

  const sortedDislikedItems = useMemo(
    () => sortCatalogItems(dislikedItems, profileSort),
    [dislikedItems, profileSort],
  );

  const totalActivity =
    watchLaterItems.length + likedItems.length + dislikedItems.length;

  const profileLevel = Math.max(1, Math.min(99, totalActivity + 1));
  const progressWidth = Math.min(100, profileLevel * 8);

  const favoriteGenres = useMemo(() => {
    const genresMap = new Map<string, number>();

    likedItems.forEach((item) => {
      item.genres.forEach((genre) => {
        genresMap.set(genre, (genresMap.get(genre) || 0) + 1);
      });
    });

    return Array.from(genresMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [likedItems]);

  const savedIds = useMemo(() => {
    return new Set([...watchLaterIds, ...likedItemIds, ...dislikedItemIds]);
  }, [watchLaterIds, likedItemIds, dislikedItemIds]);

  const recommendedItems = useMemo(() => {
    return catalogItems
      .filter((item) => [1, 3, 20, 21, 24, 28].includes(item.id))
      .filter((item) => !savedIds.has(item.id))
      .slice(0, 6);
  }, [savedIds]);

  const featuredItem = watchLaterItems[0] || likedItems[0] || catalogItems[0];

  const tasteTitle =
    likedItems.length === 0
      ? "Вкус формируется"
      : likedItems.some((item) => item.genres.includes("Фантастика"))
        ? "Фантастика и масштаб"
        : likedItems.some((item) => item.genres.includes("Экшен"))
          ? "Экшен и драйв"
          : likedItems.some((item) => item.genres.includes("Драма"))
            ? "Сильные истории"
            : "Смешанный вкус";

  function openItemDetails(item: CatalogItem) {
    setSelectedItem(item);
    setIsDetailsClosing(false);
  }

  function closeItemDetails() {
    setIsDetailsClosing(true);

    window.setTimeout(() => {
      setSelectedItem(null);
      setIsDetailsClosing(false);
    }, 180);
  }

  function toggleWatchLater(itemId: number) {
    const shouldEnable = !watchLaterIds.includes(itemId);
    const nextIds = shouldEnable
      ? [...watchLaterIds, itemId]
      : watchLaterIds.filter((id) => id !== itemId);

    setWatchLaterIds(nextIds);
    void syncMovieAction(itemId, "watch_later", shouldEnable);
  }

  function toggleLiked(itemId: number) {
    const shouldEnable = !likedItemIds.includes(itemId);
    const nextLikedIds = shouldEnable
      ? [...likedItemIds, itemId]
      : likedItemIds.filter((id) => id !== itemId);

    setLikedItemIds(nextLikedIds);
    void syncMovieAction(itemId, "liked", shouldEnable);

    if (shouldEnable) {
      setDislikedItemIds((currentIds) =>
        currentIds.filter((id) => id !== itemId),
      );
      void syncMovieAction(itemId, "disliked", false);
    }
  }

  function toggleDisliked(itemId: number) {
    const shouldEnable = !dislikedItemIds.includes(itemId);
    const nextDislikedIds = shouldEnable
      ? [...dislikedItemIds, itemId]
      : dislikedItemIds.filter((id) => id !== itemId);

    setDislikedItemIds(nextDislikedIds);
    void syncMovieAction(itemId, "disliked", shouldEnable);

    if (shouldEnable) {
      setLikedItemIds((currentIds) => currentIds.filter((id) => id !== itemId));
      void syncMovieAction(itemId, "liked", false);
    }
  }

  function removeFromWatchLater(itemId: number) {
    setWatchLaterIds((currentIds) => currentIds.filter((id) => id !== itemId));
    void syncMovieAction(itemId, "watch_later", false);
  }

  function removeFromLiked(itemId: number) {
    setLikedItemIds((currentIds) => currentIds.filter((id) => id !== itemId));
    void syncMovieAction(itemId, "liked", false);
  }

  function removeFromDisliked(itemId: number) {
    setDislikedItemIds((currentIds) =>
      currentIds.filter((id) => id !== itemId),
    );
    void syncMovieAction(itemId, "disliked", false);
  }

  function clearAllLists() {
    const confirmed = window.confirm(
      "Очистить “Смотреть позже”, лайки и дизлайки?",
    );

    if (!confirmed) {
      return;
    }

    setWatchLaterIds([]);
    setLikedItemIds([]);
    setDislikedItemIds([]);
    void clearMovieActions();
  }

  function resetProfileAuthForm() {
    setAuthName("");
    setAuthEmail("");
    setAuthPassword("");
    setAuthError("");
    setAuthNotice("");
  }

  function switchProfileAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    setAuthError("");
    setAuthNotice("");
  }

  async function applyAuthenticatedProfile(user: Parameters<typeof mapSupabaseUser>[0]) {
    const mappedUser = mapSupabaseUser(user);

    setCurrentUser(mappedUser);
    saveCurrentUserToStorage(mappedUser);

    const actions = await Promise.race([
      loadMovieActions().catch(() => emptyMovieActionState),
      waitForProfileFallback(PROFILE_LOAD_TIMEOUT_MS, emptyMovieActionState),
    ]);

    setWatchLaterIds(actions.watchLaterIds);
    setLikedItemIds(actions.likedItemIds);
    setDislikedItemIds(actions.dislikedItemIds);
    resetProfileAuthForm();
  }

  async function handleProfileAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = authName.trim();
    const cleanEmail = authEmail.trim().toLowerCase();
    const cleanPassword = authPassword.trim();

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setAuthError("Введите корректный email.");
      setAuthNotice("");
      return;
    }

    if (cleanPassword.length < 6) {
      setAuthError("Пароль должен быть минимум 6 символов.");
      setAuthNotice("");
      return;
    }

    if (authMode === "register" && cleanName.length < 2) {
      setAuthError("Введите имя минимум из 2 символов.");
      setAuthNotice("");
      return;
    }

    setIsAuthSubmitting(true);
    setAuthError("");
    setAuthNotice("");

    try {
      if (authMode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              name: cleanName,
            },
          },
        });

        if (error) {
          setAuthError(error.message);
          return;
        }

        if (!data.session || !data.user) {
          setAuthMode("login");
          setAuthPassword("");
          setAuthNotice(
            "Аккаунт создан. Если Supabase просит подтверждение, подтверди email и войди.",
          );
          return;
        }

        await applyAuthenticatedProfile(data.user);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error || !data.user) {
        setAuthError(error?.message || "Неверный email или пароль.");
        return;
      }

      await applyAuthenticatedProfile(data.user);
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    removeCurrentUserFromStorage();
    window.location.href = "/";
  }

  if (!isLoaded) {
    return (
      <main className="profile-page profile-page-with-mobile-nav">
        <style>{profileStyles}</style>
        <div className="loading-screen">
          <div className="loading-card">
            <img
              src="/kinoluma-icon.png"
              alt="KinoLuma"
              className="loading-logo"
            />
            <p>Загрузка профиля...</p>
          </div>
        </div>
        <MobileBottomNav />
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="profile-page profile-page-with-mobile-nav">
        <style>{profileStyles}</style>

        <div className="ambient-bg" />

        <section className="auth-screen">
          <div className="auth-card auth-card-compact">
            <div className="logo-row">
              <img
                src="/kinoluma-icon.png"
                alt="KinoLuma"
                className="logo-mark"
              />
              <div>
                <p className="logo-title">KinoLuma</p>
                <p className="logo-subtitle">Профиль</p>
              </div>
            </div>

            <p className="eyebrow auth-eyebrow">Аккаунт KinoLuma</p>

            <h1 className="auth-title">
              {authMode === "login" ? "Вход" : "Регистрация"}
            </h1>

            <p className="auth-text auth-text-compact">
              {authMode === "login"
                ? "Войди, чтобы открыть свои списки, реакции и персональные подборки."
                : "Создай аккаунт, чтобы сохранять фильмы, реакции и подборки в профиле."}
            </p>

            <form onSubmit={handleProfileAuthSubmit} className="profile-auth-form">
              {authMode === "register" && (
                <label className="profile-auth-field">
                  <span>Имя</span>
                  <input
                    value={authName}
                    onChange={(event) => setAuthName(event.target.value)}
                    placeholder="Например: Алекс"
                    autoComplete="name"
                  />
                </label>
              )}

              <label className="profile-auth-field">
                <span>Email</span>
                <input
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                />
              </label>

              <label className="profile-auth-field">
                <span>Пароль</span>
                <input
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="Минимум 6 символов"
                  type="password"
                  autoComplete={
                    authMode === "login" ? "current-password" : "new-password"
                  }
                />
              </label>

              {authError && <div className="auth-message auth-error">{authError}</div>}
              {authNotice && <div className="auth-message auth-notice">{authNotice}</div>}

              <button
                type="submit"
                className="primary-button auth-submit-button"
                disabled={isAuthSubmitting}
              >
                {isAuthSubmitting
                  ? "Проверяем..."
                  : authMode === "login"
                    ? "Войти"
                    : "Зарегистрироваться"}
              </button>
            </form>

            <div className="auth-switch-row">
              {authMode === "login" ? (
                <button
                  type="button"
                  onClick={() => switchProfileAuthMode("register")}
                >
                  Нет аккаунта? Зарегистрироваться
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => switchProfileAuthMode("login")}
                >
                  Уже есть аккаунт? Войти
                </button>
              )}
            </div>

            <a href="/" className="secondary-button auth-back-button">
              <ArrowLeft size={18} strokeWidth={2.4} aria-hidden="true" />
              Вернуться на главную
            </a>

            <p className="auth-small-note">
              После входа твои списки, реакции и подборки будут доступны в
              профиле KinoLuma.
            </p>
          </div>
        </section>
        <MobileBottomNav />
      </main>
    );
  }

  return (
    <main className="profile-page profile-page-with-mobile-nav">
      <style>{profileStyles}</style>

      <div className="ambient-bg" />

      <header className="topbar">
        <div className="topbar-inner">
          <a href="/" className="brand">
            <img
              src="/kinoluma-icon.png"
              alt="KinoLuma"
              className="logo-mark"
            />
            <div>
              <p className="logo-title">KinoLuma</p>
              <p className="logo-subtitle">Профиль</p>
            </div>
          </a>

          <div className="top-actions">
            <a href="/" className="ghost-button">
              <Film size={17} strokeWidth={2.4} aria-hidden="true" />В каталог
            </a>

            {isAdmin && (
              <a href="/admin/import" className="ghost-button admin-profile-link">
                <Film size={17} strokeWidth={2.4} aria-hidden="true" />
                Админка
              </a>
            )}

            <button onClick={logout} className="ghost-button">
              <LogOut size={17} strokeWidth={2.4} aria-hidden="true" />
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="page-shell">
        <section className="hero-grid">
          <aside className="identity-card animate-in">
            <div className="avatar-row">
              <div className="avatar">{getInitials(currentUser.name)}</div>

              <div className="user-meta">
                <p className="eyebrow">Аккаунт</p>
                <h1>{currentUser.name}</h1>
                <p>{currentUser.email}</p>
              </div>
            </div>

            <div className="level-card">
              <div className="level-top">
                <div>
                  <p>Уровень профиля</p>
                  <strong>LVL {profileLevel}</strong>
                </div>

                <span>{tasteTitle}</span>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
            </div>

            <div className="mini-stats">
              <div>
                <strong>{watchLaterItems.length}</strong>
                <span>позже</span>
              </div>
              <div>
                <strong>{likedItems.length}</strong>
                <span>лайки</span>
              </div>
              <div>
                <strong>{dislikedItems.length}</strong>
                <span>дизлайки</span>
              </div>
            </div>
          </aside>

          <section className="dashboard-card animate-in delay-1">
            <div className="dashboard-content">
              <p className="eyebrow">Dashboard</p>

              <h2>Твой центр управления просмотром</h2>

              <p>
                Сохраняй фильмы, отмечай понравившееся и возвращайся к своим
                подборкам без лишнего поиска. Профиль помогает держать личный
                киноархив под рукой.
              </p>

              <div className="dashboard-actions">
                <button
                  type="button"
                  onClick={() => openItemDetails(featuredItem)}
                  className="primary-button"
                >
                  <Play size={18} strokeWidth={2.4} aria-hidden="true" />
                  Открыть фильм
                </button>

                <a href="/" className="secondary-button">
                  <Film size={18} strokeWidth={2.4} aria-hidden="true" />В
                  каталог
                </a>

                {isAdmin && (
                  <a href="/admin/import" className="primary-button admin-dashboard-button">
                    <Film size={18} strokeWidth={2.4} aria-hidden="true" />
                    Управление фильмами
                  </a>
                )}

                <button onClick={clearAllLists} className="secondary-button">
                  <Trash2 size={18} strokeWidth={2.4} aria-hidden="true" />
                  Очистить списки
                </button>
              </div>
            </div>

            <button
              type="button"
              className="featured-preview"
              onClick={() => openItemDetails(featuredItem)}
            >
              <img
                src={featuredItem.poster}
                alt={featuredItem.title}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = getPosterFallback(
                    featuredItem.title,
                    featuredItem.originalTitle,
                    featuredItem.type,
                  );
                }}
              />

              <div>
                <span>Сейчас в фокусе</span>
                <strong>{featuredItem.title}</strong>
                <p>{featuredItem.originalTitle}</p>
              </div>
            </button>
          </section>
        </section>

        <section className="stats-grid">
          <StatCard
            icon={<Activity size={21} strokeWidth={2.4} aria-hidden="true" />}
            title="Активность"
            value={totalActivity}
            text="Все сохранения и реакции."
          />

          <StatCard
            icon={<Clock size={21} strokeWidth={2.4} aria-hidden="true" />}
            title="Смотреть позже"
            value={watchLaterItems.length}
            text="Контент на будущий вечер."
          />

          <StatCard
            icon={<Heart size={21} strokeWidth={2.4} aria-hidden="true" />}
            title="Понравилось"
            value={likedItems.length}
            text="Основа будущих рекомендаций."
          />

          <StatCard
            icon={<ThumbsDown size={21} strokeWidth={2.4} aria-hidden="true" />}
            title="Не понравилось"
            value={dislikedItems.length}
            text="Чтобы не предлагать лишнее."
          />
        </section>

        <nav className="tabs-card">
          <TabButton
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
          >
            <Activity size={17} strokeWidth={2.4} aria-hidden="true" />
            Обзор
          </TabButton>

          <TabButton
            active={activeTab === "watchLater"}
            onClick={() => setActiveTab("watchLater")}
          >
            <Clock size={17} strokeWidth={2.4} aria-hidden="true" />
            Смотреть позже
          </TabButton>

          <TabButton
            active={activeTab === "reactions"}
            onClick={() => setActiveTab("reactions")}
          >
            <Heart size={17} strokeWidth={2.4} aria-hidden="true" />
            Реакции
          </TabButton>
        </nav>

        <SortControls value={profileSort} onChange={setProfileSort} />

        {activeTab === "overview" && (
          <div className="content-grid animate-in">
            <SectionCard
              eyebrow="Мой список"
              title="Смотреть позже"
              count={watchLaterItems.length}
            >
              <MovieRail
                items={sortedWatchLaterItems}
                badge="Позже"
                emptyIcon={
                  <Clock size={24} strokeWidth={2.4} aria-hidden="true" />
                }
                emptyTitle="Список пока пуст"
                emptyText="Открой карточку фильма на главной странице и нажми “Смотреть позже”. После этого карточка появится здесь."
                onOpen={openItemDetails}
                onRemove={removeFromWatchLater}
              />
            </SectionCard>

            <SectionCard eyebrow="Аналитика" title="Любимые жанры">
              {favoriteGenres.length > 0 ? (
                <div className="genre-list">
                  {favoriteGenres.map(([genre, count]) => (
                    <div key={genre} className="genre-row">
                      <div>
                        <span>{genre}</span>
                        <strong>{count}</strong>
                      </div>

                      <div className="genre-track">
                        <div
                          className="genre-fill"
                          style={{ width: `${Math.min(count * 32, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="soft-card">
                  <h3>Жанры появятся после лайков</h3>
                  <p>
                    Поставь лайк нескольким фильмам — и профиль начнёт понимать
                    твой вкус. Пока он просто делает вид, что загадочный.
                  </p>
                </div>
              )}

              <div className="soft-card">
                <h3>Твои подборки</h3>
                <p>
                  Списки и реакции помогают быстрее возвращаться к выбранным
                  фильмам и собирать личную подборку на KinoLuma.
                </p>
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Подборка"
              title="Можно начать с этого"
              count={recommendedItems.length}
            >
              <MovieRail
                items={recommendedItems}
                badge="Идея"
                emptyIcon={
                  <Check size={24} strokeWidth={2.6} aria-hidden="true" />
                }
                emptyTitle="Похоже, ты уже всё отметил"
                emptyText="В рекомендациях не осталось свободных карточек из базовой подборки."
                onOpen={openItemDetails}
              />
            </SectionCard>
          </div>
        )}

        {activeTab === "watchLater" && (
          <div className="animate-in">
            <SectionCard
              eyebrow="Мой список"
              title="Смотреть позже"
              count={watchLaterItems.length}
            >
              <div className="full-grid">
                {watchLaterItems.length > 0 ? (
                  sortedWatchLaterItems.map((item) => (
                    <MovieCard
                      key={item.id}
                      item={item}
                      badge="Позже"
                      onOpen={openItemDetails}
                      onRemove={() => removeFromWatchLater(item.id)}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon={
                      <Clock size={24} strokeWidth={2.4} aria-hidden="true" />
                    }
                    title="Список пока пуст"
                    text="Добавь фильм через кнопку “Смотреть позже” на главной странице."
                  />
                )}
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === "reactions" && (
          <div className="reactions-grid animate-in">
            <SectionCard
              eyebrow="Реакции"
              title="Понравилось"
              count={likedItems.length}
            >
              <MovieRail
                items={sortedLikedItems}
                badge="Лайк"
                emptyIcon={
                  <Heart size={24} strokeWidth={2.4} aria-hidden="true" />
                }
                emptyTitle="Лайков пока нет"
                emptyText="Открой фильм на главной странице и нажми сердечко."
                onOpen={openItemDetails}
                onRemove={removeFromLiked}
              />
            </SectionCard>

            <SectionCard
              eyebrow="Фильтр вкуса"
              title="Не понравилось"
              count={dislikedItems.length}
            >
              <MovieRail
                items={sortedDislikedItems}
                badge="Дизлайк"
                emptyIcon={
                  <ThumbsDown size={24} strokeWidth={2.4} aria-hidden="true" />
                }
                emptyTitle="Дизлайков пока нет"
                emptyText="Пока профиль никого не осуждает. Редкий случай мирного интернета."
                onOpen={openItemDetails}
                onRemove={removeFromDisliked}
              />
            </SectionCard>
          </div>
        )}
      </div>

      {selectedItem && (
        <DetailsModal
          item={selectedItem}
          isClosing={isDetailsClosing}
          watchLaterIds={watchLaterIds}
          likedItemIds={likedItemIds}
          dislikedItemIds={dislikedItemIds}
          onClose={closeItemDetails}
          onToggleWatchLater={toggleWatchLater}
          onToggleLiked={toggleLiked}
          onToggleDisliked={toggleDisliked}
        />
      )}

      <footer className="footer">
        <p>KinoLuma — Личный кабинет</p>
        <a href="/">← Вернуться на главную</a>
      </footer>
      {!selectedItem && <MobileBottomNav />}
    </main>
  );
}

const profileStyles = `
  * {
    box-sizing: border-box;
  }

  .profile-page {
    min-height: 100vh;
    background: #050505;
    color: #ffffff;
    overflow-x: hidden;
  }

  .ambient-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 18% 8%, rgba(255,255,255,0.10), transparent 28%),
      radial-gradient(circle at 88% 18%, rgba(255,255,255,0.07), transparent 26%),
      radial-gradient(circle at 50% 100%, rgba(255,255,255,0.06), transparent 32%),
      linear-gradient(180deg, #090909 0%, #050505 45%, #000000 100%);
  }

  .ambient-bg::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
    background-size: 54px 54px;
    mask-image: linear-gradient(to bottom, rgba(0,0,0,0.45), transparent 65%);
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    border-bottom: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.76);
    backdrop-filter: blur(22px);
  }

  .topbar-inner {
    width: min(1180px, calc(100% - 40px));
    margin: 0 auto;
    min-height: 76px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .brand,
  .logo-row {
    display: flex;
    align-items: center;
    gap: 12px;
    color: inherit;
    text-decoration: none;
  }

  .logo-mark {
    width: 42px;
    height: 42px;
    display: block;
    border-radius: 14px;
    background: #050505;
    object-fit: cover;
    box-shadow: 0 0 36px rgba(255,255,255,0.16);
  }

  .logo-title {
    margin: 0;
    font-size: 20px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -0.04em;
  }

  .logo-subtitle {
    margin: 5px 0 0;
    color: #7f7f7f;
    font-size: 12px;
    font-weight: 800;
  }

  .top-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .ghost-button,
  .primary-button,
  .secondary-button,
  .small-link-button,
  .remove-button,
  .tab-button {
    border: 0;
    font: inherit;
    text-decoration: none;
    cursor: pointer;
  }

  .ghost-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 42px;
    padding: 0 16px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.035);
    color: #e8e8e8;
    font-size: 14px;
    font-weight: 900;
    transition: transform 180ms ease, background 180ms ease, color 180ms ease, border-color 180ms ease;
  }

  .ghost-button:hover {
    transform: translateY(-1px);
    border-color: rgba(255,255,255,0.35);
    background: #ffffff;
    color: #000000;
  }

  .admin-profile-link,
  .admin-dashboard-button {
    box-shadow: 0 0 28px rgba(255,255,255,0.10);
  }

  .page-shell {
    position: relative;
    z-index: 1;
    width: min(1180px, calc(100% - 40px));
    margin: 0 auto;
    padding: 28px 0 56px;
  }

  .hero-grid {
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    gap: 20px;
    align-items: stretch;
  }

  .identity-card,
  .dashboard-card,
  .stat-card,
  .section-card,
  .tabs-card,
  .auth-card,
  .loading-card {
    border: 1px solid rgba(255,255,255,0.10);
    background:
      linear-gradient(145deg, rgba(28,28,28,0.82), rgba(8,8,8,0.92)),
      #0b0b0b;
    box-shadow: 0 30px 90px rgba(0,0,0,0.42);
  }

  .identity-card {
    min-height: 360px;
    padding: 22px;
    border-radius: 30px;
    backdrop-filter: blur(24px);
  }

  .avatar-row {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .avatar {
    width: 88px;
    height: 88px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 28px;
    background:
      linear-gradient(135deg, #ffffff 0%, #d8d8d8 100%);
    color: #000000;
    font-size: 34px;
    font-weight: 1000;
    letter-spacing: -0.08em;
    box-shadow:
      0 18px 48px rgba(255,255,255,0.10),
      inset 0 -10px 20px rgba(0,0,0,0.12);
  }

  .user-meta {
    min-width: 0;
  }

  .eyebrow {
    margin: 0;
    color: #858585;
    font-size: 12px;
    font-weight: 1000;
    letter-spacing: 0.36em;
    text-transform: uppercase;
  }

  .user-meta h1 {
    margin: 8px 0 0;
    max-width: 190px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 30px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -0.06em;
  }

  .user-meta p:last-child {
    margin: 8px 0 0;
    max-width: 190px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #8a8a8a;
    font-size: 13px;
    font-weight: 800;
  }

  .level-card {
    margin-top: 22px;
    padding: 18px;
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.46);
  }

  .level-top {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
  }

  .level-top p {
    margin: 0;
    color: #8a8a8a;
    font-size: 13px;
    font-weight: 900;
  }

  .level-top strong {
    display: block;
    margin-top: 6px;
    font-size: 32px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -0.06em;
  }

  .level-top span {
    max-width: 130px;
    padding: 8px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    color: #e5e5e5;
    font-size: 11px;
    line-height: 1.25;
    font-weight: 1000;
    text-align: center;
  }

  .progress-track,
  .genre-track {
    height: 8px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255,255,255,0.07);
  }

  .progress-track {
    margin-top: 18px;
  }

  .progress-fill,
  .genre-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #ffffff, #9e9e9e);
    box-shadow: 0 0 18px rgba(255,255,255,0.25);
  }

  .mini-stats {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .mini-stats div {
    padding: 14px 10px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.36);
    text-align: center;
  }

  .mini-stats strong {
    display: block;
    font-size: 24px;
    font-weight: 1000;
  }

  .mini-stats span {
    display: block;
    margin-top: 4px;
    color: #777777;
    font-size: 12px;
    font-weight: 900;
  }

  .dashboard-card {
    position: relative;
    min-height: 360px;
    overflow: hidden;
    border-radius: 30px;
    padding: 34px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 230px;
    gap: 24px;
    align-items: end;
  }

  .dashboard-card::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 18% 20%, rgba(255,255,255,0.10), transparent 28%),
      linear-gradient(135deg, rgba(255,255,255,0.06), transparent 38%);
    opacity: 0.9;
  }

  .dashboard-content,
  .featured-preview {
    position: relative;
    z-index: 1;
  }

  .dashboard-content h2 {
    margin: 18px 0 0;
    max-width: 660px;
    font-size: clamp(38px, 5vw, 68px);
    line-height: 0.94;
    font-weight: 1000;
    letter-spacing: -0.08em;
  }

  .dashboard-content p:not(.eyebrow) {
    margin: 22px 0 0;
    max-width: 640px;
    color: #b0b0b0;
    font-size: 16px;
    line-height: 1.75;
    font-weight: 650;
  }

  .dashboard-actions {
    margin-top: 26px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .primary-button,
  .secondary-button,
  .small-link-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-height: 48px;
    border-radius: 16px;
    padding: 0 20px;
    font-size: 14px;
    font-weight: 1000;
    transition: transform 180ms ease, background 180ms ease, color 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
  }

  .primary-button {
    background: #ffffff;
    color: #000000;
    border: 1px solid #ffffff;
  }

  .primary-button:hover {
    transform: translateY(-2px);
    background: #000000;
    color: #ffffff;
    box-shadow: 0 0 28px rgba(255,255,255,0.16);
  }

  .secondary-button {
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.38);
    color: #ededed;
  }

  .secondary-button:hover {
    transform: translateY(-2px);
    border-color: rgba(255,255,255,0.32);
    background: rgba(255,255,255,0.08);
  }

  .featured-preview {
    align-self: stretch;
    padding: 0;
    text-align: left;
    font: inherit;
    color: inherit;
    cursor: pointer;
    border-radius: 26px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.12);
    background: #000000;
    min-height: 300px;
  }

  .featured-preview img {
    width: 100%;
    height: 210px;
    object-fit: cover;
    display: block;
    opacity: 0.88;
  }

  .featured-preview div {
    padding: 16px;
  }

  .featured-preview span {
    color: #8d8d8d;
    font-size: 11px;
    font-weight: 1000;
    text-transform: uppercase;
    letter-spacing: 0.22em;
  }

  .featured-preview strong {
    display: block;
    margin-top: 8px;
    font-size: 18px;
    line-height: 1.1;
    font-weight: 1000;
  }

  .featured-preview p {
    margin: 7px 0 0;
    color: #888888;
    font-size: 13px;
    font-weight: 800;
  }

  .stats-grid {
    margin-top: 20px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }

  .stat-card {
    position: relative;
    overflow: hidden;
    border-radius: 26px;
    padding: 20px;
    min-height: 170px;
    transition: transform 220ms ease, border-color 220ms ease, background 220ms ease;
  }

  .stat-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255,255,255,0.26);
    background:
      linear-gradient(145deg, rgba(36,36,36,0.92), rgba(8,8,8,0.95)),
      #0b0b0b;
  }

  .stat-icon {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    background: rgba(255,255,255,0.08);
    color: #ffffff;
  }

  .stat-title {
    margin: 16px 0 0;
    color: #8e8e8e;
    font-size: 13px;
    font-weight: 1000;
  }

  .stat-value {
    margin: 8px 0 0;
    font-size: 38px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -0.06em;
  }

  .stat-text {
    margin: 10px 0 0;
    color: #747474;
    font-size: 13px;
    line-height: 1.55;
    font-weight: 700;
  }

  .tabs-card {
    position: sticky;
    top: 92px;
    z-index: 20;
    margin-top: 20px;
    padding: 8px;
    border-radius: 22px;
    display: flex;
    gap: 8px;
    backdrop-filter: blur(22px);
  }

  .tab-button {
    flex: 1;
    min-height: 46px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 16px;
    background: transparent;
    color: #8c8c8c;
    font-size: 14px;
    font-weight: 1000;
    transition: background 180ms ease, color 180ms ease, transform 180ms ease;
  }

  .tab-button:hover {
    color: #ffffff;
    background: rgba(255,255,255,0.06);
  }

  .tab-button-active {
    background: #ffffff;
    color: #000000;
    box-shadow: 0 12px 36px rgba(255,255,255,0.10);
  }

  .tab-button-active:hover {
    color: #000000;
    background: #ffffff;
  }


  .sort-card {
    margin-top: 14px;
    padding: 12px;
    border-radius: 22px;
    border: 1px solid rgba(255,255,255,0.10);
    background:
      linear-gradient(145deg, rgba(24,24,24,0.82), rgba(7,7,7,0.92)),
      #0b0b0b;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.30);
    backdrop-filter: blur(20px);
  }

  .sort-card strong {
    display: block;
    margin-top: 4px;
    font-size: 15px;
    font-weight: 1000;
  }

  .sort-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  .sort-button {
    min-height: 38px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 999px;
    background: rgba(255,255,255,0.035);
    color: #b8b8b8;
    padding: 0 14px;
    font: inherit;
    font-size: 12px;
    font-weight: 1000;
    cursor: pointer;
    transition: background 180ms ease, color 180ms ease, border-color 180ms ease, transform 180ms ease;
  }

  .sort-button:hover {
    transform: translateY(-1px);
    border-color: rgba(255,255,255,0.28);
    color: #ffffff;
    background: rgba(255,255,255,0.075);
  }

  .sort-button-active,
  .sort-button-active:hover {
    background: #ffffff;
    color: #000000;
    border-color: #ffffff;
    box-shadow: 0 12px 32px rgba(255,255,255,0.10);
  }

  .content-grid {
    min-width: 0;
    margin-top: 20px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 20px;
  }

  .content-grid .section-card:last-child {
    grid-column: 1 / -1;
  }

  .section-card {
    min-width: 0;
    overflow: hidden;
    border-radius: 30px;
    padding: 24px;
  }

  .section-head {
    margin-bottom: 20px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }

  .section-head h2 {
    margin: 8px 0 0;
    font-size: 28px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -0.05em;
  }

  .count-pill {
    min-width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.36);
    font-size: 14px;
    font-weight: 1000;
  }

  .movie-rail {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    display: flex;
    gap: 14px;
    overflow-x: auto;
    padding: 2px 2px 12px;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }

  .movie-rail::-webkit-scrollbar {
    display: none;
  }

  .movie-card {
    flex: 0 0 190px;
    min-width: 0;
    scroll-snap-align: start;
    overflow: hidden;
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.10);
    background: #090909;
    transition: transform 220ms ease, border-color 220ms ease, background 220ms ease;
  }

  .movie-card:hover {
    transform: translateY(-5px) scale(1.015);
    border-color: rgba(255,255,255,0.30);
    background: #111111;
  }

  .movie-card-main {
    width: 100%;
    display: block;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .movie-card-main:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: -2px;
  }

  .movie-poster-wrap {
    position: relative;
    aspect-ratio: 2 / 3;
    overflow: hidden;
    background: #111111;
  }

  .movie-poster {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    opacity: 0.92;
    transition: transform 500ms ease, opacity 500ms ease;
  }

  .movie-card:hover .movie-poster {
    transform: scale(1.06);
    opacity: 1;
  }

  .poster-shade {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(to top, rgba(0,0,0,0.96), rgba(0,0,0,0.12) 58%, rgba(0,0,0,0.18));
  }

  .movie-badge,
  .movie-rating {
    position: absolute;
    top: 10px;
    z-index: 2;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 1000;
  }

  .movie-badge {
    left: 10px;
    padding: 6px 9px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(0,0,0,0.70);
    color: #ffffff;
    backdrop-filter: blur(10px);
  }

  .movie-rating {
    right: 10px;
    padding: 6px 8px;
    background: #ffffff;
    color: #000000;
  }

  .movie-title-block {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 2;
  }

  .movie-title-block h3 {
    margin: 0;
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    font-size: 16px;
    line-height: 1.08;
    font-weight: 1000;
    letter-spacing: -0.04em;
  }

  .movie-title-block p {
    margin: 7px 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #a5a5a5;
    font-size: 12px;
    font-weight: 800;
  }

  .movie-info {
    padding: 12px;
  }

  .movie-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .movie-tags span {
    padding: 6px 8px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.10);
    color: #bdbdbd;
    font-size: 11px;
    font-weight: 900;
  }

  .remove-button {
    width: calc(100% - 24px);
    min-height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin: 0 12px 12px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    color: #d7d7d7;
    font-size: 13px;
    font-weight: 1000;
    transition: background 180ms ease, color 180ms ease, border-color 180ms ease;
  }

  .remove-button:hover {
    border-color: #ffffff;
    background: #ffffff;
    color: #000000;
  }

  .empty-state {
    min-height: 250px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 12px;
    padding: 28px;
    border-radius: 24px;
    border: 1px dashed rgba(255,255,255,0.15);
    background: rgba(0,0,0,0.34);
    text-align: center;
  }

  .empty-icon {
    width: 54px;
    height: 54px;
    display: grid;
    place-items: center;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
    color: #ffffff;
  }

  .empty-state h3 {
    margin: 0;
    font-size: 22px;
    font-weight: 1000;
    letter-spacing: -0.04em;
  }

  .empty-state p {
    max-width: 460px;
    margin: 0;
    color: #8a8a8a;
    font-size: 14px;
    line-height: 1.7;
    font-weight: 700;
  }

  .small-link-button {
    min-height: 40px;
    margin-top: 4px;
    padding: 0 15px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
    color: #ffffff;
  }

  .small-link-button:hover {
    background: #ffffff;
    color: #000000;
  }

  .genre-list {
    display: grid;
    gap: 16px;
  }

  .genre-row div:first-child {
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: #d7d7d7;
    font-size: 14px;
    font-weight: 900;
  }

  .genre-row strong {
    color: #ffffff;
  }

  .soft-card {
    margin-top: 16px;
    padding: 18px;
    border-radius: 22px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.36);
  }

  .soft-card:first-child {
    margin-top: 0;
  }

  .soft-card h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 1000;
  }

  .soft-card p {
    margin: 10px 0 0;
    color: #8d8d8d;
    font-size: 14px;
    line-height: 1.65;
    font-weight: 700;
  }

  .full-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 16px;
  }

  .full-grid .movie-card {
    flex-basis: auto;
  }

  .full-grid .empty-state {
    grid-column: 1 / -1;
  }

  .reactions-grid {
    min-width: 0;
    align-items: start;
    margin-top: 20px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .footer {
    position: relative;
    z-index: 1;
    border-top: 1px solid rgba(255,255,255,0.10);
    padding: 26px 20px;
    display: flex;
    justify-content: center;
  }

  .footer p,
  .footer a {
    margin: 0;
    color: #747474;
    font-size: 13px;
    font-weight: 800;
  }

  .footer {
    gap: 20px;
  }

  .footer a {
    color: #d7d7d7;
    text-decoration: none;
    transition: color 180ms ease;
  }

  .footer a:hover {
    color: #ffffff;
  }



  .details-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
    background: rgba(0,0,0,0.78);
    backdrop-filter: blur(18px);
  }

  .details-overlay-open {
    animation: modalOverlayOpen 180ms ease-out both;
  }

  .details-overlay-close {
    animation: modalOverlayClose 160ms ease-in both;
  }

  .details-modal {
    position: relative;
    width: min(1040px, 100%);
    max-height: min(88vh, 860px);
    overflow: hidden;
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    border-radius: 30px;
    border: 1px solid rgba(255,255,255,0.12);
    background:
      radial-gradient(circle at 78% 12%, rgba(255,255,255,0.10), transparent 30%),
      linear-gradient(145deg, rgba(30,30,30,0.98), rgba(5,5,5,0.98));
    box-shadow: 0 40px 120px rgba(0,0,0,0.75);
  }

  .details-modal-open {
    animation: modalWindowOpen 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .details-modal-close {
    animation: modalWindowClose 160ms ease-in both;
  }

  .details-close {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 5;
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 999px;
    background: rgba(0,0,0,0.72);
    color: #ffffff;
    cursor: pointer;
    transition: background 180ms ease, color 180ms ease, transform 180ms ease;
  }

  .details-close:hover {
    transform: scale(1.04);
    background: #ffffff;
    color: #000000;
  }

  .details-poster-side {
    position: relative;
    min-height: 560px;
    background: #0b0b0b;
  }

  .details-poster-side img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .details-poster-shadow {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(to top, rgba(0,0,0,0.92), transparent 46%),
      linear-gradient(to right, transparent, rgba(0,0,0,0.30));
  }

  .details-content-side {
    min-width: 0;
    overflow-y: auto;
    padding: 38px;
  }

  .details-content-side h2 {
    margin: 14px 0 0;
    max-width: 620px;
    font-size: clamp(36px, 5vw, 64px);
    line-height: 0.95;
    font-weight: 1000;
    letter-spacing: -0.08em;
  }

  .details-original-title {
    margin: 12px 0 0;
    color: #9a9a9a;
    font-size: 18px;
    font-weight: 900;
  }

  .details-meta-row {
    margin-top: 20px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .details-meta-row span {
    display: inline-flex;
    align-items: center;
    min-height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.32);
    color: #d4d4d4;
    font-size: 13px;
    font-weight: 900;
  }

  .details-meta-row .details-rating {
    border-color: #ffffff;
    background: #ffffff;
    color: #000000;
  }

  .details-description {
    margin: 24px 0 0;
    max-width: 690px;
    color: #c7c7c7;
    font-size: 17px;
    line-height: 1.8;
    font-weight: 650;
  }

  .details-actions {
    margin-top: 26px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .modal-action,
  .trailer-toggle {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 15px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
    color: #f2f2f2;
    padding: 0 15px;
    font: inherit;
    font-size: 13px;
    font-weight: 1000;
    cursor: pointer;
    transition: background 180ms ease, color 180ms ease, border-color 180ms ease, transform 180ms ease;
  }

  .modal-action:hover,
  .trailer-toggle:hover {
    transform: translateY(-1px);
    border-color: rgba(255,255,255,0.35);
    background: rgba(255,255,255,0.10);
  }

  .modal-action.active,
  .trailer-toggle {
    border-color: #ffffff;
    background: #ffffff;
    color: #000000;
  }

  .trailer-block {
    margin-top: 24px;
  }

  .trailer-frame-wrap {
    margin-top: 14px;
    overflow: hidden;
    border-radius: 22px;
    border: 1px solid rgba(255,255,255,0.12);
    background: #000000;
    aspect-ratio: 16 / 9;
  }

  .trailer-frame-wrap iframe {
    width: 100%;
    height: 100%;
    display: block;
    border: 0;
  }

  .details-note {
    margin: 18px 0 0;
    color: #777777;
    font-size: 13px;
    line-height: 1.65;
    font-weight: 750;
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
      transform: translateY(10px) scale(0.98);
    }
  }

  .loading-screen,
  .auth-screen {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
  }

  .loading-card,
  .auth-card {
    width: min(680px, 100%);
    border-radius: 30px;
    padding: 30px;
  }

  .loading-card {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .loading-card p {
    margin: 0;
    font-size: 18px;
    font-weight: 1000;
  }

  .loading-logo {
    width: 48px;
    height: 48px;
    display: block;
    border-radius: 16px;
    background: #050505;
    object-fit: cover;
  }

  .auth-card h1 {
    margin: 28px 0 0;
    max-width: 560px;
    font-size: clamp(42px, 7vw, 72px);
    line-height: 0.94;
    font-weight: 1000;
    letter-spacing: -0.08em;
  }

  .auth-card .eyebrow {
    margin-top: 40px;
  }

  .auth-text {
    margin: 22px 0 0;
    max-width: 560px;
    color: #a5a5a5;
    font-size: 16px;
    line-height: 1.75;
    font-weight: 700;
  }

  .auth-card-compact {
    width: min(540px, 100%);
  }

  .auth-title {
    max-width: none;
  }

  .auth-eyebrow {
    margin-top: 34px;
  }

  .auth-text-compact {
    max-width: 440px;
  }

  .profile-auth-form {
    margin-top: 26px;
    display: grid;
    gap: 16px;
  }

  .profile-auth-field {
    display: grid;
    gap: 9px;
  }

  .profile-auth-field span {
    color: #b8b8b8;
    font-size: 14px;
    font-weight: 900;
  }

  .profile-auth-field input {
    width: 100%;
    height: 54px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 16px;
    background: rgba(0,0,0,0.62);
    color: #ffffff;
    padding: 0 18px;
    font: inherit;
    font-size: 16px;
    font-weight: 750;
    outline: none;
    transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
  }

  .profile-auth-field input::placeholder {
    color: #555555;
  }

  .profile-auth-field input:focus {
    border-color: rgba(255,255,255,0.38);
    background: #000000;
    box-shadow: 0 0 0 4px rgba(255,255,255,0.055);
  }

  .auth-message {
    border-radius: 16px;
    padding: 13px 15px;
    font-size: 13px;
    line-height: 1.55;
    font-weight: 850;
  }

  .auth-error {
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.06);
    color: #ffffff;
  }

  .auth-notice {
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.10);
    color: #eeeeee;
  }

  .auth-submit-button {
    width: 100%;
    min-height: 56px;
    border-radius: 16px;
    font-size: 16px;
  }

  .auth-submit-button:disabled {
    cursor: wait;
    opacity: 0.72;
    transform: none;
  }

  .auth-switch-row {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.10);
  }

  .auth-switch-row button {
    padding: 0;
    border: 0;
    background: transparent;
    color: #dddddd;
    font: inherit;
    font-size: 14px;
    font-weight: 1000;
    text-align: left;
    cursor: pointer;
    transition: color 180ms ease;
  }

  .auth-switch-row button:hover {
    color: #ffffff;
  }

  .auth-back-button {
    width: 100%;
    margin-top: 16px;
  }

  .auth-small-note {
    margin: 18px 0 0;
    color: #636363;
    font-size: 13px;
    line-height: 1.7;
    font-weight: 700;
  }

  .auth-card .primary-button {
    margin-top: 26px;
  }

  .animate-in {
    animation: fadeUp 560ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .delay-1 {
    animation-delay: 90ms;
  }

  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(18px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 860px) {
    .details-modal {
      grid-template-columns: 1fr;
      overflow-y: auto;
    }

    .details-poster-side {
      min-height: 360px;
      max-height: 420px;
    }

    .details-content-side {
      overflow: visible;
      padding: 24px;
    }
  }

  @media (max-width: 1050px) {
    .hero-grid,
    .content-grid,
    .reactions-grid {
      grid-template-columns: 1fr;
    }

    .content-grid .section-card:last-child {
      grid-column: auto;
    }

    .dashboard-card {
      grid-template-columns: 1fr;
    }

    .featured-preview {
      display: none;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 680px) {
    .topbar-inner,
    .page-shell {
      width: min(100% - 24px, 1180px);
    }

    .topbar-inner {
      min-height: 70px;
    }

    .logo-title {
      font-size: 18px;
    }

    .logo-subtitle {
      display: none;
    }

    .top-actions {
      gap: 8px;
    }

    .ghost-button {
      min-height: 38px;
      padding: 0 12px;
      font-size: 12px;
    }

    .hero-grid {
      gap: 14px;
    }

    .identity-card,
    .dashboard-card,
    .section-card {
      border-radius: 24px;
      padding: 18px;
    }

    .avatar-row {
      align-items: flex-start;
    }

    .avatar {
      width: 70px;
      height: 70px;
      border-radius: 22px;
      font-size: 26px;
    }

    .user-meta h1 {
      max-width: 210px;
      font-size: 26px;
    }

    .user-meta p:last-child {
      max-width: 210px;
    }

    .dashboard-content h2 {
      font-size: 42px;
    }

    .dashboard-content p:not(.eyebrow) {
      font-size: 14px;
    }

    .dashboard-actions {
      flex-direction: column;
    }

    .primary-button,
    .secondary-button {
      width: 100%;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .tabs-card {
      top: 78px;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .tabs-card::-webkit-scrollbar {
      display: none;
    }

    .tab-button {
      flex: 0 0 auto;
      padding: 0 16px;
    }

    .movie-card {
      flex-basis: 168px;
    }

    .full-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .full-grid .movie-card {
      min-width: 0;
    }

    .footer {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  /* KinoLuma mobile polish: profile page */
  @media (hover: none) and (pointer: coarse) {
    .ghost-button:hover,
    .primary-button:hover,
    .secondary-button:hover,
    .movie-card:hover,
    .stat-card:hover,
    .remove-button:hover,
    .modal-action:hover,
    .trailer-toggle:hover,
    .details-close:hover {
      transform: none;
    }
  }

  @supports (min-height: 100svh) {
    .profile-page {
      min-height: 100svh;
    }

    .loading-screen,
    .auth-screen {
      min-height: 100svh;
    }
  }

  @media (max-width: 760px) {
    .ambient-bg {
      background:
        radial-gradient(circle at 24% 0%, rgba(255,255,255,0.12), transparent 30%),
        radial-gradient(circle at 100% 14%, rgba(255,255,255,0.07), transparent 28%),
        linear-gradient(180deg, #090909 0%, #040404 52%, #000000 100%);
    }

    .ambient-bg::after {
      background-size: 38px 38px;
      opacity: 0.55;
    }

    .topbar {
      background: rgba(0,0,0,0.84);
      backdrop-filter: blur(18px);
    }

    .topbar-inner,
    .page-shell {
      width: min(100% - 20px, 1180px);
    }

    .topbar-inner {
      min-height: 66px;
      gap: 10px;
    }

    .brand,
    .logo-row {
      min-width: 0;
      gap: 10px;
    }

    .logo-mark {
      width: 38px;
      height: 38px;
      border-radius: 13px;
      box-shadow: 0 0 28px rgba(255,255,255,0.14);
    }

    .logo-title {
      max-width: 116px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 18px;
    }

    .logo-subtitle {
      display: none;
    }

    .top-actions {
      flex: 0 0 auto;
      gap: 7px;
    }

    .ghost-button {
      min-height: 38px;
      border-radius: 13px;
      padding: 0 11px;
      font-size: 12px;
    }

    .page-shell {
      padding: 18px 0 42px;
    }

    .hero-grid {
      gap: 12px;
    }

    .identity-card,
    .dashboard-card,
    .section-card,
    .stat-card,
    .tabs-card,
    .auth-card,
    .loading-card {
      box-shadow: 0 18px 54px rgba(0,0,0,0.45);
    }

    .identity-card,
    .dashboard-card,
    .section-card {
      border-radius: 24px;
      padding: 17px;
    }

    .identity-card {
      min-height: auto;
    }

    .avatar-row {
      align-items: center;
      gap: 13px;
    }

    .avatar {
      width: 66px;
      height: 66px;
      border-radius: 22px;
      font-size: 25px;
    }

    .eyebrow {
      font-size: 10px;
      letter-spacing: 0.28em;
    }

    .user-meta h1 {
      max-width: min(58vw, 260px);
      font-size: 26px;
      line-height: 0.98;
    }

    .user-meta p:last-child {
      max-width: min(58vw, 260px);
      font-size: 12px;
    }

    .level-card {
      margin-top: 16px;
      padding: 15px;
      border-radius: 20px;
    }

    .level-top {
      gap: 10px;
    }

    .level-top strong {
      font-size: 30px;
    }

    .level-top span {
      max-width: 118px;
      padding: 7px 9px;
      font-size: 10px;
    }

    .mini-stats {
      gap: 8px;
    }

    .mini-stats div {
      padding: 11px 7px;
      border-radius: 17px;
    }

    .mini-stats strong {
      font-size: 20px;
    }

    .mini-stats span {
      font-size: 10px;
    }

    .dashboard-card {
      min-height: auto;
      align-items: start;
      overflow: hidden;
    }

    .dashboard-content h2 {
      margin-top: 14px;
      font-size: clamp(34px, 12vw, 48px);
      line-height: 0.94;
      letter-spacing: -0.075em;
    }

    .dashboard-content p:not(.eyebrow) {
      margin-top: 16px;
      font-size: 14px;
      line-height: 1.65;
    }

    .dashboard-actions {
      margin-top: 20px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .primary-button,
    .secondary-button,
    .small-link-button {
      width: 100%;
      min-height: 46px;
      border-radius: 15px;
      padding: 0 15px;
      font-size: 13px;
    }

    .stats-grid {
      margin-top: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .stat-card {
      min-height: 132px;
      border-radius: 22px;
      padding: 15px;
    }

    .stat-icon {
      width: 34px;
      height: 34px;
      border-radius: 12px;
      font-size: 18px;
    }

    .stat-title {
      margin-top: 13px;
      font-size: 12px;
    }

    .stat-value {
      font-size: 31px;
    }

    .stat-text {
      margin-top: 7px;
      font-size: 11px;
      line-height: 1.45;
    }

    .tabs-card {
      top: 66px;
      margin-top: 12px;
      margin-left: -10px;
      margin-right: -10px;
      padding: 8px 10px;
      border-left: 0;
      border-right: 0;
      border-radius: 0;
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scrollbar-width: none;
      scroll-snap-type: x proximity;
    }

    .tabs-card::-webkit-scrollbar {
      display: none;
    }

    .tab-button {
      flex: 0 0 auto;
      min-height: 42px;
      border-radius: 14px;
      padding: 0 14px;
      font-size: 12px;
      scroll-snap-align: start;
      white-space: nowrap;
    }

    .content-grid,
    .reactions-grid {
      margin-top: 14px;
      gap: 12px;
    }

    .section-card {
      overflow: hidden;
    }

    .section-head {
      margin-bottom: 15px;
      align-items: flex-start;
      gap: 12px;
    }

    .section-head h2 {
      font-size: 24px;
      line-height: 0.98;
    }

    .count-pill {
      min-width: 36px;
      height: 36px;
      font-size: 12px;
    }

    .movie-rail {
      margin-left: -4px;
      margin-right: -4px;
      gap: 10px;
      padding: 2px 4px 12px;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
    }

    .movie-card {
      flex: 0 0 158px;
      border-radius: 20px;
    }

    .movie-title-block {
      left: 10px;
      right: 10px;
      bottom: 10px;
    }

    .movie-title-block h3 {
      font-size: 14px;
      line-height: 1.08;
    }

    .movie-title-block p {
      margin-top: 5px;
      font-size: 11px;
    }

    .movie-badge,
    .movie-rating {
      top: 8px;
      font-size: 10px;
    }

    .movie-badge {
      left: 8px;
      padding: 5px 7px;
    }

    .movie-rating {
      right: 8px;
      padding: 5px 7px;
    }

    .movie-info {
      padding: 10px;
    }

    .movie-tags {
      gap: 5px;
    }

    .movie-tags span {
      padding: 5px 7px;
      font-size: 10px;
    }

    .remove-button {
      width: calc(100% - 20px);
      min-height: 36px;
      margin: 0 10px 10px;
      border-radius: 13px;
      font-size: 12px;
    }

    .full-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .full-grid .movie-card {
      width: 100%;
      flex-basis: auto;
    }

    .empty-state {
      min-height: 210px;
      border-radius: 22px;
      padding: 22px 16px;
    }

    .empty-icon {
      width: 48px;
      height: 48px;
      border-radius: 16px;
      font-size: 21px;
    }

    .empty-state h3 {
      font-size: 20px;
    }

    .empty-state p {
      font-size: 13px;
      line-height: 1.6;
    }

    .genre-list {
      gap: 13px;
    }

    .soft-card {
      border-radius: 20px;
      padding: 15px;
    }

    .footer {
      padding: 22px 10px calc(22px + env(safe-area-inset-bottom));
      gap: 8px;
      align-items: flex-start;
    }

    .details-overlay {
      align-items: flex-end;
      padding: 0;
      background: rgba(0,0,0,0.82);
      backdrop-filter: blur(16px);
    }

    .details-modal {
      width: 100%;
      max-height: min(92svh, 820px);
      overflow-y: auto;
      grid-template-columns: 1fr;
      border-right: 0;
      border-left: 0;
      border-bottom: 0;
      border-radius: 28px 28px 0 0;
      box-shadow: 0 -28px 90px rgba(0,0,0,0.72);
    }

    .details-close {
      top: 12px;
      right: 12px;
      width: 40px;
      height: 40px;
      border-radius: 15px;
      background: rgba(0,0,0,0.72);
      font-size: 24px;
    }

    .details-poster-side {
      min-height: 230px;
      max-height: 270px;
    }

    .details-poster-shadow {
      background:
        linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.24)),
        linear-gradient(to right, rgba(0,0,0,0.18), transparent);
    }

    .details-content-side {
      overflow: visible;
      padding: 22px 16px calc(24px + env(safe-area-inset-bottom));
    }

    .details-content-side h2 {
      margin-top: 12px;
      font-size: clamp(32px, 11vw, 46px);
      line-height: 0.96;
      letter-spacing: -0.075em;
    }

    .details-original-title {
      margin-top: 10px;
      font-size: 15px;
    }

    .details-meta-row {
      margin-top: 16px;
      gap: 7px;
    }

    .details-meta-row span {
      min-height: 32px;
      padding: 0 10px;
      font-size: 12px;
    }

    .details-description {
      margin-top: 18px;
      font-size: 14px;
      line-height: 1.7;
    }

    .details-actions {
      margin-top: 20px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 9px;
    }

    .modal-action,
    .trailer-toggle {
      min-height: 43px;
      border-radius: 14px;
      padding: 0 11px;
      font-size: 12px;
    }

    .modal-action:first-child {
      grid-column: 1 / -1;
    }

    .trailer-block {
      margin-top: 20px;
    }

    .trailer-toggle {
      width: 100%;
    }

    .trailer-frame-wrap {
      margin-top: 12px;
      border-radius: 18px;
    }

    .details-note {
      font-size: 12px;
      line-height: 1.6;
    }

    .loading-screen,
    .auth-screen {
      padding: 14px;
    }

    .loading-card,
    .auth-card {
      border-radius: 24px;
      padding: 20px;
    }

    .loading-card {
      align-items: flex-start;
    }

    .loading-logo {
      width: 42px;
      height: 42px;
      border-radius: 14px;
    }

    .auth-card h1 {
      margin-top: 24px;
      font-size: clamp(38px, 13vw, 56px);
      line-height: 0.95;
    }

    .auth-card .eyebrow {
      margin-top: 28px;
    }

    .auth-text {
      margin-top: 16px;
      font-size: 14px;
      line-height: 1.65;
    }


    .auth-card-compact {
      padding: 28px;
    }

    .auth-title {
      font-size: clamp(34px, 12vw, 48px);
      line-height: 0.98;
    }

    .profile-auth-form {
      margin-top: 22px;
      gap: 15px;
    }

    .profile-auth-field input {
      height: 52px;
      border-radius: 15px;
      font-size: 15px;
    }

    .auth-submit-button {
      min-height: 54px;
      font-size: 15px;
    }
  }

  @media (max-width: 430px) {
    .topbar-inner,
    .page-shell {
      width: min(100% - 16px, 1180px);
    }

    .logo-title {
      max-width: 98px;
    }

    .ghost-button {
      padding: 0 9px;
      font-size: 11px;
    }

    .identity-card,
    .dashboard-card,
    .section-card {
      padding: 15px;
      border-radius: 22px;
    }

    .avatar {
      width: 60px;
      height: 60px;
      border-radius: 20px;
      font-size: 23px;
    }

    .user-meta h1,
    .user-meta p:last-child {
      max-width: 55vw;
    }

    .dashboard-content h2 {
      font-size: clamp(32px, 13vw, 44px);
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .stat-card {
      min-height: 118px;
    }

    .tabs-card {
      top: 64px;
      margin-left: -8px;
      margin-right: -8px;
      padding-left: 8px;
      padding-right: 8px;
    }

    .tab-button {
      padding: 0 12px;
    }

    .movie-card {
      flex-basis: 148px;
    }

    .full-grid {
      gap: 9px;
    }

    .full-grid .movie-title-block h3 {
      font-size: 13px;
    }

    .details-modal {
      border-radius: 24px 24px 0 0;
    }

    .details-poster-side {
      min-height: 210px;
      max-height: 240px;
    }

    .details-content-side {
      padding-left: 14px;
      padding-right: 14px;
    }

    .details-actions {
      grid-template-columns: 1fr;
    }

    .modal-action:first-child {
      grid-column: auto;
    }
  }

  @media (max-width: 760px) {
    .profile-page-with-mobile-nav {
      padding-bottom: calc(92px + env(safe-area-inset-bottom));
    }
  }



  @media (max-width: 760px) {
    .sort-card {
      align-items: flex-start;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
      border-radius: 20px;
    }

    .sort-actions {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 7px;
    }

    .sort-button {
      min-height: 36px;
      padding: 0 8px;
      font-size: 11px;
    }
  }

`;
