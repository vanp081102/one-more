export const Grade = {
  Ultra: 'ULTRA',
  Perfect: 'PERFECT',
  Great: 'GREAT',
  Good: 'GOOD',
  Miss: 'MISS',
} as const

export type Grade = (typeof Grade)[keyof typeof Grade]

export const EarlyLate = {
  Early: 'EARLY',
  Late: 'LATE',
  Fake: 'FAKE',
  None: 'NONE',
} as const

export type EarlyLate = (typeof EarlyLate)[keyof typeof EarlyLate]

export const RunPhase = {
  Idle: 'IDLE',
  Holding: 'HOLDING',
  Result: 'RESULT',
} as const

export type RunPhase = (typeof RunPhase)[keyof typeof RunPhase]

export interface Judgement {
  grade: Grade
  deltaMs: number
  absDeltaMs: number
  earlyLate: EarlyLate
}

export interface RunStats {
  score: number
  combo: number
  maxCombo: number
  hits: number
  perfects: number
  ultras: number
  misses: number
}

export interface BeatState {
  objectX: number
  targetX: number
  targetWidth: number
  speed: number
  holdStartMs: number | null
  moving: boolean
}
