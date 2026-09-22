export const DifficultyPhaseId = {
  Discovery: 1,
  Speed: 2,
  Precision: 3,
  Moving: 4,
  Fake: 5,
  Reversal: 6,
  MultiStage: 7,
  Memory: 8,
  Chaos: 9,
  Master: 10,
} as const

export type DifficultyPhaseId =
  (typeof DifficultyPhaseId)[keyof typeof DifficultyPhaseId]

export interface PhaseDefinition {
  id: DifficultyPhaseId
  enterAtSuccesses: number
  name: string
  speedPerSuccess: number
  widthShrinkPerSuccess: number
  allowMovingTarget: boolean
  allowFakeTargets: boolean
  allowReverse: boolean
  allowChain: boolean
  allowMemory: boolean
  /** Aggressive feature mixing in generator */
  chaosMix: boolean
  /** Pure pressure — no new features, max ramp */
  masterPressure: boolean
}

export interface DifficultyConfig {
  baseSpeed: number
  maxSpeed: number
  /** Hard ceiling used once Master begins */
  masterMaxSpeed: number
  baseTargetWidth: number
  minTargetWidth: number
  masterMinTargetWidth: number
  objectStartX: number
  targetX: number
  autoMissPastMs: number
  minReactionSec: number
  maxMotionAmpFrac: number
  minFakeGapNorm: number
  memoryTelegraphSec: number
  /** Shorter telegraph under Master pressure */
  masterMemoryTelegraphSec: number
  phases: readonly PhaseDefinition[]
}

const allOff = {
  allowMovingTarget: false,
  allowFakeTargets: false,
  allowReverse: false,
  allowChain: false,
  allowMemory: false,
  chaosMix: false,
  masterPressure: false,
} as const

export const defaultDifficultyConfig: DifficultyConfig = {
  baseSpeed: 240,
  maxSpeed: 680,
  masterMaxSpeed: 820,
  baseTargetWidth: 110,
  minTargetWidth: 40,
  masterMinTargetWidth: 32,
  objectStartX: 40,
  targetX: 0.62,
  autoMissPastMs: 120,
  minReactionSec: 0.38,
  maxMotionAmpFrac: 0.12,
  minFakeGapNorm: 0.14,
  memoryTelegraphSec: 0.55,
  masterMemoryTelegraphSec: 0.38,
  phases: [
    {
      id: DifficultyPhaseId.Discovery,
      enterAtSuccesses: 0,
      name: 'DISCOVERY',
      speedPerSuccess: 3,
      widthShrinkPerSuccess: 0.3,
      ...allOff,
    },
    {
      id: DifficultyPhaseId.Speed,
      enterAtSuccesses: 8,
      name: 'SPEED',
      speedPerSuccess: 14,
      widthShrinkPerSuccess: 0.4,
      ...allOff,
    },
    {
      id: DifficultyPhaseId.Precision,
      enterAtSuccesses: 20,
      name: 'PRECISION',
      speedPerSuccess: 6,
      widthShrinkPerSuccess: 2.4,
      ...allOff,
    },
    {
      id: DifficultyPhaseId.Moving,
      enterAtSuccesses: 32,
      name: 'MOVING',
      speedPerSuccess: 5,
      widthShrinkPerSuccess: 0.6,
      ...allOff,
      allowMovingTarget: true,
    },
    {
      id: DifficultyPhaseId.Fake,
      enterAtSuccesses: 45,
      name: 'FAKE',
      speedPerSuccess: 4,
      widthShrinkPerSuccess: 0.4,
      ...allOff,
      allowMovingTarget: true,
      allowFakeTargets: true,
    },
    {
      id: DifficultyPhaseId.Reversal,
      enterAtSuccesses: 58,
      name: 'REVERSAL',
      speedPerSuccess: 4,
      widthShrinkPerSuccess: 0.35,
      ...allOff,
      allowMovingTarget: true,
      allowFakeTargets: true,
      allowReverse: true,
    },
    {
      id: DifficultyPhaseId.MultiStage,
      enterAtSuccesses: 72,
      name: 'MULTI',
      speedPerSuccess: 3,
      widthShrinkPerSuccess: 0.3,
      ...allOff,
      allowMovingTarget: true,
      allowFakeTargets: true,
      allowReverse: true,
      allowChain: true,
    },
    {
      id: DifficultyPhaseId.Memory,
      enterAtSuccesses: 90,
      name: 'MEMORY',
      speedPerSuccess: 3,
      widthShrinkPerSuccess: 0.25,
      ...allOff,
      allowMovingTarget: true,
      allowReverse: true,
      allowChain: true,
      allowMemory: true,
    },
    {
      id: DifficultyPhaseId.Chaos,
      enterAtSuccesses: 110,
      name: 'CHAOS',
      speedPerSuccess: 4,
      widthShrinkPerSuccess: 0.4,
      allowMovingTarget: true,
      allowFakeTargets: true,
      allowReverse: true,
      allowChain: true,
      allowMemory: true,
      chaosMix: true,
      masterPressure: false,
    },
    {
      id: DifficultyPhaseId.Master,
      enterAtSuccesses: 135,
      name: 'MASTER',
      speedPerSuccess: 7,
      widthShrinkPerSuccess: 0.55,
      allowMovingTarget: true,
      allowFakeTargets: true,
      allowReverse: true,
      allowChain: true,
      allowMemory: true,
      chaosMix: true,
      masterPressure: true,
    },
  ],
}
