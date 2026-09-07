'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
// @ts-ignore - ai SDK types
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { supabase } from '@/lib/supabase/client'

const HISTORY_KEY = 'agomon_vani_history'
const HISTORY_TS_KEY = 'agomon_vani_history_ts'
const TTL_MS = 24 * 60 * 60 * 1000

const DEFAULT_QUESTIONS = [
  'Plan a pandal hopping trip in South Kolkata near Kalighat metro',
  'Recommend which bus to take from Deshapriya Park to Hindustan Park',
  'List 4 pandals in Sovabazar Sutanuti’s 2 km vicinity',
  'Which pandals near Garia are least crowded at 7pm?',
  'How crowded is Sreebhumi Sporting Club at 8pm?',
  'Show me Admin Suggested routes for Behala',
]

const MODELS = [
  { id: 'muse-spark-1.2-free', label: 'Muse Spark 1.2 Free' },
  { id: 'muse-spark-1.3-free', label: 'Muse Spark 1.3 Free' },
  { id: 'nemotron-3-ultra-free', label: 'Nemotron 3 Ultra Free' },
  { id: 'nemotron-3.5-lightning-free', label: 'Nemotron 3.5 Lightning Free' },
  { id: 'big-pickle-free', label: 'Big Pickle Free' },
]

function parseLinks(text: string) {
  // Converts markdown links [text](/path) to React nodes with next/link same-tab
  const parts: any[] = []
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  let idx = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={`t-${idx++}`}>{text.slice(last, m.index)}</span>)
    const label = m[1]
    const href = m[2]
    const isInternal = href.startsWith('/')
    parts.push(
      isInternal ? (
        <Link key={`l-${idx++}`} href={href} className="text-[#FFD60A] underline hover:text-[#FFE566]">
          {label}
        </Link>
      ) : (
        <a key={`l-${idx++}`} href={href} className="text-[#FFD60A] underline">
          {label}
        </a>
      ),
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(<span key={`t-${idx++}`}>{text.slice(last)}</span>)
  return parts.length ? parts : text
}

