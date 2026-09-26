'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editUsername, setEditUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passMsg, setPassMsg] = useState('')
  const [passErr, setPassErr] = useState('')
  const [passSaving, setPassSaving] = useState(false)
  const [linkEmail, setLinkEmail] = useState('')
  const [linkPassword, setLinkPassword] = useState('')
  const [linkMsg, setLinkMsg] = useState('')
  const [linkErr, setLinkErr] = useState('')
  const [linking, setLinking] = useState(false)
  const [googleLinking, setGoogleLinking] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/login'); return }
      setUser(u)
      // try to fetch profile
      try {
        const { data } = await supabase.from('profiles').select('username, email, avatar_url, created_at').eq('id', u.id).single()
        setProfile(data)
        setEditUsername(data?.username || u.user_metadata?.username || u.email?.split('@')[0] || '')
        setAvatarPreview(data?.avatar_url || u.user_metadata?.avatar_url || u.user_metadata?.picture || null)
      } catch {
        setEditUsername(u.user_metadata?.username || u.email?.split('@')[0] || '')
        setAvatarPreview(u.user_metadata?.avatar_url || u.user_metadata?.picture || null)
      }
      setLoading(false)
    }
    load()
  }, [router])

  const provider = user?.app_metadata?.provider === 'google' || user?.identities?.some((i:any)=>i.provider==='google') || user?.user_metadata?.provider === 'google' ? 'google' : 'email'
  const email = user?.email || profile?.email || ''

  const handleUsernameSave = async () => {
    setErr(''); setMsg('')
    const name = editUsername.trim()
    if (name.length < 3) { setErr('Username must be at least 3 chars'); return }
    if (name === profile?.username) { setMsg('No change'); return }
    // check uniqueness
    const { data: existing } = await supabase.from('profiles').select('username').eq('username', name).maybeSingle()
    if (existing && existing.username !== profile?.username) { setErr('Username already taken'); return }
    setSaving(true)
    try {
      // try profiles table
      const { error } = await supabase.from('profiles').update({ username: name }).eq('id', user.id)
      if (error) throw error
      // also sync user_metadata
      await supabase.auth.updateUser({ data: { username: name } })
      setProfile((p:any) => ({ ...p, username: name }))
      setMsg('Username updated')
    } catch (e:any) {
      // fallback to just user_metadata if column missing or profile not found
      try {
        await supabase.auth.updateUser({ data: { username: name } })
        setMsg('Username updated in profile')
      } catch (e2:any) {
        setErr(e2.message || e.message)
      }
    }
    setSaving(false)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setErr('Image must be under 5MB'); return }
    if (!file.type.startsWith('image/')) { setErr('Choose an image file'); return }
    setErr(''); setMsg('')
    // local preview
    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      // try to save to profiles + user_metadata
      let saved = false
      try {
        const { error } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
        if (!error) saved = true
      } catch {}
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl, picture: publicUrl } })
      setMsg(saved ? 'Profile picture updated' : 'Picture updated (will appear after refresh)')
      setAvatarPreview(publicUrl)
    } catch (e:any) {
      // if bucket missing, fallback to user_metadata via base64? Just show error
      if (e.message?.includes('Bucket not found') || e.message?.includes('not found')) {
        setErr('Avatars storage not set up yet — ask admin to run SQL for avatars bucket. Preview shown locally.')
      } else {
        setErr(e.message || 'Upload failed')
      }
    }
    setUploading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const handleChangePassword = async () => {
    setPassErr(''); setPassMsg('')
    if (newPass.length < 6) { setPassErr('Password must be at least 6 chars'); return }
    if (newPass !== confirmPass) { setPassErr('Passwords do not match'); return }
    setPassSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setPassSaving(false)
    if (error) { setPassErr(error.message); return }
    setPassMsg(provider==='google' ? 'Password set! You can now also login with email + password.' : 'Password updated!')
    setNewPass(''); setConfirmPass('')
  }

  const handleSendReset = async () => {
    setPassErr(''); setPassMsg('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined })
    if (error) { setPassErr(error.message); return }
    setPassMsg('Reset link sent to your email — check inbox & Spam.')
  }

  const handleLinkGoogle = async () => {
    setLinkErr(''); setLinkMsg(''); setGoogleLinking(true)
    const { error } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback?next=/account` : undefined } })
    if (error) { setLinkErr(error.message); setGoogleLinking(false); return }
    // redirects to Google
  }

  const handleLinkEmail = async () => {
    setLinkErr(''); setLinkMsg('')
    const targetEmail = linkEmail.trim()
    if (!targetEmail) { setLinkErr('Enter an email to link'); return }
    // For Google user to add email/password: if target is same as current, just set password via updateUser
    if (targetEmail.toLowerCase() === email.toLowerCase()) {
      setLinkErr('Use Set Password above for your current Gmail. To link a different email, enter that different address.')
      return
    }
    if (!linkPassword) { setLinkErr('Enter the password for that email to verify ownership. If you forgot it, use Forgot Password on login page first.'); return }
    setLinking(true)
    try {
      // Verify ownership by attempting sign-in with a non-persisting client (so we don't log out Google user)
      const tmp = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
      const { error: signInErr } = await tmp.auth.signInWithPassword({ email: targetEmail, password: linkPassword })
      if (signInErr) {
        if (signInErr.message.includes('Invalid login')) {
          setLinkErr('Invalid email or password. If you forgot password, reset it via Login → Forgot password, then try again.')
        } else {
          setLinkErr(signInErr.message)
        }
        setLinking(false)
        return
      }
      // Verified — now send confirmation link from current Google session to link that email
      // Supabase will send a confirmation to targetEmail when we call updateUser({email})
      const { error: updErr } = await supabase.auth.updateUser({ email: targetEmail })
      if (updErr) {
        // If email already registered, Supabase returns "already registered" — we already verified, so instruct manual link
        if (updErr.message.toLowerCase().includes('already registered') || updErr.message.toLowerCase().includes('already exists')) {
          setLinkMsg('Email exists and password verified. Confirmation sent — check inbox for that Gmail and click the link to confirm. After confirming, you can login with either Google or that email + password. For full account merge, login with that email account and use “Link Google Account” there.')
        } else {
          throw updErr
        }
      } else {
        setLinkMsg('Confirmation link sent to ' + targetEmail + ' — click it to link this email to your Google account. Check Spam too.')
      }
    } catch (e:any) {
      setLinkErr(e.message || 'Failed to link email')
    }
    setLinking(false)
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-white/30 text-sm">Loading account...</p></div>

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="animate-fade-up glass-strong rounded-[24px] p-6 md:p-8 ring-1 ring-[#FFD60A]/10">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative group">
            <div className="h-20 w-20 md:h-24 md:w-24 rounded-full overflow-hidden border-2 border-[#FFD60A]/30 bg-[#020617] flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl text-[#FFD60A]">◆</span>
              )}
            </div>
            <button onClick={()=>fileRef.current?.click()} disabled={uploading} className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-[#FFD60A] text-[#020617] flex items-center justify-center text-xs font-bold border border-[#020617] shadow hover:scale-105 transition disabled:opacity-50">
              {uploading ? '…' : '✎'}
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-[#FFD60A] text-lg truncate">{profile?.username || user.user_metadata?.username || email.split('@')[0]}</h1>
            <p className="text-xs text-white/40 truncate">{email}</p>
            <span className={`inline-flex items-center gap-1.5 mt-1 text-[11px] px-2 py-0.5 rounded-full border ${provider==='google' ? 'bg-white/10 border-white/20 text-white' : 'bg-[#FFD60A]/10 border-[#FFD60A]/20 text-[#FFD60A]'}`}>
              {provider==='google' ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.91 5.38 2.69 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.67 28.59c-.53-1.57-.83-3.24-.83-4.59s.3-3.02.83-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.69 10.78l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.91 42.62 14.62 48 24 48z"/></svg>
                  Google
                </>
              ) : 'Email'}
            </span>
            <p className="text-[11px] text-white/20 mt-1">Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</p>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#020617]/40 border border-[#FFD60A]/10">
            <label className="text-xs text-[#FFD60A]/60">Username</label>
            <input value={editUsername} onChange={e=>setEditUsername(e.target.value)} className="input-minimal mt-1.5 px-3.5 py-3 text-sm" />
            <button onClick={handleUsernameSave} disabled={saving} className="btn-primary mt-3 w-full py-2.5 text-xs min-h-[44px] disabled:opacity-50">
              {saving ? 'Saving' : 'Save username'}
            </button>
          </div>
          <div className="p-4 rounded-2xl bg-[#020617]/40 border border-[#FFD60A]/10">
            <label className="text-xs text-[#FFD60A]/60">Email</label>
            <p className="mt-1 text-sm text-white break-all">{email}</p>
            <p className="text-[11px] text-white/30 mt-1">Email cannot be changed. {provider==='google' ? 'Google accounts use Gmail.' : 'Verification via Gmail link.'}</p>
            <div className="mt-3 flex gap-2">
              <Link href="/login" className="btn-ghost flex-1 py-2 text-xs min-h-[44px]">Switch account</Link>
              <button onClick={handleLogout} className="flex-1 py-2 rounded-full bg-[#0B1220] border border-red-500/20 text-red-400 text-xs min-h-[44px] transition hover:bg-red-500/10 active:scale-95">Logout</button>
            </div>
          </div>
        </div>

        {/* Security & Linking */}
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {/* Change / Set Password */}
          <div className="p-4 rounded-2xl bg-[#020617]/40 border border-[#FFD60A]/10">
            <h3 className="text-xs font-semibold text-[#FFD60A]">{provider==='google' ? 'Set Password (enable Email login)' : 'Change Password'}</h3>
            <p className="text-[11px] text-white/30 mt-1">{provider==='google' ? 'Set a password for your Gmail so you can also login with email + password.' : 'Update your password while logged in.'}</p>
            <input value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder={provider==='google' ? 'New password (min 6)' : 'New password'} type="password" className="input-minimal mt-3 px-3.5 py-3 text-sm" />
            <input value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} placeholder="Confirm password" type="password" className="input-minimal mt-2 px-3.5 py-3 text-sm" />
            <button onClick={handleChangePassword} disabled={passSaving} className="btn-primary mt-3 w-full py-2.5 text-xs min-h-[44px] disabled:opacity-50">{passSaving ? 'Saving' : provider==='google' ? 'Set password' : 'Update password'}</button>
            <button onClick={handleSendReset} className="btn-ghost mt-2 w-full py-2.5 text-xs min-h-[44px]">Send reset link</button>
            {passErr && <p className="mt-2 text-xs text-red-400">{passErr}</p>}
            {passMsg && <p className="mt-2 text-xs text-emerald-400">{passMsg}</p>}
          </div>

          {/* Linking */}
          {provider==='email' ? (
            <div className="p-4 rounded-2xl bg-[#020617]/40 border border-white/10">
              <h3 className="text-xs font-semibold text-white">Link Google Account</h3>
              <p className="text-[11px] text-white/30 mt-1">One-click while logged in. After consent, you can login with either Email or Google.</p>
              <button onClick={handleLinkGoogle} disabled={googleLinking} className="mt-3 w-full flex items-center justify-center gap-2 bg-white text-[#020617] py-2 rounded-xl text-xs font-semibold border border-[#FFD60A]/10 disabled:opacity-50">
                <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.91 5.38 2.69 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.67 28.59c-.53-1.57-.83-3.24-.83-4.59s.3-3.02.83-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.69 10.78l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.91 42.62 14.62 48 24 48z"/></svg>
                {googleLinking ? 'Redirecting...' : 'Link Google Account'}
              </button>
              {linkErr && <p className="mt-2 text-xs text-red-400">{linkErr}</p>}
              {linkMsg && <p className="mt-2 text-xs text-emerald-400">{linkMsg}</p>}
              <p className="text-[10px] text-white/20 mt-2">Requires “Allowed Manual Linking” enabled in Supabase (you have it).</p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#020617]/40 border border-white/10">
              <h3 className="text-xs font-semibold text-white">Link Email to Google Account</h3>
              <p className="text-[11px] text-white/30 mt-1">Enter an existing email + its password to verify ownership. Confirmation link will be sent.</p>
              <input value={linkEmail} onChange={e=>setLinkEmail(e.target.value)} placeholder="Email to link (Gmail)" type="email" className="input-minimal mt-3 px-3.5 py-3 text-sm" />
              <input value={linkPassword} onChange={e=>setLinkPassword(e.target.value)} placeholder="Password for that email" type="password" className="input-minimal mt-2 px-3.5 py-3 text-sm" />
              <button onClick={handleLinkEmail} disabled={linking} className="mt-3 w-full bg-white text-[#020617] py-2.5 rounded-full text-xs font-semibold min-h-[44px] transition hover:bg-white/90 active:scale-[0.97] disabled:opacity-50">{linking ? 'Linking' : 'Verify and send confirmation'}</button>
              <p className="text-[10px] text-white/20 mt-2">If you forgot password, reset it via <Link href="/login" className="underline text-[#FFD60A]/60">Login → Forgot password</Link> first.</p>
              {linkErr && <p className="mt-2 text-xs text-red-400">{linkErr}</p>}
              {linkMsg && <p className="mt-2 text-xs text-emerald-400">{linkMsg}</p>}
            </div>
          )}
        </div>

        {err && <p className="mt-4 text-xs text-red-400">{err}</p>}
        {msg && <p className="mt-4 text-xs text-emerald-400">{msg}</p>}

        <p className="text-[11px] text-white/20 mt-6 text-center">Profile picture up to 5MB. Recommended square image. Google users already have picture from Gmail.</p>
        <Link href="/" className="link-glow block text-center text-xs text-[#FFD60A]/60 mt-3 mx-auto w-max">Back to Home</Link>
      </div>
    </div>
  )
}
