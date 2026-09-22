import type { ScoreConfig } from '../data/ScoreConfig'
import { Grade } from '../core/types'

export class ScoreSystem {
  private score = 0
  private config: ScoreConfig

  constructor(config: ScoreConfig) {
    this.config = config
  }

  getScore(): number {
    return this.score
  }

  reset(): void {
    this.score = 0
  }

  getBasePoints(grade: Grade): number {
    switch (grade) {
      case Grade.Ultra:
        return this.config.ultra
      case Grade.Perfect:
        return this.config.perfect
      case Grade.Great:
        return this.config.great
      case Grade.Good:
        return this.config.good
      default:
        return 0
    }
  }

  getMultiplier(combo: number): number {
    const { comboTierAt, comboMultipliers } = this.config
    let mult = comboMultipliers[0] ?? 1
    for (let i = 0; i < comboTierAt.length; i++) {
      const threshold = comboTierAt[i] ?? 0
      if (combo >= threshold) {
        mult = comboMultipliers[i] ?? mult
      }
    }
    return mult
  }

  /** Apply points for a successful hit using combo *after* increment. */
  applyHit(grade: Grade, comboAfterHit: number): number {
    const gained = this.getBasePoints(grade) * this.getMultiplier(comboAfterHit)
    this.score += gained
    return gained
  }
}
