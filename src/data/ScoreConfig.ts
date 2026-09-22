export interface ScoreConfig {
  good: number
  great: number
  perfect: number
  ultra: number
  /** Combo thresholds for multiplier tiers */
  comboTierAt: readonly number[]
  /** Multipliers aligned with comboTierAt */
  comboMultipliers: readonly number[]
}

export const defaultScoreConfig: ScoreConfig = {
  good: 40,
  great: 100,
  perfect: 200,
  ultra: 400,
  comboTierAt: [0, 10, 25, 50, 100],
  comboMultipliers: [1, 2, 3, 4, 5],
}
