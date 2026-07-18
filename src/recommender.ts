import type { Meal } from './types'

const DAY = 86_400_000

export type ScoredMeal = { meal: Meal; score: number; reasons: string[] }

export function scoreMeal(meal: Meal, now = new Date()): ScoredMeal {
  const cookCount = meal.cookedDates.length
  const lastCooked = cookCount ? Math.max(...meal.cookedDates.map(Number)) : null
  const daysAgo = lastCooked === null ? 90 : Math.max(0, (now.getTime() - lastCooked) / DAY)

  // Logarithmic frequency stops a single favorite from dominating forever.
  const favoriteScore = Math.log2(cookCount + 1) * 1.35
  // Recency grows quickly at first, then caps after roughly six weeks.
  const recencyScore = Math.min(daysAgo / 10, 4.5)
  // A rejection fades over 14 days; consecutive rejections have extra weight.
  const lastRejected = meal.rejectionDates.length ? Math.max(...meal.rejectionDates.map(Number)) : null
  const rejectionAge = lastRejected === null ? Infinity : Math.max(0, (now.getTime() - lastRejected) / DAY)
  const rejectionPenalty = rejectionAge < 14 ? (1 - rejectionAge / 14) * (2.2 + meal.consecutiveRejections * 1.15) : 0
  const exploration = cookCount === 0 ? 1.8 : 0

  const reasons: string[] = []
  if (cookCount >= 3) reasons.push('patrí medzi obľúbené')
  if (lastCooked === null) reasons.push('ešte nebolo')
  else if (daysAgo >= 21) reasons.push('dlho nebolo')
  else if (daysAgo >= 7) reasons.push(`naposledy pred ${Math.floor(daysAgo)} dňami`)

  return { meal, score: favoriteScore + recencyScore + exploration - rejectionPenalty, reasons }
}

export function recommend(meals: Meal[], excludedIds: string[] = [], now = new Date(), random = Math.random): ScoredMeal | null {
  const candidates = meals.filter(meal => !meal.archived && !excludedIds.includes(meal.id))
  if (!candidates.length) return null
  const scored = candidates.map(meal => scoreMeal(meal, now)).sort((a, b) => b.score - a.score)
  // Weighted draw from the best five keeps suggestions pleasantly varied.
  const shortlist = scored.slice(0, 5)
  const min = Math.min(...shortlist.map(item => item.score))
  const weights = shortlist.map(item => Math.max(.25, item.score - min + .6))
  let pick = random() * weights.reduce((sum, weight) => sum + weight, 0)
  for (let i = 0; i < shortlist.length; i++) {
    pick -= weights[i]
    if (pick <= 0) return shortlist[i]
  }
  return shortlist[0]
}
