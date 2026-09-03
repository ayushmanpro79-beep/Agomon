import type { Metadata } from "next";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import SectionBorder from "@/components/ui/SectionBorder";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://agomon.vercel.app";

export const metadata: Metadata = {
  title: "Pujo Routing — Community Puja Routes",
  description: "Browse public Pujo routes made by the community — optimized pandal-hopping plans. Create your own route with live GPS + OSRM Trip optimization.",
  alternates: { canonical: `${base}/pujo-routing` },
  openGraph: { title: "Pujo Routing — Agomon", description: "Public puja routes + create your own optimized route", url: `${base}/pujo-routing`, type: "website", siteName: "Agomon" },
};

export const revalidate = 60;

export default async function PujoRoutingFeed() {
  let routes: any[] = [];
  try {
    const supabase = createServerClient();
    const { data } = await supabase.from("puja_routes").select("id,title,description,username,ordered_slugs,distance_m,duration_s,is_public,created_at").eq("is_public", true).order("created_at", { ascending: false }).limit(24);
    routes = data || [];
  } catch {
    routes = [];
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Pujo Routing — Public Routes",
    description: "Community-made Durga Puja routes in Kolkata",
    url: `${base}/pujo-routing`,
    isPartOf: { "@type": "WebSite", name: "Agomon", url: base },
  };

  const isEmpty = routes.length === 0;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-3xl mx-auto">
        <SectionBorder />
        <div className="glass-strong rounded-3xl p-5 md:p-6 relative">
          <p className="text-[#FFD60A]/60 tracking-[0.2em] text-[10px]">PUJO ROUTING • পুজো রুট</p>
          <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Public Pujo Routes</h1>
          <p className="text-xs text-white/50 mt-1">Premade routes by the community — tap to view map + optimized order. Make yours private or public.</p>
          <p className="text-[11px] text-white/30 mt-2">Routing via OSRM Trip (PUJO-APP by anujeetverma — MIT) blended with Agomon MapLibre</p>

          <Link href="/pujo-routing/create" className="mt-4 inline-flex items-center gap-2 bg-[#FFD60A] text-[#020617] px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#FFE566] transition">
            <span className="w-6 h-6 rounded-full bg-[#020617] text-[#FFD60A] flex items-center justify-center text-sm">+</span>
            Create your route
          </Link>

          {isEmpty ? (
            <div className="mt-6 p-6 rounded-2xl bg-[#020617]/40 border border-[#FFD60A]/10 text-center">
              <p className="text-sm text-white/70">No public routes yet — be the first!</p>
              <p className="text-xs text-white/40 mt-1">Pick 2–10 pandals, add live location, optimize. You can keep it private.</p>
              <Link href="/pujo-routing/create" className="inline-block mt-3 text-xs border border-[#FFD60A]/20 text-[#FFD60A] px-4 py-2 rounded-full">Go to creator →</Link>
              <p className="text-[11px] text-white/20 mt-4">Table <code>puja_routes</code> will appear here once Supabase migration runs. Without it, creator still works locally (route not saved).</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {routes.map((r: any) => (
                <Link key={r.id} href={`/pujo-routing/${r.id}`} className="block p-4 rounded-2xl glass border border-[#FFD60A]/10 hover:border-[#FFD60A]/20 transition">
                  <h3 className="text-sm font-semibold text-white line-clamp-1">{r.title}</h3>
                  <p className="text-xs text-white/40 mt-1 line-clamp-2">{r.description || `${r.ordered_slugs?.length || 0} pandals`}</p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-white/30">
                    <span>{r.username || "Anonymous"}</span>
                    <span>•</span>
                    <span>{r.distance_m ? `${(r.distance_m / 1000).toFixed(1)} km` : ""}</span>
                    <span>{r.duration_s ? `• ${Math.round(r.duration_s / 60)} min` : ""}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <SectionBorder className="mt-3 rotate-180" />

        {/* Floating + */}
        <Link href="/pujo-routing/create" aria-label="Create route" className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#FFD60A] text-[#020617] flex items-center justify-center text-2xl font-bold shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:bg-[#FFE566] transition z-30">+</Link>
      </div>
    </>
  );
}
