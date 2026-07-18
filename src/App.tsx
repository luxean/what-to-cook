import { useEffect, useMemo, useState } from 'react'
import { Archive, ArrowLeft, Check, ChefHat, Cloud, CloudOff, Fish, History, Leaf, LoaderCircle, LogOut, MoreHorizontal, Pencil, Plus, RotateCcw, Sparkles, Trash2, X } from 'lucide-react'
import type { Meal } from './types'
import { recommend, type ScoredMeal } from './recommender'
import { useMealStore } from './useMealStore'
import { AuthGate } from './AuthGate'

type Screen = 'home' | 'meals' | 'archive'
type MealFilter = 'vegetarian' | 'fish'

export function App() {
  const { meals, setMeals, authenticated, authReady, syncing, cloudEnabled, login, logout } = useMealStore()
  const [screen, setScreen] = useState<Screen>('home')
  const [suggestion, setSuggestion] = useState<ScoredMeal | null>(null)
  const [excluded, setExcluded] = useState<string[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Meal | null>(null)
  const [toast, setToast] = useState('')
  const [mealFilters, setMealFilters] = useState<MealFilter[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('co-navarit-meal-filters') ?? '[]')
      if (Array.isArray(saved)) return saved.filter(value => value === 'vegetarian' || value === 'fish')
    } catch { /* use the legacy preference below */ }
    return localStorage.getItem('co-navarit-vegetarian-only') === 'true' ? ['vegetarian'] : []
  })
  const active = useMemo(() => meals.filter(m => !m.archived), [meals])
  const candidates = useMemo(() => active.filter(meal => mealFilters.length === 0 || (mealFilters.includes('vegetarian') && meal.vegetarian) || (mealFilters.includes('fish') && meal.fish)), [active, mealFilters])
  const todayMeal = useMemo(() => meals
    .flatMap(meal => meal.cookedDates.filter(date => isToday(Number(date))).map(date => ({ meal, date: Number(date) })))
    .sort((a, b) => b.date - a.date)[0]?.meal ?? null, [meals])
  const exhausted = candidates.length > 0 && candidates.every(meal => excluded.includes(meal.id)) && !suggestion

  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2800); return () => clearTimeout(timer) }, [toast])
  useEffect(() => { localStorage.setItem('co-navarit-meal-filters', JSON.stringify(mealFilters)) }, [mealFilters])

  if (!authReady) return <div className="app-loading"><LoaderCircle /></div>
  if (cloudEnabled && !authenticated) return <AuthGate onLogin={login} />

  const suggest = (reset = false) => {
    const skip = reset ? [] : excluded
    const result = recommend(candidates, skip)
    if (!result && skip.length) { setExcluded([]); setSuggestion(recommend(candidates)) }
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
    const updated = meals.map(m => m.id === id ? { ...m, archived } : m)
    setSuggestion(recommend(updated.filter(meal => !meal.archived && (mealFilters.length === 0 || (mealFilters.includes('vegetarian') && meal.vegetarian) || (mealFilters.includes('fish') && meal.fish))), nextExcluded))
  }
  const accept = () => {
    if (!suggestion) return
    setMeals(items => items.map(meal => meal.id === suggestion.meal.id ? { ...meal, cookedDates: [...meal.cookedDates, String(Date.now())], consecutiveRejections: 0 } : meal))
    setSuggestion(null); setExcluded([]); setToast('Dobrú chuť! Zapísané ako dnešné jedlo.')
  }
  const undoToday = () => {
    if (!todayMeal) return
    const updated = meals.map(meal => meal.id === todayMeal.id ? { ...meal, cookedDates: meal.cookedDates.filter(date => !isToday(Number(date))) } : meal)
    setMeals(updated)
    setExcluded([todayMeal.id])
    setSuggestion(null)
    setToast('Dnešný výber je zrušený.')
  }
  const resetSuggestions = () => {
    setExcluded([])
    setSuggestion(null)
  }
  const changeDiet = (filter?: MealFilter) => {
    setMealFilters(current => !filter ? [] : current.includes(filter) ? current.filter(value => value !== filter) : [...current, filter])
    setExcluded([])
    setSuggestion(null)
  }
  const saveMeal = (name: string, cookedToday = false, vegetarian = false, fish = false) => {
    const clean = name.trim(); if (!clean) return
    if (editing) setMeals(items => items.map(m => m.id === editing.id ? { ...m, name: clean, vegetarian, fish } : m))
    else setMeals(items => {
      const existing = cookedToday ? items.map(meal => ({ ...meal, cookedDates: meal.cookedDates.filter(date => !isToday(Number(date))) })) : items
      return [...existing, { id: crypto.randomUUID(), name: clean, vegetarian, fish, cookedDates: cookedToday ? [String(Date.now())] : [], rejectionDates: [], consecutiveRejections: 0, archived: false, createdAt: String(Date.now()) }]
    })
    if (!editing && cookedToday) setScreen('home')
    setEditing(null); setShowAdd(false); setToast(editing ? 'Názov je upravený.' : 'Nové jedlo je v zozname.')
  }

  return <div className="app-shell">
    <header>
      {screen !== 'home' ? <button className="icon-btn" onClick={() => setScreen('home')} aria-label="Späť"><ArrowLeft /></button> : <div className="brand-icon"><ChefHat /></div>}
      <div><h1>{screen === 'home' ? 'Čo navariť?' : screen === 'meals' ? 'Uložené jedlá' : 'Archív'}</h1></div>
      {screen === 'home' && <button className="icon-btn" onClick={() => setScreen('meals')} aria-label="Jedlá"><MoreHorizontal /></button>}
    </header>

    <main>
      {screen === 'home' && <Home activeCount={active.length} candidateCount={candidates.length} archivedCount={meals.length - active.length} mealFilters={mealFilters} todayMeal={todayMeal} exhausted={exhausted} suggestion={suggestion} onDietChange={changeDiet} onSuggest={() => suggest()} onAccept={accept} onReject={reject} onUndoToday={undoToday} onResetSuggestions={resetSuggestions} onMeals={() => setScreen('meals')} onArchive={() => setScreen('archive')} />}
      {screen === 'meals' && <MealList meals={active} cloudEnabled={cloudEnabled} syncing={syncing} onLogout={logout} onAdd={() => setShowAdd(true)} onEdit={setEditing} onDelete={id => setMeals(xs => xs.filter(x => x.id !== id))} onArchive={id => setMeals(xs => xs.map(x => x.id === id ? { ...x, archived: true } : x))} onArchiveScreen={() => setScreen('archive')} />}
      {screen === 'archive' && <ArchiveList meals={meals.filter(m => m.archived)} onRestore={id => setMeals(xs => xs.map(x => x.id === id ? { ...x, archived: false, consecutiveRejections: 0 } : x))} onDelete={id => setMeals(xs => xs.filter(x => x.id !== id))} />}
    </main>

    {(showAdd || editing) && <MealDialog initial={editing?.name} initialVegetarian={editing?.vegetarian} initialFish={editing?.fish} onSave={saveMeal} onClose={() => { setShowAdd(false); setEditing(null) }} />}
    {toast && <div className="toast"><Check size={18}/>{toast}</div>}
  </div>
}

