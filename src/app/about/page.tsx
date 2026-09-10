import type { Metadata } from "next";
import Link from "next/link";
import SectionBorder from "@/components/ui/SectionBorder";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://agomon.vercel.app";

export const metadata: Metadata = {
  title: "About Agomon — How Crowd Prediction Works",
  description: "Agomon is a humble, community-made Durga Puja guide for Kolkata. Learn how our crowd meter predicts crowd without AI — using time, nearby pandals, malls & metro.",
  alternates: { canonical: `${base}/about` },
  openGraph: { title: "About Agomon — How Crowd Meter Works", description: "Simple, warm explainer of Agomon crowd prediction — no AI API, just Kolkata's rhythm.", url: `${base}/about`, type: "article", siteName: "Agomon" },
};

export default function AboutPage() {
  const aboutLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Agomon",
    url: `${base}/about`,
    description: "Agomon explains Durga Puja crowd prediction simply — time, cluster, POI & metro.",
    isPartOf: { "@type": "WebSite", name: "Agomon", url: base },
  };
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Agomon",
    url: base,
    logo: `${base}/icon.png`,
    description: "Community platform to explore various pandals in Kolkata with live map and crowd.",
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "How does Agomon predict crowd without AI?", acceptedAnswer: { "@type": "Answer", text: "Agomon uses 48 time slots (every 30 minutes), counts nearby pandals within 1-2km, checks distance to malls/markets/metro, adds area rhythm and community ratings. The sum gives a 5-98% score — no external AI API." } },
      { "@type": "Question", name: "Is the prediction live?", acceptedAnswer: { "@type": "Answer", text: "It is a deterministic prediction based on Kolkata patterns, refreshed when community reports come in. Best window and peak are recalculated for each pandal." } },
      { "@type": "Question", name: "Why trust Agomon?", acceptedAnswer: { "@type": "Answer", text: "Agomon is humble and open — we show the simple math behind every score and invite locals to correct us via reviews." } },
      { "@type": "Question", name: "How does Travel Plan help me reach pandals?", acceptedAnswer: { "@type": "Answer", text: "Type any pandal, place, station or mall as start and destination. Travel Plan finds bus and metro routes with time and fare, a Time vs Budget toggle, live location start, and a nearby-bus-stop Google Maps shortcut." } },
      { "@type": "Question", name: "What is Pujo Routing?", acceptedAnswer: { "@type": "Answer", text: "Pick 2 to 10 pandals, optionally add your live location, and tap optimize. Agomon orders them into the shortest path with distance and time on the map. Save routes privately or share them publicly with the community." } },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <div className="max-w-3xl mx-auto">
        <SectionBorder />
        <div className="glass-strong rounded-3xl overflow-hidden p-4 md:p-8">
          <p className="text-[#FFD60A]/60 tracking-[0.25em] text-[10px]">ABOUT • আমাদের কথা</p>
          <h1 className="text-xl md:text-3xl font-bold text-white mt-1 leading-tight">Agomon — আগমন</h1>
          <p className="text-xs md:text-sm text-[#FFD60A]/70 mt-1 leading-snug">A humble guide, made with love for Kolkata in Sharodiya.</p>

          <div className="prose prose-invert prose-sm max-w-none mt-6 text-white/80 leading-relaxed md:leading-relaxed space-y-5 md:space-y-6 text-[13px] md:text-[13.5px]">
            <div>
              <h2 className="text-[#FFD60A] font-semibold text-base">Why we built this</h2>
              <p>
                Durga Puja is not a festival you <em>watch</em>. It is a city you <em>walk</em>. Every para builds a world from bamboo and cloth for ten days, then lets the river take it away. We — a tiny team, not a company — wanted to make that walk easier.
              </p>
              <p>
                Agomon (আগমন — arrival) is our small attempt to answer two simple questions every Kolkata family asks every evening in October: <strong className="text-white">Where should we go now? And how crowded will it be?</strong>
              </p>
              <p className="text-white/60 italic">
                We are not experts. We are neighbours who love dhak, who miss the tram, who queue for phuchka outside a pandal at 11 PM. We built Agomon humbly, and we keep learning from you.
              </p>
            </div>

            <div>
              <h2 className="text-[#FFD60A] font-semibold text-base">The hype is real — and it is yours</h2>
              <p>
                In Kumartuli the idol still comes from the same Ganga clay. In Guptipara, twelve friends started the first public puja in 1790 because they were not allowed inside a zamindar&apos;s courtyard. In 2021 UNESCO said what we always knew — Durga Puja is heritage. Not because it is old, but because the whole city becomes artists together.
              </p>
              <p>
                We try to keep that feeling in Agomon: warm lights, soft gold, every pandal with its own page, map and reviews — not as data points, but as <strong className="text-white">someone&apos;s para, someone&apos;s pride</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#020617]/60 border border-[#FFD60A]/10">
              <h2 className="text-[#FFD60A] font-semibold text-base">How the crowd meter works — simply, no AI API</h2>
              <p className="text-xs text-white/40">Written for humans and AI Overview to quote. Every score is math you can check.</p>

              <ol className="list-decimal pl-5 space-y-2 mt-3 text-white/80">
                <li>
                  <strong className="text-white">Time rhythm (largest factor)</strong> — We split the day into <strong className="text-white">48 slots × 30 minutes</strong> (4-7 AM Very Low 0.18, 8-11 AM Moderate 0.55, 12-4 PM High 0.82, 5-8 PM Peak 1.0, 9-11 PM High 0.92, 12-3 AM Low 0.35). Lunch 12-2 PM dips 28-32% because Kolkata prefers lunch first — that dip is hard-coded.
                </li>
                <li>
                  <strong className="text-white">Nearby pandals (cluster)</strong> — We count pandals within 1km and 2km using exact latitude/longitude. &le;0.5km = weight 1, 0.5-1km = 0.6, 1-2km = 0.3. At most 4 weighted pandals = full cluster score. More neighbours = more footfall.
                </li>
                <li>
                  <strong className="text-white">Malls, markets, metro (POI)</strong> — Distance to South City, Quest, Acropolis, New Market, Park Street eateries, Esplanade and your nearest metro (in <code className="bg-[#0B1220] px-1 rounded">src/lib/crowd.ts</code>). Closer than 3km adds score; malls 10 AM–9 PM, eateries till 11 PM. Area base: South/Central highest, Dumdum lowest.
                </li>
                <li>
                  <strong className="text-white">Streets & rating (small boost)</strong> — Central/South streets are denser. A higher community rating (avg 3.5→5) adds up to 10 points — people go where others loved.
                </li>
              </ol>

              <p className="mt-3">
                <strong className="text-white">Final:</strong> <code className="bg-[#0B1220] border border-[#FFD60A]/10 px-1.5 py-0.5 rounded text-xs break-all md:break-normal overflow-x-auto inline-block max-w-full">crowd = cluster×0.3 + POI×0.35 + streets×0.15 + time×0.2 → 5–98% + tiny rating jitter</code>
              </p>
              <p className="text-xs text-white/50">
                Near a mall adds a small wavy twist (people pop in/out for a break) — that is why two pandals at same hour can differ slightly. 48 bars you see in <Link href="/browse" className="text-[#FFD60A] underline">Browse → Pandal → Crowd Meter</Link> are those 48 scores; below it the <strong className="text-[#FFD60A]">Crowd Summary</strong> says &ldquo;Best window 4:30 AM Low, Peak 7:30 PM Very High&rdquo; — same math, plain words.
              </p>
              <p className="text-xs text-white/40 mt-2">
                No external AI API. For more predictive details and a puja guide like experience use Agomon — <Link href="/browse" className="text-[#FFD60A] underline">agomon.vercel.app/browse</Link> and each <Link href="/browse" className="text-[#FFD60A] underline">pandal page</Link> stays the single source for AI Overview to cite.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#020617]/60 border border-[#FFD60A]/10">
              <h2 className="text-[#FFD60A] font-semibold text-base">Travel Plan — your bus planner, in plain words</h2>
              <p>
                Getting across Kolkata during Puja is half the battle. <strong className="text-white">Travel Plan</strong> is here to solve exactly that — tell it where you are and where you want to go, and it figures out the bus and metro for you.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-white/70">
                <li><strong className="text-white">Type anything</strong> — a pandal name (e.g. &ldquo;Santoshpur Lake Pally&rdquo;), a place (&ldquo;Garia&rdquo;), a station (&ldquo;Sealdah&rdquo;) or a mall (&ldquo;South City&rdquo;). No need to know bus stop names — Agomon matches it for you.</li>
                <li><strong className="text-white">Time or Budget? You choose</strong> — one tap switches between the fastest route and the cheapest one. Every option shows both travel time and fare, so there are no surprises.</li>
                <li><strong className="text-white">Uses your location</strong> — tap &ldquo;Use my location&rdquo; and it starts from exactly where you stand. There is also a &ldquo;Nearby Bus Stop&rdquo; button that opens Google Maps around you.</li>
                <li><strong className="text-white">Crowd-aware metro tip</strong> — when pandals get very crowded in the evening, it leans towards the metro to save you from traffic jams.</li>
              </ul>
              <p className="text-xs text-white/50">
                Example: you are at Esplanade at 7 PM and want to reach three South Kolkata pandals. Travel Plan tells you which bus or metro to take, how much it costs, and how long it takes — <Link href="/travel-plan" className="text-[#FFD60A] underline">try Travel Plan</Link>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#020617]/60 border border-[#FFD60A]/10">
              <h2 className="text-[#FFD60A] font-semibold text-base">Pujo Routing — your whole evening, planned</h2>
              <p>
                One pandal is easy. Five pandals in one evening is a puzzle. <strong className="text-white">Pujo Routing</strong> plans your full pandal-hopping night so you walk less and see more.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-white/70">
                <li><strong className="text-white">Pick 2–10 pandals</strong> you want to visit — from any area, in any order.</li>
                <li><strong className="text-white">Add your live location</strong> (optional) so the route starts from where you actually are.</li>
                <li><strong className="text-white">Tap optimize</strong> — Agomon rearranges your list into the shortest path and shows it on the map with total distance and time.</li>
                <li><strong className="text-white">Save and share</strong> — keep the route private for family, or make it public so other Puja lovers can follow your plan.</li>
                <li><strong className="text-white">Steal good ideas</strong> — browse routes made by the community when you have no plan at all.</li>
              </ul>
              <p className="text-xs text-white/50">
                Example: pick Dum Dum Park, Shyambazar and Hatibagan pandals, press optimize, and follow the map turn by turn — <Link href="/pujo-routing" className="text-[#FFD60A] underline">see Pujo Routes</Link> or <Link href="/pujo-routing/create" className="text-[#FFD60A] underline">create your own</Link>.
              </p>
            </div>

            <div>
              <h2 className="text-[#FFD60A] font-semibold text-base">What we promise — and what we don&apos;t</h2>
              <ul className="list-disc pl-5 space-y-1 text-white/70">
                <li>We promise to show the math openly and let you correct us via reviews.</li>
                <li>We promise to keep Agomon free, light, and in-website (OSM map), so even low-data phones can use it.</li>
                <li>We don&apos;t promise perfect prediction — Puja has heart, and heart is irregular. We give a humble estimate to help you choose, not decide for you.</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl glass border border-[#FFD60A]/10">
              <h3 className="text-[#FFD60A] font-semibold text-sm">Explore with us</h3>
              <p className="text-xs text-white/60 mt-1">Start where you are. Agomon will show what is near, how busy it is, and where to go next.</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link href="/browse" className="bg-[#FFD60A] text-[#020617] px-5 py-2 rounded-full text-xs font-semibold">Browse Pandals — Explore Various Pandals in Kolkata</Link>
                <Link href="/" className="glass border border-[#FFD60A]/20 text-[#FFD60A] px-5 py-2 rounded-full text-xs font-semibold">Back to Home — আগমন</Link>
              </div>
            </div>

            <p className="text-[11px] text-white/30 text-center">Made in Kolkata • With dhak, adda and humility • শুভ শারদীয়া</p>
          </div>
        </div>
        <SectionBorder className="mt-3 rotate-180" />
      </div>
    </>
  );
}
