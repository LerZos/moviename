"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import PosterImage from "../PosterImage";
import { getPosterFallback } from "./posterFallback";

export type MediaCardItem = {
  id: number;
  slug: string;
  title: string;
  originalTitle?: string;
  year: string;
  type: string;
  rating?: number;
  genres?: string[];
  poster: string;
};

export function formatRating(rating: number | undefined) {
  return typeof rating === "number" && Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : "";
}

// Same rating text as the home rails and catalog grid (getRatingBadgeText).
function getRatingBadge(rating: number | undefined) {
  if (typeof rating !== "number" || !Number.isFinite(rating) || rating <= 0) {
    return "";
  }

  return `★ ${Number.isInteger(rating) ? rating : rating.toFixed(1)}`;
}

// Poster card with the composition of the home "Сейчас смотрят" rail (.desktop-mock-rail-card):
// title and "year · ★ rating" over the poster, the content type as a small pill, optional actions below.
export default function MediaCard({
  item,
  onOpen,
  badge,
  actions,
  priority = false,
}: {
  item: MediaCardItem;
  onOpen?: (item: MediaCardItem) => void;
  badge?: string;
  actions?: ReactNode;
  priority?: boolean;
}) {
  const href = `/movie/${item.slug}`;
  const rating = formatRating(item.rating);
  const ratingBadge = getRatingBadge(item.rating);
  const meta = [item.year, item.type].filter(Boolean).join(" · ");
  const poster = (
    <>
      <PosterImage
        src={item.poster || getPosterFallback(item.title, item.originalTitle, item.type)}
        alt=""
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = getPosterFallback(item.title, item.originalTitle, item.type);
        }}
      />
      <span className="kl-card-type" aria-hidden="true">
        {badge || item.type}
      </span>
    </>
  );

  return (
    <article className="kl-card">
      <div className="kl-card-frame">
        {onOpen ? (
          <button
            type="button"
            className="kl-card-poster"
            onClick={() => onOpen(item)}
            aria-label={`Подробнее: ${item.title}${meta ? `, ${meta}` : ""}${rating ? `, рейтинг ${rating}` : ""}`}
            aria-haspopup="dialog"
          >
            {poster}
          </button>
        ) : (
          <Link href={href} className="kl-card-poster" aria-label={`${item.title}${meta ? `, ${meta}` : ""}`}>
            {poster}
          </Link>
        )}

        <div className="kl-card-body">
          <h3 className="kl-card-title" title={item.title}>
            <Link href={href}>{item.title}</Link>
          </h3>
          <p className="kl-card-meta" aria-hidden="true">
            {item.year}
            {item.year && ratingBadge ? " · " : null}
            {ratingBadge ? <span className="kl-card-rating">{ratingBadge}</span> : null}
          </p>
        </div>
      </div>

      {actions ? <div className="kl-card-actions">{actions}</div> : null}
    </article>
  );
}
