'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

export default function HeaderAuth() {
  const [user, setUser] = useState<any>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const close = () => setOpen(false)

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      <Link href="/" onClick={onClick} className="px-3 py-2 rounded-full bg-[#FFD60A] text-[#020617] font-semibold text-xs text-center">Welcome</Link>
      <Link href="/browse" onClick={onClick} className="px-3 py-2 rounded-full border border-[#FFD60A]/20 text-[#FFD60A] text-xs text-center">Browse</Link>
      <Link href="/travel-plan" onClick={onClick} className="px-3 py-2 rounded-full border border-[#FFD60A]/20 text-[#FFD60A] text-xs text-center">Travel Plan</Link>
      <Link href="/about" onClick={onClick} className="px-3 py-2 rounded-full border border-[#FFD60A]/20 text-[#FFD60A] text-xs text-center">About</Link>
      {!user && <Link href="/login" onClick={onClick} className="px-3 py-2 rounded-full border border-[#FFD60A]/20 text-[#FFD60A] text-xs text-center">Login</Link>}
    </>
  )

  if (user) {
    return (
      <>
        {/* Desktop — pills, unchanged */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          <Link href="/" className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A]/80 hover:text-[#FFD60A] hover:border-[#FFD60A]/30 text-xs">Welcome</Link>
          <Link href="/browse" className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A]/80 hover:text-[#FFD60A] hover:border-[#FFD60A]/30 text-xs">Browse</Link>
          <Link href="/travel-plan" className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A]/80 hover:text-[#FFD60A] hover:border-[#FFD60A]/30 text-xs">Travel Plan</Link>
          <Link href="/about" className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A]/80 hover:text-[#FFD60A] hover:border-[#FFD60A]/30 text-xs">About</Link>
          <span className="text-[#FFD60A]/60 hidden lg:inline">{user.user_metadata?.username || user.email?.split('@')[0]}</span>
          <button onClick={logout} className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A] text-xs">Logout</button>
        </div>
        {/* Mobile — hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <span className="text-[#FFD60A]/60 text-xs max-w-[90px] truncate">{user.user_metadata?.username || user.email?.split('@')[0]}</span>
          <button aria-label="Menu" aria-expanded={open} onClick={() => setOpen(v => !v)} className="h-9 w-9 rounded-full border border-[#FFD60A]/20 bg-[#0B1220] flex flex-col items-center justify-center gap-1">
            <span className={`block h-0.5 w-4 bg-[#FFD60A] transition ${open ? 'rotate-45 translate-y-1' : ''}`} />
            <span className={`block h-0.5 w-4 bg-[#FFD60A] transition ${open ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-4 bg-[#FFD60A] transition ${open ? '-rotate-45 -translate-y-1' : ''}`} />
          </button>
        </div>
        {open && (
          <>
            <button aria-label="Close menu" onClick={close} className="fixed inset-0 bg-[#020617]/60 backdrop-blur-sm z-40 md:hidden" />
            <div className="fixed top-14 right-0 w-64 h-[calc(100dvh-3.5rem)] glass-strong border-l border-[#FFD60A]/10 p-4 z-50 md:hidden flex flex-col gap-2 overflow-y-auto">
              <NavLinks onClick={close} />
              <button onClick={() => { close(); logout() }} className="mt-2 px-3 py-2 rounded-full border border-[#FFD60A]/20 text-[#FFD60A] text-xs">Logout</button>
            </div>
          </>
        )}
      </>
    )
  }
  return (
    <>
      {/* Desktop */}
      <nav className="hidden md:flex gap-1 text-sm items-center">
        <Link href="/" className="px-3 py-1.5 rounded-full bg-[#FFD60A] text-[#020617] font-semibold text-xs">Welcome</Link>
        <Link href="/browse" className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A] text-xs">Browse</Link>
        <Link href="/travel-plan" className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A]/80 hover:text-[#FFD60A] hover:border-[#FFD60A]/30 text-xs">Travel Plan</Link>
        <Link href="/about" className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A]/80 hover:text-[#FFD60A] hover:border-[#FFD60A]/30 text-xs">About</Link>
        <Link href="/login" className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A] text-xs">Login</Link>
      </nav>
      {/* Mobile hamburger */}
      <div className="md:hidden flex items-center">
        <button aria-label="Menu" aria-expanded={open} onClick={() => setOpen(v => !v)} className="h-9 w-9 rounded-full border border-[#FFD60A]/20 bg-[#0B1220] flex flex-col items-center justify-center gap-1">
          <span className={`block h-0.5 w-4 bg-[#FFD60A] transition ${open ? 'rotate-45 translate-y-1' : ''}`} />
          <span className={`block h-0.5 w-4 bg-[#FFD60A] transition ${open ? 'opacity-0' : ''}`} />
          <span className={`block h-0.5 w-4 bg-[#FFD60A] transition ${open ? '-rotate-45 -translate-y-1' : ''}`} />
        </button>
      </div>
      {open && (
        <>
          <button aria-label="Close menu" onClick={close} className="fixed inset-0 bg-[#020617]/60 backdrop-blur-sm z-40 md:hidden" />
          <div className="fixed top-14 right-0 w-64 h-[calc(100dvh-3.5rem)] glass-strong border-l border-[#FFD60A]/10 p-4 z-50 md:hidden flex flex-col gap-2 overflow-y-auto">
            <NavLinks onClick={close} />
          </div>
        </>
      )}
    </>
  )
}
