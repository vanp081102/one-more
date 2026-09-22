import { corePatternTemplates } from './CorePatterns'
import { SeededRNG } from './SeededRNG'
import { validatePattern } from './PatternValidator'
import {
  MotionAxis,
  type BeatPattern,
  type FakeTargetSpec,
  type PatternContext,
  type TargetMotion,
} from './PatternTypes'

export interface GeneratorOptions {
  seed: number
  beatIndex: number
  ctx: PatternContext
  /** When continuing a multi-stage chain, force chainLength 1 link patterns */
  chainLink?: boolean
}

export class PatternGenerator {
  private rng: SeededRNG

  constructor(seed: number) {
    this.rng = new SeededRNG(seed)
  }

  reset(seed: number): void {
    this.rng = new SeededRNG(seed)
  }

  next(options: GeneratorOptions): BeatPattern {
    const { ctx, chainLink, beatIndex } = options
    const allowMoving = ctx.allowMoving
    const allowFake = ctx.allowFake && !chainLink
    const allowReverse = ctx.allowReverse
    const allowChain = ctx.allowChain && !chainLink
    const allowMemory = ctx.allowMemory
    const chaos = ctx.chaosMix
    const master = ctx.masterPressure
    const reverseBias = ctx.reverseBias ?? 0
    const movingBias = ctx.movingBias ?? 0
    const memoryBias = ctx.memoryBias ?? 0
    const fakeBias = ctx.fakeBias ?? 0

    const pool = corePatternTemplates.filter((t) => {
      if (t.motion.axis !== MotionAxis.None && !allowMoving) return false
      if (t.direction === -1 && !allowReverse) return false
      if (t.fakes.length > 0 && !allowFake) return false
      if (t.chainLength > 1 && !allowChain) return false
      if (t.memory && !allowMemory) return false
      if (chainLink && (t.chainLength > 1 || t.fakes.length > 0 || t.memory)) return false
      return true
    })

    const safePool = pool.length > 0 ? pool : [corePatternTemplates[0]!]
    const candidates = this.pickCandidatePool(
      safePool,
      allowMoving,
      allowFake,
      allowReverse,
      allowChain,
      allowMemory,
      !!chainLink,
      chaos,
      reverseBias,
      movingBias,
      memoryBias,
      fakeBias,
    )

    const enrichedCtx: PatternContext = {
      ...ctx,
      allowMoving,
      allowFake,
      allowReverse,
      allowChain,
      allowMemory,
    }

    for (let attempt = 0; attempt < 14; attempt++) {
      const base = this.rng.pick(candidates)
      const pattern = this.mutate(
        base,
        allowMoving,
        allowFake,
        allowReverse,
        allowChain,
        allowMemory,
        !!chainLink,
        chaos,
        master,
        reverseBias,
        movingBias,
        memoryBias,
        fakeBias,
        beatIndex,
      )
      const result = validatePattern(pattern, enrichedCtx)
      if (result.ok) return pattern
    }

    // Guaranteed-safe fallback — far enough for min reaction at high speeds
    const forceRev =
      allowReverse &&
      (reverseBias >= 0.7 ? beatIndex % 2 === 0 : reverseBias > 0 && this.rng.chance(reverseBias))
    const safeNorm = directionSafeNorm(ctx, forceRev ? -1 : 1)
    return {
      templateId: 'fallback_static',
      direction: forceRev ? -1 : 1,
      speedMul: master ? 1.05 : 1,
      targetXNorm: safeNorm,
      targetWidthMul: master ? 0.9 : 1,
      motion: { axis: MotionAxis.None, amplitude: 0, frequency: 0, phase: 0 },
      fakes: [],
      chainLength: 1,
      memory: false,
    }
  }

