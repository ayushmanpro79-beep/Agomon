'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

export default function HeaderAuth() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (user) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Link href="/" className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A]/80 hover:text-[#FFD60A] hover:border-[#FFD60A]/30 text-xs">Welcome</Link>
        <Link href="/browse" className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A]/80 hover:text-[#FFD60A] hover:border-[#FFD60A]/30 text-xs">Browse</Link>
        <Link href="/about" className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A]/80 hover:text-[#FFD60A] hover:border-[#FFD60A]/30 text-xs">About</Link>
        <span className="text-[#FFD60A]/60 hidden sm:inline">{user.user_metadata?.username || user.email?.split('@')[0]}</span>
        <button onClick={logout} className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A] text-xs">Logout</button>
      </div>
    )
  }
  return (
    <nav className="flex gap-1 text-sm items-center">
      <Link href="/" className="px-3 py-1.5 rounded-full bg-[#FFD60A] text-[#020617] font-semibold text-xs">Welcome</Link>
      <Link href="/browse" className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A] text-xs">Browse</Link>
      <Link href="/about" className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A]/80 hover:text-[#FFD60A] hover:border-[#FFD60A]/30 text-xs">About</Link>
      <Link href="/login" className="px-3 py-1.5 rounded-full border border-[#FFD60A]/20 text-[#FFD60A] text-xs">Login</Link>
    </nav>
  )
}
