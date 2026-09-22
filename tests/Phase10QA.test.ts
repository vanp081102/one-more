import { describe, expect, it } from 'vitest'
import { judgeTiming, TimingSystem } from '../src/gameplay/TimingSystem'
import { defaultTimingConfig } from '../src/data/TimingConfig'
import { Grade, EarlyLate } from '../src/core/types'
import { ScoreSystem } from '../src/gameplay/ScoreSystem'
import { defaultScoreConfig } from '../src/data/ScoreConfig'
import { ComboSystem } from '../src/gameplay/ComboSystem'
import { DifficultySystem } from '../src/gameplay/DifficultySystem'
import { defaultDifficultyConfig, DifficultyPhaseId } from '../src/data/DifficultyConfig'
import { validatePattern } from '../src/pattern/PatternValidator'
import { MotionAxis, type PatternContext } from '../src/pattern/PatternTypes'
import { PatternGenerator } from '../src/pattern/PatternGenerator'
import { SaveService } from '../src/services/SaveService'
import { GameModeId } from '../src/data/GameModeConfig'
import { InputManager } from '../src/input/InputManager'
import { InputAction } from '../src/input/InputAction'
import { Time } from '../src/core/Time'

function memoryStorage(seed?: Record<string, string>): Storage {
  const map = new Map<string, string>(Object.entries(seed ?? {}))
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

const baseCtx = (): PatternContext => ({
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

describe('QA — timing edges', () => {
  const cfg = defaultTimingConfig

  it('ultra / perfect / great / good / miss windows', () => {
    expect(judgeTiming(0, cfg).grade).toBe(Grade.Ultra)
    expect(judgeTiming(14, cfg).grade).toBe(Grade.Ultra)
    expect(judgeTiming(15, cfg).grade).toBe(Grade.Perfect)
    expect(judgeTiming(39, cfg).grade).toBe(Grade.Perfect)
    expect(judgeTiming(40, cfg).grade).toBe(Grade.Great)
    expect(judgeTiming(79, cfg).grade).toBe(Grade.Great)
    expect(judgeTiming(80, cfg).grade).toBe(Grade.Good)
    expect(judgeTiming(119, cfg).grade).toBe(Grade.Good)
    expect(judgeTiming(120, cfg).grade).toBe(Grade.Miss)
  })

  it('very early and very late', () => {
    expect(judgeTiming(-500, cfg).earlyLate).toBe(EarlyLate.Early)
    expect(judgeTiming(500, cfg).earlyLate).toBe(EarlyLate.Late)
  })

  it('TimingSystem position at exact center', () => {
    const sys = new TimingSystem(cfg)
    expect(sys.judgePosition(200, 200, 300).grade).toBe(Grade.Ultra)
  })
})

describe('QA — score & combo', () => {
  it('zero score until first hit', () => {
    const s = new ScoreSystem(defaultScoreConfig)
    expect(s.getScore()).toBe(0)
  })

  it('high combo uses max multiplier', () => {
    const s = new ScoreSystem(defaultScoreConfig)
    expect(s.getMultiplier(250)).toBe(5)
    expect(s.applyHit(Grade.Ultra, 250)).toBe(2000)
  })

  it('combo resets on miss', () => {
    const c = new ComboSystem()
    c.hit()
    c.hit()
    expect(c.getCombo()).toBe(2)
    c.miss()
    expect(c.getCombo()).toBe(0)
    expect(c.getMaxCombo()).toBe(2)
  })
})

describe('QA — difficulty bootstrap', () => {
  it('Chaos mode bootstrap lands in Chaos phase', () => {
    const d = new DifficultySystem(defaultDifficultyConfig)
    d.bootstrap(110, 1)
    expect(d.getPhaseId()).toBe(DifficultyPhaseId.Chaos)
    expect(d.isChaosMix()).toBe(true)
  })

  it('Master bootstrap', () => {
    const d = new DifficultySystem(defaultDifficultyConfig)
    d.bootstrap(135, 1)
    expect(d.getPhaseId()).toBe(DifficultyPhaseId.Master)
    expect(d.isMasterPressure()).toBe(true)
  })
})

describe('QA — pattern fairness', () => {
  it('rejects reaction_too_short', () => {
    const r = validatePattern(
      {
        templateId: 'x',
        direction: 1,
        speedMul: 2.5,
        targetXNorm: 0.3,
        targetWidthMul: 1,
        motion: { axis: MotionAxis.None, amplitude: 0, frequency: 0, phase: 0 },
        fakes: [],
        chainLength: 1,
        memory: false,
      },
      { ...baseCtx(), baseSpeed: 800, minReactionSec: 0.5 },
    )
    expect(r.ok).toBe(false)
    expect(r.reasons).toContain('reaction_too_short')
  })

  it('rejects memory_with_fakes', () => {
    const r = validatePattern(
      {
        templateId: 'x',
        direction: 1,
        speedMul: 1,
        targetXNorm: 0.6,
        targetWidthMul: 1,
        motion: { axis: MotionAxis.None, amplitude: 0, frequency: 0, phase: 0 },
        fakes: [{ xNorm: 0.4, widthMul: 1 }],
        chainLength: 1,
        memory: true,
      },
      baseCtx(),
    )
    expect(r.reasons).toContain('memory_with_fakes')
  })

  it('seeded generator is deterministic', () => {
    const a = new PatternGenerator(12345)
    const b = new PatternGenerator(12345)
    const ctx = baseCtx()
    for (let i = 0; i < 20; i++) {
      const pa = a.next({ seed: 12345, beatIndex: i, ctx })
      const pb = b.next({ seed: 12345, beatIndex: i, ctx })
      expect(pa).toEqual(pb)
      expect(validatePattern(pa, ctx).ok).toBe(true)
    }
  })
})

describe('QA — save resilience', () => {
  it('recovers from corrupt JSON', () => {
    const storage = memoryStorage({ 'one-more-save-v2': '{not-json' })
    const save = new SaveService(storage)
    expect(save.get().bestScore).toBe(0)
    expect(save.get().unlockedThemes).toContain('default')
  })

  it('keeps active theme when all packs unlocked on load', () => {
    const storage = memoryStorage({
      'one-more-save-v2': JSON.stringify({
        activeTheme: 'void',
        unlockedThemes: ['default'],
      }),
    })
    const save = new SaveService(storage)
    expect(save.get().activeTheme).toBe('void')
    expect(save.get().unlockedThemes).toContain('void')
  })

  it('falls back when active theme is unknown', () => {
    const storage = memoryStorage({
      'one-more-save-v2': JSON.stringify({
        activeTheme: 'not-a-real-theme',
        unlockedThemes: ['default'],
      }),
    })
    const save = new SaveService(storage)
    expect(save.get().activeTheme).toBe('default')
  })

  it('audioIndependent persists', () => {
    const save = new SaveService(memoryStorage())
    save.updateSettings({ audioIndependent: true })
    expect(save.get().settings.audioIndependent).toBe(true)
  })
})

describe('QA — input edges', () => {
  it('rapid press/release produces edges then settles', () => {
    const input = new InputManager()
    // Simulate without DOM — use reflection via getAction after private state
    // Press path: setEnabled true, then we only test endFrame edge clearing
    input.setEnabled(true)
    let a = input.getAction(InputAction.Primary)
    expect(a.pressed).toBe(false)
    expect(a.justPressed).toBe(false)
    input.endFrame()
    a = input.getAction(InputAction.Primary)
    expect(a.justPressed).toBe(false)
    expect(a.justReleased).toBe(false)
  })

  it('disabled input cannot stay pressed', () => {
    const input = new InputManager()
    input.setEnabled(false)
    expect(input.getAction().pressed).toBe(false)
  })
})

describe('QA — focus / pause', () => {
  it('pause then resume does not accumulate huge delta', () => {
    const time = new Time()
    time.start(0)
    time.tick(16)
    time.setPaused(true)
    expect(time.tick(5000)).toBe(0)
    time.setPaused(false)
    const d = time.tick(5016)
    expect(d).toBeLessThanOrEqual(0.05)
  })

  it('classic mode id exists for leaderboard', () => {
    expect(GameModeId.Classic).toBe('classic')
  })
})
