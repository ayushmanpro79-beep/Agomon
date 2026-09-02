import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import BrowseClient from "./BrowseClient";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://agomon.vercel.app";

export const metadata: Metadata = {
  title: "Browse — Explore Various Pandals in Kolkata 2026",
  description: "Explore Various Pandals in Kolkata — filter by area, search by metro or locality, view on OSM map and discover community reviews.",
  alternates: { canonical: `${base}/browse` },
  openGraph: { title: "Browse — Explore Various Pandals in Kolkata 2026", description: "Explore Various Pandals in Kolkata — filter by area & metro on live map.", url: `${base}/browse`, type: "website", siteName: "Agomon" },
  twitter: { card: "summary_large_image", title: "Browse — Explore Various Pandals in Kolkata 2026", description: "Explore Various Pandals in Kolkata — live map & reviews." },
};

export default async function BrowsePage() {
  let initialPandals: any[] = [];
  try {
    const supabase = createServerClient();
    const { data } = await supabase.from("pandals").select("*").order("name");
    initialPandals = data || [];
  } catch {}

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Explore Various Pandals in Kolkata — Browse",
    description: "Browse and explore various Durga Puja pandals across Kolkata with map, area and metro filters.",
    url: `${base}/browse`,
    isPartOf: { "@type": "WebSite", name: "Agomon", url: base },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: "Browse — Explore Various Pandals in Kolkata", item: `${base}/browse` },
    ],
  };
  const itemListLd = initialPandals.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        numberOfItems: initialPandals.length,
        itemListElement: initialPandals.map((p: any, i: number) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${base}/pandal/${p.slug}`,
          name: p.name,
        })),
      }
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {itemListLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />}
      {/* SSR crawler links — visible to bots, enhances indexing even before JS hydrates */}
      <div className="sr-only">
        <h1>Explore Various Pandals in Kolkata — Browse All Pandals</h1>
        <ul>
          {initialPandals.map((p: any) => (
            <li key={p.id}>
              <a href={`/pandal/${p.slug}`}>{p.name} — {p.area}</a>
            </li>
          ))}
        </ul>
      </div>
      <BrowseClient initialPandals={initialPandals} />
    </>
  );
}
