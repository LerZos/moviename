import type { Metadata } from "next";
import HomeClient from "./HomeClient";

import { getHomePageJsonLd, siteUrl } from "./lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    absolute: "KinoLuma — фильмы, сериалы, аниме и мультфильмы смотреть онлайн",
  },
  description:
    "KinoLuma — фильмы, сериалы, аниме, мультфильмы и документальные проекты смотреть онлайн: описания, рейтинги, трейлеры, подборки и страницы просмотра без регистрации.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "KinoLuma — фильмы, сериалы, аниме и мультфильмы смотреть онлайн",
    description:
      "Подборки фильмов, сериалов, аниме, мультфильмов и документальных проектов: рейтинги, трейлеры, описания и страницы просмотра без регистрации.",
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
    title: "KinoLuma — фильмы, сериалы, аниме и мультфильмы смотреть онлайн",
    description:
      "Каталог фильмов, сериалов, аниме, мультфильмов и документальных проектов с подборками, трейлерами и страницами просмотра без регистрации.",
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
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getHomePageJsonLd()),
        }}
      />
      <HomeClient />
    </>
  );
}
