'use client'
import { useEffect, useRef } from 'react'
import { animate } from 'animejs'

// src/components/animations/DurgaEyes.tsx:8 - closed -> slowly opens, yellow only
export default function DurgaEyes() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const eyesGroup = ref.current.querySelector('#eyes-group') as HTMLElement
    const pupils = ref.current.querySelectorAll('#pupils circle')
    const closed = ref.current.querySelector('#closed-lids') as HTMLElement
    const bindi = ref.current.querySelector('#bindi') as HTMLElement
    if (!eyesGroup || !closed) return

    // start closed: eyes scaleY 0.05, closed lids visible, pupils hidden
    eyesGroup.style.transformOrigin = '50% 50%'
    eyesGroup.style.opacity = '0'
    closed.style.opacity = '1'
    pupils.forEach((p) => ((p as HTMLElement).style.opacity = '0'))

    // appear
    animate(eyesGroup, {
      opacity: [0, 1],
      duration: 500,
      easing: 'easeOutQuad',
    })

    // slowly open: closed lids fade out, eyes scaleY open
    setTimeout(() => {
      animate(closed, { opacity: [1, 0], duration: 700, easing: 'easeInOutQuad' })
      animate(eyesGroup, {
        scaleY: [0.08, 1],
        duration: 1400,
        easing: 'easeOutCubic',
      } as any)
      pupils.forEach((p, i) => {
        animate(p as HTMLElement, {
          opacity: [0, 1],
          scale: [0.2, 1],
          duration: 900,
          delay: 600 + i * 80,
          easing: 'easeOutBack',
        })
      })
      // bindi subtle pulse yellow only
      setTimeout(() => {
        animate(bindi as HTMLElement, {
          scale: [1, 1.18, 1],
          opacity: [0.95, 1, 0.95],
          duration: 1800,
          loop: true,
          easing: 'easeInOutSine',
        } as any)
      }, 1200)
    }, 400)
  }, [])
  return (
    <div ref={ref} className="w-full max-w-[300px] md:max-w-[360px] mx-auto">
      <img src="/illustrations/durga-eyes.svg" alt="Durga Ma eyes" className="w-full h-auto drop-shadow-[0_0_18px_rgba(255,214,10,0.35)]" />
    </div>
  )
}
