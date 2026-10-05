import type { Metadata, Viewport } from "next";

import "./globals.css";
import {
  getOrganizationJsonLd,
  getWebSiteJsonLd,
  siteUrl,
} from "./lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "KinoLuma — фильмы, сериалы, аниме и мультфильмы смотреть онлайн",
    template: "%s — KinoLuma",
  },

  description:
    "KinoLuma — каталог фильмов, сериалов, аниме, мультфильмов и документальных проектов: смотреть онлайн, читать описания, рейтинги, трейлеры и подборки без регистрации.",

  applicationName: "KinoLuma",

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
    title: "KinoLuma — фильмы, сериалы, аниме и мультфильмы смотреть онлайн",
    description:
      "Подборки фильмов, сериалов, аниме, мультфильмов и документальных проектов: рейтинги, трейлеры, описания и страницы просмотра без регистрации.",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getOrganizationJsonLd()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getWebSiteJsonLd()),
          }}
        />
        {children}
        <footer className="border-t border-white/10 bg-black px-6 pb-28 pt-8 text-center text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500 md:pb-8">
          KinoLuma © 2026. Все права защищены.
        </footer>
      </body>
    </html>
  );
}
