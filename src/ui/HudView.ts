import type { HudPayload } from '../gameplay/RunManager'
import { milestoneForCombo } from '../data/ComboConfig'
import { t, phaseLabel, milestoneLabel } from '../data/Locale'

export class HudView {
  private root: HTMLElement
  private scoreEl: HTMLElement
  private comboEl: HTMLElement
  private hintEl: HTMLElement
  private phaseEl: HTMLElement
  private chainEl: HTMLElement
  private backBtn: HTMLButtonElement
  private lastScore = -1
  private teachUntil = 0
  private onBack: (() => void) | null = null

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div')
    this.root.className = 'hud'
    this.root.innerHTML = `
      <button type="button" class="hud-back" data-back>${t('back')}</button>
      <div class="hud-phase" data-phase></div>
      <div class="hud-score" data-score>0</div>
      <div class="hud-combo" data-combo></div>
      <div class="hud-chain" data-chain></div>
      <div class="hud-hint" data-hint>${t('hold')}</div>
    `
    parent.appendChild(this.root)
    this.scoreEl = this.root.querySelector('[data-score]')!
    this.comboEl = this.root.querySelector('[data-combo]')!
    this.hintEl = this.root.querySelector('[data-hint]')!
    this.phaseEl = this.root.querySelector('[data-phase]')!
    this.chainEl = this.root.querySelector('[data-chain]')!
    this.backBtn = this.root.querySelector('[data-back]') as HTMLButtonElement

    this.backBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      e.preventDefault()
      this.onBack?.()
    })
    this.backBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation()
    })
  }

  setBackHandler(fn: () => void): void {
    this.onBack = fn
  }

  applyLocale(): void {
    this.backBtn.textContent = t('back')
    if (this.hintEl.textContent === 'HOLD' || this.hintEl.textContent === 'GIỮ') {
      this.hintEl.textContent = t('hold')
    }
  }

  beginTeach(seconds = 8): void {
    this.teachUntil = performance.now() + seconds * 1000
    this.hintEl.classList.add('teach')
  }

  clearTeach(): void {
    this.teachUntil = 0
    this.hintEl.classList.remove('teach')
  }

  update(payload: HudPayload): void {
    if (payload.score !== this.lastScore) {
      this.scoreEl.classList.remove('pulse')
      void this.scoreEl.offsetWidth
      this.scoreEl.classList.add('pulse')
      this.lastScore = payload.score
    }
    this.scoreEl.textContent = String(payload.score)

    const milestone = milestoneForCombo(payload.combo)
    if (payload.combo > 1) {
      this.comboEl.textContent = milestone
        ? `${payload.combo} · ${milestoneLabel(milestone.label)}`
        : `${payload.combo}`
      this.comboEl.classList.add('visible')
      if (milestone) this.comboEl.classList.add('milestone')
      else this.comboEl.classList.remove('milestone')
    } else {
      this.comboEl.textContent = ''
      this.comboEl.classList.remove('visible', 'milestone')
    }

    const phase = phaseLabel(payload.difficultyPhase, payload.memoryActive)
    if (phase) {
      this.phaseEl.textContent = phase
      this.phaseEl.classList.add('visible')
    } else {
      this.phaseEl.textContent = ''
      this.phaseEl.classList.remove('visible')
    }

    if (payload.chainTotal > 1) {
      const pips: string[] = []
      for (let i = 0; i < payload.chainTotal; i++) {
        pips.push(i <= payload.chainIndex ? '●' : '○')
      }
      this.chainEl.textContent = pips.join(' ')
      this.chainEl.classList.add('visible')
    } else {
      this.chainEl.textContent = ''
      this.chainEl.classList.remove('visible')
    }

    const hint =
      payload.hint === 'HOLD' || payload.hint === 'hold' ? t('hold') : payload.hint
    this.hintEl.textContent = hint
    this.hintEl.style.opacity = hint ? '1' : '0'

    if (this.teachUntil > 0) {
      if (performance.now() > this.teachUntil || payload.score > 0 || !hint) {
        this.clearTeach()
      }
    }

    if (payload.wowHideUi) {
      this.root.classList.add('wow-hide')
    } else {
      this.root.classList.remove('wow-hide')
    }
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? 'block' : 'none'
    if (!visible) {
      this.lastScore = -1
      this.clearTeach()
    }
  }
}
