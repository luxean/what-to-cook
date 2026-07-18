import { useState } from 'react'
import { ChefHat, Cloud, Mail } from 'lucide-react'
import { supabase } from './supabase'
export function AuthGate() {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const login = async () => {
    if (!supabase || !email.trim()) return
    setBusy(true); setError('')
    const { error: authError } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } })
    setBusy(false)
    if (authError) setError('Prihlásenie sa nepodarilo. Skontroluj e-mail a skús znova.'); else setSent(true)
  }
  return <div className="auth-page"><div className="auth-card"><div className="auth-mark"><ChefHat /></div><span className="eyebrow">MAMIN POMOCNÍK</span><h1>{sent ? 'Pozri si e-mail' : 'Vitaj pri varení'}</h1>{sent ? <><div className="mail-sent"><Mail /></div><p>Poslali sme ti bezpečný odkaz na <strong>{email}</strong>. Klikni naň a si dnu — bez hesla.</p><button className="text-btn" onClick={() => setSent(false)}>Použiť iný e-mail</button></> : <><p>Prihlás sa e-mailom, aby tvoje jedlá zostali bezpečne uložené aj pri výmene telefónu.</p><label>E-mailová adresa</label><input type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mama@example.com" onKeyDown={e => e.key === 'Enter' && login()} />{error && <span className="auth-error">{error}</span>}<button className="primary" onClick={login} disabled={busy || !email.trim()}><Cloud /> {busy ? 'Posielam…' : 'Prihlásiť bezpečným odkazom'}</button><small>Žiadne heslo si nemusíš pamätať.</small></>}</div></div>
}
