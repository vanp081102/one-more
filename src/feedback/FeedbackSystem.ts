import { EventBus, GameEvents } from '../core/EventBus'
import { Grade } from '../core/types'
import type { FeedbackPayload } from '../gameplay/RunManager'
import type { PhaseDefinition } from '../data/DifficultyConfig'
import { milestoneForCombo } from '../data/ComboConfig'
import { ScreenShake } from './ScreenShake'
import { VfxPool } from './VfxPool'
import type { AudioManager } from '../audio/AudioManager'
import {
  earlyLateLabel,
  gradeLabel,
  milestoneLabel,
  t,
} from '../data/Locale'

interface GradeFlash {
  text: string
  life: number
  maxLife: number
  color: string
  scale: number
}

interface ScorePop {
  text: string
  x: number
  y: number
  life: number
  maxLife: number
}

interface RingBurst {
  x: number
  y: number
  life: number
  maxLife: number
  color: string
  maxRadius: number
}

export class FeedbackSystem {
  readonly shake = new ScreenShake()
  readonly vfx = new VfxPool()
  private readonly bus: EventBus
  private readonly audio: AudioManager
  private flash: GradeFlash | null = null
  private scorePop: ScorePop | null = null
  private milestoneFlash: GradeFlash | null = null
  private ring: RingBurst | null = null
  private objectPulse = 0
  /** Horizontal stretch (>1) / squash (<1 on Y via inverse) */
  private squashX = 1
  private squashY = 1
  private targetFlash = 0
  private unsub: Array<() => void> = []
  private reducedMotion = false
  private onHitStop: ((seconds: number, scale: number) => void) | null = null
  private glitch = 0
  private celebrate = 0
  private vibrationEnabled = true

  constructor(bus: EventBus, audio: AudioManager) {
    this.bus = bus
    this.audio = audio
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value
  }

  setVibrationEnabled(value: boolean): void {
    this.vibrationEnabled = value
  }

  setHitStopHandler(fn: (seconds: number, scale: number) => void): void {
    this.onHitStop = fn
  }

  start(): void {
    this.unsub.push(
      this.bus.on<FeedbackPayload>(GameEvents.Feedback, (payload) => {
        this.onFeedback(payload)
      }),
    )
    this.unsub.push(
      this.bus.on<{ wow?: boolean; travelSec?: number }>(GameEvents.HoldStarted, (payload) => {
        this.audio.playHold()
        this.squashX = 1.15
        this.squashY = 0.88
        if (payload?.wow && payload.travelSec != null) {
          this.audio.scheduleIdealCue(payload.travelSec)
        }
      }),
    )
    this.unsub.push(
      this.bus.on(GameEvents.WowArmed, () => {
        this.audio.playWowArmed()
        this.milestoneFlash = {
          text: '99',
          life: 0.9,
          maxLife: 0.9,
          color: '#ffffff',
          scale: 1.8,
        }
        if (!this.reducedMotion) this.shake.add(0.4)
      }),
    )
    this.unsub.push(
      this.bus.on(GameEvents.WowBeat, () => {
        this.glitch = 1
      }),
    )
    this.unsub.push(
      this.bus.on(GameEvents.WowComplete, () => {
        this.audio.playWowComplete()
        this.celebrate = 1.5
        this.flash = {
          text: '100',
          life: 1.2,
          maxLife: 1.2,
          color: '#ffffff',
          scale: 2.4,
        }
        this.milestoneFlash = {
          text: t('perfect'),
          life: 1.4,
          maxLife: 1.4,
          color: '#7dffb3',
          scale: 1.8,
        }
        if (!this.reducedMotion) {
          this.shake.add(0.9)
          this.vfx.burst(0, 0, 40, '#ffffff', 220)
        }
      }),
    )
    this.unsub.push(
      this.bus.on(GameEvents.HoldCancelled, () => {
        this.audio.stopMovement()
        this.squashX = 1
        this.squashY = 1
      }),
    )
    this.unsub.push(
      this.bus.on(GameEvents.RunStarted, () => {
        this.audio.startBed()
        this.audio.setComboLevel(0)
      }),
    )
    this.unsub.push(
      this.bus.on(GameEvents.RunEnded, () => {
        this.audio.stopBed()
        // Clear level flash so it cannot disagree with the result dialog
        this.milestoneFlash = null
        this.flash = null
      }),
    )
    this.unsub.push(
      this.bus.on<PhaseDefinition>(GameEvents.PhaseChanged, (phase) => {
        if (phase.masterPressure) this.audio.playMasterEnter()
        else if (phase.chaosMix) this.audio.playChaosEnter()
        else this.audio.playPhaseChange()
        this.milestoneFlash = {
          text: phase.masterPressure
            ? t('master')
            : phase.chaosMix
              ? t('chaos')
              : '↑',
          life: phase.masterPressure || phase.chaosMix ? 0.85 : 0.55,
          maxLife: phase.masterPressure || phase.chaosMix ? 0.85 : 0.55,
          color: phase.masterPressure
            ? '#ffffff'
            : phase.chaosMix
              ? '#ff78a0'
              : '#7db8ff',
          scale: phase.masterPressure || phase.chaosMix ? 1.6 : 1.4,
        }
        if (!this.reducedMotion) {
          this.shake.add(phase.masterPressure ? 0.45 : phase.chaosMix ? 0.35 : 0.25)
        }
      }),
    )
    this.unsub.push(
      this.bus.on<{ level: number; from: number }>(GameEvents.LevelUp, (p) => {
        this.audio.playMilestone()
        // Show the level just cleared (from), not the next unlock number
        this.milestoneFlash = {
          text: `${t('level')} ${p.from}`,
          life: 0.9,
          maxLife: 0.9,
          color: '#7dffb3',
          scale: 1.55,
        }
        if (!this.reducedMotion) this.shake.add(0.3)
      }),
    )
  }

