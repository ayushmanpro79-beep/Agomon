'use client'
import InstallButton from './InstallButton'

export default function InstallGuide() {
  return (
    <div className="glass rounded-3xl overflow-hidden border border-[#FFD60A]/10 p-4 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[#FFD60A]/60 tracking-[0.22em] text-[10px]">INSTALL</p>
          <h2 className="text-base md:text-lg font-bold text-white mt-1">Install Agomon as an App 📲</h2>
          <p className="text-xs text-white/60 mt-1 leading-snug">
            One tap • no Play Store • no warning • works like a native app
          </p>
        </div>
        <span className="hidden md:inline-flex text-[10px] tracking-wide text-[#FFD60A]/50 border border-[#FFD60A]/15 rounded-full px-2.5 py-1 glass">
          ~1 MB • safe PWA
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mt-4">
        <div className="rounded-2xl bg-[#020617]/60 border border-[#FFD60A]/10 p-3.5">
          <p className="text-xs font-semibold text-[#FFD60A] flex items-center gap-1.5">
            <span className="inline-flex w-5 h-5 rounded-full bg-[#FFD60A] text-[#020617] text-[11px] font-bold items-center justify-center">
              1
            </span>{' '}
            Android (Chrome)
          </p>
          <ol className="list-decimal pl-5 text-[12.5px] text-white/75 mt-2 space-y-1 leading-relaxed">
            <li>
              Tap <span className="text-white font-medium">Install Agomon</span> below
            </li>
            <li>
              Tap <span className="text-white font-medium">Install</span> in the prompt
            </li>
            <li className="text-white/50">Find it on your home screen — opens without browser bar</li>
          </ol>
          <p className="text-[11px] text-white/35 mt-2">
            No “Install from unknown source” — it’s a trusted browser install.
          </p>
        </div>

        <div className="rounded-2xl bg-[#020617]/60 border border-[#FFD60A]/10 p-3.5">
          <p className="text-xs font-semibold text-[#FFD60A] flex items-center gap-1.5">
            <span className="inline-flex w-5 h-5 rounded-full bg-[#FFD60A] text-[#020617] text-[11px] font-bold items-center justify-center">
              2
            </span>{' '}
            iPhone (Safari)
          </p>
          <ol className="list-decimal pl-5 text-[12.5px] text-white/75 mt-2 space-y-1 leading-relaxed">
            <li>
              Tap <span className="text-white font-medium">Share</span> <span aria-hidden>⬆️</span> at the bottom
            </li>
            <li>
              Tap <span className="text-white font-medium">Add to Home Screen</span> → <span className="text-white font-medium">Add</span>
            </li>
            <li className="text-white/50">Look for the Agomon icon on your home screen</li>
          </ol>
          <p className="text-[11px] text-white/35 mt-2">Button above also opens these steps on iPhone.</p>
        </div>
      </div>

      {/* Smart button - shows only when installable or iPhone, hides silently otherwise - no error */}
      <InstallButton />

      <p className="text-[10px] text-white/25 text-center mt-3">
        Tip: On desktop Chrome, use menu <span className="text-white/40">⋮ → Install Agomon</span> • Updates automatically
      </p>
    </div>
  )
}
