'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    setErr(''); setMsg(''); setLoading(true)
    if (!username.trim() || !email.trim() || !password) { setErr('Username, Gmail and password required'); setLoading(false); return }
    if (username.length < 3) { setErr('Username at least 3 chars'); setLoading(false); return }
    // check username unique via profiles
    const { data: existing } = await supabase.from('profiles').select('username').eq('username', username).maybeSingle()
    if (existing) { setErr('Username already taken'); setLoading(false); return }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim() } }
    })
    setLoading(false)
    if (error) { setErr(error.message); return }
    if (data.user && !data.session) {
      setMsg('Account created! Check your Gmail for verification link (also check Spam). After clicking link, come back and Login.')
    } else {
      setMsg('Signed up! You can now login.')
      setMode('login')
    }
  }

  const handleLogin = async () => {
    setErr(''); setMsg(''); setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) { setErr(error.message); return }
    if (data.session) {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-8">
      <div className="bg-[#0B1220] border border-[#FFD60A]/10 rounded-2xl p-6 w-full max-w-sm">
        <h1 className="font-bold text-[#FFD60A] text-lg">Welcome to Agomon</h1>
        <p className="text-xs text-white/40 mb-4">{mode === 'login' ? 'Login with Gmail + password' : 'Create account — Gmail will be verified via link'}</p>

        <div className="flex gap-2 mb-4">
          <button onClick={() => { setMode('login'); setErr(''); setMsg('') }} className={`flex-1 py-2 rounded-xl text-xs font-semibold ${mode==='login'?'bg-[#FFD60A] text-[#020617]':'bg-[#020617] text-white/50 border border-[#FFD60A]/10'}`}>Login</button>
          <button onClick={() => { setMode('signup'); setErr(''); setMsg('') }} className={`flex-1 py-2 rounded-xl text-xs font-semibold ${mode==='signup'?'bg-[#FFD60A] text-[#020617]':'bg-[#020617] text-white/50 border border-[#FFD60A]/10'}`}>Sign Up</button>
        </div>

        {mode==='signup' && (
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Unique username" className="w-full mb-3 px-3 py-2.5 rounded-xl bg-[#020617] border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30 focus:border-[#FFD60A]/30" />
        )}
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Gmail address" type="email" className="w-full mb-3 px-3 py-2.5 rounded-xl bg-[#020617] border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30 focus:border-[#FFD60A]/30" />
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (min 6 chars)" type="password" className="w-full mb-3 px-3 py-2.5 rounded-xl bg-[#020617] border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30 focus:border-[#FFD60A]/30" />

        {err && <p className="text-xs text-red-400 mb-2">{err}</p>}
        {msg && <p className="text-xs text-emerald-400 mb-2">{msg}</p>}

        <button
          onClick={mode==='login'?handleLogin:handleSignup}
          disabled={loading}
          className="w-full bg-[#FFD60A] text-[#020617] py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {loading ? 'Please wait...' : mode==='login'?'Login':'Create account'}
        </button>

        <p className="text-[11px] text-white/20 mt-3 text-center">By continuing you agree to Agomon Terms. Gmail verification via link sent to your inbox.</p>
        <Link href="/" className="block text-center text-xs text-[#FFD60A]/60 mt-3 underline">Back to Home</Link>
      </div>
    </div>
  )
}
