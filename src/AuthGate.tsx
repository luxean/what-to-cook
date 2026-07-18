import { useState } from 'react'
import { ChefHat, KeyRound } from 'lucide-react'

export function AuthGate({ onLogin }: { onLogin: () => void }) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const login = async () => {
    if (!passcode.trim()) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode }), signal: AbortSignal.timeout(10_000) })
      if (!response.ok) throw new Error()
      onLogin()
    } catch { setError('Tento kód nesedí. Skús ho zadať ešte raz.') }
    finally { setBusy(false) }
  }
  return <div className="auth-page"><div className="auth-card"><div className="auth-mark"><ChefHat /></div><h1>Vitaj pri varení</h1><p>Zadaj váš rodinný kód. Stačí iba prvýkrát — tento telefón si ťa zapamätá.</p><label>Rodinný kód</label><input type="password" inputMode="numeric" autoComplete="current-password" value={passcode} onChange={e => setPasscode(e.target.value)} placeholder="••••••" onKeyDown={e => e.key === 'Enter' && login()} />{error && <span className="auth-error">{error}</span>}<button className="primary" onClick={login} disabled={busy || !passcode.trim()}><KeyRound /> {busy ? 'Overujem…' : 'Odomknúť'}</button><small>Kód zostáva iba medzi vami.</small></div></div>
}
