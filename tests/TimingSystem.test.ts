import { describe, expect, it } from 'vitest'
import { judgeTiming, deltaMsFromPosition, TimingSystem } from '../src/gameplay/TimingSystem'
import { defaultTimingConfig } from '../src/data/TimingConfig'
import { Grade, EarlyLate } from '../src/core/types'

describe('TimingSystem', () => {
  const cfg = defaultTimingConfig

  it('grades exact center as ULTRA', () => {
    const j = judgeTiming(0, cfg)
    expect(j.grade).toBe(Grade.Ultra)
    expect(j.earlyLate).toBe(EarlyLate.None)
  })

  it('grades edge of perfect window', () => {
    expect(judgeTiming(39, cfg).grade).toBe(Grade.Perfect)
    expect(judgeTiming(40, cfg).grade).toBe(Grade.Great)
  })

  it('grades early miss with EARLY', () => {
    const j = judgeTiming(-150, cfg)
    expect(j.grade).toBe(Grade.Miss)
    expect(j.earlyLate).toBe(EarlyLate.Early)
  })

  it('grades late miss with LATE', () => {
    const j = judgeTiming(150, cfg)
    expect(j.grade).toBe(Grade.Miss)
    expect(j.earlyLate).toBe(EarlyLate.Late)
  })

  it('maps position error to deltaMs', () => {
    // 28px past at 280 px/s => 100ms late
    expect(deltaMsFromPosition(128, 100, 280)).toBeCloseTo(100, 5)
    // early
    expect(deltaMsFromPosition(72, 100, 280)).toBeCloseTo(-100, 5)
  })

  it('maps RTL direction early/late correctly', () => {
    // Moving left: object still right of target = early
    expect(deltaMsFromPosition(128, 100, 280, -1)).toBeCloseTo(-100, 5)
    // Past target (left of it) = late
    expect(deltaMsFromPosition(72, 100, 280, -1)).toBeCloseTo(100, 5)
  })

  it('judgePosition integrates', () => {
    const sys = new TimingSystem(cfg)
    const j = sys.judgePosition(100, 100, 280)
    expect(j.grade).toBe(Grade.Ultra)
  })

  it('enforces min hold', () => {
    const sys = new TimingSystem(cfg)
    expect(sys.isHoldLongEnough(49)).toBe(false)
    expect(sys.isHoldLongEnough(50)).toBe(true)
  })

  it('grades good / great boundaries', () => {
    expect(judgeTiming(79, cfg).grade).toBe(Grade.Great)
    expect(judgeTiming(80, cfg).grade).toBe(Grade.Good)
    expect(judgeTiming(119, cfg).grade).toBe(Grade.Good)
    expect(judgeTiming(120, cfg).grade).toBe(Grade.Miss)
  })
})
