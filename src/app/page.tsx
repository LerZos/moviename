import type { Metadata } from "next";
import HomeClient from "./HomeClient";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kinoluma.online";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "KinoLuma — фильмы, сериалы, аниме и мультфильмы онлайн",
  description:
    "KinoLuma — каталог фильмов, сериалов, аниме и мультфильмов с описаниями, рейтингами, трейлерами, подборками и легальными источниками просмотра.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "KinoLuma — каталог фильмов и сериалов",
    description:
      "Подборки фильмов, сериалов, аниме и мультфильмов: рейтинги, трейлеры, описание и страницы просмотра.",
    url: "/",
    siteName: "KinoLuma",
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KinoLuma — фильмы, сериалы, аниме и мультфильмы онлайн",
    description:
      "Каталог фильмов, сериалов, аниме и мультфильмов с подборками, трейлерами и страницами просмотра.",
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