  private pickCandidatePool(
    safePool: readonly BeatPattern[],
    allowMoving: boolean,
    allowFake: boolean,
    allowReverse: boolean,
    allowChain: boolean,
    allowMemory: boolean,
    chainLink: boolean,
    chaos: boolean,
    reverseBias: number,
    movingBias: number,
    memoryBias: number,
    fakeBias: number,
  ): readonly BeatPattern[] {
    if (chainLink) {
      const simple = safePool.filter(
        (t) => t.chainLength === 1 && t.fakes.length === 0 && !t.memory,
      )
      return simple.length > 0 ? simple : safePool
    }

    const weight = chaos ? 0.62 : 0.45

    // Mode biases take priority over default phase weights
    if (allowMemory && memoryBias > 0 && this.rng.chance(memoryBias)) {
      const mem = safePool.filter((t) => t.memory)
      if (mem.length > 0) return mem
    }
    if (allowReverse && reverseBias > 0 && this.rng.chance(Math.max(reverseBias, 0.55))) {
      const rev = safePool.filter((t) => t.direction === -1)
      if (rev.length > 0) return rev
    }
    if (allowMoving && movingBias > 0 && this.rng.chance(Math.max(movingBias, 0.55))) {
      const moving = safePool.filter((t) => t.motion.axis !== MotionAxis.None)
      if (moving.length > 0) return moving
    }
    if (allowFake && fakeBias > 0 && this.rng.chance(Math.max(fakeBias, 0.45))) {
      const withFake = safePool.filter((t) => t.fakes.length > 0)
      if (withFake.length > 0) return withFake
    }

    if (allowMemory && this.rng.chance(weight)) {
      const mem = safePool.filter((t) => t.memory)
      if (mem.length > 0) return mem
    }
    if (allowChain && this.rng.chance(weight)) {
      const chained = safePool.filter((t) => t.chainLength > 1)
      if (chained.length > 0) return chained
    }
    if (allowReverse && this.rng.chance(chaos ? 0.5 : 0.35)) {
      const rev = safePool.filter((t) => t.direction === -1)
      if (rev.length > 0) return rev
    }
    if (allowFake && this.rng.chance(weight)) {
      const withFake = safePool.filter((t) => t.fakes.length > 0)
      if (withFake.length > 0) return withFake
    }
    if (allowMoving && this.rng.chance(chaos ? 0.65 : 0.5)) {
      const moving = safePool.filter((t) => t.motion.axis !== MotionAxis.None)
      if (moving.length > 0) return moving
    }
    const statics = safePool.filter(
      (t) =>
        t.motion.axis === MotionAxis.None &&
        t.direction === 1 &&
        t.fakes.length === 0 &&
        t.chainLength === 1 &&
        !t.memory,
    )
    return statics.length > 0 ? statics : safePool
  }

