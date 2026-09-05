'use client'
import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // already installed? hide button
    const checkInstalled = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        // iOS safari
        (window.navigator as any).standalone === true
      if (standalone) setInstalled(true)
    }
    checkInstalled()

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

    const onBeforeInstall = (e: Event) => {
      // prevent Chrome's mini-infobar, we show our own button
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    window.matchMedia('(display-mode: standalone)').addEventListener?.('change', checkInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (installed) return
    if (deferred) {
      try {
        await deferred.prompt()
        const choice = await deferred.userChoice
        // silent handling, no error toast regardless of dismissed/accepted
        setDeferred(null)
        if (choice.outcome === 'accepted') setInstalled(true)
      } catch {
        // silent - no error prompt
        setDeferred(null)
      }
      return
    }
    if (isIOS) {
      setShowIOSHint((v) => !v)
      return
    }
    // No prompt available (desktop / unsupported) - do nothing, no error
  }

  if (installed) {
    return (
      <p className="text-[11px] text-[#FFD60A]/60 mt-2.5 text-center">App installed ✓ — find Agomon on your home screen</p>
    )
  }

  // Show button if we have a deferred prompt OR on iOS (needs manual steps)
  const shouldShow = !!deferred || isIOS
  if (!shouldShow) return null

  return (
    <div className="flex flex-col items-center mt-3">
      <button
        onClick={handleInstall}
        className="inline-flex items-center gap-2 glass border border-[#FFD60A]/20 text-[#FFD60A] px-8 py-3 rounded-full text-sm font-semibold hover:border-[#FFD60A]/35 hover:bg-[#FFD60A]/10 transition pc-btn"
        aria-label="Install Agomon app"
      >
        <span aria-hidden>📲</span> Install Agomon
      </button>
      <p className="text-[10px] text-white/25 mt-1.5">No Play Store needed • safe & light</p>

      {showIOSHint && isIOS && (
        <div className="mt-3 w-full max-w-[360px] glass rounded-2xl border border-[#FFD60A]/15 p-3 text-left">
          <p className="text-xs font-semibold text-white">iPhone — Add to Home Screen:</p>
          <ol className="list-decimal pl-5 text-[12px] text-white/70 mt-1.5 space-y-0.5">
            <li>
              Tap <span className="text-white">Share</span> <span aria-hidden>⬆️</span> at the bottom
            </li>
            <li>
              Tap <span className="text-white">Add to Home Screen</span> → <span className="text-white">Add</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  )
}
