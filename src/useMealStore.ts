import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { cloudEnabled, supabase } from './supabase'
import type { Meal } from './types'

const STORAGE_KEY = 'co-navarit-meals-v1'
const starterMeals = ['Kurací paprikáš', 'Špagety bolognese', 'Bryndzové halušky', 'Rizoto', 'Šošovicová polievka'].map((name, i): Meal => ({ id: crypto.randomUUID(), name, cookedDates: i < 3 ? [String(Date.now() - (i * 8 + 5) * 86_400_000)] : [], rejectionDates: [], consecutiveRejections: 0, archived: false, createdAt: String(Date.now()) }))
function localMeals(): Meal[] { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : starterMeals } catch { return starterMeals } }
type DbMeal = { id: string; name: string; cooked_dates: number[]; rejection_dates: number[]; consecutive_rejections: number; archived: boolean; created_at: string }
const fromDb = (row: DbMeal): Meal => ({ id: row.id, name: row.name, cookedDates: (row.cooked_dates ?? []).map(String), rejectionDates: (row.rejection_dates ?? []).map(String), consecutiveRejections: row.consecutive_rejections, archived: row.archived, createdAt: String(new Date(row.created_at).getTime()) })

export function useMealStore() {
  const [meals, setMeals] = useState<Meal[]>(localMeals)
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!cloudEnabled)
  const [syncing, setSyncing] = useState(false)
  const hydratedUser = useRef<string | null>(null)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setAuthReady(true) })
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(meals)) }, [meals])
  useEffect(() => {
    if (!supabase || !session || hydratedUser.current === session.user.id) return
    let cancelled = false; setSyncing(true)
    supabase.from('meals').select('*').order('created_at').then(({ data, error }) => {
      if (cancelled) return
      if (error) { console.error(error); setSyncing(false); return }
      hydratedUser.current = session.user.id
      if (data?.length) setMeals((data as DbMeal[]).map(fromDb))
      else setMeals(current => [...current])
      setSyncing(false)
    })
    return () => { cancelled = true }
  }, [session])
  useEffect(() => {
    if (!supabase || !session || hydratedUser.current !== session.user.id) return
    const client = supabase
    const timer = window.setTimeout(async () => {
      setSyncing(true)
      const rows = meals.map(meal => ({ id: meal.id, user_id: session.user.id, name: meal.name, cooked_dates: meal.cookedDates.map(Number), rejection_dates: meal.rejectionDates.map(Number), consecutive_rejections: meal.consecutiveRejections, archived: meal.archived, created_at: new Date(Number(meal.createdAt)).toISOString(), updated_at: new Date().toISOString() }))
      const { data: remote } = await client.from('meals').select('id')
      const removed = (remote ?? []).map(row => row.id).filter(id => !meals.some(meal => meal.id === id))
      if (removed.length) await client.from('meals').delete().in('id', removed)
      const { error } = rows.length ? await client.from('meals').upsert(rows) : { error: null }
      if (error) console.error(error)
      setSyncing(false)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [meals, session])
  return { meals, setMeals, session, authReady, syncing, cloudEnabled }
}
