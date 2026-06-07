"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import type { Movie } from "../data/movies";
import { canResolveTrailerUrl, resolveTrailerUrl } from "../lib/trailers";

type CollectionMovieGridClientProps = {
  items: Movie[];
  emptyText?: string;
};

function isExpectedRelease(item: Movie) {
  const source = (item.source ?? "").toLowerCase();
  const factsText = (item.facts ?? [])
    .map((fact) => `${fact.label} ${fact.value}`)
    .join(" ")
    .toLowerCase();
  const numericYear = Number.parseInt(item.year, 10);
  const isFutureYear =
    Number.isFinite(numericYear) && numericYear > new Date().getFullYear();

  return source.includes("expected") || factsText.includes("премьера") || isFutureYear;
}

function getRatingBadgeText(item: Movie) {
  if (!Number.isFinite(item.rating) || item.rating <= 0) {
    return isExpectedRelease(item) ? "Ждём" : "—";
  }

  return `★ ${Number.isInteger(item.rating) ? item.rating : item.rating.toFixed(1)}`;
}

function getRatingDetailsText(item: Movie) {
  if (!Number.isFinite(item.rating) || item.rating <= 0) {
    return isExpectedRelease(item) ? "Рейтинг появится после премьеры" : "Рейтинг уточняется";
  }

  return `★ ${Number.isInteger(item.rating) ? item.rating : item.rating.toFixed(1)} / 10`;
}

function getPremiereText(item: Movie) {
  return item.facts?.find((fact) => fact.label.toLowerCase().includes("премьер"))?.value;
}

function hasTrailer(item: Movie) {
  return canResolveTrailerUrl(item);
}

