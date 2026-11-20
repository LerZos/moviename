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
  poster: string;
};

export function formatRating(rating: number | undefined) {
  return typeof rating === "number" && Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : "";
}

// Poster-first card in the production style: title and "year · ★ rating" sit on the artwork.
// The poster opens details (or the movie page); the title is always a plain link to the movie page.
export default function MediaCard({
  item,
  onOpen,
  badge,
  corner,
  actions,
  priority = false,
}: {
  item: MediaCardItem;
  onOpen?: (item: MediaCardItem) => void;
  badge?: string;
  corner?: ReactNode;
  actions?: ReactNode;
  priority?: boolean;
}) {
  const href = `/movie/${item.slug}`;
  const rating = formatRating(item.rating);
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
      {badge ? (
        <span className="kl-card-badges" aria-hidden="true">
          <span className="kl-tag">{badge}</span>
        </span>
      ) : null}
    </>
  );

  return (
    <article className="kl-card">
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

      {corner ? <div className="kl-card-corner">{corner}</div> : null}

      <div className="kl-card-body">
        <h3 className="kl-card-title" title={item.title}>
          <Link href={href}>{item.title}</Link>
        </h3>
        {item.year || rating ? (
          <p className="kl-card-meta" aria-hidden="true">
            {item.year}
            {item.year && rating ? " · " : null}
            {rating ? <span className="kl-rating">★ {rating}</span> : null}
          </p>
        ) : null}
        {actions ? <div className="kl-card-actions">{actions}</div> : null}
      </div>
    </article>
  );
}
