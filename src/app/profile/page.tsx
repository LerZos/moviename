"use client";

import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Bookmark,
  ChevronRight,
  Eye,
  Heart,
  LogOut,
  ShieldCheck,
  ThumbsDown,
  Trash2,
  X,
} from "lucide-react";

import "./profile.css";
import MobileBottomNav from "../components/MobileBottomNav";
import Dialog from "../components/ui/Dialog";
import EmptyState from "../components/ui/EmptyState";
import MediaCard, { type MediaCardItem } from "../components/ui/MediaCard";
import MovieInfoDialog, { type MovieInfoListKey } from "../components/ui/MovieInfoDialog";
import SiteHeader from "../components/ui/SiteHeader";
import {
  profileCatalogItems as catalogItems,
  type ProfileCatalogItem,
} from "../data/profileCatalogItems";
import { getHomeCatalogPath, getHomeGenreSlug } from "../lib/home/homeCatalogRoutes";
import { supabase } from "../lib/supabase";
import {
  clearMovieActions,
  emptyMovieActionState,
  getCurrentSupabaseUser,
  loadMovieActions,
  mapSupabaseUser,
  type MovieActionState,
  removeCurrentUserFromStorage,
  saveCurrentUserToStorage,
  syncMovieAction,
} from "../lib/kinolumaSupabase";

type CatalogItem = ProfileCatalogItem;

type CurrentUser = {
  id: string;
  name: string;
  email: string;
};

type ListKey = MovieInfoListKey;
type ListIds = Record<ListKey, number[]>;
type ProfileTab = "overview" | "watching" | "watchLater" | "liked" | "disliked" | "settings";
type ProfileSort = "recent" | "rating" | "year" | "title";
type AuthMode = "login" | "register";

type ProfileToast = {
  id: number;
  tone: "success" | "error";
  text: string;
  undo?: () => void;
};

const PROFILE_LOAD_TIMEOUT_MS = 4500;
const EDITORIAL_IDS = [1, 3, 20, 21, 24, 28];
const PROFILE_TABS: ProfileTab[] = ["overview", "watching", "watchLater", "liked", "disliked", "settings"];
const LIST_KEYS: ListKey[] = ["watching", "watch_later", "liked", "disliked"];

// Same localStorage keys the movie page and home page already use.
const STORAGE_KEYS: Record<ListKey, string> = {
  watching: "kinoluma-watching-items",
  watch_later: "kinoluma-watch-later",
  liked: "kinoluma-liked-items",
  disliked: "kinoluma-disliked-items",
};

const LISTS: Record<
  ListKey,
  {
    tab: ProfileTab;
    title: string;
    inLabel: string;
    removeLabel: string;
    icon: (size: number) => ReactNode;
    empty: { title: string; text: string };
  }
> = {
  watching: {
    tab: "watching",
    title: "Смотрю",
    inLabel: "«Смотрю»",
    removeLabel: "Убрать из «Смотрю»",
    icon: (size) => <Eye size={size} aria-hidden="true" />,
    empty: {
      title: "Сейчас ничего не смотрите",
      text: "Отметьте «Смотрю» на странице фильма или сериала — он появится здесь, чтобы быстро вернуться к просмотру.",
    },
  },
  watch_later: {
    tab: "watchLater",
    title: "Смотреть позже",
    inLabel: "«Смотреть позже»",
    removeLabel: "Убрать из «Смотреть позже»",
    icon: (size) => <Bookmark size={size} aria-hidden="true" />,
    empty: {
      title: "Список пока пуст",
      text: "Сохраняйте фильмы кнопкой «Смотреть позже», чтобы вернуться к ним в удобный вечер.",
    },
  },
  liked: {
    tab: "liked",
    title: "Избранное",
    inLabel: "«Избранное»",
    removeLabel: "Убрать из избранного",
    icon: (size) => <Heart size={size} aria-hidden="true" />,
    empty: {
      title: "В избранном пусто",
      text: "Отмечайте сердцем фильмы и сериалы, которые понравились, — здесь соберётся ваша коллекция.",
    },
  },
  disliked: {
    tab: "disliked",
    title: "Не понравилось",
    inLabel: "«Не понравилось»",
    removeLabel: "Убрать отметку «Не понравилось»",
    icon: (size) => <ThumbsDown size={size} aria-hidden="true" />,
    empty: {
      title: "Здесь пусто",
      text: "Тайтлы с отметкой «Не нравится» появятся здесь — отметку легко снять одним нажатием.",
    },
  },
};

