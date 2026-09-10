import { DiyaLottie, DhakLottie, ShankhaLottie, TrishulLottie } from '@/components/decor/FestiveLottie'
import { AlpanaBorder, MarigoldGarland, JhalarLights, KashPhool, CornerMandala, TrishulIcon, ShankhaIcon, DhunuchiIcon, FestiveTopBanner, FestiveBottomStrip, FestiveCorners } from '@/components/decor/FestiveSVG'
import FestivePageDecor from '@/components/decor/FestivePageDecor'
import Link from 'next/link'

export const metadata = { title: 'Festive Preview — Durga Puja Decor' }

export default function FestivePreviewPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#FFD60A]">Durga Puja Festive Assets — Preview</h1>
        <Link href="/" className="text-xs rounded-full border border-[#FFD60A]/20 px-3 py-1.5 text-[#FFD60A]">← Home</Link>
      </div>
      <p className="text-sm text-white/60">New SVGs in <code className="text-[#FFD60A]">/public/illustrations</code> + Lotties in <code className="text-[#FFD60A]">/public/lottie</code>. Nothing existing was modified.</p>

      {/* Top banners */}
      <section className="glass rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#FFD60A]">1. Banners — add to top/bottom of any page</h2>
        <p className="text-xs text-white/40"><code>import {'{ MarigoldGarland, JhalarLights, AlpanaBorder, KashPhool }'} from '@/components/decor/FestiveSVG'</code></p>
        <div className="rounded-xl overflow-hidden bg-[#020617] border border-[#FFD60A]/10">
          <FestiveTopBanner />
          <div className="p-6 text-center text-sm text-white/60">Your page content here — garland + jhalar are purely decorative (pointer-events-none)</div>
          <FestiveBottomStrip />
        </div>
        <div className="grid gap-3">
          <div><p className="text-xs text-white/50 mb-1">MarigoldGarland — mango-leaf toran</p><div className="rounded-lg overflow-hidden bg-[#020617] border border-white/5"><MarigoldGarland /></div></div>
          <div><p className="text-xs text-white/50 mb-1">JhalarLights — pennants + bulb string</p><div className="rounded-lg overflow-hidden bg-[#020617] border border-white/5"><JhalarLights /></div></div>
          <div><p className="text-xs text-white/50 mb-1">AlpanaBorder — repeat-x lotus/kolka (use <code>flip</code> for bottom)</p><AlpanaBorder /><AlpanaBorder flip className="mt-1 opacity-60" /></div>
          <div><p className="text-xs text-white/50 mb-1">KashPhool — autumn white grass field</p><div className="rounded-lg overflow-hidden bg-[#020617] border border-white/5"><KashPhool /></div></div>
        </div>
      </section>

      {/* Corner + icon SVGs */}
      <section className="glass rounded-2xl p-4 space-y-4">
        <h2 className="text-sm font-semibold text-[#FFD60A]">2. Corner & Icon SVGs</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-[#020617] border border-white/5 p-4 flex flex-col items-center gap-2"><CornerMandala size={72} /><span className="text-xs text-white/50">corner-mandala.svg</span></div>
          <div className="rounded-xl bg-[#020617] border border-white/5 p-4 flex flex-col items-center gap-2"><TrishulIcon size={36} /><span className="text-xs text-white/50">trishul.svg</span></div>
          <div className="rounded-xl bg-[#020617] border border-white/5 p-4 flex flex-col items-center gap-2"><ShankhaIcon size={44} /><span className="text-xs text-white/50">shankha.svg</span></div>
          <div className="rounded-xl bg-[#020617] border border-white/5 p-4 flex flex-col items-center gap-2"><DhunuchiIcon size={48} /><span className="text-xs text-white/50">dhunuchi.svg</span></div>
        </div>
        <div>
          <p className="text-xs text-white/50 mb-2">FestiveCorners wrapper — adds mandalas around any card (opt-in):</p>
          <FestiveCorners size={56} corners={4} className="rounded-xl overflow-hidden">
            <div className="glass-strong rounded-xl p-10 text-center">Hero / Card content — corners are decorative only</div>
          </FestiveCorners>
          <pre className="mt-2 text-[11px] bg-[#020617] rounded-lg p-3 border border-white/5 overflow-auto text-white/60">{`<FestiveCorners size={56}>\n  <YourHeroCard />\n</FestiveCorners>`}</pre>
        </div>
      </section>

      {/* Lotties */}
      <section className="glass rounded-2xl p-4 space-y-4">
        <h2 className="text-sm font-semibold text-[#FFD60A]">3. Lottie Animations — animated festive icons</h2>
        <p className="text-xs text-white/40"><code>import {'{ DiyaLottie, DhakLottie, ShankhaLottie, TrishulLottie, PetalsOverlay }'} from '@/components/decor/FestiveLottie'</code></p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-[#020617] border border-white/5 p-4 flex flex-col items-center gap-2"><DiyaLottie size={72} /><span className="text-xs text-white/50">diya-flicker.json</span><code className="text-[10px] text-white/30">&lt;DiyaLottie size={72} /&gt;</code></div>
          <div className="rounded-xl bg-[#020617] border border-white/5 p-4 flex flex-col items-center gap-2"><DhakLottie size={96} /><span className="text-xs text-white/50">dhak-beat.json</span><code className="text-[10px] text-white/30">&lt;DhakLottie size={96} /&gt;</code></div>
          <div className="rounded-xl bg-[#020617] border border-white/5 p-4 flex flex-col items-center gap-2"><ShankhaLottie size={84} /><span className="text-xs text-white/50">shankha-blow.json</span><code className="text-[10px] text-white/30">&lt;ShankhaLottie /&gt;</code></div>
          <div className="rounded-xl bg-[#020617] border border-white/5 p-4 flex flex-col items-center gap-2"><TrishulLottie size={48} /><span className="text-xs text-white/50">trishul-glow.json</span><code className="text-[10px] text-white/30">&lt;TrishulLottie /&gt;</code></div>
        </div>
        <div className="rounded-xl bg-[#020617] border border-[#FFD60A]/10 p-4">
          <p className="text-xs text-[#FFD60A]/80 mb-1">PetalsOverlay — full-screen floating shiuli + marigold petals (fixed, pointer-events-none). Respect reduced-motion.</p>
          <pre className="text-[11px] bg-black/40 rounded-lg p-3 border border-white/5 overflow-auto text-white/60">{`// in your layout or page\nimport { PetalsOverlay } from '@/components/decor/FestiveLottie'\n<PetalsOverlay opacity={0.32} />  // subtle — increase to 0.55 for fuller`}</pre>
          <p className="text-xs text-white/30 mt-2">File: <code>/public/lottie/petals-fall.json</code> — also available as <code>&lt;FestiveLottie type="petals" /&gt;</code></p>
        </div>
      </section>

      {/* How to use */}
      <section className="glass rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#FFD60A]">4. Quick recipes — copy & paste</h2>
        <div className="space-y-3 text-xs">
          <div className="rounded-lg bg-[#020617] border border-white/5 p-3">
            <p className="text-[#FFD60A]/80 mb-1">A) Dress the home hero without touching its code — wrap it:</p>
            <pre className="text-white/60 overflow-auto">{`import { FestiveCorners } from '@/components/decor/FestiveSVG'\nimport { DiyaLottie } from '@/components/decor/FestiveLottie'\n\n<FestiveCorners size={64}>\n  <YourExistingHero />\n</FestiveCorners>\n// or add a thin garland above hero:\n<MarigoldGarland className="mb-3" />`}</pre>
          </div>
          <div className="rounded-lg bg-[#020617] border border-white/5 p-3">
            <p className="text-[#FFD60A]/80 mb-1">B) Add a festive page frame (top garland + bottom alpana + petals):</p>
            <pre className="text-white/60 overflow-auto">{`import FestivePageDecor from '@/components/decor/FestivePageDecor'\n\n<FestivePageDecor variant="full" showPetals petalsOpacity={0.28} />`}</pre>
          </div>
          <div className="rounded-lg bg-[#020617] border border-white/5 p-3">
            <p className="text-[#FFD60A]/80 mb-1">C) Use raw SVGs / Lotties anywhere via &lt;img&gt; or constants:</p>
            <pre className="text-white/60 overflow-auto">{`import { FESTIVE_SVGS } from '@/components/decor/FestiveSVG'\nimport { FESTIVE_LOTTIES } from '@/components/decor/FestiveLottie'\n\n<img src={FESTIVE_SVGS.trishul} alt="" className="w-10" />\n<img src={FESTIVE_SVGS.shankha} alt="" className="w-12" />\n// Lottie paths for direct use:\n// /lottie/diya-flicker.json, /lottie/dhak-beat.json, /lottie/shankha-blow.json, etc.`}</pre>
          </div>
        </div>
        <p className="text-[11px] text-white/30">All new assets are additive. Existing files <code>dhak.svg</code>, <code>durga-eyes.svg</code>, <code>scandi-border.svg</code>, <code>menu.json</code> and <code>page.tsx</code> were left untouched.</p>
      </section>

      {/* Live decor demo - subtle */}
      <div className="rounded-2xl border border-[#FFD60A]/10 overflow-hidden">
        <FestivePageDecor variant="minimal" />
      </div>
    </div>
  )
}
