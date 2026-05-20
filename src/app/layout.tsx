import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://kinoluma.online"
).replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "KinoLuma — фильмы, сериалы, аниме и мультфильмы онлайн",
    template: "%s — KinoLuma",
  },
  description:
    "KinoLuma — легальный каталог фильмов, сериалов, аниме, мультфильмов и документалок с описаниями, рейтингами, трейлерами и подборками.",
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
    "фильмы онлайн легально",
  ],
  authors: [{ name: "KinoLuma" }],
  creator: "KinoLuma",
  publisher: "KinoLuma",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/kinoluma-icon.png",
    apple: "/kinoluma-icon.png",
  },
  openGraph: {
    title: "KinoLuma — каталог фильмов и сериалов",
    description:
      "Подборки фильмов, сериалов, аниме и мультфильмов: рейтинги, трейлеры, описание и страницы просмотра.",
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
      "Каталог фильмов, сериалов, аниме и мультфильмов с подборками, трейлерами и страницами просмотра.",
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