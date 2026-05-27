import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getRelatedSeoCollections,
  getSeoCollection,
  getSeoCollectionFaq,
  getSeoCollectionItems,
  seoCollections,
} from "../../data/collections";
import {
  absoluteUrl,
  getBreadcrumbJsonLd,
  siteUrl,
  trimSeoText,
} from "../../lib/seo";
import { collectionStyles } from "../collectionStyles";

type CollectionPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return seoCollections.map((collection) => ({
    slug: collection.slug,
  }));
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = getSeoCollection(slug);

  if (!collection) {
    return {
      title: "Подборка не найдена",
      description: "Такой подборки нет в каталоге KinoLuma.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const items = getSeoCollectionItems(collection);
  const pageUrl = `${siteUrl}/collections/${collection.slug}`;
  const imageUrl = absoluteUrl(items[0]?.poster || "/kinoluma-icon.png");
  const description = trimSeoText(collection.description, 205);

  return {
    metadataBase: new URL(siteUrl),
    title: collection.title,
    description,
    keywords: Array.from(
      new Set([
        ...collection.keywords,
        collection.h1,
        "KinoLuma",
        "что посмотреть",
        "фильмы онлайн",
        "подборки фильмов",
        ...items.flatMap((item) => [item.title, item.originalTitle, ...item.genres]),
      ].filter(Boolean)),
    ),
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: collection.title,
      description,
      url: pageUrl,
      siteName: "KinoLuma",
      locale: "ru_RU",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 500,
          height: 750,
          alt: `${collection.h1} — подборка KinoLuma`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: collection.title,
      description,
      images: [imageUrl],
    },
    robots: {
      index: items.length >= 3,
      follow: true,
      googleBot: {
        index: items.length >= 3,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

function getCollectionJsonLd(collection: NonNullable<ReturnType<typeof getSeoCollection>>) {
  const items = getSeoCollectionItems(collection);
  const pageUrl = `${siteUrl}/collections/${collection.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    url: pageUrl,
    name: collection.h1,
    description: collection.description,
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
        name: `${item.title} (${item.year})`,
      })),
    },
  };
}

function getCollectionFaqJsonLd(collection: NonNullable<ReturnType<typeof getSeoCollection>>) {
  const items = getSeoCollectionItems(collection);

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: getSeoCollectionFaq(collection, items).map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const collection = getSeoCollection(slug);

  if (!collection) {
    notFound();
  }

  const items = getSeoCollectionItems(collection);
  const faqItems = getSeoCollectionFaq(collection, items);
  const relatedCollections = getRelatedSeoCollections(collection, 6);

  return (
    <main className="kinoluma-collections">
      <style>{collectionStyles}</style>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getCollectionJsonLd(collection)),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            getBreadcrumbJsonLd([
              { name: "KinoLuma", url: "/" },
              { name: "Подборки", url: "/collections" },
              { name: collection.h1, url: `/collections/${collection.slug}` },
            ]),
          ),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getCollectionFaqJsonLd(collection)),
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
          <Link href="/collections">Подборки</Link>
          <Link href="/catalog/films">Фильмы</Link>
          <Link href="/catalog/series">Сериалы</Link>
          <Link href="/">На главную</Link>
        </nav>
      </header>

      <div className="collections-shell">
        <Link href="/collections" className="collection-back-link">
          ← Все подборки
        </Link>

        <section className="collection-detail-hero collection-section">
          <div className="collection-detail-hero-inner">
            <div>
              <p className="collection-kicker">{collection.group}</p>
              <h1>{collection.h1}</h1>
              <h2>{collection.subtitle}</h2>
              <p>{collection.description}</p>

              <div className="collection-top-actions">
                {collection.keywords.slice(0, 5).map((keyword) => (
                  <span key={keyword} className="collection-chip">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <aside className="collection-stat-panel" aria-label="Количество материалов">
              <p className="collection-stat-label">В подборке</p>
              <strong>{items.length}</strong>
              <p>материалов из каталога KinoLuma</p>
            </aside>
          </div>
        </section>

        <section className="collection-section">
          <div className="collection-section-topline">
            <div>
              <p className="collection-section-kicker">Каталог</p>
              <h2>Что посмотреть</h2>
            </div>
          </div>

          <div className="collection-movies-grid">
            {items.map((item) => (
              <Link key={item.slug} href={`/movie/${item.slug}`} className="collection-movie-card">
                <article>
                  <div className="collection-movie-poster">
                    <img
                      src={item.poster}
                      alt={`${item.title} (${item.year})`}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                    <div className="collection-movie-shade" />
                    <span className="collection-movie-type">{item.type}</span>
                    <span className="collection-movie-rating">★ {item.rating}</span>
                  </div>

                  <div className="collection-movie-body">
                    <div className="collection-movie-meta">
                      <span>{item.year}</span>
                      <span>{item.genres[0]}</span>
                    </div>

                    <h3>{item.title}</h3>
                    <p className="collection-movie-description">{item.description}</p>

                    <div className="collection-movie-tags">
                      {item.genres.slice(0, 2).map((genre) => (
                        <span key={genre}>{genre}</span>
                      ))}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>

        <section className="collection-section">
          <div className="collection-section-topline">
            <div>
              <p className="collection-section-kicker">Описание</p>
              <h2>О подборке</h2>
            </div>
          </div>

          <div className="collection-seo-box">
            <p>{collection.seoText}</p>
          </div>
        </section>

        <section className="collection-section">
          <div className="collection-section-topline">
            <div>
              <p className="collection-section-kicker">FAQ</p>
              <h2>Вопросы по подборке</h2>
            </div>
          </div>

          <div className="collection-faq-grid">
            {faqItems.map((item) => (
              <article key={item.question} className="collection-faq-card">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="collection-section">
          <div className="collection-section-topline">
            <div>
              <p className="collection-section-kicker">Похожие страницы</p>
              <h2>Ещё подборки</h2>
            </div>

            <Link href="/collections" className="collection-cta">
              Все подборки
            </Link>
          </div>

          <div className="collection-related-grid">
            {relatedCollections.map((relatedCollection) => (
              <Link
                key={relatedCollection.slug}
                href={`/collections/${relatedCollection.slug}`}
                className="collection-related-card"
              >
                <article>
                  <span className="collection-chip">{relatedCollection.badge}</span>
                  <h3>{relatedCollection.h1}</h3>
                  <p>{relatedCollection.description}</p>
                </article>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
