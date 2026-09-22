import { describe, expect, it } from 'vitest'
import { SaveService } from '../src/services/SaveService'
import { GameModeId } from '../src/data/GameModeConfig'
import { Time } from '../src/core/Time'

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

describe('SaveService Phase 9 meta', () => {
  it('tracks new best and leaderboard', () => {
    const save = new SaveService(memoryStorage())
    const a = save.recordRun(500, 5, 1, GameModeId.Classic, 1)
    expect(a.isNewBest).toBe(true)
    expect(save.getLeaderboard()).toHaveLength(1)

    const b = save.recordRun(200, 2, 1, GameModeId.Endless, 2)
    expect(b.isNewBest).toBe(false)
    expect(save.getLeaderboard()[0]!.score).toBe(500)

    const c = save.recordRun(900, 9, 1, GameModeId.Chaos, 3)
    expect(c.isNewBest).toBe(true)
    expect(save.getLeaderboard()[0]!.modeId).toBe(GameModeId.Chaos)
  })

  it('updates settings', () => {
    const save = new SaveService(memoryStorage())
    const s = save.updateSettings({ reducedMotion: true, colorblindFriendly: true })
    expect(s.reducedMotion).toBe(true)
    expect(s.colorblindFriendly).toBe(true)
    expect(save.get().settings.vibration).toBe(true)
  })

  it('builds daily streak', () => {
    const save = new SaveService(memoryStorage())
    save.recordRun(10, 1, 1, GameModeId.Classic, 1)
    expect(save.get().streak).toBe(1)
    // same day again keeps streak
    save.recordRun(20, 2, 1, GameModeId.Classic, 2)
    expect(save.get().streak).toBe(1)
  })
})

describe('Time pause', () => {
  it('returns zero delta while paused', () => {
    const time = new Time()
    time.start(1000)
    time.setPaused(true)
    expect(time.tick(1100)).toBe(0)
    time.setPaused(false)
    const d = time.tick(1200)
    expect(d).toBeGreaterThan(0)
  })
})
