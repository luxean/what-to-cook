import { clearSessionCookie } from './_session.js'
export default function handler() {
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } })
}
