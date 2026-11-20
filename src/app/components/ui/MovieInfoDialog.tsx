"use client";

import Link from "next/link";
import { type ReactNode, useId, useState } from "react";
import { Bookmark, BookmarkCheck, Eye, Heart, Play, ThumbsDown } from "lucide-react";

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

// Order of the collection toggles; labels stay short so the row reads as one quiet group.
const LIST_ACTIONS: Array<{
  list: MovieInfoListKey;
  label: string;
  name: string;
  icon: (active: boolean) => ReactNode;
}> = [
  {
    list: "watch_later",
    label: "Позже",
    name: "Смотреть позже",
    icon: (active) => (active ? <BookmarkCheck size={17} aria-hidden="true" /> : <Bookmark size={17} aria-hidden="true" />),
  },
  {
    list: "watching",
    label: "Смотрю",
    name: "Смотрю",
    icon: (active) => <Eye size={17} strokeWidth={active ? 2.6 : 2} aria-hidden="true" />,
  },
  {
    list: "liked",
    label: "Нравится",
    name: "Нравится, в избранное",
    icon: (active) => <Heart size={17} fill={active ? "currentColor" : "none"} aria-hidden="true" />,
  },
  {
    list: "disliked",
    label: "Не нравится",
    name: "Не нравится",
    icon: (active) => <ThumbsDown size={17} fill={active ? "currentColor" : "none"} aria-hidden="true" />,
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
          <h2 id={titleId}>{item.title}</h2>
          {item.originalTitle && item.originalTitle !== item.title ? (
            <p className="kl-info-original">{item.originalTitle}</p>
          ) : null}
          <p className="kl-info-meta">
            {rating ? (
              <span className="kl-rating" aria-label={`Рейтинг ${rating} из 10`}>
                ★ {rating}
              </span>
            ) : null}
            {item.year ? <span>{item.year}</span> : null}
            {item.type ? <span>{item.type}</span> : null}
            {genres.length > 0 ? <span>{genres.join(", ")}</span> : null}
          </p>

          {item.description ? (
            <p id={descriptionId} className="kl-info-description">
              {item.description}
            </p>
          ) : null}

          <div className="kl-info-watch">
            <Link href={`/movie/${item.slug}`} className="kl-btn kl-btn--primary kl-btn--lg">
              <Play size={16} fill="currentColor" aria-hidden="true" />
              Перейти к просмотру
            </Link>
          </div>

          <div className="kl-info-lists" role="group" aria-label="Мои списки">
            {LIST_ACTIONS.map((action) => {
              const active = state[action.list];
              return (
                <button
                  key={action.list}
                  type="button"
                  className="kl-info-list"
                  aria-pressed={active}
                  aria-label={action.name}
                  title={action.name}
                  disabled={pending}
                  onClick={() => onToggle(action.list)}
                >
                  {action.icon(active)}
                  <span aria-hidden="true">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
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
              Трейлер для этого материала пока не найден.
            </p>
          ) : (
            <button
              type="button"
              className="kl-info-trailer-open"
              onClick={() => void openTrailer()}
              disabled={trailer.status === "loading"}
              aria-busy={trailer.status === "loading"}
            >
              <span className="kl-info-trailer-icon" aria-hidden="true">
                <Play size={12} fill="currentColor" />
              </span>
              {trailer.status === "loading" ? "Ищем трейлер…" : "Смотреть трейлер"}
            </button>
          )}
        </section>
      ) : null}
    </Dialog>
  );
}
