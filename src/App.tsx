import { useEffect, useMemo, useState } from 'react'
import { Archive, ArrowLeft, Check, ChefHat, Cloud, CloudOff, History, LoaderCircle, LogOut, MoreHorizontal, Pencil, Plus, RotateCcw, Sparkles, Trash2, X } from 'lucide-react'
import type { Meal } from './types'
import { recommend, type ScoredMeal } from './recommender'
import { useMealStore } from './useMealStore'
import { AuthGate } from './AuthGate'

type Screen = 'home' | 'meals' | 'archive'

export function App() {
  const { meals, setMeals, authenticated, authReady, syncing, cloudEnabled, login, logout } = useMealStore()
  const [screen, setScreen] = useState<Screen>('home')
  const [suggestion, setSuggestion] = useState<ScoredMeal | null>(null)
  const [excluded, setExcluded] = useState<string[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Meal | null>(null)
  const [toast, setToast] = useState('')
  const active = useMemo(() => meals.filter(m => !m.archived), [meals])

  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2800); return () => clearTimeout(timer) }, [toast])

  if (!authReady) return <div className="app-loading"><LoaderCircle /></div>
  if (cloudEnabled && !authenticated) return <AuthGate onLogin={login} />

  const suggest = (reset = false) => {
    const skip = reset ? [] : excluded
    const result = recommend(meals, skip)
    if (!result && skip.length) { setExcluded([]); setSuggestion(recommend(meals)) }
    else setSuggestion(result)
  }
  const reject = () => {
    if (!suggestion) return
    const id = suggestion.meal.id
    let archived = false
    setMeals(items => items.map(meal => {
      if (meal.id !== id) return meal
      const count = meal.consecutiveRejections + 1
      archived = count >= 3
      return { ...meal, rejectionDates: [...meal.rejectionDates, String(Date.now())], consecutiveRejections: count, archived }
    }))
    const nextExcluded = [...excluded, id]; setExcluded(nextExcluded)
    if (archived) setToast('Jedlo sme po 3 odmietnutiach presunuli do archívu.')
    setSuggestion(recommend(meals.map(m => m.id === id ? { ...m, archived } : m), nextExcluded))
  }
  const accept = () => {
    if (!suggestion) return
    setMeals(items => items.map(meal => meal.id === suggestion.meal.id ? { ...meal, cookedDates: [...meal.cookedDates, String(Date.now())], consecutiveRejections: 0 } : meal))
    setSuggestion(null); setExcluded([]); setToast('Dobrú chuť! Zapísané ako dnešné jedlo.')
  }
  const saveMeal = (name: string) => {
    const clean = name.trim(); if (!clean) return
    if (editing) setMeals(items => items.map(m => m.id === editing.id ? { ...m, name: clean } : m))
    else setMeals(items => [...items, { id: crypto.randomUUID(), name: clean, cookedDates: [], rejectionDates: [], consecutiveRejections: 0, archived: false, createdAt: String(Date.now()) }])
    setEditing(null); setShowAdd(false); setToast(editing ? 'Názov je upravený.' : 'Nové jedlo je v zozname.')
  }

  return <div className="app-shell">
    <header>
      {screen !== 'home' ? <button className="icon-btn" onClick={() => setScreen('home')} aria-label="Späť"><ArrowLeft /></button> : <div className="brand-icon"><ChefHat /></div>}
      <div><span className="eyebrow">MAMIN POMOCNÍK</span><h1>{screen === 'home' ? 'Čo navariť?' : screen === 'meals' ? 'Moje jedlá' : 'Archív'}</h1></div>
      {screen === 'home' && <button className="icon-btn" onClick={() => setScreen('meals')} aria-label="Jedlá"><MoreHorizontal /></button>}
    </header>

    <main>
      {screen === 'home' && <Home activeCount={active.length} suggestion={suggestion} onSuggest={() => suggest(true)} onAccept={accept} onReject={reject} onMeals={() => setScreen('meals')} />}
      {screen === 'meals' && <MealList meals={active} cloudEnabled={cloudEnabled} syncing={syncing} onLogout={logout} onAdd={() => setShowAdd(true)} onEdit={setEditing} onDelete={id => setMeals(xs => xs.filter(x => x.id !== id))} onArchive={id => setMeals(xs => xs.map(x => x.id === id ? { ...x, archived: true } : x))} onArchiveScreen={() => setScreen('archive')} />}
      {screen === 'archive' && <ArchiveList meals={meals.filter(m => m.archived)} onRestore={id => setMeals(xs => xs.map(x => x.id === id ? { ...x, archived: false, consecutiveRejections: 0 } : x))} onDelete={id => setMeals(xs => xs.filter(x => x.id !== id))} />}
    </main>

    {(showAdd || editing) && <MealDialog initial={editing?.name} onSave={saveMeal} onClose={() => { setShowAdd(false); setEditing(null) }} />}
    {toast && <div className="toast"><Check size={18}/>{toast}</div>}
  </div>
}

