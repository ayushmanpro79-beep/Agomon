'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export const PANDAL_AREAS = [
  'North Kolkata',
  'Dumdum',
  'South Kolkata',
  'West Kolkata & Behala',
  'Central Kolkata',
  'Salt Lake & Rajarhat',
] as const

type PandalRow = {
  id: string
  name: string
  slug: string
  area: string
  address: string | null
  latitude: number | null
  longitude: number | null
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'pandal'
}

// Map Nominatim display_name -> pandal area enum (admin can still correct via dropdown)
function inferArea(displayName: string, lat: number, lon: number): string {
  const s = (displayName || '').toLowerCase()
  const has = (...keys: string[]) => keys.some((k) => s.includes(k))
  if (has('dum dum', 'nagerbazar', 'noapara', 'baranagar', 'dakshineswar', 'sinthee', 'belgharia')) return 'Dumdum'
  if (has('salt lake', 'bidhan nagar', 'new town', 'rajarhat', 'action area', 'sector v', 'karunamoyee')) return 'Salt Lake & Rajarhat'
  if (has('behala', 'barisha', 'sarsuna', 'kidderpore', 'khidderpore', 'metiabruz', 'garden reach', 'taratal')) return 'West Kolkata & Behala'
  if (has('sealdah', 'entally', 'bowbazar', 'college street', 'burrabazar', 'chandni chowk', 'central kolkata', 'moulali')) return 'Central Kolkata'
  if (has('tollygunge', 'garia', 'jadavpur', 'santoshpur', 'ballygunge', 'kasba', 'alipore', 'alipur', 'chetla', 'bhawanipore', 'bhowanipore', 'kalighat', 'golpark', 'dhakuria', 'naktala', 'baghajatin', 'patuli', 'rajdanga', 'bosepukur', 'netaji nagar', 'ranikuthi', 'peyrarabagan', 'santoshpur')) return 'South Kolkata'
  if (has('shyambazar', 'hatibagan', 'belgachia', 'ultadanga', 'kankurgachi', 'maniktala', 'girish park', 'sovabazar', 'ahiritola', 'chorebagan', 'jorasanko', 'tala', 'kashi bose', 'nalin sarkar', 'jagat mukherjee')) return 'North Kolkata'
  // Fallback: rough lat/lon boxes around Kolkata
  if (lon >= 88.4) return 'Salt Lake & Rajarhat'
  if (lat >= 22.62) return 'Dumdum'
  if (lat >= 22.585) return 'North Kolkata'
  if (lat <= 22.52 && lon <= 88.36) return 'West Kolkata & Behala'
  if (lat >= 22.55 && lat <= 22.585 && lon <= 88.37) return 'Central Kolkata'
  return 'South Kolkata'
}

