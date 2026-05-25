import type { Metadata } from "next";
import HomeClient from "./HomeClient";

import { siteUrl } from "./lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "KinoLuma — фильмы, сериалы, аниме и мультфильмы онлайн",
  description:
    "KinoLuma — каталог фильмов, сериалов, аниме, мультфильмов и документальных проектов с описаниями, рейтингами, трейлерами, подборками и страницами просмотра.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "KinoLuma — фильмы, сериалы, аниме и мультфильмы онлайн",
    description:
      "Подборки фильмов, сериалов, аниме, мультфильмов и документальных проектов: рейтинги, трейлеры, описания и страницы просмотра.",
    url: "/",
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
    title: "KinoLuma — фильмы, сериалы, аниме и мультфильмы онлайн",
    description:
      "Каталог фильмов, сериалов, аниме, мультфильмов и документальных проектов с подборками, трейлерами и страницами просмотра.",
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

export default function Page() {
  return <HomeClient />;
}
