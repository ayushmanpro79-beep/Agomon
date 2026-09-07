import type { Metadata } from 'next'
import VaniChat from '@/components/chatbot/VaniChat'
import SectionBorder from '@/components/ui/SectionBorder'

const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://agomon.vercel.app'

export const metadata: Metadata = {
  title: 'Vani — Chat to Plan Your Puja',
  description: 'Chat with Vani ◆ to plan pandal hopping, find buses, check crowd, list pandals — summarized replies with same-tab links.',
  alternates: { canonical: `${base}/vani` },
  openGraph: { title: 'Vani — Agomon Chat', description: 'Plan hopping with Vani', url: `${base}/vani`, type: 'website', siteName: 'Agomon' },
}

export default function VaniPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <SectionBorder />
      <VaniChat />
      <SectionBorder className="mt-3 rotate-180" />
    </div>
  )
}
