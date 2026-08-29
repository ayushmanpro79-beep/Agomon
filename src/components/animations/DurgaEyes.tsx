'use client'
import { useEffect, useRef } from 'react'
import { animate } from 'animejs'

// src/components/animations/DurgaEyes.tsx:8 - opening of Durga Ma's eyes
export default function DurgaEyes() {
  const eyeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!eyeRef.current) return
    const pupils = eyeRef.current.querySelectorAll('#pupils circle')
    const eyelids = eyeRef.current.querySelectorAll('#eyes-group path')
    // initial closed
    pupils.forEach((p) => ((p as HTMLElement).style.opacity = '0'))
    // eyelid draw + pupils open
    const tl = async () => {
      animate(eyeRef.current!.querySelector('#eyes-group') as HTMLElement, {
        opacity: [0, 1],
        duration: 600,
        easing: 'easeOutQuad',
      })
      await new Promise((r) => setTimeout(r, 400))
      // eye opening: scaleY pupils
      pupils.forEach((p) => {
        animate(p as HTMLElement, {
          opacity: [0, 1],
          scaleY: [0.1, 1],
          duration: 700,
          easing: 'easeOutElastic(1, .6)',
        })
      })
      // subtle breathing
      animate(eyeRef.current!.querySelector('#bindi') as HTMLElement, {
        scale: [1, 1.12, 1],
        duration: 1600,
        loop: true,
        easing: 'easeInOutSine',
      })
    }
    tl()
  }, [])
  return (
    <div ref={eyeRef} className="w-full max-w-[320px] mx-auto">
      <img src="/illustrations/durga-eyes.svg" alt="Durga Ma eyes" className="w-full h-auto drop-shadow-[0_0_20px_rgba(255,214,10,0.5)]" />
    </div>
  )
}
