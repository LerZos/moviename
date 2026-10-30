"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import VibixPlayer from "../../components/VibixPlayer";
import { useVibixLookup } from "../../lib/useVibixLookup";
import { isVibixPlayer, isUsableSavedPlayer, mergePlayerOptions, selectedPlayer, stablePlayerKey, VIBIX_STATUS_TEXT, VIBIX_PLAN_TEXT, type VibixPlan, type PlayerSelection } from "../../lib/vibix";
import MobileBottomNav from "../../components/MobileBottomNav";
import PosterImage, { syncPosterBackground } from "../../components/PosterImage";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Movie, MovieFact, MovieSeason, PlayerProvider } from "../../data/movies";
import type { MovieCardIndexItem } from "../../data/movieCardIndex";
import {
  buildCreditDisplayGroups,
  getVisibleCreditPeople,
  normalizeCatalogCredits,
  shouldShowMovieFact,
  type CreditDisplayGroup,
} from "../../lib/movies/credits";
import { formatMovieRating } from "../../lib/movies/rating";
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
} from "../../lib/players";

type MoviePageClientProps = {
  movie: Movie;
  relatedMovies?: MovieCardIndexItem[];
  vibixPlan?: VibixPlan;
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


const VIBIX_PLAYER_THEME: Record<string, string> = {
  design: "1",
  color1: "#2d3043",
  color2: "#ffffff",
  color3: "#0f101a",
  color4: "#2d3043",
  color5: "#ffffff",
};


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

function withVibixPlayerTheme(player: PlayerProvider, src: string) {
  const record = player as PlayerProvider & Record<string, unknown>;
  const type = String(record.type || "").toLowerCase();
  const provider = String(record.provider || "").toLowerCase();
  const looksLikeVibix =
    type === "vibix" ||
    type === "vibix-iframe" ||
    provider === "vibix" ||
    src.includes("vibix.org") ||
    src.includes("/room-") ||
    src.includes("room=");

  if (!looksLikeVibix) return src;

  try {
    const themedUrl = new URL(src);
    Object.entries(VIBIX_PLAYER_THEME).forEach(([key, value]) => {
      themedUrl.searchParams.set(key, value);
    });
    themedUrl.searchParams.set("sharing", "false");
    themedUrl.searchParams.set("episodesOpen", "false");
    return themedUrl.toString();
  } catch {
    return src;
  }
}

function buildPlayerIframeHtml(player: PlayerProvider, movie: Movie) {
  const embedSrc = withVibixPlayerTheme(player, getSafePlayerEmbedUrl(player.embedUrl || ""));
  const src = escapeHtmlAttribute(embedSrc);
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

function CreditPersonCard({ person }: {
  person: CreditDisplayGroup["people"][number];
}) {
  return (
    <article className="cast-card">
      <p className="cast-line">
        <strong>{person.name}</strong>
        {person.role ? (
          <>
            <span aria-hidden="true"> — </span>
            <span>{person.role}</span>
          </>
        ) : null}
      </p>
      <div className="cast-avatar" aria-hidden="true">{getInitials(person.name)}</div>
    </article>
  );
}

function CreditGroupList({ group }: { group: CreditDisplayGroup }) {
  const [expanded, setExpanded] = useState(false);
  const visiblePeople = getVisibleCreditPeople(group.people, false);
  const additionalPeople = group.people.slice(visiblePeople.length);
  const hiddenCount = additionalPeople.length;
  const listId = `credit-group-${group.key}`;
  const additionalListId = `${listId}-additional`;

  return (
    <div
      className="credits-group"
      data-compact={group.people.length === 1 ? "true" : undefined}
    >
      <h3 className="credits-group-title">{group.title}</h3>
      <div id={listId} className="cast-list">
        {visiblePeople.map((person) => (
          <CreditPersonCard
            key={`${group.key}-${person.name}`}
            person={person}
          />
        ))}
      </div>
      {hiddenCount > 0 ? (
        <>
          <div
            id={additionalListId}
            className={expanded ? "credits-reveal-panel is-open" : "credits-reveal-panel"}
            aria-hidden={!expanded}
          >
            <div className="credits-reveal-panel-inner">
              <div className="cast-list cast-list-additional">
                {additionalPeople.map((person) => (
                  <CreditPersonCard
                    key={`${group.key}-${person.name}`}
                    person={person}
                  />
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="credits-toggle"
            aria-expanded={expanded}
            aria-controls={additionalListId}
            onClick={() => setExpanded((value) => !value)}
          >
            <span>{expanded ? "Скрыть" : `Показать ещё ${hiddenCount}`}</span>
            <svg className="credits-toggle-chevron" viewBox="0 0 20 20" aria-hidden="true">
              <path d="m5 7.5 5 5 5-5" />
            </svg>
          </button>
        </>
      ) : null}
    </div>
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

function EpisodeSeasonAccordion({
  season,
  initiallyOpen,
  title,
}: {
  season: MovieSeason;
  initiallyOpen: boolean;
  title?: string;
}) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [isMounted, setIsMounted] = useState(initiallyOpen);
  const requestedOpen = useRef(initiallyOpen);
  const frame = useRef<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = `episode-season-${season.season}-panel`;

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
  }, []);

  function toggleSeason() {
    const nextOpen = !requestedOpen.current;
    requestedOpen.current = nextOpen;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    frame.current = null;
    closeTimer.current = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (nextOpen) {
      setIsMounted(true);
      if (reducedMotion || isMounted) {
        setIsOpen(true);
      } else {
        // Paint the newly mounted list at 0fr before starting the existing CSS transition.
        frame.current = requestAnimationFrame(() => {
          frame.current = requestAnimationFrame(() => {
            frame.current = null;
            if (requestedOpen.current) setIsOpen(true);
          });
        });
      }
    } else {
      setIsOpen(false);
      if (reducedMotion) {
        setIsMounted(false);
      } else {
        // Fallback if transitionend is lost (e.g. motion preference changes).
        closeTimer.current = setTimeout(() => {
          closeTimer.current = null;
          if (!requestedOpen.current) setIsMounted(false);
        }, 350);
      }
    }
  }

  return (
    <section className="episode-season">
      <button
        type="button"
        className="episode-season-trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={toggleSeason}
      >
        <span>{title || `Сезон ${season.season}`}</span>
        <span className="episode-season-meta">
          <span>
            {season.episodes.length}{" "}
            {formatRussianCount(season.episodes.length, "серия", "серии", "серий")}
          </span>
          <svg
            className="episode-season-chevron"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </span>
      </button>
      <div
        id={panelId}
        className={isOpen ? "episode-season-panel is-open" : "episode-season-panel"}
        aria-hidden={!isOpen}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget &&
              event.propertyName === "grid-template-rows" && !requestedOpen.current) {
            if (closeTimer.current !== null) clearTimeout(closeTimer.current);
            closeTimer.current = null;
            setIsMounted(false);
          }
        }}
      >
        <div className="episode-season-panel-inner">
          {isMounted ? <ol className="episode-list">
            {season.episodes.map((episode) => (
              <li key={`${season.season}-${episode.number}`} className="episode-item">
                <span className="episode-number">{String(episode.number).padStart(2, "0")}</span>
                <span className="episode-titles">
                  <strong>{episode.russianTitle || episode.originalTitle || `Серия ${episode.number}`}</strong>
                  {episode.russianTitle && episode.originalTitle && episode.russianTitle !== episode.originalTitle
                    ? <span>{episode.originalTitle}</span> : null}
                </span>
                {episode.airDate ? <time dateTime={episode.airDate}>
                  {episode.airDate.split("-").reverse().join(".")}
                </time> : null}
              </li>
            ))}
          </ol> : null}
        </div>
      </div>
    </section>
  );
}

function formatRussianCount(count: number, one: string, few: string, many: string) {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  const last = count % 10;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export default function MoviePageClient({
  movie,
  relatedMovies = [],
  vibixPlan,
}: MoviePageClientProps) {
  const movieKey = `${movie.canonicalMovieId || movie.id}:${movie.slug}`;
  const [visibleMovieKey, setVisibleMovieKey] = useState<string | null>(null);
  const isPlayerVisible = visibleMovieKey === movieKey;
  const currentVibixPlan = vibixPlan?.movieKey === movieKey ? vibixPlan : null;
  const savedPlayers = useMemo(() => (movie.players || []).filter(isUsableSavedPlayer), [movie.players]);
  const vibixLookup = useVibixLookup({
    movieKey, kpId: movie.kinopoiskId || getFallbackKinopoiskIdBySlug(movie.slug),
    imdbId: movie.imdbId, movieType: movie.type,
    // Direct SDK selection never needs an API token or a lookup request.
    // Keep the existing lookup for legacy callers without a prepared plan.
    enabled: !vibixPlan && isPlayerVisible && !savedPlayers.some(isVibixPlayer),
  });
  const vibixRendexData = vibixLookup.player;

  const generatedPlayers = useMemo(
    () =>
      buildAutoPlayers({
        slug: movie.slug,
        kinopoiskId: movie.kinopoiskId,
        imdbId: movie.imdbId,
        movieType: movie.type,
        genres: movie.genres,
      }),
    [
      movie.genres,
      movie.imdbId,
      movie.kinopoiskId,
      movie.slug,
      movie.type,
    ],
  );

  const players = useMemo(() => {
    const vibixPlayer = vibixRendexData ? [vibixRendexData] : [];
    // Saved/manual variants win over a late lookup of the same iframe.
    const preferredVibix = currentVibixPlan?.status === "verified" || currentVibixPlan?.status === "external";
    const retainedPlayers = currentVibixPlan
      ? savedPlayers.filter((player) => !isVibixPlayer(player) || currentVibixPlan.players.some((allowed) => stablePlayerKey(allowed) === stablePlayerKey(player)))
      : savedPlayers;
    const mergedPlayers = currentVibixPlan
      ? preferredVibix
        ? mergePlayerOptions(currentVibixPlan.players, generatedPlayers, retainedPlayers)
        : mergePlayerOptions(generatedPlayers, retainedPlayers)
      : mergePlayerOptions(generatedPlayers, savedPlayers, vibixPlayer);

    if (mergedPlayers.length > 0) {
      return normalizePlayerButtonNames(mergedPlayers);
    }

    return DEFAULT_PLAYERS;
  }, [generatedPlayers, savedPlayers, vibixRendexData, currentVibixPlan]);

  const facts = useMemo(
    () =>
      movie.facts && movie.facts.length > 0
        ? movie.facts
        : getDefaultFacts(movie),
    [movie],
  );

  const similarMovies = useMemo(() => relatedMovies, [relatedMovies]);

  const credits = useMemo(() => normalizeCatalogCredits(movie), [movie]);
  const creditGroups = useMemo(() => buildCreditDisplayGroups(credits), [credits]);
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
    const customFaqItems = (movie.faq || [])
      .filter((item) => item.question?.trim() && item.answer?.trim())
      .slice(0, 6);

    if (customFaqItems.length >= 3) {
      return customFaqItems;
    }

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

  const [selection, setSelection] = useState<PlayerSelection | null>(null);
  const [posterSrc, setPosterSrc] = useState(movie.poster);
  const [posterIdentity, setPosterIdentity] = useState(`${movie.slug}:${movie.poster}`);
  const smoothScrollFrameRef = useRef<number | null>(null);
  const playerSectionRef = useRef<HTMLElement | null>(null);

  const [watchLaterIds, setWatchLaterIds] = useState<number[]>([]);
  const [likedItemIds, setLikedItemIds] = useState<number[]>([]);
  const [dislikedItemIds, setDislikedItemIds] = useState<number[]>([]);
  const [watchingItemIds, setWatchingItemIds] = useState<number[]>([]);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const activePlayer = selectedPlayer(players, selection, movieKey);
  // Adjust identity-bound state before committing children: no stale iframe is
  // mounted for the next movie and no effect resets a later user selection.
  const activePlayerKey = stablePlayerKey(activePlayer);
  if (selection?.movieKey !== movieKey || selection.playerKey !== activePlayerKey) {
    setSelection({ movieKey, playerKey: activePlayerKey });
  }
  if (posterIdentity !== `${movie.slug}:${movie.poster}`) {
    setPosterIdentity(`${movie.slug}:${movie.poster}`);
    setPosterSrc(movie.poster);
  }

  useEffect(() => {
    if (isPlayerVisible) return;

    const section = playerSectionRef.current;
    if (!section) return;

    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setVisibleMovieKey(movieKey));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        setVisibleMovieKey(movieKey);
        observer.disconnect();
      },
      { rootMargin: "360px 0px", threshold: 0.01 },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [isPlayerVisible, movieKey]);

  const visibleFacts = useMemo(
    () => facts.filter((fact) => isVisibleFact(fact) && shouldShowMovieFact(fact.label, credits)),
    [credits, facts],
  );
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
              className="kinoluma-poster-image poster-image"
              onLoad={(event) => syncPosterBackground(event.currentTarget)}
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
                  key={stablePlayerKey(player)}
                  type="button"
                  aria-pressed={stablePlayerKey(activePlayer) === stablePlayerKey(player)}
                  onClick={() => setSelection({ movieKey, playerKey: stablePlayerKey(player) })}
                  className={
                    activePlayerKey === stablePlayerKey(player)
                      ? "player-tab player-tab-active"
                      : "player-tab"
                  }
                >
                  {player.name}
                </button>
              ))}
            </div>
          </div>

          {currentVibixPlan && VIBIX_PLAN_TEXT[currentVibixPlan.status] ? (
            <p role="status" aria-live="polite" style={{ color: "#b8b8c2", fontSize: 13, marginBottom: 12 }}>
              {VIBIX_PLAN_TEXT[currentVibixPlan.status]}
            </p>
          ) : null}
          {VIBIX_STATUS_TEXT[vibixLookup.status] ? (
            <p role="status" aria-live="polite" style={{ color: "#b8b8c2", fontSize: 13, marginBottom: 12 }}>
              {VIBIX_STATUS_TEXT[vibixLookup.status]}
            </p>
          ) : null}
          <div className={isVibixPlayer(activePlayer) ? "player-box player-box-vibix" : "player-box"}>
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
            ) : isVibixPlayer(activePlayer) ? (
              <VibixPlayer key={`${movieKey}:${stablePlayerKey(activePlayer)}`} player={activePlayer} title={movie.title} movieType={movie.type} />
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
                  key={`${movieKey}:${stablePlayerKey(activePlayer)}`}
                  className="player-iframe-shell"
                  dangerouslySetInnerHTML={{
                    __html: buildPlayerIframeHtml(activePlayer, movie),
                  }}
                />
              </>
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

          <section className="section-card credits-section animate-in delay-1">
            <div className="section-head">
              <div>
                <p className="eyebrow">Команда</p>
                <h2>Команда и персонажи</h2>
              </div>
            </div>

            {creditGroups.length > 0 ? (
              <div className="credits-groups">
                {creditGroups.map((group) => (
                  <CreditGroupList key={group.key} group={group} />
                ))}
              </div>
            ) : (
              <p className="long-text">
                Информация о команде и персонажах пока готовится.
              </p>
            )}
          </section>
        </section>

        {movie.episodeGuide?.length ? (
          <section className="section-card episode-guide animate-in" aria-labelledby="episode-guide-title">
            <div className="section-head">
              <div>
                <p className="eyebrow">Эпизоды</p>
                <h2 id="episode-guide-title">Сезоны и серии</h2>
              </div>
              <p className="episode-guide-total">
                {movie.episodeGuide.length} {formatRussianCount(movie.episodeGuide.length, "сезон", "сезона", "сезонов")} ·{" "}
                {movie.episodeGuide.reduce((count, season) => count + season.episodes.length, 0)} {formatRussianCount(movie.episodeGuide.reduce((count, season) => count + season.episodes.length, 0), "серия", "серии", "серий")}
              </p>
            </div>

            <div className="episode-seasons">
              {movie.episodeGuide.map((season) => (
                <EpisodeSeasonAccordion
                  key={season.season}
                  season={season}
                  initiallyOpen={season.season === 1}
                />
              ))}
            </div>
          </section>
        ) : null}

        {movie.episodeSpecials?.length ? (
          <section className="section-card episode-guide animate-in" aria-labelledby="episode-specials-title">
            <div className="section-head">
              <h2 id="episode-specials-title">Спецвыпуски</h2>
            </div>
            <div className="episode-seasons">
              <EpisodeSeasonAccordion
                season={{ season: 0, episodes: movie.episodeSpecials }}
                initiallyOpen={false}
                title="Спецвыпуски"
              />
            </div>
          </section>
        ) : null}

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
                    <PosterImage
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

  @media (max-width: 640px) {
    .player-box-vibix {
      min-height: 370px;
    }
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
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }

  .episode-guide {
    margin-top: 20px;
  }

  .episode-guide-total {
    margin: 0;
    color: #a0a0a0;
    font-size: 13px;
    font-weight: 750;
  }

  .episode-seasons {
    display: grid;
    gap: 10px;
  }

  .episode-season {
    min-width: 0;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 18px;
    background: rgba(0,0,0,0.42);
  }

  .episode-season-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px;
    border: 0;
    background: transparent;
    color: #ffffff;
    text-align: left;
    cursor: pointer;
    font: inherit;
    font-weight: 850;
  }

  .episode-season-trigger:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: -3px;
  }

  .episode-season-meta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
    color: #a0a0a0;
    font-size: 13px;
  }

  .episode-season-chevron {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 300ms ease;
  }

  .episode-season-trigger[aria-expanded="true"] .episode-season-chevron {
    transform: rotate(180deg);
  }

  .episode-season-panel {
    display: grid;
    grid-template-rows: 0fr;
    transition:
      grid-template-rows 300ms cubic-bezier(0.22, 1, 0.36, 1),
      visibility 0s linear 300ms;
    visibility: hidden;
  }

  .episode-season-panel.is-open {
    grid-template-rows: 1fr;
    transition-delay: 0s;
    visibility: visible;
  }

  .episode-season-panel-inner {
    min-height: 0;
    overflow: hidden;
    opacity: 0;
    transform: translateY(-6px);
    transition:
      opacity 220ms ease,
      transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .episode-season-panel.is-open .episode-season-panel-inner {
    opacity: 1;
    transform: translateY(0);
  }

  .episode-list {
    margin: 0;
    padding: 0 18px 12px;
    list-style: none;
  }

  .episode-item {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    align-items: start;
    gap: 12px;
    padding: 12px 0;
    border-top: 1px solid rgba(255,255,255,0.08);
  }

  .episode-number,
  .episode-item time,
  .episode-titles span {
    color: #a0a0a0;
    font-size: 13px;
  }

  .episode-titles {
    display: grid;
    min-width: 0;
    gap: 4px;
  }

  .episode-titles strong {
    overflow-wrap: anywhere;
    font-size: 14px;
    line-height: 1.4;
  }

  @media (max-width: 640px) {
    .episode-guide .section-head {
      align-items: flex-start;
      flex-direction: column;
    }

    .episode-item {
      grid-template-columns: 26px minmax(0, 1fr);
    }

    .episode-item time {
      grid-column: 2;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .episode-season-panel,
    .episode-season-panel-inner,
    .episode-season-chevron {
      transition: none;
    }

    .episode-season-panel-inner {
      transform: none;
    }
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

  .credits-groups {
    display: grid;
    gap: 22px;
  }

  .credits-group {
    min-width: 0;
  }

  .credits-group-title {
    margin: 0 0 10px;
    color: #ffffff;
    font-size: 14px;
    font-weight: 800;
  }

  .cast-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .credits-reveal-panel {
    display: grid;
    grid-template-rows: 0fr;
    visibility: hidden;
    transition:
      grid-template-rows 300ms cubic-bezier(0.22, 1, 0.36, 1),
      visibility 0s linear 300ms;
  }

  .credits-reveal-panel.is-open {
    grid-template-rows: 1fr;
    visibility: visible;
    transition-delay: 0s;
  }

  .credits-reveal-panel-inner {
    min-height: 0;
    overflow: hidden;
    opacity: 0;
    transform: translateY(-6px);
    transition:
      opacity 220ms ease,
      transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .credits-reveal-panel.is-open .credits-reveal-panel-inner {
    opacity: 1;
    transform: translateY(0);
  }

  .cast-list-additional {
    padding-top: 10px;
  }

  .credits-group[data-compact="true"] .cast-list {
    grid-template-columns: minmax(0, 420px);
  }

  .cast-card {
    display: flex;
    align-items: flex-start;
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

  .cast-line {
    margin: 0;
    min-width: 0;
    flex: 1 1 auto;
    color: #858585;
    font-size: 14px;
    line-height: 1.45;
    font-weight: 750;
    overflow-wrap: anywhere;
  }

  .cast-line strong {
    color: #ffffff;
    font-weight: 1000;
  }

  .credits-toggle {
    margin-top: 12px;
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 14px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 999px;
    background: rgba(255,255,255,0.04);
    color: #ffffff;
    font: inherit;
    font-size: 13px;
    font-weight: 850;
    cursor: pointer;
    transition:
      border-color 180ms ease,
      background 180ms ease;
  }

  .credits-toggle-chevron {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .credits-toggle[aria-expanded="true"] .credits-toggle-chevron {
    transform: rotate(180deg);
  }

  .credits-toggle:hover,
  .credits-toggle:focus-visible {
    border-color: rgba(255,255,255,0.28);
    background: rgba(255,255,255,0.08);
  }

  @media (prefers-reduced-motion: reduce) {
    .credits-reveal-panel,
    .credits-reveal-panel-inner,
    .credits-toggle-chevron {
      transition: none;
    }

    .credits-reveal-panel-inner {
      transform: none;
    }
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
    margin-top: 1px;
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

    .cast-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
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

    .cast-list,
    .credits-group[data-compact="true"] .cast-list {
      grid-template-columns: minmax(0, 1fr);
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
      grid-template-columns: repeat(3, minmax(0, 1fr));
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
      width: min(100%, 430px);
      max-width: 430px;
      margin-inline: auto;
      border-color: rgba(255,255,255,0.14);
      border-radius: 28px;
      background:
        radial-gradient(circle at 50% 0%, rgba(255,255,255,0.10), transparent 42%),
        linear-gradient(155deg, rgba(22,22,23,0.98), rgba(5,5,6,0.98));
      box-shadow: 0 30px 88px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.07);
    }

    .poster-image {
      width: calc(100% - 16px);
      aspect-ratio: 2 / 3;
      margin: 8px 8px 0;
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 21px;
      filter: saturate(0.96) contrast(1.03);
      box-shadow: 0 18px 48px rgba(0,0,0,0.36);
    }

    .poster-footer {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      padding: 12px;
      border-top: 0;
      background: linear-gradient(180deg, rgba(255,255,255,0.028), rgba(0,0,0,0.18));
    }

    .poster-footer div {
      display: flex;
      min-height: 72px;
      flex-direction: column;
      justify-content: center;
      padding: 12px 10px;
      border-color: rgba(255,255,255,0.13);
      border-radius: 18px;
      background: linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025));
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.055), 0 12px 30px rgba(0,0,0,0.20);
    }

    .poster-footer span {
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 9px;
      letter-spacing: 0.11em;
    }

    .poster-footer strong {
      margin-top: 8px;
      font-size: 14px;
    }

    .poster-genres-panel {
      padding: 16px 14px 18px;
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012));
    }

    .poster-genre-list {
      gap: 8px;
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
      max-width: 100%;
    }

    .poster-footer {
      gap: 6px;
      padding: 10px;
    }

    .poster-footer div {
      min-height: 66px;
      padding: 10px 7px;
      border-radius: 15px;
    }

    .poster-footer span {
      font-size: 8px;
      letter-spacing: 0.08em;
    }

    .poster-footer strong {
      font-size: 13px;
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
