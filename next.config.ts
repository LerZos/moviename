import type { NextConfig } from "next";
import { getLegacyHomeCatalogRedirects } from "./src/app/lib/home/homeCatalogRoutes";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/movie/rick-and-morty-2013",
        destination: "/movie/rik-i-morti-2013",
        permanent: true,
      },
      {
        source: "/movie/riki-i-morti-2013",
        destination: "/movie/rik-i-morti-2013",
        permanent: true,
      },
      ...getLegacyHomeCatalogRedirects(),
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "www.kinopoisk.ru",
      },
      {
        protocol: "https",
        hostname: "avatars.mds.yandex.net",
      },
    ],
  },
};

export default nextConfig;
