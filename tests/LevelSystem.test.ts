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

describe('LevelConfig 1–100', () => {
  it('defines 100 levels with rising clear scores', () => {
    expect(LEVEL_COUNT).toBe(100)
    expect(getLevelDef(1).clearScore).toBe(250)
    expect(getLevelDef(2).clearScore).toBe(500)
    expect(getLevelDef(3).clearScore).toBe(750)
    expect(getLevelDef(4).clearScore).toBe(1000)
    expect(getLevelDef(1).clearScore).toBeLessThan(getLevelDef(50).clearScore)
    expect(getLevelDef(50).clearScore).toBeLessThan(getLevelDef(100).clearScore)
  })

  it('harder scoring at high levels', () => {
    expect(getLevelDef(1).scoreMul).toBeGreaterThan(getLevelDef(100).scoreMul)
    expect(resolveLevelRun(100).speedRampMul).toBeGreaterThan(resolveLevelRun(1).speedRampMul)
  })

  it('unlocks mode DNA across the ladder', () => {
    expect(getLevelDef(10).unlockMoving).toBe(false)
    expect(getLevelDef(12).unlockMoving).toBe(true)
    expect(getLevelDef(38).unlockReverse).toBe(true)
    expect(getLevelDef(62).unlockMemory).toBe(true)
    expect(getLevelDef(78).chaosMix).toBe(true)
    expect(getLevelDef(90).perfectOnly).toBe(true)
    expect(levelFeatureTags(80).length).toBeGreaterThan(3)
  })

  it('adds one ball every 25 levels', () => {
    expect(ballCountForLevel(1)).toBe(1)
    expect(ballCountForLevel(24)).toBe(1)
    expect(ballCountForLevel(25)).toBe(2)
    expect(ballCountForLevel(49)).toBe(2)
    expect(ballCountForLevel(50)).toBe(3)
    expect(ballCountForLevel(75)).toBe(4)
    expect(ballCountForLevel(100)).toBe(5)
    expect(levelFeatureTags(25)).toContain('×2')
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
