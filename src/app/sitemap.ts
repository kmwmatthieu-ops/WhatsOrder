import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${base}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${base}/tarifs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/cgu`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${base}/confidentialite`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${base}/mentions-legales`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  try {
    const supabase = await createClient();
    const { data: shops } = await supabase
      .from("shops")
      .select("slug, updated_at")
      .eq("status", "active");

    const shopRoutes: MetadataRoute.Sitemap = (shops || []).map((shop) => ({
      url: `${base}/${shop.slug}`,
      lastModified: shop.updated_at ? new Date(shop.updated_at) : new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    }));

    return [...staticRoutes, ...shopRoutes];
  } catch {
    return staticRoutes;
  }
}
