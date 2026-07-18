import { passcodeMatches, sessionCookie } from './_session.js'
import { json, type ApiRequest, type ApiResponse } from './_http.js'

export default function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' })
  const body = typeof request.body === 'string' ? safeParse(request.body) : request.body
  const passcode = String((body as { passcode?: unknown } | undefined)?.passcode ?? '')
  if (!passcodeMatches(passcode)) return json(response, 401, { error: 'Invalid passcode' })
  return json(response, 200, { ok: true }, { 'Set-Cookie': sessionCookie() })
}

function safeParse(value: string): unknown {
  try { return JSON.parse(value) } catch { return undefined }
}
