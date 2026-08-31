'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Pandal = { id: string; name: string; slug: string; area: string; image_url: string | null }

export default function BulkImageManager() {
  const [pandals, setPandals] = useState<Pandal[]>([])
  const [filter, setFilter] = useState<'all' | 'missing'>('missing')
  const [uploading, setUploading] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const { data } = await supabase.from('pandals').select('id,name,slug,area,image_url').order('name')
    setPandals((data as Pandal[]) || [])
  }
  useEffect(() => { load() }, [])

  const upload = async (p: Pandal, file: File) => {
    setUploading(p.slug)
    setMsg('')
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${p.slug}.${ext}`
      const { error: upErr } = await supabase.storage.from('pandal-images').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('pandal-images').getPublicUrl(path)
      const url = pub.publicUrl
      const { error: dbErr } = await supabase.from('pandals').update({ image_url: url }).eq('id', p.id)
      if (dbErr) throw dbErr
      setMsg(`✓ ${p.name} updated`)
      load()
    } catch (e: any) {
      setMsg(`✗ ${p.name}: ${e.message} — run supabase/migration_pandal_images_storage.sql first`)
    }
    setUploading(null)
  }

  const onFile = (p: Pandal, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) upload(p, f)
  }

  const list = filter === 'missing' ? pandals.filter(p => !p.image_url) : pandals

  return (
    <div className="mt-6 bg-[#0B1220] border border-[#FFD60A]/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#FFD60A]">Bulk Image Manager</h2>
        <span className="text-[11px] text-white/30">{pandals.filter(p=>!p.image_url).length} missing • {pandals.filter(p=>p.image_url).length} done</span>
      </div>
      <div className="flex gap-2 mb-3">
        <button onClick={()=>setFilter('missing')} className={`px-3 py-1.5 rounded-full text-xs ${filter==='missing'?'bg-[#FFD60A] text-[#020617]':'bg-[#020617] border border-[#FFD60A]/10 text-white/50'}`}>Missing only</button>
        <button onClick={()=>setFilter('all')} className={`px-3 py-1.5 rounded-full text-xs ${filter==='all'?'bg-[#FFD60A] text-[#020617]':'bg-[#020617] border border-[#FFD60A]/10 text-white/50'}`}>All 50</button>
        <button onClick={load} className="ml-auto text-xs text-[#FFD60A] underline">Refresh</button>
      </div>
      {msg && <p className="text-xs mb-2 p-2 rounded bg-[#020617] border border-[#FFD60A]/10 text-white/70">{msg}</p>}
      <p className="text-[11px] text-white/20 mb-2">Tip: Name files as <span className="text-white/40">slug.jpg</span> (e.g., `chetla-agrani.jpg`) and upload — auto-maps to pandal. Or paste URL below.</p>
      <div className="grid gap-2 max-h-[60vh] overflow-y-auto pr-1">
        {list.map(p => (
          <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#020617] border border-[#FFD60A]/5">
            <div className="w-12 h-12 rounded-lg bg-[#0B1220] border border-[#FFD60A]/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-[10px] text-white/20">No img</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{p.name}</p>
              <p className="text-[11px] text-white/30 truncate">{p.slug} • {p.area}</p>
              {p.image_url && <a href={p.image_url} target="_blank" className="text-[10px] text-[#FFD60A]/60 truncate underline">View</a>}
            </div>
            <label className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${uploading===p.slug?'opacity-50':''} bg-[#FFD60A] text-[#020617]`}>
              {uploading===p.slug ? 'Uploading...' : p.image_url ? 'Replace' : 'Upload'}
              <input type="file" accept="image/*" className="hidden" onChange={(e)=>onFile(p,e)} disabled={uploading===p.slug} />
            </label>
          </div>
        ))}
        {list.length===0 && <p className="text-xs text-white/30 text-center py-6">All pandals have images ✓</p>}
      </div>
      <div className="mt-3 p-3 rounded-xl bg-[#020617] border border-[#FFD60A]/5">
        <p className="text-[11px] text-white/40">First run in Supabase SQL Editor: <span className="text-white">supabase/migration_pandal_images_storage.sql</span> to create public bucket `pandal-images`.</p>
      </div>
    </div>
  )
}
