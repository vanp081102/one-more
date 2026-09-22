import { describe, expect, it } from 'vitest'
import { validatePattern } from '../src/pattern/PatternValidator'
import { MotionAxis, type PatternContext } from '../src/pattern/PatternTypes'
import { PatternGenerator } from '../src/pattern/PatternGenerator'
import { defaultDifficultyConfig } from '../src/data/DifficultyConfig'

const baseCtx = (): PatternContext => ({
  playWidth: 360,
  playHeight: 640,
  baseSpeed: 240,
  targetWidth: 96,
  objectStartX: 40,
  minReactionSec: defaultDifficultyConfig.minReactionSec,
  maxAmpFrac: defaultDifficultyConfig.maxMotionAmpFrac,
  minFakeGapNorm: defaultDifficultyConfig.minFakeGapNorm,
  allowMoving: false,
  allowFake: false,
  allowReverse: false,
  allowChain: false,
  allowMemory: false,
  chaosMix: false,
  masterPressure: false,
})

const chaosCtx = (): PatternContext => ({
  ...baseCtx(),
  allowMoving: true,
  allowFake: true,
  allowReverse: true,
  allowChain: true,
  allowMemory: true,
  chaosMix: true,
  masterPressure: false,
})

describe('PatternValidator', () => {
  it('rejects illegal combos', () => {
    expect(
      validatePattern(
        {
          templateId: 'c',
          direction: 1,
          speedMul: 1,
          targetXNorm: 0.6,
          targetWidthMul: 1,
          motion: { axis: MotionAxis.None, amplitude: 0, frequency: 0, phase: 0 },
          fakes: [],
          chainLength: 2,
          memory: false,
        },
        baseCtx(),
      ).reasons,
    ).toContain('chain_not_allowed')
  })
})

describe('PatternGenerator Chaos/Master', () => {
  it('Chaos mixes features while staying valid', () => {
    const gen = new PatternGenerator(42)
    const ctx = chaosCtx()
    const flags = { fake: false, memory: false, reverse: false, chain: false, move: false }
    for (let i = 0; i < 60; i++) {
      const p = gen.next({ seed: 42, beatIndex: i, ctx })
      expect(validatePattern(p, ctx).ok).toBe(true)
      if (p.memory) expect(p.fakes.length).toBe(0)
      if (p.fakes.length) flags.fake = true
      if (p.memory) flags.memory = true
      if (p.direction === -1) flags.reverse = true
      if (p.chainLength > 1) flags.chain = true
      if (p.motion.axis !== MotionAxis.None) flags.move = true
    }
    expect(flags.fake || flags.memory).toBe(true)
    expect(flags.reverse || flags.chain || flags.move).toBe(true)
  })

  it('Master patterns validate under pressure bias', () => {
    const gen = new PatternGenerator(99)
    const ctx: PatternContext = {
      ...chaosCtx(),
      chaosMix: true,
      masterPressure: true,
      baseSpeed: 360,
    }
    for (let i = 0; i < 40; i++) {
      const p = gen.next({ seed: 99, beatIndex: i, ctx })
      expect(validatePattern(p, ctx).ok).toBe(true)
      expect(p.speedMul).toBeLessThanOrEqual(1.5)
    }
  })

  it('is deterministic', () => {
    const ctx = chaosCtx()
    const a = new PatternGenerator(7)
    const b = new PatternGenerator(7)
    const seqA = Array.from({ length: 8 }, (_, i) =>
      a.next({ seed: 7, beatIndex: i, ctx }),
    )
    const seqB = Array.from({ length: 8 }, (_, i) =>
      b.next({ seed: 7, beatIndex: i, ctx }),
    )
    expect(seqA).toEqual(seqB)
  })

  it('Mirror bias flips direction often', () => {
    const gen = new PatternGenerator(123)
    const ctx: PatternContext = {
      ...baseCtx(),
      allowMoving: true,
      allowReverse: true,
      reverseBias: 0.88,
      movingBias: 0.55,
    }
    let reverse = 0
    for (let i = 0; i < 40; i++) {
      const p = gen.next({ seed: 123, beatIndex: i, ctx })
      expect(validatePattern(p, ctx).ok).toBe(true)
      if (p.direction === -1) reverse++
    }
    expect(reverse).toBeGreaterThanOrEqual(14)
  })
})
