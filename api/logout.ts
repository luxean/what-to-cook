import { clearSessionCookie } from './_session.js'
import { json, type ApiRequest, type ApiResponse } from './_http.js'

export default function handler(_request: ApiRequest, response: ApiResponse) {
  return json(response, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() })
}
