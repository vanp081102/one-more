import type { RunManager } from '../gameplay/RunManager'
import type { FeedbackSystem } from '../feedback/FeedbackSystem'
import { RunPhase } from '../core/types'
import { DifficultyPhaseId } from '../data/DifficultyConfig'
import {
  themes,
  defaultThemeId,
  withCustomAccent,
  type ThemeColors,
} from '../data/ThemeConfig'

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private dpr = 1
  private ghostTrail: Array<{ x: number; y: number; life: number }> = []
  private themeId = defaultThemeId
  private customAccent: string | null = null
  private theme: ThemeColors = themes[defaultThemeId]!
  private colorblind = false
  private reducedMotion = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D unavailable')
    this.ctx = ctx
  }

  setTheme(themeId: string): void {
    this.themeId = themeId
    this.refreshTheme()
  }

  setCustomAccent(accent: string | null): void {
    this.customAccent = accent
    this.refreshTheme()
  }

  private refreshTheme(): void {
    const base = themes[this.themeId] ?? themes[defaultThemeId]!
    this.theme = withCustomAccent(base, this.customAccent)
  }

  setColorblind(value: boolean): void {
    this.colorblind = value
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value
  }

  getTheme(): ThemeColors {
    return this.theme
  }

  resize(cssWidth: number, cssHeight: number): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.floor(cssWidth * this.dpr)
    this.canvas.height = Math.floor(cssHeight * this.dpr)
    this.canvas.style.width = `${cssWidth}px`
    this.canvas.style.height = `${cssHeight}px`
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  draw(run: RunManager, feedback: FeedbackSystem): void {
    const { width, height } = run.getPlaySize()
    const ctx = this.ctx
    const shake = feedback.shake

    ctx.save()
    ctx.clearRect(0, 0, width, height)

    const phaseId = run.difficulty.getPhaseId()
    const theme = this.theme
    const wow = run.wow.isActive() || run.wow.isCelebrating()
    const glitch = feedback.getGlitch()

    const grad = ctx.createLinearGradient(0, 0, 0, height)
    if (wow || run.wow.isArmed()) {
      grad.addColorStop(0, '#050508')
      grad.addColorStop(1, '#0a0a10')
    } else if (phaseId >= DifficultyPhaseId.Master) {
      grad.addColorStop(0, theme.bg0)
      grad.addColorStop(1, theme.bg1)
    } else {
      grad.addColorStop(0, theme.bg0)
      grad.addColorStop(1, theme.bg1)
    }
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    // Glitch bars approaching 100
    if (!this.reducedMotion && (glitch > 0 || run.wow.isArmed())) {
      const intensity = Math.max(glitch, run.wow.isArmed() ? 0.4 : 0)
      ctx.fillStyle = `rgba(255,255,255,${0.03 * intensity})`
      for (let i = 0; i < 6; i++) {
        const y = ((performance.now() * 0.15 + i * 73) % height)
        ctx.fillRect(0, y, width, 2 + intensity * 3)
      }
    }

    // Chaos: subtle horizontal jitter lines (pressure, not noise spam)
    if (
      !this.reducedMotion &&
      phaseId >= DifficultyPhaseId.Chaos &&
      phaseId < DifficultyPhaseId.Master
    ) {
      ctx.strokeStyle = 'rgba(255,80,120,0.04)'
      ctx.lineWidth = 1
      for (let i = 0; i < 4; i++) {
        const y = ((performance.now() * 0.04 + i * 47) % height)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
    }

    // Master: thin vignette pressure frame
    if (phaseId >= DifficultyPhaseId.Master) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 2
      ctx.strokeRect(10, 10, width - 20, height - 20)
    }

    if (phaseId >= DifficultyPhaseId.Speed && run.object.isMoving()) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      for (let i = 0; i < 5; i++) {
        const y = height * (0.35 + i * 0.07)
        ctx.beginPath()
        ctx.moveTo(20, y)
        ctx.lineTo(width * 0.45, y)
        ctx.stroke()
      }
    }

    ctx.translate(shake.offsetX, shake.offsetY)

    const railY = height * 0.5

    ctx.strokeStyle = theme.rail
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(24, railY)
    ctx.lineTo(width - 24, railY)
    ctx.stroke()

    const t = run.target
    const targetY = railY + t.yOffset
    const tf = feedback.getTargetFlash()

    // Direction telegraph (arrow on rail)
    const dir = run.object.getDirection()
    if (run.phase === RunPhase.Idle || run.phase === RunPhase.Holding) {
      ctx.fillStyle = dir === -1 ? 'rgba(200, 160, 255, 0.55)' : 'rgba(255,255,255,0.2)'
      const ax = dir === 1 ? 36 : width - 36
      drawChevron(ctx, ax, railY, dir)
    }

    // Skip targets/fakes during wow beat (audio-only) unless timing ghost is on
    const hideTargets = run.wow.isActive() && !run.showsTimingGhost()

    if (!hideTargets) {
      // Fake targets first — dashed outline + X (shape, not color-only)
      for (const fake of t.fakes) {
        const fy = railY + fake.yOffset
        const fl = fake.x - fake.width / 2
        ctx.save()
        ctx.setLineDash([6, 5])
        ctx.strokeStyle = this.colorblind ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)'
        ctx.lineWidth = this.colorblind ? 3 : 2
        roundRect(ctx, fl, fy - 36, fake.width, 72, 8)
        ctx.stroke()
        ctx.setLineDash([])
        // Hatch fill — shape cue for colorblind
        if (this.colorblind) {
          ctx.save()
          ctx.beginPath()
          roundRect(ctx, fl, fy - 36, fake.width, 72, 8)
          ctx.clip()
          ctx.strokeStyle = 'rgba(255,255,255,0.2)'
          ctx.lineWidth = 1
          for (let hx = fl - 40; hx < fl + fake.width + 40; hx += 8) {
            ctx.beginPath()
            ctx.moveTo(hx, fy - 40)
            ctx.lineTo(hx + 40, fy + 40)
            ctx.stroke()
          }
          ctx.restore()
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'
        ctx.lineWidth = 2
        const s = 10
        ctx.beginPath()
        ctx.moveTo(fake.x - s, fy - s)
        ctx.lineTo(fake.x + s, fy + s)
        ctx.moveTo(fake.x + s, fy - s)
        ctx.lineTo(fake.x - s, fy + s)
        ctx.stroke()
        ctx.restore()
      }

      const memVisible = !t.isMemoryMode() || t.isMemoryVisible()
      const showGhost = memVisible || run.showsTimingGhost()

      if (t.isMoving() && showGhost && !this.reducedMotion) {
        this.ghostTrail.push({ x: t.x, y: targetY, life: 0.35 })
        if (this.ghostTrail.length > 18) this.ghostTrail.shift()
        for (const g of this.ghostTrail) {
          g.life -= 0.016
          if (g.life <= 0) continue
          ctx.globalAlpha = g.life * (memVisible ? 0.35 : 0.12)
          ctx.strokeStyle = theme.accent
          ctx.lineWidth = 1
          roundRect(ctx, g.x - t.width / 2, g.y - 36, t.width, 72, 8)
          ctx.stroke()
        }
        this.ghostTrail = this.ghostTrail.filter((g) => g.life > 0)
        ctx.globalAlpha = 1

        if (memVisible) {
          ctx.fillStyle = theme.accent
          ctx.globalAlpha = 0.35
          ctx.beginPath()
          ctx.arc(t.x, targetY, 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        }
      } else if (!t.isMoving()) {
        this.ghostTrail.length = 0
      }

      if (memVisible) {
        ctx.fillStyle = theme.targetFill
        ctx.globalAlpha = Math.min(1, 0.55 + tf * 0.45)
        ctx.strokeStyle =
          phaseId >= DifficultyPhaseId.Master
            ? 'rgba(255,255,255,0.95)'
            : phaseId >= DifficultyPhaseId.Chaos
              ? 'rgba(255, 120, 160, 0.95)'
              : phaseId >= DifficultyPhaseId.Memory
                ? 'rgba(180, 220, 255, 0.95)'
                : phaseId >= DifficultyPhaseId.MultiStage
                  ? 'rgba(160, 255, 200, 0.95)'
                  : phaseId >= DifficultyPhaseId.Reversal
                    ? 'rgba(200, 160, 255, 0.95)'
                    : phaseId >= DifficultyPhaseId.Fake
                      ? 'rgba(255, 210, 120, 0.95)'
                      : phaseId >= DifficultyPhaseId.Moving
                        ? 'rgba(255, 210, 120, 0.9)'
                        : phaseId >= DifficultyPhaseId.Precision
                          ? 'rgba(125, 200, 255, 0.9)'
                          : theme.targetStroke
        ctx.lineWidth = 2 + tf * 2
        roundRect(ctx, t.left, targetY - 36, t.width, 72, 8)
        ctx.fill()
        ctx.stroke()
        ctx.globalAlpha = 1

        ctx.strokeStyle = 'rgba(255,255,255,0.7)'
        ctx.lineWidth = 2
        const tick = 8
        ctx.beginPath()
        ctx.moveTo(t.left, targetY - 36 + tick)
        ctx.lineTo(t.left, targetY - 36)
        ctx.lineTo(t.left + tick, targetY - 36)
        ctx.moveTo(t.right, targetY - 36 + tick)
        ctx.lineTo(t.right, targetY - 36)
        ctx.lineTo(t.right - tick, targetY - 36)
        ctx.stroke()

        if (phaseId >= DifficultyPhaseId.Precision) {
          const inner = Math.max(8, t.width * 0.28)
          ctx.strokeStyle = 'rgba(255,255,255,0.35)'
          ctx.lineWidth = 1
          roundRect(ctx, t.x - inner / 2, targetY - 20, inner, 40, 4)
          ctx.stroke()
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.55)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(t.x, targetY - 28)
        ctx.lineTo(t.x, targetY + 28)
        ctx.stroke()
      } else if (run.showsTimingGhost()) {
        ctx.save()
        ctx.globalAlpha = 0.18
        ctx.setLineDash([4, 6])
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'
        ctx.lineWidth = 1.5
        roundRect(ctx, t.left, targetY - 36, t.width, 72, 8)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(t.x, targetY - 16)
        ctx.lineTo(t.x, targetY + 16)
        ctx.stroke()
        ctx.restore()
      } else {
        ctx.globalAlpha = 0.12
        ctx.fillStyle = '#fff'
        ctx.fillRect(t.x - 1, targetY - 6, 2, 12)
        ctx.globalAlpha = 1
      }
    } else {
      this.ghostTrail.length = 0
    }

    // Object — dim during wow active
    const pulse = 1 + feedback.getObjectPulse() * 0.5
    const squash = feedback.getSquash()
    const baseR = run.object.radius * pulse
    const objY = railY
    const celebrate = feedback.getCelebrate()
    ctx.save()
    ctx.translate(run.object.x, objY)
    ctx.scale(squash.x, squash.y)
    ctx.globalAlpha = hideTargets ? 0.25 : 1
    ctx.fillStyle = theme.object
    ctx.beginPath()
    ctx.arc(0, 0, baseR, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()

    if (run.object.isMoving() && !hideTargets) {
      const moveDir = run.object.getDirection()
      const trailLen = 20 + run.difficulty.getSpeed() * 0.04
      ctx.strokeStyle = theme.object
      ctx.globalAlpha = 0.28
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(run.object.x - trailLen * moveDir, objY)
      ctx.lineTo(run.object.x - 6 * moveDir, objY)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    const ring = feedback.getRing()
    if (ring) {
      const p = 1 - ring.life / ring.maxLife
      ctx.strokeStyle = ring.color
      ctx.globalAlpha = 1 - p
      ctx.lineWidth = 2.5 * (1 - p)
      ctx.beginPath()
      ctx.arc(ring.x, ring.y, ring.maxRadius * p, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    feedback.vfx.draw(ctx)

    if (celebrate > 0) {
      ctx.fillStyle = `rgba(255,255,255,${0.12 * Math.min(1, celebrate)})`
      ctx.fillRect(-shake.offsetX, -shake.offsetY, width, height)
    }

    const flash = feedback.getFlash()
    if (flash && run.phase !== RunPhase.Result) {
      const alpha = Math.min(1, flash.life / flash.maxLife)
      ctx.globalAlpha = alpha
      ctx.fillStyle = flash.color
      const size = Math.floor(26 * flash.scale)
      ctx.font = `700 ${size}px "Segoe UI", system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(flash.text, width / 2, railY - 78)
      ctx.globalAlpha = 1
    }

    const milestone = feedback.getMilestoneFlash()
    if (milestone) {
      const alpha = Math.min(1, milestone.life / milestone.maxLife)
      ctx.globalAlpha = alpha * 0.9
      ctx.fillStyle = milestone.color
      ctx.font = `700 ${Math.floor(18 * milestone.scale)}px "Segoe UI", system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(milestone.text, width / 2, railY + 88)
      ctx.globalAlpha = 1
    }

    const pop = feedback.getScorePop()
    if (pop) {
      const alpha = pop.life / pop.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#ffffff'
      ctx.font = '600 16px "Segoe UI", system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(pop.text, pop.x, pop.y)
      ctx.globalAlpha = 1
    }

    ctx.restore()
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawChevron(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: 1 | -1,
): void {
  const s = 8
  ctx.beginPath()
  ctx.moveTo(x - s * dir, y - s)
  ctx.lineTo(x + s * dir * 0.2, y)
  ctx.lineTo(x - s * dir, y + s)
  ctx.closePath()
  ctx.fill()
}
