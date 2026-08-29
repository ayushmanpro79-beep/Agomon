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
      <body className="min-h-full flex flex-col bg-[#FFFBF0]">
        <header className="sticky top-0 z-50 bg-[#FFFBF0]/90 backdrop-blur border-b border-amber-100">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">🪔</span>
              <div>
                <h1 className="font-bold text-amber-900 leading-none">আগমন</h1>
                <p className="text-[10px] tracking-[0.2em] text-amber-700 -mt-0.5">AGOMON</p>
              </div>
            </Link>
            <nav className="flex gap-1 text-sm">
              <Link href="/" className="px-3 py-1.5 rounded-full hover:bg-amber-100 text-amber-900">Search</Link>
              <Link href="/map" className="px-3 py-1.5 rounded-full bg-amber-900 text-white">Map</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">{children}</main>
        <footer className="py-6 text-center text-xs text-zinc-400">Agomon — 45 Popular Pujas of Kolkata • 2026</footer>
      </body>
    </html>
  );
}
