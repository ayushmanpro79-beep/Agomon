'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function VaniIcon() {
  const pathname = usePathname()
  if (pathname.startsWith('/login') || pathname.startsWith('/admin') || pathname === '/vani') return null
  const isPujo = pathname.startsWith('/pujo-routing')
  return (
    <Link
      href="/vani"
      aria-label="Chat with Vani"
      className={`fixed z-40 w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#FFD60A] text-[#020617] grid place-items-center text-2xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] border border-[#FFD60A]/20 hover:bg-[#FFE566] transition ${isPujo ? 'bottom-24 right-6' : 'bottom-4 right-4 md:bottom-6 md:right-6'}`}
    >
      ◆
    </Link>
  )
}
