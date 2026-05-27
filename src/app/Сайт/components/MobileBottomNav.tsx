"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUp, Home, Search, Shuffle, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { movies } from "../data/movies";

type MobileBottomNavProps = {
  onSearch?: () => void;
  onRandom?: () => void;
};

function scrollToSearchBlock() {
  const searchInput = document.getElementById("kinoluma-search") as HTMLInputElement | null;
  const searchTarget =
    document.getElementById("kinoluma-search-section") ??
    searchInput ??
    document.querySelector<HTMLElement>('[data-kinoluma-search="true"]');

  if (!searchTarget) {
    return false;
  }

  const targetRect = searchTarget.getBoundingClientRect();
  const targetTop = targetRect.top + window.scrollY;
  const viewportHeight = window.innerHeight || 720;
  const isMobile = window.innerWidth <= 760;
  const offset = isMobile
    ? Math.max(14, Math.min(36, viewportHeight * 0.045))
    : Math.max(28, Math.min(80, viewportHeight * 0.085));

  window.scrollTo({
    top: Math.max(0, targetTop - offset),
    behavior: "smooth",
  });

  window.setTimeout(() => {
    searchInput?.focus({ preventScroll: true });
  }, 650);

  return true;
}

export default function MobileBottomNav({
  onSearch,
  onRandom,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const randomMovie = useMemo(() => {
    if (movies.length === 0) {
      return null;
    }

    return movies[Math.floor(Math.random() * movies.length)];
  }, []);

  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false);

  useEffect(() => {
    function updateBackToTopVisibility() {
      setIsBackToTopVisible(window.scrollY > 620);
    }

    updateBackToTopVisibility();
    window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });
    window.addEventListener("resize", updateBackToTopVisibility);

    return () => {
      window.removeEventListener("scroll", updateBackToTopVisibility);
      window.removeEventListener("resize", updateBackToTopVisibility);
    };
  }, []);

  function handleSearchClick() {
    if (pathname === "/") {
      const didScroll = scrollToSearchBlock();

      if (!didScroll && onSearch) {
        onSearch();
        window.setTimeout(scrollToSearchBlock, 120);
      }

      if (!didScroll) {
        window.location.hash = "kinoluma-search";
      }

      return;
    }

    router.push("/#kinoluma-search");
  }

  function handleRandomClick() {
    if (onRandom) {
      onRandom();
      return;
    }

    if (randomMovie) {
      router.push(`/movie/${randomMovie.slug}`);
    }
  }

  function handleBackToTopClick() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <>
      <style>{mobileBottomNavStyles}</style>

      <button
        type="button"
        onClick={handleBackToTopClick}
        className={
          isBackToTopVisible
            ? "mobile-back-to-top mobile-back-to-top-visible"
            : "mobile-back-to-top"
        }
        aria-label="Наверх"
      >
        <ArrowUp className="mobile-back-to-top-icon" aria-hidden="true" />
        <strong>Наверх</strong>
      </button>

      <nav className="mobile-bottom-nav" aria-label="Мобильная навигация">
        <Link
          href="/"
          className={pathname === "/" ? "mobile-nav-item active" : "mobile-nav-item"}
        >
          <Home aria-hidden="true" />
          <span>Главная</span>
        </Link>

        <button
          type="button"
          onClick={handleSearchClick}
          className="mobile-nav-item"
        >
          <Search aria-hidden="true" />
          <span>Поиск</span>
        </button>

        <button
          type="button"
          onClick={handleRandomClick}
          className="mobile-nav-item mobile-nav-random"
        >
          <Shuffle aria-hidden="true" />
          <span>Случайно</span>
        </button>

        <Link
          href="/profile"
          className={
            pathname?.startsWith("/profile")
              ? "mobile-nav-item active"
              : "mobile-nav-item"
          }
        >
          <UserRound aria-hidden="true" />
          <span>Профиль</span>
        </Link>
      </nav>
    </>
  );
}

const mobileBottomNavStyles = `
  .mobile-bottom-nav,
  .mobile-back-to-top {
    display: none;
  }

  @media (max-width: 760px) {
    .mobile-back-to-top {
      position: fixed;
      right: 16px;
      bottom: calc(92px + max(10px, env(safe-area-inset-bottom)));
      z-index: 91;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0 14px;
      border: 1px solid rgba(255,255,255,0.16);
      border-radius: 999px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.96), rgba(230,230,230,0.96));
      color: #000000;
      box-shadow:
        0 18px 50px rgba(0,0,0,0.60),
        0 0 22px rgba(255,255,255,0.10);
      font: inherit;
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transform: translateY(12px) scale(0.94);
      transition:
        opacity 220ms ease,
        transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
        box-shadow 180ms ease;
      -webkit-tap-highlight-color: transparent;
    }

    .mobile-back-to-top-visible {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }

    .mobile-back-to-top-icon {
      width: 18px;
      height: 18px;
      stroke-width: 2.8;
    }

    .mobile-back-to-top strong {
      font-size: 11px;
      line-height: 1;
      font-weight: 1000;
      letter-spacing: -0.02em;
    }

    .mobile-back-to-top:active {
      transform: translateY(1px) scale(0.96);
    }

    .mobile-bottom-nav {
      position: fixed;
      left: 10px;
      right: 10px;
      bottom: max(10px, env(safe-area-inset-bottom));
      z-index: 90;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 7px;
      padding: 8px;
      border: 1px solid rgba(255,255,255,0.13);
      border-radius: 24px;
      background:
        linear-gradient(180deg, rgba(28,28,28,0.90), rgba(0,0,0,0.92)),
        rgba(0,0,0,0.86);
      box-shadow:
        0 24px 70px rgba(0,0,0,0.76),
        inset 0 1px 0 rgba(255,255,255,0.08);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
    }

    .mobile-nav-item {
      min-width: 0;
      min-height: 56px;
      border: 0;
      border-radius: 18px;
      background: transparent;
      color: rgba(255,255,255,0.58);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      text-decoration: none;
      font: inherit;
      font-size: 10px;
      line-height: 1;
      font-weight: 1000;
      letter-spacing: -0.01em;
      cursor: pointer;
      transition:
        transform 170ms ease,
        background-color 170ms ease,
        color 170ms ease,
        box-shadow 170ms ease;
      -webkit-tap-highlight-color: transparent;
    }

    .mobile-nav-item svg {
      width: 21px;
      height: 21px;
      stroke-width: 2.35;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .mobile-nav-item:active {
      transform: scale(0.95);
    }

    .mobile-nav-item.active,
    .mobile-nav-item:hover {
      background: rgba(255,255,255,0.08);
      color: #ffffff;
    }

    .mobile-nav-random {
      background: #ffffff;
      color: #000000;
      box-shadow: 0 0 28px rgba(255,255,255,0.12);
    }

    .mobile-nav-random:hover,
    .mobile-nav-random.active {
      background: #ffffff;
      color: #000000;
    }
  }
`;
