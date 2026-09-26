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
  const [googleLoading, setGoogleLoading] = useState(false)

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

  const handleGoogle = async () => {
    setErr(''); setMsg('')
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      }
    })
    if (error) {
      setErr(error.message)
      setGoogleLoading(false)
    }
    // on success, browser redirects to Google — no need to reset loading
  }

  // surface auth callback errors (?error=auth_code_error)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      if (p.get('error') === 'auth_code_error') setErr('Google sign-in failed — please try again.')
    }
  }, [])

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-8">
      <div className="animate-fade-up glass rounded-[20px] p-6 w-full max-w-sm">
        <p className="chip-minimal px-2.5 py-1 text-[#FFD60A] tracking-[0.18em] text-[10px] w-max">ACCOUNT</p>
        <h1 className="font-bold text-white text-xl mt-2 tracking-tight">Welcome to Agomon</h1>
        <p className="text-xs text-white/40 mt-1 mb-4">{mode === 'login' ? 'Login with Gmail + password' : 'Create account — Gmail will be verified via link'}</p>

        <button
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-white/90 text-[#020617] py-2.5 rounded-xl text-sm font-semibold border border-[#FFD60A]/10 shadow-[0_2px_12px_rgba(0,0,0,0.2)] disabled:opacity-50 transition"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.91 5.38 2.69 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.67 28.59c-.53-1.57-.83-3.24-.83-4.59s.3-3.02.83-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.69 10.78l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.91 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-2 my-4">
          <div className="h-px flex-1 bg-[#FFD60A]/10" />
          <span className="text-[11px] text-white/20">or</span>
          <div className="h-px flex-1 bg-[#FFD60A]/10" />
        </div>

        <div className="inline-flex w-full p-1 rounded-full bg-[#020617] border border-[#FFD60A]/10 mb-4">
          <button onClick={() => { setMode('login'); setErr(''); setMsg('') }} className={`flex-1 py-2 rounded-full text-xs font-semibold transition active:scale-95 ${mode==='login'?'bg-[#FFD60A] text-[#020617]':'text-white/60 hover:text-white'}`}>Login</button>
          <button onClick={() => { setMode('signup'); setErr(''); setMsg('') }} className={`flex-1 py-2 rounded-full text-xs font-semibold transition active:scale-95 ${mode==='signup'?'bg-[#FFD60A] text-[#020617]':'text-white/60 hover:text-white'}`}>Sign Up</button>
        </div>

        {mode==='signup' && (
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Unique username" className="input-minimal mb-3 px-3.5 py-3 text-sm" />
        )}
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Gmail address" type="email" className="input-minimal mb-3 px-3.5 py-3 text-sm" />
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (min 6 chars)" type="password" className="input-minimal mb-3 px-3.5 py-3 text-sm" />

        {mode==='login' && (
          <div className="flex justify-end mb-3">
            <button onClick={() => { setForgotOpen(v=>!v); setErr(''); setMsg('') }} className="text-xs text-[#FFD60A]/70 hover:text-[#FFD60A] underline">Forgot password?</button>
          </div>
        )}
        {forgotOpen && mode==='login' && (
          <div className="mb-3 p-3 rounded-xl bg-[#020617] border border-[#FFD60A]/10">
            <p className="text-xs text-white/60 mb-2">Enter Gmail to get reset link</p>
            <div className="flex gap-2">
              <button onClick={handleForgot} disabled={loading} className="btn-primary px-4 py-2 text-xs min-h-[44px] disabled:opacity-50">Send reset link</button>
              <button onClick={() => setForgotOpen(false)} className="btn-ghost px-4 py-2 text-xs min-h-[44px]">Cancel</button>
            </div>
          </div>
        )}
        {isRecovery && (
          <div className="mb-3 p-3 rounded-xl bg-[#020617] border border-[#FFD60A]/20">
            <p className="text-xs text-[#FFD60A] mb-2">Set new password</p>
            <input value={resetPass} onChange={e=>setResetPass(e.target.value)} placeholder="New password (min 6 chars)" type="password" className="input-minimal mb-2 px-3.5 py-3 text-sm" />
            <button onClick={handleUpdatePassword} disabled={loading} className="btn-primary w-full py-2.5 text-xs min-h-[44px] disabled:opacity-50">Update password</button>
          </div>
        )}

        {err && <p className="text-xs text-red-400 mb-2">{err}</p>}
        {msg && <p className="text-xs text-emerald-400 mb-2">{msg}</p>}

        <button
          onClick={mode==='login'?handleLogin:handleSignup}
          disabled={loading}
          className={`btn-primary w-full py-3 text-sm min-h-[48px] disabled:opacity-50 ${loading ? 'btn-busy' : ''}`}
        >
          {loading ? 'Please wait' : mode==='login'?'Login':'Create account'}
        </button>

        <p className="text-[11px] text-white/20 mt-3 text-center">By continuing you agree to Agomon Terms. Gmail verification via link sent to your inbox.</p>
        <Link href="/" className="link-glow block text-center text-xs text-[#FFD60A]/60 mt-3 mx-auto w-max">Back to Home</Link>
      </div>
    </div>
  )
}
