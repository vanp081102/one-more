import {
  MotionAxis,
  type BeatPattern,
  type PatternContext,
  type ValidationResult,
} from './PatternTypes'

export function validatePattern(
  pattern: BeatPattern,
  ctx: PatternContext,
): ValidationResult {
  const reasons: string[] = []

  if (pattern.direction === -1 && !ctx.allowReverse) {
    reasons.push('reverse_not_allowed')
  }
  if (pattern.motion.axis !== MotionAxis.None && !ctx.allowMoving) {
    reasons.push('motion_not_allowed')
  }
  if (pattern.fakes.length > 0 && !ctx.allowFake) {
    reasons.push('fake_not_allowed')
  }
  if (pattern.chainLength > 1 && !ctx.allowChain) {
    reasons.push('chain_not_allowed')
  }
  if (pattern.memory && !ctx.allowMemory) {
    reasons.push('memory_not_allowed')
  }
  if (pattern.chainLength < 1 || pattern.chainLength > 3) {
    reasons.push('chain_length_invalid')
  }

  // Memory + fakes is too hostile — disallow
  if (pattern.memory && pattern.fakes.length > 0) {
    reasons.push('memory_with_fakes')
  }

  if (pattern.speedMul <= 0 || pattern.speedMul > 2.5) {
    reasons.push('speed_mul_out_of_range')
  }
  if (pattern.targetXNorm < 0.28 || pattern.targetXNorm > 0.88) {
    reasons.push('target_x_out_of_bounds')
  }

  const speed = ctx.baseSpeed * pattern.speedMul
  const baseTargetX = ctx.playWidth * pattern.targetXNorm
  const startX =
    pattern.direction === 1 ? ctx.objectStartX : ctx.playWidth - ctx.objectStartX
  const distance = Math.abs(baseTargetX - startX)
  const travelSec = speed > 0 ? distance / speed : 0
  if (travelSec < ctx.minReactionSec) {
    reasons.push('reaction_too_short')
  }

  const maxAmp = ctx.playWidth * ctx.maxAmpFrac
  if (pattern.motion.amplitude > maxAmp + 0.5) {
    reasons.push('amplitude_too_large')
  }

  if (pattern.motion.axis !== MotionAxis.None) {
    if (pattern.motion.frequency <= 0 || pattern.motion.frequency > 2) {
      reasons.push('frequency_out_of_range')
    }
    const halfW = (ctx.targetWidth * pattern.targetWidthMul) / 2
    const minX = baseTargetX - pattern.motion.amplitude - halfW
    const maxX = baseTargetX + pattern.motion.amplitude + halfW
    if (pattern.motion.axis === MotionAxis.X || pattern.motion.axis === MotionAxis.XY) {
      if (minX < 8 || maxX > ctx.playWidth - 8) {
        reasons.push('motion_exits_playfield')
      }
    }
  }

  for (const fake of pattern.fakes) {
    if (fake.xNorm < 0.22 || fake.xNorm > 0.9) {
      reasons.push('fake_x_out_of_bounds')
      break
    }
    if (Math.abs(fake.xNorm - pattern.targetXNorm) < ctx.minFakeGapNorm) {
      reasons.push('fake_too_close')
      break
    }
  }

  return { ok: reasons.length === 0, reasons }
}
