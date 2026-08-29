import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agomon — আগমন",
  description: "Kolkata Puja Tracker - 45 Popular Pujas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#020617] text-[#FFF8E1]">
        <header className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur border-b border-[#FFD60A]/10">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-[#FFD60A] text-xl">◆</span>
              <div>
                <h1 className="font-bold text-[#FFD60A] leading-none tracking-wide">আগমন</h1>
                <p className="text-[10px] tracking-[0.2em] text-[#FFD60A]/50 -mt-0.5">AGOMON</p>
              </div>
            </Link>
            <nav className="flex gap-1 text-sm">
              <Link href="/" className="px-3 py-1.5 rounded-full bg-[#FFD60A] text-[#020617] font-semibold text-xs">Welcome</Link>
              <Link href="/browse" className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A] text-xs">Browse</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">{children}</main>
        <footer className="py-6 flex flex-col items-center gap-2 text-center text-xs text-[#FFD60A]/30">
          <span>Agomon — 45 Popular Pujas • 2026</span>
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
