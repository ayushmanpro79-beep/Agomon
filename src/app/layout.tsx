import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import HeaderAuth from "@/components/auth/HeaderAuth";
import RegisterSW from "@/components/pwa/RegisterSW";
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
        <div className="gradient-untitled" aria-hidden />
        <RegisterSW />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
        <header className="sticky top-0 z-50 glass-strong !rounded-none !border-x-0 !border-t-0 border-b border-[#FFD60A]/10 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-[#FFD60A]/25 bg-[#FFD60A]/10 text-[#FFD60A] text-xs transition group-hover:bg-[#FFD60A] group-hover:text-[#020617]">◆<span className="pulse-dot absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#FFD60A] ring-2 ring-[#020617]" /></span>
              <div className="leading-none">
                <h1 className="font-bold text-[#FFD60A] tracking-wide text-[15px]">আগমন</h1>
                <p className="text-[9px] tracking-[0.28em] text-[#FFD60A]/50 mt-0.5">AGOMON</p>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-[13px] font-medium" aria-label="Primary">
              <Link href="/browse" className="px-3 py-1.5 rounded-full text-[#FFF8E1]/70 hover:text-[#FFD60A] hover:bg-[#FFD60A]/10 transition">Browse</Link>
              <Link href="/pujo-routing" className="px-3 py-1.5 rounded-full text-[#FFF8E1]/70 hover:text-[#FFD60A] hover:bg-[#FFD60A]/10 transition">Routes</Link>
              <Link href="/travel-plan" className="px-3 py-1.5 rounded-full text-[#FFF8E1]/70 hover:text-[#FFD60A] hover:bg-[#FFD60A]/10 transition">Travel</Link>
            </nav>
            <div className="flex items-center gap-2">
              <a
                href="https://www.instagram.com/agomon.pujo26/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Agomon on Instagram"
                className="h-9 w-9 rounded-full border border-[#FFD60A]/20 bg-[#0B1220] flex items-center justify-center text-[#FFD60A] hover:bg-[#FFD60A] hover:text-[#020617] hover:border-[#FFD60A] transition active:scale-95"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="18" cy="6" r="1.2" fill="currentColor" />
                </svg>
              </a>
              <HeaderAuth />
            </div>
          </div>
          <div className="md:hidden border-t border-[#FFD60A]/10">
            <div className="max-w-5xl mx-auto px-4 py-1.5 flex items-center gap-1 text-xs font-medium overflow-x-auto scrollbar-hide">
              <Link href="/browse" className="px-3 py-1.5 rounded-full text-[#FFF8E1]/70 hover:text-[#FFD60A] whitespace-nowrap">Browse</Link>
              <Link href="/pujo-routing" className="px-3 py-1.5 rounded-full text-[#FFF8E1]/70 hover:text-[#FFD60A] whitespace-nowrap">Routes</Link>
              <Link href="/travel-plan" className="px-3 py-1.5 rounded-full text-[#FFF8E1]/70 hover:text-[#FFD60A] whitespace-nowrap">Travel</Link>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-5 md:py-6">{children}</main>
        <footer className="mt-8 border-t border-[#FFD60A]/10 py-6">
          <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
            <div className="flex items-center gap-2">
              <span className="text-[#FFD60A] text-sm">◆</span>
              <p className="text-xs text-[#FFD60A]/40">Agomon — Explore Various Pandals in Kolkata • 2026</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[#FFF8E1]/40">
              <Link href="/browse" className="hover:text-[#FFD60A] transition">Browse</Link>
              <Link href="/pujo-routing" className="hover:text-[#FFD60A] transition">Routing</Link>
              <Link href="/travel-plan" className="hover:text-[#FFD60A] transition">Travel</Link>
              <Link href="/about" className="hover:text-[#FFD60A] transition">About</Link>
            </div>
            <Image
              src="/soul-productions.png"
              alt="SOUL Productions"
              width={64}
              height={28}
              className="h-6 w-auto object-contain opacity-70"
              title="SOUL Productions"
            />
          </div>
        </footer>
        {/* Botpress Chatbot Vani — bottom corner every page, all devices */}
        <Script src="https://cdn.botpress.cloud/webchat/v5.0/inject.js" strategy="afterInteractive" />
        <Script src="https://files.bpcontent.cloud/2026/09/20/14/20260920144900-VQX9PA0X.js" strategy="afterInteractive" />
        {/* Fix blinking caret beside chatbot icon when closed */}
        <Script id="bp-caret-fix" strategy="afterInteractive">{`
          (function(){
            function blurWidgetCaret(){
              try{
                var ae=document.activeElement;
                if(ae && ae.closest && ae.closest('#bp-web-widget')){
                  var isInput = ae.matches('input,textarea,[contenteditable="true"]');
                  if(!isInput){
                    ae.blur();
                    if(document.body) document.body.focus({preventScroll:true});
                  }
                }
              }catch(e){}
            }
            document.addEventListener('click', function(){ setTimeout(blurWidgetCaret, 80); }, true);
            document.addEventListener('focusin', function(){
              setTimeout(function(){
                var ae=document.activeElement;
                if(ae && ae.closest && ae.closest('#bp-web-widget')){
                  var widget=document.getElementById('bp-web-widget');
                  var iframe=widget && widget.querySelector('iframe');
                  var isOpen=iframe && iframe.offsetHeight>100 && iframe.offsetWidth>100 && getComputedStyle(iframe).display!=='none';
                  if(!isOpen && !ae.matches('input,textarea,[contenteditable="true"]')) blurWidgetCaret();
                }
              }, 80);
            }, true);
            var tries=0;
            var iv=setInterval(function(){
              tries++;
              if(window.botpressWebChat && window.botpressWebChat.onEvent){
                clearInterval(iv);
                try{
                  window.botpressWebChat.onEvent(function(e){
                    if(e && (e.type==='webchat:closed' || e.type==='UI.CLOSED' || e.type==='LIFECYCLE.ANIMATED_OUT' || String(e.type).indexOf('CLOSED')>-1)){
                      setTimeout(blurWidgetCaret, 50);
                    }
                  }, ['webchat:closed','UI.CLOSED']);
                }catch(e){}
              }
              if(tries>40) clearInterval(iv);
            },500);
          })();
        `}</Script>
      </body>
    </html>
  );
}
