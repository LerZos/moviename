import type { Metadata } from "next";
import Link from "next/link";

import { getPublicMovies } from "../lib/movies/movieOverrides";
import {
  absoluteUrl,
  getBreadcrumbJsonLd,
  siteUrl,
  trimSeoText,
} from "../lib/seo";
import { collectionStyles } from "../collections/collectionStyles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Ожидаемые фильмы — рейтинг ожиданий и будущие премьеры KinoLuma",
  description: trimSeoText(
    "Ожидаемые фильмы на KinoLuma: будущие премьеры, популярные релизы из рейтингов ожидания, постеры, жанры, описания и страницы фильмов.",
    190,
  ),
  alternates: {
    canonical: "/expected",
  },
  openGraph: {
    title: "Ожидаемые фильмы — KinoLuma",
    description:
      "Будущие премьеры и популярные ожидаемые фильмы с карточками KinoLuma.",
    url: "/expected",
    siteName: "KinoLuma",
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: "/kinoluma-icon.png",
        width: 512,
        height: 512,
        alt: "KinoLuma",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ожидаемые фильмы — KinoLuma",
    description: "Будущие премьеры и популярные ожидаемые фильмы.",
    images: ["/kinoluma-icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

function getYearNumber(year: string) {
  const match = year.match(/\d{4}/);
  if (!match) return 0;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasExpectedMarker(movie: Awaited<ReturnType<typeof getPublicMovies>>[number]) {
  const text = [
    movie.description,
    movie.longDescription,
    ...movie.genres,
    ...(movie.facts ?? []).flatMap((fact) => [fact.label, fact.value]),
  ]
    .join(" ")
    .toLowerCase()
    .replaceAll("ё", "е");

  return /ожида|премьер|будущ|planned-to-watch|await/.test(text);
}

function getExpectedMovies(movies: Awaited<ReturnType<typeof getPublicMovies>>) {
  const currentYear = new Date().getFullYear();

  return movies
    .filter((movie) => movie.type === "Фильм")
    .filter((movie) => {
      const year = getYearNumber(movie.year);
      return year >= currentYear || hasExpectedMarker(movie);
    })
    .sort((first, second) => {
      const firstYear = getYearNumber(first.year) || 9999;
      const secondYear = getYearNumber(second.year) || 9999;
      if (firstYear !== secondYear) return firstYear - secondYear;
      return second.rating - first.rating;
    })
    .slice(0, 120);
}

function getExpectedJsonLd(items: Awaited<ReturnType<typeof getPublicMovies>>) {
  const pageUrl = `${siteUrl}/expected`;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    url: pageUrl,
    name: "Ожидаемые фильмы KinoLuma",
    description:
      "Будущие премьеры и ожидаемые фильмы с карточками KinoLuma.",
    inLanguage: "ru-RU",
    isPartOf: {
      "@id": `${siteUrl}#website`,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteUrl}/movie/${item.slug}`,
        name: `${item.title}${item.year ? ` (${item.year})` : ""}`,
      })),
    },
  };
}

export default async function ExpectedMoviesPage() {
  const publicMovies = await getPublicMovies();
  const expectedMovies = getExpectedMovies(publicMovies);
  const heroPoster = absoluteUrl(expectedMovies[0]?.poster || "/kinoluma-icon.png");

  return (
    <main className="kinoluma-collections expected-page">
      <style>{collectionStyles}</style>
      <style>{`
        .expected-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 16px;
        }

        .expected-card {
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.055);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.38);
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
        }

        .expected-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 255, 255, 0.26);
          background: rgba(255, 255, 255, 0.08);
        }

        .expected-card img {
          width: 100%;
          aspect-ratio: 2 / 3;
          object-fit: cover;
          display: block;
          background: rgba(255, 255, 255, 0.08);
        }

        .expected-card-body {
          padding: 14px;
        }

        .expected-card-body h3 {
          margin: 0 0 8px;
          color: #fff;
          font-size: 15px;
          line-height: 1.25;
        }

        .expected-card-body p {
          margin: 0;
          color: rgba(255, 255, 255, 0.62);
          font-size: 13px;
          line-height: 1.45;
        }

        .expected-empty {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 30px;
          padding: 24px;
          background: rgba(255, 255, 255, 0.055);
          color: rgba(255, 255, 255, 0.72);
        }
      `}</style>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getExpectedJsonLd(expectedMovies)),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            getBreadcrumbJsonLd([
              { name: "KinoLuma", url: "/" },
              { name: "Ожидаемые фильмы", url: "/expected" },
            ]),
          ),
        }}
      />

      <div className="collections-bg" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <header className="collections-header">
        <Link href="/" className="collections-brand" aria-label="KinoLuma — на главную">
          <img src="/kinoluma-icon.png" alt="KinoLuma" />
          <span>KinoLuma</span>
        </Link>

        <nav className="collections-header-actions" aria-label="Навигация по KinoLuma">
          <Link href="/catalog/films">Фильмы</Link>
          <Link href="/catalog/series">Сериалы</Link>
          <Link href="/catalog/cartoons">Мультфильмы</Link>
          <Link href="/collections">Подборки</Link>
          <Link href="/">На главную</Link>
        </nav>
      </header>

      <div className="collections-shell">
        <section className="collections-hero">
          <div>
            <p className="collection-kicker">Премьеры и ожидания</p>
            <h1>Ожидаемые фильмы</h1>
            <h2>Будущие премьеры и фильмы из рейтинга ожиданий</h2>
            <p>
              Страница собирает будущие релизы KinoLuma. После генерации пакета из Kinopoisk.dev сюда
              попадут фильмы из рейтинга ожиданий и будущих премьер без ручной подмены постеров.
            </p>
          </div>

          <aside className="collections-stat-panel" aria-label="Количество ожидаемых фильмов">
            <p className="collection-stat-label">Карточек</p>
            <strong>{expectedMovies.length}</strong>
          </aside>
        </section>

        <section className="collection-section">
          <div className="collection-section-topline">
            <div>
              <p className="collection-section-kicker">Kinopoisk-постеры</p>
              <h2>Будущие релизы</h2>
            </div>
            <img src={heroPoster} alt="Постер ожидаемого фильма" width={72} height={108} />
          </div>

          {expectedMovies.length > 0 ? (
            <div className="expected-grid">
              {expectedMovies.map((movie) => (
                <Link key={movie.slug} href={`/movie/${movie.slug}`} className="expected-card">
                  <img src={movie.poster} alt={`Постер фильма ${movie.title}`} loading="lazy" />
                  <div className="expected-card-body">
                    <h3>{movie.title}</h3>
                    <p>
                      {movie.year || "год уточняется"} · {movie.genres.slice(0, 3).join(", ") || "жанры уточняются"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="expected-empty">
              Ожидаемые фильмы появятся здесь после запуска генератора Kinopoisk-пакета.
              Это лучше, чем показывать пустую витрину с видом «склад закрыт на переучёт».
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
