'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

type RouteRow = {
  id: string
  title: string
  description: string | null
  username: string | null
  ordered_slugs: string[] | null
  distance_m: number | null
  duration_s: number | null
  is_public: boolean | null
  created_at: string
  user_id: string | null
}

function formatRouteTitle(r: RouteRow): string {
  // Prefer stored title if it already matches start → +n → end pattern, else synthesize from slugs
  if (r.title && r.title.includes('→')) return r.title
  const slugs = r.ordered_slugs || []
  if (slugs.length === 0) return r.title || 'Untitled route'
  // beautify slug: "sreebhumi-sporting-club" → "Sreebhumi Sporting Club"
  const beautify = (s: string) =>
    s
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  if (slugs.length === 1) return beautify(slugs[0])
  if (slugs.length === 2) return `${beautify(slugs[0])} → ${beautify(slugs[1])}`
  const start = beautify(slugs[0])
  const last = beautify(slugs[slugs.length - 1])
  const n = slugs.length - 2
  return `${start} → +${n} → ${last}`
}

export default function PujoRoutingFeedClient() {
  const [user, setUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [tab, setTab] = useState<'private' | 'public'>('private') // default private as requested
  const [routes, setRoutes] = useState<RouteRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      setUser(data.user ?? null)
      setAuthChecked(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const fetchRoutes = useCallback(
    async (targetTab: 'private' | 'public', currentUser: any) => {
      setLoading(true)
      setError(null)
      try {
        if (targetTab === 'public') {
          const { data, error: err } = await supabase
            .from('puja_routes')
            .select('id,title,description,username,ordered_slugs,distance_m,duration_s,is_public,created_at,user_id')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(24)
          if (err) throw err
          setRoutes((data as RouteRow[]) || [])
        } else {
          // private tab: default view — only private routes of current user
          if (!currentUser) {
            setRoutes([])
            setLoading(false)
            return
          }
          const { data, error: err } = await supabase
            .from('puja_routes')
            .select('id,title,description,username,ordered_slugs,distance_m,duration_s,is_public,created_at,user_id')
            .eq('user_id', currentUser.id)
            .eq('is_public', false)
            .order('created_at', { ascending: false })
            .limit(24)
          if (err) throw err
          setRoutes((data as RouteRow[]) || [])
        }
      } catch (e: any) {
        // table missing or RLS block — graceful empty
        if (e.message?.includes('puja_routes') || e.message?.includes('does not exist')) {
          setError('Table puja_routes not yet migrated — run SQL in Supabase dashboard. Creator still works locally.')
          setRoutes([])
        } else {
          setError(e.message || 'Failed to load routes')
          setRoutes([])
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // initial + when tab or user changes
  useEffect(() => {
    if (!authChecked) return
    fetchRoutes(tab, user)
  }, [tab, user, authChecked, fetchRoutes])

  const handleReload = () => fetchRoutes(tab, user)
  const handleToggle = (checked: boolean) => {
    setTab(checked ? 'public' : 'private')
  }

  const isPrivate = tab === 'private'
  const isPublic = tab === 'public'

  // create button logic: non-login sees Login, login sees Create
  const createHref = user ? '/pujo-routing/create' : '/login'
  const createLabel = user ? 'Create your route' : 'Login to create route'

  return (
    <>
      {/* Toggle + Reload row */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold transition ${isPrivate ? 'text-[#FFD60A]' : 'text-white/40'}`}>Private</span>
          <input type="checkbox" id="checkboxInput" checked={isPublic} onChange={(e) => handleToggle(e.target.checked)} />
          <label htmlFor="checkboxInput" className="toggleSwitch" aria-label="Toggle private/public" />
          <span className={`text-xs font-semibold transition ${isPublic ? 'text-[#FFD60A]' : 'text-white/40'}`}>Public</span>
          <span className="hidden sm:inline text-[10px] text-white/20 ml-1">({isPrivate ? 'your private routes' : 'community public routes'})</span>
        </div>

        <button
          onClick={handleReload}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs glass border border-[#FFD60A]/15 text-[#FFD60A] px-3.5 py-2 rounded-full hover:border-[#FFD60A]/30 hover:bg-[#FFD60A]/10 transition disabled:opacity-50 pc-btn"
        >
          <span className={`${loading ? 'animate-spin' : ''} inline-block`}>↻</span> {loading ? 'Loading…' : 'Reload routes'}
        </button>
      </div>

      {/* Title dynamic */}
      <div className="mt-3">
        <h2 className="text-sm font-semibold text-white">{isPrivate ? 'Your Private Routes' : 'Public Pujo Routes'}</h2>
        <p className="text-xs text-white/40 mt-0.5">
          {isPrivate ? 'Only you can see these — tap to view map + optimized order.' : 'Premade routes by the community — tap to view map + optimized order.'}
        </p>
      </div>

      {/* Create button with pop animation */}
      <Link
        href={createHref}
        className="mt-4 inline-flex items-center gap-2 bg-[#FFD60A] text-[#020617] px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#FFE566] transition pc-btn"
      >
        <span className="w-6 h-6 rounded-full bg-[#020617] text-[#FFD60A] flex items-center justify-center text-sm">+</span>
        {createLabel}
      </Link>
      {!user && isPrivate && <p className="text-[11px] text-amber-300/80 mt-2">Login to see your private routes. Public routes are visible to everyone.</p>}

      {error && <p className="text-xs text-amber-400 mt-3 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2">{error}</p>}

      {/* Routes grid */}
      <div className="mt-6">
        {loading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="p-4 rounded-2xl glass border border-[#FFD60A]/10 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2 mt-2" />
              </div>
            ))}
          </div>
        ) : routes.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#020617]/40 border border-[#FFD60A]/10 text-center">
            {isPrivate ? (
              <>
                <p className="text-sm text-white/70">{user ? 'No private routes yet — create your first private route!' : 'Login to see your private routes'}</p>
                <p className="text-xs text-white/40 mt-1">Pick 2–10 pandals, optimize, and save as private.</p>
                <Link
                  href={user ? '/pujo-routing/create' : '/login'}
                  className="inline-block mt-3 text-xs border border-[#FFD60A]/20 text-[#FFD60A] px-4 py-2 rounded-full pc-btn"
                >
                  {user ? 'Go to creator →' : 'Login →'}
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-white/70">No public routes yet — be the first!</p>
                <p className="text-xs text-white/40 mt-1">Pick 2–10 pandals, add live location, optimize. You can keep it private.</p>
                <Link
                  href={user ? '/pujo-routing/create' : '/login'}
                  className="inline-block mt-3 text-xs border border-[#FFD60A]/20 text-[#FFD60A] px-4 py-2 rounded-full pc-btn"
                >
                  {user ? 'Go to creator →' : 'Login to create →'}
                </Link>
              </>
            )}
            <p className="text-[11px] text-white/20 mt-4">
              Table <code>puja_routes</code> will appear here once Supabase migration runs. Without it, creator still works locally (route not saved).
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {routes.map((r) => {
              const displayTitle = formatRouteTitle(r)
              const count = r.ordered_slugs?.length || 0
              return (
                <Link
                  key={r.id}
                  href={`/pujo-routing/${r.id}`}
                  className="block p-4 rounded-2xl glass border border-[#FFD60A]/10 transition glass-pop hover:border-[#FFD60A]/25 hover:shadow-[0_0_22px_rgba(255,214,10,0.16)] active:scale-[0.97]"
                >
                  <h3 className="text-sm font-semibold text-white line-clamp-1">{displayTitle}</h3>
                  <p className="text-xs text-white/40 mt-1 line-clamp-2">{r.description || `${count} pandals • ${isPrivate ? 'private' : 'public'}`}</p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-white/30 flex-wrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#FFD60A]/15 border border-[#FFD60A]/20 flex items-center justify-center text-[10px] text-[#FFD60A]">👤</span>
                      <span className="text-[#FFD60A]/80 font-medium">{r.username || 'Anonymous'}</span>
                    </span>
                    <span>•</span>
                    <span>{r.distance_m ? `${(r.distance_m / 1000).toFixed(1)} km` : ''}</span>
                    <span>{r.duration_s ? `• ${Math.round(r.duration_s / 60)} min` : ''}</span>
                    {!isPublic && <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#0B1220] border border-[#FFD60A]/15 text-white/50">Private</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating + with same auth */}
      <Link
        href={createHref}
        aria-label={createLabel}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#FFD60A] text-[#020617] flex items-center justify-center text-2xl font-bold shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:bg-[#FFE566] transition z-30 pc-btn"
      >
        {user ? '+' : '→'}
      </Link>
    </>
  )
}
