/** Single ladder: Level 1 → 100. Higher = harder, richer pattern mix. */

export const LEVEL_COUNT = 100

export interface LevelDef {
  level: number
  startSuccesses: number
  speedRampMul: number
  /** Score needed to clear this level and unlock / promote next */
  clearScore: number
  /** Multiplier on points gained (lower at high levels → harder to score) */
  scoreMul: number
  unlockMoving: boolean
  unlockReverse: boolean
  unlockFake: boolean
  unlockMemory: boolean
  unlockChain: boolean
  /** Force chaos mixing in the pattern generator */
  chaosMix: boolean
  /** Only PERFECT / ULTRA count */
  perfectOnly: boolean
  reverseBias: number
  movingBias: number
  memoryBias: number
  fakeBias: number
}

export interface ResolvedLevelRun {
  level: number
  startSuccesses: number
  speedRampMul: number
  clearScore: number
  scoreMul: number
  perfectOnly: boolean
  unlockMoving: boolean
  unlockReverse: boolean
  unlockFake: boolean
  unlockMemory: boolean
  unlockChain: boolean
  chaosMix: boolean
  reverseBias: number
  movingBias: number
  memoryBias: number
  fakeBias: number
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t)
}

/** Feature unlock gates for the 1–100 ladder (mode DNA stacks up). */
const GATE = {
  moving: 12,
  fake: 25,
  reverse: 38,
  chain: 50,
  memory: 62,
  chaos: 78,
  perfect: 90,
} as const

/** Build definition for a single level (1–100). */
export function getLevelDef(level: number): LevelDef {
  const lv = Math.max(1, Math.min(LEVEL_COUNT, Math.floor(level)))
  const t = (lv - 1) / (LEVEL_COUNT - 1)

  const unlockMoving = lv >= GATE.moving
  const unlockFake = lv >= GATE.fake
  const unlockReverse = lv >= GATE.reverse
  const unlockChain = lv >= GATE.chain
  const unlockMemory = lv >= GATE.memory
  const chaosMix = lv >= GATE.chaos
  const perfectOnly = lv >= GATE.perfect

  const biasRamp = (unlockAt: number, fullAt: number) => {
    if (lv < unlockAt) return 0
    return lerp(0.35, 0.9, (lv - unlockAt) / Math.max(1, fullAt - unlockAt))
  }

  return {
    level: lv,
    startSuccesses: Math.floor(lerp(0, 90, t)),
    speedRampMul: lerp(1, 2.5, t),
    clearScore: lv * 250,
    scoreMul: lerp(1, 0.35, t),
    unlockMoving,
    unlockReverse,
    unlockFake,
    unlockMemory,
    unlockChain,
    chaosMix,
    perfectOnly,
    movingBias: unlockMoving ? biasRamp(GATE.moving, GATE.fake) : 0,
    fakeBias: unlockFake ? biasRamp(GATE.fake, GATE.reverse) : 0,
    reverseBias: unlockReverse ? biasRamp(GATE.reverse, GATE.chain) : 0,
    memoryBias: unlockMemory ? biasRamp(GATE.memory, GATE.chaos) : 0,
  }
}

export function resolveLevelRun(level: number): ResolvedLevelRun {
  const def = getLevelDef(level)
  return { ...def }
}

export function levelUpDifficultyDelta(
  fromLevel: number,
  toLevel: number,
): { extraSteps: number; speedRampMul: number; scoreMul: number } {
  const from = getLevelDef(fromLevel)
  const to = getLevelDef(toLevel)
  return {
    extraSteps: Math.max(0, to.startSuccesses - from.startSuccesses),
    speedRampMul: to.speedRampMul,
    scoreMul: to.scoreMul,
  }
}

/** Balls: +1 every 25 levels (L1–24:1, L25–49:2, L50–74:3, L75–99:4, L100:5). */
export function ballCountForLevel(level: number): number {
  const lv = Math.max(1, Math.min(LEVEL_COUNT, Math.floor(level)))
  return Math.min(5, 1 + Math.floor(lv / 25))
}

/** Short tag for UI (which “mode DNA” is active). */
export function levelFeatureTags(level: number): string[] {
  const d = getLevelDef(level)
  const tags: string[] = []
  const balls = ballCountForLevel(level)
  if (balls > 1) tags.push(`×${balls}`)
  if (d.unlockMoving) tags.push('drift')
  if (d.unlockFake) tags.push('fake')
  if (d.unlockReverse) tags.push('mirror')
  if (d.unlockChain) tags.push('chain')
  if (d.unlockMemory) tags.push('blink')
  if (d.chaosMix) tags.push('chaos')
  if (d.perfectOnly) tags.push('perfect')
  return tags
}

export function levelTierName(level: number): string {
  const lv = Math.max(1, Math.min(LEVEL_COUNT, level))
  if (lv < GATE.moving) return 'discovery'
  if (lv < GATE.fake) return 'speed'
  if (lv < GATE.reverse) return 'moving'
  if (lv < GATE.chain) return 'fake'
  if (lv < GATE.memory) return 'reversal'
  if (lv < GATE.chaos) return 'memory'
  if (lv < GATE.perfect) return 'chaos'
  return 'master'
}
