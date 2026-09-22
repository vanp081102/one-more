import { describe, expect, it } from 'vitest'
import { WowMomentController, WowState } from '../src/gameplay/WowMoment'
import { SaveService } from '../src/services/SaveService'
import { MetaProgress } from '../src/services/MetaProgress'
import { EventBus, GameEvents } from '../src/core/EventBus'
import { GameModeId } from '../src/data/GameModeConfig'
import { themes, defaultThemeId } from '../src/data/ThemeConfig'

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

describe('WowMomentController', () => {
  it('arms → activates → celebrates → idle', () => {
    const wow = new WowMomentController()
    expect(wow.getState()).toBe(WowState.Idle)
    wow.arm()
    expect(wow.isArmed()).toBe(true)
    wow.activate()
    expect(wow.isActive()).toBe(true)
    wow.celebrate(0.5)
    expect(wow.isCelebrating()).toBe(true)
    expect(wow.update(0.2)).toBe(false)
    expect(wow.update(0.4)).toBe(true)
    expect(wow.getState()).toBe(WowState.Idle)
  })

  it('cancel clears armed state', () => {
    const wow = new WowMomentController()
    wow.arm()
    wow.cancel()
    expect(wow.getState()).toBe(WowState.Idle)
  })
})

describe('SaveService themes + achievements', () => {
  it('persists theme unlocks and active theme', () => {
    const storage = memoryStorage()
    const save = new SaveService(storage)
    expect(save.get().activeTheme).toBe(defaultThemeId)
    expect(save.get().unlockedThemes).toContain('ember')
    expect(save.unlockTheme('ember')).toBe(false) // already unlocked
    expect(save.setActiveTheme('ember')).toBe(true)
    expect(save.get().activeTheme).toBe('ember')

    const reloaded = new SaveService(storage)
    expect(reloaded.get().unlockedThemes).toContain('ember')
    expect(reloaded.get().activeTheme).toBe('ember')
  })

  it('allows selecting any theme (all unlocked)', () => {
    const save = new SaveService(memoryStorage())
    expect(save.setActiveTheme('void')).toBe(true)
    expect(save.get().activeTheme).toBe('void')
    expect(save.get().unlockedThemes).toEqual(
      expect.arrayContaining(['default', 'ember', 'ice', 'void', 'signal']),
    )
  })
})

describe('MetaProgress', () => {
  it('unlocks first_run and first_perfect with theme', () => {
    const save = new SaveService(memoryStorage())
    const bus = new EventBus()
    const unlocked: string[] = []
    bus.on<{ ids: string[] }>(GameEvents.AchievementsUnlocked, (p) => {
      unlocked.push(...p.ids)
    })
    const meta = new MetaProgress(save, bus)

    save.recordRun(100, 3, 1, GameModeId.Classic)
    const ids = meta.evaluate({
      score: 100,
      maxCombo: 3,
      perfects: 1,
      ultras: 0,
      modeId: GameModeId.Classic,
      endReason: 'miss',
    })

    expect(ids).toContain('first_run')
    expect(ids).toContain('first_perfect')
    expect(save.get().unlockedThemes).toContain('ember')
    expect(unlocked).toEqual(expect.arrayContaining(['first_run', 'first_perfect']))
  })

  it('unlocks combo_100 → void theme', () => {
    const save = new SaveService(memoryStorage())
    const meta = new MetaProgress(save, new EventBus())
    save.recordRun(9000, 100, 1, GameModeId.Classic)
    const ids = meta.evaluate({
      score: 9000,
      maxCombo: 100,
      perfects: 50,
      ultras: 10,
      modeId: GameModeId.Classic,
      endReason: 'miss',
    })
    expect(ids).toContain('combo_100')
    expect(ids).toContain('score_5000')
    expect(save.get().unlockedThemes).toContain('void')
    expect(save.get().unlockedThemes).toContain('signal')
  })

  it('does not re-emit already unlocked achievements', () => {
    const save = new SaveService(memoryStorage())
    const meta = new MetaProgress(save, new EventBus())
    save.recordRun(10, 1, 1, GameModeId.Classic)
    meta.evaluate({
      score: 10,
      maxCombo: 1,
      perfects: 0,
      ultras: 0,
      modeId: GameModeId.Classic,
      endReason: 'miss',
    })
    save.recordRun(20, 2, 1, GameModeId.Classic)
    const second = meta.evaluate({
      score: 20,
      maxCombo: 2,
      perfects: 0,
      ultras: 0,
      modeId: GameModeId.Classic,
      endReason: 'miss',
    })
    expect(second).not.toContain('first_run')
  })
})

describe('ThemeConfig', () => {
  it('defines expected cosmetic themes', () => {
    expect(themes.default).toBeDefined()
    expect(themes.ember).toBeDefined()
    expect(themes.ice).toBeDefined()
    expect(themes.void).toBeDefined()
    expect(themes.signal).toBeDefined()
  })
})
