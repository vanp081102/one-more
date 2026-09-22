import { describe, expect, it } from 'vitest'
import {
  dailySeedFor,
  gameModes,
  GameModeId,
  isPerfectEnough,
  utcDateKey,
} from '../src/data/GameModeConfig'
import { Grade } from '../src/core/types'
import { DifficultySystem } from '../src/gameplay/DifficultySystem'
import { defaultDifficultyConfig } from '../src/data/DifficultyConfig'

describe('GameModeConfig', () => {
  it('defines all primary modes', () => {
    expect(gameModes[GameModeId.Classic].missEndsRun).toBe(true)
    expect(gameModes[GameModeId.Zen].missEndsRun).toBe(false)
    expect(gameModes[GameModeId.Zen].maxHits).toBe(30)
    expect(gameModes[GameModeId.Perfect].perfectOnly).toBe(true)
    expect(gameModes[GameModeId.Speed].speedRampMul).toBeGreaterThan(1)
    expect(gameModes[GameModeId.Chaos].startSuccesses).toBeGreaterThanOrEqual(110)
    expect(gameModes[GameModeId.Endless].missEndsRun).toBe(true)
    expect(gameModes[GameModeId.Daily].dailySeed).toBe(true)
    expect(gameModes[GameModeId.Drift].unlockMoving).toBe(true)
    expect(gameModes[GameModeId.Mirror].unlockReverse).toBe(true)
    expect(gameModes[GameModeId.Mirror].bias?.reverse).toBeGreaterThanOrEqual(0.8)
    expect(gameModes[GameModeId.Blink].unlockMemory).toBe(true)
    expect(gameModes[GameModeId.Mirror].difficulty).toBe(4)
  })

  it('perfectOnly helper', () => {
    expect(isPerfectEnough(Grade.Ultra)).toBe(true)
    expect(isPerfectEnough(Grade.Perfect)).toBe(true)
    expect(isPerfectEnough(Grade.Great)).toBe(false)
    expect(isPerfectEnough(Grade.Good)).toBe(false)
  })

  it('daily seed is stable for a UTC day', () => {
    const d = new Date(Date.UTC(2026, 8, 22, 3, 0, 0))
    const a = dailySeedFor(d)
    const b = dailySeedFor(new Date(Date.UTC(2026, 8, 22, 22, 0, 0)))
    const c = dailySeedFor(new Date(Date.UTC(2026, 8, 23, 0, 0, 0)))
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(utcDateKey(d)).toBe('2026-09-22')
  })
})

describe('DifficultySystem bootstrap', () => {
  it('Speed bootstrap starts hotter', () => {
    const a = new DifficultySystem(defaultDifficultyConfig)
    const b = new DifficultySystem(defaultDifficultyConfig)
    a.bootstrap(0, 1)
    b.bootstrap(16, 2.2)
    expect(b.getSpeed()).toBeGreaterThan(a.getSpeed())
    expect(b.getSuccesses()).toBe(16)
  })
})
