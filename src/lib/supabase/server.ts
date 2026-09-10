import { createClient } from '@supabase/supabase-js'

// For server components / API routes - src/lib/supabase/server.ts:3
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