function Home({ activeCount, candidateCount, archivedCount, mealFilters, todayMeal, exhausted, suggestion, onDietChange, onSuggest, onAccept, onReject, onUndoToday, onResetSuggestions, onMeals, onArchive }: { activeCount: number; candidateCount: number; archivedCount: number; mealFilters: MealFilter[]; todayMeal: Meal | null; exhausted: boolean; suggestion: ScoredMeal | null; onDietChange: (filter?: MealFilter) => void; onSuggest: () => void; onAccept: () => void; onReject: () => void; onUndoToday: () => void; onResetSuggestions: () => void; onMeals: () => void; onArchive: () => void }) {
  return <section className="home">
    <div className="diet-filter" aria-label="Filter jedál"><button className={!mealFilters.length ? 'selected' : ''} onClick={() => onDietChange()}>Všetky</button><button className={mealFilters.includes('vegetarian') ? 'selected' : ''} onClick={() => onDietChange('vegetarian')}><Leaf/> Vegetariánske</button><button className={mealFilters.includes('fish') ? 'selected' : ''} onClick={() => onDietChange('fish')}><Fish/> Ryby</button></div>
    {todayMeal ? <div className="suggestion-wrap chosen-wrap">
      <span className="suggestion-label"><Check size={15}/> DNES VARÍME</span>
      <article className="suggestion-card chosen-card"><div className="mini-plate"><ChefHat /></div><h2>{todayMeal.name}</h2><p>Dnešné jedlo je vybrané</p></article>
      <button className="secondary" onClick={onUndoToday}><RotateCcw/> Chcem niečo iné</button>
    </div> : exhausted ? <div className="suggestion-wrap">
      <span className="suggestion-label">VŠETKO PREJDENÉ</span>
      <article className="suggestion-card"><div className="mini-plate"><ChefHat /></div><h2>To boli všetky jedlá</h2><p>Možno dostane niektoré druhú šancu?</p></article>
      <button className="primary" onClick={onResetSuggestions}><RotateCcw/> Skúsiť odznova</button>
    </div> : !suggestion ? <>
      <div className="hero-art"><div className="plate"><ChefHat /></div><span className="steam s1">∿</span><span className="steam s2">∿</span><span className="dot d1"/><span className="dot d2"/></div>
      <div className="intro compact-intro"><h2>Čo dobré si dnes dáme?</h2></div>
      <button className="primary huge" onClick={onSuggest} disabled={!candidateCount}><Sparkles /> Navrhni mi jedlo</button>
      {!activeCount && <p className="empty-note">Najprv pridaj aspoň jedno jedlo.</p>}
      {activeCount > 0 && !candidateCount && <p className="empty-note">Pre tento filter nemáš uložené žiadne jedlá.</p>}
    </> : <div className="suggestion-wrap">
      <span className="suggestion-label"><Sparkles size={15}/> DNES BY TO MOHLO BYŤ</span>
      <article className="suggestion-card"><div className="mini-plate"><ChefHat /></div><h2>{suggestion.meal.name}</h2>{suggestion.reasons.length > 0 && <p>{suggestion.reasons.join(' a ')}</p>}</article>
      <button className="primary" onClick={onAccept}><Check/> To znie dobre</button>
      <button className="secondary" onClick={onReject}><X/> Dnes nie, skús iné</button>
    </div>}
    <button className="collection-link" onClick={onMeals}><span><History/> Uložené jedlá</span><small>{mealCountLabel(activeCount)}</small></button>
    <button className="home-archive-link" onClick={onArchive}><span><Archive/> Archivované jedlá</span><small>{mealCountLabel(archivedCount)}</small></button>
  </section>
}

