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
  Film,
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
import {
  profileCatalogItems as catalogItems,
  type ProfileCatalogItem,
} from "../data/profileCatalogItems";
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

// Section titles on the overview; the full lists keep the tab names.
const OVERVIEW_TITLES: Record<ListKey, string> = {
  watching: "Сейчас смотрю",
  watch_later: "Смотреть позже",
  liked: "Избранное",
  disliked: "Не понравилось",
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
        <div className="klp-ambient" aria-hidden="true" />
        <div className="klp-center" aria-busy="true">
          <div className="klp-loading kl-panel">
            <img src="/kinoluma-icon.png" alt="" className="klp-logo" />
            <p>Загрузка профиля...</p>
          </div>
        </div>
        <MobileBottomNav />
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="klp-page">
        <div className="klp-ambient" aria-hidden="true" />
        <section className="klp-center" aria-labelledby="klp-auth-title">
          <div className="klp-auth kl-panel">
            <Link href="/" className="klp-brand">
              <img src="/kinoluma-icon.png" alt="KinoLuma" className="klp-logo" />
              <span>
                <span className="klp-logo-title">KinoLuma</span>
                <span className="klp-logo-subtitle">Профиль</span>
              </span>
            </Link>

            <p className="kl-eyebrow klp-auth-eyebrow">Аккаунт KinoLuma</p>
            <h1 id="klp-auth-title">{authMode === "login" ? "Вход" : "Регистрация"}</h1>
            <p className="klp-auth-text">
              {authMode === "login"
                ? "Войди, чтобы открыть свои списки, реакции и персональные подборки."
                : "Создай аккаунт, чтобы сохранять фильмы, реакции и подборки в профиле."}
            </p>

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
                className="kl-btn kl-btn--primary kl-btn--block klp-submit"
                disabled={isAuthSubmitting}
              >
                {isAuthSubmitting ? "Проверяем..." : authMode === "login" ? "Войти" : "Зарегистрироваться"}
              </button>
            </form>

            <div className="klp-auth-switch">
              {authMode === "login" ? (
                <button type="button" onClick={() => switchProfileAuthMode("register")}>
                  Нет аккаунта? Зарегистрироваться
                </button>
              ) : (
                <button type="button" onClick={() => switchProfileAuthMode("login")}>
                  Уже есть аккаунт? Войти
                </button>
              )}
            </div>

            <Link href="/" className="kl-btn kl-btn--block klp-auth-back">
              <ArrowLeft size={18} strokeWidth={2.4} aria-hidden="true" />
              Вернуться на главную
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

  // Full lists add a slim "Убрать" under each poster (production .remove-button); overview rails stay posters only.
  function renderCard(item: CatalogItem, options: { list?: ListKey; priority?: boolean } = {}) {
    const { list, priority } = options;

    return (
      <MediaCard
        key={item.id}
        item={item}
        onOpen={openDetails}
        priority={priority}
        actions={
          list ? (
            <button
              type="button"
              onClick={() => void applyListChange(list, item, false, { undoable: true })}
              disabled={isPending(item.id)}
              aria-label={`${LISTS[list].removeLabel}: ${item.title}`}
            >
              <Trash2 size={13} strokeWidth={2.4} aria-hidden="true" />
              Убрать
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
        <option value="recent">Новые</option>
        <option value="rating">Рейтинг</option>
        <option value="year">Год</option>
        <option value="title">А-Я</option>
      </select>
    </label>
  );

  function renderSectionHead(id: string, title: string, count: number, tools?: ReactNode) {
    return (
      <div className="klp-section-head">
        <div>
          <p className="klp-eyebrow">Мой список</p>
          <h2 id={id} className="klp-title">
            {title}
            <span className="klp-title-count">{count}</span>
          </h2>
        </div>
        {tools}
      </div>
    );
  }

  function renderEmpty(list: ListKey) {
    return (
      <EmptyState
        icon={LISTS[list].icon(20)}
        title={LISTS[list].empty.title}
        text={LISTS[list].empty.text}
        action={{ href: "/", label: "Открыть каталог" }}
      />
    );
  }

  function renderOverviewSection(list: ListKey) {
    const listItems = sortCatalogItems(items[list], "recent").slice(0, 12);
    const headingId = `klp-overview-${list}`;

    return (
      <section className="klp-section" aria-labelledby={headingId}>
        {renderSectionHead(
          headingId,
          OVERVIEW_TITLES[list],
          items[list].length,
          items[list].length > 0 ? (
            <button type="button" className="klp-more" onClick={() => selectTab(LISTS[list].tab)}>
              Все
              <ChevronRight size={15} strokeWidth={2.6} aria-hidden="true" />
            </button>
          ) : null,
        )}
        <div className="klp-panel">
          {listItems.length === 0 ? (
            renderEmpty(list)
          ) : (
            <div className="klp-rail" role="list" aria-label={OVERVIEW_TITLES[list]}>
              {listItems.map((item, index) => (
                <div role="listitem" key={item.id}>
                  {renderCard(item, { priority: index < 6 })}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  const activeList = TAB_TO_LIST[activeTab];

  const tabs: Array<{ id: ProfileTab; label: string; count?: number }> = [
    { id: "overview", label: "Обзор" },
    ...LIST_KEYS.map((list) => ({ id: LISTS[list].tab, label: LISTS[list].title, count: items[list].length })),
    { id: "settings", label: "Настройки" },
  ];

  return (
    <main className="klp-page">
      <div className="klp-ambient" aria-hidden="true" />

      <header className="klp-topbar">
        <div className="klp-topbar-inner">
          <Link href="/" className="klp-brand">
            <img src="/kinoluma-icon.png" alt="KinoLuma" className="klp-logo" />
            <span>
              <span className="klp-logo-title">KinoLuma</span>
              <span className="klp-logo-subtitle">Профиль</span>
            </span>
          </Link>

          <div className="klp-top-actions">
            <Link href="/" className="kl-btn kl-btn--ghost">
              <Film size={17} strokeWidth={2.4} aria-hidden="true" />В каталог
            </Link>
            {isAdmin ? (
              <Link href="/admin/import" className="kl-btn kl-btn--ghost klp-hide-mobile">
                <ShieldCheck size={17} strokeWidth={2.4} aria-hidden="true" />
                Админка
              </Link>
            ) : null}
            <button type="button" className="kl-btn kl-btn--ghost" onClick={logout} aria-label="Выйти из аккаунта">
              <LogOut size={17} strokeWidth={2.4} aria-hidden="true" />
              <span className="klp-hide-mobile">Выйти</span>
            </button>
          </div>
        </div>
      </header>

      <div className="klp-shell">
        <section className="klp-panel klp-identity" aria-labelledby="klp-name">
          <div className="klp-avatar" aria-hidden="true">
            {getInitials(currentUser.name)}
          </div>
          <div className="klp-user">
            <p className="klp-eyebrow">Профиль</p>
            <h1 id="klp-name" className="klp-title" title={currentUser.name}>
              {currentUser.name}
            </h1>
            <p className="klp-count">
              {totalSaved > 0 ? `${totalSaved} в ваших списках` : "Списки пока пусты — начните с каталога"}
            </p>
          </div>
        </section>

        <nav ref={tabsRef} className="klp-panel klp-tabs" aria-label="Разделы профиля">
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
              {typeof tab.count === "number" ? <span className="klp-tab-count">{tab.count}</span> : null}
            </button>
          ))}
        </nav>

        <div className="klp-sections" key={activeTab}>
          {activeTab === "overview" ? (
            <>
              {renderOverviewSection("watching")}
              {renderOverviewSection("watch_later")}
              {renderOverviewSection("liked")}
            </>
          ) : null}

          {activeList ? (
            <section className="klp-section" aria-labelledby={`klp-list-${activeList}`}>
              {renderSectionHead(
                `klp-list-${activeList}`,
                LISTS[activeList].title,
                items[activeList].length,
                items[activeList].length > 1 ? sortControl : null,
              )}
              <div className="klp-panel">
                {items[activeList].length === 0 ? (
                  renderEmpty(activeList)
                ) : (
                  <div className="klp-grid">
                    {sortCatalogItems(items[activeList], profileSort).map((item, index) =>
                      renderCard(item, { list: activeList, priority: index < 8 }),
                    )}
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === "settings" ? (
            <>
              <section className="klp-section" aria-labelledby="klp-account">
                <div className="klp-section-head">
                  <div>
                    <p className="klp-eyebrow">Аккаунт</p>
                    <h2 id="klp-account" className="klp-title">
                      Данные профиля
                    </h2>
                  </div>
                </div>
                <div className="klp-panel klp-settings">
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
                  <div className="klp-actions">
                    <button type="button" className="kl-btn" onClick={logout}>
                      <LogOut size={18} strokeWidth={2.4} aria-hidden="true" />
                      Выйти из аккаунта
                    </button>
                    {isAdmin ? (
                      <Link href="/admin/import" className="kl-btn kl-btn--primary">
                        <ShieldCheck size={18} strokeWidth={2.4} aria-hidden="true" />
                        Управление фильмами
                      </Link>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="klp-section" aria-labelledby="klp-danger">
                <div className="klp-section-head">
                  <div>
                    <p className="klp-eyebrow">Списки</p>
                    <h2 id="klp-danger" className="klp-title">
                      Очистка
                    </h2>
                  </div>
                </div>
                <div className="klp-panel klp-settings">
                  <p className="klp-settings-text">
                    Удалит «Смотрю», «Смотреть позже», избранное и отметки «Не понравилось» на всех ваших устройствах.
                    Отменить нельзя.
                  </p>
                  <div className="klp-actions">
                    <button
                      type="button"
                      className="kl-btn kl-btn--danger"
                      onClick={() => setIsClearDialogOpen(true)}
                      disabled={totalSaved === 0}
                    >
                      <Trash2 size={18} strokeWidth={2.4} aria-hidden="true" />
                      Очистить списки
                    </button>
                  </div>
                </div>
              </section>
            </>
          ) : null}
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
              <button type="button" className="kl-btn kl-btn--primary" onClick={() => void confirmClearAll()}>
                Очистить
              </button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {toastRegion}
      {selectedItem ? null : <MobileBottomNav />}
    </main>
  );
}