  private mutate(
    base: BeatPattern,
    allowMoving: boolean,
    allowFake: boolean,
    allowReverse: boolean,
    allowChain: boolean,
    allowMemory: boolean,
    chainLink: boolean,
    chaos: boolean,
    master: boolean,
    reverseBias: number,
    movingBias: number,
    memoryBias: number,
    fakeBias: number,
    beatIndex: number,
  ): BeatPattern {
    let direction: 1 | -1 = 1
    if (allowReverse) {
      if (reverseBias >= 0.75) {
        // Hard mirror: alternate every beat, with occasional double-flip
        direction = beatIndex % 2 === 0 ? -1 : 1
        if (this.rng.chance(0.28)) direction = direction === 1 ? -1 : 1
      } else if (reverseBias > 0 && this.rng.chance(reverseBias)) {
        direction = -1
      } else if (base.direction === -1) {
        direction = -1
      } else if (this.rng.chance(chaos ? 0.18 : 0.08)) {
        direction = -1
      }
    }

    let motion: TargetMotion =
      base.motion.axis === MotionAxis.None || !allowMoving
        ? { axis: MotionAxis.None, amplitude: 0, frequency: 0, phase: 0 }
        : {
            axis: base.motion.axis,
            amplitude: base.motion.amplitude * this.rng.nextFloat(0.85, 1.15),
            frequency: base.motion.frequency * this.rng.nextFloat(0.9, 1.1),
            phase: base.motion.phase + this.rng.nextFloat(0, Math.PI * 2),
          }

    // Mode / chaos: inject motion onto static templates
    const injectMotion =
      allowMoving &&
      motion.axis === MotionAxis.None &&
      (movingBias > 0
        ? this.rng.chance(Math.max(0.55, movingBias))
        : chaos && this.rng.chance(0.35))
    if (injectMotion) {
      motion = {
        axis: this.rng.chance(0.5) ? MotionAxis.X : MotionAxis.Y,
        amplitude: this.rng.nextFloat(movingBias > 0.7 ? 22 : 16, movingBias > 0.7 ? 38 : 28),
        frequency: this.rng.nextFloat(0.35, movingBias > 0.7 ? 0.85 : 0.65),
        phase: this.rng.nextFloat(0, Math.PI * 2),
      }
    }

    const targetXNorm = clamp(
      base.targetXNorm +
        this.rng.nextFloat(-0.04, 0.04) +
        (chainLink ? (direction === 1 ? -0.06 : 0.06) : 0),
      direction === 1 ? 0.4 : 0.28,
      direction === 1 ? 0.8 : 0.58,
    )

    let fakes: FakeTargetSpec[] = []
    const fakeChance = Math.max(fakeBias, chaos ? 0.42 : 0.3)
    if (allowFake && !chainLink) {
      if (base.fakes.length > 0) {
        fakes = base.fakes.map((f) => ({
          xNorm: clamp(f.xNorm + this.rng.nextFloat(-0.03, 0.03), 0.26, 0.88),
          widthMul: clamp(f.widthMul * this.rng.nextFloat(0.95, 1.05), 0.85, 1.15),
          motionPhaseOffset: f.motionPhaseOffset + this.rng.nextFloat(0, 1),
        }))
      } else if (this.rng.chance(fakeChance)) {
        const side = this.rng.chance(0.5) ? 1 : -1
        fakes = [
          {
            xNorm: clamp(targetXNorm + this.rng.nextFloat(0.15, 0.22) * side, 0.26, 0.88),
            widthMul: 1,
            motionPhaseOffset: this.rng.nextFloat(0, Math.PI),
          },
        ]
        if (chaos && this.rng.chance(0.35)) {
          const other = -side
          fakes.push({
            xNorm: clamp(targetXNorm + this.rng.nextFloat(0.16, 0.24) * other, 0.26, 0.88),
            widthMul: 1,
            motionPhaseOffset: this.rng.nextFloat(0, Math.PI),
          })
        }
      }
    }

    let chainLength = 1
    const chainChance = chaos ? 0.38 : 0.25
    if (allowChain && !chainLink) {
      chainLength = base.chainLength > 1
        ? base.chainLength
        : this.rng.chance(chainChance)
          ? this.rng.chance(chaos ? 0.5 : 0.4) ? 3 : 2
          : 1
    }

    const memChance = Math.max(memoryBias, chaos ? 0.38 : 0.3)
    const memory =
      allowMemory &&
      (base.memory ||
        (!chainLink && this.rng.chance(memChance)) ||
        (memoryBias >= 0.7 && !chainLink && this.rng.chance(0.65)))
    if (memory) fakes = []

    const speedBias = master ? 1.08 : chaos ? 1.04 : reverseBias >= 0.75 ? 1.06 : 1
    const widthBias = master ? 0.92 : reverseBias >= 0.75 ? 0.94 : 1

    return {
      templateId: base.templateId,
      direction,
      speedMul: clamp(
        base.speedMul * this.rng.nextFloat(0.92, 1.08) * (chainLink ? 1.08 : 1) * speedBias,
        0.75,
        master ? 1.5 : 1.4,
      ),
      targetXNorm,
      targetWidthMul: clamp(
        base.targetWidthMul * this.rng.nextFloat(0.95, 1.05) * widthBias,
        master ? 0.75 : 0.8,
        1.15,
      ),
      motion,
      fakes,
      chainLength,
      memory,
    }
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/** Pick a target X that still leaves enough travel time at current speed. */
function directionSafeNorm(ctx: PatternContext, direction: 1 | -1 = 1): number {
  const speed = Math.max(1, ctx.baseSpeed)
  const minDist = ctx.minReactionSec * speed
  const start = direction === 1 ? ctx.objectStartX : ctx.playWidth - ctx.objectStartX
  if (direction === 1) {
    const need = start + minDist + 8
    const norm = need / Math.max(1, ctx.playWidth)
    return clamp(Math.max(0.55, norm), 0.55, 0.82)
  }
  const need = start - minDist - 8
  const norm = need / Math.max(1, ctx.playWidth)
  return clamp(Math.min(0.45, norm), 0.28, 0.55)
}
