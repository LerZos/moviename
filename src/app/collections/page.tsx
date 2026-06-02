import type { Metadata } from "next";
import Link from "next/link";

import {
  getSeoCollectionGroups,
  getSeoCollectionItems,
  seoCollections,
} from "../data/collections";
import { siteUrl, trimSeoText } from "../lib/seo";
import CollectionsRevealClient from "./CollectionsRevealClient";
import { collectionStyles } from "./collectionStyles";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Подборки фильмов, сериалов, аниме и мультфильмов — KinoLuma",
  description: trimSeoText(
    "Подборки KinoLuma: фильмы похожие на любимые проекты, списки на вечер, фантастика, аниме, мультфильмы и другие удобные маршруты по каталогу.",
    190,
  ),
  alternates: {
    canonical: "/collections",
  },
  openGraph: {
    title: "Подборки KinoLuma",
    description:
      "Подборки KinoLuma помогают быстро выбрать, что посмотреть после любимого фильма, сериала, аниме или мультфильма.",
    url: "/collections",
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
    title: "Подборки KinoLuma",
    description:
      "Фильмы похожие на, что посмотреть после, подборки по темам, жанрам и настроению.",
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

export default function CollectionsIndexPage() {
  const groups = getSeoCollectionGroups();

  return (
    <main className="kinoluma-collections">
      <style>{collectionStyles}</style>
      <CollectionsRevealClient />

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
          <Link href="/catalog/anime">Аниме</Link>
          <Link href="/catalog/cartoons">Мультфильмы</Link>
          <Link href="/">На главную</Link>
        </nav>
      </header>

      <div className="collections-shell">
        <section className="collections-hero">
          <div>
            <p className="collection-kicker">Подборки</p>
            <h1>Что посмотреть на KinoLuma</h1>
            <h2>Фильмы похожие на любимые истории и списки по настроению</h2>
            <p>
              Здесь собраны быстрые маршруты по каталогу: похожие фильмы, списки на вечер,
              фантастика, фэнтези, аниме, семейные мультфильмы и другие темы без лишней суеты.
            </p>
          </div>

          <aside className="collections-stat-panel" aria-label="Количество подборок">
            <p className="collection-stat-label">Подборок</p>
            <strong>{seoCollections.length}</strong>
          </aside>
        </section>

        {groups.map((group) => (
          <section key={group.group} className="collection-section">
            <div className="collection-section-topline">
              <div>
                <p className="collection-section-kicker">{group.collections.length} страниц</p>
                <h2>{group.group}</h2>
              </div>
            </div>

            <div className="collection-grid">
              {group.collections.map((collection) => {
                const items = getSeoCollectionItems(collection);

                return (
                  <Link
                    key={collection.slug}
                    href={`/collections/${collection.slug}`}
                    className="collection-card"
                  >
                    <article>
                      <span className="collection-chip">{collection.badge}</span>
                      <h3>{collection.h1}</h3>
                      <p>{collection.description}</p>
                    </article>

                    <div className="collection-card-bottom">
                      <span>{items.length} материалов</span>
                      <span>Открыть →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
