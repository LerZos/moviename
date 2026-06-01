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
  title: "Ожидаемые релизы — фильмы и мультфильмы KinoLuma",
  description: trimSeoText(
    "Ожидаемые релизы на KinoLuma: ручная подборка будущих фильмов и мультфильмов без документалок, ток-шоу, концертов и случайного мусора.",
    190,
  ),
  alternates: {
    canonical: "/expected",
  },
  openGraph: {
    title: "Ожидаемые релизы — KinoLuma",
    description:
      "Ручная подборка будущих фильмов и мультфильмов с карточками KinoLuma.",
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
    title: "Ожидаемые релизы — KinoLuma",
    description: "Ручная подборка будущих фильмов и мультфильмов.",
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

type PublicMovie = Awaited<ReturnType<typeof getPublicMovies>>[number];

function normalizeExpectedText(value: string) {
  return value.toLowerCase().replaceAll("ё", "е").trim();
}

function isCuratedExpectedRelease(movie: PublicMovie) {
  return normalizeExpectedText(movie.source || "") === "kinoluma-curated-expected";
}

function getMoviePremiere(movie: PublicMovie) {
  return movie.facts?.find((fact) => normalizeExpectedText(fact.label) === "премьера")?.value;
}

function getExpectedMovies(movies: Awaited<ReturnType<typeof getPublicMovies>>) {
  return movies
    .filter(isCuratedExpectedRelease)
    .sort((first, second) => first.id - second.id)
    .slice(0, 80);
}

function getExpectedJsonLd(items: Awaited<ReturnType<typeof getPublicMovies>>) {
  const pageUrl = `${siteUrl}/expected`;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    url: pageUrl,
    name: "Ожидаемые релизы KinoLuma",
    description:
      "Ручная подборка будущих фильмов и мультфильмов с карточками KinoLuma.",
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
              { name: "Ожидаемые релизы", url: "/expected" },
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
          <Link href="/expected">Ожидаемые</Link>
          <Link href="/collections">Подборки</Link>
          <Link href="/">На главную</Link>
        </nav>
      </header>

      <div className="collections-shell">
        <section className="collections-hero">
          <div>
            <p className="collection-kicker">Премьеры и ожидания</p>
            <h1>Ожидаемые релизы</h1>
            <h2>Фильмы и мультфильмы, которые реально ждут</h2>
            <p>
              Ручная подборка крупных будущих премьер: Marvel, DC, «Дюна», «Шрек», Pixar, Middle-earth и другие узнаваемые франшизы. Без документалок, ток-шоу, концертов и случайной каши из рейтингов ожидания.
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
              <p className="collection-section-kicker">Ручная подборка</p>
              <h2>Будущие релизы без мусора</h2>
            </div>
            <img src={heroPoster} alt="Постер ожидаемого релиза" width={72} height={108} />
          </div>

          {expectedMovies.length > 0 ? (
            <div className="expected-grid">
              {expectedMovies.map((movie) => (
                <Link key={movie.slug} href={`/movie/${movie.slug}`} className="expected-card">
                  <img src={movie.poster} alt={`Постер фильма ${movie.title}`} loading="lazy" />
                  <div className="expected-card-body">
                    <h3>{movie.title}</h3>
                    <p>
                      {getMoviePremiere(movie) || movie.year || "дата уточняется"} · {movie.type} · {movie.genres.slice(0, 2).join(", ") || "жанры уточняются"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="expected-empty">
              Ожидаемые релизы не найдены. Значит архив распаковался не туда или файл с ручной подборкой не попал в src/app/data.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
