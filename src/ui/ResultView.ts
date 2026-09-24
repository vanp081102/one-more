import type { RunEndedPayload } from '../gameplay/RunManager'
import { LEVEL_COUNT } from '../data/LevelConfig'
import { t, earlyLateLabel, gradeLabel, unlockSummary } from '../data/Locale'

export class ResultView {
  private root: HTMLElement
  private onOneMore: (() => void) | null = null
  private onReplay: (() => void) | null = null
  private onHome: (() => void) | null = null
  private onNextLevel: (() => void) | null = null
  private lastShareText = ''
  private lastSeed = 0
  private pendingNextLevel = 0

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div')
    this.root.className = 'result hidden'
    this.root.innerHTML = `
      <div class="result-panel">
        <div class="result-mode" data-mode></div>
        <div class="result-level" data-level></div>
        <div class="result-ask" data-ask></div>
        <div class="result-label" data-i18n="score">${t('score')}</div>
        <div class="result-score" data-score>0</div>
        <div class="result-meta">
          <div><span data-i18n="best">${t('best')}</span><strong data-best>0</strong></div>
          <div><span data-i18n="accuracy">${t('accuracy')}</span><strong data-acc>0%</strong></div>
          <div><span data-i18n="maxCombo">${t('maxCombo')}</span><strong data-combo>0</strong></div>
        </div>
        <div class="result-seed" data-seed></div>
        <div class="result-miss" data-miss></div>
        <div class="result-record" data-record></div>
        <div class="result-unlock" data-unlock></div>
        <button type="button" class="btn-primary hidden" data-next-level hidden>${t('goNextLevel')}</button>
        <button type="button" class="btn-primary" data-one-more>${t('oneMore')}</button>
        <button type="button" class="btn-ghost" data-replay>${t('replaySeed')}</button>
        <button type="button" class="btn-ghost" data-share>${t('share')}</button>
        <button type="button" class="btn-ghost" data-home>${t('home')}</button>
      </div>
    `
    parent.appendChild(this.root)

