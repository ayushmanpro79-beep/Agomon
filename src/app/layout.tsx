import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import HeaderAuth from "@/components/auth/HeaderAuth";
import { cn } from "@/lib/utils";

const figtree = Figtree({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://agomon.vercel.app"),
  title: {
    default: "Agomon — Explore Various Pandals in Kolkata 2026",
    template: "%s | Agomon",
  },
  description: "Explore Various Pandals in Kolkata — live map, nearest metro, crowd meter & community reviews. Discover 100+ Durga Puja pandals across the city with Agomon.",
  keywords: ["Durga Puja Kolkata 2026", "Kolkata pandals map", "Durga Puja pandal list", "Agomon", "Kolkata Puja metro nearby", "Durga Puja crowd prediction"],
  // no canonical here — each page sets its own canonical to avoid duplicate signals on GSC
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Agomon",
    title: "Agomon — Explore Various Pandals in Kolkata 2026",
    description: "Explore Various Pandals in Kolkata — live map, nearest metro, crowd meter & community reviews.",
    images: [{ url: "/agomon-logo.png", width: 1200, height: 1200, alt: "Agomon — আগমন, Durga Puja guide Kolkata" }],
  },
  twitter: { card: "summary_large_image", title: "Agomon — Explore Various Pandals in Kolkata 2026", description: "Explore Various Pandals in Kolkata — live map, nearest metro, crowd meter & community reviews.", images: ["/agomon-logo.png"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  verification: { google: "google0b583c00175ca3fb" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://agomon.vercel.app";
  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Agomon",
    alternateName: "আগমন",
    url: base,
    description: "Explore Various Pandals in Kolkata — live map, metro & crowd meter",
    inLanguage: "en-IN",
    publisher: { "@type": "Organization", name: "Agomon", logo: { "@type": "ImageObject", url: `${base}/agomon-logo.png` } },
    potentialAction: { "@type": "SearchAction", target: `${base}/browse?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Agomon",
    url: base,
    logo: `${base}/agomon-logo.png`,
    description: "Community platform to explore various pandals in Kolkata with live map, crowd meter and reviews.",
  };
  return (
    <html lang="en" className={cn("h-full", geistSans.variable, geistMono.variable, "font-sans", figtree.variable)}>
      <body className="min-h-full flex flex-col bg-[#020617] text-[#FFF8E1]">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
        <header className="sticky top-0 z-50 glass-strong !rounded-none !border-x-0 !border-t-0 border-b border-[#FFD60A]/10">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-[#FFD60A] text-xl">◆</span>
              <div>
                <h1 className="font-bold text-[#FFD60A] leading-none tracking-wide">আগমন</h1>
                <p className="text-[10px] tracking-[0.2em] text-[#FFD60A]/50 -mt-0.5">AGOMON</p>
              </div>
            </Link>
            <HeaderAuth />
          </div>
        </header>
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">{children}</main>
        <footer className="py-6 flex flex-col items-center gap-2 text-center text-xs text-[#FFD60A]/30">
          <span>Agomon — Explore Various Pandals in Kolkata • 2026</span>
          <Image
            src="/soul-productions.png"
            alt="SOUL Productions"
            width={64}
            height={28}
            className="h-7 w-auto object-contain opacity-80"
            title="SOUL Productions"
          />
        </footer>
      </body>
    </html>
  );
}
