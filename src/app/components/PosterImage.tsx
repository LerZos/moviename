"use client";

import type { ImgHTMLAttributes, SyntheticEvent } from "react";

type PosterImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  alt: string;
};

function toCssImageUrl(source: string) {
  return `url(${JSON.stringify(source)})`;
}

export function syncPosterBackground(image: HTMLImageElement) {
  const currentSource = image.currentSrc || image.src;

  if (currentSource) {
    image.style.setProperty(
      "--kinoluma-poster-source",
      toCssImageUrl(currentSource),
    );
  }
}

export default function PosterImage({
  src,
  alt,
  className = "",
  style,
  onLoad,
  onError,
  ...props
}: PosterImageProps) {
  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    syncPosterBackground(event.currentTarget);
    onLoad?.(event);
  };

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    onError?.(event);
    syncPosterBackground(event.currentTarget);
  };

  return (
    // Poster URLs can point to existing image proxy routes, so keep their native <img> loading semantics.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={src}
      alt={alt}
      className={`kinoluma-poster-image ${className}`.trim()}
      style={style}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
