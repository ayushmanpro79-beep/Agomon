import type { Metadata } from "next";
import SectionBorder from "@/components/ui/SectionBorder";
import PujoRoutingFeedClient from "@/components/pujo-routing/PujoRoutingFeedClient";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://agomon.vercel.app";

export const metadata: Metadata = {
  title: "Pujo Routing — Community Puja Routes",
  description: "Browse public Pujo routes made by the community — optimized pandal-hopping plans. Create your own route with live GPS + OSRM Trip optimization.",
  alternates: { canonical: `${base}/pujo-routing` },
  openGraph: { title: "Pujo Routing — Agomon", description: "Public puja routes + create your own optimized route", url: `${base}/pujo-routing`, type: "website", siteName: "Agomon" },
};

export const revalidate = 60;

export default function PujoRoutingFeed() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Pujo Routing — Public Routes",
    description: "Community-made Durga Puja routes in Kolkata",
    url: `${base}/pujo-routing`,
    isPartOf: { "@type": "WebSite", name: "Agomon", url: base },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-3xl mx-auto">
        <SectionBorder />
        <div className="glass-strong rounded-3xl p-5 md:p-6 relative">
          <p className="text-[#FFD60A]/60 tracking-[0.2em] text-[10px]">PUJO ROUTING • পুজো রুট</p>
          <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Pujo Routing</h1>
          <p className="text-xs text-white/50 mt-1">Your private routes by default — toggle to see community public routes. Make yours private or public.</p>
          <p className="text-[11px] text-white/30 mt-2">Routing via OSRM Trip (PUJO-APP by anujeetverma — MIT) blended with Agomon MapLibre</p>

          <PujoRoutingFeedClient />
        </div>
        <SectionBorder className="mt-3 rotate-180" />
      </div>
    </>
  );
}
