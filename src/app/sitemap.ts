import type { MetadataRoute } from "next";

import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/explorar`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/registro`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/terminos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const admin = createAdminClient();
    const [{ data: listings }, { data: profiles }] = await Promise.all([
      admin
        .from("listings")
        .select("id, updated_at")
        .eq("status", "active")
        .order("bumped_at", { ascending: false })
        .limit(5000),
      admin
        .from("profiles")
        .select("username, updated_at")
        .eq("onboarding_completed", true)
        .not("username", "is", null)
        .limit(5000),
    ]);

    const listingRoutes: MetadataRoute.Sitemap = (listings ?? []).map((l) => ({
      url: `${base}/anuncio/${l.id}`,
      lastModified: l.updated_at ?? undefined,
      changeFrequency: "daily",
      priority: 0.7,
    }));

    const profileRoutes: MetadataRoute.Sitemap = (profiles ?? []).map((p) => ({
      url: `${base}/u/${p.username}`,
      lastModified: p.updated_at ?? undefined,
      changeFrequency: "weekly",
      priority: 0.5,
    }));

    return [...staticRoutes, ...listingRoutes, ...profileRoutes];
  } catch {
    return staticRoutes;
  }
}
