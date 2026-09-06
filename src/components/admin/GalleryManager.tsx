'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type GalleryRow = {
  id: string
  title: string
  label: string | null
  details: string | null
  image_url: string
  display_order: number
  is_active: boolean
  created_at: string
}

export default function GalleryManager() {
  const [rows, setRows] = useState<GalleryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [label, setLabel] = useState('')
  const [details, setDetails] = useState('')
  const [order, setOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('gallery_images').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: false })
    if (error) {
      if (error.message.includes('gallery_images') || error.message.includes('does not exist')) {
        setErr('Table gallery_images not found — run supabase/migration_gallery.sql in Supabase SQL Editor')
      } else setErr(error.message)
      setRows([])
    } else setRows((data as any) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  const resetForm = () => {
    setTitle('')
    setLabel('')
    setDetails('')
    setOrder(rows.length)
    setIsActive(true)
    setFile(null)
    setEditingId(null)
  }

  const handleSubmit = async () => {
    setErr(null)
    setMsg(null)
    if (!title.trim() || title.trim().length < 3) {
      setErr('Title 3-80 chars required')
      return
    }
    if (!editingId && !file) {
      setErr('Select an image to upload')
      return
    }
    if (!user) {
      setErr('Login via /login required (authenticated) to upload — storage policy requires authenticated')
      return
    }
    setUploading(true)
    try {
      let imageUrl: string | null = null

      if (file) {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext) ? ext : 'jpg'
        const path = `gallery/${Date.now()}-${title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .slice(0, 30)}.${safeExt}`
        const { error: upErr } = await supabase.storage.from('gallery-images').upload(path, file, { upsert: false, contentType: file.type || `image/${safeExt}` })
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('gallery-images').getPublicUrl(path)
        imageUrl = pub.publicUrl
      }

      if (editingId) {
        const patch: any = {
          title: title.trim(),
          label: label.trim() || null,
          details: details.trim() || null,
          display_order: order,
          is_active: isActive,
        }
        if (imageUrl) patch.image_url = imageUrl
        const { error } = await supabase.from('gallery_images').update(patch).eq('id', editingId)
        if (error) throw error
        setMsg('✓ Gallery item updated')
      } else {
        const { error } = await supabase.from('gallery_images').insert({
          title: title.trim(),
          label: label.trim() || null,
          details: details.trim() || null,
          image_url: imageUrl!,
          display_order: order,
          is_active: isActive,
          created_by: user.id,
        })
        if (error) throw error
        setMsg('✓ Poster added — visible in welcome gallery')
      }
      resetForm()
      load()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setUploading(false)
    }
  }

  const startEdit = (r: GalleryRow) => {
    setEditingId(r.id)
    setTitle(r.title)
    setLabel(r.label || '')
    setDetails(r.details || '')
    setOrder(r.display_order)
    setIsActive(r.is_active)
    setFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string, imageUrl: string) => {
    if (!window.confirm('Delete this poster?')) return
    try {
      const { error } = await supabase.from('gallery_images').delete().eq('id', id)
      if (error) throw error
      // try to remove from storage (best effort)
      try {
        const url = new URL(imageUrl)
        const idx = url.pathname.indexOf('/gallery-images/')
        if (idx !== -1) {
          const path = url.pathname.slice(idx + '/gallery-images/'.length)
          await supabase.storage.from('gallery-images').remove([path])
        }
      } catch {}
      setRows((prev) => prev.filter((x) => x.id !== id))
      setMsg('Deleted')
    } catch (e: any) {
      setErr(e.message)
    }
  }

  const moveOrder = async (r: GalleryRow, dir: -1 | 1) => {
    const sorted = [...rows].sort((a, b) => a.display_order - b.display_order)
    const idx = sorted.findIndex((x) => x.id === r.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const a = sorted[idx]
    const b = sorted[swapIdx]
    // swap display_order
    await supabase.from('gallery_images').update({ display_order: b.display_order }).eq('id', a.id)
    await supabase.from('gallery_images').update({ display_order: a.display_order }).eq('id', b.id)
    load()
  }

  return (
    <div className="bg-[#0B1220] border border-[#FFD60A]/10 rounded-2xl p-4 mt-6">
      <h2 className="text-sm font-bold text-[#FFD60A]">Gallery Manager — Welcome Posters</h2>
      <p className="text-xs text-white/40 mt-1">Upload posters/pictures for the welcome DepthCarousel. Tap in gallery → expands with label + details.</p>
      {!user && <p className="text-[11px] text-amber-300/80 mt-2">Login via /login required — gallery bucket needs authenticated upload.</p>}

      <div className="mt-4 p-3 rounded-2xl bg-[#020617]/60 border border-[#FFD60A]/10 space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/60">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Maa Aschen • Garia Pandal 2026" maxLength={80} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#020617] border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30" />
          </div>
          <div>
            <label className="text-xs text-white/60">Label (badge)</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Poster • Behala" className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#020617] border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30" />
          </div>
        </div>

        <div>
          <label className="text-xs text-white/60">Details (shown in expanded view)</label>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Artist, theme, timing, story..." rows={2} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#020617] border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30 resize-none" />
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-white/60">Display order</label>
            <input type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value) || 0)} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#020617] border border-[#FFD60A]/10 outline-none text-sm text-white" />
          </div>
          <label className="flex items-center gap-2 text-sm text-white/70 mt-6">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-[#FFD60A]" /> Active (visible)
          </label>
          <div>
            <label className="text-xs text-white/60">Image {editingId ? '(leave empty to keep)' : '*'}</label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full mt-1 text-xs text-white/60 file:mr-3 file:px-3 file:py-2 file:rounded-full file:border-0 file:bg-[#FFD60A] file:text-[#020617] file:text-xs file:font-semibold" />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSubmit} disabled={uploading} className="flex-1 bg-[#FFD60A] disabled:opacity-50 text-[#020617] py-2.5 rounded-xl text-sm font-semibold">
            {uploading ? 'Uploading…' : editingId ? 'Update Poster' : 'Add Poster'}
          </button>
          {editingId && (
            <button onClick={resetForm} className="px-4 py-2.5 rounded-xl bg-[#0B1220] border border-[#FFD60A]/20 text-[#FFD60A] text-sm">
              Cancel
            </button>
          )}
        </div>

        {err && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">{err}</p>}
        {msg && <p className="text-xs text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-3 py-2">{msg}</p>}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-white/70">Existing Posters ({rows.length})</h3>
        <button onClick={load} disabled={loading} className="text-xs glass border border-[#FFD60A]/15 text-[#FFD60A] px-3 py-1.5 rounded-full pc-btn disabled:opacity-50">
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-white/30 mt-3 text-center py-6">No posters yet — add one above. Public gallery will show “No Posters available”.</p>
      ) : (
        <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto">
          {rows.map((r) => (
            <div key={r.id} className="flex gap-3 p-2.5 rounded-xl bg-[#020617] border border-[#FFD60A]/10">
              <img src={r.image_url} alt={r.title} className="w-16 h-20 object-cover rounded-lg border border-[#FFD60A]/10 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{r.title}</p>
                <p className="text-[11px] text-[#FFD60A]/70 truncate">{r.label || '—'}</p>
                <p className="text-[11px] text-white/30 line-clamp-1">{r.details || 'No details'}</p>
                <p className="text-[10px] text-white/20">Order {r.display_order} • {r.is_active ? 'Active' : 'Hidden'} • {new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={() => startEdit(r)} className="text-xs bg-[#FFD60A]/10 border border-[#FFD60A]/20 text-[#FFD60A] px-2.5 py-1 rounded-full hover:bg-[#FFD60A]/15">Edit</button>
                <button onClick={() => handleDelete(r.id, r.image_url)} className="text-xs bg-red-500/10 border border-red-500/20 text-red-300 px-2.5 py-1 rounded-full hover:bg-red-500/15">Delete</button>
                <div className="flex gap-1">
                  <button onClick={() => moveOrder(r, -1)} className="text-[10px] bg-[#0B1220] border border-white/10 text-white/60 px-1.5 py-0.5 rounded-full">↑</button>
                  <button onClick={() => moveOrder(r, 1)} className="text-[10px] bg-[#0B1220] border border-white/10 text-white/60 px-1.5 py-0.5 rounded-full">↓</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
