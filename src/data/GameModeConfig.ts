import { Grade } from '../core/types'
import { hashSeed } from '../pattern/SeededRNG'

export const GameModeId = {
  Classic: 'classic',
  Zen: 'zen',
  Perfect: 'perfect',
  Speed: 'speed',
  Mirror: 'mirror',
  Drift: 'drift',
  Blink: 'blink',
  Chaos: 'chaos',
  Endless: 'endless',
  Daily: 'daily',
} as const

export type GameModeId = (typeof GameModeId)[keyof typeof GameModeId]

/** 0–1 weights — generator prefers these pattern traits */
export interface ModePatternBias {
  reverse?: number
  moving?: number
  memory?: number
  fake?: number
}

export interface GameModeConfig {
  id: GameModeId
  label: string
  blurb: string
  /** 1 easy … 5 brutal */
  difficulty: 1 | 2 | 3 | 4 | 5
  missEndsRun: boolean
  perfectOnly: boolean
  maxHits: number
  startSuccesses: number
  speedRampMul: number
  dailySeed: boolean
  /** Force-enable features from beat 1 (ignore phase gates) */
  unlockMoving?: boolean
  unlockReverse?: boolean
  unlockFake?: boolean
  unlockMemory?: boolean
  unlockChain?: boolean
  bias?: ModePatternBias
}

export const gameModes: Record<GameModeId, GameModeConfig> = {
  [GameModeId.Classic]: {
    id: GameModeId.Classic,
    label: 'CLASSIC',
    blurb: 'One miss. One more.',
    difficulty: 2,
    missEndsRun: true,
    perfectOnly: false,
    maxHits: 0,
    startSuccesses: 0,
    speedRampMul: 1,
    dailySeed: false,
  },
  [GameModeId.Zen]: {
    id: GameModeId.Zen,
    label: 'ZEN',
    blurb: 'No game over. Chase accuracy.',
    difficulty: 1,
    missEndsRun: false,
    perfectOnly: false,
    maxHits: 30,
    startSuccesses: 0,
    speedRampMul: 0.85,
    dailySeed: false,
  },
  [GameModeId.Perfect]: {
    id: GameModeId.Perfect,
    label: 'PERFECT',
    blurb: 'Only PERFECT survives.',
    difficulty: 4,
    missEndsRun: true,
    perfectOnly: true,
    maxHits: 0,
    startSuccesses: 0,
    speedRampMul: 1.15,
    dailySeed: false,
  },
  [GameModeId.Speed]: {
    id: GameModeId.Speed,
    label: 'SPEED',
    blurb: 'Ramps hard. Stay sharp.',
    difficulty: 3,
    missEndsRun: true,
    perfectOnly: false,
    maxHits: 0,
    startSuccesses: 16,
    speedRampMul: 2.2,
    dailySeed: false,
  },
  [GameModeId.Mirror]: {
    id: GameModeId.Mirror,
    label: 'MIRROR',
    blurb: 'Direction flips constantly. Read both ways.',
    difficulty: 4,
    missEndsRun: true,
    perfectOnly: false,
    maxHits: 0,
    startSuccesses: 24,
    speedRampMul: 1.65,
    dailySeed: false,
    unlockReverse: true,
    unlockMoving: true,
    bias: { reverse: 0.88, moving: 0.55 },
  },
  [GameModeId.Drift]: {
    id: GameModeId.Drift,
    label: 'DRIFT',
    blurb: 'Scoring zone never sits still.',
    difficulty: 3,
    missEndsRun: true,
    perfectOnly: false,
    maxHits: 0,
    startSuccesses: 20,
    speedRampMul: 1.4,
    dailySeed: false,
    unlockMoving: true,
    bias: { moving: 0.92 },
  },
  [GameModeId.Blink]: {
    id: GameModeId.Blink,
    label: 'BLINK',
    blurb: 'Memorize the zone — then it vanishes.',
    difficulty: 4,
    missEndsRun: true,
    perfectOnly: false,
    maxHits: 0,
    startSuccesses: 28,
    speedRampMul: 1.35,
    dailySeed: false,
    unlockMemory: true,
    unlockReverse: true,
    unlockMoving: true,
    bias: { memory: 0.8, reverse: 0.35, moving: 0.4 },
  },
  [GameModeId.Chaos]: {
    id: GameModeId.Chaos,
    label: 'CHAOS',
    blurb: 'All patterns. Seeded mix.',
    difficulty: 5,
    missEndsRun: true,
    perfectOnly: false,
    maxHits: 0,
    startSuccesses: 110,
    speedRampMul: 1.15,
    dailySeed: false,
  },
  [GameModeId.Endless]: {
    id: GameModeId.Endless,
    label: 'ENDLESS',
    blurb: 'Highest score. No ceiling.',
    difficulty: 3,
    missEndsRun: true,
    perfectOnly: false,
    maxHits: 0,
    startSuccesses: 0,
    speedRampMul: 1.05,
    dailySeed: false,
  },
  [GameModeId.Daily]: {
    id: GameModeId.Daily,
    label: 'DAILY',
    blurb: 'Same seed. Fair fight.',
    difficulty: 3,
    missEndsRun: true,
    perfectOnly: false,
    maxHits: 0,
    startSuccesses: 0,
    speedRampMul: 1,
    dailySeed: true,
  },
}

export function isPerfectEnough(grade: Grade): boolean {
  return grade === Grade.Perfect || grade === Grade.Ultra
}

export function utcDateKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dailySeedFor(date: Date = new Date()): number {
  return hashSeed(`one-more-daily-${utcDateKey(date)}`)
}

export function difficultyStars(level: number): string {
  const n = Math.max(1, Math.min(5, Math.round(level)))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}
