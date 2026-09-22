export const MotionAxis = {
  None: 'none',
  X: 'x',
  Y: 'y',
  XY: 'xy',
} as const

export type MotionAxis = (typeof MotionAxis)[keyof typeof MotionAxis]

export interface TargetMotion {
  axis: MotionAxis
  amplitude: number
  frequency: number
  phase: number
}

export interface FakeTargetSpec {
  xNorm: number
  widthMul: number
  motionPhaseOffset: number
}

export interface BeatPattern {
  templateId: string
  direction: 1 | -1
  speedMul: number
  targetXNorm: number
  targetWidthMul: number
  motion: TargetMotion
  fakes: readonly FakeTargetSpec[]
  /** 1 = single beat; 2–3 = multi-stage chain */
  chainLength: number
  /** After telegraph, hide real target — release from memory */
  memory: boolean
}

export interface PatternContext {
  playWidth: number
  playHeight: number
  baseSpeed: number
  targetWidth: number
  objectStartX: number
  minReactionSec: number
  maxAmpFrac: number
  minFakeGapNorm: number
  allowMoving: boolean
  allowFake: boolean
  allowReverse: boolean
  allowChain: boolean
  allowMemory: boolean
  chaosMix: boolean
  masterPressure: boolean
  /** Mode-driven preference weights (0–1) */
  reverseBias?: number
  movingBias?: number
  memoryBias?: number
  fakeBias?: number
}

export interface ValidationResult {
  ok: boolean
  reasons: string[]
}
