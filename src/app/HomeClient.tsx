"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import MobileBottomNav from "./components/MobileBottomNav";
import { movies as staticContent, type Movie } from "./data/movies";
import { supabase } from "./lib/supabase";
import {
  emptyMovieActionState,
  getCurrentSupabaseUser,
  loadMovieActions,
  mapSupabaseUser,
  removeCurrentUserFromStorage,
  saveCurrentUserToStorage,
  syncMovieAction,
} from "./lib/kinolumaSupabase";

import {
  DAILY_FEATURED_COUNT,
  getDailyFeaturedDateKey,
  getDailyFeaturedItems,
} from "./lib/home/dailyFeatured";

import {
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ContentItem = Movie;

type HomeProps = {
  initialContent?: Movie[];
  initialFeaturedIds?: number[];
  initialFeaturedDateKey?: string;
};

type MovieCardProps = {
  item: ContentItem;
  index: number;
  isWatchLater: boolean;
  mode?: "grid" | "row";
  onOpenDetails: (item: ContentItem) => void;
  onOpenTrailer: (item: ContentItem) => void;
};

type ScrollButtonsState = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

type AuthMode = "login" | "register";

type AuthUser = {
  id: number;
  name: string;
  email: string;
  password: string;
};

type CurrentUser = {
  id: string;
  name: string;
  email: string;
};

const FEATURED_ROTATION_INTERVAL_MS = 15 * 1000;

function getFeaturedPosterImage(item: ContentItem) {
  return item.poster;
}

function isExpectedRelease(item: ContentItem) {
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
    source.includes("ожидаемых") ||
    genres.some((genre) => genre.includes("ожидаем")) ||
    factsText.includes("ожидаемый") ||
    (item.rating <= 0 && isFutureYear)
  );
}


function getRatingBadgeText(item: ContentItem) {
  if (!Number.isFinite(item.rating) || item.rating <= 0) {
    return isExpectedRelease(item) ? "Ждём" : "—";
  }

  return `★ ${Number.isInteger(item.rating) ? item.rating : item.rating.toFixed(1)}`;
}

function getRatingDetailsText(item: ContentItem) {
  if (!Number.isFinite(item.rating) || item.rating <= 0) {
    return isExpectedRelease(item) ? "Рейтинг появится после премьеры" : "Рейтинг уточняется";
  }

  return `★ ${Number.isInteger(item.rating) ? item.rating : item.rating.toFixed(1)} / 10`;
}

