import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// For server components / API routes - src/lib/supabase/server.ts
export async function createServerClient() {
  const cookieStore = await cookies()
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}

// Plain server client without cookies (for static generation like browse/page.tsx)
export function createPlainServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