    this.root.querySelector('[data-next-level]')!.addEventListener('click', (e) => {
      e.stopPropagation()
      this.onNextLevel?.()
    })
    this.root.querySelector('[data-one-more]')!.addEventListener('click', (e) => {
      e.stopPropagation()
      this.onOneMore?.()
    })
    this.root.querySelector('[data-replay]')!.addEventListener('click', (e) => {
      e.stopPropagation()
      this.onReplay?.()
    })
    this.root.querySelector('[data-home]')!.addEventListener('click', (e) => {
      e.stopPropagation()
      this.onHome?.()
    })
    this.root.querySelector('[data-share]')!.addEventListener('click', (e) => {
      e.stopPropagation()
      void this.share()
    })
    this.root.querySelector('[data-seed]')!.addEventListener('click', (e) => {
      e.stopPropagation()
      void this.copySeed()
    })
  }

  applyLocale(): void {
    this.root.querySelector('[data-i18n="score"]')!.textContent = t('score')
    this.root.querySelector('[data-i18n="best"]')!.textContent = t('best')
    this.root.querySelector('[data-i18n="accuracy"]')!.textContent = t('accuracy')
    this.root.querySelector('[data-i18n="maxCombo"]')!.textContent = t('maxCombo')
    this.root.querySelector('[data-one-more]')!.textContent = t('oneMore')
    this.root.querySelector('[data-replay]')!.textContent = t('replaySeed')
    this.root.querySelector('[data-share]')!.textContent = t('share')
    this.root.querySelector('[data-home]')!.textContent = t('home')
    if (this.pendingNextLevel > 0) {
      this.root.querySelector('[data-next-level]')!.textContent =
        `${t('goNextLevel')} ${this.pendingNextLevel}`
    }
  }

  setHandlers(
    oneMore: () => void,
    home: () => void,
    replay: () => void,
    nextLevel?: () => void,
  ): void {
    this.onOneMore = oneMore
    this.onHome = home
    this.onReplay = replay
    this.onNextLevel = nextLevel ?? null
  }

  show(payload: RunEndedPayload, unlockedIds: string[] = []): void {
    this.applyLocale()
    this.lastSeed = payload.seed
    const modeLine = `${t('level')} ${payload.level}`
    this.root.querySelector('[data-mode]')!.textContent = modeLine
    const levelEl = this.root.querySelector('[data-level]')!
    const askEl = this.root.querySelector('[data-ask]')!
    const nextBtn = this.root.querySelector('[data-next-level]') as HTMLElement
    const oneMoreBtn = this.root.querySelector('[data-one-more]') as HTMLElement

    const canOfferNext =
      payload.endReason === 'complete' &&
      payload.levelCleared &&
      payload.nextLevelUnlocked &&
      payload.level < LEVEL_COUNT

    this.pendingNextLevel = canOfferNext ? payload.level + 1 : 0

    if (payload.endReason === 'complete' && payload.levelCleared) {
      levelEl.textContent = t('levelCleared')
    } else if (payload.clearScore > 0) {
      levelEl.textContent = `${payload.stats.score}/${payload.clearScore}`
    } else {
      levelEl.textContent = ''
    }

    if (canOfferNext) {
      askEl.textContent = `${t('clearAsk')} ${this.pendingNextLevel}?`
      nextBtn.classList.remove('hidden')
      nextBtn.hidden = false
      nextBtn.textContent = `${t('goNextLevel')} ${this.pendingNextLevel}`
      oneMoreBtn.classList.remove('btn-primary')
      oneMoreBtn.classList.add('btn-ghost')
      oneMoreBtn.textContent = t('retryLevel')
    } else {
      askEl.textContent = ''
      nextBtn.classList.add('hidden')
      nextBtn.hidden = true
      oneMoreBtn.classList.add('btn-primary')
      oneMoreBtn.classList.remove('btn-ghost')
      oneMoreBtn.textContent = t('oneMore')
    }

    this.root.querySelector('[data-score]')!.textContent = String(payload.stats.score)
    this.root.querySelector('[data-best]')!.textContent = String(payload.bestScore)
    this.root.querySelector('[data-acc]')!.textContent =
      `${Math.round(payload.accuracy * 100)}%`
    this.root.querySelector('[data-combo]')!.textContent = String(payload.stats.maxCombo)
    this.root.querySelector('[data-seed]')!.textContent = `${t('seed')} ${payload.seed}`

    const missEl = this.root.querySelector('[data-miss]')!
    if (payload.endReason === 'complete' && payload.levelCleared) {
      missEl.textContent = t('levelCleared')
    } else if (payload.endReason === 'imperfect') {
      missEl.textContent = gradeLabel(payload.judgement.grade)
    } else {
      missEl.textContent =
        payload.judgement.earlyLate !== 'NONE'
          ? earlyLateLabel(payload.judgement.earlyLate)
          : t('miss')
    }
    const recordEl = this.root.querySelector('[data-record]')!
    const gap = payload.bestScore - payload.stats.score
    if (payload.isNewBest) {
      recordEl.textContent = t('newBest')
    } else if (payload.bestScore > 0 && gap > 0 && gap <= Math.max(100, payload.bestScore * 0.15)) {
      recordEl.textContent = `${gap} ${t('toBest')}`
    } else if (payload.streak > 1) {
      recordEl.textContent = `${t('streak')} ${payload.streak}`
    } else {
      recordEl.textContent = ''
    }
    const unlockEl = this.root.querySelector('[data-unlock]')!
    unlockEl.textContent = unlockSummary(unlockedIds)

    this.lastShareText = [
      `ONE MORE — ${t('level')} ${payload.level}`,
      `${t('score')} ${payload.stats.score}`,
      `Combo ${payload.stats.maxCombo}`,
      `${t('accuracy')} ${Math.round(payload.accuracy * 100)}%`,
      `${t('seed')} ${payload.seed}`,
      payload.isNewBest ? t('newBest') : '',
      '#OneMore',
    ]
      .filter(Boolean)
      .join('\n')

    this.root.classList.remove('hidden')
  }

  hide(): void {
    this.root.classList.add('hidden')
  }

  isVisible(): boolean {
    return !this.root.classList.contains('hidden')
  }

  getLastSeed(): number {
    return this.lastSeed
  }

  private async copySeed(): Promise<void> {
    const el = this.root.querySelector('[data-seed]') as HTMLElement
    try {
      await navigator.clipboard?.writeText(String(this.lastSeed))
      const prev = el.textContent
      el.textContent = t('seedCopied')
      setTimeout(() => {
        el.textContent = prev
      }, 1000)
    } catch {
      // ignore
    }
  }

  private async share(): Promise<void> {
    const text = this.lastShareText || 'ONE MORE'
    const shareBtn = this.root.querySelector('[data-share]') as HTMLElement
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'ONE MORE', text })
        return
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        shareBtn.textContent = t('copied')
        setTimeout(() => {
          shareBtn.textContent = t('share')
        }, 1200)
        return
      }
    } catch {
      // user cancelled or clipboard blocked
    }
  }
}
