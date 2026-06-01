import type { MetadataRoute } from "next";

import { siteUrl } from "./lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/", "/profile", "/profile/"],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/movie/", "/catalog/", "/collections/", "/expected"],
        disallow: ["/admin", "/admin/", "/api/", "/profile", "/profile/"],
      },
      {
        userAgent: "Yandex",
        allow: ["/", "/movie/", "/catalog/", "/collections/", "/expected"],
        disallow: ["/admin", "/admin/", "/api/", "/profile", "/profile/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
