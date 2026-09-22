import { describe, expect, it } from 'vitest'
import { ScoreSystem } from '../src/gameplay/ScoreSystem'
import { defaultScoreConfig } from '../src/data/ScoreConfig'
import { Grade } from '../src/core/types'

describe('ScoreSystem', () => {
  it('starts at zero', () => {
    const s = new ScoreSystem(defaultScoreConfig)
    expect(s.getScore()).toBe(0)
  })

  it('applies base points with combo multiplier', () => {
    const s = new ScoreSystem(defaultScoreConfig)
    // combo 1 → tier 0 → x1
    expect(s.applyHit(Grade.Good, 1)).toBe(40)
    expect(s.getScore()).toBe(40)
    // combo 10 → x2
    expect(s.applyHit(Grade.Perfect, 10)).toBe(400)
    expect(s.getScore()).toBe(440)
  })

  it('caps at x5 at combo 100', () => {
    const s = new ScoreSystem(defaultScoreConfig)
    expect(s.getMultiplier(100)).toBe(5)
    expect(s.applyHit(Grade.Ultra, 100)).toBe(2000)
  })

  it('miss grade yields zero points', () => {
    const s = new ScoreSystem(defaultScoreConfig)
    expect(s.applyHit(Grade.Miss, 50)).toBe(0)
    expect(s.getScore()).toBe(0)
  })

  it('reset clears score', () => {
    const s = new ScoreSystem(defaultScoreConfig)
    s.applyHit(Grade.Great, 1)
    s.reset()
    expect(s.getScore()).toBe(0)
  })
})
