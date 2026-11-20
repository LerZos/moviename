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

// Same badge text as the catalog grid (getRatingBadgeText in CatalogPageClient).
function getRatingBadge(rating: number | undefined) {
  if (typeof rating !== "number" || !Number.isFinite(rating) || rating <= 0) {
    return "—";
  }

  return `★ ${Number.isInteger(rating) ? rating : rating.toFixed(1)}`;
}

// Movie card with the production catalog composition (.catalog-card): poster with type and rating pills,
// then year/genre, title, original title and an optional pair of actions under the poster.
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
  const meta = [item.year, item.type].filter(Boolean).join(" · ");
  const genre = item.genres?.find((value) => value && value.toLowerCase() !== item.type.toLowerCase());
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
      <span className="kl-card-shade" aria-hidden="true" />
      <span className="kl-card-type" aria-hidden="true">
        {badge || item.type}
      </span>
      <span className="kl-card-rating" aria-hidden="true">
        {getRatingBadge(item.rating)}
      </span>
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

      <div className="kl-card-body">
        <p className="kl-card-meta" aria-hidden="true">
          <span>{item.year}</span>
          {genre ? <span>{genre}</span> : null}
        </p>
        <h3 className="kl-card-title" title={item.title}>
          <Link href={href}>{item.title}</Link>
        </h3>
        {item.originalTitle && item.originalTitle !== item.title ? (
          <p className="kl-card-original">{item.originalTitle}</p>
        ) : null}
        {actions ? <div className="kl-card-actions">{actions}</div> : null}
      </div>
    </article>
  );
}
