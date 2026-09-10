'use client'
import { useEffect } from 'react'

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    // register silently, no error toast
    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch {
        // silent - app still works without SW
      }
    }
    // delay slightly to not block first paint
    const id = setTimeout(register, 800)
    return () => clearTimeout(id)
  }, [])
  return null
}