  stop(): void {
    for (const fn of this.unsub) fn()
    this.unsub = []
  }

  reset(): void {
    this.shake.reset()
    this.vfx.clear()
    this.flash = null
    this.scorePop = null
    this.milestoneFlash = null
    this.ring = null
    this.objectPulse = 0
    this.squashX = 1
    this.squashY = 1
    this.targetFlash = 0
    this.glitch = 0
    this.celebrate = 0
  }

  private onFeedback(payload: FeedbackPayload): void {
    const { judgement, pointsGained, worldX, worldY, combo } = payload
    const color = gradeColor(judgement.grade)

    if (judgement.grade === Grade.Miss) {
      if (!this.reducedMotion) this.shake.add(payload.softMiss ? 0.35 : 0.75)
      this.squashX = 1.35
      this.squashY = 0.55
      const isFake = judgement.earlyLate === 'FAKE'
      this.flash = {
        text:
          judgement.earlyLate === 'NONE'
            ? t('miss')
            : earlyLateLabel(judgement.earlyLate),
        life: 0.75,
        maxLife: 0.75,
        color: isFake ? '#ffb84d' : '#ff4d4d',
        scale: 1.1,
      }
      this.audio.playMiss()
      if (this.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(payload.softMiss ? 30 : 60)
        } catch {
          // ignore
        }
      }
      if (!payload.softMiss) {
        this.audio.playGameOver()
        this.audio.setComboLevel(0)
      } else {
        this.audio.setComboLevel(0)
      }
      return
    }

    const intensity = gradeIntensity(judgement.grade)
    this.audio.setComboLevel(combo)

    if (!this.reducedMotion) {
      this.shake.add(0.1 * intensity)
      this.vfx.burst(
        worldX,
        worldY,
        Math.floor(6 + 6 * intensity),
        color,
        70 + 50 * intensity,
      )
      this.ring = {
        x: worldX,
        y: worldY,
        life: 0.35 + 0.1 * intensity,
        maxLife: 0.35 + 0.1 * intensity,
        color,
        maxRadius: 28 + 22 * intensity,
      }
    }

