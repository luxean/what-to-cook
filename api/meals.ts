import { createClient } from '@supabase/supabase-js'
import { hasSession } from './_session.js'

function database() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Cloud database is not configured')
  return createClient(url, key, { auth: { persistSession: false } })
}

export default async function handler(request: Request) {
  if (!hasSession(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const db = database()
    if (request.method === 'GET') {
      const { data, error } = await db.from('app_data').select('meals').eq('id', 'home').maybeSingle()
      if (error) throw error
      return Response.json({ meals: data?.meals ?? null })
    }
    if (request.method === 'PUT') {
      const body = await request.json()
      if (!Array.isArray(body.meals)) return Response.json({ error: 'Invalid meals' }, { status: 400 })
      const { error } = await db.from('app_data').upsert({ id: 'home', meals: body.meals, updated_at: new Date().toISOString() })
      if (error) throw error
      return Response.json({ ok: true })
    }
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Database unavailable' }, { status: 503 })
  }
}
