/**
 * All behavioral tuning values used by the recommendation system.
 * Keep units in property names so adjustments remain unambiguous.
 */
export const RECOMMENDER_CONFIG = Object.freeze({
  favoriteHistoryWindowDays: 365,
  favoriteFrequencyLogarithmMultiplier: 1.35,
  favoriteExplanationMinimumCookCount: 3,

  recencyDaysPerScorePoint: 10,
  maximumRecencyScore: 4.5,
  approximateDaysPerMonthForDisplay: 30,

  neverCookedExplorationBonus: 0.75,

  rejectionPenaltyDecayDays: 14,
  baseRejectionPenalty: 2.2,
  additionalPenaltyPerConsecutiveRejection: 1.15,
  automaticArchiveRejectionThreshold: 4,

  maximumWeightedCandidates: 5,
  lowestCandidateSelectionWeight: 0.25,
  selectionWeightBaselineOffset: 0.6,
})
