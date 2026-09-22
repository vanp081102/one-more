import { Grade } from '../core/types'
import { hashSeed } from '../pattern/SeededRNG'

/** Kept for save / leaderboard identity — one play style only. */
export const GameModeId = {
  Classic: 'classic',
} as const

export type GameModeId = (typeof GameModeId)[keyof typeof GameModeId]

export interface GameModeConfig {
  id: GameModeId
  label: string
  missEndsRun: boolean
  maxHits: number
  dailySeed: boolean
}

export const gameModes: Record<GameModeId, GameModeConfig> = {
  [GameModeId.Classic]: {
    id: GameModeId.Classic,
    label: 'ONE MORE',
    missEndsRun: true,
    maxHits: 0,
    dailySeed: false,
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
  const n = Math.max(1, Math.min(5, Math.ceil(level / 20)))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}
