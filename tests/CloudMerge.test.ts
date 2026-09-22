import { describe, expect, it } from 'vitest'
import { mergeModeLevels } from '../src/services/CloudService'
import { GameModeId } from '../src/data/GameModeConfig'

describe('mergeModeLevels', () => {
  it('keeps max unlocked and union of cleared', () => {
    const merged = mergeModeLevels(
      {
        [GameModeId.Classic]: {
          unlocked: 2,
          cleared: [1],
          bests: { 1: 400 },
        },
      },
      {
        [GameModeId.Classic]: {
          unlocked: 3,
          cleared: [1, 2],
          bests: { 1: 500, 2: 900 },
        },
      },
    )
    const c = merged[GameModeId.Classic]!
    expect(c.unlocked).toBe(3)
    expect(c.cleared).toEqual([1, 2])
    expect(c.bests[1]).toBe(500)
    expect(c.bests[2]).toBe(900)
  })
})
