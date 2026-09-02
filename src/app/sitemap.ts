import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://agomon.vercel.app";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/browse`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.from("pandals").select("slug, created_at").order("name");
    if (error) throw error;
    if (data && data.length) {
      const pandalRoutes: MetadataRoute.Sitemap = data.map((p: any) => ({
        url: `${base}/pandal/${p.slug}`,
        lastModified: p.created_at ? new Date(p.created_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
      return [...staticRoutes, ...pandalRoutes];
    }
  } catch {
    // fallback to static routes if Supabase unavailable at build
  }

  return staticRoutes;
}
