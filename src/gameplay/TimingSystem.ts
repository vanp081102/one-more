import type { TimingConfig } from '../data/TimingConfig'
import { EarlyLate, Grade, type Judgement } from '../core/types'

/**
 * Pure timing judgement from signed delta (ms).
 * Negative = early (released before ideal), positive = late.
 */
export function judgeTiming(deltaMs: number, config: TimingConfig): Judgement {
  const absDeltaMs = Math.abs(deltaMs)
  let grade: Grade
  if (absDeltaMs < config.ultraMs) grade = Grade.Ultra
  else if (absDeltaMs < config.perfectMs) grade = Grade.Perfect
  else if (absDeltaMs < config.greatMs) grade = Grade.Great
  else if (absDeltaMs < config.goodMs) grade = Grade.Good
  else grade = Grade.Miss

  let earlyLate: EarlyLate = EarlyLate.None
  if (grade === Grade.Miss) {
    earlyLate = deltaMs < 0 ? EarlyLate.Early : EarlyLate.Late
  }

  return { grade, deltaMs, absDeltaMs, earlyLate }
}

/**
 * Convert positional error to time error given speed (px/s).
 * direction: 1 = LTR, -1 = RTL.
 * Negative delta = early (not yet at ideal along travel).
 */
export function deltaMsFromPosition(
  objectX: number,
  targetX: number,
  speedPxPerSec: number,
  direction: 1 | -1 = 1,
): number {
  if (speedPxPerSec <= 0) return 0
  return (((objectX - targetX) * direction) / speedPxPerSec) * 1000
}

export class TimingSystem {
  private config: TimingConfig

  constructor(config: TimingConfig) {
    this.config = config
  }

  getConfig(): TimingConfig {
    return this.config
  }

  setConfig(config: TimingConfig): void {
    this.config = config
  }

  judge(deltaMs: number): Judgement {
    return judgeTiming(deltaMs, this.config)
  }

  judgePosition(
    objectX: number,
    targetX: number,
    speedPxPerSec: number,
    direction: 1 | -1 = 1,
  ): Judgement {
    return this.judge(deltaMsFromPosition(objectX, targetX, speedPxPerSec, direction))
  }

  isHoldLongEnough(holdDurationMs: number): boolean {
    return holdDurationMs >= this.config.minHoldMs
  }
}
