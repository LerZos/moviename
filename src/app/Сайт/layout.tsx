import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";
import { siteUrl } from "./lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "KinoLuma — фильмы, сериалы, аниме и мультфильмы онлайн",
    template: "%s — KinoLuma",
  },

  description:
    "KinoLuma — каталог фильмов, сериалов, аниме, мультфильмов и документальных проектов с описаниями, рейтингами, трейлерами и подборками.",

  applicationName: "KinoLuma",

  keywords: [
    "KinoLuma",
    "фильмы",
    "сериалы",
    "аниме",
    "мультфильмы",
    "документальные фильмы",
    "трейлеры",
    "каталог фильмов",
    "смотреть онлайн",
  ],

  authors: [{ name: "KinoLuma" }],
  creator: "KinoLuma",
  publisher: "KinoLuma",

  alternates: {
    canonical: "/",
  },

  icons: {
    icon: [
      {
        url: "/kinoluma-icon.png",
        type: "image/png",
        sizes: "32x32",
      },
      {
        url: "/kinoluma-icon.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "/kinoluma-icon.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    shortcut: "/kinoluma-icon.png",
    apple: [
      {
        url: "/kinoluma-icon.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },

  openGraph: {
    title: "KinoLuma — каталог фильмов и сериалов",
    description:
      "Подборки фильмов, сериалов, аниме, мультфильмов и документальных проектов: рейтинги, трейлеры, описания и страницы просмотра.",
    url: siteUrl,
    siteName: "KinoLuma",
    images: [
      {
        url: "/kinoluma-icon.png",
        width: 512,
        height: 512,
        alt: "KinoLuma",
      },
    ],
    locale: "ru_RU",
    type: "website",
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

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
