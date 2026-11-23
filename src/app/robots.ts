import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/tarifs",
          "/explorer",
          "/cgu",
          "/confidentialite",
          "/mentions-legales",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/tableau-de-bord",
          "/tableau-de-bord/*",
          "/api/*",
          "/auth/*",
          "/onboarding",
          "/boutiques",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
