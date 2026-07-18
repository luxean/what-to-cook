import { createClient } from '@supabase/supabase-js'
import { hasSession } from './_session.js'
import { json, type ApiRequest, type ApiResponse } from './_http.js'

function database() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Cloud database is not configured')
  return createClient(url, key, { auth: { persistSession: false } })
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (!hasSession(request.headers.cookie)) return json(response, 401, { error: 'Unauthorized' })
  try {
    const db = database()
    if (request.method === 'GET') {
      const { data, error } = await db.from('app_data').select('meals').eq('id', 'home').maybeSingle()
      if (error) throw error
      return json(response, 200, { meals: data?.meals ?? null })
    }
    if (request.method === 'PUT') {
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
      if (!Array.isArray((body as { meals?: unknown })?.meals)) return json(response, 400, { error: 'Invalid meals' })
      const { error } = await db.from('app_data').upsert({ id: 'home', meals: (body as { meals: unknown[] }).meals, updated_at: new Date().toISOString() })
      if (error) throw error
      return json(response, 200, { ok: true })
    }
    return json(response, 405, { error: 'Method not allowed' })
  } catch (error) {
    console.error(error)
    return json(response, 503, { error: 'Database unavailable' })
  }
}