export default function CollectionMovieGridClient({
  items,
  emptyText = "В этой подборке пока нет карточек.",
}: CollectionMovieGridClientProps) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<Movie | null>(null);
  const [trailerItem, setTrailerItem] = useState<Movie | null>(null);
  const cardElementsRef = useRef(new Map<string, HTMLElement>());
  const [visibleCards, setVisibleCards] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setVisibleCards(new Set());

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const slug = entry.target.getAttribute("data-collection-movie-slug");

          if (slug) {
            setVisibleCards((current) => {
              if (current.has(slug)) {
                return current;
              }

              const next = new Set(current);
              next.add(slug);
              return next;
            });
          }

          observer.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.14,
      },
    );

    const startId = window.setTimeout(() => {
      items.forEach((item) => {
        const element = cardElementsRef.current.get(item.slug);

        if (element) {
          observer.observe(element);
        }
      });
    }, 80);

    return () => {
      window.clearTimeout(startId);
      observer.disconnect();
    };
  }, [items]);

  useEffect(() => {
    if (!selectedItem && !trailerItem) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (trailerItem) {
        setTrailerItem(null);
        return;
      }

      setSelectedItem(null);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedItem, trailerItem]);

  function openMoviePage(item: Movie) {
    router.push(`/movie/${item.slug}`);
  }

  async function openTrailer(item: Movie) {
    const trailerUrl = await resolveTrailerUrl(item);

    if (!trailerUrl) {
      return;
    }

    setTrailerItem({ ...item, trailerUrl });
  }

  if (items.length === 0) {
    return <div className="expected-empty">{emptyText}</div>;
  }

  return (
    <>
      <div className="collection-movies-grid">
        {items.map((item, index) => {
          const premiereText = getPremiereText(item);

          return (
            <article
              key={item.slug}
              ref={(element) => {
                if (element) {
                  cardElementsRef.current.set(item.slug, element);
                  return;
                }

                cardElementsRef.current.delete(item.slug);
              }}
              data-collection-movie-slug={item.slug}
              className={`collection-movie-card collection-movie-card-interactive ${
                visibleCards.has(item.slug) ? "collection-movie-card-visible" : ""
              }`}
              style={
                {
                  transitionDelay: visibleCards.has(item.slug)
                    ? `${Math.min(index * 65, 520)}ms`
                    : "0ms",
                } as CSSProperties
              }
            >
              <button
                type="button"
                onClick={() => setSelectedItem(item)}
                className="collection-movie-poster collection-movie-poster-button"
                aria-label={`Открыть карточку: ${item.title}`}
              >
                <img
                  src={item.poster}
                  alt={`${item.title} (${item.year})`}
                  loading={index < 4 ? "eager" : "lazy"}
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
                <div className="collection-movie-shade" />
                <span className="collection-movie-type">{item.type}</span>
                <span className="collection-movie-rating">{getRatingBadgeText(item)}</span>
              </button>

              <div className="collection-movie-body">
                <div className="collection-movie-meta">
                  <span>{premiereText || item.year}</span>
                  <span>{item.genres[0] || item.type}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="collection-movie-title-button"
                >
                  {item.title}
                </button>

                <p className="collection-movie-description">{item.description}</p>

                <div className="collection-movie-tags">
                  {item.genres.slice(0, 2).map((genre) => (
                    <span key={genre}>{genre}</span>
                  ))}
                </div>

                <div className="collection-movie-actions">
                  <button
                    type="button"
                    onClick={() => openTrailer(item)}
                    disabled={!hasTrailer(item)}
                    className="collection-movie-trailer-button"
                  >
                    {hasTrailer(item) ? "Трейлер" : "Нет трейлера"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="collection-movie-more-button"
                  >
                    Подробнее
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {selectedItem && (
        <div
          className="collection-details-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedItem(null);
            }
          }}
        >
          <div className="collection-details-card">
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="collection-modal-close"
              aria-label="Закрыть карточку"
            >
              ×
            </button>

            <div className="collection-details-poster">
              <img src={selectedItem.poster} alt={selectedItem.title} />
            </div>

            <div className="collection-details-content">
              <p className="collection-details-kicker">{selectedItem.type}</p>
              <h3>{selectedItem.title}</h3>
              <p className="collection-details-original">{selectedItem.originalTitle}</p>

              <div className="collection-details-badges">
                <span>{getRatingDetailsText(selectedItem)}</span>
                <span>{getPremiereText(selectedItem) || selectedItem.year}</span>
              </div>

              <p className="collection-details-description">
                {selectedItem.longDescription || selectedItem.description}
              </p>

              <div className="collection-details-tags">
                {selectedItem.genres.map((genre) => (
                  <span key={genre}>{genre}</span>
                ))}
              </div>

              {Boolean(selectedItem.facts?.length || selectedItem.cast?.length) && (
                <div className="collection-details-info-grid">
                  {selectedItem.facts?.slice(0, 6).map((fact) => (
                    <div key={`${fact.label}-${fact.value}`}>
                      <span>{fact.label}</span>
                      <strong>{fact.value}</strong>
                    </div>
                  ))}

                  {selectedItem.cast?.slice(0, 4).map((member) => (
                    <div key={`${member.name}-${member.role}`}>
                      <span>{member.role}</span>
                      <strong>{member.name}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="collection-details-actions">
                <button
                  type="button"
                  onClick={() => openTrailer(selectedItem)}
                  disabled={!hasTrailer(selectedItem)}
                  className="collection-details-primary"
                >
                  {hasTrailer(selectedItem) ? "Смотреть трейлер" : "Трейлер скоро"}
                </button>

                <button
                  type="button"
                  onClick={() => openMoviePage(selectedItem)}
                  className="collection-details-secondary"
                >
                  Открыть страницу
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {trailerItem && (
        <div
          className="collection-trailer-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setTrailerItem(null);
            }
          }}
        >
          <div className="collection-trailer-card">
            <div className="collection-trailer-head">
              <div>
                <p>Трейлер</p>
                <h3>{trailerItem.title}</h3>
              </div>

              <button
                type="button"
                onClick={() => setTrailerItem(null)}
                className="collection-modal-close"
                aria-label="Закрыть трейлер"
              >
                ×
              </button>
            </div>

            <div className="collection-trailer-frame">
              <iframe
                src={trailerItem.trailerUrl}
                title={`${trailerItem.title} — трейлер`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
