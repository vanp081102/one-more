import { describe, expect, it } from 'vitest'
import { TargetController } from '../src/gameplay/TargetController'
import { MotionAxis } from '../src/pattern/PatternTypes'

describe('TargetController fakes', () => {
  it('reports near-fake when object is closer to decoy', () => {
    const t = new TargetController()
    t.applyPattern(200, 60, {
      templateId: 't',
      direction: 1,
      speedMul: 1,
      targetXNorm: 0.55,
      targetWidthMul: 1,
      motion: { axis: MotionAxis.None, amplitude: 0, frequency: 0, phase: 0 },
      fakes: [{ xNorm: 0.75, widthMul: 1, motionPhaseOffset: 0 }],
    }, 360)

    // Real ~200, fake ~270
    expect(t.isNearFake(270)).toBe(true)
    expect(t.isNearFake(200)).toBe(false)
    expect(t.isNearFake(100)).toBe(false)
  })
})
