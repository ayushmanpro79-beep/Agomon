import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agomon — আগমন",
  description: "Kolkata Puja Tracker - 45 Popular Pujas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#0F172A] text-[#FFF8E1]">
        <header className="sticky top-0 z-50 bg-[#0F172A]/90 backdrop-blur border-b border-[#FFD60A]/20">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">🪔</span>
              <div>
                <h1 className="font-bold text-[#FFD60A] leading-none">আগমন</h1>
                <p className="text-[10px] tracking-[0.2em] text-[#FFD60A]/70 -mt-0.5">AGOMON</p>
              </div>
            </Link>
            <nav className="flex gap-1 text-sm">
              <Link href="/" className="px-3 py-1.5 rounded-full bg-[#FFD60A] text-[#0F172A] font-semibold">Welcome</Link>
              <Link href="/map" className="px-3 py-1.5 rounded-full border border-[#FFD60A]/30 text-[#FFD60A] flex items-center gap-1">🪔 Map</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">{children}</main>
        <footer className="py-6 text-center text-xs text-[#FFD60A]/40">Agomon — 45 Popular Pujas • 2026 • Navy & Yellow</footer>
      </body>
    </html>
  );
}
