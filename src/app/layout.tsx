import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import HeaderAuth from "@/components/auth/HeaderAuth";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://agomon.vercel.app"),
  title: {
    default: "Agomon — Explore Various Pandals in Kolkata 2026",
    template: "%s | Agomon",
  },
  description: "Explore Various Pandals in Kolkata — live map, metro & community reviews. Discover Durga Puja pandals across the city with Agomon.",
  keywords: ["Durga Puja Kolkata", "Kolkata pandals", "Durga Puja 2026", "Agomon", "Kolkata Puja map", "Durga Puja pandal list"],
  alternates: { canonical: "/" },
  icons: { icon: "/agomon-logo.png", apple: "/agomon-logo.png" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Agomon",
    title: "Agomon — Explore Various Pandals in Kolkata 2026",
    description: "Explore Various Pandals in Kolkata — live map, metro & community reviews.",
    images: [{ url: "/agomon-logo.png", width: 1200, height: 1200, alt: "Agomon — আগমন" }],
  },
  twitter: { card: "summary_large_image", title: "Agomon — Explore Various Pandals in Kolkata 2026", description: "Explore Various Pandals in Kolkata — live map, metro & community reviews.", images: ["/agomon-logo.png"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#020617] text-[#FFF8E1]">
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
        <Analytics />
      </body>
    </html>
  );
}
