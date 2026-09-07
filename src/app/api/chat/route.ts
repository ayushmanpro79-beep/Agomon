import { getVaniReply } from '@/lib/vaniEngine'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const messages = body.messages || []
  const last = messages[messages.length - 1]
  const text = last?.parts?.map((p: any) => p.text).join('') || last?.content || last?.text || ''
  if (!text) return Response.json({ reply: 'Hi, I am Vani ◆ — ask about pandals, crowd, buses, hopping.' })
  const reply = await getVaniReply(String(text))
  return Response.json({ reply })
}