const TAB_TO_LIST: Partial<Record<ProfileTab, ListKey>> = {
  watching: "watching",
  watchLater: "watch_later",
  liked: "liked",
  disliked: "disliked",
};

const emptyIds: ListIds = { watching: [], watch_later: [], liked: [], disliked: [] };

const catalogById = new Map(catalogItems.map((item) => [item.id, item]));

function waitForProfileFallback<T>(ms: number, value: T) {
  return new Promise<T>((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "K";
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(6, local.length - 2)))}@${domain}`;
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

function writeNumberArrayToStorage(key: string, ids: number[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Storage can be unavailable (private mode); Supabase stays the source of truth.
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

function loadLocalIds(): ListIds {
  return {
    watching: readNumberArrayFromStorage(STORAGE_KEYS.watching),
    watch_later: readNumberArrayFromStorage(STORAGE_KEYS.watch_later),
    liked: readNumberArrayFromStorage(STORAGE_KEYS.liked),
    disliked: readNumberArrayFromStorage(STORAGE_KEYS.disliked),
  };
}

function toIds(state: MovieActionState): ListIds {
  return {
    watching: state.watchingItemIds,
    watch_later: state.watchLaterIds,
    liked: state.likedItemIds,
    disliked: state.dislikedItemIds,
  };
}

function getItemsByIds(ids: number[]) {
  return ids
    .map((id) => catalogById.get(id))
    .filter((item): item is CatalogItem => Boolean(item));
}

function getYearValue(item: CatalogItem) {
  const year = Number.parseInt(item.year, 10);
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
      return sortedItems.sort((first, second) => first.title.localeCompare(second.title, "ru"));

    case "recent":
    default:
      return sortedItems.reverse();
  }
}

function readTabFromUrl(): ProfileTab {
  const value = new URLSearchParams(window.location.search).get("tab");
  return PROFILE_TABS.includes(value as ProfileTab) ? (value as ProfileTab) : "overview";
}

function withId(ids: number[], id: number) {
  return ids.includes(id) ? ids : [...ids, id];
}

function withoutId(ids: number[], id: number) {
  return ids.filter((currentId) => currentId !== id);
}

function ProfileSkeleton() {
  return (
    <div className="klp-shell" aria-busy="true" aria-label="Загрузка профиля">
      <div className="kl-container">
        <div className="klp-head">
          <span className="klp-avatar kl-skeleton" />
          <div className="klp-head-text">
            <span className="kl-skeleton" style={{ display: "block", width: 200, height: 24 }} />
            <span className="kl-skeleton" style={{ display: "block", width: 140, height: 14, marginTop: 10 }} />
          </div>
        </div>
        <div className="kl-grid klp-skeleton-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className="kl-skeleton klp-skeleton-card" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [ids, setIds] = useState<ListIds>(emptyIds);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [profileSort, setProfileSort] = useState<ProfileSort>("recent");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set());
  const [toasts, setToasts] = useState<ProfileToast[]>([]);
  const [isEmailVisible, setIsEmailVisible] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const toastId = useRef(1);
  const tabsRef = useRef<HTMLElement>(null);

  // Tab lives in the URL so reload and Back/Forward keep the selected section.
  useEffect(() => {
    function syncTab() {
      setActiveTab(readTabFromUrl());
    }

    syncTab();
    window.addEventListener("popstate", syncTab);
    return () => window.removeEventListener("popstate", syncTab);
  }, []);

  function selectTab(tab: ProfileTab) {
    setActiveTab(tab);
    window.history.pushState(null, "", tab === "overview" ? "/profile" : `/profile?tab=${tab}`);

    const tabs = tabsRef.current;
    if (tabs && tabs.getBoundingClientRect().top < 0) {
      tabs.scrollIntoView({ block: "start" });
    }

    // Keep the selected tab visible in the horizontally scrolling bar on narrow screens.
    window.requestAnimationFrame(() => {
      tabs?.querySelector<HTMLElement>(`[data-tab="${tab}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }

  useEffect(() => {
    let isMounted = true;

    async function initializeProfile() {
      const localIds = loadLocalIds();
      const savedUser = readCurrentUserFromStorage();

      if (savedUser) {
        setCurrentUser(savedUser);
        setIds(localIds);
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

          setIds(localIds);
          setIsLoaded(true);
          return;
        }

        const mappedUser = mapSupabaseUser(user);
        setCurrentUser(mappedUser);
        saveCurrentUserToStorage(mappedUser);

        const actions = await Promise.race([
          loadMovieActions()
            .then(toIds)
            .catch(() => localIds),
          waitForProfileFallback(PROFILE_LOAD_TIMEOUT_MS, localIds),
        ]);

        if (!isMounted) {
          return;
        }

        setIds(actions);
        setIsLoaded(true);
      } catch (error) {
        console.error("Не удалось загрузить профиль Supabase:", error);

        if (!isMounted) {
          return;
        }

        setCurrentUser(savedUser);
        setIds(localIds);
        setIsLoaded(true);
      }
    }

    void initializeProfile();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) {
        return;
      }

      if (!session?.user) {
        if (event === "SIGNED_OUT") {
          setCurrentUser(null);
          setIds(loadLocalIds());
          removeCurrentUserFromStorage();
          setIsLoaded(true);
        }

        return;
      }

      const mappedUser = mapSupabaseUser(session.user);
      setCurrentUser(mappedUser);
      saveCurrentUserToStorage(mappedUser);
      setIsLoaded(true);

      const localIds = loadLocalIds();
      const actions = await Promise.race([
        loadMovieActions()
          .then(toIds)
          .catch(() => localIds),
        waitForProfileFallback(PROFILE_LOAD_TIMEOUT_MS, localIds),
      ]);

      if (!isMounted) {
        return;
      }

      setIds(actions);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function checkAdminAccess() {
      if (!currentUser) {
        if (isMounted) setIsAdmin(false);
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

  const items = useMemo(
    () => ({
      watching: getItemsByIds(ids.watching),
      watch_later: getItemsByIds(ids.watch_later),
      liked: getItemsByIds(ids.liked),
      disliked: getItemsByIds(ids.disliked),
    }),
    [ids],
  );

  // Editorial picks: a fixed list, topped up with the highest-rated titles the user has not saved.
  // It is not personalised, and the UI says so.
  const editorialItems = useMemo(() => {
    const saved = new Set(LIST_KEYS.flatMap((list) => ids[list]));
    const picks = getItemsByIds(EDITORIAL_IDS).filter((item) => !saved.has(item.id));

    if (picks.length < 10) {
      const extra = catalogItems
        .filter((item) => !saved.has(item.id) && !EDITORIAL_IDS.includes(item.id) && item.rating >= 8)
        .sort((first, second) => second.rating - first.rating)
        .slice(0, 10 - picks.length);
      picks.push(...extra);
    }

    return picks.slice(0, 12);
  }, [ids]);

  // Genres counted from titles the user marked as liked or watching; only genres that have a catalog route.
  const topGenres = useMemo(() => {
    const counts = new Map<string, number>();

    for (const item of [...items.liked, ...items.watching]) {
      for (const genre of item.genres) {
        if (getHomeGenreSlug(genre)) {
          counts.set(genre, (counts.get(genre) ?? 0) + 1);
        }
      }
    }

    return Array.from(counts.entries())
      .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0], "ru"))
      .slice(0, 6);
  }, [items.liked, items.watching]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ProfileToast, "id">) => {
      const id = toastId.current++;
      setToasts((current) => [...current.slice(-1), { ...toast, id }]);
      window.setTimeout(() => dismissToast(id), toast.undo ? 6000 : 4000);
    },
    [dismissToast],
  );

  function updateList(list: ListKey, update: (current: number[]) => number[]) {
    setIds((current) => {
      const next = { ...current, [list]: update(current[list]) };
      writeNumberArrayToStorage(STORAGE_KEYS[list], next[list]);
      return next;
    });
  }

  // Optimistic update with rollback: the UI never keeps a change Supabase did not confirm.
  async function applyListChange(
    list: ListKey,
    item: CatalogItem,
    enable: boolean,
    options: { silent?: boolean; undoable?: boolean } = {},
  ) {
    const key = `${list}:${item.id}`;

    setPendingKeys((current) => new Set(current).add(key));
    updateList(list, (current) => (enable ? withId(current, item.id) : withoutId(current, item.id)));

    const ok = await syncMovieAction(item.id, list, enable);

    setPendingKeys((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });

    if (!ok) {
      updateList(list, (current) => (enable ? withoutId(current, item.id) : withId(current, item.id)));
      showToast({ tone: "error", text: `Не удалось сохранить «${item.title}». Проверьте вход и соединение.` });
      return false;
    }

    if (!options.silent && !enable && options.undoable) {
      showToast({
        tone: "success",
        text: `«${item.title}» убран из ${LISTS[list].inLabel}`,
        undo: () => void applyListChange(list, item, true, { silent: true }),
      });
    }

    return true;
  }

  function isPending(itemId: number) {
    return LIST_KEYS.some((list) => pendingKeys.has(`${list}:${itemId}`));
  }

  function toggleList(list: ListKey, item: CatalogItem) {
    const enable = !ids[list].includes(item.id);

    void applyListChange(list, item, enable, { undoable: true });

    // Like and dislike are mutually exclusive, as on the movie page.
    if (enable && list === "liked" && ids.disliked.includes(item.id)) {
      void applyListChange("disliked", item, false, { silent: true });
    }
    if (enable && list === "disliked" && ids.liked.includes(item.id)) {
      void applyListChange("liked", item, false, { silent: true });
    }
  }

  async function confirmClearAll() {
    setIsClearDialogOpen(false);
    const snapshot = ids;

    setIds(emptyIds);
    LIST_KEYS.forEach((list) => writeNumberArrayToStorage(STORAGE_KEYS[list], []));

    const ok = await clearMovieActions();

    if (!ok) {
      setIds(snapshot);
      LIST_KEYS.forEach((list) => writeNumberArrayToStorage(STORAGE_KEYS[list], snapshot[list]));
      showToast({ tone: "error", text: "Списки не очищены: сервер не подтвердил удаление." });
      return;
    }

    showToast({ tone: "success", text: "Все списки очищены" });
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

    setIds(toIds(actions));
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
          setAuthNotice("Аккаунт создан. Если Supabase просит подтверждение, подтвердите email и войдите.");
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

  const toastRegion = (
    <div className="kl-toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={toast.tone === "error" ? "kl-toast kl-toast--error" : "kl-toast"}
          role={toast.tone === "error" ? "alert" : "status"}
        >
          <p>{toast.text}</p>
          {toast.undo ? (
            <button
              type="button"
              className="kl-btn kl-btn--sm"
              onClick={() => {
                toast.undo?.();
                dismissToast(toast.id);
              }}
            >
              Вернуть
            </button>
          ) : null}
          <button
            type="button"
            className="kl-btn kl-btn--ghost kl-btn--icon kl-btn--sm"
            onClick={() => dismissToast(toast.id)}
            aria-label="Закрыть уведомление"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );

  if (!isLoaded) {
    return (
      <main className="klp-page">
        <SiteHeader section="profile" sectionLabel="Профиль" />
        <ProfileSkeleton />
        <MobileBottomNav />
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="klp-page">
        <SiteHeader section="profile" sectionLabel="Профиль" />
        <section className="klp-auth kl-container" aria-labelledby="klp-auth-title">
          <div className="klp-auth-intro">
            <p className="kl-eyebrow">Аккаунт KinoLuma</p>
            <h1 id="klp-auth-title">{authMode === "login" ? "Вход в профиль" : "Создайте профиль"}</h1>
            <p className="kl-muted">
              {authMode === "login"
                ? "Ваши списки и отметки синхронизируются между устройствами."
                : "Сохраняйте фильмы и сериалы, отмечайте понравившееся и возвращайтесь к просмотру."}
            </p>
            <ul className="klp-auth-points">
              {LIST_KEYS.slice(0, 3).map((list) => (
                <li key={list}>
                  <span className="klp-auth-point-icon">{LISTS[list].icon(16)}</span>
                  {LISTS[list].title}
                </li>
              ))}
            </ul>
          </div>

          <div className="klp-auth-card">
            <div className="klp-auth-switch" role="group" aria-label="Режим входа">
              <button
                type="button"
                className="kl-chip"
                aria-pressed={authMode === "login"}
                onClick={() => switchProfileAuthMode("login")}
              >
                Вход
              </button>
              <button
                type="button"
                className="kl-chip"
                aria-pressed={authMode === "register"}
                onClick={() => switchProfileAuthMode("register")}
              >
                Регистрация
              </button>
            </div>

            <form onSubmit={handleProfileAuthSubmit} className="klp-form" noValidate>
              {authMode === "register" && (
                <label className="kl-field">
                  <span>Имя</span>
                  <input
                    value={authName}
                    onChange={(event) => setAuthName(event.target.value)}
                    placeholder="Например: Алекс"
                    autoComplete="name"
                  />
                </label>
              )}

              <label className="kl-field">
                <span>Email</span>
                <input
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                />
              </label>

              <label className="kl-field">
                <span>Пароль</span>
                <input
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="Минимум 6 символов"
                  type="password"
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                />
              </label>

              {authError && (
                <div className="kl-message kl-message--error" role="alert">
                  {authError}
                </div>
              )}
              {authNotice && (
                <div className="kl-message" role="status">
                  {authNotice}
                </div>
              )}

              <button
                type="submit"
                className="kl-btn kl-btn--primary kl-btn--lg kl-btn--block"
                disabled={isAuthSubmitting}
              >
                {isAuthSubmitting ? "Проверяем…" : authMode === "login" ? "Войти" : "Зарегистрироваться"}
              </button>
            </form>

            <Link href="/" className="kl-btn kl-btn--ghost kl-btn--block">
              <ArrowLeft size={16} aria-hidden="true" />
              На главную
            </Link>
          </div>
        </section>
        <MobileBottomNav />
      </main>
    );
  }

  const totalSaved = LIST_KEYS.reduce((sum, list) => sum + items[list].length, 0);
  const selectedItem = selectedItemId === null ? null : (catalogById.get(selectedItemId) ?? null);

  function openDetails(card: MediaCardItem) {
    setSelectedItemId(card.id);
  }

  function renderCard(item: CatalogItem, options: { list?: ListKey; priority?: boolean; badge?: string } = {}) {
    const { list, priority, badge } = options;

    return (
      <MediaCard
        key={item.id}
        item={item}
        onOpen={openDetails}
        priority={priority}
        badge={badge}
        corner={
          list ? (
            <button
              type="button"
              className="kl-btn kl-btn--icon kl-btn--sm"
              onClick={() => void applyListChange(list, item, false, { undoable: true })}
              disabled={isPending(item.id)}
              aria-label={`${LISTS[list].removeLabel}: ${item.title}`}
              title={LISTS[list].removeLabel}
            >
              <X size={15} aria-hidden="true" />
            </button>
          ) : undefined
        }
      />
    );
  }

  const sortControl = (
    <label className="klp-sort">
      <span className="kl-sr-only">Сортировка</span>
      <select
        className="kl-select"
        value={profileSort}
        onChange={(event) => setProfileSort(event.target.value as ProfileSort)}
      >
        <option value="recent">Сначала новые</option>
        <option value="rating">По рейтингу</option>
        <option value="year">По году</option>
        <option value="title">По названию</option>
      </select>
    </label>
  );

  function renderOverviewRail(list: ListKey, limit = 12) {
    const listItems = sortCatalogItems(items[list], "recent").slice(0, limit);

    return (
      <section className="kl-section" aria-labelledby={`klp-overview-${list}`}>
        <div className="kl-section-head">
          <h2 className="kl-section-title" id={`klp-overview-${list}`}>
            {LISTS[list].title}
            <span className="kl-count">{items[list].length}</span>
          </h2>
          {items[list].length > 0 ? (
            <button type="button" className="kl-link-btn" onClick={() => selectTab(LISTS[list].tab)}>
              Все
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {listItems.length === 0 ? (
          <EmptyState
            icon={LISTS[list].icon(22)}
            title={LISTS[list].empty.title}
            text={LISTS[list].empty.text}
            action={{ href: "/", label: "Открыть каталог" }}
          />
        ) : (
          <div className="kl-rail" role="list" aria-label={LISTS[list].title}>
            {listItems.map((item, index) => (
              <div role="listitem" key={item.id}>
                {renderCard(item, { list, priority: index < 4 })}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  const activeList = TAB_TO_LIST[activeTab];

  const tabs: Array<{ id: ProfileTab; label: string; count?: number }> = [
    { id: "overview", label: "Обзор" },
    ...LIST_KEYS.map((list) => ({
      id: LISTS[list].tab,
      label: LISTS[list].title,
      count: items[list].length,
    })),
    { id: "settings", label: "Настройки" },
  ];

  return (
    <main className="klp-page">
      <SiteHeader
        section="profile"
        sectionLabel="Профиль"
        actions={
          <>
            {isAdmin ? (
              <Link href="/admin" className="kl-btn kl-btn--ghost kl-btn--sm" aria-label="Админка">
                <ShieldCheck size={15} aria-hidden="true" />
                <span className="kl-hide-mobile">Админка</span>
              </Link>
            ) : null}
            <button
              type="button"
              className="kl-btn kl-btn--ghost kl-btn--sm"
              onClick={logout}
              aria-label="Выйти из аккаунта"
            >
              <LogOut size={15} aria-hidden="true" />
              <span className="kl-hide-mobile">Выйти</span>
            </button>
          </>
        }
      />

      <div className="klp-shell">
        <div className="kl-container">
          {/* Compact identity line; per-list counts live in the tabs below, not in a second stats block. */}
          <section className="klp-head" aria-labelledby="klp-name">
            <span className="klp-avatar" aria-hidden="true">
              {getInitials(currentUser.name)}
            </span>
            <div className="klp-head-text">
              <p className="kl-eyebrow">Профиль</p>
              <h1 id="klp-name" title={currentUser.name}>
                {currentUser.name}
              </h1>
              <p className="klp-head-sub">
                {totalSaved > 0 ? `${totalSaved} в ваших списках` : "Списки пока пусты — начните с каталога"}
              </p>
            </div>
          </section>

          <nav ref={tabsRef} className="klp-tabs" aria-label="Разделы профиля">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className="klp-tab"
                data-tab={tab.id}
                aria-current={activeTab === tab.id ? "page" : undefined}
                onClick={() => selectTab(tab.id)}
              >
                {tab.label}
                {typeof tab.count === "number" ? <span className="kl-count">{tab.count}</span> : null}
              </button>
            ))}
          </nav>

          <div className="klp-panel" key={activeTab}>
            {activeTab === "overview" ? (
              <>
                {items.watching.length > 0 ? renderOverviewRail("watching") : null}
                {renderOverviewRail("watch_later")}
                {items.liked.length > 0 ? renderOverviewRail("liked") : null}

                {topGenres.length > 0 ? (
                  <section className="kl-section" aria-labelledby="klp-genres">
                    <div className="kl-section-head">
                      <div>
                        <h2 className="kl-section-title" id="klp-genres">
                          Ваши жанры
                        </h2>
                        <p className="klp-note">По тайтлам из «Избранного» и «Смотрю».</p>
                      </div>
                    </div>
                    <div className="klp-genres">
                      {topGenres.map(([genre, count]) => (
                        <Link key={genre} href={getHomeCatalogPath(genre, 1)} className="kl-chip">
                          {genre}
                          <span className="kl-count">{count}</span>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}

                {editorialItems.length > 0 ? (
                  <section className="kl-section" aria-labelledby="klp-editorial">
                    <div className="kl-section-head">
                      <div>
                        <h2 className="kl-section-title" id="klp-editorial">
                          Подборка редакции
                        </h2>
                        <p className="klp-note">Общая подборка KinoLuma, не персональные рекомендации.</p>
                      </div>
                    </div>
                    <div className="kl-rail" role="list" aria-label="Подборка редакции">
                      {editorialItems.map((item) => (
                        <div role="listitem" key={item.id}>
                          {renderCard(item, { badge: item.type })}
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </>
            ) : null}

            {activeList ? (
              <section className="kl-section klp-list" aria-labelledby={`klp-list-${activeList}`}>
                <div className="kl-section-head">
                  <h2 className="kl-section-title" id={`klp-list-${activeList}`}>
                    {LISTS[activeList].title}
                    <span className="kl-count">{items[activeList].length}</span>
                  </h2>
                  {items[activeList].length > 1 ? sortControl : null}
                </div>
                {items[activeList].length === 0 ? (
                  <EmptyState
                    icon={LISTS[activeList].icon(22)}
                    title={LISTS[activeList].empty.title}
                    text={LISTS[activeList].empty.text}
                    action={{ href: "/", label: "Открыть каталог" }}
                  />
                ) : (
                  <div className="kl-grid">
                    {sortCatalogItems(items[activeList], profileSort).map((item, index) =>
                      renderCard(item, { list: activeList, priority: index < 6 }),
                    )}
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === "settings" ? (
              <div className="klp-settings kl-section">
                <section className="klp-box" aria-labelledby="klp-account">
                  <h2 id="klp-account">Аккаунт</h2>
                  <dl className="klp-dl">
                    <div>
                      <dt>Имя</dt>
                      <dd>{currentUser.name}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>
                        <span className="klp-email">
                          {isEmailVisible ? currentUser.email : maskEmail(currentUser.email)}
                        </span>
                        <button
                          type="button"
                          className="kl-link-btn"
                          onClick={() => setIsEmailVisible((value) => !value)}
                          aria-pressed={isEmailVisible}
                        >
                          {isEmailVisible ? "Скрыть" : "Показать"}
                        </button>
                      </dd>
                    </div>
                  </dl>
                  <div className="klp-box-actions">
                    <button type="button" className="kl-btn" onClick={logout}>
                      <LogOut size={16} aria-hidden="true" />
                      Выйти из аккаунта
                    </button>
                    {isAdmin ? (
                      <Link href="/admin" className="kl-btn kl-btn--ghost">
                        <ShieldCheck size={16} aria-hidden="true" />
                        Панель администратора
                      </Link>
                    ) : null}
                  </div>
                </section>

                <section className="klp-box" aria-labelledby="klp-danger">
                  <h2 id="klp-danger">Очистка списков</h2>
                  <p className="kl-muted">
                    Удалит «Смотрю», «Смотреть позже», избранное и отметки «Не понравилось» на всех ваших устройствах.
                    Отменить нельзя.
                  </p>
                  <div className="klp-box-actions">
                    <button
                      type="button"
                      className="kl-btn kl-btn--danger"
                      onClick={() => setIsClearDialogOpen(true)}
                      disabled={totalSaved === 0}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      Очистить все списки
                    </button>
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {selectedItem ? (
        <MovieInfoDialog
          key={selectedItem.id}
          item={selectedItem}
          state={{
            watching: ids.watching.includes(selectedItem.id),
            watch_later: ids.watch_later.includes(selectedItem.id),
            liked: ids.liked.includes(selectedItem.id),
            disliked: ids.disliked.includes(selectedItem.id),
          }}
          pending={isPending(selectedItem.id)}
          onToggle={(list) => toggleList(list, selectedItem)}
          onClose={() => setSelectedItemId(null)}
        />
      ) : null}

      {isClearDialogOpen ? (
        <Dialog
          labelledBy="klp-clear-title"
          describedBy="klp-clear-text"
          role="alertdialog"
          size="sm"
          onClose={() => setIsClearDialogOpen(false)}
          closeLabel="Отмена"
        >
          <div className="kl-dialog-body">
            <h2 id="klp-clear-title">Очистить все списки?</h2>
            <p id="klp-clear-text">
              Будет удалено {totalSaved} отметок во всех списках. Это действие нельзя отменить.
            </p>
            <div className="kl-dialog-actions">
              <button type="button" className="kl-btn" onClick={() => setIsClearDialogOpen(false)}>
                Отмена
              </button>
              <button type="button" className="kl-btn kl-btn--danger" onClick={() => void confirmClearAll()}>
                Очистить
              </button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {toastRegion}
      <MobileBottomNav />
    </main>
  );
}
