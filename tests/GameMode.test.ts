import { describe, expect, it } from 'vitest'
import {
  gameModes,
  GameModeId,
  isPerfectEnough,
  utcDateKey,
  dailySeedFor,
} from '../src/data/GameModeConfig'
import { Grade } from '../src/core/types'
import { DifficultySystem } from '../src/gameplay/DifficultySystem'
import { defaultDifficultyConfig } from '../src/data/DifficultyConfig'

describe('GameModeConfig', () => {
  it('has a single classic run style', () => {
    expect(Object.keys(gameModes)).toEqual(['classic'])
    expect(gameModes[GameModeId.Classic].missEndsRun).toBe(true)
  })

  it('perfectOnly helper', () => {
    expect(isPerfectEnough(Grade.Ultra)).toBe(true)
    expect(isPerfectEnough(Grade.Perfect)).toBe(true)
    expect(isPerfectEnough(Grade.Great)).toBe(false)
  })

  it('utc date helpers still work', () => {
    const d = new Date(Date.UTC(2026, 8, 22, 3, 0, 0))
    expect(utcDateKey(d)).toBe('2026-09-22')
    expect(dailySeedFor(d)).toBe(dailySeedFor(new Date(Date.UTC(2026, 8, 22, 22, 0, 0))))
  })
})

describe('DifficultySystem bootstrap', () => {
  it('higher bootstrap is hotter', () => {
    const a = new DifficultySystem(defaultDifficultyConfig)
    const b = new DifficultySystem(defaultDifficultyConfig)
    a.bootstrap(0, 1)
    b.bootstrap(40, 1.8)
    expect(b.getSpeed()).toBeGreaterThan(a.getSpeed())
  })
})
