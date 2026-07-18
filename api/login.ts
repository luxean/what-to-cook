import { passcodeMatches, sessionCookie } from './_session.js'

export default async function handler(request: Request) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 })
  let passcode = ''
  try { passcode = String((await request.json()).passcode ?? '') } catch { /* invalid input */ }
  if (!passcodeMatches(passcode)) return Response.json({ error: 'Invalid passcode' }, { status: 401 })
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie() } })
}
