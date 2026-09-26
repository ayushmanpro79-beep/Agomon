'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

type Review = {
  id: string
  pandal_id: string
  user_id: string
  username: string
  rating: number
  comment: string
  created_at: string
}

export default function ReviewSection({ pandalId }: { pandalId: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('reviews').select('*').eq('pandal_id', pandalId).order('created_at', { ascending: false })
    setReviews((data as Review[]) || [])
  }

  useEffect(() => {
    load()
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', data.user.id).single()
        setUsername(profile?.username || data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'User')
      }
    })
  }, [pandalId])

  const submit = async () => {
    setErr(''); setMsg('')
    if (!user) { setErr('Login to post review'); return }
    if (!comment.trim()) { setErr('Write a comment'); return }
    setLoading(true)
    const { error } = await supabase.from('reviews').insert({
      pandal_id: pandalId,
      user_id: user.id,
      username: username || user.email,
      rating,
      comment: comment.trim()
    })
    setLoading(false)
    if (error) { setErr(error.message); return }
    setComment('')
    setMsg('Review posted!')
    load()
  }

  return (
    <div className="mt-6 glass rounded-2xl p-4">
      <h3 className="font-semibold text-sm text-[#FFD60A] mb-3">Reviews • {reviews.length}</h3>

      {user ? (
        <div className="mb-4 p-3 rounded-xl glass border border-[#FFD60A]/10">
          <p className="text-xs text-white/50 mb-2">Posting as <span className="text-[#FFD60A]">{username || user.email}</span></p>
          <div className="flex items-center gap-0.5 mb-2" role="radiogroup" aria-label="Your rating">
            {[1,2,3,4,5].map((s) => (
              <button key={s} onClick={() => setRating(s)} aria-label={`${s} star`} className={`h-11 w-11 -m-0.5 rounded-full text-xl transition active:scale-90 ${s <= rating ? 'text-[#FFD60A]' : 'text-white/20 hover:text-white/40'}`}>★</button>
            ))}
            <span className="text-xs text-white/40 ml-2 tabular">{rating} / 5</span>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write your experience for this pandal..."
            rows={3}
            className="input-minimal px-3.5 py-3 text-sm"
          />
          {err && <p className="text-xs text-red-400 mt-2">{err}</p>}
          {msg && <p className="text-xs text-emerald-400 mt-2">{msg}</p>}
          <button onClick={submit} disabled={loading} className={`btn-primary mt-2 px-5 py-2.5 text-xs min-h-[44px] disabled:opacity-50 ${loading ? 'btn-busy' : ''}`}>
            {loading ? 'Posting' : 'Post review'}
          </button>
        </div>
      ) : (
        <div className="mb-4 p-3 rounded-xl glass border border-[#FFD60A]/10 text-center">
          <p className="text-xs text-white/50"><Link href="/login" className="text-[#FFD60A] underline">Login</Link> with Gmail to post a review</p>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {reviews.map((r) => (
          <div key={r.id} className="p-3 rounded-xl glass border border-[#FFD60A]/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#FFD60A]">{r.username}</span>
              <span className="text-xs text-[#FFD60A]">{'★'.repeat(r.rating)}<span className="text-white/20">{'★'.repeat(5 - r.rating)}</span></span>
            </div>
            <p className="text-sm text-white/80 mt-1">{r.comment}</p>
            <p className="text-[11px] text-white/20 mt-1">{new Date(r.created_at).toLocaleString()}</p>
          </div>
        ))}
        {reviews.length === 0 && <p className="text-xs text-white/30 text-center py-4">No reviews yet — be the first!</p>}
      </div>
    </div>
  )
}
