import { describe, expect, it } from 'vitest'

/** Pure helper mirroring ResultView near-best copy logic. */
function nearBestLabel(
  score: number,
  bestScore: number,
  isNewBest: boolean,
  streak: number,
): string {
  const gap = bestScore - score
  if (isNewBest) return 'NEW BEST'
  if (bestScore > 0 && gap > 0 && gap <= Math.max(100, bestScore * 0.15)) {
    return `${gap} TO BEST`
  }
  if (streak > 1) return `STREAK ${streak}`
  return ''
}

describe('Retention — near-best messaging', () => {
  it('shows NEW BEST', () => {
    expect(nearBestLabel(900, 900, true, 1)).toBe('NEW BEST')
  })

  it('shows gap when close to best', () => {
    expect(nearBestLabel(82, 86, false, 1)).toBe('4 TO BEST')
    expect(nearBestLabel(480, 500, false, 1)).toBe('20 TO BEST')
  })

  it('falls back to streak when not near', () => {
    expect(nearBestLabel(100, 5000, false, 3)).toBe('STREAK 3')
  })

  it('empty when far and no streak', () => {
    expect(nearBestLabel(10, 500, false, 1)).toBe('')
  })
})