function isToday(timestamp: number, now = new Date()) {
  const date = new Date(timestamp)
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

function mealCountLabel(count: number) {
  if (count === 1) return '1 jedlo'
  if (count >= 2 && count <= 4) return `${count} jedlá`
  return `${count} jedál`
}

function MealList({ meals, cloudEnabled, syncing, onLogout, onAdd, onEdit, onDelete, onArchive, onArchiveScreen }: { meals: Meal[]; cloudEnabled: boolean; syncing: boolean; onLogout: () => void; onAdd: () => void; onEdit: (m: Meal) => void; onDelete: (id: string) => void; onArchive: (id: string) => void; onArchiveScreen: () => void }) {
  return <section><div className="section-head"><p>Jedlá, z ktorých vyberáme</p><button className="primary compact" onClick={onAdd}><Plus/> Pridať</button></div>
    <div className="meal-list">{meals.map(meal => <article className="meal-row" key={meal.id}><div className="meal-avatar">{meal.name[0]?.toUpperCase()}</div><div className="meal-info"><strong>{meal.name}{meal.vegetarian && <Leaf className="veg-leaf"/>}{meal.fish && <Fish className="fish-icon"/>}</strong><small>{meal.cookedDates.length ? `Uvarené ${meal.cookedDates.length}×` : 'Ešte neuvarené'}</small></div><button className="tiny-btn" onClick={() => onEdit(meal)} aria-label="Upraviť"><Pencil/></button><button className="tiny-btn" onClick={() => onArchive(meal.id)} aria-label="Archivovať"><Archive/></button><button className="tiny-btn danger" onClick={() => confirm(`Naozaj vymazať „${meal.name}“?`) && onDelete(meal.id)} aria-label="Vymazať"><Trash2/></button></article>)}</div>
    {!meals.length && <Empty text="Zatiaľ tu nie sú žiadne jedlá." />}
    <button className="archive-link" onClick={onArchiveScreen}><Archive/> Pozrieť archív</button>
    <div className="cloud-status">{cloudEnabled ? <><span>{syncing ? <LoaderCircle className="spin"/> : <Cloud/>}{syncing ? 'Ukladám…' : 'Jedlá sú bezpečne uložené'}</span><button onClick={onLogout}><LogOut/> Odhlásiť</button></> : <span><CloudOff/> Uložené iba v tomto zariadení</span>}</div>
  </section>
}

function ArchiveList({ meals, onRestore, onDelete }: { meals: Meal[]; onRestore: (id: string) => void; onDelete: (id: string) => void }) {
  return <section><p className="page-copy">Jedlá, na ktoré teraz nemáš chuť. Kedykoľvek ich môžeš vrátiť.</p><div className="meal-list">{meals.map(meal => <article className="meal-row" key={meal.id}><div className="meal-avatar muted">{meal.name[0]}</div><div className="meal-info"><strong>{meal.name}{meal.vegetarian && <Leaf className="veg-leaf"/>}{meal.fish && <Fish className="fish-icon"/>}</strong><small>{meal.consecutiveRejections ? `${meal.consecutiveRejections}× odmietnuté` : 'Archivované'}</small></div><button className="tiny-btn restore" onClick={() => onRestore(meal.id)} aria-label="Obnoviť"><RotateCcw/></button><button className="tiny-btn danger" onClick={() => confirm(`Naozaj vymazať „${meal.name}“?`) && onDelete(meal.id)} aria-label="Vymazať"><Trash2/></button></article>)}</div>{!meals.length && <Empty text="Archív je prázdny." />}</section>
}

function Empty({ text }: { text: string }) { return <div className="empty"><ChefHat/><strong>{text}</strong><span>Všetko je na svojom mieste.</span></div> }

function MealDialog({ initial = '', initialVegetarian = false, initialFish = false, onSave, onClose }: { initial?: string; initialVegetarian?: boolean; initialFish?: boolean; onSave: (name: string, cookedToday?: boolean, vegetarian?: boolean, fish?: boolean) => void; onClose: () => void }) {
  const [name, setName] = useState(initial)
  const [cookedToday, setCookedToday] = useState(false)
  const [vegetarian, setVegetarian] = useState(initialVegetarian)
  const [fish, setFish] = useState(initialFish)
  return <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}><form className="dialog" onSubmit={e => { e.preventDefault(); onSave(name, cookedToday, vegetarian, fish) }}><div className="dialog-icon"><ChefHat/></div><h2>{initial ? 'Upraviť jedlo' : 'Pridať nové jedlo'}</h2><p>Ako sa jedlo volá?</p><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Napr. paradajková polievka" maxLength={80}/><button type="button" className={`today-toggle${vegetarian ? ' selected' : ''}`} onClick={() => { setVegetarian(value => !value); setFish(false) }}><span className="toggle-check">{vegetarian && <Check/>}</span><Leaf/> Vegetariánske jedlo</button><button type="button" className={`today-toggle${fish ? ' selected' : ''}`} onClick={() => { setFish(value => !value); setVegetarian(false) }}><span className="toggle-check">{fish && <Check/>}</span><Fish/> Rybie jedlo</button>{!initial && <button type="button" className={`today-toggle${cookedToday ? ' selected' : ''}`} onClick={() => setCookedToday(value => !value)}><span className="toggle-check">{cookedToday && <Check/>}</span>Dnes ho varím</button>}<button className="primary" disabled={!name.trim()}>{initial ? 'Uložiť zmenu' : 'Pridať jedlo'}</button><button type="button" className="text-btn" onClick={onClose}>Zrušiť</button></form></div>
}
