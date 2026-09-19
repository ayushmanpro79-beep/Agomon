import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
}

// Browser client with PKCE cookie support (for OAuth)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Fallback plain client for helpers that don't need cookies (optional)
export const supabasePlain = createClient(supabaseUrl, supabaseAnonKey)

// Helper for search - used in src/app/page.tsx:20 - handles sreebhumi = shree bhumi = shribhumi variants
const normalizeSearch = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/shree/g, 'sree')
    .replace(/shri/g, 'sree')
    .replace(/sri/g, 'sree')

export async function searchPandals(query: string) {
  const q = query.toLowerCase()
  const qNorm = normalizeSearch(query)
  const { data, error } = await supabase.from('pandals').select('*').order('name')
  if (error) throw error
  // client-side normalized filter handles spelling variants without DB migration
  return (data || []).filter((p: any) => p.name.toLowerCase().includes(q) || normalizeSearch(p.name).includes(qNorm) || normalizeSearch(p.slug).includes(qNorm))
}
