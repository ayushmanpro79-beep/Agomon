import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper for search - used in src/app/page.tsx:20
export async function searchPandals(query: string) {
  const { data, error } = await supabase
    .from('pandals')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name')
  if (error) throw error
  return data
}
