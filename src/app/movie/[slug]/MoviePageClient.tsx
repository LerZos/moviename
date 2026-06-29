"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import MobileBottomNav from "../../components/MobileBottomNav";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Movie, MovieFact, PlayerProvider } from "../../data/movies";
import type { MovieCardIndexItem } from "../../data/movieCardIndex";
import { supabase } from "../../lib/supabase";
import {
  getCurrentSupabaseUser,
  loadMovieActions,
  syncMovieAction,
} from "../../lib/kinolumaSupabase";
import {
  buildAutoPlayers,
  COLLAPSE_ACTUALIZE_SCRIPT_SRC,
  getFallbackKinopoiskIdBySlug,
  isAnimeAutoPlayerInput,
} from "../../lib/players";

type MoviePageClientProps = {
  movie: Movie;
  relatedMovies?: MovieCardIndexItem[];
};

const WATCH_LATER_KEY = "kinoluma-watch-later";
const LIKED_ITEMS_KEY = "kinoluma-liked-items";
const DISLIKED_ITEMS_KEY = "kinoluma-disliked-items";
const WATCHING_ITEMS_KEY = "kinoluma-watching-items";

const DEFAULT_PLAYERS: PlayerProvider[] = [
  { id: "player-1", name: "Плеер 1", embedUrl: "" },
  { id: "player-2", name: "Плеер 2", embedUrl: "" },
  { id: "player-3", name: "Плеер 3", embedUrl: "" },
];

const RENDEX_SCRIPT_SRC = "https://graphicslab.io/sdk/v2/rendex-sdk.min.js";

