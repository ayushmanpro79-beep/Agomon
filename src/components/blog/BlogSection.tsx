'use client'
import { useEffect, useRef, useState } from 'react'
import { animate } from 'animejs'

// src/components/blog/BlogSection.tsx:8 - The Goddess Who Came Home blog + fading photos beside
export default function BlogSection() {
  const [index, setIndex] = useState(0)
  const imgRefs = useRef<(HTMLImageElement | null)[]>([])

  const images = [
    { src: '/blog/dhunuchi.jpg', alt: 'Dhunuchi dance' },
    { src: '/blog/durga.jpg', alt: 'Durga idol' },
    { src: '/blog/artisan.jpg', alt: 'Artisan in Kumartuli' },
  ]

  useEffect(() => {
    const el = imgRefs.current[index]
    if (!el) return
    animate(el, { opacity: [0, 1], duration: 800, easing: 'easeOutQuad' })
    const prev = imgRefs.current[(index + 2) % 3]
    if (prev && prev !== el) animate(prev, { opacity: [1, 0], duration: 600, easing: 'easeInQuad' })
  }, [index])

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % 3), 3800)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="mt-6 rounded-3xl overflow-hidden glass">
      <div className="grid md:grid-cols-2 gap-0">
        {/* Blog text */}
        <div className="p-6 md:p-8 overflow-y-auto max-h-[520px] md:max-h-[560px] scrollbar-thin">
          <p className="text-[#FFD60A]/60 text-[10px] tracking-[0.25em]">BLOG</p>
          <h2 className="text-xl md:text-2xl font-bold text-white mt-1">The Goddess Who Came Home: The Story of Durga Puja</h2>

          <div className="prose prose-invert prose-sm max-w-none mt-4 text-white/80 leading-relaxed space-y-4 text-[13px]">
            <div>
              <h3 className="text-[#FFD60A] font-semibold text-sm mt-4">The Myth: A Power No One God Could Hold</h3>
              <p>A demon named Mahishasura once conquered heaven. He had a boon that made him unkillable by any man or god — so the gods stopped thinking like individuals and combined their fury into one being instead.</p>
              <p>That fury took the form of <strong className="text-white">Durga</strong>. Each god armed her with his own weapon — Shiva&apos;s trident, Vishnu&apos;s discus, Indra&apos;s thunderbolt — and Himalaya gave her a lion to ride. She wasn&apos;t one god&apos;s creation. She was all of them, together.</p>
              <p>Mahishasura, seeing a woman ride into his court, laughed and proposed marriage instead of war. That mistake cost him nine nights. He shifted through forms — buffalo, lion, man, elephant — searching for one she couldn&apos;t beat. On the tenth day, mid-shift back into a buffalo, she pinned him and drove her trident through his chest.</p>
              <p className="text-white/60 italic">Those nine nights became Navratri. That tenth morning became Vijaya Dashami — the day victory itself is worshipped.</p>
            </div>
            <div>
              <h3 className="text-[#FFD60A] font-semibold text-sm">The Bengali Twist: A Daughter&apos;s Visit</h3>
              <p>In Bengal, the war story softens into something more personal. Durga is also <strong className="text-white">Uma</strong> — Shiva&apos;s wife, living far away in the Himalayas — who comes home to her father&apos;s house once a year with her four children: Lakshmi, Saraswati, Ganesha, and Kartikeya.</p>
              <p>That&apos;s why pandal idols usually show a whole family, not just a warrior. Bengali households treat her arrival like a daughter&apos;s visit — and her departure on Bijoya Dashami, when the idol is carried to the river, carries real grief.</p>
            </div>
            <div>
              <h3 className="text-[#FFD60A] font-semibold text-sm">The History: From a King&apos;s Courtyard to Everyone&apos;s Street</h3>
              <ul className="list-disc pl-5 space-y-1 text-white/70">
                <li><strong>Late 1500s</strong> — earliest recorded pujas were private zamindar affairs, staged by wealthy landowners like Raja Kangshanarayan.</li>
                <li><strong>1790, Guptipara</strong> — Twelve friends, barred from a zamindar&apos;s courtyard puja, pooled money and started one for everyone — <em>barhoyari</em> — “twelve pals.”</li>
                <li><strong>19th–20th century</strong> — grew into <strong>sarbojanin</strong> — “for all people” — open to everyone, goddess moved from courtyard into street.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-[#FFD60A] font-semibold text-sm">The Modern Festival: A City as Art Gallery</h3>
              <p>Kolkata turned Durga Puja into a city-wide public art competition in a goddess&apos;s name. Neighborhoods build <strong>pandals</strong> from bamboo and cloth, torn down days later. In Kumartuli, artisans sculpt Durga fresh from clay every year. In 2021, <strong>UNESCO</strong> added Durga Puja to Intangible Cultural Heritage.</p>
            </div>
            <div>
              <h3 className="text-[#FFD60A] font-semibold text-sm">What the Story Still Means</h3>
              <p>A power that only exists when it&apos;s shared. A daughter always welcomed home, even knowing she&apos;ll leave again. A community that chose, since 1790, to build together rather than watch from outside someone else&apos;s gate.</p>
            </div>
          </div>
        </div>

        {/* Framed photos with fade */}
        <div className="relative bg-[#020617] p-4 md:p-6 flex flex-col items-center justify-center min-h-[380px] border-t md:border-t-0 md:border-l border-[#FFD60A]/10">
          <div className="relative w-full max-w-[320px] aspect-[4/5] rounded-2xl overflow-hidden glass border border-[#FFD60A]/20 shadow-[0_0_30px_rgba(255,214,10,0.15)]">
            {images.map((img, i) => (
              <img
                key={img.src}
                ref={(el) => { imgRefs.current[i] = el }}
                src={img.src}
                alt={img.alt}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: i === 0 ? 1 : 0 }}
                onError={(e) => { (e.target as HTMLImageElement).src = `https://via.placeholder.com/400x500/0B1220/FFD60A?text=${encodeURIComponent(img.alt)}` }}
              />
            ))}
            <div className="absolute inset-0 pointer-events-none border-2 border-[#FFD60A]/10 rounded-2xl" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#020617]/90 to-transparent p-3">
              <p className="text-xs text-[#FFD60A] font-medium">{images[index].alt}</p>
              <p className="text-[11px] text-white/50">{index + 1} / 3 • fade</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {images.map((_, i) => (
              <button key={i} onClick={() => setIndex(i)} className={`w-2 h-2 rounded-full transition ${i === index ? 'bg-[#FFD60A] w-6' : 'bg-white/20'}`} aria-label={`photo ${i + 1}`} />
            ))}
          </div>
          <p className="text-[11px] text-white/20 mt-2">Place your 3 photos in <code className="bg-[#0B1220] border border-[#FFD60A]/10 px-1 rounded">public/blog/</code> as dhunuchi.jpg, durga.jpg, artisan.jpg</p>
        </div>
      </div>
    </div>
  )
}
