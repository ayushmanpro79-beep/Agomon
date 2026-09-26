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
        <div className="glass-strong rounded-[24px] p-5 md:p-7 ring-1 ring-[#FFD60A]/10 relative">
          <div className="flex items-center gap-2">
            <span className="chip-minimal px-2.5 py-1 text-[#FFD60A] tracking-[0.18em] text-[10px]">PUJO ROUTING</span>
            <span className="chip-minimal px-2.5 py-1 text-white/40">Community</span>
          </div>
          <h1 className="text-xl md:text-[26px] font-bold text-white mt-2.5 tracking-tight text-balance">Hop plans, shared</h1>
          <p className="text-[13px] text-white/50 mt-1.5 leading-relaxed">Private by default — flip to Public to browse community routes.</p>

          <PujoRoutingFeedClient />
        </div>
        <SectionBorder className="mt-3 rotate-180" />
      </div>
    </>
  );
}
