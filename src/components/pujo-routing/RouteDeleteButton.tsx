'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function RouteDeleteButton({ routeId, ownerId }: { routeId: string; ownerId: string }) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    const ok = window.confirm('Delete this route? This cannot be undone.')
    if (!ok) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('puja_routes').delete().eq('id', routeId).eq('user_id', ownerId)
      if (error) throw error
      router.push('/pujo-routing')
      router.refresh()
    } catch (e: any) {
      alert(e.message || 'Failed to delete')
      setDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center gap-1.5 text-xs bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/15 px-3 py-2 rounded-full transition pc-btn disabled:opacity-50"
    >
      <span aria-hidden>🗑️</span> {deleting ? 'Deleting…' : 'Delete route'}
    </button>
  )
}
