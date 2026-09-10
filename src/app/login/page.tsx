'use client'
import { useState, useEffect } from 'react'
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
  const [forgotOpen, setForgotOpen] = useState(false)
  const [resetPass, setResetPass] = useState('')
  const [isRecovery, setIsRecovery] = useState(false)

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

  const handleForgot = async () => {
    setErr(''); setMsg('')
    if (!email.trim()) { setErr('Enter your Gmail to reset password'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined })
    setLoading(false)
    if (error) { setErr(error.message); return }
    setMsg('Reset link sent to your Gmail — check inbox & Spam. Click link then set new password here.')
    setForgotOpen(false)
  }

  // detect recovery session (user clicked email link)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
    })
    supabase.auth.getSession().then(() => {})
    return () => sub.subscription.unsubscribe()
  }, [])

  const handleUpdatePassword = async () => {
    setErr(''); setMsg('')
    if (!resetPass || resetPass.length < 6) { setErr('New password min 6 chars'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: resetPass })
    setLoading(false)
    if (error) { setErr(error.message); return }
    setMsg('Password updated! You can now login with new password.')
    setIsRecovery(false)
    setResetPass('')
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

        {mode==='login' && (
          <div className="flex justify-end mb-3">
            <button onClick={() => { setForgotOpen(v=>!v); setErr(''); setMsg('') }} className="text-xs text-[#FFD60A]/70 hover:text-[#FFD60A] underline">Forgot password?</button>
          </div>
        )}
        {forgotOpen && mode==='login' && (
          <div className="mb-3 p-3 rounded-xl bg-[#020617] border border-[#FFD60A]/10">
            <p className="text-xs text-white/60 mb-2">Enter Gmail to get reset link</p>
            <div className="flex gap-2">
              <button onClick={handleForgot} disabled={loading} className="bg-[#FFD60A] text-[#020617] px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50">Send reset link</button>
              <button onClick={() => setForgotOpen(false)} className="px-3 py-2 rounded-xl border border-[#FFD60A]/10 text-white/60 text-xs">Cancel</button>
            </div>
          </div>
        )}
        {isRecovery && (
          <div className="mb-3 p-3 rounded-xl bg-[#020617] border border-[#FFD60A]/20">
            <p className="text-xs text-[#FFD60A] mb-2">Set new password</p>
            <input value={resetPass} onChange={e=>setResetPass(e.target.value)} placeholder="New password (min 6 chars)" type="password" className="w-full mb-2 px-3 py-2.5 rounded-xl bg-[#0B1220] border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30" />
            <button onClick={handleUpdatePassword} disabled={loading} className="w-full bg-[#FFD60A] text-[#020617] py-2 rounded-xl text-xs font-semibold disabled:opacity-50">Update password</button>
          </div>
        )}

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
