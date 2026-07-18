import type { Meal } from './types'
import { RECOMMENDER_CONFIG } from './recommenderConfig'

const MILLISECONDS_PER_DAY = 86_400_000

export type ScoredMeal = { meal: Meal; score: number; reasons: string[] }

export function scoreMeal(meal: Meal, now = new Date()): ScoredMeal {
  const allCookedDates = meal.cookedDates.map(Number)
  const favoriteHistoryStart = now.getTime() - RECOMMENDER_CONFIG.favoriteHistoryWindowDays * MILLISECONDS_PER_DAY
  const cookCount = allCookedDates.filter(timestamp => timestamp >= favoriteHistoryStart && timestamp <= now.getTime()).length
  const lastCooked = allCookedDates.length ? Math.max(...allCookedDates) : null
  const daysAgo = lastCooked === null ? Number.POSITIVE_INFINITY : Math.max(0, (now.getTime() - lastCooked) / MILLISECONDS_PER_DAY)

  // Logarithmic frequency stops a single favorite from dominating forever.
  const favoriteScore = Math.log2(cookCount + 1) * RECOMMENDER_CONFIG.favoriteFrequencyLogarithmMultiplier
  // Recency grows linearly and stops at the configured maximum.
  const recencyScore = Math.min(daysAgo / RECOMMENDER_CONFIG.recencyDaysPerScorePoint, RECOMMENDER_CONFIG.maximumRecencyScore)
  // A rejection fades over a configured period; consecutive rejections add weight.
  const lastRejected = meal.rejectionDates.length ? Math.max(...meal.rejectionDates.map(Number)) : null
  const rejectionAge = lastRejected === null ? Infinity : Math.max(0, (now.getTime() - lastRejected) / MILLISECONDS_PER_DAY)
  const rejectionPenalty = rejectionAge < RECOMMENDER_CONFIG.rejectionPenaltyDecayDays
    ? (1 - rejectionAge / RECOMMENDER_CONFIG.rejectionPenaltyDecayDays)
      * (RECOMMENDER_CONFIG.baseRejectionPenalty + meal.consecutiveRejections * RECOMMENDER_CONFIG.additionalPenaltyPerConsecutiveRejection)
    : 0
  const exploration = allCookedDates.length === 0 ? RECOMMENDER_CONFIG.neverCookedExplorationBonus : 0

  const reasons: string[] = []
  if (cookCount >= RECOMMENDER_CONFIG.favoriteExplanationMinimumCookCount) reasons.push('patrí medzi obľúbené')
  if (lastCooked === null) reasons.push('ešte nebolo')
  else reasons.push(recencyReason(daysAgo))

  return { meal, score: favoriteScore + recencyScore + exploration - rejectionPenalty, reasons }
}

function recencyReason(daysAgo: number) {
  const days = Math.floor(daysAgo)
  if (days === 0) return 'naposledy dnes'
  if (days === 1) return 'naposledy včera'
  if (days < RECOMMENDER_CONFIG.approximateDaysPerMonthForDisplay) return `naposledy pred ${days} dňami`
  const months = Math.floor(days / RECOMMENDER_CONFIG.approximateDaysPerMonthForDisplay)
  return months === 1 ? 'naposledy pred mesiacom' : `naposledy pred ${months} mesiacmi`
}

export function recommend(meals: Meal[], excludedIds: string[] = [], now = new Date(), random = Math.random): ScoredMeal | null {
  const candidates = meals.filter(meal => !meal.archived && !excludedIds.includes(meal.id))
  if (!candidates.length) return null
  const scored = candidates.map(meal => scoreMeal(meal, now)).sort((a, b) => b.score - a.score)
  // Weighted draw from the best five keeps suggestions pleasantly varied.
  const shortlist = scored.slice(0, RECOMMENDER_CONFIG.maximumWeightedCandidates)
  const min = Math.min(...shortlist.map(item => item.score))
  const weights = shortlist.map(item => Math.max(
    RECOMMENDER_CONFIG.lowestCandidateSelectionWeight,
    item.score - min + RECOMMENDER_CONFIG.selectionWeightBaselineOffset,
  ))
  let pick = random() * weights.reduce((sum, weight) => sum + weight, 0)
  for (let i = 0; i < shortlist.length; i++) {
    pick -= weights[i]
    if (pick <= 0) return shortlist[i]
  }
  return shortlist[0]
}
