import { EventBus, GameEvents } from '../core/EventBus'
import type { GameModeConfig } from '../data/GameModeConfig'
import { gameModes, GameModeId, isPerfectEnough, dailySeedFor } from '../data/GameModeConfig'
import { Grade, RunPhase, EarlyLate, type Judgement, type RunStats } from '../core/types'
import type { TimingConfig } from '../data/TimingConfig'
import type { ScoreConfig } from '../data/ScoreConfig'
import type { DifficultyConfig } from '../data/DifficultyConfig'
import { InputAction } from '../input/InputAction'
import type { InputManager } from '../input/InputManager'
import { TimingSystem, deltaMsFromPosition } from './TimingSystem'
import { ScoreSystem } from './ScoreSystem'
import { ComboSystem } from './ComboSystem'
import { DifficultySystem } from './DifficultySystem'
import { ObjectController } from './ObjectController'
import { TargetController } from './TargetController'
import { PatternGenerator } from '../pattern/PatternGenerator'
import type { BeatPattern, PatternContext } from '../pattern/PatternTypes'
import { MotionAxis } from '../pattern/PatternTypes'
import { WowMomentController } from './WowMoment'

export interface RunEndedPayload {
  stats: RunStats
  judgement: Judgement
  accuracy: number
  bestScore: number
  bestCombo: number
  seed: number
  modeId: GameModeId
  modeLabel: string
  /** Why the run ended */
  endReason: 'miss' | 'imperfect' | 'complete'
  isNewBest: boolean
  streak: number
}

export interface HudPayload {
  score: number
  combo: number
  phase: RunPhase
  hint: string
  difficultyPhase: string
  chainIndex: number
  chainTotal: number
  memoryActive: boolean
  /** Hide HUD during wow beat / celebration */
  wowHideUi: boolean
}

export interface FeedbackPayload {
  judgement: Judgement
  pointsGained: number
  combo: number
  worldX: number
  worldY: number
  softMiss?: boolean
  wowComplete?: boolean
}

export class RunManager {
  readonly timing: TimingSystem
  readonly score: ScoreSystem
  readonly combo: ComboSystem
  readonly difficulty: DifficultySystem
  readonly object = new ObjectController()
  readonly target = new TargetController()
  readonly wow = new WowMomentController()

  phase: RunPhase = RunPhase.Idle
  private readonly bus: EventBus
  private readonly input: InputManager
  private holdStartMs: number | null = null
  private playWidth = 360
  private playHeight = 640
  private hits = 0
  private perfects = 0
  private ultras = 0
  private misses = 0
  private beatIndex = 0
  private seed = 0
  private generator: PatternGenerator
  private currentPattern: BeatPattern | null = null
  private beatSpeed = 240
  private chainTotal = 1
  private chainIndex = 0
  private chainRemaining = 0
  private showTimingGhost = true
  private mode: GameModeConfig = gameModes[GameModeId.Classic]
  private onBestUpdate:
    | ((
        score: number,
        combo: number,
        accuracy: number,
        modeId: GameModeId,
        seed: number,
      ) => { bestScore: number; bestCombo: number; isNewBest?: boolean; streak?: number })
    | null = null

  constructor(
    bus: EventBus,
    input: InputManager,
    timingConfig: TimingConfig,
    scoreConfig: ScoreConfig,
    difficultyConfig: DifficultyConfig,
  ) {
    this.bus = bus
    this.input = input
    this.timing = new TimingSystem(timingConfig)
    this.score = new ScoreSystem(scoreConfig)
    this.combo = new ComboSystem()
    this.difficulty = new DifficultySystem(difficultyConfig)
    this.seed = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0
    this.generator = new PatternGenerator(this.seed)
  }

  getSeed(): number {
    return this.seed
  }

  getCurrentPattern(): BeatPattern | null {
    return this.currentPattern
  }

  setShowTimingGhost(value: boolean): void {
    this.showTimingGhost = value
  }

  showsTimingGhost(): boolean {
    return this.showTimingGhost
  }

  getChainProgress(): { index: number; total: number } {
    return { index: this.chainIndex, total: this.chainTotal }
  }

  getMode(): GameModeConfig {
    return this.mode
  }

  setMode(modeId: GameModeId): void {
    this.mode = gameModes[modeId]
  }

  setBestUpdater(
    fn: (
      score: number,
      combo: number,
      accuracy: number,
      modeId: GameModeId,
      seed: number,
    ) => { bestScore: number; bestCombo: number; isNewBest?: boolean; streak?: number },
  ): void {
    this.onBestUpdate = fn
  }


