import {
  MotionAxis,
  type BeatPattern,
  type FakeTargetSpec,
  type TargetMotion,
} from '../pattern/PatternTypes'

export interface LiveFakeTarget {
  x: number
  yOffset: number
  width: number
  baseX: number
  spec: FakeTargetSpec
}

export class TargetController {
  /** Live center X (includes motion) */
  x = 0
  /** Live center Y offset from rail (includes motion) */
  yOffset = 0
  width = 96
  private baseX = 0
  private motion: TargetMotion = {
    axis: MotionAxis.None,
    amplitude: 0,
    frequency: 0,
    phase: 0,
  }
  private elapsed = 0
  private fakeSpecs: FakeTargetSpec[] = []
  private fakeWidthBase = 96
  readonly fakes: LiveFakeTarget[] = []

  applyPattern(baseX: number, width: number, pattern: BeatPattern, playWidth: number): void {
    this.baseX = baseX
    this.width = width
    this.fakeWidthBase = width
    this.motion = { ...pattern.motion }
    this.elapsed = 0
    this.x = baseX
    this.yOffset = 0
    this.fakeSpecs = pattern.fakes.map((f) => ({ ...f }))
    this.fakes.length = 0
    for (const spec of this.fakeSpecs) {
      this.fakes.push({
        x: playWidth * spec.xNorm,
        yOffset: 0,
        width: this.fakeWidthBase * spec.widthMul,
        baseX: playWidth * spec.xNorm,
        spec,
      })
    }
    this.sample(0)
  }

  update(dt: number): void {
    this.elapsed += dt
    this.sample(this.elapsed)
  }

  private sample(t: number): void {
    const { axis, amplitude, frequency, phase } = this.motion
    if (axis === MotionAxis.None || amplitude === 0) {
      this.x = this.baseX
      this.yOffset = 0
      for (const fake of this.fakes) {
        fake.x = fake.baseX
        fake.yOffset = 0
        fake.width = this.fakeWidthBase * fake.spec.widthMul
      }
      return
    }

    const wave = Math.sin(t * frequency * Math.PI * 2 + phase)
    const ox = axis === MotionAxis.X || axis === MotionAxis.XY ? amplitude * wave : 0
    const oy =
      axis === MotionAxis.Y || axis === MotionAxis.XY
        ? amplitude * Math.cos(t * frequency * Math.PI * 2 + phase)
        : 0
    this.x = this.baseX + ox
    this.yOffset = oy

    for (const fake of this.fakes) {
      const fp = phase + fake.spec.motionPhaseOffset
      const fw = Math.sin(t * frequency * Math.PI * 2 + fp)
      const fox = axis === MotionAxis.X || axis === MotionAxis.XY ? amplitude * fw : 0
      const foy =
        axis === MotionAxis.Y || axis === MotionAxis.XY
          ? amplitude * Math.cos(t * frequency * Math.PI * 2 + fp)
          : 0
      fake.x = fake.baseX + fox
      fake.yOffset = foy
      fake.width = this.fakeWidthBase * fake.spec.widthMul
    }
  }

  get left(): number {
    return this.x - this.width / 2
  }

  get right(): number {
    return this.x + this.width / 2
  }

  isMoving(): boolean {
    return this.motion.axis !== MotionAxis.None && this.motion.amplitude > 0
  }

  hasFakes(): boolean {
    return this.fakes.length > 0
  }

  /** Memory: full visible during telegraph, then hidden (ghost optional). */
  private memoryEnabled = false
  private memoryVisible = true
  private memoryElapsed = 0
  private memoryTelegraphSec = 0.55

  setMemory(enabled: boolean, telegraphSec: number): void {
    this.memoryEnabled = enabled
    this.memoryTelegraphSec = telegraphSec
    this.memoryElapsed = 0
    this.memoryVisible = true
  }

  updateMemory(dt: number): void {
    if (!this.memoryEnabled) {
      this.memoryVisible = true
      return
    }
    this.memoryElapsed += dt
    this.memoryVisible = this.memoryElapsed < this.memoryTelegraphSec
  }

  isMemoryMode(): boolean {
    return this.memoryEnabled
  }

  isMemoryVisible(): boolean {
    return this.memoryVisible
  }

  getMemoryReveal(): number {
    if (!this.memoryEnabled) return 1
    if (this.memoryVisible) {
      return Math.min(1, this.memoryElapsed / 0.08)
    }
    return 0
  }

  /**
   * True if object is closer to a fake center than the real target
   * and within the fake's half-width (player likely aimed at decoy).
   */
  isNearFake(objectX: number): boolean {
    if (this.fakes.length === 0) return false
    const distReal = Math.abs(objectX - this.x)
    for (const fake of this.fakes) {
      const distFake = Math.abs(objectX - fake.x)
      if (distFake < distReal && distFake <= fake.width / 2) {
        return true
      }
    }
    return false
  }
}
