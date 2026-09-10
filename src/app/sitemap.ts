import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://agomon.vercel.app";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/browse`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/pujo-routing`, lastModified: new Date(), changeFrequency: "daily", priority: 0.85 },
    { url: `${base}/pujo-routing/create`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/travel-plan`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const supabase = createServerClient();
    // pandals table has slug,created_at,image_url (no updated_at) — select only existing columns
    const { data, error } = await supabase.from("pandals").select("slug, created_at, image_url").order("name");
    if (error) throw error;
    if (data && data.length) {
      const pandalRoutes: MetadataRoute.Sitemap = data.map((p: any) => ({
        url: `${base}/pandal/${p.slug}`,
        lastModified: p.created_at ? new Date(p.created_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
        ...(p.image_url ? { images: [p.image_url] } : {}),
      }));
      return [...staticRoutes, ...pandalRoutes];
    }
  } catch (e) {
    console.error("sitemap pandals fetch failed", e);
    // fallback to static routes
  }

  return staticRoutes;
}
