import type { Metadata } from "next";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import PandalDetailClient from "./PandalDetailClient";

type Pandal = {
  id: string;
  name: string;
  slug: string;
  area: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url?: string | null;
  avg_rating?: number | null;
  rating_count?: number | null;
};

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://agomon.vercel.app";

export async function generateStaticParams() {
  try {
    const supabase = createServerClient();
    const { data } = await supabase.from("pandals").select("slug");
    return (data || []).map((p: any) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const supabase = createServerClient();
    const { data } = await supabase.from("pandals").select("name, slug, area, address").eq("slug", slug).single();
    if (!data) return { title: "Pandal Not Found | Agomon" };
    const title = `${data.name} Durga Puja 2026 — ${data.area}`;
    const description = `Explore ${data.name} in ${data.area}, Kolkata. ${data.address || data.area + ", Kolkata"} — map, nearest metro, crowd updates & community reviews on Agomon.`;
    return {
      title,
      description,
      alternates: { canonical: `${base}/pandal/${slug}` },
      openGraph: { title, description, url: `${base}/pandal/${slug}`, type: "article", siteName: "Agomon" },
      twitter: { card: "summary_large_image", title, description },
    };
  } catch {
    return { title: "Agomon — Explore Various Pandals in Kolkata" };
  }
}

export default async function PandalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServerClient();
  const { data } = await supabase.from("pandals").select("*").eq("slug", slug).single();

  if (!data) {
    return (
      <div className="py-20 text-center">
        <p className="text-white/50">Pandal not found</p>
        <Link href="/browse" className="text-[#FFD60A] underline text-sm">Back to Browse — Explore Various Pandals in Kolkata</Link>
      </div>
    );
  }

  const pandal = data as Pandal;
  const rating = pandal.avg_rating ?? 4.5;
  const count = pandal.rating_count ?? 0;

  // JSON-LD for TouristAttraction + Breadcrumb + AggregateRating (helps community SEO)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: pandal.name,
    description: `Durga Puja pandal ${pandal.name} in ${pandal.area}, Kolkata`,
    address: { "@type": "PostalAddress", addressLocality: "Kolkata", addressRegion: "West Bengal", addressCountry: "IN", streetAddress: pandal.address || pandal.area },
    geo: pandal.latitude && pandal.longitude ? { "@type": "GeoCoordinates", latitude: pandal.latitude, longitude: pandal.longitude } : undefined,
    aggregateRating: count > 0 ? { "@type": "AggregateRating", ratingValue: rating.toFixed(1), reviewCount: count, bestRating: "5", worstRating: "1" } : undefined,
    isAccessibleForFree: true,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: "Browse — Explore Various Pandals in Kolkata", item: `${base}/browse` },
      { "@type": "ListItem", position: 3, name: pandal.name, item: `${base}/pandal/${pandal.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {/* SSR H1 + meta for crawlers before client hydration */}
      <div className="sr-only">
        <h1>{pandal.name} — {pandal.area} Durga Puja 2026</h1>
        <p>{pandal.address || pandal.area + ", Kolkata"} — Explore Various Pandals in Kolkata on Agomon map.</p>
        <a href="/browse">Browse all pandals</a>
      </div>
      <PandalDetailClient pandal={pandal} />
    </>
  );
}
