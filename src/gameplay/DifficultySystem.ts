import {
  type DifficultyConfig,
  type PhaseDefinition,
  DifficultyPhaseId,
} from '../data/DifficultyConfig'

export class DifficultySystem {
  private config: DifficultyConfig
  private speed: number
  private targetWidth: number
  private successes = 0
  private phase: PhaseDefinition
  private speedRampMul = 1

  constructor(config: DifficultyConfig) {
    this.config = config
    this.speed = config.baseSpeed
    this.targetWidth = config.baseTargetWidth
    this.phase = this.resolvePhase(0)
  }

  getConfig(): DifficultyConfig {
    return this.config
  }

  reset(): void {
    this.speed = this.config.baseSpeed
    this.targetWidth = this.config.baseTargetWidth
    this.successes = 0
    this.phase = this.resolvePhase(0)
    this.speedRampMul = 1
  }

  /**
   * Bootstrap to a success count with optional speed ramp multiplier (Speed mode).
   */
  bootstrap(startSuccesses: number, speedRampMul = 1): void {
    this.speedRampMul = speedRampMul
    this.speed = this.config.baseSpeed
    this.targetWidth = this.config.baseTargetWidth
    this.successes = 0
    this.phase = this.resolvePhase(0)

    const steps = Math.max(0, Math.floor(startSuccesses))
    for (let i = 0; i < steps; i++) {
      this.applySuccessStep()
    }
  }

  getSpeed(): number {
    return this.speed
  }

  getTargetWidth(): number {
    return this.targetWidth
  }

  getSuccesses(): number {
    return this.successes
  }

  getPhase(): PhaseDefinition {
    return this.phase
  }

  getPhaseId(): DifficultyPhaseId {
    return this.phase.id
  }

  allowsMovingTarget(): boolean {
    return this.phase.allowMovingTarget
  }

  allowsFakeTargets(): boolean {
    return this.phase.allowFakeTargets
  }

  allowsReverse(): boolean {
    return this.phase.allowReverse
  }

  allowsChain(): boolean {
    return this.phase.allowChain
  }

  allowsMemory(): boolean {
    return this.phase.allowMemory
  }

  isChaosMix(): boolean {
    return this.phase.chaosMix
  }

  isMasterPressure(): boolean {
    return this.phase.masterPressure
  }

  onSuccess(): { phaseChanged: boolean; phase: PhaseDefinition } {
    const prevId = this.phase.id
    this.applySuccessStep()
    return {
      phaseChanged: prevId !== this.phase.id,
      phase: this.phase,
    }
  }

  resolveTargetX(playWidth: number): number {
    return playWidth * this.config.targetX
  }

  getObjectStartX(): number {
    return this.config.objectStartX
  }

  getAutoMissPastMs(): number {
    return this.config.autoMissPastMs
  }

  getMemoryTelegraphSec(): number {
    return this.phase.masterPressure
      ? this.config.masterMemoryTelegraphSec
      : this.config.memoryTelegraphSec
  }

  private applySuccessStep(): void {
    this.successes += 1
    this.phase = this.resolvePhase(this.successes)

    const speedCap = this.phase.masterPressure
      ? this.config.masterMaxSpeed
      : this.config.maxSpeed
    const widthFloor = this.phase.masterPressure
      ? this.config.masterMinTargetWidth
      : this.config.minTargetWidth

    this.speed = Math.min(
      speedCap,
      this.speed + this.phase.speedPerSuccess * this.speedRampMul,
    )
    this.targetWidth = Math.max(
      widthFloor,
      this.targetWidth - this.phase.widthShrinkPerSuccess,
    )
  }

  private resolvePhase(successes: number): PhaseDefinition {
    const sorted = [...this.config.phases].sort(
      (a, b) => a.enterAtSuccesses - b.enterAtSuccesses,
    )
    let current = sorted[0]
    if (!current) {
      return {
        id: DifficultyPhaseId.Discovery,
        enterAtSuccesses: 0,
        name: 'DISCOVERY',
        speedPerSuccess: 0,
        widthShrinkPerSuccess: 0,
        allowMovingTarget: false,
        allowFakeTargets: false,
        allowReverse: false,
        allowChain: false,
        allowMemory: false,
        chaosMix: false,
        masterPressure: false,
      }
    }
    for (const p of sorted) {
      if (successes >= p.enterAtSuccesses) current = p
    }
    return current
  }
}