const GENRE_SLUG_MAP: Record<string, string> = {
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

function getCatalogSlugByMovie(movie: Movie) {
  if (movie.type === "Сериал") return "series";
  if (movie.type === "Аниме") return "anime";
  if (movie.type === "Мультфильм" || movie.genres.includes("Анимация")) return "cartoons";
  return "films";
}

function slugifyPublicGenre(genre: string) {
  return genre
    .toLowerCase()
    .split("")
    .map((char) => GENRE_SLUG_MAP[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitLongTextIntoParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}


function getPlayerRecord(
  player: PlayerProvider,
): PlayerProvider & Record<string, unknown> {
  return player as PlayerProvider & Record<string, unknown>;
}

function isRendexPlayer(player: PlayerProvider) {
  const record = getPlayerRecord(player);
  return (
    String(record.type || record.provider || "").toLowerCase() === "rendex"
  );
}

function isCollapsePlayer(player: PlayerProvider) {
  const record = getPlayerRecord(player);
  const type = String(record.type || record.provider || "").toLowerCase();
  const embedUrl = String(player.embedUrl || "").trim();

  return (
    type === "collapse" ||
    type === "collaps" ||
    type === "collapse-iframe" ||
    type === "collaps-iframe" ||
    embedUrl.includes("api.ortified.ws/embed")
  );
}

function hasPlayablePlayer(player: PlayerProvider) {
  if (isRendexPlayer(player)) {
    return Boolean(getRendexContentId(player));
  }

  return Boolean(player.embedUrl?.trim());
}

function normalizePlayerButtonNames(players: PlayerProvider[]) {
  return players.map((player, index) => {
    const record = getPlayerRecord(player);
    const currentName = String(record.name || "").trim();
    const lowerName = currentName.toLowerCase();
    const isGenericName =
      !currentName ||
      lowerName === "основной" ||
      lowerName.startsWith("запасной") ||
      lowerName.startsWith("плеер");

    if (index === 0) {
      return { ...record, name: "Основной" } as PlayerProvider;
    }

    if (isGenericName) {
      return { ...record, name: `Запасной ${index}` } as PlayerProvider;
    }

    return player;
  });
}

function getPlayerUniqueKey(player: PlayerProvider) {
  const record = getPlayerRecord(player);
  const type = String(record.type || record.provider || "iframe").toLowerCase();
  const embedUrl = String(player.embedUrl || "").trim();
  const contentKind = String(
    record.contentKind || record.contentType || "",
  ).trim();
  const contentId = String(
    record.contentId || record.rendexVideoId || "",
  ).trim();

  if (type === "rendex" && contentId) return `rendex:${contentId}`;
  if ((type === "collapse" || type === "collaps") && contentId) {
    return `collapse:${contentKind}:${contentId}`;
  }
  if (
    (type === "vibix" ||
      type === "vibix-iframe" ||
      record.provider === "vibix") &&
    embedUrl
  ) {
    return `vibix:${embedUrl}`;
  }

  return embedUrl ? `${type}:${embedUrl}` : `${type}:${player.id}`;
}

function isLegacyStandaloneVibixPlayer(player: PlayerProvider) {
  const record = getPlayerRecord(player);
  const type = String(record.type || record.provider || "").toLowerCase();
  return (
    type === "vibix" || type === "vibix-iframe" || record.provider === "vibix"
  );
}

function mergeGeneratedAndManualPlayers(
  generatedPlayers: PlayerProvider[],
  realPlayers: PlayerProvider[],
) {
  const seen = new Set<string>();
  const merged: PlayerProvider[] = [];

  for (const player of [...generatedPlayers, ...realPlayers]) {
    if (!hasPlayablePlayer(player)) continue;

    const key = getPlayerUniqueKey(player);
    if (seen.has(key)) continue;

    seen.add(key);
    merged.push(player);
  }

  return merged;
}

function getRendexContentId(player: PlayerProvider) {
  const record = getPlayerRecord(player);
  return String(record.contentId || record.rendexVideoId || "").trim();
}

function getRendexPublisherId(player: PlayerProvider) {
  const record = getPlayerRecord(player);
  return String(record.publisherId || "678053396").trim();
}

function getRendexContentType(player: PlayerProvider, movie: Movie) {
  const record = getPlayerRecord(player);
  const explicitType = String(record.contentType || "").trim();
  if (explicitType) return explicitType;
  return movie.type === "Сериал" ? "series" : "movie";
}

function getRendexColor(player: PlayerProvider, key: string, fallback: string) {
  const record = getPlayerRecord(player);
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getSafePlayerEmbedUrl(value: string) {
  const text = value.trim();
  if (!text) return "";

  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function buildPlayerIframeHtml(player: PlayerProvider, movie: Movie) {
  const src = escapeHtmlAttribute(getSafePlayerEmbedUrl(player.embedUrl || ""));
  const title = escapeHtmlAttribute(`${player.name} — ${movie.title}`);
  const allow = escapeHtmlAttribute(
    isCollapsePlayer(player)
      ? "autoplay *; fullscreen *; encrypted-media; picture-in-picture"
      : "autoplay; fullscreen; encrypted-media; picture-in-picture",
  );

  return `<iframe src="${src}" title="${title}" class="player-iframe" allow="${allow}" allowfullscreen="" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "MH"
  );
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

function saveNumberArrayToStorage(key: string, ids: number[]) {
  window.localStorage.setItem(key, JSON.stringify(ids));
}

type VibixRendexResponse = {
  ok?: boolean;
  player?: {
    contentId?: string;
    contentType?: string;
    publisherId?: string;
  } | null;
};

type VibixRendexPlayerData = {
  contentId: string;
  contentType: string;
  publisherId?: string;
};

async function readJsonSafely(response: Response) {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function toggleId(ids: number[], itemId: number) {
  if (ids.includes(itemId)) {
    return ids.filter((id) => id !== itemId);
  }

  return [...ids, itemId];
}

function getDefaultFacts(movie: Movie): MovieFact[] {
  return [
    { label: "Год", value: movie.year },
    { label: "Тип", value: movie.type },
    { label: "Рейтинг", value: formatMovieRating(movie.rating) },
    { label: "Жанры", value: movie.genres.join(", ") },
  ];
}

function normalizeFactLabel(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU");
}

function isUnknownFactValue(value: string | undefined) {
  const normalizedValue = (value || "").trim().toLocaleLowerCase("ru-RU");

  return ["", "-", "—", "–", "n/a", "нет данных", "неизвестно"].includes(
    normalizedValue,
  );
}

function getFactValue(
  facts: MovieFact[],
  labels: string | string[],
  fallback: string,
) {
  const normalizedLabels = (Array.isArray(labels) ? labels : [labels]).map(
    normalizeFactLabel,
  );
  const value = facts.find((fact) =>
    normalizedLabels.includes(normalizeFactLabel(fact.label)),
  )?.value;

  return isUnknownFactValue(value) ? fallback : value!.trim();
}

const HIDDEN_FACT_LABELS = new Set([
  "жанры",
  "imdb",
  "tmdb",
  "kinopoisk",
  "кинопоиск",
  "источник",
  "source",
  "id",
  "seo-данные",
  "faq-разметка",
  "json-ld",
]);

function isVisibleFact(fact: MovieFact) {
  const normalizedLabel = normalizeFactLabel(fact.label);

  return (
    !HIDDEN_FACT_LABELS.has(normalizedLabel) &&
    !/(?:kinopoisk|кинопоиск|tmdb|imdb)/i.test(normalizedLabel) &&
    !isUnknownFactValue(fact.value)
  );
}

const UNKNOWN_RATING_TEXT = "Уточняется";

function formatMovieRating(rating: number) {
  if (!Number.isFinite(rating) || rating <= 0) {
    return UNKNOWN_RATING_TEXT;
  }

  return `★ ${Number.isInteger(rating) ? rating.toString() : rating.toFixed(1)}`;
}

function getContentKind(movie: Pick<Movie, "type" | "genres"> | MovieCardIndexItem) {
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

function escapeSvgText(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function getGeneratedPosterFallback(title: string) {
  const safeTitle = escapeSvgText(
    title.split(" ").filter(Boolean).slice(0, 4).join(" ").toUpperCase(),
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

export default function MoviePageClient({
  movie,
  relatedMovies = [],
}: MoviePageClientProps) {
  const [vibixRendexData, setVibixRendexData] =
    useState<VibixRendexPlayerData | null>(null);

  const generatedPlayers = useMemo(
    () =>
      buildAutoPlayers({
        slug: movie.slug,
        kinopoiskId: movie.kinopoiskId,
        imdbId: movie.imdbId,
        rendexVideoId: vibixRendexData?.contentId,
        contentType: vibixRendexData?.contentType,
        movieType: movie.type,
        genres: movie.genres,
      }),
    [
      movie.genres,
      movie.imdbId,
      movie.kinopoiskId,
      movie.slug,
      movie.type,
      vibixRendexData?.contentId,
      vibixRendexData?.contentType,
    ],
  );

  const isAnimePlayerUnavailable = useMemo(
    () =>
      isAnimeAutoPlayerInput({
        movieType: movie.type,
        genres: movie.genres,
      }),
    [movie.genres, movie.type],
  );

  const players = useMemo(() => {
    if (isAnimePlayerUnavailable) {
      return DEFAULT_PLAYERS;
    }

    const realPlayers = (movie.players || [])
      .filter(hasPlayablePlayer)
      .filter((player) => !isLegacyStandaloneVibixPlayer(player));

    const mergedPlayers =
      realPlayers.length > 0
        ? mergeGeneratedAndManualPlayers(generatedPlayers, realPlayers)
        : generatedPlayers;

    if (mergedPlayers.length > 0) {
      return normalizePlayerButtonNames(mergedPlayers).slice(0, 3);
    }

    return DEFAULT_PLAYERS;
  }, [generatedPlayers, isAnimePlayerUnavailable, movie.players]);

  const facts = useMemo(
    () =>
      movie.facts && movie.facts.length > 0
        ? movie.facts
        : getDefaultFacts(movie),
    [movie],
  );

  const similarMovies = useMemo(() => relatedMovies, [relatedMovies]);

  const cast = movie.cast || [];
  const contentKind = getContentKind(movie);
  const relatedSectionTitle =
    movie.type === "Сериал"
      ? "Похожие сериалы"
      : movie.type === "Аниме"
        ? "Похожее аниме"
        : movie.type === "Мультфильм" || contentKind === "мультфильм"
          ? "Похожие мультфильмы"
          : movie.type === "Документальный"
            ? "Похожие документальные проекты"
            : "Похожие фильмы";

  const detailParagraphs = useMemo(
    () => splitLongTextIntoParagraphs(movie.longDescription || movie.description),
    [movie.description, movie.longDescription],
  );

  const catalogSlug = getCatalogSlugByMovie(movie);

  const faqItems = useMemo(() => {
    const kind = getContentKind(movie);
    const titleWithYear = `${movie.title} (${movie.year})`;
    const genres = movie.genres.join(", ");
    const rating = movie.rating > 0 ? `${movie.rating.toFixed(1)} из 10` : "появится после обновления карточки";
    const country = getFactValue(facts, ["Страна", "Страны"], "Уточняется");
    const duration = getFactValue(
      facts,
      ["Длительность", "Хронометраж"],
      "Уточняется",
    );
    const studio = getFactValue(facts, "Студия", "Уточняется");

    return [
      {
        question: `О чём ${movie.title}?`,
        answer:
          movie.longDescription ||
          movie.description ||
          `${titleWithYear} — ${kind} с рейтингом, жанрами и трейлером на KinoLuma.`,
      },
      {
        question: `К какому жанру относится ${movie.title}?`,
        answer: `${titleWithYear} — ${kind}. Основные жанры: ${genres}.`,
      },
      {
        question: `Какой рейтинг у ${movie.title}?`,
        answer: `Рейтинг ${movie.title}: ${rating}. Значение показывается в карточке и может уточняться при обновлении каталога.`,
      },
      {
        question: `Какая страна, длительность и студия у ${movie.title}?`,
        answer: `Страна: ${country}. Длительность: ${duration}. Студия: ${studio}.`,
      },
      {
        question: `Есть ли трейлер ${movie.title}?`,
        answer: movie.trailerUrl
          ? `Да, на странице ${movie.title} есть встроенный трейлер, рейтинг, жанры и дополнительная информация.`
          : `На странице ${movie.title} есть рейтинг, жанры и подробная информация. Трейлер можно добавить после подключения корректной ссылки.`,
      },
    ];
  }, [facts, movie]);

  const [activePlayerId, setActivePlayerId] = useState(players[0].id);
  const [posterSrc, setPosterSrc] = useState(movie.poster);
  const smoothScrollFrameRef = useRef<number | null>(null);
  const playerSectionRef = useRef<HTMLElement | null>(null);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);

  const [watchLaterIds, setWatchLaterIds] = useState<number[]>([]);
  const [likedItemIds, setLikedItemIds] = useState<number[]>([]);
  const [dislikedItemIds, setDislikedItemIds] = useState<number[]>([]);
  const [watchingItemIds, setWatchingItemIds] = useState<number[]>([]);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const activePlayer =
    players.find((player) => player.id === activePlayerId) || players[0];

  useEffect(() => {
    if (isPlayerVisible) return;

    const section = playerSectionRef.current;
    if (!section) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsPlayerVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        setIsPlayerVisible(true);
        observer.disconnect();
      },
      { rootMargin: "360px 0px", threshold: 0.01 },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [isPlayerVisible]);

  const visibleFacts = useMemo(() => facts.filter(isVisibleFact), [facts]);
  const ratingText = formatMovieRating(movie.rating);

  const isWatchLater = watchLaterIds.includes(movie.id);
  const isLiked = likedItemIds.includes(movie.id);
  const isDisliked = dislikedItemIds.includes(movie.id);
  const isWatching = watchingItemIds.includes(movie.id);

  const duration = getFactValue(
    facts,
    ["Длительность", "Хронометраж"],
    "Уточняется",
  );
  const countryFact = getFactValue(facts, ["Страна", "Страны"], "");
  const budgetFact = getFactValue(facts, "Бюджет", "");
  const studioFact = getFactValue(facts, "Студия", "");
  const quickFacts = [
    {
      label: countryFact ? "Страна" : "Тип",
      value: countryFact || movie.type,
    },
    {
      label: budgetFact ? "Бюджет" : "Рейтинг",
      value: budgetFact || ratingText,
    },
    {
      label: studioFact ? "Студия" : "Оригинальное название",
      value: studioFact || movie.originalTitle || "Уточняется",
    },
  ];

  useEffect(() => {
    const controller = new AbortController();
    let isCancelled = false;

    async function loadVibixRendexData() {
      setVibixRendexData(null);

      const fallbackKinopoiskId =
        movie.kinopoiskId || getFallbackKinopoiskIdBySlug(movie.slug);

      if (isAnimePlayerUnavailable || (!fallbackKinopoiskId && !movie.imdbId)) {
        return;
      }

      const params = new URLSearchParams();

      if (fallbackKinopoiskId) {
        params.set("kpId", String(fallbackKinopoiskId));
      }

      if (movie.imdbId) {
        params.set("imdbId", String(movie.imdbId));
      }

      if (movie.type) {
        params.set("movieType", movie.type);
      }

      try {
        const response = await fetch(`/api/player/vibix?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const payload = (await readJsonSafely(
          response,
        )) as VibixRendexResponse | null;
        const contentId = payload?.player?.contentId?.trim();

        if (!isCancelled && contentId) {
          setVibixRendexData({
            contentId,
            contentType:
              payload?.player?.contentType?.trim() ||
              (movie.type === "Сериал" ? "series" : "movie"),
            publisherId: payload?.player?.publisherId?.trim(),
          });
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setVibixRendexData(null);
        }
      }
    }

    void loadVibixRendexData();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [
    isAnimePlayerUnavailable,
    movie.imdbId,
    movie.kinopoiskId,
    movie.slug,
    movie.type,
  ]);

  useEffect(() => {
    setPosterSrc(movie.poster);
    setActivePlayerId(players[0].id);
  }, [movie.poster, movie.slug, players]);

  useEffect(() => {
    let isMounted = true;

    async function initializeMovieActions() {
      const user = await getCurrentSupabaseUser();

      if (!isMounted) {
        return;
      }

      if (user) {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (accessToken) {
          const adminResponse = await fetch("/api/admin/me", {
            headers: {
              authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
          });

          if (isMounted) {
            setIsAdmin(adminResponse.ok);
          }
        }

        const actions = await loadMovieActions();

        if (!isMounted) {
          return;
        }

        setWatchLaterIds(actions.watchLaterIds);
        setLikedItemIds(actions.likedItemIds);
        setDislikedItemIds(actions.dislikedItemIds);
        setWatchingItemIds(actions.watchingItemIds);
      } else {
        setIsAdmin(false);
        setWatchLaterIds(readNumberArrayFromStorage(WATCH_LATER_KEY));
        setLikedItemIds(readNumberArrayFromStorage(LIKED_ITEMS_KEY));
        setDislikedItemIds(readNumberArrayFromStorage(DISLIKED_ITEMS_KEY));
        setWatchingItemIds(readNumberArrayFromStorage(WATCHING_ITEMS_KEY));
      }

      setIsStorageLoaded(true);
    }

    void initializeMovieActions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isStorageLoaded) {
      return;
    }

    saveNumberArrayToStorage(WATCH_LATER_KEY, watchLaterIds);
  }, [watchLaterIds, isStorageLoaded]);

  useEffect(() => {
    if (!isStorageLoaded) {
      return;
    }

    saveNumberArrayToStorage(LIKED_ITEMS_KEY, likedItemIds);
  }, [likedItemIds, isStorageLoaded]);

  useEffect(() => {
    if (!isStorageLoaded) {
      return;
    }

    saveNumberArrayToStorage(DISLIKED_ITEMS_KEY, dislikedItemIds);
  }, [dislikedItemIds, isStorageLoaded]);

  useEffect(() => {
    if (!isStorageLoaded) {
      return;
    }

    saveNumberArrayToStorage(WATCHING_ITEMS_KEY, watchingItemIds);
  }, [watchingItemIds, isStorageLoaded]);

  function toggleWatchLater() {
    const shouldEnable = !isWatchLater;
    setWatchLaterIds((currentIds) => toggleId(currentIds, movie.id));
    void syncMovieAction(movie.id, "watch_later", shouldEnable);
  }

  function toggleLiked() {
    const shouldEnable = !isLiked;
    setLikedItemIds((currentIds) => toggleId(currentIds, movie.id));
    void syncMovieAction(movie.id, "liked", shouldEnable);

    if (shouldEnable) {
      setDislikedItemIds((currentDislikedIds) =>
        currentDislikedIds.filter((id) => id !== movie.id),
      );
      void syncMovieAction(movie.id, "disliked", false);
    }
  }

  function toggleDisliked() {
    const shouldEnable = !isDisliked;
    setDislikedItemIds((currentIds) => toggleId(currentIds, movie.id));
    void syncMovieAction(movie.id, "disliked", shouldEnable);

    if (shouldEnable) {
      setLikedItemIds((currentLikedIds) =>
        currentLikedIds.filter((id) => id !== movie.id),
      );
      void syncMovieAction(movie.id, "liked", false);
    }
  }

  function toggleWatching() {
    const shouldEnable = !isWatching;
    setWatchingItemIds((currentIds) => toggleId(currentIds, movie.id));
    void syncMovieAction(movie.id, "watching", shouldEnable);
  }

  function smoothScrollToSection(sectionId: string) {
    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    if (smoothScrollFrameRef.current) {
      window.cancelAnimationFrame(smoothScrollFrameRef.current);
    }

    const topbarHeight =
      document.querySelector<HTMLElement>(".topbar")?.offsetHeight ?? 0;
    const extraOffset = 18;
    const startY = window.scrollY;
    const targetY = Math.max(
      0,
      section.getBoundingClientRect().top + startY - topbarHeight - extraOffset,
    );
    const distance = targetY - startY;

    if (Math.abs(distance) < 4) {
      window.history.replaceState(null, "", `#${sectionId}`);
      return;
    }

    const duration = Math.min(1100, Math.max(560, Math.abs(distance) * 0.55));
    const startedAt = window.performance.now();

    const easeInOutCubic = (progress: number) => {
      return progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    };

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startedAt;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      window.scrollTo(0, startY + distance * easedProgress);

      if (progress < 1) {
        smoothScrollFrameRef.current =
          window.requestAnimationFrame(animateScroll);
        return;
      }

      smoothScrollFrameRef.current = null;
      window.history.replaceState(null, "", `#${sectionId}`);
    };

    smoothScrollFrameRef.current = window.requestAnimationFrame(animateScroll);
  }

  function handleSectionLink(
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) {
    event.preventDefault();
    smoothScrollToSection(sectionId);
  }

  useEffect(() => {
    return () => {
      if (smoothScrollFrameRef.current) {
        window.cancelAnimationFrame(smoothScrollFrameRef.current);
      }
    };
  }, []);

  return (
    <main className="movie-page">
      <style>{moviePageStyles}</style>

      <div className="ambient-bg" />

      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">
            <img
              src="/kinoluma-icon.png"
              alt="KinoLuma"
              className="logo-mark logo-image"
            />

            <div>
              <p className="logo-title">KinoLuma</p>
              <p className="logo-subtitle">{movie.type}</p>
            </div>
          </Link>

          <div className="top-actions">
            <Link href="/" className="ghost-button">
              В каталог
            </Link>

            <Link href="/profile" className="ghost-button">
              Профиль
            </Link>

            {isAdmin && (
              <Link
                href={`/admin/movies/${movie.slug}/edit`}
                className="ghost-button admin-edit-button"
              >
                Редактировать
              </Link>
            )}

            <a
              href="#player"
              onClick={(event) => handleSectionLink(event, "player")}
              className="ghost-button"
            >
              Смотреть
            </a>
          </div>
        </div>
      </header>

      <div className="page-shell">
        <section className="movie-hero">
          <aside className="poster-card animate-in">
            <Image
              src={posterSrc || "/kinoluma-icon.png"}
              alt={`Постер: ${movie.title}`}
              width={500}
              height={750}
              priority
              unoptimized
              sizes="(max-width: 768px) 78vw, 330px"
              className="poster-image"
              onError={() => {
                const fallbackPoster = movie.posterFallbacks?.find(
                  (fallback) => fallback !== posterSrc,
                );

                if (fallbackPoster) {
                  setPosterSrc(fallbackPoster);
                  return;
                }

                const generatedFallback = getGeneratedPosterFallback(
                  movie.title,
                );

                if (posterSrc !== generatedFallback) {
                  setPosterSrc(generatedFallback);
                }
              }}
            />

            <div className="poster-footer">
              <div>
                <span>Рейтинг</span>
                <strong>{ratingText}</strong>
              </div>

              <div>
                <span>Год</span>
                <strong>{movie.year}</strong>
              </div>

              <div>
                <span>Время</span>
                <strong>{duration}</strong>
              </div>
            </div>

            <div className="poster-genres-panel">
              <p className="poster-kicker">Жанры</p>

              <div className="poster-genre-list">
                {movie.genres.slice(0, 4).map((genre) => (
                  <span key={genre}>{genre}</span>
                ))}
              </div>
            </div>
          </aside>

          <section className="main-card animate-in delay-1">
            <div className="movie-title-row">
              <div>
                <p className="eyebrow">{movie.type}</p>

                <h1>{movie.title}</h1>

                <p className="original-title">{movie.originalTitle}</p>
              </div>

              <div className="rating-pill">{ratingText}</div>
            </div>

            <div className="genre-row">
              {movie.genres.map((genre) => (
                <span key={genre}>{genre}</span>
              ))}
            </div>

            <p className="description">{movie.description}</p>

            <div className="compact-actions">
              <a
                href="#player"
                onClick={(event) => handleSectionLink(event, "player")}
                className="primary-button"
              >
                Смотреть онлайн
              </a>

              <a
                href="#details"
                onClick={(event) => handleSectionLink(event, "details")}
                className="secondary-button"
              >
                Подробнее
              </a>

              {isAdmin && (
                <Link
                  href={`/admin/movies/${movie.slug}/edit`}
                  className="secondary-button admin-edit-inline"
                >
                  Редактировать
                </Link>
              )}
            </div>

            <div className="user-actions-card">
              <div className="user-actions-head">
                <div>
                  <p className="mini-eyebrow">Мои действия</p>
                  <h2>Статус фильма</h2>
                </div>

                {isWatching && <span className="watching-badge">Смотрю</span>}
              </div>

              <div className="action-buttons-grid">
                <button
                  type="button"
                  onClick={toggleWatchLater}
                  className={
                    isWatchLater
                      ? "movie-action-button movie-action-active"
                      : "movie-action-button"
                  }
                >
                  <span className="action-icon">◷</span>
                  <span>{isWatchLater ? "В списке" : "Смотреть позже"}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleWatching}
                  className={
                    isWatching
                      ? "movie-action-button movie-action-active"
                      : "movie-action-button"
                  }
                >
                  <span className="action-icon">▶</span>
                  <span>Смотрю</span>
                </button>

                <button
                  type="button"
                  onClick={toggleLiked}
                  className={
                    isLiked
                      ? "movie-action-button movie-action-active"
                      : "movie-action-button"
                  }
                >
                  <span className="action-icon">♡</span>
                  <span>Понравилось</span>
                </button>

                <button
                  type="button"
                  onClick={toggleDisliked}
                  className={
                    isDisliked
                      ? "movie-action-button movie-action-active"
                      : "movie-action-button"
                  }
                >
                  <span className="action-icon">✕</span>
                  <span>Не понравилось</span>
                </button>
              </div>
            </div>

            <div className="quick-facts">
              {quickFacts.map((fact) => (
                <article key={fact.label}>
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section
          id="player"
          ref={playerSectionRef}
          className="section-card player-card animate-in"
        >
          <div className="player-top">
            <div>
              <p className="eyebrow">Плеер</p>
              <h2>Смотреть {movie.type.toLowerCase()}</h2>
            </div>

            <div className="player-tabs" aria-label="Выбор плеера">
              {players.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setActivePlayerId(player.id)}
                  className={
                    activePlayer.id === player.id
                      ? "player-tab player-tab-active"
                      : "player-tab"
                  }
                >
                  {player.name}
                </button>
              ))}
            </div>
          </div>

          <div className="player-box">
            {!isPlayerVisible ? (
              <div className="player-placeholder">
                <div className="play-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 7.5V16.5L16.2 12L9 7.5Z" />
                  </svg>
                </div>

                <h3>Плеер загрузится при просмотре</h3>
                <p>Так страница быстрее открывается, а лишние скрипты не грузятся заранее.</p>
              </div>
            ) : isRendexPlayer(activePlayer) &&
            getRendexContentId(activePlayer) ? (
              <>
                <Script
                  id="rendex-sdk"
                  src={RENDEX_SCRIPT_SRC}
                  strategy="afterInteractive"
                />
                <div
                  key={`${activePlayer.id}-${getRendexContentId(activePlayer)}`}
                  className="rendex-player-frame"
                >
                  <ins
                    data-publisher-id={getRendexPublisherId(activePlayer)}
                    data-type={getRendexContentType(activePlayer, movie)}
                    data-id={getRendexContentId(activePlayer)}
                    data-design="1"
                    data-color1={getRendexColor(
                      activePlayer,
                      "color1",
                      "#56CEAA",
                    )}
                    data-color2={getRendexColor(
                      activePlayer,
                      "color2",
                      "#FFFFFF",
                    )}
                    data-color3={getRendexColor(
                      activePlayer,
                      "color3",
                      "#AEC7BC",
                    )}
                    data-color4={getRendexColor(
                      activePlayer,
                      "color4",
                      "#42BD88",
                    )}
                    data-color5={getRendexColor(
                      activePlayer,
                      "color5",
                      "#000000",
                    )}
                    data-width="100%"
                    data-height="100%"
                  />
                </div>
              </>
            ) : activePlayer.embedUrl ? (
              <>
                {isCollapsePlayer(activePlayer) ? (
                  <Script
                    id="collapse-actualize"
                    src={COLLAPSE_ACTUALIZE_SCRIPT_SRC}
                    strategy="afterInteractive"
                  />
                ) : null}
                <div
                  key={`${activePlayer.id}-${activePlayer.embedUrl}`}
                  className="player-iframe-shell"
                  dangerouslySetInnerHTML={{
                    __html: buildPlayerIframeHtml(activePlayer, movie),
                  }}
                />
              </>
            ) : isAnimePlayerUnavailable ? (
              <div className="player-placeholder">
                <div className="play-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 7.5V16.5L16.2 12L9 7.5Z" />
                  </svg>
                </div>

                <h3>Аниме временно недоступно</h3>

                <p>
                  Просмотр аниме сейчас временно недоступен из-за недостатка
                  плеера.
                </p>
              </div>
            ) : (
              <div className="player-placeholder">
                <div className="play-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 7.5V16.5L16.2 12L9 7.5Z" />
                  </svg>
                </div>

                <h3>{activePlayer.name}</h3>

                <p>Технические работы с плеерами, возвращайтесь позже.</p>
              </div>
            )}
          </div>
        </section>

        <section id="details" className="details-grid">
          <section className="section-card animate-in">
            <div className="section-head">
              <div>
                <p className="eyebrow">Информация</p>
                <h2>О фильме</h2>
              </div>
            </div>

            <div className="long-text">
              {detailParagraphs.map((paragraph, index) => (
                <p key={`${movie.slug}-details-${index}`}>{paragraph}</p>
              ))}
            </div>

            <div className="facts-grid">
              {visibleFacts.map((fact) => (
                <article key={fact.label} className="fact-card">
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                </article>
              ))}
            </div>

            <nav className="movie-internal-links" aria-label="Связанные разделы">
              <Link href={`/catalog/${catalogSlug}`}>
                Смотреть также: {movie.type.toLowerCase()}
              </Link>
              {movie.genres.slice(0, 4).map((genre) => (
                <Link
                  key={genre}
                  href={`/catalog/${catalogSlug}/${slugifyPublicGenre(genre)}`}
                >
                  {genre}
                </Link>
              ))}
              {similarMovies[0] ? (
                <Link href={`/movie/${similarMovies[0].slug}`}>
                  Похожее: {similarMovies[0].title}
                </Link>
              ) : null}
            </nav>
          </section>

          <section className="section-card animate-in delay-1">
            <div className="section-head">
              <div>
                <p className="eyebrow">Команда</p>
                <h2>Главные роли</h2>
              </div>
            </div>

            {cast.length > 0 ? (
              <div className="cast-list">
                {cast.map((person) => (
                  <article key={person.name} className="cast-card">
                    <div className="cast-info">
                      <h3>{person.name}</h3>
                      <p>{person.role}</p>
                    </div>

                    <div className="cast-avatar">
                      {getInitials(person.name)}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="long-text">
                Информация об актёрах для этого материала пока готовится.
              </p>
            )}
          </section>
        </section>

        <section id="faq" className="section-card faq-section animate-in">
          <div className="section-head similar-head">
            <div>
              <p className="eyebrow">FAQ</p>
              <h2>Вопросы о материале</h2>
            </div>

            <p></p>
          </div>

          <div className="faq-list">
            {faqItems.map((item) => (
              <article key={item.question} className="faq-item">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        {similarMovies.length > 0 && (
          <section
            id="similar"
            className="section-card similar-section animate-in"
          >
            <div className="section-head similar-head">
              <div>
                <p className="eyebrow">После этого</p>
                <h2>{relatedSectionTitle}</h2>
              </div>

              <p></p>
            </div>

            <div className="similar-grid">
              {similarMovies.map((item) => (
                <Link
                  key={item.id}
                  href={`/movie/${item.slug}`}
                  className="similar-card"
                  title={`${item.title} (${item.year}) смотреть онлайн ${getContentKind(item)}`}
                >
                  <div className="similar-poster-wrap">
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="similar-poster"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(event) => {
                        const fallbackPoster = item.posterFallbacks?.[0];

                        event.currentTarget.onerror = null;
                        event.currentTarget.src =
                          fallbackPoster ||
                          getGeneratedPosterFallback(item.title);
                      }}
                    />

                    <span className="similar-rating">{formatMovieRating(item.rating)}</span>
                  </div>

                  <div className="similar-info">
                    <span>
                      {item.year} · {item.type}
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.genres.slice(0, 2).join(" · ")}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}

const moviePageStyles = `
  * {
    box-sizing: border-box;
  }

  html,
  body {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    background: #050505;
  }

  html {
    scroll-behavior: smooth;
  }

  @supports (overflow: clip) {
    html,
    body,
    .movie-page {
      overflow-x: clip;
    }
  }

  img,
  iframe {
    max-width: 100%;
  }

  #player,
  #details,
  #similar {
    scroll-margin-top: 96px;
  }

  .movie-page {
    min-height: 100vh;
    overflow-x: hidden;
    background: #050505;
    color: #ffffff;
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
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 54px 54px;
    mask-image: linear-gradient(to bottom, rgba(0,0,0,0.42), transparent 66%);
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
    min-height: 76px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .brand {
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
    object-fit: cover;
    background: #050505;
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
    justify-content: flex-end;
    gap: 10px;
  }

  .ghost-button,
  .primary-button,
  .secondary-button,
  .player-tab,
  .movie-action-button {
    border: 0;
    font: inherit;
    text-decoration: none;
    cursor: pointer;
  }

  .ghost-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    padding: 0 16px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.035);
    color: #e8e8e8;
    font-size: 14px;
    font-weight: 900;
    transition:
      transform 180ms ease,
      background 180ms ease,
      color 180ms ease,
      border-color 180ms ease;
  }

  .ghost-button:hover {
    transform: translateY(-1px);
    border-color: rgba(255,255,255,0.35);
    background: #ffffff;
    color: #000000;
  }

  .admin-edit-button,
  .admin-edit-inline {
    border-color: rgba(255,255,255,0.28);
    background: rgba(255,255,255,0.10);
  }

  .page-shell {
    position: relative;
    z-index: 1;
    width: min(1180px, calc(100% - 40px));
    margin: 0 auto;
    padding: 28px 0 56px;
  }

  .movie-hero {
    width: 100%;
    min-width: 0;
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }

  .poster-card,
  .main-card,
  .section-card {
    border: 1px solid rgba(255,255,255,0.10);
    background:
      linear-gradient(145deg, rgba(28,28,28,0.82), rgba(8,8,8,0.92)),
      #0b0b0b;
    box-shadow: 0 30px 90px rgba(0,0,0,0.42);
    backdrop-filter: blur(24px);
  }

  .poster-card {
    overflow: hidden;
    border-radius: 30px;
  }

  .poster-image {
    display: block;
    width: 100%;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    background: #111111;
  }

  .poster-footer {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    padding: 12px;
    border-top: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.45);
  }

  .poster-footer div {
    min-width: 0;
    padding: 10px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.035);
  }

  .poster-footer span,
  .quick-facts span,
  .fact-card span {
    display: block;
    color: #858585;
    font-size: 11px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .poster-footer strong {
    display: block;
    margin-top: 7px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    line-height: 1;
    font-weight: 1000;
  }

  .poster-genres-panel {
    padding: 16px;
    border-top: 1px solid rgba(255,255,255,0.08);
    background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015));
  }

  .poster-kicker {
    margin: 0 0 10px;
    color: #777777;
    font-size: 11px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .poster-genre-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .poster-genre-list span {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.13);
    background: rgba(255,255,255,0.045);
    color: #f1f1f1;
    font-size: 12px;
    font-weight: 900;
  }

  .main-card {
    position: relative;
    overflow: hidden;
    min-width: 0;
    min-height: 420px;
    border-radius: 30px;
    padding: 30px;
  }

  .main-card::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 18% 20%, rgba(255,255,255,0.10), transparent 28%),
      linear-gradient(135deg, rgba(255,255,255,0.06), transparent 38%);
    opacity: 0.9;
  }

  .main-card > * {
    position: relative;
    z-index: 1;
  }

  .movie-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }

  .eyebrow {
    margin: 0;
    color: #858585;
    font-size: 12px;
    font-weight: 1000;
    letter-spacing: 0.36em;
    text-transform: uppercase;
  }

  .main-card h1 {
    max-width: 720px;
    margin: 14px 0 0;
    font-size: clamp(42px, 6vw, 72px);
    line-height: 0.95;
    font-weight: 1000;
    letter-spacing: -0.08em;
  }

  .original-title {
    margin: 12px 0 0;
    color: #8a8a8a;
    font-size: 18px;
    font-weight: 850;
  }

  .rating-pill {
    flex: 0 0 auto;
    height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #ffffff;
    color: #000000;
    padding: 0 16px;
    font-size: 14px;
    font-weight: 1000;
    box-shadow: 0 0 28px rgba(255,255,255,0.12);
  }

  .genre-row {
    margin-top: 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .genre-row span {
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.045);
    padding: 8px 12px;
    color: #e5e5e5;
    font-size: 13px;
    font-weight: 850;
  }

  .description,
  .long-text {
    color: #b6b6b6;
    font-size: 15px;
    line-height: 1.8;
    font-weight: 650;
  }

  .description {
    max-width: 760px;
    margin: 24px 0 0;
  }
  .long-text {
    display: grid;
    gap: 14px;
    margin: 0;
  }

  .long-text p {
    margin: 0;
  }

  .movie-internal-links {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 20px;
  }

  .movie-internal-links a {
    display: inline-flex;
    min-height: 34px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 999px;
    background: rgba(255,255,255,0.045);
    padding: 0 12px;
    color: #e5e5e5;
    font-size: 12px;
    font-weight: 900;
    text-decoration: none;
    transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
  }

  .movie-internal-links a:hover {
    transform: translateY(-1px);
    border-color: rgba(255,255,255,0.28);
    background: rgba(255,255,255,0.09);
  }


  .compact-actions {
    margin-top: 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .primary-button,
  .secondary-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    border-radius: 14px;
    padding: 0 16px;
    font-size: 14px;
    font-weight: 1000;
    transition:
      transform 180ms ease,
      background 180ms ease,
      color 180ms ease,
      border-color 180ms ease,
      box-shadow 180ms ease;
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

  .user-actions-card {
    margin-top: 24px;
    padding: 16px;
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.10);
    background:
      linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.018)),
      rgba(0,0,0,0.40);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.08),
      0 16px 36px rgba(0,0,0,0.18);
  }

  .user-actions-head {
    margin-bottom: 14px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }

  .mini-eyebrow {
    margin: 0;
    color: #858585;
    font-size: 11px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .user-actions-head h2 {
    margin: 7px 0 0;
    color: #ffffff;
    font-size: 20px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -0.05em;
  }

  .watching-badge {
    flex: 0 0 auto;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.18);
    background: #ffffff;
    color: #000000;
    padding: 8px 11px;
    font-size: 12px;
    line-height: 1;
    font-weight: 1000;
  }

  .action-buttons-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .movie-action-button {
    min-width: 0;
    min-height: 46px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.38);
    color: #d8d8d8;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 1000;
    transition:
      transform 180ms ease,
      background 180ms ease,
      color 180ms ease,
      border-color 180ms ease,
      box-shadow 180ms ease;
  }

  .movie-action-button:hover {
    transform: translateY(-2px);
    border-color: rgba(255,255,255,0.28);
    background: rgba(255,255,255,0.07);
    color: #ffffff;
  }

  .movie-action-active {
    background: #ffffff;
    color: #000000;
    border-color: #ffffff;
    box-shadow: 0 14px 34px rgba(255,255,255,0.10);
  }

  .movie-action-active:hover {
    background: #ffffff;
    color: #000000;
  }

  .action-icon {
    flex: 0 0 auto;
    font-size: 15px;
    line-height: 1;
  }

  .movie-action-button span:last-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .quick-facts {
    margin-top: 26px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .quick-facts article {
    min-width: 0;
    min-height: 84px;
    padding: 16px;
    border-radius: 22px;
    border: 1px solid rgba(255,255,255,0.10);
    background:
      linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.018)),
      rgba(0,0,0,0.40);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.08),
      0 16px 36px rgba(0,0,0,0.18);
  }

  .quick-facts strong {
    display: block;
    margin-top: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #ffffff;
    font-size: 20px;
    line-height: 1.1;
    font-weight: 1000;
    letter-spacing: -0.04em;
  }

  .section-card {
    min-width: 0;
    overflow: hidden;
    border-radius: 30px;
    padding: 24px;
  }

  .player-card {
    width: 100%;
    max-width: 100%;
    margin-top: 20px;
  }

  .player-top {
    margin-bottom: 18px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }

  .player-top h2,
  .section-head h2 {
    margin: 8px 0 0;
    font-size: 28px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -0.05em;
  }

  .player-tabs {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  .player-tab {
    min-height: 38px;
    border-radius: 13px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.035);
    color: #d8d8d8;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 1000;
    transition:
      transform 180ms ease,
      background 180ms ease,
      color 180ms ease,
      border-color 180ms ease;
  }

  .player-tab:hover {
    transform: translateY(-1px);
    border-color: rgba(255,255,255,0.28);
    background: rgba(255,255,255,0.07);
    color: #ffffff;
  }

  .player-tab-active {
    background: #ffffff;
    color: #000000;
    border-color: #ffffff;
    box-shadow: 0 14px 34px rgba(255,255,255,0.10);
  }

  .player-tab-active:hover {
    background: #ffffff;
    color: #000000;
  }

  .player-box {
    position: relative;
    overflow: hidden;
    aspect-ratio: 16 / 9;
    border-radius: 26px;
    border: 1px solid rgba(255,255,255,0.10);
    background:
      radial-gradient(circle at center, rgba(255,255,255,0.07), transparent 34%),
      #000000;
  }

  .player-box::before {
    content: none;
    display: none;
    padding-top: 0;
  }

  .rendex-player-frame,
  .player-iframe-shell,
  .player-iframe {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: #000000;
  }

  .player-iframe-shell > iframe {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: #000000;
  }

  .player-placeholder {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    align-content: center;
    padding: 24px;
    text-align: center;
  }

  .play-icon {
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.045);
  }

  .play-icon svg {
    width: 28px;
    height: 28px;
    fill: #ffffff;
  }

  .player-placeholder h3 {
    margin: 16px 0 0;
    font-size: 24px;
    line-height: 1.1;
    font-weight: 1000;
    letter-spacing: -0.04em;
  }

  .player-placeholder p {
    max-width: 420px;
    margin: 10px auto 0;
    color: #858585;
    font-size: 14px;
    line-height: 1.65;
    font-weight: 700;
  }

  .details-grid {
    width: 100%;
    min-width: 0;
    margin-top: 20px;
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
    gap: 20px;
    align-items: start;
  }

  .section-head {
    margin-bottom: 20px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }

  .long-text {
    margin: 0;
  }

  .facts-grid {
    margin-top: 22px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .fact-card {
    min-width: 0;
    min-height: 86px;
    padding: 16px;
    border-radius: 22px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.42);
  }

  .fact-card strong {
    display: block;
    margin-top: 10px;
    overflow-wrap: anywhere;
    color: #ffffff;
    font-size: 18px;
    line-height: 1.2;
    font-weight: 1000;
    letter-spacing: -0.04em;
  }

  .cast-list {
    display: grid;
    gap: 10px;
  }

  .cast-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    min-width: 0;
    padding: 13px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.42);
    transition:
      transform 180ms ease,
      border-color 180ms ease,
      background 180ms ease;
  }

  .cast-card:hover {
    transform: translateY(-2px);
    border-color: rgba(255,255,255,0.22);
    background: rgba(255,255,255,0.055);
  }

  .cast-info {
    min-width: 0;
  }

  .cast-info h3 {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #ffffff;
    font-size: 15px;
    line-height: 1.15;
    font-weight: 1000;
  }

  .cast-info p {
    margin: 6px 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #858585;
    font-size: 13px;
    font-weight: 750;
  }

  .cast-avatar {
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: #ffffff;
    color: #000000;
    font-size: 12px;
    font-weight: 1000;
  }


  .faq-section {
    margin-top: 24px;
  }

  .faq-list {
    display: grid;
    gap: 12px;
  }

  .faq-item {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.035);
    padding: 18px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
  }

  .faq-item h3 {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 1000;
    color: #ffffff;
  }

  .faq-item p {
    margin: 0;
    color: #b5b5b5;
    font-size: 14px;
    line-height: 1.7;
  }

  .similar-section {
    margin-top: 22px;
    border-radius: 30px;
    padding: 24px;
  }

  .similar-head {
    align-items: flex-start;
  }

  .similar-head p:last-child {
    max-width: 430px;
    margin: 0;
    color: #8b8b8b;
    font-size: 13px;
    line-height: 1.7;
    font-weight: 750;
  }

  .similar-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 14px;
    margin-top: 20px;
  }

  .similar-card {
    min-width: 0;
    overflow: hidden;
    border-radius: 22px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.035);
    color: inherit;
    text-decoration: none;
    transition:
      transform 220ms ease,
      border-color 220ms ease,
      background 220ms ease,
      box-shadow 220ms ease;
  }

  .similar-card:hover {
    transform: translateY(-5px);
    border-color: rgba(255,255,255,0.28);
    background: rgba(255,255,255,0.07);
    box-shadow: 0 22px 52px rgba(0,0,0,0.36);
  }

  .similar-poster-wrap {
    position: relative;
    overflow: hidden;
    aspect-ratio: 2 / 3;
    background: #111111;
  }

  .similar-poster {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 420ms ease;
  }

  .similar-card:hover .similar-poster {
    transform: scale(1.05);
  }

  .similar-rating {
    position: absolute;
    top: 10px;
    right: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    padding: 0 9px;
    border-radius: 999px;
    background: rgba(255,255,255,0.92);
    color: #000000;
    font-size: 11px;
    font-weight: 1000;
  }

  .similar-info {
    padding: 12px;
  }

  .similar-info span {
    display: block;
    color: #777777;
    font-size: 11px;
    font-weight: 1000;
  }

  .similar-info h3 {
    margin: 7px 0 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    min-height: 38px;
    color: #ffffff;
    font-size: 14px;
    line-height: 1.35;
    font-weight: 1000;
  }

  .similar-info p {
    margin: 8px 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #8d8d8d;
    font-size: 12px;
    font-weight: 800;
  }

  .animate-in {
    animation: fadeUp 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .delay-1 {
    animation-delay: 80ms;
  }

  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(14px) scale(0.99);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 1120px) {
    .action-buttons-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .similar-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @media (max-width: 980px) {
    .movie-hero,
    .details-grid {
      grid-template-columns: 1fr;
    }

    .poster-card {
      max-width: 340px;
      margin: 0 auto;
    }

    .main-card {
      min-height: auto;
    }

    .quick-facts {
      grid-template-columns: 1fr;
    }

    .player-top {
      align-items: flex-start;
      flex-direction: column;
    }

    .player-tabs {
      justify-content: flex-start;
    }

    .similar-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .similar-head {
      flex-direction: column;
      gap: 12px;
    }
  }

  @media (max-width: 640px) {
    .topbar-inner,
    .page-shell {
      width: min(100% - 24px, 1180px);
    }

    .topbar-inner {
      min-height: 68px;
    }

    .logo-mark {
      width: 38px;
      height: 38px;
      border-radius: 13px;
    }

    .logo-title {
      font-size: 18px;
    }

    .top-actions {
      gap: 7px;
    }

    .ghost-button {
      min-height: 36px;
      padding: 0 10px;
      border-radius: 12px;
      font-size: 12px;
    }

    .page-shell {
      padding-top: 16px;
      padding-bottom: 32px;
    }

    .movie-hero,
    .details-grid {
      gap: 14px;
    }

    .similar-section {
      padding: 16px;
      border-radius: 24px;
    }

    .similar-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .poster-card,
    .main-card,
    .section-card {
      border-radius: 24px;
    }

    .main-card,
    .section-card {
      padding: 18px;
    }

    .main-card h1 {
      font-size: 38px;
      letter-spacing: -0.07em;
    }

    .movie-title-row {
      flex-direction: column;
      gap: 14px;
    }

    .rating-pill {
      height: 38px;
    }

    .description,
    .long-text {
      font-size: 14px;
      line-height: 1.75;
    }

    .compact-actions {
      width: 100%;
      flex-direction: column;
    }

    .primary-button,
    .secondary-button {
      width: 100%;
      min-height: 42px;
    }

    .poster-footer {
      grid-template-columns: 1fr;
    }

    .action-buttons-grid {
      grid-template-columns: 1fr;
    }

    .user-actions-head {
      align-items: flex-start;
      flex-direction: column;
    }

    .watching-badge {
      width: fit-content;
    }

    .player-tabs {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr;
    }

    .player-tab {
      width: 100%;
    }

    .player-box::before {
      content: none;
      display: none;
      padding-top: 0;
    }

    .player-placeholder h3 {
      font-size: 20px;
    }

    .player-placeholder p {
      font-size: 13px;
    }

    .player-top h2,
    .section-head h2 {
      font-size: 24px;
    }

    .facts-grid {
      grid-template-columns: 1fr;
    }
  }
  /* mobile polish for KinoLuma movie page */

  @media (max-width: 760px) {
    #player,
    #details,
    #similar {
      scroll-margin-top: 84px;
    }

    .movie-page {
      width: 100%;
      min-width: 0;
      overflow-x: hidden;
      padding-bottom: calc(96px + env(safe-area-inset-bottom));
    }

    .topbar {
      position: sticky;
      top: 0;
    }

    .topbar-inner {
      width: 100%;
      min-height: 64px;
      padding-inline: max(12px, env(safe-area-inset-left));
      padding-right: max(12px, env(safe-area-inset-right));
    }

    .brand,
    .brand > div,
    .top-actions {
      min-width: 0;
    }

    .logo-title,
    .logo-subtitle {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .top-actions {
      flex: 0 0 auto;
      gap: 7px;
    }

    .top-actions .ghost-button:nth-child(2),
    .top-actions .ghost-button:nth-child(3) {
      display: none;
    }

    .ghost-button {
      min-height: 36px;
      padding: 0 10px;
      border-radius: 12px;
      font-size: 12px;
    }

    .page-shell {
      width: 100%;
      max-width: 1180px;
      margin: 0 auto;
      padding: 14px 12px 26px;
    }

    .movie-hero,
    .details-grid {
      width: 100%;
      min-width: 0;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 14px;
    }

    .poster-card {
      width: min(100%, 310px);
      max-width: 310px;
      margin-inline: auto;
      box-shadow: 0 28px 80px rgba(0,0,0,0.55);
    }

    .poster-footer {
      grid-template-columns: 1fr;
    }

    .main-card,
    .section-card {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      padding: 18px;
      border-radius: 24px;
    }

    .main-card {
      background:
        radial-gradient(circle at 20% 0%, rgba(255,255,255,0.12), transparent 34%),
        linear-gradient(145deg, rgba(24,24,24,0.92), rgba(5,5,5,0.96));
    }

    .movie-title-row {
      flex-direction: column;
      gap: 14px;
    }

    .main-card h1 {
      font-size: clamp(34px, 11vw, 46px);
      line-height: 0.98;
      letter-spacing: -0.07em;
    }

    .original-title {
      font-size: 15px;
      line-height: 1.35;
    }

    .rating-pill {
      height: 38px;
    }

    .genre-row {
      max-width: calc(100% + 36px);
      flex-wrap: nowrap;
      overflow-x: auto;
      margin-inline: -18px;
      padding-inline: 18px;
      padding-bottom: 4px;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }

    .genre-row::-webkit-scrollbar {
      display: none;
    }

    .genre-row span {
      flex: 0 0 auto;
    }

    .description,
    .long-text {
      font-size: 14px;
      line-height: 1.75;
    }

    .compact-actions {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 9px;
    }

    .primary-button,
    .secondary-button {
      width: 100%;
      min-height: 48px;
      border-radius: 16px;
      padding-inline: 12px;
      font-size: 13px;
    }

    .user-actions-card {
      width: 100%;
      border-radius: 22px;
      padding: 14px;
    }

    .user-actions-head {
      align-items: flex-start;
      flex-direction: column;
    }

    .watching-badge {
      width: fit-content;
    }

    .action-buttons-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 9px;
    }

    .movie-action-button {
      min-height: 52px;
      flex-direction: column;
      gap: 5px;
      padding: 8px;
      border-radius: 17px;
      font-size: 11px;
      line-height: 1.12;
    }

    .action-icon {
      font-size: 17px;
    }

    .quick-facts {
      grid-template-columns: 1fr;
      gap: 9px;
    }

    .quick-facts article,
    .fact-card {
      min-height: auto;
      padding: 14px;
      border-radius: 18px;
    }

    .player-card {
      width: 100%;
      margin-top: 14px;
    }

    .player-top {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: start;
      gap: 14px;
      margin-bottom: 14px;
    }

    .player-top h2,
    .section-head h2 {
      font-size: 24px;
    }

    .player-tabs {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      overflow: visible;
      padding-bottom: 0;
    }

    .player-tab {
      width: 100%;
      min-width: 0;
      min-height: 42px;
      padding: 0 8px;
      border-radius: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .player-box {
      width: 100%;
      max-width: 100%;
      border-radius: 22px;
    }

    .player-box::before {
      content: none;
      display: none;
      padding-top: 0;
    }

    .player-placeholder {
      padding: 16px 14px;
    }

    .play-icon {
      width: 50px;
      height: 50px;
      border-radius: 18px;
    }

    .play-icon svg {
      width: 25px;
      height: 25px;
    }

    .player-placeholder h3 {
      margin-top: 14px;
      font-size: 20px;
    }

    .player-placeholder p {
      max-width: 300px;
      font-size: 13px;
      line-height: 1.55;
    }

    .section-head {
      align-items: flex-start;
      flex-direction: column;
      gap: 10px;
    }

    .facts-grid {
      grid-template-columns: 1fr;
      gap: 9px;
    }

    .cast-card {
      border-radius: 18px;
    }

    .similar-section {
      width: 100%;
      margin-top: 14px;
      margin-inline: 0;
      padding: 18px 0;
      border-radius: 24px;
    }

    .similar-head {
      padding-inline: 18px;
    }

    .similar-head p:last-child {
      max-width: none;
    }

    .similar-grid {
      width: 100%;
      display: flex;
      grid-template-columns: none;
      gap: 12px;
      overflow-x: auto;
      margin-top: 16px;
      padding: 0 18px 8px;
      scroll-padding-inline: 18px;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }

    .similar-grid::-webkit-scrollbar {
      display: none;
    }

    .similar-card {
      flex: 0 0 154px;
      scroll-snap-align: start;
      border-radius: 20px;
    }

    .similar-info h3 {
      font-size: 13px;
    }
  }

  @media (max-width: 390px) {
    .topbar-inner {
      min-height: 62px;
      padding-inline: 9px;
    }

    .page-shell {
      padding-inline: 9px;
    }

    .logo-subtitle {
      display: none;
    }

    .ghost-button {
      min-height: 34px;
      padding-inline: 9px;
    }

    .poster-card {
      max-width: 286px;
    }

    .main-card,
    .section-card {
      padding: 16px;
      border-radius: 22px;
    }

    .genre-row {
      max-width: calc(100% + 32px);
      margin-inline: -16px;
      padding-inline: 16px;
    }

    .compact-actions {
      grid-template-columns: 1fr;
    }

    .player-tabs {
      gap: 6px;
    }

    .player-tab {
      min-height: 38px;
      padding-inline: 6px;
      font-size: 12px;
    }

    .player-placeholder {
      padding-inline: 12px;
    }

    .play-icon {
      width: 46px;
      height: 46px;
      border-radius: 16px;
    }

    .player-placeholder h3 {
      font-size: 19px;
    }

    .player-placeholder p {
      font-size: 12px;
      line-height: 1.45;
    }

    .similar-card {
      flex-basis: 146px;
    }
  }

`;
