'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// src/app/map/page.tsx:6 - redirect to /browse (renamed)
export default function MapRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/browse') }, [router])
  return <div className="py-20 text-center text-white/30 text-sm">Redirecting to Browse...</div>
}
