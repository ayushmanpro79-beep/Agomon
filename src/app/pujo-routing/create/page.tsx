import type { Metadata } from "next";
import PujoRouteCreator from "@/components/pujo-routing/PujoRouteCreator";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://agomon.vercel.app";

export const metadata: Metadata = {
  title: "Create Pujo Route — Optimized with OSRM",
  description: "Select 2–10 pandals, use live GPS as fixed start, optimize with OSRM Trip (PUJO-APP). Blended with Agomon MapLibre & glass design.",
  alternates: { canonical: `${base}/pujo-routing/create` },
  openGraph: { title: "Create Pujo Route — Agomon", description: "Make your own optimized Durga Puja hopping route", url: `${base}/pujo-routing/create`, type: "website" },
};

export default function CreateRoutePage() {
  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to create an optimized Pujo route",
    description: "Pick pandals, use live location, optimize via OSRM Trip",
    step: [
      { "@type": "HowToStep", name: "Pick pandals", text: "Search and select 2–10 pandals" },
      { "@type": "HowToStep", name: "Use live location", text: "Tap Use my location — it stays fixed as start" },
      { "@type": "HowToStep", name: "Optimize", text: "Tap Optimize — OSRM reorders waypoints for shortest road distance" },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }} />
      <PujoRouteCreator />
    </>
  );
}
