import type { NextConfig } from "next";

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
