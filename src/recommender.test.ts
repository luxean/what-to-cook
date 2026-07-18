import { describe, expect, it } from 'vitest'
import { recommend, scoreMeal } from './recommender'
import type { Meal } from './types'

const meal = (overrides: Partial<Meal>): Meal => ({ id: '1', name: 'Jedlo', cookedDates: [], rejectionDates: [], consecutiveRejections: 0, archived: false, createdAt: '0', ...overrides })
const now = new Date('2026-07-18T12:00:00Z')

describe('recommender', () => {
  it('rewards favorites and time since last cooked', () => {
    const oldFavorite = meal({ cookedDates: ['1750000000000', '1740000000000', '1730000000000'] })
    const recent = meal({ id: '2', cookedDates: [String(now.getTime())] })
    expect(scoreMeal(oldFavorite, now).score).toBeGreaterThan(scoreMeal(recent, now).score)
  })
  it('penalizes recent rejection', () => {
    const normal = meal({})
    const rejected = meal({ rejectionDates: [String(now.getTime())], consecutiveRejections: 2 })
    expect(scoreMeal(rejected, now).score).toBeLessThan(scoreMeal(normal, now).score)
  })
  it('describes recency in days and then months', () => {
    const tenDaysAgo = String(now.getTime() - 10 * 86_400_000)
    const sixtyDaysAgo = String(now.getTime() - 60 * 86_400_000)
    expect(scoreMeal(meal({ cookedDates: [tenDaysAgo] }), now).reasons).toContain('naposledy pred 10 dňami')
    expect(scoreMeal(meal({ cookedDates: [sixtyDaysAgo] }), now).reasons).toContain('naposledy pred 2 mesiacmi')
  })
  it('never recommends archived or excluded meals', () => {
    const archived = meal({ archived: true })
    const excluded = meal({ id: '2' })
    expect(recommend([archived, excluded], ['2'], now, () => 0)).toBeNull()
  })
})
