'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

type Pandal = { id: string; name: string; slug: string; area: string; image_url: string | null; address?: string | null; latitude?: number | null; longitude?: number | null }

export default function BulkImageManager() {
  const [pandals, setPandals] = useState<Pandal[]>([])
  const [filter, setFilter] = useState<'all' | 'missing'>('missing')
  const [uploading, setUploading] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)

  // search (uses searchEngine — fuzzy + OSM, debounced)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMeta, setSearchMeta] = useState('')
  const [searchAccuracy, setSearchAccuracy] = useState<number | null>(null)
  const [searchResults, setSearchResults] = useState<Pandal[] | null>(null)
  const [searching, setSearching] = useState(false)

  // drag & drop + auto-assign (any filename works)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [pendingBatch, setPendingBatch] = useState<{ key: string; file: File; preview: string; targetId: string | null; targetName?: string }[]>([])
  const [batchUploading, setBatchUploading] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const { data } = await supabase.from('pandals').select('id,name,slug,area,image_url').order('name')
    setPandals((data as Pandal[]) || [])
  }
  useEffect(() => { load() }, [])

  // search engine integration (same as browse)
  useEffect(() => {
    let cancelled = false
    const q = searchQuery.trim()
    if (!q) {
      setSearchResults(null)
      setSearchMeta('')
      setSearchAccuracy(null)
      setSearching(false)
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const { searchEngine } = await import('@/lib/searchEngine')
        const res = await searchEngine(q, pandals as any)
        if (!cancelled) {
          setSearchResults(res.pandals as unknown as Pandal[])
          setSearchMeta(res.meta)
          setSearchAccuracy(res.accuracy ?? null)
        }
      } catch {
        // fallback to simple includes
        const qq = q.toLowerCase()
        const fallback = pandals.filter(p => p.name.toLowerCase().includes(qq) || p.slug.includes(qq) || p.area.toLowerCase().includes(qq))
        if (!cancelled) {
          setSearchResults(fallback)
          setSearchMeta(fallback.length ? `Search: ${q}` : `No match for "${q}"`)
          setSearchAccuracy(null)
        }
      }
      if (!cancelled) setSearching(false)
    }, 320)
    return () => { cancelled = true; clearTimeout(t) }
  }, [searchQuery, pandals])

  const getPandalById = (id: string) => pandals.find(p => p.id === id) || null

  const uploadToPandal = async (pandalId: string, file: File) => {
    const p = pandals.find(x => x.id === pandalId)
    if (!p) throw new Error('Pandal not found')
    setUploading(p.slug)
    setMsg('')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const safeExt = ['jpg','jpeg','png','webp','avif'].includes(ext) ? ext : 'jpg'
      const path = `${p.slug}.${safeExt}`
      const { error: upErr } = await supabase.storage.from('pandal-images').upload(path, file, { upsert: true, contentType: file.type || `image/${safeExt}` })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('pandal-images').getPublicUrl(path)
      const url = pub.publicUrl
      const { error: dbErr } = await supabase.from('pandals').update({ image_url: url }).eq('id', p.id)
      if (dbErr) throw dbErr
      setMsg(`✓ ${p.name} → image updated (any filename auto-assigned as ${path})`)
      setMsgOk(true)
      await load()
    } catch (e: any) {
      setMsg(`✗ ${p.name}: ${e.message} — run supabase/migration_pandal_images_storage.sql first`)
      setMsgOk(false)
      throw e
    } finally {
      setUploading(null)
    }
  }

  const onFileForPandal = async (p: Pandal, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    e.target.value = ''
    try { await uploadToPandal(p.id, f) } catch {}
  }

  // helpers for auto-suggest target from filename (any name works — we suggest closest pandal)
  const suggestPandalForFilename = (fileName: string): Pandal | null => {
    const base = fileName.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    if (!base) return null
    const norm = base.replace(/\s+/g, '')
    // direct slug/name includes
    let best: Pandal | null = null
    let bestScore = -1
    for (const p of pandals) {
      const slugNorm = p.slug.replace(/-/g, '')
      const nameNorm = p.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      let score = 0
      if (slugNorm.includes(norm) || norm.includes(slugNorm)) score = 90 + Math.min(slugNorm.length, norm.length)
      else if (nameNorm.includes(norm) || norm.includes(nameNorm)) score = 80 + Math.min(nameNorm.length, norm.length)
      else if (p.name.toLowerCase().includes(base) || base.includes(p.name.toLowerCase())) score = 70
      if (score > bestScore) { bestScore = score; best = p }
    }
    return bestScore >= 70 ? best : null
  }

  const addFilesToBatch = (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (!imageFiles.length) {
      setMsg('No image files found. Drop JPG/PNG/WEBP.'); setMsgOk(false); return
    }
    // if a pandal is selected, upload directly (auto-assign regardless of filename)
    if (selectedId) {
      (async () => {
        setBatchUploading(true)
        for (const f of imageFiles) {
          try { await uploadToPandal(selectedId, f) } catch {}
        }
        setBatchUploading(false)
      })()
      return
    }
    // otherwise create pending batch with auto-suggestions for manual confirmation
    const items = imageFiles.map(f => {
      const suggested = suggestPandalForFilename(f.name)
      return {
        key: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        file: f,
        preview: URL.createObjectURL(f),
        targetId: suggested?.id || null,
        targetName: suggested?.name,
      }
    })
    setPendingBatch(prev => [...prev, ...items])
  }

  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDragActive(false)
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length) addFilesToBatch(files)
  }
  const handleGlobalDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!dragActive) setDragActive(true) }
  const handleGlobalDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false) }

  const handleRowDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); e.stopPropagation(); setDragOverId(id) }
  const handleRowDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOverId(null) }
  const handleRowDrop = async (e: React.DragEvent, pandalId: string) => {
    e.preventDefault(); e.stopPropagation()
    setDragOverId(null)
    setDragActive(false)
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'))
    if (!files.length) return
    setBatchUploading(true)
    for (const f of files.slice(0, 3)) { // cap 3 per drop to avoid hammering storage
      try { await uploadToPandal(pandalId, f) } catch {}
    }
    setBatchUploading(false)
  }

  const handleBatchFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length) addFilesToBatch(files)
  }

  const confirmBatchUpload = async () => {
    const toUpload = pendingBatch.filter(b => b.targetId)
    if (!toUpload.length) { setMsg('Pick a pandal for each image before uploading.'); setMsgOk(false); return }
    setBatchUploading(true)
    for (const item of toUpload) {
      try { await uploadToPandal(item.targetId!, item.file) } catch {}
    }
    // revoke previews for uploaded
    toUpload.forEach(i => URL.revokeObjectURL(i.preview))
    setPendingBatch(prev => prev.filter(p => !toUpload.find(u => u.key === p.key)))
    setBatchUploading(false)
  }

  const removeBatchItem = (key: string) => {
    const it = pendingBatch.find(b => b.key === key)
    if (it) URL.revokeObjectURL(it.preview)
    setPendingBatch(prev => prev.filter(b => b.key !== key))
  }
  const clearBatch = () => {
    pendingBatch.forEach(b => URL.revokeObjectURL(b.preview))
    setPendingBatch([])
  }

  // derived list: search results if searching, else filter
  const baseList = useMemo(() => {
    if (searchResults !== null) return searchResults
    return filter === 'missing' ? pandals.filter(p => !p.image_url) : pandals
  }, [searchResults, filter, pandals])

  // keep selectedId in sync if pandal disappears
  useEffect(() => {
    if (selectedId && !pandals.find(p => p.id === selectedId)) setSelectedId(null)
  }, [pandals, selectedId])

  const selectedPandal = selectedId ? getPandalById(selectedId) : null

  return (
    <div className="mt-6 bg-[#0B1220] border border-[#FFD60A]/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#FFD60A]">Bulk Image Manager</h2>
        <span className="text-[11px] text-white/30">{pandals.filter(p=>!p.image_url).length} missing • {pandals.filter(p=>p.image_url).length} done • {pandals.length} total</span>
      </div>

      {/* Search pandal — uses searchEngine (fuzzy + OSM areas) */}
      <div className="mb-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFD60A]/40 text-xs">⌕</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pandal for image: e.g. chetla, tollygunge, dum dum, salt lake..."
            className="w-full pl-8 pr-8 py-2.5 rounded-xl bg-[#020617] border border-[#FFD60A]/10 outline-none text-xs md:text-sm text-white placeholder:text-white/30 focus:border-[#FFD60A]/30 transition"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-[#FFD60A] text-xs">✕</button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          {searching && <span className="text-[11px] text-white/30">Searching…</span>}
          {!searching && searchMeta && <span className="text-[11px] text-[#FFD60A]/70">{searchMeta} {searchAccuracy ? <span className="text-white/30">• {searchAccuracy}%</span> : null}</span>}
          {searchResults !== null && <button onClick={() => { setSearchQuery(''); setSearchResults(null) }} className="text-[11px] text-[#FFD60A] underline">Clear</button>}
        </div>
      </div>

      {/* Drag & drop zone — any filename auto-assigns to selected pandal */}
      <div
        ref={dropRef}
        onDragOver={handleGlobalDragOver}
        onDragLeave={handleGlobalDragLeave}
        onDrop={handleGlobalDrop}
        className={`relative rounded-2xl border-2 border-dashed p-4 md:p-5 mb-3 transition-all ${dragActive ? 'border-[#FFD60A] bg-[#FFD60A]/10 scale-[1.01] shadow-[0_0_24px_rgba(255,214,10,0.25)]' : 'border-[#FFD60A]/20 bg-[#020617]/60 hover:border-[#FFD60A]/30 hover:bg-[#020617]'}`}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#FFD60A]/15 border border-[#FFD60A]/20 flex items-center justify-center text-[#FFD60A] text-xs">⬆</span>
              Drag & drop images here
            </p>
            <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
              Any filename works — image is auto-assigned to the selected pandal as <span className="text-white/60 font-mono">slug.jpg</span>. No need to rename. PNG/WebP also ok.
            </p>
            {selectedPandal ? (
              <p className="text-xs text-[#FFD60A] mt-2">Target: <span className="font-semibold">{selectedPandal.name}</span> <span className="text-white/30">({selectedPandal.slug})</span> <button onClick={() => setSelectedId(null)} className="ml-2 text-[11px] underline text-white/50">Clear</button></p>
            ) : (
              <p className="text-[11px] text-white/30 mt-2">Tip: search above, click “Select” on a pandal, then drop. Or drop without selection and assign per-image below.</p>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <label className="px-4 py-2.5 rounded-xl bg-[#FFD60A] text-[#020617] text-xs font-semibold text-center cursor-pointer hover:bg-[#FFE566] transition">
              Choose images
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBatchFileInput} />
            </label>
            <p className="text-[10px] text-white/20 text-center">or drop anywhere</p>
          </div>
        </div>
        {dragActive && (
          <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-[#020617]/80 backdrop-blur-sm pointer-events-none">
            <p className="text-sm font-semibold text-[#FFD60A]">Drop to upload — auto-assigns ✓</p>
          </div>
        )}
        {batchUploading && <p className="text-[11px] text-[#FFD60A] mt-2 animate-pulse">Uploading…</p>}
      </div>

      {/* Pending batch — per-image pandal picker */}
      {pendingBatch.length > 0 && (
        <div className="mb-3 p-3 rounded-xl bg-[#020617] border border-[#FFD60A]/15">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[#FFD60A]">Dropped images — assign pandal</p>
            <div className="flex items-center gap-2">
              <button onClick={clearBatch} className="text-[11px] text-white/40 underline">Clear all</button>
              <button onClick={confirmBatchUpload} disabled={batchUploading || !pendingBatch.some(b=>b.targetId)} className="px-3 py-1.5 rounded-full bg-[#FFD60A] text-[#020617] text-xs font-semibold disabled:opacity-40">Upload {pendingBatch.filter(b=>b.targetId).length}/{pendingBatch.length}</button>
            </div>
          </div>
          <div className="grid gap-2 max-h-[42vh] overflow-y-auto pr-1">
            {pendingBatch.map(item => (
              <div key={item.key} className="flex items-center gap-3 p-2 rounded-xl bg-[#0B1220] border border-[#FFD60A]/10">
                <img src={item.preview} alt={item.file.name} className="w-14 h-14 rounded-lg object-cover border border-[#FFD60A]/10 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate" title={item.file.name}>{item.file.name} <span className="text-white/30">• {(item.file.size/1024).toFixed(0)}KB</span></p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <select
                      value={item.targetId || ''}
                      onChange={(e) => {
                        const v = e.target.value || null
                        setPendingBatch(prev => prev.map(p => p.key === item.key ? { ...p, targetId: v, targetName: v ? pandals.find(x=>x.id===v)?.name : undefined } : p))
                      }}
                      className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-[#020617] border border-[#FFD60A]/15 text-xs text-white outline-none focus:border-[#FFD60A]/30"
                    >
                      <option value="">Select pandal… {item.targetName ? `(suggested: ${item.targetName})` : ''}</option>
                      {pandals.slice(0, 200).map(p => <option key={p.id} value={p.id}>{p.name} — {p.slug}</option>)}
                    </select>
                  </div>
                  <p className="text-[10px] text-white/25 mt-1">Any name → auto-saved as <span className="text-white/40 font-mono">{item.targetId ? `${pandals.find(x=>x.id===item.targetId)?.slug || 'slug'}.jpg` : 'slug.jpg'}</span></p>
                </div>
                <button onClick={() => removeBatchItem(item.key)} className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs hover:text-red-300">✕</button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-white/30 mt-2">Filename is ignored except extension — stored as <span className="text-white/50">pandal slug</span>. Drag onto a row below also works.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <button onClick={()=>setFilter('missing')} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filter==='missing'?'bg-[#FFD60A] text-[#020617] shadow-[0_0_12px_rgba(255,214,10,0.3)]':'bg-[#020617] border border-[#FFD60A]/10 text-white/50 hover:border-[#FFD60A]/20'}`}>Missing only</button>
        <button onClick={()=>setFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filter==='all'?'bg-[#FFD60A] text-[#020617] shadow-[0_0_12px_rgba(255,214,10,0.3)]':'bg-[#020617] border border-[#FFD60A]/10 text-white/50 hover:border-[#FFD60A]/20'}`}>All</button>
        <button onClick={load} className="text-xs text-[#FFD60A] underline ml-auto">Refresh</button>
      </div>
      {msg && <p className={`text-xs mb-2 p-2.5 rounded-xl border ${msgOk ? 'bg-[#020617] border-[#FFD60A]/10 text-white/70' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>{msg}</p>}
      <p className="text-[11px] text-white/20 mb-2">Any filename → auto-mapped to <span className="text-white/40">slug.jpg</span>. Or drag image onto a pandal row to upload instantly.</p>

      <div className="grid gap-2 max-h-[60vh] overflow-y-auto pr-1">
        {baseList.map(p => {
          const isSelected = selectedId === p.id
          const isDragOver = dragOverId === p.id
          return (
          <div
            key={p.id}
            onDragOver={(e)=>handleRowDragOver(e, p.id)}
            onDragLeave={handleRowDragLeave}
            onDrop={(e)=>handleRowDrop(e, p.id)}
            className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${isDragOver ? 'bg-[#FFD60A]/10 border-[#FFD60A] scale-[1.01] shadow-[0_0_16px_rgba(255,214,10,0.2)]' : isSelected ? 'bg-[#FFD60A]/10 border-[#FFD60A]/40' : 'bg-[#020617] border-[#FFD60A]/5 hover:border-[#FFD60A]/15'}`}
          >
            <div className="w-12 h-12 rounded-lg bg-[#0B1220] border border-[#FFD60A]/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-[10px] text-white/20">No img</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{p.name}</p>
              <p className="text-[11px] text-white/30 truncate">{p.slug} • {p.area}</p>
              {p.image_url && <a href={p.image_url} target="_blank" className="text-[10px] text-[#FFD60A]/60 truncate underline">View</a>}
              {isDragOver && <p className="text-[11px] text-[#FFD60A] font-medium">Drop image here → auto-assign</p>}
            </div>
            <div className="flex flex-col gap-1.5 items-end shrink-0">
              <button
                onClick={() => setSelectedId(isSelected ? null : p.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${isSelected ? 'bg-[#FFD60A] text-[#020617] border-[#FFD60A]' : 'bg-[#0B1220] border-[#FFD60A]/15 text-[#FFD60A]/70 hover:border-[#FFD60A]/30'}`}
                title="Select as drop target for any filename"
              >
                {isSelected ? '✓ Selected' : 'Select'}
              </button>
              <label className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer text-center ${uploading===p.slug?'opacity-50 pointer-events-none':''} bg-[#FFD60A] text-[#020617] hover:bg-[#FFE566] transition`}>
                {uploading===p.slug ? 'Uploading...' : p.image_url ? 'Replace' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" onChange={(e)=>onFileForPandal(p,e)} disabled={uploading===p.slug} />
              </label>
            </div>
          </div>
        )})}
        {baseList.length===0 && <p className="text-xs text-white/30 text-center py-6">{searchQuery ? `No pandals match “${searchQuery}”` : 'All pandals have images ✓'}</p>}
      </div>
      <div className="mt-3 p-3 rounded-xl bg-[#020617] border border-[#FFD60A]/5">
        <p className="text-[11px] text-white/40">Storage: public bucket <span className="text-white">pandal-images</span> • First run <span className="text-white">supabase/migration_pandal_images_storage.sql</span> to create bucket. Any filename now works — we save as slug + original ext.</p>
      </div>
    </div>
  )
}
