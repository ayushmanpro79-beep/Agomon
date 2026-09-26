'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { Lottie } from 'lottie-react'
import menuAnim from '@/../public/lottie/menu.json'

export default function HeaderAuth() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const lottieRef = useRef<any>(null)

  const loadProfile = async (u: any) => {
    if (!u) { setProfile(null); return }
    try {
      const { data } = await supabase.from('profiles').select('username, avatar_url, email').eq('id', u.id).single()
      setProfile(data || null)
    } catch { setProfile(null) }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); loadProfile(data.user) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { setUser(session?.user ?? null); loadProfile(session?.user ?? null) })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!lottieRef.current) return
    if (open) lottieRef.current.playSegments([10, 60], true)
    else lottieRef.current.playSegments([85, 136], true)
  }, [open])

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const close = () => setOpen(false)

  const tabClass =
    "px-3 py-2.5 rounded-full bg-[#0B1220] border border-[#FFD60A]/20 text-[#FFD60A] text-xs text-center font-medium " +
    "transition-all duration-200 ease-out will-change-transform touch-manipulation select-none " +
    "hover:bg-[#FFD60A] hover:text-[#020617] hover:border-[#FFD60A] hover:shadow-[0_0_14px_rgba(255,214,10,0.35)] hover:scale-[1.02] " +
    "active:scale-[0.96] active:bg-[#FFD60A] active:text-[#020617] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD60A]/40"

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      <Link href="/" onClick={onClick} className={tabClass}>Welcome</Link>
      <Link href="/browse" onClick={onClick} className={tabClass}>Browse</Link>
      <Link href="/pujo-routing" onClick={onClick} className={tabClass}>Pujo Routing 🗺️</Link>
      <Link href="/travel-plan" onClick={onClick} className={tabClass}>Travel Plan</Link>
      <Link href="/about" onClick={onClick} className={tabClass}>About</Link>
      {!user && <Link href="/login" onClick={onClick} className={tabClass}>Login</Link>}
    </>
  )

  const displayName = profile?.username || user?.user_metadata?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
  const provider = user?.app_metadata?.provider === 'google' || user?.identities?.some((i:any)=>i.provider==='google') ? 'google' : 'email'

  return (
    <>
      {/* Avatar + name beside hamburger — PC + Mobile */}
      <div className="flex items-center gap-2">
        {user && (
          <Link href="/account" className="flex items-center gap-2 group">
            <div className="h-8 w-8 md:h-9 md:w-9 rounded-full overflow-hidden border border-[#FFD60A]/20 bg-[#0B1220] flex items-center justify-center group-hover:border-[#FFD60A]/40 transition">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-[#FFD60A] text-xs font-bold">{displayName.charAt(0).toUpperCase() || '◆'}</span>
              )}
            </div>
            <span className="hidden sm:inline text-[#FFD60A]/80 group-hover:text-[#FFD60A] text-xs max-w-[110px] truncate transition">{displayName}</span>
            <span className="sm:hidden text-[#FFD60A]/60 text-xs max-w-[90px] truncate">{displayName}</span>
          </Link>
        )}
        <button aria-label="Menu" aria-expanded={open} onClick={() => setOpen(v => !v)} className="h-9 w-9 md:h-10 md:w-10 rounded-full border border-[#FFD60A]/20 bg-[#0B1220] flex items-center justify-center overflow-hidden hover:border-[#FFD60A]/30 transition">
          <Lottie lottieRef={lottieRef} src={menuAnim as any} autoplay={false} loop={false} style={{ width: 36, height: 36 } as any} />
        </button>
      </div>

      {/* Backdrop */}
      <button aria-label="Close menu" onClick={close} className={`fixed inset-0 bg-[#020617]/70 backdrop-blur-sm z-40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      {/* Drawer — 1/3 width, slide animation, PC + Mobile */}
      <div className={`fixed inset-y-0 right-0 w-[33%] min-w-[160px] max-w-[260px] md:max-w-[320px] bg-[#020617] border-l border-[#FFD60A]/20 p-4 pt-16 z-50 flex flex-col gap-3 overflow-y-auto shadow-[-12px_0_32px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out will-change-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {user && (
          <div className="mb-1 p-3 rounded-2xl bg-[#0B1220] border border-[#FFD60A]/10 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden border border-[#FFD60A]/20 bg-[#020617] shrink-0 flex items-center justify-center">
              {avatarUrl ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" /> : <span className="text-[#FFD60A] text-xs">{displayName.charAt(0).toUpperCase()}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#FFD60A] truncate">{displayName}</p>
              <p className="text-[11px] text-white/40 truncate">{user.email}</p>
              <span className={`inline-flex items-center gap-1 mt-1 text-[10px] px-1.5 py-0.5 rounded-full border ${provider==='google' ? 'bg-white text-[#020617] border-white/20' : 'bg-[#FFD60A]/15 text-[#FFD60A] border-[#FFD60A]/20'}`}>
                {provider==='google' ? 'Google' : 'Email'} • {provider==='google' ? 'Gmail' : 'Verified'}
              </span>
            </div>
          </div>
        )}
        <NavLinks onClick={close} />
        {user && <Link href="/account" onClick={close} className={tabClass}>My Account</Link>}
        {user && <button onClick={() => { close(); logout() }} className={`mt-1 ${tabClass}`}>Logout</button>}
        {user && <p className="text-[11px] text-white/20 text-center">Tap avatar to edit profile picture</p>}
      </div>
    </>
  )
}