export default function VaniChat() {
  const [user, setUser] = useState<any>(null)
  const [input, setInput] = useState('')
  const [saveAskId, setSaveAskId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('muse-spark-1.2-free')
  const listRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({ isAuthenticated: !!user, model: selectedModel }),
    }),
  })
  const isLoading = status === 'streaming' || status === 'submitted'

  // auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  // history 24h TTL
  useEffect(() => {
    try {
      const ts = localStorage.getItem(HISTORY_TS_KEY)
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw && ts) {
        const age = Date.now() - parseInt(ts, 10)
        if (age > TTL_MS) {
          localStorage.removeItem(HISTORY_KEY)
          localStorage.removeItem(HISTORY_TS_KEY)
        } else {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length) setMessages(parsed)
        }
      } else if (raw) {
        localStorage.setItem(HISTORY_TS_KEY, String(Date.now()))
      }
    } catch {}
  }, [setMessages])

  useEffect(() => {
    try {
      if (messages.length) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(messages))
        if (!localStorage.getItem(HISTORY_TS_KEY)) localStorage.setItem(HISTORY_TS_KEY, String(Date.now()))
        else {
          // refresh ts only if first message?
        }
      }
    } catch {}
    // auto scroll
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // daily refresh at midnight
  useEffect(() => {
    const id = setInterval(() => {
      const ts = localStorage.getItem(HISTORY_TS_KEY)
      if (ts && Date.now() - parseInt(ts, 10) > TTL_MS) {
        localStorage.removeItem(HISTORY_KEY)
        localStorage.removeItem(HISTORY_TS_KEY)
        setMessages([])
      }
    }, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [setMessages])

  const handleSend = (text?: string) => {
    const t = (text ?? input).trim()
    if (!t || isLoading) return
    setInput('')
    setSaveAskId(null)
    sendMessage({ text: t })
  }

  const handleSave = async (routeId: string, isPublic: boolean) => {
    // Save route as per user's account — handled via puja_routes insert copy? For now, just show message
    // The actual route is already at /pujo-routing/${routeId}. To save as copy, we fetch and re-insert as own.
    if (!user) {
      sendMessage({ text: `Please login to save. I tried to save route ${routeId} as ${isPublic ? 'public' : 'private'}` })
      return
    }
    try {
      const { data: src } = await supabase.from('puja_routes').select('*').eq('id', routeId).single()
      if (!src) throw new Error('Route not found')
      const { data, error } = await supabase
        .from('puja_routes')
        .insert({
          user_id: user.id,
          username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
          title: src.title,
          description: src.description,
          pandal_ids: src.pandal_ids,
          ordered_slugs: src.ordered_slugs,
          distance_m: src.distance_m,
          duration_s: src.duration_s,
          geojson: src.geojson,
          is_public: isPublic,
        })
        .select('id')
        .single()
      if (error) throw error
      sendMessage({ text: `Saved as ${isPublic ? 'public' : 'private'} route: /pujo-routing/${data.id}` })
    } catch (e: any) {
      sendMessage({ text: `Failed to save: ${e.message}` })
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col min-h-[72vh]">
      {/* Header */}
      <div className="glass-strong rounded-3xl p-4 md:p-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="w-9 h-9 rounded-full bg-[#FFD60A] text-[#020617] grid place-items-center text-lg">◆</span>
          <div>
            <h1 className="font-bold text-white leading-none">Vani</h1>
            <p className="text-[11px] text-[#FFD60A]/60 tracking-wide">Your pandal hopping planner — type to chat</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-[11px] bg-[#020617] border border-[#FFD60A]/20 text-[#FFD60A] rounded-full px-2.5 py-1 outline-none"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#0B1220]">
                  {m.label}
                </option>
              ))}
            </select>
            <span className="hidden sm:inline text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-300">Free • training allowed</span>
          </div>
        </div>
        <p className="text-xs text-white/40 mt-2">Ask Vani to plan hopping, find buses, check crowd, list pandals — uses all Agomon tools. Replies are summarized. Tap a suggestion:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEFAULT_QUESTIONS.map((q) => (
            <button key={q} onClick={() => handleSend(q)} className="text-xs text-left glass border border-[#FFD60A]/15 text-white/70 hover:text-[#FFD60A] hover:border-[#FFD60A]/30 px-3 py-2 rounded-full transition">
              {q}
            </button>
          ))}
        </div>
        {!user && <p className="text-[11px] text-amber-300/70 mt-2">Non-login users can chat. Login-only features (save private route, post review) will ask you to <Link href="/login" className="underline text-[#FFD60A]">Login</Link>.</p>}
      </div>

      {/* Messages */}
      <div ref={listRef} className="mt-4 flex-1 glass rounded-3xl overflow-hidden border border-[#FFD60A]/10 flex flex-col max-h-[64vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-white/50">Hi, I’m Vani ◆ — plan your Puja with me.</p>
              <p className="text-xs text-white/30 mt-1">Try a default question above or type your own.</p>
            </div>
          )}
          {messages.map((m: any) => {
            const isUser = m.role === 'user'
            const text = m.parts?.map((p: any) => (p.type === 'text' ? p.text : '')).join('') || m.content || ''
            // detect route id for save prompt: look for /pujo-routing/<uuid>
            const routeMatch = text.match(/\/pujo-routing\/([0-9a-f-]{36})/i)
            const showSaveAsk = !isUser && routeMatch && saveAskId !== m.id
            return (
              <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-[msg-in_260ms_cubic-bezier(0.16,1,0.3,1)]`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                    isUser ? 'bg-[#FFD60A] text-[#020617] rounded-br-none' : 'glass border border-[#FFD60A]/10 bg-[#0B1220]/60 text-white/85 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{isUser ? text : parseLinks(text)}</div>
                  {!isUser && showSaveAsk && routeMatch && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button onClick={() => { setSaveAskId(m.id); handleSave(routeMatch[1], false) }} className="text-xs bg-[#020617] border border-[#FFD60A]/20 text-[#FFD60A] px-3 py-1.5 rounded-full hover:bg-[#FFD60A]/10">
                        Save as private
                      </button>
                      <button onClick={() => { setSaveAskId(m.id); handleSave(routeMatch[1], true) }} className="text-xs bg-[#FFD60A] text-[#020617] px-3 py-1.5 rounded-full">Save as public</button>
                    </div>
                  )}
                  {!isUser && routeMatch && saveAskId === m.id && <p className="text-[11px] text-white/30 mt-1">Saving… check chat for link.</p>}
                </div>
              </div>
            )
          })}
          {isLoading && <p className="text-xs text-white/30 animate-pulse">Vani is typing…</p>}
          {error && <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{String(error)}</p>}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-[#FFD60A]/10 bg-[#020617]/40">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask Vani to plan hopping..."
              className="flex-1 px-4 py-2.5 rounded-full bg-[#020617] border border-[#FFD60A]/15 outline-none text-sm text-white placeholder:text-white/30 focus:border-[#FFD60A]/30"
            />
            <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="w-11 h-11 rounded-full bg-[#FFD60A] text-[#020617] grid place-items-center disabled:opacity-50 hover:bg-[#FFE566] transition">
              ↑
            </button>
          </div>
          <p className="text-[10px] text-white/20 mt-1 text-center">History clears every 24h • same-tab links • {MODELS.find((m) => m.id === selectedModel)?.label} • free, training allowed</p>
        </div>
      </div>

      <style>{`@keyframes msg-in { from { opacity:0; transform: translateY(6px);} to {opacity:1; transform: translateY(0);} }`}</style>
    </div>
  )
}
