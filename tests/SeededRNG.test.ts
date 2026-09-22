import { describe, expect, it } from 'vitest'
import { SeededRNG, hashSeed } from '../src/pattern/SeededRNG'

describe('SeededRNG', () => {
  it('is deterministic for the same seed', () => {
    const a = new SeededRNG(12345)
    const b = new SeededRNG(12345)
    const seqA = Array.from({ length: 20 }, () => a.next())
    const seqB = Array.from({ length: 20 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('diverges for different seeds', () => {
    const a = new SeededRNG(1)
    const b = new SeededRNG(2)
    expect(a.next()).not.toBe(b.next())
  })

  it('nextInt stays in range', () => {
    const r = new SeededRNG(99)
    for (let i = 0; i < 50; i++) {
      const v = r.nextInt(3, 8)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThan(8)
    }
  })

  it('hashSeed is stable', () => {
    expect(hashSeed('one-more')).toBe(hashSeed('one-more'))
    expect(hashSeed('a')).not.toBe(hashSeed('b'))
  })
})