  setPlayfield(width: number, height: number): void {
    this.playWidth = width
    this.playHeight = height
    if (this.currentPattern) this.applyCurrentPattern()
  }

  startRun(seed?: number): void {
    if (this.mode.dailySeed) {
      this.seed = dailySeedFor()
    } else {
      this.seed =
        seed !== undefined
          ? seed >>> 0
          : (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0
    }
    this.generator.reset(this.seed)
    this.score.reset()
    this.combo.reset()
    this.difficulty.reset()
    this.difficulty.bootstrap(this.mode.startSuccesses, this.mode.speedRampMul)
    this.hits = 0
    this.perfects = 0
    this.ultras = 0
    this.misses = 0
    this.beatIndex = 0
    this.chainTotal = 1
    this.chainIndex = 0
    this.chainRemaining = 0
    this.wow.reset()
    this.phase = RunPhase.Idle
    this.resetBeat(false)
    this.input.setEnabled(true)
    this.bus.emit(GameEvents.RunStarted, { seed: this.seed, modeId: this.mode.id })
    this.emitHud('HOLD')
  }

  /** Begin a beat if already holding (e.g. ONE MORE via primary press). */
  tryBeginHold(nowMs: number): void {
    if (this.phase !== RunPhase.Idle) return
    if (this.wow.isCelebrating()) return
    const action = this.input.getAction(InputAction.Primary)
    if (!action.pressed) return
    this.holdStartMs = nowMs
    this.object.startMoving()
    this.phase = RunPhase.Holding
    this.bus.emit(GameEvents.HoldStarted, {
      wow: this.wow.isActive(),
      travelSec: this.estimateTravelSec(),
    })
    this.emitHud('')
  }

  private buildContext(): PatternContext {
    const cfg = this.difficulty.getConfig()
    const mode = this.mode
    return {
      playWidth: this.playWidth,
      playHeight: this.playHeight,
      baseSpeed: this.difficulty.getSpeed(),
      targetWidth: this.difficulty.getTargetWidth(),
      objectStartX: this.difficulty.getObjectStartX(),
      minReactionSec: cfg.minReactionSec,
      maxAmpFrac: cfg.maxMotionAmpFrac,
      minFakeGapNorm: cfg.minFakeGapNorm,
      allowMoving: this.difficulty.allowsMovingTarget() || !!mode.unlockMoving,
      allowFake: this.difficulty.allowsFakeTargets() || !!mode.unlockFake,
      allowReverse: this.difficulty.allowsReverse() || !!mode.unlockReverse,
      allowChain: this.difficulty.allowsChain() || !!mode.unlockChain,
      allowMemory: this.difficulty.allowsMemory() || !!mode.unlockMemory,
      chaosMix: this.difficulty.isChaosMix(),
      masterPressure: this.difficulty.isMasterPressure(),
      reverseBias: mode.bias?.reverse,
      movingBias: mode.bias?.moving,
      memoryBias: mode.bias?.memory,
      fakeBias: mode.bias?.fake,
    }
  }

  private resetBeat(chainLink = false): void {
    if (this.wow.isArmed()) {
      this.currentPattern = this.buildWowPattern()
      this.wow.activate()
      this.bus.emit(GameEvents.WowBeat, null)
      this.chainTotal = 1
      this.chainIndex = 0
      this.chainRemaining = 1
    } else {
      this.currentPattern = this.generator.next({
        seed: this.seed,
        beatIndex: this.beatIndex,
        ctx: this.buildContext(),
        chainLink,
      })

      if (!chainLink) {
        this.chainTotal = Math.max(1, this.currentPattern.chainLength)
        this.chainIndex = 0
        this.chainRemaining = this.chainTotal
      }
    }

    this.applyCurrentPattern()
    this.holdStartMs = null
    this.phase = RunPhase.Idle
  }

  private buildWowPattern(): BeatPattern {
    return {
      templateId: 'wow_100',
      direction: 1,
      speedMul: 1,
      targetXNorm: 0.62,
      targetWidthMul: 1.05,
      motion: { axis: MotionAxis.None, amplitude: 0, frequency: 0, phase: 0 },
      fakes: [],
      chainLength: 1,
      memory: true,
    }
  }

  private applyCurrentPattern(): void {
    const pattern = this.currentPattern
    if (!pattern) return

    this.beatSpeed = this.difficulty.getSpeed() * pattern.speedMul
    const width = this.difficulty.getTargetWidth() * pattern.targetWidthMul
    const baseX = this.playWidth * pattern.targetXNorm

    this.target.applyPattern(baseX, width, pattern, this.playWidth)
    // Wow beat: hide immediately (telegraph 0); normal memory uses config telegraph
    if (this.wow.isActive()) {
      this.target.setMemory(true, 0.05)
    } else {
      this.target.setMemory(
        pattern.memory,
        this.difficulty.getMemoryTelegraphSec(),
      )
    }

    const startX =
      pattern.direction === 1
        ? this.difficulty.getObjectStartX()
        : this.playWidth - this.difficulty.getObjectStartX()
    this.object.reset(startX, pattern.direction)
  }

  update(dt: number, nowMs: number): void {
    if (this.phase === RunPhase.Result) {
      this.input.endFrame()
      return
    }

    // Freeze input/gameplay during celebration
    if (this.wow.isCelebrating()) {
      const done = this.wow.update(dt)
      if (done && this.postWowContinue) {
        this.postWowContinue = false
        this.input.setEnabled(true)
        this.resetBeat(false)
        this.emitHud('HOLD')
      }
      this.input.endFrame()
      return
    }

    this.target.update(dt)
    this.target.updateMemory(dt)

    const action = this.input.getAction(InputAction.Primary)

    if (this.phase === RunPhase.Idle && action.justPressed) {
      this.holdStartMs = nowMs
      this.object.startMoving()
      this.phase = RunPhase.Holding
      this.bus.emit(GameEvents.HoldStarted, {
        wow: this.wow.isActive(),
        travelSec: this.estimateTravelSec(),
      })
      this.emitHud('')
    }

    if (this.phase === RunPhase.Holding) {
      this.object.update(dt, this.beatSpeed)

      const deltaMs = deltaMsFromPosition(
        this.object.x,
        this.target.x,
        this.beatSpeed,
        this.object.getDirection(),
      )

      if (deltaMs > this.difficulty.getAutoMissPastMs()) {
        this.resolveRelease(nowMs, true)
      } else if (action.justReleased) {
        this.resolveRelease(nowMs, false)
      }
    }

    this.input.endFrame()
  }

  private estimateTravelSec(): number {
    const start = this.object.x
    const dist = Math.abs(this.target.x - start)
    return this.beatSpeed > 0 ? dist / this.beatSpeed : 0.5
  }

  private resolveRelease(nowMs: number, autoMiss: boolean): void {
    const holdMs =
      this.holdStartMs !== null ? nowMs - this.holdStartMs : 0

    this.object.stopMoving()

    if (!autoMiss && !this.timing.isHoldLongEnough(holdMs)) {
      this.bus.emit(GameEvents.HoldCancelled, null)
      this.applyCurrentPattern()
      this.holdStartMs = null
      this.phase = RunPhase.Idle
      this.emitHud('HOLD')
      return
    }

    const judgement = this.timing.judgePosition(
      this.object.x,
      this.target.x,
      this.beatSpeed,
      this.object.getDirection(),
    )

    if (judgement.grade === Grade.Miss) {
      if (!autoMiss && this.target.isNearFake(this.object.x)) {
        judgement.earlyLate = EarlyLate.Fake
      }
      this.handleMiss(judgement, 'miss')
      return
    }

    if (this.mode.perfectOnly && !isPerfectEnough(judgement.grade)) {
      this.handleMiss(judgement, 'imperfect')
      return
    }

    this.handleHit(judgement)
  }

  private handleHit(judgement: Judgement): void {
    this.hits += 1
    this.beatIndex += 1
    if (judgement.grade === Grade.Perfect) this.perfects += 1
    if (judgement.grade === Grade.Ultra) {
      this.perfects += 1
      this.ultras += 1
    }

    const combo = this.combo.hit()
    const points = this.score.applyHit(judgement.grade, combo)
    const { phaseChanged, phase } = this.difficulty.onSuccess()

    const railY = this.playHeight * 0.5
    const wowComplete = this.wow.isActive() && combo >= 100
    const payload: FeedbackPayload = {
      judgement,
      pointsGained: points,
      combo,
      worldX: this.object.x,
      worldY: railY + this.target.yOffset,
      wowComplete,
    }
    this.bus.emit(GameEvents.Judged, judgement)
    this.bus.emit(GameEvents.Feedback, payload)

    if (phaseChanged) {
      this.bus.emit(GameEvents.PhaseChanged, phase)
    }

    if (wowComplete) {
      this.wow.celebrate(1.5)
      this.bus.emit(GameEvents.WowComplete, { combo })
      this.input.setEnabled(false)
      // Resume after celebration via update → then continue run
      this.phase = RunPhase.Idle
      this.holdStartMs = null
      // Defer next beat until celebration ends
      this.schedulePostWowContinue()
      this.emitHud('')
      return
    }

    if (combo === 99) {
      this.wow.arm()
      this.bus.emit(GameEvents.WowArmed, null)
    }

    if (this.mode.maxHits > 0 && this.hits >= this.mode.maxHits) {
      this.endRun(judgement, 'complete')
      return
    }

    this.chainRemaining -= 1
    if (this.chainRemaining > 0) {
      this.chainIndex += 1
      this.resetBeat(true)
      this.emitHud('HOLD')
      return
    }

    this.resetBeat(false)
    this.emitHud('HOLD')
  }

  private postWowContinue = false

  private schedulePostWowContinue(): void {
    this.postWowContinue = true
  }

  private handleMiss(
    judgement: Judgement,
    endReason: 'miss' | 'imperfect',
  ): void {
    this.misses += 1
    this.combo.miss()
    this.wow.cancel()
    this.postWowContinue = false

    const railY = this.playHeight * 0.5
    const feedbackJudgement =
      endReason === 'imperfect'
        ? { ...judgement, grade: Grade.Miss, earlyLate: EarlyLate.None }
        : judgement

    this.bus.emit(GameEvents.Judged, judgement)
    this.bus.emit(GameEvents.Feedback, {
      judgement: feedbackJudgement,
      pointsGained: 0,
      combo: 0,
      worldX: this.object.x,
      worldY: railY + this.target.yOffset,
      softMiss: !this.mode.missEndsRun && endReason === 'miss',
    } satisfies FeedbackPayload)

    if (!this.mode.missEndsRun && endReason === 'miss') {
      // Zen: survive the miss, next beat
      this.chainTotal = 1
      this.chainIndex = 0
      this.chainRemaining = 0
      this.resetBeat(false)
      this.emitHud('HOLD')
      return
    }

    this.endRun(judgement, endReason)
  }

  private endRun(
    judgement: Judgement,
    endReason: 'miss' | 'imperfect' | 'complete',
  ): void {
    this.phase = RunPhase.Result
    this.input.setEnabled(false)

    const stats = this.getStats()
    const accuracy = this.getAccuracy()
    const best = this.onBestUpdate?.(
      stats.score,
      stats.maxCombo,
      accuracy,
      this.mode.id,
      this.seed,
    ) ?? {
      bestScore: stats.score,
      bestCombo: stats.maxCombo,
      isNewBest: false,
      streak: 0,
    }

    const ended: RunEndedPayload = {
      stats,
      judgement,
      accuracy,
      bestScore: best.bestScore,
      bestCombo: best.bestCombo,
      seed: this.seed,
      modeId: this.mode.id,
      modeLabel: this.mode.label,
      endReason,
      isNewBest: best.isNewBest === true,
      streak: best.streak ?? 0,
    }
    this.bus.emit(GameEvents.RunEnded, ended)
  }

  getStats(): RunStats {
    return {
      score: this.score.getScore(),
      combo: this.combo.getCombo(),
      maxCombo: this.combo.getMaxCombo(),
      hits: this.hits,
      perfects: this.perfects,
      ultras: this.ultras,
      misses: this.misses,
    }
  }

  getAccuracy(): number {
    const total = this.hits + this.misses
    if (total === 0) return 0
    return this.hits / total
  }

  getPlaySize(): { width: number; height: number } {
    return { width: this.playWidth, height: this.playHeight }
  }

  /** Telegraph: true when current beat has motion. */
  isTargetMotionActive(): boolean {
    return this.target.isMoving()
  }

  getMotionAxis(): string {
    return this.currentPattern?.motion.axis ?? MotionAxis.None
  }

  private emitHud(hint: string): void {
    const payload: HudPayload = {
      score: this.score.getScore(),
      combo: this.combo.getCombo(),
      phase: this.phase,
      hint: this.wow.isActive() || this.wow.isCelebrating() ? '' : hint,
      difficultyPhase: this.difficulty.getPhase().name,
      chainIndex: this.chainIndex,
      chainTotal: this.chainTotal,
      memoryActive: this.currentPattern?.memory === true,
      wowHideUi: this.wow.isActive() || this.wow.isCelebrating() || this.wow.isArmed(),
    }
    this.bus.emit(GameEvents.HudUpdated, payload)
  }
}
