import { describe, expect, it } from 'vitest'
import { corePatternTemplates } from '../src/pattern/CorePatterns'
import { soundPacks, defaultSoundPackId } from '../src/data/SoundPackConfig'
import { SaveService } from '../src/services/SaveService'
import { MetaProgress } from '../src/services/MetaProgress'
import { EventBus } from '../src/core/EventBus'
import { GameModeId } from '../src/data/GameModeConfig'
import { validatePattern } from '../src/pattern/PatternValidator'
import { MotionAxis, type PatternContext } from '../src/pattern/PatternTypes'
import { defaultDifficultyConfig } from '../src/data/DifficultyConfig'
import { InputManager } from '../src/input/InputManager'

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

const ctx = (): PatternContext => ({
  playWidth: 360,
  playHeight: 640,
  baseSpeed: 240,
  targetWidth: 96,
  objectStartX: 40,
  minReactionSec: defaultDifficultyConfig.minReactionSec,
  maxAmpFrac: defaultDifficultyConfig.maxMotionAmpFrac,
  minFakeGapNorm: defaultDifficultyConfig.minFakeGapNorm,
  allowMoving: true,
  allowFake: true,
  allowReverse: true,
  allowChain: true,
  allowMemory: true,
  chaosMix: false,
  masterPressure: false,
})

describe('Post-RC content', () => {
  it('has 20–40 core pattern templates', () => {
    expect(corePatternTemplates.length).toBeGreaterThanOrEqual(20)
    expect(corePatternTemplates.length).toBeLessThanOrEqual(40)
  })

  it('core templates validate under full permissions', () => {
    const c = ctx()
    for (const t of corePatternTemplates) {
      const r = validatePattern(t, c)
      expect(r.ok, `${t.templateId}: ${r.reasons.join(',')}`).toBe(true)
      if (t.memory) expect(t.fakes.length).toBe(0)
      expect(t.motion.axis === MotionAxis.None || t.motion.amplitude > 0).toBe(true)
    }
  })

  it('defines cosmetic sound packs', () => {
    expect(soundPacks[defaultSoundPackId]).toBeDefined()
    expect(soundPacks.crystal).toBeDefined()
    expect(soundPacks.soft).toBeDefined()
    expect(soundPacks.punch).toBeDefined()
  })

  it('unlocks sound pack via achievement', () => {
    const save = new SaveService(memoryStorage())
    const meta = new MetaProgress(save, new EventBus())
    save.recordRun(100, 30, 1, GameModeId.Classic, 1)
    meta.evaluate({
      score: 100,
      maxCombo: 30,
      perfects: 1,
      ultras: 0,
      modeId: GameModeId.Classic,
      endReason: 'miss',
    })
    expect(save.get().unlockedSounds).toContain('soft')
    expect(save.setActiveSound('soft')).toBe(true)
  })

  it('input poll does not throw without gamepads', () => {
    const input = new InputManager()
    expect(() => input.poll()).not.toThrow()
    expect(input.getAction().pressed).toBe(false)
  })
})
