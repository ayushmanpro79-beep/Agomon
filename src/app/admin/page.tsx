'use client'
import { useEffect, useState } from 'react'
import { getMapMode } from '@/lib/mapConfig'

export default function AdminPage() {
  const [pw, setPw] = useState('')
  const [authed, setAuthed] = useState(false)
  const [err, setErr] = useState('')
  const [mode, setMode] = useState<'vector' | 'raster'>('raster')
  const [hasKey, setHasKey] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const s = sessionStorage.getItem('agomon_admin')
      if (s === '1') setAuthed(true)
      setMode((localStorage.getItem('agomon_map_mode') as any) || (process.env.NEXT_PUBLIC_MAP_MODE as any) || 'raster')
      setHasKey(!!process.env.NEXT_PUBLIC_STADIA_KEY)
    }
  }, [])

  const login = () => {
    if (pw === 'agomon26') {
      sessionStorage.setItem('agomon_admin', '1')
      setAuthed(true)
      setErr('')
    } else setErr('Wrong password')
  }

  const setMapMode = (m: 'vector' | 'raster') => {
    localStorage.setItem('agomon_map_mode', m)
    setMode(m)
    // force reload so PandalMap picks new style
    window.location.reload()
  }

  const logout = () => {
    sessionStorage.removeItem('agomon_admin')
    setAuthed(false)
    setPw('')
  }

  if (!authed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-[#0B1220] border border-[#FFD60A]/10 rounded-2xl p-6 w-full max-w-sm">
          <h1 className="font-bold text-[#FFD60A] mb-1">Admin — Agomon</h1>
          <p className="text-xs text-white/40 mb-4">Enter password to manage map mode</p>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            placeholder="Password"
            className="w-full px-3 py-2.5 rounded-xl bg-[#020617] border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30 focus:border-[#FFD60A]/30"
          />
          {err && <p className="text-xs text-red-400 mt-2">{err}</p>}
          <button onClick={login} className="w-full mt-3 bg-[#FFD60A] text-[#020617] py-2.5 rounded-xl text-sm font-semibold">Login</button>
          <p className="text-[11px] text-white/20 mt-3 text-center">Raster = free OSM PNG (prototyping). Vector = Stadia credits.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-bold text-[#FFD60A]">Admin — Map Mode</h1>
        <button onClick={logout} className="text-xs text-white/50 underline">Logout</button>
      </div>

      <div className="bg-[#0B1220] border border-[#FFD60A]/10 rounded-2xl p-4">
        <p className="text-xs text-white/50 mb-3">Current: <span className="text-[#FFD60A] font-semibold">{mode}</span> {hasKey ? '• Stadia key set' : '• No Stadia key'}</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMapMode('raster')}
            className={`p-4 rounded-xl border text-left ${mode === 'raster' ? 'bg-[#FFD60A] text-[#020617] border-[#FFD60A]' : 'bg-[#020617] text-white/70 border-[#FFD60A]/10'}`}
          >
            <p className="font-semibold text-sm">Raster PNG</p>
            <p className="text-xs opacity-70 mt-1">tile.openstreetmap.org • 0 credits • free for prototyping</p>
            <p className="text-[11px] opacity-50 mt-1">Routing: OSRM red line works</p>
          </button>
          <button
            onClick={() => setMapMode('vector')}
            className={`p-4 rounded-xl border text-left ${mode === 'vector' ? 'bg-[#FFD60A] text-[#020617] border-[#FFD60A]' : 'bg-[#020617] text-white/70 border-[#FFD60A]/10'}`}
          >
            <p className="font-semibold text-sm">Vector</p>
            <p className="text-xs opacity-70 mt-1">Stadia alidade_smooth • 1 credit/tile</p>
            <p className="text-[11px] opacity-50 mt-1">Routing: OSRM red line works</p>
          </button>
        </div>
        <p className="text-[11px] text-white/30 mt-3">Switch takes effect after reload. Raster is default until puja week.</p>
      </div>

      <div className="bg-[#020617] border border-[#FFD60A]/10 rounded-2xl p-4 mt-4">
        <h2 className="text-sm font-semibold text-[#FFD60A]">Credit counter — Stadia</h2>
        <div className="mt-2 text-xs text-white/60 space-y-1">
          <p>Free: <span className="text-white">200,000 credits/mo</span> (no commercial) — you have this now</p>
          <p>Cost: <span className="text-white">1 credit / raster or vector tile</span>, 20 / static map</p>
          <p>Estimate: <span className="text-white">~15 tiles / map view</span> × views = credits</p>
          <p>Example: 10k views ×15 = 150k → <span className="text-emerald-400">free</span>. 20k views = 300k → would need Starter $20</p>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-[#0B1220] border border-[#FFD60A]/5">
          <p className="text-xs text-white/40">Check live usage: <a href="https://client.stadiamaps.com/dashboard/" target="_blank" className="text-[#FFD60A] underline">Stadia Dashboard → Usage</a></p>
          <p className="text-[11px] text-white/30 mt-1">Domain restriction (optional): add `agomon.vercel.app` in Stadia dashboard to lock key — not required for map to work, but secures key.</p>
          <p className="text-[11px] text-white/30 mt-1">Prototyping: keep <span className="text-[#FFD60A]">raster</span> to stay at 0 credits. Switch to <span className="text-[#FFD60A]">vector</span> a week before puja.</p>
        </div>
      </div>

      <p className="text-[11px] text-white/20 mt-4 text-center">In-site red route works on both raster and vector (MapLibre overlay). OSRM `foot &lt;8km / driving &gt;8km` free.</p>
    </div>
  )
}
