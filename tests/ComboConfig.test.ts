import { describe, expect, it } from 'vitest'
import { milestoneForCombo } from '../src/data/ComboConfig'

describe('combo milestones', () => {
  it('returns label only on exact thresholds', () => {
    expect(milestoneForCombo(10)?.label).toBe('NICE')
    expect(milestoneForCombo(25)?.label).toBe('GREAT')
    expect(milestoneForCombo(50)?.label).toBe('INSANE')
    expect(milestoneForCombo(100)?.label).toBe('PERFECT RUN')
    expect(milestoneForCombo(9)).toBeNull()
    expect(milestoneForCombo(11)).toBeNull()
  })
})