function escapeSvgText(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function splitPosterText(text: string, maxLength: number, maxLines: number) {
  const words = text.split(" ").filter(Boolean);
  const lines: string[] = [];

  for (const word of words) {
    const currentLine = lines[lines.length - 1];

    if (!currentLine) {
      lines.push(word);
      continue;
    }

    if (`${currentLine} ${word}`.length <= maxLength) {
      lines[lines.length - 1] = `${currentLine} ${word}`;
      continue;
    }

    if (lines.length < maxLines) {
      lines.push(word);
    }
  }

  return lines.length > 0 ? lines.slice(0, maxLines) : [text];
}

function getPosterTheme(theme: string) {
  const themes: Record<
    string,
    {
      bgTop: string;
      bgMiddle: string;
      bgBottom: string;
      accent: string;
      glow: string;
      ink: string;
      label: string;
    }
  > = {
    default: {
      bgTop: "#2f2f35",
      bgMiddle: "#111111",
      bgBottom: "#020202",
      accent: "#ffffff",
      glow: "#a3a3a3",
      ink: "#050505",
      label: "KINOLUMA",
    },
    mario: {
      bgTop: "#2477ff",
      bgMiddle: "#10112a",
      bgBottom: "#05030b",
      accent: "#ff3b30",
      glow: "#ffd84a",
      ink: "#020617",
      label: "GALAXY",
    },
    space: {
      bgTop: "#102a43",
      bgMiddle: "#090f1f",
      bgBottom: "#02030a",
      accent: "#7dd3fc",
      glow: "#f8fafc",
      ink: "#030712",
      label: "DEEP SPACE",
    },
    music: {
      bgTop: "#3b0764",
      bgMiddle: "#111111",
      bgBottom: "#030303",
      accent: "#f5f5f5",
      glow: "#c084fc",
      ink: "#080808",
      label: "MUSIC BIOPIC",
    },
    fashion: {
      bgTop: "#3f0f18",
      bgMiddle: "#14070a",
      bgBottom: "#040102",
      accent: "#f8fafc",
      glow: "#e11d48",
      ink: "#09090b",
      label: "FASHION DRAMA",
    },
    horror: {
      bgTop: "#3a0505",
      bgMiddle: "#111111",
      bgBottom: "#020202",
      accent: "#ffffff",
      glow: "#ef4444",
      ink: "#050505",
      label: "SLASHER",
    },
    justice: {
      bgTop: "#164e63",
      bgMiddle: "#0f172a",
      bgBottom: "#020617",
      accent: "#ecfeff",
      glow: "#22d3ee",
      ink: "#030712",
      label: "FUTURE TRIAL",
    },
    hero: {
      bgTop: "#1d4ed8",
      bgMiddle: "#111827",
      bgBottom: "#020617",
      accent: "#fff7ed",
      glow: "#facc15",
      ink: "#020617",
      label: "MARVEL TV",
    },
    starfleet: {
      bgTop: "#0f766e",
      bgMiddle: "#0f172a",
      bgBottom: "#020617",
      accent: "#f8fafc",
      glow: "#38bdf8",
      ink: "#030712",
      label: "ACADEMY",
    },
  };

  return themes[theme] ?? themes.default;
}

function createPosterMotif(theme: string, accent: string, glow: string) {
  switch (theme) {
    case "mario":
      return `
        <circle cx="90" cy="150" r="34" fill="${glow}" opacity="0.95"/>
        <circle cx="388" cy="198" r="62" fill="${accent}" opacity="0.85"/>
        <circle cx="386" cy="198" r="38" fill="#ffffff" opacity="0.18"/>
        <path d="M62 524C164 450 232 470 326 390C389 336 424 266 452 156" stroke="#ffffff" stroke-opacity="0.15" stroke-width="86" stroke-linecap="round"/>
        <text x="250" y="258" text-anchor="middle" fill="#ffffff" opacity="0.12" font-family="Arial, Helvetica, sans-serif" font-size="220" font-weight="900">M</text>
        <g fill="#ffffff" opacity="0.75">
          <circle cx="126" cy="256" r="3"/><circle cx="176" cy="110" r="3"/><circle cx="314" cy="130" r="2.5"/><circle cx="428" cy="318" r="3"/><circle cx="76" cy="348" r="2.5"/>
        </g>
      `;
    case "space":
      return `
        <ellipse cx="250" cy="318" rx="182" ry="66" fill="none" stroke="${glow}" stroke-opacity="0.35" stroke-width="4" transform="rotate(-17 250 318)"/>
        <ellipse cx="250" cy="318" rx="118" ry="42" fill="none" stroke="${accent}" stroke-opacity="0.34" stroke-width="3" transform="rotate(-17 250 318)"/>
        <circle cx="250" cy="318" r="72" fill="${accent}" opacity="0.18"/>
        <path d="M106 520L142 444L178 520L142 502L106 520Z" fill="${glow}" opacity="0.85"/>
        <g fill="#ffffff" opacity="0.75">
          <circle cx="86" cy="146" r="3"/><circle cx="158" cy="236" r="2.5"/><circle cx="346" cy="122" r="3"/><circle cx="410" cy="428" r="2.5"/><circle cx="94" cy="378" r="2.5"/>
        </g>
      `;
    case "music":
      return `
        <rect x="214" y="130" width="72" height="188" rx="36" fill="${accent}" opacity="0.86"/>
        <rect x="232" y="154" width="36" height="116" rx="18" fill="#000000" opacity="0.22"/>
        <path d="M174 258C174 316 207 356 250 356C293 356 326 316 326 258" fill="none" stroke="${glow}" stroke-opacity="0.72" stroke-width="16" stroke-linecap="round"/>
        <path d="M250 356V430M196 430H304" stroke="${accent}" stroke-opacity="0.8" stroke-width="16" stroke-linecap="round"/>
        <g fill="${glow}" opacity="0.42">
          <rect x="82" y="438" width="22" height="82" rx="11"/><rect x="116" y="398" width="22" height="122" rx="11"/><rect x="362" y="412" width="22" height="108" rx="11"/><rect x="396" y="458" width="22" height="62" rx="11"/>
        </g>
      `;
    case "fashion":
      return `
        <path d="M60 172H440M60 228H440M60 284H440" stroke="${accent}" stroke-opacity="0.18" stroke-width="2"/>
        <path d="M408 104L118 574" stroke="${glow}" stroke-opacity="0.50" stroke-width="44" stroke-linecap="round"/>
        <path d="M438 126L148 596" stroke="#ffffff" stroke-opacity="0.20" stroke-width="18" stroke-linecap="round"/>
        <text x="250" y="306" text-anchor="middle" fill="#ffffff" opacity="0.15" font-family="Arial, Helvetica, sans-serif" font-size="94" font-weight="900" letter-spacing="8">PRADA</text>
        <rect x="116" y="366" width="268" height="92" rx="4" fill="#ffffff" opacity="0.06" stroke="#ffffff" stroke-opacity="0.22"/>
      `;
    case "horror":
      return `
        <path d="M108 110L392 588" stroke="${glow}" stroke-opacity="0.42" stroke-width="36" stroke-linecap="round"/>
        <path d="M150 100L430 560" stroke="#ffffff" stroke-opacity="0.10" stroke-width="16" stroke-linecap="round"/>
        <path d="M250 142C310 142 360 198 360 284C360 382 306 462 250 462C194 462 140 382 140 284C140 198 190 142 250 142Z" fill="#ffffff" opacity="0.13"/>
        <ellipse cx="214" cy="268" rx="28" ry="48" fill="#000000" opacity="0.55"/>
        <ellipse cx="286" cy="268" rx="28" ry="48" fill="#000000" opacity="0.55"/>
        <ellipse cx="250" cy="354" rx="24" ry="54" fill="#000000" opacity="0.55"/>
      `;
    case "justice":
      return `
        <circle cx="250" cy="285" r="138" fill="none" stroke="${glow}" stroke-opacity="0.28" stroke-width="28"/>
        <circle cx="250" cy="285" r="82" fill="none" stroke="${accent}" stroke-opacity="0.26" stroke-width="3"/>
        <path d="M250 154V440M174 224H326M202 224L154 338H250L202 224ZM298 224L250 338H346L298 224Z" stroke="${accent}" stroke-opacity="0.82" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M176 338H248M252 338H344" stroke="${glow}" stroke-opacity="0.62" stroke-width="10" stroke-linecap="round"/>
      `;
    case "hero":
      return `
        <path d="M250 104L290 248L440 210L318 306L424 426L276 368L250 526L224 368L76 426L182 306L60 210L210 248L250 104Z" fill="${glow}" opacity="0.34"/>
        <circle cx="250" cy="318" r="122" fill="${accent}" opacity="0.12"/>
        <text x="250" y="314" text-anchor="middle" fill="#ffffff" opacity="0.18" font-family="Arial, Helvetica, sans-serif" font-size="78" font-weight="900" letter-spacing="5">WONDER</text>
        <path d="M118 484H382" stroke="#ffffff" stroke-opacity="0.22" stroke-width="14" stroke-linecap="round"/>
      `;
    case "starfleet":
      return `
        <path d="M250 94L374 514L250 430L126 514L250 94Z" fill="${accent}" opacity="0.18" stroke="${glow}" stroke-opacity="0.62" stroke-width="5" stroke-linejoin="round"/>
        <path d="M250 170L306 426L250 386L194 426L250 170Z" fill="${glow}" opacity="0.25"/>
        <ellipse cx="250" cy="326" rx="184" ry="54" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="3" transform="rotate(-10 250 326)"/>
        <g fill="#ffffff" opacity="0.7">
          <circle cx="92" cy="156" r="3"/><circle cx="168" cy="116" r="2.5"/><circle cx="396" cy="180" r="3"/><circle cx="414" cy="418" r="2.5"/><circle cx="102" cy="392" r="2.5"/>
        </g>
      `;
    default:
      return `
        <path d="M70 132H430V522H70V132Z" fill="#ffffff" opacity="0.055" stroke="#ffffff" stroke-opacity="0.14"/>
        <path d="M70 190H430M70 248H430M70 306H430M70 364H430M70 422H430M130 132V522M190 132V522M250 132V522M310 132V522M370 132V522" stroke="#ffffff" stroke-opacity="0.08"/>
        <circle cx="250" cy="327" r="118" fill="${glow}" opacity="0.10"/>
      `;
  }
}

function createGeneratedPoster(
  title: string,
  originalTitle: string,
  type: string,
  theme = "default",
) {
  const palette = getPosterTheme(theme);
  const titleLines = splitPosterText(title.toUpperCase(), 14, 3);
  const originalLines = splitPosterText(originalTitle, 24, 2);
  const safeType = escapeSvgText(type.toUpperCase());
  const safeLabel = escapeSvgText(palette.label);
  const motif = createPosterMotif(theme, palette.accent, palette.glow);

  const titleStartY =
    titleLines.length === 1 ? 486 : titleLines.length === 2 ? 458 : 430;

  const originalStartY = originalLines.length === 1 ? 594 : 576;

  const titleText = titleLines
    .map(
      (line, index) =>
        `<text x="250" y="${titleStartY + index * 46}" text-anchor="middle" fill="#ffffff" stroke="#000000" stroke-opacity="0.18" stroke-width="6" paint-order="stroke" font-family="Arial, Helvetica, sans-serif" font-size="37" font-weight="900" letter-spacing="-0.8">${escapeSvgText(line)}</text>`,
    )
    .join("");

  const originalText = originalLines
    .map(
      (line, index) =>
        `<text x="250" y="${originalStartY + index * 27}" text-anchor="middle" fill="#d4d4d4" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="800" opacity="0.82">${escapeSvgText(line)}</text>`,
    )
    .join("");

  const svg = `
    <svg width="500" height="750" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="750" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${palette.bgTop}"/>
          <stop offset="52%" stop-color="${palette.bgMiddle}"/>
          <stop offset="100%" stop-color="${palette.bgBottom}"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="24%" r="62%">
          <stop offset="0%" stop-color="${palette.glow}" stop-opacity="0.48"/>
          <stop offset="64%" stop-color="${palette.glow}" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="${palette.glow}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="shade" x1="0" y1="0" x2="0" y2="750" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
          <stop offset="46%" stop-color="#000000" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.72"/>
        </linearGradient>
        <pattern id="grain" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 20L20 0" stroke="#ffffff" stroke-opacity="0.025"/>
        </pattern>
      </defs>

      <rect width="500" height="750" fill="url(#bg)"/>
      <rect width="500" height="750" fill="url(#glow)"/>
      <rect width="500" height="750" fill="url(#grain)"/>
      ${motif}
      <rect width="500" height="750" fill="url(#shade)"/>

      <rect x="28" y="28" width="444" height="694" rx="34" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2"/>
      <rect x="48" y="48" width="404" height="654" rx="28" stroke="#ffffff" stroke-opacity="0.08"/>

      <text x="64" y="86" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="900" letter-spacing="3">${safeType}</text>
      <text x="436" y="86" text-anchor="end" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="900" letter-spacing="2" opacity="0.70">2026</text>

      <rect x="108" y="362" width="284" height="44" rx="22" fill="${palette.ink}" fill-opacity="0.44" stroke="#ffffff" stroke-opacity="0.16"/>
      <text x="250" y="390" text-anchor="middle" fill="${palette.glow}" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="900" letter-spacing="3">${safeLabel}</text>

      ${titleText}
      ${originalText}

      <rect x="150" y="642" width="200" height="42" rx="21" fill="#ffffff" fill-opacity="0.94"/>
      <text x="250" y="668" text-anchor="middle" fill="#000000" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="900">Премьера 2026</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getPosterFallback(title: string, originalTitle: string, type: string) {
  return createGeneratedPoster(title, originalTitle, type);
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .trim();
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

const types = [
  "Все",
  "Фильм",
  "Сериал",
  "Аниме",
  "Мультфильм",
];

const catalogSlugByType: Record<string, string> = {
  Фильм: "films",
  Сериал: "series",
  Аниме: "anime",
  Мультфильм: "cartoons",
};

function getSearchText(item: ContentItem) {
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

function getGenresForType(selectedType: string, items: ContentItem[]) {
  const contentByType =
    selectedType === "Все"
      ? items
      : items.filter((item) => item.type === selectedType);

  return [
    "Все",
    ...Array.from(new Set(contentByType.flatMap((item) => item.genres))).sort(),
  ];
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

function RowArrowButton({
  direction,
  hidden,
  onClick,
  ariaLabel,
}: {
  direction: "left" | "right";
  hidden: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`movie-row-arrow absolute top-1/2 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white shadow-[0_18px_60px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-colors duration-200 hover:border-white/40 hover:bg-white hover:text-black active:scale-95 ${
        direction === "left" ? "left-3" : "right-3"
      } ${hidden ? "movie-row-arrow-hidden" : ""}`}
      aria-label={ariaLabel}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {direction === "left" ? (
          <path d="M15.5 5.5L9 12L15.5 18.5" />
        ) : (
          <path d="M8.5 5.5L15 12L8.5 18.5" />
        )}
      </svg>
    </button>
  );
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

function MovieCard({
  item,
  index,
  isWatchLater,
  mode = "grid",
  onOpenDetails,
  onOpenTrailer,
}: MovieCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const isRowMode = mode === "row";
  const [isVisible, setIsVisible] = useState(isRowMode);
  const posterFallbackIndexRef = useRef(0);

  useEffect(() => {
    if (isRowMode) {
      setIsVisible(true);
      return;
    }

    const card = cardRef.current;

    if (!card) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(card);
        }
      },
      {
        threshold: 0.15,
      },
    );

    observer.observe(card);

    return () => {
      observer.disconnect();
    };
  }, [isRowMode]);

  return (
    <div
      ref={cardRef}
      style={{
        transitionDelay:
          isRowMode || !isVisible ? "0ms" : `${Math.min(index * 35, 210)}ms`,
      }}
      className={`movie-card group ${
        isRowMode ? "movie-card-row" : "movie-card-grid"
      } ${
        isVisible
          ? "translate-y-0 scale-100 opacity-100"
          : "translate-y-8 scale-[0.98] opacity-0"
      }`}
    >
      <button
        onClick={() => onOpenDetails(item)}
        className={`movie-poster ${isRowMode ? "movie-poster-row" : "movie-poster-grid"}`}
      >
        <img
          src={item.poster}
          alt={item.title}
          loading={isRowMode && index < 5 ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          onError={(event) => {
            const nextFallback =
              item.posterFallbacks?.[posterFallbackIndexRef.current];

            if (nextFallback) {
              posterFallbackIndexRef.current += 1;
              event.currentTarget.src = nextFallback;
              return;
            }

            event.currentTarget.onerror = null;
            event.currentTarget.src = getPosterFallback(
              item.title,
              item.originalTitle,
              item.type,
            );
          }}
        />

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-80" />

        <div className="absolute left-3 top-3 rounded bg-black/75 px-3 py-1 text-[11px] font-black text-white backdrop-blur">
          {item.type}
        </div>

        <div className="absolute right-3 top-3 rounded bg-white px-3 py-1 text-[11px] font-black text-black shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
          {getRatingBadgeText(item)}
        </div>

        {isWatchLater && (
          <div className="absolute bottom-3 left-3 rounded bg-black/80 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            Смотреть позже
          </div>
        )}
      </button>

      <div className="movie-card-body">
        <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
          <span className="shrink-0 text-xs text-neutral-500">{item.year}</span>
          <span className="mh-clamp-1 text-right text-xs text-neutral-500">
            {item.genres[0]}
          </span>
        </div>

        <button
          onClick={() => onOpenDetails(item)}
          className="movie-card-title mh-clamp-2"
        >
          {item.title}
        </button>

        <p className="movie-card-original mh-clamp-1">{item.originalTitle}</p>

        <p className="movie-card-description mh-clamp-2">{item.description}</p>

        <div className="movie-card-tags">
          {item.genres.slice(0, 2).map((genre) => (
            <span key={genre} className="movie-card-tag">
              {genre}
            </span>
          ))}
        </div>

        <div className="movie-card-actions">
          <button
            onClick={() => onOpenTrailer(item)}
            className="movie-card-action-primary"
          >
            Трейлер
          </button>

          <button
            onClick={() => onOpenDetails(item)}
            className="movie-card-action-secondary"
          >
            Подробнее
          </button>
        </div>
      </div>
    </div>
  );
}

type MovieShelfProps = {
  label: string;
  title: string;
  description: string;
  items: ContentItem[];
  watchLaterIds: number[];
  sectionRef?: RefObject<HTMLElement | null>;
  openAllLabel?: string;
  onOpenAll?: () => void;
  onOpenDetails: (item: ContentItem) => void;
  onOpenTrailer: (item: ContentItem) => void;
};

function MovieShelf({
  label,
  title,
  description,
  items,
  watchLaterIds,
  sectionRef,
  openAllLabel,
  onOpenAll,
  onOpenDetails,
  onOpenTrailer,
}: MovieShelfProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState<ScrollButtonsState>({
    canScrollLeft: false,
    canScrollRight: false,
  });
  const shelfAnimationFrameRef = useRef<number | null>(null);

  function updateScrollState() {
    const row = rowRef.current;

    if (!row) {
      return;
    }

    const maxScroll = row.scrollWidth - row.clientWidth;

    setScrollState({
      canScrollLeft: row.scrollLeft > 10,
      canScrollRight: row.scrollLeft < maxScroll - 10,
    });
  }

  function getScrollStep(row: HTMLDivElement) {
    const firstCard = row.querySelector<HTMLElement>(".movie-card-row");
    const track = row.querySelector<HTMLElement>(".movie-row-track");

    if (!firstCard || !track) {
      return Math.max(row.clientWidth * 0.85, 320);
    }

    const trackStyles = window.getComputedStyle(track);
    const gap = Number.parseFloat(
      trackStyles.columnGap || trackStyles.gap || "0",
    );

    return (
      firstCard.getBoundingClientRect().width + (Number.isFinite(gap) ? gap : 0)
    );
  }

  function easeOutCubic(progress: number) {
    return 1 - Math.pow(1 - progress, 3);
  }

  function animateShelfScroll(row: HTMLDivElement, target: number) {
    if (shelfAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(shelfAnimationFrameRef.current);
      shelfAnimationFrameRef.current = null;
    }

    const start = row.scrollLeft;
    const distance = target - start;

    if (Math.abs(distance) < 1) {
      updateScrollState();
      return;
    }

    const duration = Math.min(720, Math.max(420, Math.abs(distance) * 0.55));
    const startedAt = performance.now();

    row.classList.add("is-programmatic-scroll");

    const step = (currentTime: number) => {
      const progress = Math.min((currentTime - startedAt) / duration, 1);
      row.scrollLeft = start + distance * easeOutCubic(progress);

      if (progress < 1) {
        shelfAnimationFrameRef.current = window.requestAnimationFrame(step);
        return;
      }

      row.scrollLeft = target;
      row.classList.remove("is-programmatic-scroll");
      shelfAnimationFrameRef.current = null;
      updateScrollState();
    };

    shelfAnimationFrameRef.current = window.requestAnimationFrame(step);
  }

  function smoothScroll(direction: "left" | "right") {
    const row = rowRef.current;

    if (!row) {
      return;
    }

    const maxScroll = Math.max(0, row.scrollWidth - row.clientWidth);
    const cardStep = getScrollStep(row);
    const cardsPerClick = Math.max(
      1,
      Math.floor(row.clientWidth / cardStep) - 1,
    );
    const distance = cardStep * cardsPerClick;
    const rawTarget =
      direction === "right"
        ? row.scrollLeft + distance
        : row.scrollLeft - distance;
    const snappedTarget = Math.round(rawTarget / cardStep) * cardStep;
    const target = Math.min(maxScroll, Math.max(0, snappedTarget));

    animateShelfScroll(row, target);
  }

  useEffect(() => {
    const row = rowRef.current;

    if (!row) {
      return;
    }

    let animationFrameId = 0;

    const update = () => {
      if (animationFrameId) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = 0;
        updateScrollState();
      });
    };

    const timeoutId = window.setTimeout(update, 120);

    row.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.clearTimeout(timeoutId);

      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      if (shelfAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(shelfAnimationFrameRef.current);
        shelfAnimationFrameRef.current = null;
      }

      row.classList.remove("is-programmatic-scroll");
      row.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items.length]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      className="mobile-section px-8 pb-16 scroll-mt-28"
    >
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-neutral-500">
            {label}
          </p>

          <h3 className="mt-2 text-2xl font-bold">{title}</h3>

          <p className="mt-2 max-w-2xl text-sm text-neutral-500">
            {description}
          </p>
        </div>

        {onOpenAll && openAllLabel && (
          <button
            type="button"
            onClick={onOpenAll}
            className="kinoluma-open-all-button shrink-0"
          >
            {openAllLabel}
          </button>
        )}
      </div>

      <div className="movie-row-area relative">
        <RowArrowButton
          direction="left"
          hidden={!scrollState.canScrollLeft}
          onClick={() => smoothScroll("left")}
          ariaLabel={`Листать подборку ${title} влево`}
        />

        <RowArrowButton
          direction="right"
          hidden={!scrollState.canScrollRight}
          onClick={() => smoothScroll("right")}
          ariaLabel={`Листать подборку ${title} вправо`}
        />

        <div ref={rowRef} className="horizontal-scroll movie-row-scroll">
          <div className="movie-row-track">
            {items.map((item, index) => (
              <MovieCard
                key={item.id}
                item={item}
                index={index}
                mode="row"
                isWatchLater={watchLaterIds.includes(item.id)}
                onOpenDetails={onOpenDetails}
                onOpenTrailer={onOpenTrailer}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


type HomeSearchHubCard = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  stat: string;
  note: string;
};

const homeSearchHubCards: HomeSearchHubCard[] = [
  {
    eyebrow: "Скоро",
    title: "Новинки 2026: ещё не вышли",
    description:
      "Будущие премьеры в одном месте: открыл список, посмотрел карточки и отметил, чего ждать дальше.",
    href: "/expected",
    stat: "2026+",
    note: "Ожидаемые релизы",
  },
  {
    eyebrow: "Топ",
    title: "Лучшие фильмы и сериалы",
    description:
      "Фильмы и сериалы с сильными оценками, чтобы не устраивать вечерний допрос пульту и самому себе.",
    href: "/collections/movies-with-high-rating",
    stat: "★ 8+",
    note: "Высокий рейтинг",
  },
  {
    eyebrow: "Популярное",
    title: "Популярные фильмы и сериалы",
    description:
      "Блокбастеры, сериальные хиты и узнаваемые истории, которые проще открыть списком, чем ловить по всему каталогу.",
    href: "/collections/popular-movies-and-series",
    stat: "Hit",
    note: "Быстрый вход",
  },
  {
    eyebrow: "Жанр",
    title: "Фантастика и будущее",
    description:
      "Космос, технологии, другие миры и крупная фантастика — для вечеров, когда реальность можно поставить на паузу.",
    href: "/collections/sci-fi-movies",
    stat: "Sci-Fi",
    note: "Тематический список",
  },
];

function HomeSearchHubSection() {
  return (
    <section className="home-search-hub mobile-section px-8 pb-24 pt-2">
      <div className="home-search-hub-panel">
        <div className="home-search-hub-head">
          <div>
            <p className="home-search-hub-kicker">Подборки</p>
            <h3>Быстрые маршруты по каталогу</h3>
            <p>
              Несколько входов для тех случаев, когда хочется не листать всё подряд,
              а сразу открыть живой список: будущие релизы, хиты, высокий рейтинг и фантастику.
            </p>
          </div>

          <Link href="/collections" className="home-search-hub-all">
            Все подборки
          </Link>
        </div>

        <div className="home-search-hub-grid">
          {homeSearchHubCards.map((card, index) => (
            <Link
              key={card.href}
              href={card.href}
              style={{ animationDelay: `${Math.min(index * 70, 280)}ms` }}
              className="home-search-hub-card"
              aria-label={`Открыть подборку: ${card.title}`}
            >
              <span className="home-search-hub-glow" aria-hidden="true" />
              <span className="home-search-hub-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="home-search-hub-card-topline">
                <span>{card.eyebrow}</span>
                <strong>{card.stat}</strong>
              </span>

              <span className="home-search-hub-card-copy">
                <strong>{card.title}</strong>
                <span>{card.description}</span>
              </span>

              <span className="home-search-hub-card-bottom">
                <span>{card.note}</span>
                <span>Открыть →</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home({
  initialContent,
  initialFeaturedIds,
  initialFeaturedDateKey,
}: HomeProps) {
  const router = useRouter();
  const content = useMemo(
    () =>
      initialContent && initialContent.length > 0
        ? initialContent
        : staticContent,
    [initialContent],
  );
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const filmsSectionRef = useRef<HTMLElement | null>(null);
  const seriesSectionRef = useRef<HTMLElement | null>(null);
  const animeSectionRef = useRef<HTMLElement | null>(null);

  const [search, setSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedType, setSelectedType] = useState("Все");
  const [selectedGenre, setSelectedGenre] = useState("Все");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [trailerItem, setTrailerItem] = useState<ContentItem | null>(null);
  const [isDetailsClosing, setIsDetailsClosing] = useState(false);
  const [isTrailerClosing, setIsTrailerClosing] = useState(false);
  const [watchLaterIds, setWatchLaterIds] = useState<number[]>([]);
  const [isWatchLaterLoaded, setIsWatchLaterLoaded] = useState(false);
  const [likedItemIds, setLikedItemIds] = useState<number[]>([]);
  const [dislikedItemIds, setDislikedItemIds] = useState<number[]>([]);
  const [isReactionsLoaded, setIsReactionsLoaded] = useState(false);
  const [popularVisibleRows, setPopularVisibleRows] = useState(4);
  const [popularGridColumns, setPopularGridColumns] = useState(6);
  const [dailyFeaturedIds, setDailyFeaturedIds] = useState<number[]>(
    () => initialFeaturedIds ?? [],
  );
  const [, setFeaturedDayKey] = useState(
    () => initialFeaturedDateKey ?? getDailyFeaturedDateKey(),
  );

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthClosing, setIsAuthClosing] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [newReleasesScrollState, setNewReleasesScrollState] =
    useState<ScrollButtonsState>({
      canScrollLeft: false,
      canScrollRight: false,
    });

  const [curatedScrollState, setCuratedScrollState] =
    useState<ScrollButtonsState>({
      canScrollLeft: false,
      canScrollRight: false,
    });

  const [watchLaterScrollState, setWatchLaterScrollState] =
    useState<ScrollButtonsState>({
      canScrollLeft: false,
      canScrollRight: false,
    });

  const newReleasesScrollRef = useRef<HTMLDivElement | null>(null);
  const curatedScrollRef = useRef<HTMLDivElement | null>(null);
  const watchLaterScrollRef = useRef<HTMLDivElement | null>(null);
  const rowScrollAnimationFrameRef = useRef<number | null>(null);
  const categoryScrollAnimationFrameRef = useRef<number | null>(null);
  const categoryHighlightTimeoutRef = useRef<number | null>(null);
  const activeMovieRowRef = useRef<HTMLDivElement | null>(null);
  const featuredRouletteRef = useRef<HTMLDivElement | null>(null);
  const recentRouletteRef = useRef<HTMLDivElement | null>(null);

  const featuredContentPool = useMemo(() => {
    const featuredFromServer = dailyFeaturedIds
      .map((id) => content.find((item) => item.id === id))
      .filter((item): item is ContentItem => Boolean(item));

    if (
      featuredFromServer.length >=
      Math.min(DAILY_FEATURED_COUNT, content.length)
    ) {
      return featuredFromServer.slice(0, DAILY_FEATURED_COUNT);
    }

    return getDailyFeaturedItems(content, new Date(), DAILY_FEATURED_COUNT);
  }, [content, dailyFeaturedIds]);

  const featuredContentPoolKey = useMemo(
    () => featuredContentPool.map((item) => item.id).join("-"),
    [featuredContentPool],
  );

  const recentlyUpdatedPool = useMemo(() => {
    const featuredIds = new Set(featuredContentPool.map((item) => item.id));
    const newestContent = [...content]
      .filter((item) => !featuredIds.has(item.id))
      .sort((a, b) => b.id - a.id);
    const releasedContent = newestContent.filter((item) => !isExpectedRelease(item));

    return (releasedContent.length >= 6 ? releasedContent : newestContent).slice(0, 12);
  }, [content, featuredContentPoolKey]);

  const [featuredIndex, setFeaturedIndex] = useState(0);

  const featuredContent =
    featuredContentPool[
      featuredIndex % Math.max(featuredContentPool.length, 1)
    ] ?? content[0];

  const featuredPosterImage = getFeaturedPosterImage(featuredContent);

  const goToFeaturedSlide = (index: number) => {
    if (featuredContentPool.length <= 0) {
      return;
    }

    setFeaturedIndex(
      ((index % featuredContentPool.length) + featuredContentPool.length) %
        featuredContentPool.length,
    );
  };

  const scrollRoulette = (
    ref: RefObject<HTMLDivElement | null>,
    direction: 1 | -1,
  ) => {
    ref.current?.scrollBy({
      top: direction * 132,
      behavior: "smooth",
    });
  };

  const allGenres = useMemo(() => {
    return getGenresForType(selectedType, content);
  }, [selectedType, content]);

  const newReleasesContent = useMemo(() => {
    return content.filter((item) =>
      [32, 33, 34, 35, 36, 37, 38, 39].includes(item.id),
    );
  }, [content]);

  const curatedContent = useMemo(() => {
    return content.filter((item) =>
      [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31].includes(item.id),
    );
  }, [content]);

  const filmShelfContent = useMemo(() => {
    return content.filter((item) => item.type === "Фильм").slice(0, 14);
  }, [content]);

  const animeShelfContent = useMemo(() => {
    return content.filter((item) => item.type === "Аниме");
  }, [content]);

  const cartoonShelfContent = useMemo(() => {
    return content.filter((item) => item.type === "Мультфильм");
  }, [content]);

  const seriesShelfContent = useMemo(() => {
    return content.filter((item) => item.type === "Сериал");
  }, [content]);

  const watchLaterContent = useMemo(() => {
    return content.filter((item) => watchLaterIds.includes(item.id));
  }, [content, watchLaterIds]);

  const filteredContent = useMemo(() => {
    return content.filter((item) => {
      const matchesType = selectedType === "Все" || item.type === selectedType;

      const matchesGenre =
        selectedGenre === "Все" || item.genres.includes(selectedGenre);

      return matchesType && matchesGenre;
    });
  }, [content, selectedType, selectedGenre]);

  const popularVisibleCount = popularVisibleRows * popularGridColumns;
  const popularContent = filteredContent.slice(0, popularVisibleCount);
  const hasMorePopularContent = popularVisibleCount < filteredContent.length;

  const searchSuggestions = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    if (!normalizedSearch) {
      return [];
    }

    return content
      .map((item) => {
        const normalizedTitle = normalizeText(item.title);
        const normalizedOriginalTitle = normalizeText(item.originalTitle);
        const startsWithTitle =
          normalizedTitle.startsWith(normalizedSearch) ||
          normalizedOriginalTitle.startsWith(normalizedSearch);

        return {
          item,
          startsWithTitle,
          searchText: getSearchText(item),
        };
      })
      .filter(({ searchText }) => searchText.includes(normalizedSearch))
      .sort((firstItem, secondItem) => {
        if (firstItem.startsWithTitle !== secondItem.startsWithTitle) {
          return (
            Number(secondItem.startsWithTitle) -
            Number(firstItem.startsWithTitle)
          );
        }

        return secondItem.item.rating - firstItem.item.rating;
      })
      .slice(0, 7)
      .map(({ item }) => item);
  }, [search]);

  const shouldShowSearchSuggestions =
    isSearchFocused &&
    searchSuggestions.length > 0 &&
    normalizeText(search).length > 0;

  const [displayedSearchSuggestions, setDisplayedSearchSuggestions] = useState<
    ContentItem[]
  >([]);
  const [leavingSearchSuggestionIds, setLeavingSearchSuggestionIds] = useState<
    number[]
  >([]);

  const shouldRenderSearchSuggestions =
    displayedSearchSuggestions.length > 0 &&
    (shouldShowSearchSuggestions || leavingSearchSuggestionIds.length > 0);

  useEffect(() => {
    const nextSuggestions = shouldShowSearchSuggestions
      ? searchSuggestions
      : [];
    const nextIds = new Set(nextSuggestions.map((item) => item.id));

    let removedIds: number[] = [];

    setDisplayedSearchSuggestions((currentSuggestions) => {
      const removedSuggestions = currentSuggestions.filter(
        (item) => !nextIds.has(item.id),
      );

      removedIds = removedSuggestions.map((item) => item.id);

      const nextById = new Map(nextSuggestions.map((item) => [item.id, item]));
      const mergedSuggestions = [
        ...nextSuggestions,
        ...removedSuggestions.filter((item) => !nextById.has(item.id)),
      ];

      return mergedSuggestions;
    });

    setLeavingSearchSuggestionIds((currentIds) => {
      const stillLeavingIds = currentIds.filter((id) => !nextIds.has(id));
      const mergedIds = new Set([...stillLeavingIds, ...removedIds]);
      return Array.from(mergedIds);
    });

    const timeoutId = window.setTimeout(() => {
      setDisplayedSearchSuggestions((currentSuggestions) =>
        currentSuggestions.filter((item) => nextIds.has(item.id)),
      );
      setLeavingSearchSuggestionIds((currentIds) =>
        currentIds.filter((id) => nextIds.has(id)),
      );
    }, 280);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchSuggestions, shouldShowSearchSuggestions]);

  function getStoredUsers() {
    const savedUsers = window.localStorage.getItem("kinoluma-users");

    if (!savedUsers) {
      return [];
    }

    try {
      const parsedUsers = JSON.parse(savedUsers);

      if (Array.isArray(parsedUsers)) {
        return parsedUsers as AuthUser[];
      }

      return [];
    } catch {
      return [];
    }
  }

  function saveUsers(users: AuthUser[]) {
    window.localStorage.setItem("kinoluma-users", JSON.stringify(users));
  }

  function saveCurrentUser(user: CurrentUser) {
    saveCurrentUserToStorage(user);
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

  function resetAuthForm() {
    setAuthName("");
    setAuthEmail("");
    setAuthPassword("");
    setAuthError("");
  }

  function loadLocalMovieActions() {
    return {
      ...emptyMovieActionState,
      watchLaterIds: readNumberArrayFromStorage("kinoluma-watch-later"),
      likedItemIds: readNumberArrayFromStorage("kinoluma-liked-items"),
      dislikedItemIds: readNumberArrayFromStorage("kinoluma-disliked-items"),
    };
  }

  function loadActionsAfterAuth() {
    void loadMovieActions()
      .catch(() => loadLocalMovieActions())
      .then((actions) => {
        setWatchLaterIds(actions.watchLaterIds);
        setLikedItemIds(actions.likedItemIds);
        setDislikedItemIds(actions.dislikedItemIds);
      })
      .finally(() => {
        setIsWatchLaterLoaded(true);
        setIsReactionsLoaded(true);
      });
  }

  function openAuthModal(mode: AuthMode) {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
    setIsAuthClosing(false);
    setAuthError("");
  }

  function closeAuthModal() {
    setIsAuthClosing(true);

    window.setTimeout(() => {
      setIsAuthModalOpen(false);
      setIsAuthClosing(false);
      resetAuthForm();
    }, 180);
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = authName.trim();
    const cleanEmail = authEmail.trim().toLowerCase();
    const cleanPassword = authPassword.trim();

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setAuthError("Введите нормальный email. Роботы тоже любят порядок.");
      return;
    }

    if (cleanPassword.length < 6) {
      setAuthError("Пароль должен быть минимум 6 символов.");
      return;
    }

    setAuthError("");

    if (authMode === "register") {
      if (cleanName.length < 2) {
        setAuthError("Введите имя минимум из 2 символов.");
        return;
      }

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
        setAuthError(
          "Аккаунт создан. Если Supabase просит подтверждение, подтверди email и войди.",
        );
        return;
      }

      const mappedUser = mapSupabaseUser(data.user);
      setCurrentUser(mappedUser);
      saveCurrentUser(mappedUser);
      setIsWatchLaterLoaded(true);
      setIsReactionsLoaded(true);
      closeAuthModal();
      loadActionsAfterAuth();
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

    const mappedUser = mapSupabaseUser(data.user);
    setCurrentUser(mappedUser);
    saveCurrentUser(mappedUser);
    setIsWatchLaterLoaded(true);
    setIsReactionsLoaded(true);
    closeAuthModal();
    loadActionsAfterAuth();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setWatchLaterIds([]);
    setLikedItemIds([]);
    setDislikedItemIds([]);
    removeCurrentUserFromStorage();
  }

  function openProfilePage() {
    window.location.href = "/profile";
  }

  function updateMovieRowState(
    ref: { current: HTMLDivElement | null },
    setState: Dispatch<SetStateAction<ScrollButtonsState>>,
  ) {
    const row = ref.current;

    if (!row) {
      return;
    }

    const maxScroll = row.scrollWidth - row.clientWidth;

    const nextState = {
      canScrollLeft: row.scrollLeft > 10,
      canScrollRight: row.scrollLeft < maxScroll - 10,
    };

    setState((currentState) => {
      if (
        currentState.canScrollLeft === nextState.canScrollLeft &&
        currentState.canScrollRight === nextState.canScrollRight
      ) {
        return currentState;
      }

      return nextState;
    });
  }

  function setupMovieRowObserver(
    ref: { current: HTMLDivElement | null },
    setState: Dispatch<SetStateAction<ScrollButtonsState>>,
  ) {
    const row = ref.current;

    if (!row) {
      return () => {};
    }

    let animationFrameId = 0;

    const update = () => {
      if (
        row.classList.contains("is-programmatic-scroll") ||
        animationFrameId
      ) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = 0;
        updateMovieRowState(ref, setState);
      });
    };

    const timeoutId = window.setTimeout(update, 100);

    row.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.clearTimeout(timeoutId);

      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      row.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }

  function updateAllMovieRowStates() {
    updateMovieRowState(newReleasesScrollRef, setNewReleasesScrollState);
    updateMovieRowState(curatedScrollRef, setCuratedScrollState);
    updateMovieRowState(watchLaterScrollRef, setWatchLaterScrollState);
  }

  function getMovieRowStep(row: HTMLDivElement) {
    const firstCard = row.querySelector<HTMLElement>(".movie-card-row");
    const track = row.querySelector<HTMLElement>(".movie-row-track");

    if (!firstCard || !track) {
      return Math.max(240, row.clientWidth * 0.72);
    }

    const trackStyles = window.getComputedStyle(track);
    const gap = Number.parseFloat(
      trackStyles.columnGap || trackStyles.gap || "0",
    );

    return (
      firstCard.getBoundingClientRect().width + (Number.isFinite(gap) ? gap : 0)
    );
  }

  function easeOutCubic(progress: number) {
    return 1 - Math.pow(1 - progress, 3);
  }

  function smoothScrollMovieRow(
    ref: { current: HTMLDivElement | null },
    direction: "left" | "right",
  ) {
    const row = ref.current;

    if (!row) {
      return;
    }

    if (rowScrollAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(rowScrollAnimationFrameRef.current);
      rowScrollAnimationFrameRef.current = null;
    }

    activeMovieRowRef.current?.classList.remove("is-programmatic-scroll");
    activeMovieRowRef.current = null;

    const start = row.scrollLeft;
    const maxScroll = Math.max(0, row.scrollWidth - row.clientWidth);
    const cardStep = getMovieRowStep(row);
    const cardsPerClick = Math.max(
      1,
      Math.floor(row.clientWidth / cardStep) - 1,
    );
    const distance = cardStep * cardsPerClick;
    const rawTarget =
      direction === "right" ? start + distance : start - distance;
    const snappedTarget = Math.round(rawTarget / cardStep) * cardStep;
    const target = Math.min(maxScroll, Math.max(0, snappedTarget));
    const scrollDistance = target - start;

    if (Math.abs(scrollDistance) < 1) {
      updateAllMovieRowStates();
      return;
    }

    const duration = Math.min(
      720,
      Math.max(420, Math.abs(scrollDistance) * 0.55),
    );
    const startedAt = performance.now();

    row.classList.add("is-programmatic-scroll");
    activeMovieRowRef.current = row;

    const animate = (currentTime: number) => {
      const progress = Math.min((currentTime - startedAt) / duration, 1);
      row.scrollLeft = start + scrollDistance * easeOutCubic(progress);

      if (progress < 1) {
        rowScrollAnimationFrameRef.current =
          window.requestAnimationFrame(animate);
        return;
      }

      row.scrollLeft = target;
      row.classList.remove("is-programmatic-scroll");
      activeMovieRowRef.current = null;
      rowScrollAnimationFrameRef.current = null;
      updateAllMovieRowStates();
    };

    rowScrollAnimationFrameRef.current = window.requestAnimationFrame(animate);
  }

  function handleTypeClick(type: string) {
    setSelectedType(type);
    setSelectedGenre("Все");
  }

  function highlightCategorySection(section: HTMLElement | null) {
    if (!section) {
      return;
    }

    if (categoryHighlightTimeoutRef.current !== null) {
      window.clearTimeout(categoryHighlightTimeoutRef.current);
      categoryHighlightTimeoutRef.current = null;
    }

    section.classList.remove("kinoluma-category-scroll-target");

    window.requestAnimationFrame(() => {
      section.classList.add("kinoluma-category-scroll-target");

      categoryHighlightTimeoutRef.current = window.setTimeout(() => {
        section.classList.remove("kinoluma-category-scroll-target");
        categoryHighlightTimeoutRef.current = null;
      }, 1250);
    });
  }

  function scrollToCategory(sectionRef: RefObject<HTMLElement | null>) {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    if (categoryScrollAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(categoryScrollAnimationFrameRef.current);
      categoryScrollAnimationFrameRef.current = null;
    }

    const header = document.querySelector<HTMLElement>(".mobile-header");
    const headerHeight = header?.getBoundingClientRect().height ?? 76;
    const extraOffset = window.innerWidth <= 768 ? 18 : 26;

    const targetTop = Math.max(
      0,
      section.getBoundingClientRect().top +
        window.scrollY -
        headerHeight -
        extraOffset,
    );

    const startTop = window.scrollY;
    const distance = targetTop - startTop;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || Math.abs(distance) < 2) {
      window.scrollTo({
        top: targetTop,
        behavior: "auto",
      });

      highlightCategorySection(section);
      return;
    }

    const duration = Math.min(1050, Math.max(650, Math.abs(distance) * 0.45));
    const startedAt = performance.now();

    function easeOutQuint(progress: number) {
      return 1 - Math.pow(1 - progress, 5);
    }

    function animateScroll(currentTime: number) {
      const progress = Math.min((currentTime - startedAt) / duration, 1);
      const easedProgress = easeOutQuint(progress);

      window.scrollTo({
        top: startTop + distance * easedProgress,
        behavior: "auto",
      });

      if (progress < 1) {
        categoryScrollAnimationFrameRef.current =
          window.requestAnimationFrame(animateScroll);
        return;
      }

      window.scrollTo({
        top: targetTop,
        behavior: "auto",
      });

      categoryScrollAnimationFrameRef.current = null;
      highlightCategorySection(section);
    }

    categoryScrollAnimationFrameRef.current =
      window.requestAnimationFrame(animateScroll);
  }

  function openCatalogPage(type: string) {
    const slug = catalogSlugByType[type];

    if (!slug) {
      return;
    }

    router.push(`/catalog/${slug}`);
  }

  function openDetails(item: ContentItem) {
    setTrailerItem(null);
    setIsTrailerClosing(false);
    setSelectedItem(item);
    setIsDetailsClosing(false);
  }

  function getRandomMovie(excludedId?: number) {
    const candidates = content.filter((item) => item.id !== excludedId);
    const source = candidates.length > 0 ? candidates : content;
    const randomIndex = Math.floor(Math.random() * source.length);

    return source[randomIndex] || content[0];
  }

  function openRandomPick() {
    openDetails(getRandomMovie(selectedItem?.id));
  }

  function openContent(item: ContentItem) {
    router.push(`/movie/${item.slug}`);
  }

  function openTrailer(item: ContentItem) {
    setSelectedItem(null);
    setIsDetailsClosing(false);
    setTrailerItem(item);
    setIsTrailerClosing(false);
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
      setDislikedItemIds((currentDislikedIds) =>
        currentDislikedIds.filter((id) => id !== itemId),
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
      setLikedItemIds((currentLikedIds) =>
        currentLikedIds.filter((id) => id !== itemId),
      );
      void syncMovieAction(itemId, "liked", false);
    }
  }

  useEffect(() => {
    function updatePopularGridColumns() {
      const width = window.innerWidth;

      if (width >= 1280) {
        setPopularGridColumns(6);
        return;
      }

      if (width >= 1024) {
        setPopularGridColumns(3);
        return;
      }

      if (width >= 640) {
        setPopularGridColumns(2);
        return;
      }

      setPopularGridColumns(1);
    }

    updatePopularGridColumns();
    window.addEventListener("resize", updatePopularGridColumns);

    return () => {
      window.removeEventListener("resize", updatePopularGridColumns);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadDailyFeatured() {
      try {
        const response = await fetch(
          `/api/home/featured?day=${encodeURIComponent(getDailyFeaturedDateKey())}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          ids?: number[];
          dateKey?: string;
        };

        if (isCancelled) {
          return;
        }

        if (Array.isArray(data.ids) && data.ids.length > 0) {
          setDailyFeaturedIds(data.ids.filter((id) => typeof id === "number"));
        }

        if (typeof data.dateKey === "string" && data.dateKey) {
          setFeaturedDayKey(data.dateKey);
        }
      } catch {
        // Если API временно недоступен, оставляем клиентскую ежедневную подборку.
      }
    }

    loadDailyFeatured();
    const intervalId = window.setInterval(loadDailyFeatured, 60 * 60 * 1000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setFeaturedIndex(0);
  }, [featuredContentPoolKey]);

  useEffect(() => {
    const track = featuredRouletteRef.current;
    const activeButton = track?.querySelector<HTMLButtonElement>(
      `[data-featured-roulette-index="${featuredIndex}"]`,
    );

    if (!track || !activeButton) {
      return;
    }

    const targetTop =
      activeButton.offsetTop -
      track.clientHeight / 2 +
      activeButton.clientHeight / 2;

    track.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  }, [featuredIndex, featuredContentPoolKey]);

  useEffect(() => {
    setPopularVisibleRows(4);
  }, [search, selectedType, selectedGenre]);

  useEffect(() => {
    if (
      featuredContentPool.length <= 1 ||
      selectedItem ||
      trailerItem ||
      isAuthModalOpen
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setFeaturedIndex(
        (currentIndex) => (currentIndex + 1) % featuredContentPool.length,
      );
    }, FEATURED_ROTATION_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    featuredContentPool.length,
    featuredContentPoolKey,
    selectedItem,
    trailerItem,
    isAuthModalOpen,
  ]);

  useEffect(() => {
    return setupMovieRowObserver(
      newReleasesScrollRef,
      setNewReleasesScrollState,
    );
  }, [newReleasesContent.length]);

  useEffect(() => {
    return setupMovieRowObserver(curatedScrollRef, setCuratedScrollState);
  }, [curatedContent.length]);

  useEffect(() => {
    return setupMovieRowObserver(watchLaterScrollRef, setWatchLaterScrollState);
  }, [watchLaterContent.length]);

  useEffect(() => {
    return () => {
      if (rowScrollAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(rowScrollAnimationFrameRef.current);
      }

      if (categoryScrollAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(categoryScrollAnimationFrameRef.current);
      }

      if (categoryHighlightTimeoutRef.current !== null) {
        window.clearTimeout(categoryHighlightTimeoutRef.current);
      }

      activeMovieRowRef.current?.classList.remove("is-programmatic-scroll");
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    function loadLocalActions() {
      return {
        ...emptyMovieActionState,
        watchLaterIds: readNumberArrayFromStorage("kinoluma-watch-later"),
        likedItemIds: readNumberArrayFromStorage("kinoluma-liked-items"),
        dislikedItemIds: readNumberArrayFromStorage("kinoluma-disliked-items"),
      };
    }

    function wait<T>(ms: number, value: T) {
      return new Promise<T>((resolve) => {
        window.setTimeout(() => resolve(value), ms);
      });
    }

    async function initializeAuth() {
      const localActions = loadLocalActions();
      const savedUser = readCurrentUserFromStorage();

      if (savedUser) {
        setCurrentUser(savedUser);
      }

      try {
        const user = await getCurrentSupabaseUser();

        if (!isMounted) {
          return;
        }

        if (!user) {
          setCurrentUser(null);
          removeCurrentUserFromStorage();
          setWatchLaterIds(localActions.watchLaterIds);
          setLikedItemIds(localActions.likedItemIds);
          setDislikedItemIds(localActions.dislikedItemIds);
          return;
        }

        const mappedUser = mapSupabaseUser(user);
        setCurrentUser(mappedUser);
        saveCurrentUser(mappedUser);

        const actions = await Promise.race([
          loadMovieActions().catch(() => localActions),
          wait(5500, localActions),
        ]);

        if (!isMounted) {
          return;
        }

        setWatchLaterIds(actions.watchLaterIds);
        setLikedItemIds(actions.likedItemIds);
        setDislikedItemIds(actions.dislikedItemIds);
      } catch (error) {
        console.error("Не удалось восстановить сессию Supabase:", error);

        if (!isMounted) {
          return;
        }

        setCurrentUser(savedUser);
        setWatchLaterIds(localActions.watchLaterIds);
        setLikedItemIds(localActions.likedItemIds);
        setDislikedItemIds(localActions.dislikedItemIds);
      } finally {
        if (isMounted) {
          setIsWatchLaterLoaded(true);
          setIsReactionsLoaded(true);
        }
      }
    }

    void initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) {
          return;
        }

        if (!session?.user) {
          if (event === "SIGNED_OUT") {
            const localActions = loadLocalActions();
            setCurrentUser(null);
            removeCurrentUserFromStorage();
            setWatchLaterIds(localActions.watchLaterIds);
            setLikedItemIds(localActions.likedItemIds);
            setDislikedItemIds(localActions.dislikedItemIds);
          }

          return;
        }

        const mappedUser = mapSupabaseUser(session.user);
        setCurrentUser(mappedUser);
        saveCurrentUser(mappedUser);

        const localActions = loadLocalActions();
        const actions = await loadMovieActions().catch(() => localActions);

        if (!isMounted) {
          return;
        }

        setWatchLaterIds(actions.watchLaterIds);
        setLikedItemIds(actions.likedItemIds);
        setDislikedItemIds(actions.dislikedItemIds);
        setIsWatchLaterLoaded(true);
        setIsReactionsLoaded(true);
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isWatchLaterLoaded) {
      return;
    }

    window.localStorage.setItem(
      "kinoluma-watch-later",
      JSON.stringify(watchLaterIds),
    );
  }, [watchLaterIds, isWatchLaterLoaded]);

  useEffect(() => {
    if (!isReactionsLoaded) {
      return;
    }

    window.localStorage.setItem(
      "kinoluma-liked-items",
      JSON.stringify(likedItemIds),
    );
  }, [likedItemIds, isReactionsLoaded]);

  useEffect(() => {
    if (!isReactionsLoaded) {
      return;
    }

    window.localStorage.setItem(
      "kinoluma-disliked-items",
      JSON.stringify(dislikedItemIds),
    );
  }, [dislikedItemIds, isReactionsLoaded]);

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

      if (isAuthModalOpen) {
        closeAuthModal();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedItem, trailerItem, isAuthModalOpen]);

  function focusMobileSearch() {
    const searchElement =
      document.getElementById("kinoluma-search-section") ??
      document.getElementById("kinoluma-search") ??
      searchInputRef.current;

    if (!searchElement) {
      return;
    }

    const elementTop =
      searchElement.getBoundingClientRect().top + window.scrollY;
    const viewportHeight = window.innerHeight || 720;
    const isMobileWidth = window.innerWidth <= 768;
    const offset = isMobileWidth
      ? Math.max(10, Math.min(28, viewportHeight * 0.035))
      : Math.max(24, Math.min(72, viewportHeight * 0.08));
    const targetPosition = Math.max(0, elementTop - offset);

    window.scrollTo({
      top: targetPosition,
      behavior: "smooth",
    });

    window.setTimeout(() => {
      searchInputRef.current?.focus({ preventScroll: true });
      setIsSearchFocused(true);
    }, 620);
  }

  return (
    <main className="kinoluma-home min-h-screen overflow-x-hidden bg-black pb-[calc(92px+env(safe-area-inset-bottom))] text-white md:pb-0">
      <style>{`
        /* KinoLuma: широкий фон и затемнение для блока "Популярное сейчас" */

        .kinoluma-category-scroll-target {
          border-radius: 32px;
          animation: kinolumaCategoryArrival 1250ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes kinolumaCategoryArrival {
          0% {
            transform: translateY(18px);
            opacity: 0.86;
            box-shadow: 0 0 0 rgba(255, 255, 255, 0);
            filter: brightness(0.96);
          }

          38% {
            transform: translateY(0);
            opacity: 1;
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.14),
              0 24px 80px rgba(255, 255, 255, 0.08);
            filter: brightness(1.12);
          }

          100% {
            transform: translateY(0);
            opacity: 1;
            box-shadow: 0 0 0 rgba(255, 255, 255, 0);
            filter: brightness(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .kinoluma-category-scroll-target {
            animation: none;
          }
        }
        .kinoluma-home > section:first-of-type {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          background:
            radial-gradient(circle at 78% 18%, rgba(255, 255, 255, 0.16), transparent 25%),
            radial-gradient(circle at 63% 72%, rgba(115, 115, 115, 0.16), transparent 34%),
            radial-gradient(circle at 18% 22%, rgba(255, 255, 255, 0.08), transparent 24%),
            linear-gradient(135deg, #020202 0%, #080808 34%, #121212 58%, #050505 100%);
        }

        .kinoluma-home > section:first-of-type::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(0, 0, 0, 0.96) 0%, rgba(0, 0, 0, 0.84) 38%, rgba(0, 0, 0, 0.56) 68%, rgba(0, 0, 0, 0.82) 100%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.24) 0%, rgba(0, 0, 0, 0.08) 42%, rgba(0, 0, 0, 0.88) 100%),
            repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.055) 0 1px, transparent 1px 84px);
        }

        .kinoluma-home > section:first-of-type::after {
          content: "K";
          position: absolute;
          right: clamp(-80px, -4vw, -20px);
          top: 50%;
          z-index: 0;
          transform: translateY(-50%) rotate(-8deg);
          font-size: clamp(330px, 34vw, 720px);
          line-height: 0.8;
          font-weight: 950;
          letter-spacing: -0.18em;
          color: rgba(255, 255, 255, 0.055);
          text-shadow: 0 0 90px rgba(255, 255, 255, 0.08);
          pointer-events: none;
          user-select: none;
        }

        .kinoluma-home > section:first-of-type > * {
          position: relative;
          z-index: 3;
        }

        .kinoluma-home > section:first-of-type .featured-copy {
          position: relative;
          z-index: 4;
        }

        .kinoluma-more-button-wrap {
          width: 100%;
          display: flex;
          justify-content: center;
          padding-top: 20px;
          padding-bottom: 28px;
        }

        .kinoluma-more-button {
          position: relative;
          isolation: isolate;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 13px;
          min-width: 150px;
          height: 56px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.18), transparent 48%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.095), rgba(255, 255, 255, 0.045)),
            rgba(8, 8, 8, 0.86);
          color: #ffffff;
          padding: 0 27px;
          font-size: 15px;
          font-weight: 950;
          letter-spacing: 0.015em;
          line-height: 1;
          box-shadow:
            0 30px 86px rgba(0, 0, 0, 0.8),
            0 0 0 1px rgba(255, 255, 255, 0.035) inset,
            0 1px 0 rgba(255, 255, 255, 0.16) inset;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          cursor: pointer;
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            background 180ms ease,
            box-shadow 180ms ease;
        }

        .kinoluma-more-button::before {
          content: "";
          position: absolute;
          inset: 1px;
          z-index: -1;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0));
          pointer-events: none;
        }

        .kinoluma-more-button::after {
          content: "";
          position: absolute;
          inset: -28px;
          z-index: -2;
          border-radius: inherit;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.14), transparent 62%);
          opacity: 0.48;
          transition: opacity 180ms ease, transform 180ms ease;
        }

        .kinoluma-more-button:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 255, 255, 0.3);
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.25), transparent 52%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.06)),
            rgba(14, 14, 14, 0.92);
          box-shadow:
            0 36px 100px rgba(0, 0, 0, 0.86),
            0 0 42px rgba(255, 255, 255, 0.075),
            0 0 0 1px rgba(255, 255, 255, 0.055) inset,
            0 1px 0 rgba(255, 255, 255, 0.2) inset;
        }

        .kinoluma-more-button:hover::after {
          opacity: 0.82;
          transform: scale(1.05);
        }

        .kinoluma-more-button:active {
          transform: scale(0.97);
        }

        .kinoluma-more-button-icon {
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
          transition:
            transform 180ms ease,
            background 180ms ease;
        }

        .kinoluma-more-button:hover .kinoluma-more-button-icon {
          transform: translateY(2px);
          background: rgba(255, 255, 255, 0.17);
        }

        @media (max-width: 768px) {
          .kinoluma-more-button-wrap {
            padding-top: 54px;
            padding-bottom: 24px;
          }

          .kinoluma-more-button {
            min-width: 138px;
            height: 54px;
            padding: 0 24px;
          }
        }


        @keyframes homeSearchHubCardIn {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.985);
            filter: blur(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        .home-search-hub {
          position: relative;
          isolation: isolate;
        }

        .home-search-hub-panel {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.085);
          border-radius: 34px;
          background:
            radial-gradient(circle at 18% 0%, rgba(255, 255, 255, 0.12), transparent 30%),
            radial-gradient(circle at 88% 18%, rgba(255, 255, 255, 0.06), transparent 26%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.058), rgba(255, 255, 255, 0.024)),
            rgba(5, 5, 5, 0.82);
          padding: clamp(22px, 4vw, 38px);
          box-shadow:
            0 28px 90px rgba(0, 0, 0, 0.58),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .home-search-hub-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.026) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.018) 1px, transparent 1px);
          background-size: 58px 58px;
          mask-image: radial-gradient(circle at 50% 0%, black 0%, transparent 66%);
          opacity: 0.58;
        }

        .home-search-hub-head,
        .home-search-hub-grid {
          position: relative;
          z-index: 2;
        }

        .home-search-hub-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 22px;
          margin-bottom: 24px;
        }

        .home-search-hub-kicker {
          margin: 0;
          color: #737373;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 0.28em;
          text-transform: uppercase;
        }

        .home-search-hub-head h3 {
          max-width: 760px;
          margin: 10px 0 0;
          color: #ffffff;
          font-size: clamp(28px, 4.2vw, 54px);
          font-weight: 1000;
          letter-spacing: -0.065em;
          line-height: 0.98;
        }

        .home-search-hub-head p:not(.home-search-hub-kicker) {
          max-width: 760px;
          margin: 14px 0 0;
          color: #8f8f8f;
          font-size: 14px;
          font-weight: 650;
          line-height: 1.7;
        }

        .home-search-hub-all,
        .home-search-hub-card {
          color: inherit;
          text-decoration: none;
        }

        .home-search-hub-all {
          display: inline-flex;
          min-height: 46px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          padding: 0 18px;
          color: #f5f5f5;
          font-size: 13px;
          font-weight: 1000;
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, color 180ms ease;
        }

        .home-search-hub-all:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.28);
          background: #ffffff;
          color: #000000;
        }

        .home-search-hub-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .home-search-hub-card {
          position: relative;
          min-height: 275px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 28px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.028)),
            rgba(0, 0, 0, 0.45);
          padding: 18px;
          box-shadow:
            0 18px 60px rgba(0, 0, 0, 0.42),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          opacity: 0;
          animation: homeSearchHubCardIn 580ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transition: transform 200ms ease, border-color 200ms ease, background 200ms ease, box-shadow 200ms ease;
        }

        .home-search-hub-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255, 255, 255, 0.28);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04)),
            rgba(8, 8, 8, 0.78);
          box-shadow:
            0 26px 86px rgba(0, 0, 0, 0.62),
            0 0 42px rgba(255, 255, 255, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.13);
        }

        .home-search-hub-glow {
          position: absolute;
          width: 170px;
          height: 170px;
          right: -76px;
          top: -68px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          filter: blur(2px);
          opacity: 0.72;
          transition: transform 200ms ease, opacity 200ms ease;
        }

        .home-search-hub-card:hover .home-search-hub-glow {
          transform: scale(1.1);
          opacity: 0.95;
        }

        .home-search-hub-number {
          position: absolute;
          right: 16px;
          bottom: 10px;
          color: rgba(255, 255, 255, 0.045);
          font-size: 86px;
          font-weight: 1000;
          letter-spacing: -0.12em;
          line-height: 1;
        }

        .home-search-hub-card-topline,
        .home-search-hub-card-copy,
        .home-search-hub-card-bottom {
          position: relative;
          z-index: 2;
        }

        .home-search-hub-card-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .home-search-hub-card-topline span,
        .home-search-hub-card-topline strong {
          display: inline-flex;
          min-height: 34px;
          align-items: center;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 1000;
        }

        .home-search-hub-card-topline span {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.34);
          padding: 0 11px;
          color: #d4d4d4;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .home-search-hub-card-topline strong {
          justify-content: center;
          min-width: 58px;
          background: #ffffff;
          padding: 0 12px;
          color: #000000;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
        }

        .home-search-hub-card-copy {
          display: block;
          margin-top: 54px;
        }

        .home-search-hub-card-copy strong {
          display: block;
          color: #ffffff;
          font-size: 24px;
          font-weight: 1000;
          letter-spacing: -0.05em;
          line-height: 1.04;
        }

        .home-search-hub-card-copy span {
          display: block;
          margin-top: 12px;
          color: #8b8b8b;
          font-size: 13px;
          font-weight: 650;
          line-height: 1.55;
        }

        .home-search-hub-card-bottom {
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #d4d4d4;
          font-size: 12px;
          font-weight: 1000;
        }

        .home-search-hub-card-bottom span:first-child {
          min-width: 0;
          color: #737373;
        }

        .home-search-hub-card-bottom span:last-child {
          white-space: nowrap;
          color: #ffffff;
        }

        @media (max-width: 1180px) {
          .home-search-hub-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .home-search-hub {
            padding-left: 16px !important;
            padding-right: 16px !important;
            padding-bottom: 104px !important;
          }

          .home-search-hub-panel {
            border-radius: 28px;
            padding: 20px;
          }

          .home-search-hub-head {
            align-items: stretch;
            flex-direction: column;
          }

          .home-search-hub-all {
            width: 100%;
          }

          .home-search-hub-grid {
            grid-template-columns: 1fr;
          }

          .home-search-hub-card {
            min-height: 245px;
          }

          .home-search-hub-card-copy {
            margin-top: 40px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .home-search-hub-card {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
          }
        }

        .kinoluma-open-all-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.095), rgba(255, 255, 255, 0.035));
          color: #f7f7f7;
          padding: 0.76rem 1.16rem;
          font-size: 0.84rem;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0.015em;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 14px 38px rgba(0, 0, 0, 0.36);
          backdrop-filter: blur(18px);
          transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease, background 220ms ease, color 220ms ease;
        }

        .kinoluma-open-all-button::before {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0) 64%);
          pointer-events: none;
        }

        .kinoluma-open-all-button::after {
          content: "";
          width: 0.44rem;
          height: 0.44rem;
          border-bottom: 2px solid currentColor;
          border-right: 2px solid currentColor;
          opacity: 0.76;
          transform: rotate(-45deg);
          transition: transform 220ms ease, opacity 220ms ease;
        }

        .kinoluma-open-all-button:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.34);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.07));
          color: #ffffff;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.18),
            0 18px 52px rgba(0, 0, 0, 0.44),
            0 0 28px rgba(255, 255, 255, 0.06);
        }

        .kinoluma-open-all-button:hover::after {
          opacity: 1;
          transform: rotate(-45deg) translate(2px, 2px);
        }

        .kinoluma-open-all-button:active {
          transform: translateY(0) scale(0.97);
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

        .modal-overlay-open {
          animation: modalOverlayOpen 180ms ease-out forwards;
        }

        .modal-overlay-close {
          animation: modalOverlayClose 160ms ease-in forwards;
        }

        .modal-window-open {
          animation: modalWindowOpen 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .modal-window-close {
          animation: modalWindowClose 160ms ease-in forwards;
        }

        @keyframes featuredBackdropEnter {
          from {
            opacity: 0;
            transform: scale(1.04);
            filter: blur(10px);
          }
          to {
            opacity: 1;
            transform: scale(1);
            filter: blur(0);
          }
        }

        @keyframes featuredCopyEnter {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes featuredProgress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        .featured-backdrop {
          animation: featuredBackdropEnter 850ms cubic-bezier(0.16, 1, 0.3, 1) both;
          transform-origin: center;
        }

        .featured-copy {
          animation: featuredCopyEnter 620ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .featured-progress {
          animation: featuredProgress 15000ms linear both;
          transform-origin: left center;
        }

        .horizontal-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
          scroll-behavior: smooth;
        }

        .horizontal-scroll::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }

        .movie-row-arrow {
          opacity: 0;
          pointer-events: none;
          transform: translateY(-50%) scale(0.92);
          transition:
            opacity 220ms ease,
            transform 220ms ease,
            background-color 180ms ease,
            color 180ms ease,
            border-color 180ms ease;
        }

        .movie-row-area:hover .movie-row-arrow:not(.movie-row-arrow-hidden) {
          opacity: 1;
          pointer-events: auto;
          transform: translateY(-50%) scale(1);
        }

        .movie-row-arrow-hidden {
          display: none;
        }

        .movie-row-area {
          isolation: isolate;
        }

        .movie-row-scroll {
          overflow-x: auto;
          overscroll-behavior-x: contain;
          -webkit-overflow-scrolling: touch;
          contain: layout paint;
          padding: 10px 2px 22px;
          scroll-padding-left: 2px;
        }

        .movie-row-scroll.is-programmatic-scroll {
          pointer-events: none;
          scroll-behavior: smooth;
        }

        .movie-row-scroll.is-programmatic-scroll .movie-card,
        .movie-row-scroll.is-programmatic-scroll .movie-poster img {
          transition: none !important;
        }

        .movie-row-scroll.is-programmatic-scroll .movie-card:hover {
          transform: none;
        }

        .movie-row-track {
          display: flex;
          width: max-content;
          align-items: stretch;
          gap: 24px;
        }

        .movie-card {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(10,10,10,0.96);
          box-shadow: 0 18px 48px rgba(0,0,0,0.38);
          transition:
            opacity 700ms ease,
            transform 700ms ease,
            border-color 220ms ease,
            background-color 220ms ease,
            box-shadow 220ms ease;
        }

        .movie-card:hover {
          transform: translateY(-8px);
          border-color: rgba(255,255,255,0.30);
          background: rgba(23,23,23,0.96);
          box-shadow: 0 24px 70px rgba(0,0,0,0.55);
        }

        .movie-card-row {
          --row-card-width: clamp(236px, 14vw, 264px);
          flex: 0 0 var(--row-card-width);
          width: var(--row-card-width);
          min-width: var(--row-card-width);
          height: 552px;
        }

        .movie-card-grid {
          width: 100%;
          height: 100%;
          min-height: 560px;
        }

        .movie-poster {
          position: relative;
          display: block;
          width: 100%;
          overflow: hidden;
          background: #111111;
          text-align: left;
          flex-shrink: 0;
        }

        .movie-poster-row {
          height: 324px;
        }

        .movie-poster-grid {
          height: 320px;
        }

        .movie-card-body {
          display: flex;
          min-height: 0;
          flex: 1;
          flex-direction: column;
          padding: 16px;
        }

        .movie-card-row .movie-card-body {
          padding-bottom: 16px;
        }

        .movie-card-title {
          height: 42px;
          min-height: 42px;
          text-align: left;
          font-size: 16px;
          line-height: 1.25;
          font-weight: 900;
          color: white;
          transition: color 180ms ease;
        }

        .movie-card-title:hover {
          color: #d4d4d4;
        }

        .movie-card-original {
          margin-top: 4px;
          height: 20px;
          font-size: 13px;
          line-height: 20px;
          color: #737373;
        }

        .movie-card-row .movie-card-title {
          height: 38px;
          min-height: 38px;
          line-height: 1.18;
        }

        .movie-card-row .movie-card-original {
          margin-top: 2px;
          height: 18px;
          line-height: 18px;
        }

        .movie-card-description {
          margin-top: 10px;
          height: 42px;
          min-height: 42px;
          font-size: 14px;
          line-height: 1.45;
          color: #737373;
        }

        .movie-card-row .movie-card-description {
          margin-top: 6px;
          transform: translateY(-3px);
        }

        .movie-card-tags {
          display: flex;
          align-items: center;
          height: 28px;
          min-height: 28px;
          max-height: 28px;
          flex-wrap: nowrap;
          gap: 8px;
          overflow: hidden;
          margin-top: 10px;
        }

        .movie-card-row .movie-card-tags {
          margin-top: 12px;
          transform: translateY(-6px);
        }

        .movie-card-tag {
          display: inline-flex;
          height: 28px;
          max-width: 118px;
          min-width: 0;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.14);
          padding: 0 10px;
          font-size: 12px;
          line-height: 1;
          color: #a3a3a3;
          background: rgba(255,255,255,0.015);
        }

        .movie-card-actions {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 10px;
          margin-top: auto;
          padding-top: 14px;
        }

        .movie-card-row .movie-card-actions {
          padding-top: 10px;
          transform: none;
        }

        .movie-card-action-primary,
        .movie-card-action-secondary {
          display: flex;
          box-sizing: border-box;
          height: 38px;
          min-width: 0;
          width: 100%;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          padding: 0 8px;
          font-size: 13px;
          line-height: 1;
          font-weight: 900;
          white-space: nowrap;
          transition:
            background-color 180ms ease,
            color 180ms ease,
            border-color 180ms ease,
            transform 120ms ease,
            box-shadow 180ms ease;
        }

        .movie-card-action-primary {
          border: 2px solid white;
          background: white;
          color: black;
        }

        .movie-card-action-primary:hover {
          background: black;
          color: white;
          box-shadow: 0 0 18px rgba(255,255,255,0.18);
        }

        .movie-card-action-secondary {
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.02);
          color: #d4d4d4;
        }

        .movie-card-action-secondary:hover {
          background: white;
          color: black;
        }

        .movie-card-action-primary:active,
        .movie-card-action-secondary:active {
          transform: scale(0.98);
        }

        .mh-clamp-1,
        .mh-clamp-2,
        .mh-clamp-3 {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          overflow: hidden;
          overflow-wrap: anywhere;
        }

        .mh-clamp-1 {
          -webkit-line-clamp: 1;
        }

        .mh-clamp-2 {
          -webkit-line-clamp: 2;
        }

        .mh-clamp-3 {
          -webkit-line-clamp: 3;
        }

        .kinoluma-top-search-section {
          isolation: isolate;
        }

        .kinoluma-top-search-section::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 18% 0%, rgba(255,255,255,0.12), transparent 30%),
            radial-gradient(circle at 82% 30%, rgba(255,255,255,0.08), transparent 32%);
          opacity: 0.72;
        }

        .kinoluma-top-search-shell {
          position: relative;
          overflow: visible;
        }

        .kinoluma-top-search-input {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 48px rgba(0,0,0,0.28);
        }

        .desktop-header-search {
          margin-left: clamp(18px, 4vw, 72px);
          margin-right: clamp(18px, 3vw, 54px);
        }

        .desktop-header-search-input {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            0 14px 44px rgba(0,0,0,0.30);
        }

        .desktop-header-search-input:focus {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.12),
            0 0 0 1px rgba(255,255,255,0.12),
            0 18px 58px rgba(0,0,0,0.48);
        }

        @keyframes searchSuggestionPanelIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
            filter: blur(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes searchSuggestionItemIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .mobile-suggestions {
          transform-origin: top center;
          animation: searchSuggestionPanelIn 210ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .search-suggestion-motion {
          max-height: 112px;
          opacity: 1;
          transform: translateX(0) scale(1);
          will-change: opacity, transform, max-height, padding;
          transition:
            max-height 260ms cubic-bezier(0.16, 1, 0.3, 1),
            opacity 220ms ease,
            transform 260ms cubic-bezier(0.16, 1, 0.3, 1),
            padding 260ms cubic-bezier(0.16, 1, 0.3, 1),
            margin 260ms cubic-bezier(0.16, 1, 0.3, 1),
            background-color 180ms ease;
        }

        .search-suggestion-motion:not(.is-leaving) {
          animation: searchSuggestionItemIn 240ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .search-suggestion-motion.is-leaving {
          max-height: 0;
          opacity: 0;
          transform: translateX(-12px) scale(0.985);
          pointer-events: none;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          overflow: hidden;
        }

        .featured-side-rail {
          position: relative;
          z-index: 4;
          width: clamp(560px, 38vw, 760px);
          flex: 0 0 clamp(560px, 38vw, 760px);
          align-self: center;
          margin-left: auto;
          display: flex;
          flex-direction: row-reverse;
          align-items: stretch;
          justify-content: flex-start;
          gap: 16px;
          height: clamp(430px, 58vh, 560px);
          max-height: calc(100vh - 180px);
          min-height: 430px;
        }

        .featured-roulette {
          position: relative;
          width: 100%;
          height: 100%;
          flex: 1 1 0;
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background:
            radial-gradient(circle at 50% 0%, rgba(255,255,255,0.14), transparent 43%),
            radial-gradient(circle at 100% 18%, rgba(255,255,255,0.08), transparent 36%),
            linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025)),
            rgba(4,4,4,0.72);
          box-shadow:
            0 34px 110px rgba(0,0,0,0.62),
            0 0 0 1px rgba(255,255,255,0.04) inset,
            inset 0 1px 0 rgba(255,255,255,0.10);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          overflow: hidden;
        }

        .featured-roulette::before,
        .featured-roulette::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          z-index: 3;
          height: 70px;
          pointer-events: none;
        }

        .featured-roulette::before {
          top: 66px;
          background: linear-gradient(180deg, rgba(5,5,5,0.96), rgba(5,5,5,0));
        }

        .featured-roulette::after {
          bottom: 58px;
          background: linear-gradient(0deg, rgba(5,5,5,0.96), rgba(5,5,5,0));
        }

        .featured-roulette-head {
          position: relative;
          z-index: 4;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 18px 16px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .featured-roulette-title {
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.72);
        }

        .featured-roulette-count {
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 950;
          color: rgba(255,255,255,0.72);
        }

        .featured-roulette-track {
          position: relative;
          z-index: 2;
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior-y: contain;
          padding: 14px 10px 14px;
          scroll-snap-type: none;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.24) transparent;
          touch-action: pan-y;
        }

        .featured-roulette-track::-webkit-scrollbar {
          width: 6px;
        }

        .featured-roulette-track::-webkit-scrollbar-track {
          background: transparent;
        }

        .featured-roulette-track::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(255,255,255,0.22);
        }

        .featured-roulette-item {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr);
          gap: 10px;
          width: 100%;
          min-height: 72px;
          align-items: center;
          scroll-snap-align: center;
          border-radius: 22px;
          border: 1px solid transparent;
          padding: 9px;
          color: #ffffff;
          text-align: left;
          opacity: 0.58;
          transform: scale(0.96);
          transition:
            opacity 220ms ease,
            transform 240ms cubic-bezier(0.16, 1, 0.3, 1),
            border-color 220ms ease,
            background 220ms ease,
            box-shadow 240ms ease;
        }

        .featured-roulette-item:hover {
          opacity: 0.9;
          transform: scale(0.985);
          background: rgba(255,255,255,0.055);
          border-color: rgba(255,255,255,0.10);
        }

        .featured-roulette-item.is-active {
          opacity: 1;
          transform: scale(1);
          border-color: rgba(255,255,255,0.22);
          background:
            radial-gradient(circle at 0% 0%, rgba(255,255,255,0.14), transparent 46%),
            rgba(255,255,255,0.08);
          box-shadow:
            0 18px 54px rgba(0,0,0,0.44),
            inset 0 1px 0 rgba(255,255,255,0.14);
        }

        .featured-roulette-poster {
          position: relative;
          width: 48px;
          aspect-ratio: 2 / 3;
          overflow: hidden;
          border-radius: 14px;
          background: #111111;
          box-shadow: 0 14px 34px rgba(0,0,0,0.42);
        }

        .featured-roulette-poster img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .featured-roulette-number {
          position: absolute;
          left: 5px;
          top: 5px;
          display: inline-flex;
          min-width: 22px;
          height: 22px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(0,0,0,0.74);
          border: 1px solid rgba(255,255,255,0.14);
          font-size: 10px;
          font-weight: 950;
          color: rgba(255,255,255,0.92);
          backdrop-filter: blur(10px);
        }

        .featured-roulette-name {
          min-width: 0;
        }

        .featured-roulette-name strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
          line-height: 1.15;
          font-weight: 950;
          color: #ffffff;
        }

        .featured-roulette-name span {
          margin-top: 6px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          color: rgba(255,255,255,0.58);
          font-size: 10px;
          font-weight: 850;
        }

        .featured-roulette-foot {
          position: relative;
          z-index: 4;
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr) 38px;
          gap: 8px;
          align-items: center;
          padding: 10px 12px 14px;
          border-top: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.22);
        }

        .featured-roulette-arrow {
          display: inline-flex;
          height: 36px;
          width: 36px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.13);
          background: rgba(255,255,255,0.055);
          color: white;
          font-size: 18px;
          font-weight: 950;
          transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
        }

        .featured-roulette-arrow:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.25);
          background: rgba(255,255,255,0.12);
        }

        .featured-roulette-hint {
          min-width: 0;
          text-align: center;
          font-size: 11px;
          font-weight: 850;
          line-height: 1.35;
          color: rgba(255,255,255,0.46);
        }

        .featured-roulette.is-recent {
          flex: 1 1 0;
          min-height: 0;
        }

        .featured-roulette.is-recent .featured-roulette-track {
          flex: 1 1 auto;
          min-height: 0;
        }

        .featured-roulette.is-recent .featured-roulette-item {
          min-height: 72px;
          opacity: 0.92;
        }

        .featured-roulette.is-recent .featured-roulette-poster {
          width: 48px;
          border-radius: 13px;
          background: radial-gradient(circle at 35% 18%, rgba(255,255,255,0.16), transparent 38%), #101010;
        }

        .featured-roulette.is-recent .featured-roulette-item:hover {
          opacity: 1;
        }

        .featured-roulette.is-recent .featured-roulette-item.is-active {
          border-color: rgba(255,255,255,0.13);
          background: rgba(255,255,255,0.055);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.11);
        }

        .mobile-featured-poster-card {
          display: block;
          width: clamp(176px, 14vw, 246px);
          aspect-ratio: 2 / 3;
          flex: 0 0 auto;
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)), #080808;
          box-shadow:
            0 34px 110px rgba(0, 0, 0, 0.7),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset;
          transform: translateZ(0);
          transition:
            transform 260ms cubic-bezier(0.16, 1, 0.3, 1),
            border-color 220ms ease,
            box-shadow 260ms ease;
        }

        .mobile-featured-poster-card:hover {
          transform: translateY(-5px) scale(1.012);
          border-color: rgba(255, 255, 255, 0.28);
          box-shadow:
            0 42px 130px rgba(0, 0, 0, 0.78),
            0 0 38px rgba(255, 255, 255, 0.08);
        }

        .mobile-featured-poster-card::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
          pointer-events: none;
        }

        @media (max-width: 1500px) {
          .featured-side-rail {
            width: clamp(500px, 36vw, 600px);
            flex-basis: clamp(500px, 36vw, 600px);
            gap: 12px;
          }

          .featured-roulette-title {
            font-size: 10px;
            letter-spacing: 0.18em;
          }

          .featured-roulette-name strong {
            font-size: 12px;
          }
        }

        @media (max-width: 1180px) {
          .featured-side-rail {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          .movie-row-track {
            gap: 16px;
          }

          .movie-card-row {
            --row-card-width: 222px;
            height: 540px;
          }

          .movie-card-row .movie-card-body {
            padding-bottom: 16px;
          }

          .movie-poster-row {
            height: 302px;
          }

          .movie-card-action-primary,
          .movie-card-action-secondary {
            height: 35px;
            font-size: 12px;
          }
        }


        @media (hover: none) {
          .movie-row-arrow {
            display: none !important;
          }

          .movie-card:hover {
            transform: none;
          }

          .movie-card:hover .movie-poster img {
            transform: none;
          }
        }

        
          .mobile-logo-image {
            width: 46px;
            height: 46px;
            max-width: 46px;
            max-height: 46px;
            min-width: 46px;
            border-radius: 13px;
            object-fit: cover;
            display: block;
            background: #050505;
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: none;
          }

          .mobile-header,
          .mobile-header * {
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
          }

          .mobile-header {
            min-height: 90px;
            padding: 0 32px;
          }

          .mobile-brand-wrap {
            min-width: 0;
            gap: 30px;
          }

          .mobile-logo-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
            -webkit-user-drag: none;
          }

          .mobile-logo-link img {
            pointer-events: none;
            -webkit-user-drag: none;
          }

          .desktop-nav {
            align-items: center;
            gap: 26px;
            line-height: 1;
            white-space: nowrap;
          }

          .desktop-nav a,
          .desktop-nav button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 44px;
            margin: 0;
            padding: 0;
            border: 0;
            background: transparent;
            color: rgba(255,255,255,0.66);
            font: inherit;
            font-size: 14px;
            font-weight: 500;
            line-height: 1;
            text-decoration: none;
            white-space: nowrap;
            cursor: pointer;
            outline: none;
            user-select: none;
            -webkit-user-select: none;
            -webkit-user-drag: none;
            -webkit-touch-callout: none;
          }

          .desktop-nav a:hover,
          .desktop-nav button:hover {
            color: #ffffff;
          }

          .desktop-nav a:focus-visible,
          .desktop-nav button:focus-visible {
            border-radius: 8px;
            outline: 1px solid rgba(255,255,255,0.45);
            outline-offset: 6px;
          }

          @media (max-width: 1180px) {
            .desktop-header-search {
              max-width: 320px;
              margin-left: 18px;
              margin-right: 18px;
              padding-left: 0;
              padding-right: 0;
            }

            .desktop-nav {
              gap: 18px;
            }
          }

          @media (max-width: 768px) {
          .kinoluma-home {
            background:
              radial-gradient(circle at 50% 0%, rgba(255,255,255,0.07), transparent 34%),
              #000000;
          }

          .mobile-header {
            min-height: 68px;
            padding: 10px 14px;
            gap: 10px;
            background: rgba(0,0,0,0.88);
            box-shadow: 0 18px 60px rgba(0,0,0,0.45);
          }

          .mobile-brand-wrap {
            min-width: 0;
            gap: 10px;
          }

          .mobile-logo-title {
            font-size: 24px;
            letter-spacing: -0.05em;
            white-space: nowrap;
          }

          .mobile-logo-image {
            width: 46px;
            height: 46px;
            border-radius: 13px;
            object-fit: cover;
            display: block;
            background: #050505;
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: none;
          }

          .desktop-nav {
            display: none !important;
          }

          .mobile-random-button {
            min-height: 40px;
            padding: 0 12px;
            letter-spacing: 0.14em;
          }

          .mobile-user-area {
            gap: 8px;
          }

          .mobile-user-area > button:last-child,
          .mobile-login-button {
            min-height: 40px;
            border-radius: 999px;
            padding: 0 14px;
          }

          .mobile-logout-button {
            display: none;
          }

          .mobile-hero {
            min-height: auto;
            padding: 88px 14px 34px;
            align-items: stretch;
            flex-direction: column;
            justify-content: flex-end;
            gap: 14px;
            background:
              radial-gradient(circle at 78% 12%, rgba(255,255,255,0.12), transparent 26%),
              radial-gradient(circle at 18% 18%, rgba(255,255,255,0.06), transparent 24%),
              linear-gradient(180deg, #0d0d0d 0%, #050505 58%, #000000 100%);
          }

          .mobile-hero::before {
            content: "";
            position: absolute;
            inset: 68px 10px auto;
            height: 170px;
            border-radius: 999px;
            background: rgba(255,255,255,0.08);
            filter: blur(54px);
            pointer-events: none;
          }


          .mobile-featured-poster-card {
            display: block;
            width: min(64vw, 230px);
            aspect-ratio: 2 / 3;
            margin-inline: auto;
            border-radius: 24px;
            border: 1px solid rgba(255,255,255,0.14);
            background: #090909;
            box-shadow: 0 24px 80px rgba(0,0,0,0.62);
            transform: translateZ(0);
          }

          .mobile-featured-poster-card::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
            pointer-events: none;
          }

          .mobile-hero-copy {
            width: 100%;
            max-width: none;
            border-radius: 28px;
            border: 1px solid rgba(255,255,255,0.10);
            background:
              linear-gradient(145deg, rgba(28,28,28,0.78), rgba(6,6,6,0.94)),
              rgba(10,10,10,0.92);
            padding: 22px;
            box-shadow: 0 26px 90px rgba(0,0,0,0.52);
          }


          .mobile-hero-title {
            font-size: clamp(38px, 13vw, 56px);
            line-height: 0.96;
            letter-spacing: -0.075em;
          }

          .mobile-hero-original {
            margin-top: 10px;
            font-size: 17px;
            line-height: 1.28;
          }

          .mobile-hero-description {
            max-width: none;
            font-size: 15px;
            line-height: 1.7;
          }

          .mobile-hero-copy .mt-5.flex.flex-wrap.gap-3 {
            gap: 8px;
          }

          .mobile-hero-copy .mt-5.flex.flex-wrap.gap-3 span {
            padding: 8px 11px;
            font-size: 12px;
          }

          .mobile-hero-actions {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
            margin-top: 22px;
          }

          .mobile-hero-actions button {
            width: 100%;
            min-height: 48px;
            border-radius: 15px;
          }

          .mobile-filters-section {
            padding: 18px 14px 20px;
            background:
              linear-gradient(180deg, rgba(18,18,18,0.96), rgba(8,8,8,0.98));
          }

          .kinoluma-top-search-section {
            padding: 88px 14px 14px !important;
          }

          .kinoluma-top-search-shell {
            border-radius: 22px !important;
            padding: 14px !important;
          }

          .mobile-search-input {
            min-height: 54px;
            border-radius: 18px;
            padding: 0 16px;
            font-size: 16px;
            background: rgba(0,0,0,0.72);
          }

          .mobile-suggestions {
            max-height: min(70vh, 460px);
            border-radius: 24px;
          }

          .mobile-suggestions > div:last-child {
            max-height: min(58vh, 360px);
          }

          .mobile-suggestion-item {
            gap: 12px;
            padding: 9px;
          }

          .mobile-suggestion-item img {
            width: 48px;
            height: 68px;
            border-radius: 12px;
          }

          .mobile-chip-row {
            margin-inline: -14px;
            padding: 2px 14px 8px;
            display: flex;
            flex-wrap: nowrap;
            gap: 10px;
            overflow-x: auto;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }

          .mobile-chip-row::-webkit-scrollbar {
            display: none;
          }

          .mobile-chip-row button {
            flex: 0 0 auto;
            min-height: 42px;
            padding: 0 16px;
            border-radius: 999px;
            white-space: nowrap;
          }

          .mobile-section {
            padding-left: 14px !important;
            padding-right: 14px !important;
            padding-top: 34px !important;
            padding-bottom: 34px !important;
          }

          .mobile-section h3 {
            font-size: 23px;
            line-height: 1.05;
            letter-spacing: -0.04em;
          }


          .mobile-section-head {
            align-items: flex-start;
            flex-direction: column;
            gap: 14px;
          }

          .mobile-section-head button {
            width: 100%;
            min-height: 42px;
            border-radius: 14px;
          }

          .movie-row-scroll {
            margin-inline: -14px;
            padding: 8px 0 18px 14px;
            scroll-padding-left: 14px;
          }

          .movie-row-track {
            gap: 14px;
            padding-right: 14px;
          }

          .movie-card-row {
            --row-card-width: 188px;
            height: 468px;
            border-radius: 18px;
          }

          .movie-poster-row {
            height: 250px;
          }

          .movie-card-body {
            padding: 13px;
          }

          .movie-card-row .movie-card-body {
            padding-bottom: 13px;
          }

          .movie-card-title {
            height: 38px;
            min-height: 38px;
            font-size: 15px;
            line-height: 1.2;
          }

          .movie-card-original {
            font-size: 12px;
          }

          .movie-card-description,
          .movie-card-row .movie-card-description {
            height: 38px;
            min-height: 38px;
            margin-top: 7px;
            transform: none;
            font-size: 12px;
            line-height: 1.45;
          }

          .movie-card-tags,
          .movie-card-row .movie-card-tags {
            height: 26px;
            min-height: 26px;
            margin-top: 9px;
            transform: none;
          }

          .movie-card-tag {
            height: 26px;
            max-width: 82px;
            padding: 0 8px;
            font-size: 11px;
          }

          .movie-card-actions,
          .movie-card-row .movie-card-actions {
            gap: 8px;
            padding-top: 10px;
          }

          .movie-card-action-primary,
          .movie-card-action-secondary {
            height: 36px;
            border-radius: 11px;
            font-size: 12px;
          }

          .mobile-grid {
            gap: 16px;
          }

          .movie-card-grid {
            min-height: 0;
            border-radius: 22px;
          }

          .movie-poster-grid {
            height: min(92vw, 360px);
          }

          .details-modal-overlay,
          .trailer-modal-overlay,
          .auth-modal-overlay {
            align-items: flex-end !important;
            padding: 0 !important;
          }

          .details-modal-card,
          .trailer-modal-card,
          .auth-modal-card {
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

          .trailer-modal-card,
          .auth-modal-card {
            padding: 18px !important;
          }

          .trailer-modal-card h3 {
            font-size: 22px;
            line-height: 1.1;
          }

          .auth-modal-card h3 {
            font-size: 30px;
          }
        }



        /* KinoLuma mobile homepage refresh */
        @media (max-width: 768px) {
          .kinoluma-home {
            overflow-x: hidden;
            background:
              radial-gradient(circle at 20% -10%, rgba(255,255,255,0.10), transparent 34%),
              radial-gradient(circle at 100% 14%, rgba(255,255,255,0.055), transparent 30%),
              linear-gradient(180deg, #050505 0%, #000 42%, #050505 100%);
          }

          .mobile-header {
            min-height: 150px;
            align-items: flex-start;
            padding: 12px 14px 10px;
            border-bottom-color: rgba(255,255,255,0.09);
            background:
              linear-gradient(180deg, rgba(5,5,5,0.96), rgba(0,0,0,0.86)),
              rgba(0,0,0,0.92);
            box-shadow:
              0 24px 80px rgba(0,0,0,0.58),
              inset 0 -1px 0 rgba(255,255,255,0.035);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
          }

          .mobile-brand-wrap {
            width: auto;
            max-width: calc(100% - 124px);
          }

          .mobile-logo-image {
            width: 44px;
            height: 44px;
            min-width: 44px;
            max-width: 44px;
            max-height: 44px;
            border-radius: 15px;
            box-shadow:
              0 16px 40px rgba(0,0,0,0.5),
              0 0 0 1px rgba(255,255,255,0.10) inset;
          }

          .mobile-user-area {
            margin-left: auto;
            gap: 8px;
          }

          .mobile-user-area > button:nth-child(1) {
            display: none !important;
          }

          .mobile-user-area > button:nth-child(2) {
            width: 42px;
            height: 42px;
            box-shadow: 0 12px 30px rgba(255,255,255,0.08);
          }

          .mobile-login-button,
          .mobile-logout-button {
            min-height: 42px;
            border-radius: 999px;
            padding: 0 14px;
            font-size: 12px;
          }

          .desktop-header-search.hidden,
          .desktop-header-search {
            position: absolute;
            left: 14px;
            right: 14px;
            top: 62px;
            z-index: 60;
            display: flex !important;
            min-width: 0;
            width: auto;
            max-width: none;
            margin: 0;
            padding: 0;
          }

          .desktop-header-search-inner {
            max-width: none !important;
          }

          .desktop-header-search-input,
          .mobile-search-input {
            min-height: 46px;
            border-radius: 18px;
            border-color: rgba(255,255,255,0.13);
            background:
              linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025)),
              rgba(8,8,8,0.92);
            padding: 0 16px;
            font-size: 14px;
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.10),
              0 18px 44px rgba(0,0,0,0.36);
          }

          .mobile-suggestions {
            max-height: min(68dvh, 520px);
            border-radius: 24px;
            border-color: rgba(255,255,255,0.12);
            background: rgba(4,4,4,0.96);
            box-shadow: 0 30px 110px rgba(0,0,0,0.82);
          }

          .mobile-suggestions > div:first-child {
            padding: 13px 15px;
            font-size: 10px;
            letter-spacing: 0.22em;
          }

          .desktop-nav.hidden,
          .desktop-nav {
            position: absolute;
            left: 14px;
            right: 14px;
            bottom: 10px;
            display: flex !important;
            gap: 8px;
            overflow-x: auto;
            padding: 0 1px 2px;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }

          .desktop-nav::-webkit-scrollbar {
            display: none;
          }

          .desktop-nav a,
          .desktop-nav button {
            flex: 0 0 auto;
            min-height: 32px;
            border: 1px solid rgba(255,255,255,0.09);
            border-radius: 999px;
            background: rgba(255,255,255,0.045);
            padding: 0 12px;
            color: rgba(255,255,255,0.72);
            font-size: 12px;
            font-weight: 850;
          }

          .desktop-nav a:hover,
          .desktop-nav button:hover {
            border-color: rgba(255,255,255,0.18);
            background: rgba(255,255,255,0.095);
          }

          .mobile-hero {
            display: grid;
            grid-template-columns: minmax(104px, 31vw) minmax(0, 1fr);
            min-height: auto;
            align-items: start;
            gap: 14px;
            padding: 174px 14px 24px;
            background:
              radial-gradient(circle at 72% 18%, rgba(255,255,255,0.13), transparent 24%),
              radial-gradient(circle at 18% 36%, rgba(255,255,255,0.07), transparent 22%),
              linear-gradient(135deg, rgba(255,255,255,0.025) 0 1px, transparent 1px),
              linear-gradient(180deg, #080808 0%, #020202 62%, #000 100%);
            background-size: auto, auto, 46px 46px, auto;
          }

          .mobile-hero::before {
            inset: 150px 12px auto;
            height: 170px;
            opacity: 0.78;
            background:
              radial-gradient(circle at 32% 50%, rgba(255,255,255,0.12), transparent 56%),
              rgba(255,255,255,0.045);
            filter: blur(48px);
          }

          .mobile-featured-poster-card {
            grid-column: 1;
            width: 100%;
            max-width: 132px;
            margin: 0;
            align-self: start;
            border-radius: 22px;
            border-color: rgba(255,255,255,0.18);
            box-shadow:
              0 24px 70px rgba(0,0,0,0.70),
              0 0 0 1px rgba(255,255,255,0.045) inset;
          }

          .mobile-featured-poster-card .absolute.left-3.top-3,
          .mobile-featured-poster-card .absolute.right-3.top-3 {
            padding: 5px 8px;
            font-size: 9px;
            letter-spacing: 0.07em;
          }

          .mobile-hero-copy {
            grid-column: 2;
            width: 100%;
            max-width: none;
            border: 0;
            border-radius: 0;
            background: transparent;
            padding: 0;
            box-shadow: none;
          }

          .mobile-hero-copy > div:first-child {
            margin-bottom: 8px;
            gap: 8px;
          }

          .mobile-hero-copy > div:first-child p {
            font-size: 10px;
            letter-spacing: 0.22em;
          }

          .mobile-hero-copy > div:first-child span {
            padding: 5px 9px;
            font-size: 10px;
          }

          .mobile-hero-title {
            font-size: clamp(30px, 10.5vw, 46px);
            line-height: 0.95;
            letter-spacing: -0.075em;
            text-wrap: balance;
          }

          .mobile-hero-original {
            margin-top: 8px;
            font-size: 14px;
            line-height: 1.25;
          }

          .mobile-hero-copy .mt-5.flex.flex-wrap.gap-3 {
            margin-top: 12px;
            gap: 7px;
          }

          .mobile-hero-copy .mt-5.flex.flex-wrap.gap-3 span {
            padding: 6px 9px;
            font-size: 11px;
            line-height: 1;
          }

          .mobile-hero-description {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 3;
            overflow: hidden;
            margin-top: 13px;
            max-width: none;
            font-size: 13px;
            line-height: 1.55;
            color: rgba(255,255,255,0.72);
          }

          .mobile-hero-copy .mt-6.h-px {
            margin-top: 14px;
            width: 100%;
          }

          .mobile-hero-actions {
            grid-column: 1 / -1;
            display: grid;
            grid-template-columns: 1fr;
            gap: 9px;
            margin-top: 16px;
          }

          .mobile-hero-actions button {
            min-height: 44px;
            width: 100%;
            border-radius: 14px;
            padding: 0 14px;
            font-size: 13px;
          }

          .featured-side-rail.hidden,
          .featured-side-rail {
            grid-column: 1 / -1;
            display: flex !important;
            width: 100%;
            flex: none;
            flex-basis: auto;
            align-self: stretch;
            margin: 6px 0 0;
            gap: 12px;
            flex-direction: column;
          }

          .featured-roulette {
            width: 100%;
            height: auto;
            min-height: 0;
            max-height: none;
            border-radius: 24px;
            background:
              radial-gradient(circle at 0% 0%, rgba(255,255,255,0.12), transparent 44%),
              linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025)),
              rgba(6,6,6,0.78);
          }

          .featured-roulette.is-recent {
            display: none;
          }

          .featured-roulette::before,
          .featured-roulette::after {
            display: none;
          }

          .featured-roulette-head {
            padding: 14px 14px 8px;
          }

          .featured-roulette-title {
            font-size: 10px;
            letter-spacing: 0.22em;
          }

          .featured-roulette-track {
            display: flex;
            flex: none;
            gap: 10px;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 8px 12px 14px;
            scrollbar-width: none;
            scroll-padding-left: 12px;
            -webkit-overflow-scrolling: touch;
          }

          .featured-roulette-track::-webkit-scrollbar {
            display: none;
          }

          .featured-roulette-item {
            flex: 0 0 204px;
            min-height: 78px;
            grid-template-columns: 52px minmax(0, 1fr);
            transform: none;
            opacity: 0.78;
            border-color: rgba(255,255,255,0.07);
            background: rgba(255,255,255,0.035);
          }

          .featured-roulette-item.is-active {
            transform: none;
            box-shadow:
              0 16px 44px rgba(0,0,0,0.38),
              inset 0 1px 0 rgba(255,255,255,0.14);
          }

          .featured-roulette-foot {
            display: none;
          }

          .mobile-filters-section {
            padding: 18px 14px 18px;
            border-top: 1px solid rgba(255,255,255,0.08);
            background:
              radial-gradient(circle at 15% 0%, rgba(255,255,255,0.055), transparent 26%),
              linear-gradient(180deg, rgba(14,14,14,0.96), rgba(3,3,3,0.98));
          }

          .mobile-chip-row {
            margin-inline: -14px;
            padding: 2px 14px 8px;
            display: flex;
            flex-wrap: nowrap;
            gap: 9px;
            overflow-x: auto;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }

          .mobile-chip-row button {
            min-height: 40px;
            padding: 0 14px;
            border-radius: 999px;
            font-size: 12px;
          }

          .mobile-section {
            padding-left: 14px !important;
            padding-right: 14px !important;
            padding-top: 30px !important;
            padding-bottom: 30px !important;
          }

          .mobile-section-head {
            align-items: flex-start;
            flex-direction: column;
            gap: 12px;
          }

          .mobile-section h3 {
            font-size: 24px;
            line-height: 1;
            letter-spacing: -0.045em;
          }

          .movie-row-scroll {
            margin-inline: -14px;
            padding: 6px 0 18px 14px;
            scroll-padding-left: 14px;
          }

          .movie-row-track {
            gap: 13px;
            padding-right: 14px;
          }

          .movie-card-row {
            --row-card-width: 174px;
            height: 430px;
            border-radius: 20px;
            background:
              linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.012)),
              rgba(9,9,9,0.96);
          }

          .movie-poster-row {
            height: 236px;
          }

          .movie-card-body {
            padding: 12px;
          }

          .movie-card-title {
            height: 36px;
            min-height: 36px;
            font-size: 14px;
            line-height: 1.18;
          }

          .movie-card-original {
            height: 17px;
            font-size: 11px;
            line-height: 17px;
          }

          .movie-card-description,
          .movie-card-row .movie-card-description {
            height: 34px;
            min-height: 34px;
            margin-top: 6px;
            font-size: 11px;
            line-height: 1.45;
          }

          .movie-card-tags,
          .movie-card-row .movie-card-tags {
            height: 24px;
            min-height: 24px;
            margin-top: 8px;
          }

          .movie-card-tag {
            height: 24px;
            max-width: 78px;
            padding: 0 8px;
            font-size: 10px;
          }

          .movie-card-actions,
          .movie-card-row .movie-card-actions {
            gap: 7px;
            padding-top: 9px;
          }

          .movie-card-action-primary,
          .movie-card-action-secondary {
            height: 34px;
            border-radius: 11px;
            font-size: 11px;
          }
        }

        @media (max-width: 420px) {
          .mobile-hero {
            grid-template-columns: 104px minmax(0, 1fr);
            gap: 12px;
          }

          .mobile-featured-poster-card {
            max-width: 108px;
            border-radius: 20px;
          }

          .mobile-hero-title {
            font-size: clamp(28px, 10.4vw, 38px);
          }

          .mobile-hero-description {
            -webkit-line-clamp: 2;
          }

          .featured-roulette-item {
            flex-basis: 188px;
          }

          .movie-card-row {
            --row-card-width: 164px;
            height: 414px;
          }

          .movie-poster-row {
            height: 222px;
          }
        }

        @media (max-width: 390px) {
          .mobile-logo-image {
            width: 42px;
            height: 42px;
            max-width: 42px;
            max-height: 42px;
            min-width: 42px;
            border-radius: 12px;
            box-shadow: none;
          }

          .mobile-random-button {
            padding: 0 10px;
            font-size: 10px;
          }

          .mobile-featured-poster-card {
            width: min(62vw, 206px);
            border-radius: 22px;
          }

          .movie-card-row {
            --row-card-width: 176px;
            height: 454px;
          }

          .movie-poster-row {
            height: 236px;
          }
        }


        /* KinoLuma mobile rescue redesign: clean compact home */
        @media (max-width: 768px) {
          .kinoluma-home {
            padding-bottom: calc(118px + env(safe-area-inset-bottom)) !important;
            background:
              radial-gradient(circle at 18% -8%, rgba(255,255,255,0.11), transparent 30%),
              radial-gradient(circle at 92% 14%, rgba(255,255,255,0.06), transparent 28%),
              linear-gradient(180deg, #050505 0%, #000 46%, #050505 100%) !important;
          }

          .mobile-header {
            display: grid !important;
            grid-template-columns: 44px minmax(0, 1fr) 46px;
            grid-template-areas:
              "logo search user"
              "nav nav nav";
            align-items: center !important;
            gap: 8px 10px !important;
            min-height: 118px !important;
            padding: calc(8px + env(safe-area-inset-top)) 12px 9px !important;
            background:
              linear-gradient(180deg, rgba(7,7,7,0.96), rgba(0,0,0,0.88)),
              rgba(0,0,0,0.92) !important;
            border-bottom: 1px solid rgba(255,255,255,0.08) !important;
            box-shadow: 0 18px 58px rgba(0,0,0,0.55) !important;
          }

          .mobile-brand-wrap {
            grid-area: logo;
            width: 44px !important;
            max-width: 44px !important;
            min-width: 44px !important;
            gap: 0 !important;
          }

          .mobile-logo-link,
          .mobile-logo-image {
            width: 42px !important;
            height: 42px !important;
            min-width: 42px !important;
            max-width: 42px !important;
            max-height: 42px !important;
            border-radius: 14px !important;
          }

          .desktop-header-search.hidden,
          .desktop-header-search {
            grid-area: search;
            position: relative !important;
            inset: auto !important;
            z-index: 70 !important;
            display: flex !important;
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .desktop-header-search-inner {
            width: 100% !important;
            max-width: none !important;
          }

          .desktop-header-search-input,
          .mobile-search-input {
            min-height: 42px !important;
            border-radius: 16px !important;
            padding: 0 14px !important;
            font-size: 13px !important;
            font-weight: 850 !important;
            background:
              linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025)),
              rgba(8,8,8,0.94) !important;
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.10),
              0 12px 32px rgba(0,0,0,0.34) !important;
          }

          .mobile-suggestions {
            position: fixed !important;
            left: 12px !important;
            right: 12px !important;
            top: calc(58px + env(safe-area-inset-top)) !important;
            z-index: 120 !important;
            max-height: min(72dvh, 520px) !important;
            border-radius: 22px !important;
          }

          .mobile-user-area {
            grid-area: user;
            justify-self: end;
            margin-left: 0 !important;
            gap: 0 !important;
          }

          .mobile-user-area > button:first-child,
          .mobile-logout-button {
            display: none !important;
          }

          .mobile-user-area > button:nth-child(2) {
            width: 42px !important;
            height: 42px !important;
          }

          .desktop-nav.hidden,
          .desktop-nav {
            grid-area: nav;
            position: relative !important;
            left: auto !important;
            right: auto !important;
            bottom: auto !important;
            display: flex !important;
            width: 100% !important;
            gap: 7px !important;
            overflow-x: auto !important;
            padding: 1px 1px 0 !important;
            scrollbar-width: none !important;
            -webkit-overflow-scrolling: touch;
          }

          .desktop-nav::-webkit-scrollbar {
            display: none !important;
          }

          .desktop-nav a,
          .desktop-nav button {
            flex: 0 0 auto !important;
            min-height: 31px !important;
            padding: 0 11px !important;
            border-radius: 999px !important;
            border: 1px solid rgba(255,255,255,0.095) !important;
            background: rgba(255,255,255,0.045) !important;
            color: rgba(255,255,255,0.76) !important;
            font-size: 11px !important;
            font-weight: 900 !important;
          }

          .mobile-hero {
            display: grid !important;
            grid-template-columns: 104px minmax(0, 1fr) !important;
            align-items: start !important;
            gap: 13px !important;
            min-height: auto !important;
            padding: calc(138px + env(safe-area-inset-top)) 12px 20px !important;
            background:
              radial-gradient(circle at 74% 18%, rgba(255,255,255,0.11), transparent 25%),
              radial-gradient(circle at 16% 42%, rgba(255,255,255,0.06), transparent 24%),
              linear-gradient(135deg, rgba(255,255,255,0.022) 0 1px, transparent 1px),
              linear-gradient(180deg, #070707 0%, #020202 64%, #000 100%) !important;
            background-size: auto, auto, 44px 44px, auto !important;
            border-bottom: 1px solid rgba(255,255,255,0.08) !important;
          }

          .mobile-hero::before {
            inset: 118px 8px auto !important;
            height: 190px !important;
            opacity: 0.82 !important;
            background:
              radial-gradient(circle at 30% 48%, rgba(255,255,255,0.11), transparent 58%),
              rgba(255,255,255,0.035) !important;
            filter: blur(48px) !important;
          }

          .mobile-featured-poster-card {
            grid-column: 1 !important;
            width: 104px !important;
            max-width: 104px !important;
            aspect-ratio: 2 / 3 !important;
            margin: 0 !important;
            border-radius: 18px !important;
            box-shadow:
              0 20px 58px rgba(0,0,0,0.72),
              0 0 0 1px rgba(255,255,255,0.05) inset !important;
          }

          .mobile-featured-poster-card .absolute.left-3.top-3,
          .mobile-featured-poster-card .absolute.right-3.top-3 {
            padding: 4px 7px !important;
            font-size: 8px !important;
          }

          .mobile-hero-copy {
            grid-column: 2 !important;
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
          }

          .mobile-hero-copy > div:first-child {
            margin-bottom: 7px !important;
          }

          .mobile-hero-copy > div:first-child p {
            font-size: 9px !important;
            letter-spacing: 0.19em !important;
          }

          .mobile-hero-copy > div:first-child span {
            padding: 4px 8px !important;
            font-size: 9px !important;
          }

          .mobile-hero-title {
            font-size: clamp(27px, 9.4vw, 39px) !important;
            line-height: 0.96 !important;
            letter-spacing: -0.07em !important;
            text-wrap: balance;
          }

          .mobile-hero-original {
            margin-top: 7px !important;
            font-size: 13px !important;
            line-height: 1.25 !important;
          }

          .mobile-hero-copy .mt-5.flex.flex-wrap.gap-3 {
            margin-top: 10px !important;
            gap: 6px !important;
          }

          .mobile-hero-copy .mt-5.flex.flex-wrap.gap-3 span {
            padding: 6px 8px !important;
            font-size: 10px !important;
          }

          .mobile-hero-description {
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            overflow: hidden !important;
            margin-top: 10px !important;
            font-size: 12px !important;
            line-height: 1.5 !important;
          }

          .mobile-hero-copy .mt-6.h-px {
            margin-top: 12px !important;
            width: 100% !important;
          }

          .mobile-hero-actions {
            grid-column: 1 / -1 !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 9px !important;
            margin-top: 2px !important;
          }

          .mobile-hero-actions button {
            min-height: 44px !important;
            width: 100% !important;
            border-radius: 14px !important;
            padding: 0 12px !important;
            font-size: 12px !important;
          }

          .featured-side-rail.hidden,
          .featured-side-rail {
            grid-column: 1 / -1 !important;
            display: block !important;
            width: 100% !important;
            flex: none !important;
            margin: 12px 0 0 !important;
          }

          .featured-roulette {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: hidden !important;
            border-radius: 22px !important;
            border: 1px solid rgba(255,255,255,0.11) !important;
            background:
              radial-gradient(circle at 0% 0%, rgba(255,255,255,0.10), transparent 42%),
              linear-gradient(180deg, rgba(255,255,255,0.060), rgba(255,255,255,0.020)),
              rgba(7,7,7,0.82) !important;
            box-shadow: 0 20px 70px rgba(0,0,0,0.42) !important;
          }

          .featured-roulette.is-recent {
            display: none !important;
          }

          .featured-roulette::before,
          .featured-roulette::after {
            display: none !important;
          }

          .featured-roulette-head {
            padding: 13px 14px 8px !important;
            border-bottom: 0 !important;
          }

          .featured-roulette-title {
            font-size: 10px !important;
            letter-spacing: 0.21em !important;
          }

          .featured-roulette-count {
            padding: 5px 9px !important;
            font-size: 10px !important;
          }

          .featured-roulette-track {
            display: flex !important;
            flex: none !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            gap: 11px !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            padding: 7px 13px 14px !important;
            scrollbar-width: none !important;
            scroll-padding-left: 13px !important;
            -webkit-overflow-scrolling: touch;
          }

          .featured-roulette-track::-webkit-scrollbar {
            display: none !important;
          }

          .featured-roulette-item {
            flex: 0 0 132px !important;
            display: block !important;
            min-height: 0 !important;
            height: auto !important;
            padding: 8px !important;
            border-radius: 18px !important;
            background: rgba(255,255,255,0.040) !important;
            opacity: 1 !important;
            transform: none !important;
          }

          .featured-roulette-item.is-active {
            background:
              linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.045)),
              rgba(20,20,20,0.96) !important;
            border-color: rgba(255,255,255,0.30) !important;
            box-shadow:
              0 18px 48px rgba(0,0,0,0.42),
              inset 0 1px 0 rgba(255,255,255,0.16) !important;
          }

          .featured-roulette-poster {
            width: 100% !important;
            height: 160px !important;
            border-radius: 14px !important;
          }

          .featured-roulette-poster img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }

          .featured-roulette-number {
            top: 7px !important;
            left: 7px !important;
            width: 24px !important;
            height: 24px !important;
            font-size: 10px !important;
          }

          .featured-roulette-name {
            display: block !important;
            margin-top: 9px !important;
            min-width: 0 !important;
          }

          .featured-roulette-name strong {
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            overflow: hidden !important;
            font-size: 12px !important;
            line-height: 1.16 !important;
          }

          .featured-roulette-name span {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 4px !important;
            margin-top: 6px !important;
            font-size: 10px !important;
            line-height: 1.2 !important;
          }

          .featured-roulette-foot {
            display: none !important;
          }

          .mobile-filters-section {
            padding: 16px 12px 18px !important;
          }

          .mobile-chip-row {
            margin-inline: -12px !important;
            padding: 2px 12px 8px !important;
          }

          .mobile-section {
            padding-left: 12px !important;
            padding-right: 12px !important;
            padding-top: 26px !important;
            padding-bottom: 26px !important;
          }
        }

        @media (max-width: 420px) {
          .mobile-hero {
            grid-template-columns: 96px minmax(0, 1fr) !important;
            gap: 11px !important;
          }

          .mobile-featured-poster-card {
            width: 96px !important;
            max-width: 96px !important;
          }

          .mobile-hero-title {
            font-size: clamp(26px, 9.8vw, 36px) !important;
          }

          .featured-roulette-item {
            flex-basis: 122px !important;
          }

          .featured-roulette-poster {
            height: 148px !important;
          }
        }

        /* KinoLuma mobile vertical roulette cards like the mockup */
        @media (max-width: 768px) {
          .featured-side-rail.hidden,
          .featured-side-rail {
            grid-column: 1 / -1 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 16px !important;
            width: min(100%, 374px) !important;
            max-width: 374px !important;
            margin: 18px auto 0 !important;
            padding: 0 !important;
          }

          .featured-roulette,
          .featured-roulette.is-recent {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            height: 224px !important;
            min-height: 224px !important;
            max-height: 224px !important;
            overflow: hidden !important;
            border-radius: 27px !important;
            border: 1px solid rgba(255,255,255,0.18) !important;
            background:
              radial-gradient(circle at 9% 0%, rgba(255,255,255,0.13), transparent 40%),
              radial-gradient(circle at 74% 25%, rgba(255,255,255,0.08), transparent 36%),
              linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025) 52%, rgba(255,255,255,0.035)),
              rgba(8,8,8,0.92) !important;
            box-shadow:
              0 24px 64px rgba(0,0,0,0.62),
              inset 0 1px 0 rgba(255,255,255,0.12) !important;
            backdrop-filter: blur(18px) !important;
          }

          .featured-roulette::before,
          .featured-roulette::after,
          .featured-roulette.is-recent::before,
          .featured-roulette.is-recent::after {
            display: none !important;
          }

          .featured-roulette-head {
            flex: 0 0 auto !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            min-height: 54px !important;
            padding: 14px 18px 11px !important;
            border-bottom: 1px solid rgba(255,255,255,0.12) !important;
            background: linear-gradient(180deg, rgba(255,255,255,0.045), transparent) !important;
          }

          .featured-roulette-title {
            max-width: 230px !important;
            color: rgba(255,255,255,0.82) !important;
            font-size: 11px !important;
            font-weight: 1000 !important;
            letter-spacing: 0.34em !important;
            line-height: 1.1 !important;
            text-transform: uppercase !important;
            white-space: nowrap !important;
          }

          .featured-roulette-count {
            flex: 0 0 auto !important;
            border-radius: 999px !important;
            border: 1px solid rgba(255,255,255,0.18) !important;
            padding: 7px 12px !important;
            background: rgba(255,255,255,0.09) !important;
            color: rgba(255,255,255,0.82) !important;
            font-size: 12px !important;
            font-weight: 1000 !important;
            letter-spacing: 0.05em !important;
          }

          .featured-roulette-track,
          .featured-roulette.is-recent .featured-roulette-track {
            flex: 1 1 auto !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            height: 112px !important;
            min-height: 112px !important;
            max-height: 112px !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
            padding: 13px 14px 12px !important;
            scroll-padding-block: 13px !important;
            scrollbar-width: thin !important;
            scrollbar-color: rgba(255,255,255,0.28) transparent !important;
            -webkit-overflow-scrolling: touch !important;
          }

          .featured-roulette-track::-webkit-scrollbar,
          .featured-roulette.is-recent .featured-roulette-track::-webkit-scrollbar {
            display: block !important;
            width: 3px !important;
          }

          .featured-roulette-track::-webkit-scrollbar-track,
          .featured-roulette.is-recent .featured-roulette-track::-webkit-scrollbar-track {
            background: transparent !important;
          }

          .featured-roulette-track::-webkit-scrollbar-thumb,
          .featured-roulette.is-recent .featured-roulette-track::-webkit-scrollbar-thumb {
            border-radius: 999px !important;
            background: rgba(255,255,255,0.24) !important;
          }

          .featured-roulette-item,
          .featured-roulette.is-recent .featured-roulette-item {
            flex: 0 0 auto !important;
            display: grid !important;
            grid-template-columns: 52px minmax(0, 1fr) !important;
            align-items: center !important;
            gap: 13px !important;
            width: 100% !important;
            min-height: 70px !important;
            height: 70px !important;
            padding: 8px 12px !important;
            border-radius: 18px !important;
            border: 1px solid transparent !important;
            background: transparent !important;
            opacity: 0.9 !important;
            transform: none !important;
            box-shadow: none !important;
          }

          .featured-roulette-item:hover,
          .featured-roulette.is-recent .featured-roulette-item:hover,
          .featured-roulette-item.is-active,
          .featured-roulette.is-recent .featured-roulette-item.is-active {
            opacity: 1 !important;
            background:
              linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.045)),
              rgba(26,26,26,0.92) !important;
            border-color: rgba(255,255,255,0.22) !important;
            box-shadow:
              0 16px 42px rgba(0,0,0,0.36),
              inset 0 1px 0 rgba(255,255,255,0.12) !important;
          }

          .featured-roulette-poster,
          .featured-roulette.is-recent .featured-roulette-poster {
            width: 52px !important;
            height: 58px !important;
            border-radius: 12px !important;
            overflow: hidden !important;
          }

          .featured-roulette-poster img,
          .featured-roulette.is-recent .featured-roulette-poster img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }

          .featured-roulette-number {
            left: 5px !important;
            top: 5px !important;
            width: 20px !important;
            height: 20px !important;
            border-radius: 999px !important;
            font-size: 9px !important;
            background: rgba(0,0,0,0.68) !important;
            color: white !important;
          }

          .featured-roulette-name,
          .featured-roulette.is-recent .featured-roulette-name {
            display: block !important;
            min-width: 0 !important;
            margin: 0 !important;
          }

          .featured-roulette-name strong,
          .featured-roulette.is-recent .featured-roulette-name strong {
            display: block !important;
            overflow: hidden !important;
            color: rgba(255,255,255,0.90) !important;
            font-size: 13px !important;
            font-weight: 1000 !important;
            line-height: 1.15 !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }

          .featured-roulette-name span,
          .featured-roulette.is-recent .featured-roulette-name span {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
            margin-top: 5px !important;
            color: rgba(255,255,255,0.58) !important;
            font-size: 10px !important;
            font-weight: 900 !important;
            line-height: 1.15 !important;
          }

          .featured-roulette-foot {
            flex: 0 0 auto !important;
            display: grid !important;
            grid-template-columns: 42px minmax(0, 1fr) 42px !important;
            align-items: center !important;
            gap: 10px !important;
            min-height: 56px !important;
            padding: 10px 16px 12px !important;
            border-top: 1px solid rgba(255,255,255,0.10) !important;
            background: linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.26)) !important;
          }

          .featured-roulette-arrow {
            width: 38px !important;
            height: 38px !important;
            border-radius: 999px !important;
            border: 1px solid rgba(255,255,255,0.22) !important;
            background: rgba(255,255,255,0.055) !important;
            color: white !important;
            font-size: 20px !important;
          }

          .featured-roulette-hint {
            margin: 0 !important;
            color: rgba(255,255,255,0.58) !important;
            font-size: 10px !important;
            font-weight: 1000 !important;
            line-height: 1.15 !important;
            text-align: center !important;
          }
        }

        @media (max-width: 420px) {
          .featured-side-rail.hidden,
          .featured-side-rail {
            width: calc(100vw - 40px) !important;
            max-width: 374px !important;
          }

          .featured-roulette,
          .featured-roulette.is-recent {
            height: 222px !important;
            min-height: 222px !important;
            max-height: 222px !important;
          }

          .featured-roulette-title {
            font-size: 10px !important;
            letter-spacing: 0.30em !important;
          }

          .featured-roulette-track,
          .featured-roulette.is-recent .featured-roulette-track {
            height: 110px !important;
            min-height: 110px !important;
            max-height: 110px !important;
          }
        }


      `}</style>

      <header className="mobile-header fixed left-0 top-0 z-50 flex w-full items-center justify-between border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mobile-brand-wrap flex items-center">
          <a
            href="/"
            aria-label="KinoLuma"
            className="mobile-logo-link shrink-0"
            draggable={false}
          >
            <img
              src="/kinoluma-icon.png"
              alt="KinoLuma"
              className="mobile-logo-image"
              draggable={false}
            />
          </a>

          <nav
            className="desktop-nav hidden text-sm text-neutral-400 md:flex"
            aria-label="Основная навигация"
          >
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-left transition duration-200 hover:text-white"
              draggable={false}
            >
              Главная
            </button>
            <Link
              href="/catalog/films"
              className="text-left transition duration-200 hover:text-white"
              draggable={false}
            >
              Фильмы
            </Link>
            <Link
              href="/catalog/series"
              className="text-left transition duration-200 hover:text-white"
              draggable={false}
            >
              Сериалы
            </Link>
            <Link
              href="/catalog/anime"
              className="text-left transition duration-200 hover:text-white"
              draggable={false}
            >
              Аниме
            </Link>
            <Link
              href="/catalog/cartoons"
              className="text-left transition duration-200 hover:text-white"
              draggable={false}
            >
              Мультфильмы
            </Link>
            <Link
              href="/collections"
              className="text-left transition duration-200 hover:text-white"
              draggable={false}
            >
              Подборки
            </Link>
            <button
              type="button"
              onClick={openRandomPick}
              className="text-left transition duration-200 hover:text-white"
              draggable={false}
            >
              Случайные фильмы
            </button>
          </nav>
        </div>

        <div
          id="kinoluma-search-section"
          className="desktop-header-search relative z-50 hidden min-w-[280px] flex-1 justify-center px-6 md:flex"
        >
          <div className="desktop-header-search-inner relative w-full max-w-[460px]">
            <label htmlFor="kinoluma-search" className="sr-only">
              Поиск по KinoLuma
            </label>
            <input
              id="kinoluma-search"
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                window.setTimeout(() => setIsSearchFocused(false), 140);
              }}
              placeholder="Поиск фильмов и сериалов..."
              className="desktop-header-search-input mobile-search-input w-full rounded-full border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-semibold text-white outline-none placeholder:text-neutral-600 transition duration-200 focus:border-white/35 focus:bg-black/80"
            />

            {shouldRenderSearchSuggestions && (
              <div className="mobile-suggestions absolute left-0 right-0 top-full z-[70] mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/95 shadow-[0_24px_80px_rgba(0,0,0,0.72)] backdrop-blur-xl">
                <div className="border-b border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.28em] text-neutral-500">
                  Быстрые подсказки
                </div>

                <div className="max-h-[430px] overflow-y-auto p-2">
                  {displayedSearchSuggestions.map((item) => {
                    const isLeavingSuggestion =
                      leavingSearchSuggestionIds.includes(item.id);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          if (isLeavingSuggestion) {
                            return;
                          }

                          setSearch(item.title);
                          setIsSearchFocused(false);
                          openDetails(item);
                        }}
                        className={`mobile-suggestion-item search-suggestion-motion flex w-full items-center gap-4 rounded-xl p-3 text-left transition duration-200 hover:bg-white/10 ${
                          isLeavingSuggestion ? "is-leaving" : ""
                        }`}
                        aria-hidden={isLeavingSuggestion}
                        tabIndex={isLeavingSuggestion ? -1 : 0}
                      >
                        <img
                          src={item.poster}
                          alt={item.title}
                          className="h-20 w-14 shrink-0 rounded-lg object-cover bg-neutral-900"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = getPosterFallback(
                              item.title,
                              item.originalTitle,
                              item.type,
                            );
                          }}
                        />

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-white">
                            {item.title}
                          </span>
                          <span className="mt-1 block truncate text-xs font-bold text-neutral-500">
                            {item.originalTitle}
                          </span>
                          <span className="mt-2 flex flex-wrap gap-2 text-[11px] font-black text-neutral-300">
                            <span className="rounded-full bg-white/10 px-2 py-1">
                              {getRatingBadgeText(item)}
                            </span>
                            <span className="rounded-full bg-white/10 px-2 py-1">
                              {item.year}
                            </span>
                            <span className="rounded-full bg-white/10 px-2 py-1">
                              {item.type}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {currentUser ? (
          <div className="mobile-user-area flex items-center gap-3">
            <button
              onClick={openProfilePage}
              className="hidden text-right transition duration-200 hover:opacity-70 sm:block"
              title="Открыть профиль"
            >
              <p className="text-sm font-bold text-white">{currentUser.name}</p>
              <p className="text-xs text-neutral-500">{currentUser.email}</p>
            </button>

            <button
              onClick={openProfilePage}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white text-sm font-black text-black transition duration-200 hover:scale-105 hover:shadow-[0_0_18px_rgba(255,255,255,0.25)] active:scale-95"
              title="Открыть профиль"
              aria-label="Открыть профиль"
            >
              {getInitials(currentUser.name)}
            </button>

            <button
              onClick={handleLogout}
              className="mobile-logout-button rounded border border-white/20 bg-black px-4 py-2 text-sm font-bold text-white transition duration-200 hover:bg-white hover:text-black"
            >
              Выйти
            </button>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal("login")}
            className="mobile-login-button rounded border border-white/20 bg-white px-4 py-2 text-sm font-bold text-black transition duration-200 hover:bg-black hover:text-white"
          >
            Войти
          </button>
        )}
      </header>

      <section className="mobile-hero relative flex min-h-[720px] items-center gap-8 overflow-hidden bg-black px-8 pt-16 lg:gap-10">
        <button
          type="button"
          onClick={() => openDetails(featuredContent)}
          className="mobile-featured-poster-card group relative z-10 overflow-hidden text-left"
          aria-label={`Открыть информацию: ${featuredContent.title}`}
        >
          <img
            key={`mobile-featured-poster-${featuredContent.id}`}
            src={featuredPosterImage}
            alt={`Обложка: ${featuredContent.title}`}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition duration-500 group-active:scale-[0.98]"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = getPosterFallback(
                featuredContent.title,
                featuredContent.originalTitle,
                featuredContent.type,
              );
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/10" />

          <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white backdrop-blur">
            {featuredContent.type}
          </div>

          <div className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-[11px] font-black text-black shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
            {getRatingBadgeText(featuredContent)}
          </div>
        </button>

        <div
          key={`featured-copy-${featuredContent.id}`}
          className="mobile-hero-copy featured-copy relative z-10 max-w-3xl"
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold uppercase tracking-[0.4em] text-neutral-400">
              Популярное сейчас
            </p>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
              {featuredIndex + 1} / {featuredContentPool.length}
            </span>
          </div>

          <h2 className="mobile-hero-title text-5xl font-black leading-tight md:text-7xl">
            {featuredContent.title}
          </h2>

          <p className="mobile-hero-original mt-3 text-2xl font-bold text-neutral-500">
            {featuredContent.originalTitle}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-black">
              {getRatingBadgeText(featuredContent)}
            </span>

            <span className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-neutral-300">
              {featuredContent.year}
            </span>

            <span className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-neutral-300">
              {featuredContent.type}
            </span>

            {featuredContent.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-neutral-400"
              >
                {genre}
              </span>
            ))}
          </div>

          <p className="mobile-hero-description mt-6 max-w-xl text-lg text-neutral-300">
            {featuredContent.description}
          </p>

          <div className="mt-6 h-px w-56 overflow-hidden rounded-full bg-white/10">
            <div
              key={`featured-progress-${featuredContent.id}`}
              className="featured-progress h-full w-full bg-white/60"
            />
          </div>

          <div className="mobile-hero-actions mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => openTrailer(featuredContent)}
              className="rounded border-2 border-white bg-white px-6 py-3 font-black text-black transition duration-200 hover:bg-black hover:text-white hover:shadow-[0_0_22px_rgba(255,255,255,0.25)] active:scale-[0.98]"
            >
              Смотреть трейлер
            </button>

            <button
              onClick={() => openDetails(featuredContent)}
              className="rounded border border-white/20 bg-neutral-900 px-6 py-3 font-bold text-white transition duration-200 hover:bg-white hover:text-black active:scale-[0.98]"
            >
              Подробнее
            </button>
          </div>
        </div>

        <div
          className="featured-side-rail hidden xl:flex"
          aria-label="Правая колонка подборок"
        >
          <aside className="featured-roulette" aria-label="Популярное сейчас">
            <div className="featured-roulette-head">
              <span className="featured-roulette-title">Популярное сейчас</span>
              <span className="featured-roulette-count">
                {featuredIndex + 1} / {featuredContentPool.length}
              </span>
            </div>

            <div ref={featuredRouletteRef} className="featured-roulette-track">
              {featuredContentPool.map((item, index) => {
                const isActive = index === featuredIndex;

                return (
                  <button
                    key={`featured-roulette-${item.id}`}
                    type="button"
                    data-featured-roulette-index={index}
                    onClick={() => goToFeaturedSlide(index)}
                    className={`featured-roulette-item ${isActive ? "is-active" : ""}`}
                    aria-current={isActive ? "true" : undefined}
                    aria-label={`Показать слайд: ${item.title}`}
                  >
                    <span className="featured-roulette-poster">
                      <img
                        src={getFeaturedPosterImage(item)}
                        alt={`Постер: ${item.title}`}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = getPosterFallback(
                            item.title,
                            item.originalTitle,
                            item.type,
                          );
                        }}
                      />
                      <span className="featured-roulette-number">
                        {index + 1}
                      </span>
                    </span>

                    <span className="featured-roulette-name">
                      <strong>{item.title}</strong>
                      <span>
                        <em className="not-italic">{getRatingBadgeText(item)}</em>
                        <em className="not-italic">{item.year}</em>
                        <em className="not-italic">{item.type}</em>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="featured-roulette-foot">
              <button
                type="button"
                onClick={() => goToFeaturedSlide(featuredIndex - 1)}
                className="featured-roulette-arrow"
                aria-label="Предыдущий слайд"
              >
                ↑
              </button>

              <p className="featured-roulette-hint">
                Выбирай фильм из подборки
              </p>

              <button
                type="button"
                onClick={() => goToFeaturedSlide(featuredIndex + 1)}
                className="featured-roulette-arrow"
                aria-label="Следующий слайд"
              >
                ↓
              </button>
            </div>
          </aside>

          <aside
            className="featured-roulette is-recent"
            aria-label="Обновилось недавно"
          >
            <div className="featured-roulette-head">
              <span className="featured-roulette-title">
                Обновилось недавно
              </span>
              <span className="featured-roulette-count">
                {recentlyUpdatedPool.length}
              </span>
            </div>

            <div ref={recentRouletteRef} className="featured-roulette-track">
              {recentlyUpdatedPool.map((item, index) => (
                <button
                  key={`recent-roulette-${item.id}`}
                  type="button"
                  onClick={() => openDetails(item)}
                  className="featured-roulette-item"
                  aria-label={`Открыть: ${item.title}`}
                >
                  <span className="featured-roulette-poster">
                    <img
                      src={getFeaturedPosterImage(item)}
                      alt={`Постер: ${item.title}`}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = getPosterFallback(
                          item.title,
                          item.originalTitle,
                          item.type,
                        );
                      }}
                    />
                    <span className="featured-roulette-number">
                      {index + 1}
                    </span>
                  </span>

                  <span className="featured-roulette-name">
                    <strong>{item.title}</strong>
                    <span>
                      <em className="not-italic">{getRatingBadgeText(item)}</em>
                      <em className="not-italic">{item.year}</em>
                      <em className="not-italic">{item.type}</em>
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <div className="featured-roulette-foot">
              <button
                type="button"
                onClick={() => scrollRoulette(recentRouletteRef, -1)}
                className="featured-roulette-arrow"
                aria-label="Прокрутить обновления вверх"
              >
                ↑
              </button>

              <p className="featured-roulette-hint">Новые карточки каталога</p>

              <button
                type="button"
                onClick={() => scrollRoulette(recentRouletteRef, 1)}
                className="featured-roulette-arrow"
                aria-label="Прокрутить обновления вниз"
              >
                ↓
              </button>
            </div>
          </aside>
        </div>
      </section>

      <section
        id="kinoluma-filter-section"
        className="mobile-filters-section border-y border-white/10 bg-neutral-950 px-8 py-8"
      >
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-3 text-sm font-bold text-neutral-400">
              Тип контента
            </p>

            <div className="mobile-chip-row flex flex-wrap gap-3">
              {types.map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeClick(type)}
                  className={`rounded-full border px-5 py-2 text-sm font-bold transition duration-200 ${
                    selectedType === type
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-black text-neutral-300 hover:border-white/30 hover:bg-neutral-900"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-bold text-neutral-400">Жанры</p>

            <div className="mobile-chip-row mobile-genre-row flex flex-wrap gap-3">
              {allGenres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`rounded-full border px-5 py-2 text-sm font-bold transition duration-200 ${
                    selectedGenre === genre
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-black text-neutral-300 hover:border-white/30 hover:bg-neutral-900"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mobile-section px-8 py-14">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-neutral-500">
            Новая полка
          </p>

          <h3 className="mt-2 text-3xl font-black tracking-tight">
            Новинки 2026
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
            Оригинальные обложки, ровная лента и компактная карточка: описание,
            жанры и кнопки теперь держат одну визуальную линию.
          </p>
        </div>

        <div className="movie-row-area relative">
          <RowArrowButton
            direction="left"
            hidden={!newReleasesScrollState.canScrollLeft}
            onClick={() => smoothScrollMovieRow(newReleasesScrollRef, "left")}
            ariaLabel="Листать новинки влево"
          />

          <RowArrowButton
            direction="right"
            hidden={!newReleasesScrollState.canScrollRight}
            onClick={() => smoothScrollMovieRow(newReleasesScrollRef, "right")}
            ariaLabel="Листать новинки вправо"
          />

          <div
            ref={newReleasesScrollRef}
            className="horizontal-scroll movie-row-scroll"
          >
            <div className="movie-row-track">
              {newReleasesContent.map((item, index) => (
                <MovieCard
                  key={item.id}
                  item={item}
                  index={index}
                  mode="row"
                  isWatchLater={watchLaterIds.includes(item.id)}
                  onOpenDetails={openDetails}
                  onOpenTrailer={openTrailer}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mobile-section px-8 py-12">
        <div className="mobile-section-head mb-6 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold">Популярное сейчас</h3>
            <p className="mt-2 text-sm text-neutral-500">
              Найдено: {filteredContent.length}
            </p>
          </div>

          {(selectedType !== "Все" || selectedGenre !== "Все") && (
            <button
              onClick={() => {
                setSelectedType("Все");
                setSelectedGenre("Все");
              }}
              className="rounded border border-white/10 px-4 py-2 text-sm font-bold text-neutral-300 transition duration-200 hover:bg-white hover:text-black"
            >
              Сбросить
            </button>
          )}
        </div>

        {filteredContent.length > 0 ? (
          <>
            <div className="mobile-grid grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {popularContent.map((item, index) => (
                <MovieCard
                  key={item.id}
                  item={item}
                  index={index}
                  isWatchLater={watchLaterIds.includes(item.id)}
                  onOpenDetails={openDetails}
                  onOpenTrailer={openTrailer}
                />
              ))}
            </div>

            {hasMorePopularContent && (
              <div className="kinoluma-more-button-wrap">
                <button
                  type="button"
                  onClick={() =>
                    setPopularVisibleRows((currentRows) => currentRows + 4)
                  }
                  className="kinoluma-more-button"
                >
                  <span>Ещё</span>

                  <span
                    className="kinoluma-more-button-icon"
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
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
          <div className="rounded-xl border border-white/10 bg-neutral-950 p-10 text-center">
            <h4 className="text-xl font-bold">Ничего не найдено</h4>
            <p className="mt-2 text-neutral-500">
              Попробуй написать название на русском или английском.
            </p>
          </div>
        )}
      </section>

      <section className="mobile-section px-8 pb-16">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-neutral-500">
            Подборка
          </p>

          <h3 className="mt-2 text-2xl font-bold">
            Культовая фантастика и экшен
          </h3>

          <p className="mt-2 max-w-2xl text-sm text-neutral-500">
            Карточки собраны плотнее: описание и жанры подняты выше, а кнопки не
            прилипают к нижнему краю.
          </p>
        </div>

        <div className="movie-row-area relative">
          <RowArrowButton
            direction="left"
            hidden={!curatedScrollState.canScrollLeft}
            onClick={() => smoothScrollMovieRow(curatedScrollRef, "left")}
            ariaLabel="Листать влево"
          />

          <RowArrowButton
            direction="right"
            hidden={!curatedScrollState.canScrollRight}
            onClick={() => smoothScrollMovieRow(curatedScrollRef, "right")}
            ariaLabel="Листать вправо"
          />

          <div
            ref={curatedScrollRef}
            className="horizontal-scroll movie-row-scroll"
          >
            <div className="movie-row-track">
              {curatedContent.map((item, index) => (
                <MovieCard
                  key={item.id}
                  item={item}
                  index={index}
                  mode="row"
                  isWatchLater={watchLaterIds.includes(item.id)}
                  onOpenDetails={openDetails}
                  onOpenTrailer={openTrailer}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <MovieShelf
        label="Фильмы"
        title="Большое кино на вечер"
        description="Подборка фильмов для тех случаев, когда хочется включить что-то уверенное: от эпичной фантастики до мощного экшена."
        items={filmShelfContent}
        watchLaterIds={watchLaterIds}
        sectionRef={filmsSectionRef}
        openAllLabel="Все фильмы"
        onOpenAll={() => openCatalogPage("Фильм")}
        onOpenDetails={openDetails}
        onOpenTrailer={openTrailer}
      />

      <MovieShelf
        label="Аниме"
        title="Аниме: энергия и легенды"
        description="Истории с сильными героями, яркими мирами и таким количеством эмоций, что обычный сериал рядом тихо пьёт чай."
        items={animeShelfContent}
        watchLaterIds={watchLaterIds}
        sectionRef={animeSectionRef}
        openAllLabel="Все аниме"
        onOpenAll={() => openCatalogPage("Аниме")}
        onOpenDetails={openDetails}
        onOpenTrailer={openTrailer}
      />

      <MovieShelf
        label="Мультфильмы"
        title="Анимация для всех возрастов"
        description="Мультфильмы, которые работают и для лёгкого вечера, и для ностальгии, и для проверки: осталось ли сердце на месте."
        items={cartoonShelfContent}
        watchLaterIds={watchLaterIds}
        openAllLabel="Все мультфильмы"
        onOpenAll={() => openCatalogPage("Мультфильм")}
        onOpenDetails={openDetails}
        onOpenTrailer={openTrailer}
      />

      <MovieShelf
        label="Сериалы"
        title="Серии, которые затягивают"
        description="Сериалы, где одна серия легко превращается в три. Ничего необычного, просто классическая ловушка хорошего сюжета."
        items={seriesShelfContent}
        watchLaterIds={watchLaterIds}
        sectionRef={seriesSectionRef}
        openAllLabel="Все сериалы"
        onOpenAll={() => openCatalogPage("Сериал")}
        onOpenDetails={openDetails}
        onOpenTrailer={openTrailer}
      />

      {watchLaterContent.length > 0 && (
        <section className="mobile-section border-t border-white/10 px-8 py-14">
          <div className="mb-6">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-neutral-500">
              Мой список
            </p>

            <h3 className="mt-2 text-2xl font-bold">Смотреть позже</h3>

            <p className="mt-2 text-sm text-neutral-500">
              Эти фильмы сохранены в браузере. Если очистить данные сайта,
              список тоже очистится.
            </p>
          </div>

          <div className="movie-row-area relative">
            <RowArrowButton
              direction="left"
              hidden={!watchLaterScrollState.canScrollLeft}
              onClick={() => smoothScrollMovieRow(watchLaterScrollRef, "left")}
              ariaLabel="Листать смотреть позже влево"
            />

            <RowArrowButton
              direction="right"
              hidden={!watchLaterScrollState.canScrollRight}
              onClick={() => smoothScrollMovieRow(watchLaterScrollRef, "right")}
              ariaLabel="Листать смотреть позже вправо"
            />

            <div
              ref={watchLaterScrollRef}
              className="horizontal-scroll movie-row-scroll"
            >
              <div className="movie-row-track">
                {watchLaterContent.map((item, index) => (
                  <MovieCard
                    key={item.id}
                    item={item}
                    index={index}
                    mode="row"
                    isWatchLater={watchLaterIds.includes(item.id)}
                    onOpenDetails={openDetails}
                    onOpenTrailer={openTrailer}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <HomeSearchHubSection />

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
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = getPosterFallback(
                    selectedItem.title,
                    selectedItem.originalTitle,
                    selectedItem.type,
                  );
                }}
              />
            </div>

            <div className="details-modal-content p-8">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
                {selectedItem.type}
              </p>

              <h3 className="mt-3 text-4xl font-black">{selectedItem.title}</h3>

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
                <button
                  onClick={() => openTrailer(selectedItem)}
                  className="rounded border-2 border-white bg-white px-6 py-3 font-black text-black transition duration-200 hover:bg-black hover:text-white hover:shadow-[0_0_22px_rgba(255,255,255,0.25)] active:scale-[0.98]"
                >
                  Смотреть трейлер
                </button>

                <button
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
                    <HeartIcon
                      filled={likedItemIds.includes(selectedItem.id)}
                    />
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
                    <DislikeIcon
                      filled={dislikedItemIds.includes(selectedItem.id)}
                    />
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
                loading="lazy"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {isAuthModalOpen && (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeAuthModal();
            }
          }}
          className={`auth-modal-overlay fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur ${
            isAuthClosing ? "modal-overlay-close" : "modal-overlay-open"
          }`}
        >
          <div
            className={`auth-modal-card relative w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-7 shadow-2xl ${
              isAuthClosing ? "modal-window-close" : "modal-window-open"
            }`}
          >
            <button
              onClick={closeAuthModal}
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-black px-3 py-1 text-xl font-bold text-white transition duration-200 hover:bg-white hover:text-black"
              aria-label="Закрыть вход"
            >
              ×
            </button>

            <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
              Аккаунт KinoLuma
            </p>

            <h3 className="mt-3 text-3xl font-black">
              {authMode === "login" ? "Вход" : "Регистрация"}
            </h3>

            <p className="mt-2 text-sm text-neutral-500">
              {authMode === "login"
                ? "Войди, чтобы открыть свои списки, реакции и персональные подборки."
                : "Создай аккаунт, чтобы сохранять фильмы, реакции и подборки в профиле."}
            </p>

            <form onSubmit={handleAuthSubmit} className="mt-6 space-y-4">
              {authMode === "register" && (
                <div>
                  <label className="mb-2 block text-sm font-bold text-neutral-400">
                    Имя
                  </label>
                  <input
                    value={authName}
                    onChange={(event) => setAuthName(event.target.value)}
                    placeholder="Например: Алекс"
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-neutral-700 transition duration-200 focus:border-white/40"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-400">
                  Email
                </label>
                <input
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-neutral-700 transition duration-200 focus:border-white/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-400">
                  Пароль
                </label>
                <input
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="Минимум 4 символа"
                  type="password"
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-neutral-700 transition duration-200 focus:border-white/40"
                />
              </div>

              {authError && (
                <div className="rounded-xl border border-white/10 bg-black p-3 text-sm font-bold text-white">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl border-2 border-white bg-white px-5 py-3 font-black text-black transition duration-200 hover:bg-black hover:text-white active:scale-[0.98]"
              >
                {authMode === "login" ? "Войти" : "Зарегистрироваться"}
              </button>
            </form>

            <div className="mt-5 border-t border-white/10 pt-5">
              {authMode === "login" ? (
                <button
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError("");
                  }}
                  className="text-sm font-bold text-neutral-300 transition duration-200 hover:text-white"
                >
                  Нет аккаунта? Зарегистрироваться
                </button>
              ) : (
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                  }}
                  className="text-sm font-bold text-neutral-300 transition duration-200 hover:text-white"
                >
                  Уже есть аккаунт? Войти
                </button>
              )}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-neutral-600">
              После входа твои списки, реакции и подборки будут доступны в
              профиле KinoLuma.
            </p>
          </div>
        </div>
      )}
      {!selectedItem && !trailerItem && !isAuthModalOpen && (
        <MobileBottomNav
          onSearch={focusMobileSearch}
          onRandom={openRandomPick}
        />
      )}
    </main>
  );
}
