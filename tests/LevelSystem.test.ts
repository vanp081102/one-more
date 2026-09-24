import { describe, expect, it } from 'vitest'
import {
  LEVEL_COUNT,
  getLevelDef,
  resolveLevelRun,
  levelUpDifficultyDelta,
  levelFeatureTags,
  ballCountForLevel,
} from '../src/data/LevelConfig'
import { SaveService } from '../src/services/SaveService'

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear() {
      map.clear()
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null
    },
    key(index: number) {
      return [...map.keys()][index] ?? null
    },
    removeItem(key: string) {
      map.delete(key)
    },
    setItem(key: string, value: string) {
      map.set(key, value)
    },
  }
}

describe('LevelConfig 1–500', () => {
  it('defines 500 levels with rising clear scores', () => {
    expect(LEVEL_COUNT).toBe(500)
    expect(getLevelDef(1).clearScore).toBe(500)
    expect(getLevelDef(50).clearScore).toBe(25000)
    expect(getLevelDef(100).clearScore).toBe(50000)
    expect(getLevelDef(1).clearScore).toBeLessThan(getLevelDef(100).clearScore)
    expect(getLevelDef(100).clearScore).toBeLessThan(getLevelDef(500).clearScore)
  })

  it('harder scoring at high levels', () => {
    expect(getLevelDef(1).scoreMul).toBeGreaterThan(getLevelDef(500).scoreMul)
    expect(resolveLevelRun(500).speedRampMul).toBeGreaterThan(resolveLevelRun(1).speedRampMul)
  })

  it('unlocks mode DNA across the ladder', () => {
    expect(getLevelDef(50).unlockMoving).toBe(false)
    expect(getLevelDef(60).unlockMoving).toBe(true)
    expect(getLevelDef(190).unlockReverse).toBe(true)
    expect(getLevelDef(310).unlockMemory).toBe(true)
    expect(getLevelDef(390).chaosMix).toBe(true)
    expect(getLevelDef(460).perfectOnly).toBe(true)
    expect(levelFeatureTags(400).length).toBeGreaterThan(3)
  })

  it('adds one ball every 100 levels', () => {
    expect(ballCountForLevel(1)).toBe(1)
    expect(ballCountForLevel(99)).toBe(1)
    expect(ballCountForLevel(100)).toBe(2)
    expect(ballCountForLevel(200)).toBe(3)
    expect(ballCountForLevel(300)).toBe(4)
    expect(ballCountForLevel(400)).toBe(5)
    expect(ballCountForLevel(500)).toBe(6)
    expect(levelFeatureTags(100)).toContain('×2')
  })

  it('level-up delta adds steps', () => {
    const d = levelUpDifficultyDelta(10, 11)
    expect(d.extraSteps).toBeGreaterThanOrEqual(0)
    expect(d.scoreMul).toBeLessThanOrEqual(getLevelDef(10).scoreMul)
  })
})

describe('SaveService levels', () => {
  it('unlocks next level on clear', () => {
    const save = new SaveService(memoryStorage())
    expect(save.getLevelProgress().unlocked).toBe(1)
    const clear = getLevelDef(1).clearScore
    const r = save.recordLevelRun(1, clear, clear)
    expect(r.cleared).toBe(true)
    expect(r.unlockedNext).toBe(true)
    expect(save.getLevelProgress().unlocked).toBe(2)
  })
})
