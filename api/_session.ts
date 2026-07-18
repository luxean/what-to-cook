import { createHmac, createHash, timingSafeEqual } from 'node:crypto'

const COOKIE = 'co_nav_session'
const encoder = new TextEncoder()

export function passcodeMatches(passcode: string) {
  const configured = process.env.APP_PASSCODE_HASH ?? ''
  const actual = createHash('sha256').update(passcode).digest('hex')
  if (!configured || actual.length !== configured.length) return false
  return timingSafeEqual(encoder.encode(actual), encoder.encode(configured))
}

export function sessionCookie() {
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000
  const payload = Buffer.from(JSON.stringify({ expires })).toString('base64url')
  const signature = sign(payload)
  return `${COOKIE}=${payload}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
}

export function hasSession(request: Request) {
  const value = request.headers.get('cookie')?.split(';').map(item => item.trim()).find(item => item.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  if (!value) return false
  const [payload, signature] = value.split('.')
  if (!payload || !signature || signature.length !== sign(payload).length) return false
  if (!timingSafeEqual(encoder.encode(signature), encoder.encode(sign(payload)))) return false
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).expires > Date.now() } catch { return false }
}

function sign(payload: string) {
  const secret = process.env.SESSION_SECRET
  if (!secret) return ''
  return createHmac('sha256', secret).update(payload).digest('base64url')
}