async function reverseGeocode(lat: number, lon: number): Promise<{ display_name: string; area: string } | null> {
  // OSM Nominatim reverse — 1 req/sec policy, called on demand only
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=16&addressdetails=1`
  const res = await fetch(url, { headers: { Accept: 'application/json', 'Accept-Language': 'en' } })
  if (!res.ok) throw new Error(`Reverse geocode failed (${res.status})`)
  const j = await res.json()
  if (!j || !j.display_name) return null
  return { display_name: j.display_name as string, area: inferArea(j.display_name as string, lat, lon) }
}

async function uniqueSlug(base: string) {
  let slug = base
  let n = 2
  for (;;) {
    const { data } = await supabase.from('pandals').select('id').eq('slug', slug).limit(1)
    if (!data || data.length === 0) return slug
    slug = `${base}-${n++}`
    if (n > 50) return `${base}-${Date.now().toString(36)}`
  }
}

const KOL_BOX = { latMin: 22.3, latMax: 22.8, lonMin: 88.2, lonMax: 88.6 }

export default function PandalManager() {
  const [pandals, setPandals] = useState<PandalRow[]>([])
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [area, setArea] = useState<string>('South Kolkata')
  const [areaAuto, setAreaAuto] = useState(true)
  const [address, setAddress] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edit, setEdit] = useState({ name: '', area: '', address: '', latitude: '', longitude: '' })
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    const { data, error } = await supabase
      .from('pandals')
      .select('id,name,slug,area,address,latitude,longitude')
      .order('name')
    if (!error) setPandals((data as PandalRow[]) || [])
  }
  useEffect(() => { load() }, [])

  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pandals
    return pandals.filter((p) => p.name.toLowerCase().includes(q) || p.slug.includes(q) || p.area.toLowerCase().includes(q))
  }, [pandals, search])

  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)
  const outOfKol = lat !== '' && lng !== '' && !Number.isNaN(latNum) && !Number.isNaN(lngNum) &&
    (latNum < KOL_BOX.latMin || latNum > KOL_BOX.latMax || lngNum < KOL_BOX.lonMin || lngNum > KOL_BOX.lonMax)

  const lookup = async () => {
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      setMsg('Enter valid latitude & longitude first.'); setMsgOk(false); return
    }
    setLookingUp(true); setMsg('')
    try {
      const r = await reverseGeocode(latNum, lngNum)
      if (!r) { setMsg('No address found for these coordinates — pick area manually.'); setMsgOk(false); return }
      setAddress(r.display_name)
      if (areaAuto) setArea(r.area)
      setMsg(`Found: ${r.display_name.slice(0, 90)}… → ${r.area}`); setMsgOk(true)
    } catch (e: any) {
      setMsg(`Lookup failed: ${e.message} — pick area manually.`); setMsgOk(false)
    }
    setLookingUp(false)
  }

  const submit = async () => {
    setMsg('')
    const cleanName = name.trim()
    if (cleanName.length < 3) { setMsg('Pandal name needs at least 3 characters.'); setMsgOk(false); return }
    if (Number.isNaN(latNum) || latNum < -90 || latNum > 90) { setMsg('Latitude must be between -90 and 90.'); setMsgOk(false); return }
    if (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180) { setMsg('Longitude must be between -180 and 180.'); setMsgOk(false); return }
    if (!PANDAL_AREAS.includes(area as any)) { setMsg('Pick a valid area.'); setMsgOk(false); return }
    setSaving(true)
    try {
      // best-effort address/area if admin skipped lookup
      let finalAddress = address.trim() || null
      let finalArea = area
      if (!finalAddress) {
        try {
          const r = await reverseGeocode(latNum, lngNum)
          if (r) { finalAddress = r.display_name; if (areaAuto) finalArea = r.area }
        } catch { /* keep manual values */ }
      }
      const slug = await uniqueSlug(slugify(cleanName))
      const { data, error } = await supabase.from('pandals').insert({
        name: cleanName, slug, area: finalArea, address: finalAddress,
        latitude: latNum, longitude: lngNum, verified: true,
      }).select('slug').single()
      if (error) throw error
      setMsgOk(true)
      setMsg(`✓ Added “${cleanName}” → /pandal/${(data as any)?.slug || slug} — live on browse/map now (sitemap refreshes hourly).`)
      setName(''); setLat(''); setLng(''); setAddress(''); setAreaAuto(true)
      load()
    } catch (e: any) {
      setMsgOk(false)
      setMsg(`✗ ${e.message} — if this mentions RLS/delete policy, run supabase/migration_admin_pandal_crud.sql`)
    }
    setSaving(false)
  }

  const startEdit = (p: PandalRow) => {
    setEditingId(p.id)
    setEdit({ name: p.name, area: p.area, address: p.address || '', latitude: p.latitude?.toString() || '', longitude: p.longitude?.toString() || '' })
  }

  const saveEdit = async (p: PandalRow) => {
    const la = parseFloat(edit.latitude), lo = parseFloat(edit.longitude)
    if (edit.name.trim().length < 3) { setMsg('Name needs at least 3 characters.'); setMsgOk(false); return }
    if (Number.isNaN(la) || Number.isNaN(lo)) { setMsg('Edit needs valid latitude & longitude.'); setMsgOk(false); return }
    setBusyId(p.id)
    try {
      const { error } = await supabase.from('pandals').update({
        name: edit.name.trim(), area: edit.area, address: edit.address.trim() || null, latitude: la, longitude: lo,
      }).eq('id', p.id)
      if (error) throw error
      setEditingId(null); setMsg(`✓ Updated “${edit.name.trim()}”.`); setMsgOk(true); load()
    } catch (e: any) { setMsg(`✗ ${e.message}`); setMsgOk(false) }
    setBusyId(null)
  }

  const remove = async (p: PandalRow) => {
    if (!confirm(`Delete “${p.name}” (${p.slug})? This removes it from the website.`)) return
    setBusyId(p.id)
    try {
      const { error } = await supabase.from('pandals').delete().eq('id', p.id)
      if (error) throw error
      setMsg(`✓ Deleted “${p.name}”.`); setMsgOk(true); load()
    } catch (e: any) {
      setMsgOk(false)
      setMsg(`✗ ${e.message} — run supabase/migration_admin_pandal_crud.sql to add the delete policy.`)
    }
    setBusyId(null)
  }

  return (
    <div className="mt-6 bg-[#0B1220] border border-[#FFD60A]/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-[#FFD60A]">Pandal Manager — add / edit / delete</h2>
        <span className="text-[11px] text-white/30">{pandals.length} pandals</span>
      </div>
      <p className="text-[11px] text-white/30 mb-3">New rows go live on browse + map instantly, pandal page + sitemap within ~1h (ISR).</p>

      {/* Add form */}
      <div className="p-3 rounded-xl bg-[#020617] border border-[#FFD60A]/5 space-y-2.5">
        <div>
          <label className="text-[11px] text-white/40">Pandal name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chetla Agrani"
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#0B1220] border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30 focus:border-[#FFD60A]/30" />
          {name.trim() && <p className="text-[11px] text-white/30 mt-1">slug preview: <span className="text-white/60">{slugify(name.trim())}</span></p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-white/40">Latitude *</label>
            <input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" placeholder="22.5012"
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#0B1220] border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30 focus:border-[#FFD60A]/30" />
          </div>
          <div>
            <label className="text-[11px] text-white/40">Longitude *</label>
            <input value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" placeholder="88.3412"
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#0B1220] border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30 focus:border-[#FFD60A]/30" />
          </div>
        </div>
        {outOfKol && <p className="text-[11px] text-amber-300/80">Outside Kolkata box (22.3–22.8, 88.2–88.6) — double-check coords.</p>}
        <div className="flex items-center gap-2">
          <button onClick={lookup} disabled={lookingUp}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#0B1220] border border-[#FFD60A]/20 text-[#FFD60A] disabled:opacity-50">
            {lookingUp ? 'Looking up…' : 'Lookup address + area from lat/lng'}
          </button>
          <label className="text-[11px] text-white/40 flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={areaAuto} onChange={(e) => setAreaAuto(e.target.checked)} className="accent-[#FFD60A]" />
            auto-set area
          </label>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <div>
            <label className="text-[11px] text-white/40">Area * {areaAuto ? <span className="text-white/25">(auto from coords, editable)</span> : null}</label>
            <select value={area} onChange={(e) => setArea(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#0B1220] border border-[#FFD60A]/10 outline-none text-sm text-white focus:border-[#FFD60A]/30">
              {PANDAL_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-white/40">Address (auto from lookup, editable)</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Auto-filled on lookup — or type manually"
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#0B1220] border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30 focus:border-[#FFD60A]/30" />
          </div>
        </div>
        <button onClick={submit} disabled={saving}
          className="w-full bg-[#FFD60A] text-[#020617] py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
          {saving ? 'Adding…' : 'Add pandal'}
        </button>
      </div>

      {msg && <p className={`text-xs mt-2 p-2 rounded bg-[#020617] border border-[#FFD60A]/10 ${msgOk ? 'text-white/70' : 'text-red-300'}`}>{msg}</p>}

      {/* Existing list */}
      <div className="flex items-center gap-2 mt-4 mb-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pandals to edit…"
          className="flex-1 px-3 py-2 rounded-xl bg-[#020617] border border-[#FFD60A]/10 outline-none text-xs text-white placeholder:text-white/30 focus:border-[#FFD60A]/30" />
        <button onClick={load} className="text-xs text-[#FFD60A] underline shrink-0">Refresh</button>
      </div>
      <div className="grid gap-2 max-h-[60vh] overflow-y-auto pr-1">
        {list.map((p) => (
          <div key={p.id} className="p-2.5 rounded-xl bg-[#020617] border border-[#FFD60A]/5">
            {editingId === p.id ? (
              <div className="space-y-2">
                <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B1220] border border-[#FFD60A]/10 text-sm text-white outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={edit.latitude} onChange={(e) => setEdit({ ...edit, latitude: e.target.value })} placeholder="lat"
                    className="px-3 py-2 rounded-xl bg-[#0B1220] border border-[#FFD60A]/10 text-xs text-white outline-none" />
                  <input value={edit.longitude} onChange={(e) => setEdit({ ...edit, longitude: e.target.value })} placeholder="lng"
                    className="px-3 py-2 rounded-xl bg-[#0B1220] border border-[#FFD60A]/10 text-xs text-white outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={edit.area} onChange={(e) => setEdit({ ...edit, area: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-[#0B1220] border border-[#FFD60A]/10 text-xs text-white outline-none">
                    {PANDAL_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <input value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} placeholder="address"
                    className="px-3 py-2 rounded-xl bg-[#0B1220] border border-[#FFD60A]/10 text-xs text-white outline-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(p)} disabled={busyId === p.id}
                    className="flex-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#FFD60A] text-[#020617] disabled:opacity-50">
                    {busyId === p.id ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-full text-xs bg-[#0B1220] border border-[#FFD60A]/10 text-white/50">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{p.name}</p>
                  <p className="text-[11px] text-white/30 truncate">{p.slug} • {p.area} • {p.latitude ?? '—'}, {p.longitude ?? '—'}</p>
                </div>
                <button onClick={() => startEdit(p)} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#0B1220] border border-[#FFD60A]/20 text-[#FFD60A]">Edit</button>
                <button onClick={() => remove(p)} disabled={busyId === p.id}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-300 disabled:opacity-50">Del</button>
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && <p className="text-xs text-white/30 text-center py-6">No pandals match.</p>}
      </div>
      <div className="mt-3 p-3 rounded-xl bg-[#020617] border border-[#FFD60A]/5">
        <p className="text-[11px] text-white/40">Delete needs one-time SQL: <span className="text-white">supabase/migration_admin_pandal_crud.sql</span> in Supabase SQL Editor.</p>
      </div>
    </div>
  )
}
