import type { Metadata } from "next";
import TravelPlanClient from "./TravelPlanClient";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://agomon.vercel.app";

export const metadata: Metadata = {
  title: "Travel Plan — Shortest Bus & Metro Routes in Kolkata",
  description: "Find shortest bus and metro routes between any pandal, suburb, station or landmark in Kolkata. Time vs Budget toggle with crowd-aware metro priority.",
  alternates: { canonical: `${base}/travel-plan` },
  openGraph: { title: "Travel Plan — Agomon", description: "Shortest bus & metro routes — Time vs Budget", url: `${base}/travel-plan`, type: "website", siteName: "Agomon" },
};

export default function TravelPlanPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Travel Plan — Agomon",
    description: "Bus and metro routing with time vs budget toggle, powered by Kolkata Travel Router.",
    isPartOf: { "@type": "WebSite", name: "Agomon", url: base },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TravelPlanClient />
    </>
  );
}
