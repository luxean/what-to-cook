import { useEffect, useRef, useState } from 'react'
import type { Meal } from './types'

const STORAGE_KEY = 'co-navarit-meals-v1'
const cloudEnabled = import.meta.env.VITE_CLOUD_ENABLED === 'true'
const starterMeals = ['Kurací paprikáš', 'Špagety bolognese', 'Bryndzové halušky', 'Rizoto', 'Šošovicová polievka'].map((name, i): Meal => ({ id: crypto.randomUUID(), name, cookedDates: i < 3 ? [String(Date.now() - (i * 8 + 5) * 86_400_000)] : [], rejectionDates: [], consecutiveRejections: 0, archived: false, createdAt: String(Date.now()) }))
function localMeals(): Meal[] { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : starterMeals } catch { return starterMeals } }

export function useMealStore() {
  const [meals, setMeals] = useState<Meal[]>(localMeals)
  const [authenticated, setAuthenticated] = useState(!cloudEnabled)
  const [authReady, setAuthReady] = useState(!cloudEnabled)
  const [syncing, setSyncing] = useState(false)
  const hydrated = useRef(!cloudEnabled)

  const hydrate = async () => {
    if (!cloudEnabled) return
    setSyncing(true)
    try {
      const response = await fetch('/api/meals')
      if (response.status === 401) { setAuthenticated(false); setAuthReady(true); return }
      if (!response.ok) throw new Error()
      const data = await response.json()
      setAuthenticated(true); hydrated.current = true
      if (Array.isArray(data.meals)) setMeals(data.meals)
      else setMeals(current => [...current])
    } finally { setAuthReady(true); setSyncing(false) }
  }

  useEffect(() => { hydrate().catch(() => setAuthReady(true)) }, [])
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(meals)) }, [meals])
  useEffect(() => {
    if (!cloudEnabled || !authenticated || !hydrated.current) return
    const timer = window.setTimeout(async () => {
      setSyncing(true)
      try { await fetch('/api/meals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meals }) }) } finally { setSyncing(false) }
    }, 500)
    return () => clearTimeout(timer)
  }, [meals, authenticated])

  const logout = async () => { await fetch('/api/logout', { method: 'POST' }); hydrated.current = false; setAuthenticated(false) }
  return { meals, setMeals, authenticated, authReady, syncing, cloudEnabled, login: hydrate, logout }
}