function Home({ activeCount, suggestion, onSuggest, onAccept, onReject, onMeals }: { activeCount: number; suggestion: ScoredMeal | null; onSuggest: () => void; onAccept: () => void; onReject: () => void; onMeals: () => void }) {
  return <section className="home">
    {!suggestion ? <>
      <div className="hero-art"><div className="plate"><ChefHat /></div><span className="steam s1">∿</span><span className="steam s2">∿</span><span className="dot d1"/><span className="dot d2"/></div>
      <div className="intro"><h2>Čo dobré si dnes dáme?</h2><p>Vyberiem niečo, čo máš rada a už dlho nebolo.</p></div>
      <button className="primary huge" onClick={onSuggest} disabled={!activeCount}><Sparkles /> Navrhni mi jedlo</button>
      {!activeCount && <p className="empty-note">Najprv pridaj aspoň jedno jedlo.</p>}
    </> : <div className="suggestion-wrap">
      <span className="suggestion-label"><Sparkles size={15}/> DNES BY TO MOHLO BYŤ</span>
      <article className="suggestion-card"><div className="mini-plate"><ChefHat /></div><h2>{suggestion.meal.name}</h2><p>{suggestion.reasons.length ? suggestion.reasons.join(' a ') : 'dnes dostalo šancu'}</p></article>
      <button className="primary" onClick={onAccept}><Check/> To znie dobre</button>
      <button className="secondary" onClick={onReject}><X/> Dnes nie, skús iné</button>
    </div>}
    <button className="collection-link" onClick={onMeals}><span><History/> Moje jedlá</span><small>{activeCount} {activeCount === 1 ? 'jedlo' : 'jedál'} v zbierke</small></button>
  </section>
}

function MealList({ meals, cloudEnabled, syncing, onLogout, onAdd, onEdit, onDelete, onArchive, onArchiveScreen }: { meals: Meal[]; cloudEnabled: boolean; syncing: boolean; onLogout: () => void; onAdd: () => void; onEdit: (m: Meal) => void; onDelete: (id: string) => void; onArchive: (id: string) => void; onArchiveScreen: () => void }) {
  return <section><div className="section-head"><p>Jedlá, z ktorých vyberáme</p><button className="primary compact" onClick={onAdd}><Plus/> Pridať</button></div>
    <div className="meal-list">{meals.map(meal => <article className="meal-row" key={meal.id}><div className="meal-avatar">{meal.name[0]?.toUpperCase()}</div><div className="meal-info"><strong>{meal.name}</strong><small>{meal.cookedDates.length ? `Uvarené ${meal.cookedDates.length}×` : 'Ešte neuvarené'}</small></div><button className="tiny-btn" onClick={() => onEdit(meal)} aria-label="Upraviť"><Pencil/></button><button className="tiny-btn" onClick={() => onArchive(meal.id)} aria-label="Archivovať"><Archive/></button><button className="tiny-btn danger" onClick={() => confirm(`Naozaj vymazať „${meal.name}“?`) && onDelete(meal.id)} aria-label="Vymazať"><Trash2/></button></article>)}</div>
    {!meals.length && <Empty text="Zatiaľ tu nie sú žiadne jedlá." />}
    <button className="archive-link" onClick={onArchiveScreen}><Archive/> Pozrieť archív</button>
    <div className="cloud-status">{cloudEnabled ? <><span>{syncing ? <LoaderCircle className="spin"/> : <Cloud/>}{syncing ? 'Ukladám…' : 'Jedlá sú bezpečne uložené'}</span><button onClick={onLogout}><LogOut/> Odhlásiť</button></> : <span><CloudOff/> Uložené iba v tomto zariadení</span>}</div>
  </section>
}

function ArchiveList({ meals, onRestore, onDelete }: { meals: Meal[]; onRestore: (id: string) => void; onDelete: (id: string) => void }) {
  return <section><p className="page-copy">Jedlá, na ktoré teraz nemáš chuť. Kedykoľvek ich môžeš vrátiť.</p><div className="meal-list">{meals.map(meal => <article className="meal-row" key={meal.id}><div className="meal-avatar muted">{meal.name[0]}</div><div className="meal-info"><strong>{meal.name}</strong><small>{meal.consecutiveRejections ? `${meal.consecutiveRejections}× odmietnuté` : 'Archivované'}</small></div><button className="tiny-btn restore" onClick={() => onRestore(meal.id)} aria-label="Obnoviť"><RotateCcw/></button><button className="tiny-btn danger" onClick={() => confirm(`Naozaj vymazať „${meal.name}“?`) && onDelete(meal.id)} aria-label="Vymazať"><Trash2/></button></article>)}</div>{!meals.length && <Empty text="Archív je prázdny." />}</section>
}

function Empty({ text }: { text: string }) { return <div className="empty"><ChefHat/><strong>{text}</strong><span>Všetko je na svojom mieste.</span></div> }

function MealDialog({ initial = '', onSave, onClose }: { initial?: string; onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState(initial)
  return <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}><form className="dialog" onSubmit={e => { e.preventDefault(); onSave(name) }}><div className="dialog-icon"><ChefHat/></div><h2>{initial ? 'Upraviť jedlo' : 'Pridať nové jedlo'}</h2><p>Ako sa jedlo volá?</p><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Napr. paradajková polievka" maxLength={80}/><button className="primary" disabled={!name.trim()}>{initial ? 'Uložiť zmenu' : 'Pridať jedlo'}</button><button type="button" className="text-btn" onClick={onClose}>Zrušiť</button></form></div>
}
