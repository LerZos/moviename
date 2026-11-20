"use client";

import Link from "next/link";
import { type ReactNode, useId, useState } from "react";
import { Bookmark, Check, Eye, Heart, Play, ThumbsDown } from "lucide-react";

import PosterImage from "../PosterImage";
import { canResolveTrailerUrl, resolveTrailerUrl } from "../../lib/trailers";
import Dialog from "./Dialog";
import { formatRating } from "./MediaCard";
import { getPosterFallback } from "./posterFallback";

export type MovieInfoItem = {
  id: number;
  slug: string;
  title: string;
  originalTitle: string;
  type: string;
  year: string;
  rating: number;
  genres: string[];
  poster: string;
  description: string;
  trailerUrl: string;
};

export type MovieInfoListKey = "watching" | "watch_later" | "liked" | "disliked";

type TrailerState = { status: "idle" | "loading" | "unavailable" } | { status: "ready"; url: string };

// Labels and icons follow the production details modal (.modal-action).
const LIST_ACTIONS: Array<{
  list: MovieInfoListKey;
  on: string;
  off: string;
  icon: (active: boolean) => ReactNode;
}> = [
  {
    list: "watch_later",
    on: "В списке",
    off: "Смотреть позже",
    icon: (active) =>
      active ? (
        <Check size={17} strokeWidth={2.6} aria-hidden="true" />
      ) : (
        <Bookmark size={17} strokeWidth={2.4} aria-hidden="true" />
      ),
  },
  {
    list: "watching",
    on: "Смотрю",
    off: "Смотрю",
    icon: () => <Eye size={17} strokeWidth={2.4} aria-hidden="true" />,
  },
  {
    list: "liked",
    on: "Нравится",
    off: "Нравится",
    icon: (active) => <Heart size={17} strokeWidth={2.4} fill={active ? "currentColor" : "none"} aria-hidden="true" />,
  },
  {
    list: "disliked",
    on: "Не понравилось",
    off: "Не нравится",
    icon: (active) => (
      <ThumbsDown size={17} strokeWidth={2.4} fill={active ? "currentColor" : "none"} aria-hidden="true" />
    ),
  },
];

export default function MovieInfoDialog({
  item,
  state,
  pending,
  onToggle,
  onClose,
}: {
  item: MovieInfoItem;
  state: Record<MovieInfoListKey, boolean>;
  pending: boolean;
  onToggle: (list: MovieInfoListKey) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const [trailer, setTrailer] = useState<TrailerState>({ status: "idle" });
  const canTryTrailer = canResolveTrailerUrl(item);
  const rating = formatRating(item.rating);
  // Catalog genre lists sometimes repeat the content type ("Фильм"); show it once.
  const genres = item.genres.filter((genre) => genre && genre.toLowerCase() !== item.type.toLowerCase()).slice(0, 3);

  async function openTrailer() {
    setTrailer({ status: "loading" });
    const url = await resolveTrailerUrl(item).catch(() => "");
    setTrailer(url ? { status: "ready", url } : { status: "unavailable" });
  }

  return (
    <Dialog labelledBy={titleId} describedBy={item.description ? descriptionId : undefined} onClose={onClose}>
      <div className="kl-info">
        <div className="kl-info-poster">
          <PosterImage
            src={item.poster || getPosterFallback(item.title, item.originalTitle, item.type)}
            alt={`Постер: ${item.title}`}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = getPosterFallback(item.title, item.originalTitle, item.type);
            }}
          />
        </div>

        <div className="kl-info-main">
          <p className="kl-eyebrow">{item.type}</p>
          <h2 id={titleId}>{item.title}</h2>
          {item.originalTitle && item.originalTitle !== item.title ? (
            <p className="kl-info-original">{item.originalTitle}</p>
          ) : null}

          <div className="kl-info-meta">
            {rating ? (
              <span className="kl-info-rating" aria-label={`Рейтинг ${rating} из 10`}>
                ★ {rating} / 10
              </span>
            ) : null}
            {item.year ? <span>{item.year}</span> : null}
            {genres.map((genre) => (
              <span key={genre}>{genre}</span>
            ))}
          </div>

          {item.description ? (
            <p id={descriptionId} className="kl-info-description">
              {item.description}
            </p>
          ) : null}

          <div className="kl-info-actions">
            <Link href={`/movie/${item.slug}`} className="kl-btn kl-btn--primary">
              <Play size={17} strokeWidth={2.4} fill="currentColor" aria-hidden="true" />
              Перейти к просмотру
            </Link>
            {LIST_ACTIONS.map((action) => {
              const active = state[action.list];
              return (
                <button
                  key={action.list}
                  type="button"
                  className="kl-btn"
                  aria-pressed={active}
                  disabled={pending}
                  onClick={() => onToggle(action.list)}
                >
                  {action.icon(active)}
                  {active ? action.on : action.off}
                </button>
              );
            })}
          </div>

          {canTryTrailer ? (
            <section className="kl-info-trailer" aria-label="Трейлер">
              {trailer.status === "ready" ? (
                <div className="kl-info-trailer-frame">
                  <iframe
                    src={trailer.url}
                    title={`Трейлер: ${item.title}`}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              ) : trailer.status === "unavailable" ? (
                <p className="kl-info-note" role="status">
                  Для этого материала трейлер пока не подключён.
                </p>
              ) : (
                <button
                  type="button"
                  className="kl-btn kl-btn--sm"
                  onClick={() => void openTrailer()}
                  disabled={trailer.status === "loading"}
                  aria-busy={trailer.status === "loading"}
                >
                  <Play size={16} strokeWidth={2.4} aria-hidden="true" />
                  {trailer.status === "loading" ? "Ищем трейлер…" : "Смотреть трейлер"}
                </button>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