    // Squash on impact then stretch
    this.squashX = 0.7 - 0.08 * intensity
    this.squashY = 1.35 + 0.1 * intensity
    this.objectPulse = 0.18 * intensity
    this.targetFlash = 0.35

    this.flash = {
      text: gradeLabel(judgement.grade),
      life: 0.4 + 0.08 * intensity,
      maxLife: 0.4 + 0.08 * intensity,
      color,
      scale: 0.85 + 0.25 * intensity,
    }

    if (pointsGained > 0) {
      this.scorePop = {
        text: `+${pointsGained}`,
        x: worldX,
        y: worldY - 28,
        life: 0.55,
        maxLife: 0.55,
      }
    }

    if (payload.wowComplete) {
      return
    }

    this.audio.playRelease(judgement.grade)

    // Micro hit-stop — PERFECT+ only
    if (
      !this.reducedMotion &&
      (judgement.grade === Grade.Perfect || judgement.grade === Grade.Ultra)
    ) {
      const stop =
        judgement.grade === Grade.Ultra ? 0.055 : 0.035
      this.onHitStop?.(stop, judgement.grade === Grade.Ultra ? 0.25 : 0.4)
    }

    const milestone = milestoneForCombo(combo)
    if (milestone) {
      this.audio.playMilestone()
      this.milestoneFlash = {
        text: milestoneLabel(milestone.label),
        life: 0.7,
        maxLife: 0.7,
        color: '#7dffb3',
        scale: 1.2,
      }
      if (!this.reducedMotion) {
        this.shake.add(0.35)
        this.vfx.burst(worldX, worldY, 20, '#7dffb3', 160)
      }
    } else if (combo > 0 && combo % 10 === 0) {
      this.audio.playCombo()
    }
  }

  update(dt: number): void {
    this.shake.update(dt)
    this.vfx.update(dt)
    this.objectPulse = Math.max(0, this.objectPulse - dt)
    this.targetFlash = Math.max(0, this.targetFlash - dt)
    this.glitch = Math.max(0, this.glitch - dt * 0.35)
    this.celebrate = Math.max(0, this.celebrate - dt)

    this.squashX += (1 - this.squashX) * Math.min(1, dt * 12)
    this.squashY += (1 - this.squashY) * Math.min(1, dt * 12)

    if (this.flash) {
      this.flash.life -= dt
      if (this.flash.life <= 0) this.flash = null
    }
    if (this.milestoneFlash) {
      this.milestoneFlash.life -= dt
      if (this.milestoneFlash.life <= 0) this.milestoneFlash = null
    }
    if (this.scorePop) {
      this.scorePop.life -= dt
      this.scorePop.y -= 48 * dt
      if (this.scorePop.life <= 0) this.scorePop = null
    }
    if (this.ring) {
      this.ring.life -= dt
      if (this.ring.life <= 0) this.ring = null
    }
  }

  getFlash(): GradeFlash | null {
    return this.flash
  }

  getMilestoneFlash(): GradeFlash | null {
    return this.milestoneFlash
  }

  getScorePop(): ScorePop | null {
    return this.scorePop
  }

  getRing(): RingBurst | null {
    return this.ring
  }

  getObjectPulse(): number {
    return this.objectPulse
  }

  getSquash(): { x: number; y: number } {
    return { x: this.squashX, y: this.squashY }
  }

  getTargetFlash(): number {
    return this.targetFlash
  }

  getGlitch(): number {
    return this.glitch
  }

  getCelebrate(): number {
    return this.celebrate
  }
}

function gradeColor(grade: Grade): string {
  switch (grade) {
    case Grade.Ultra:
      return '#e8f7ff'
    case Grade.Perfect:
      return '#7dffb3'
    case Grade.Great:
      return '#7db8ff'
    case Grade.Good:
      return '#c9c9c9'
    default:
      return '#ff4d4d'
  }
}

function gradeIntensity(grade: Grade): number {
  switch (grade) {
    case Grade.Ultra:
      return 2.4
    case Grade.Perfect:
      return 1.7
    case Grade.Great:
      return 1.15
    case Grade.Good:
      return 0.65
    default:
      return 1
  }
}
