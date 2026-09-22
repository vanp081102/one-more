import type { LeaderboardEntry } from '../services/SaveService'
import { t, modeLabel } from '../data/Locale'

export class LeaderboardView {
  private root: HTMLElement
  private onClose: (() => void) | null = null

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div')
    this.root.className = 'overlay-panel hidden'
    this.root.innerHTML = `
      <div class="overlay-card">
        <h2 data-title>${t('scores')}</h2>
        <p class="overlay-hint" data-hint>${t('localBests')}</p>
        <ol class="lb-list" data-list></ol>
        <button type="button" class="btn-ghost" data-close>${t('back')}</button>
      </div>
    `
    parent.appendChild(this.root)

    this.root.querySelector('[data-close]')!.addEventListener('click', (e) => {
      e.stopPropagation()
      this.hide()
      this.onClose?.()
    })
  }

  setHandlers(onClose: () => void): void {
    this.onClose = onClose
  }

  applyLocale(): void {
    this.root.querySelector('[data-title]')!.textContent = t('scores')
    this.root.querySelector('[data-close]')!.textContent = t('back')
  }

  show(entries: LeaderboardEntry[], streak: number, bestStreak: number): void {
    this.applyLocale()
    const list = this.root.querySelector('[data-list]')!
    if (entries.length === 0) {
      list.innerHTML = `<li class="lb-empty">${t('noRunsYet')}</li>`
    } else {
      list.innerHTML = entries
        .map(
          (e, i) =>
            `<li><span class="lb-rank">${i + 1}</span><span class="lb-score">${e.score}</span><span class="lb-meta">${modeLabel(e.modeId)} · C${e.maxCombo}</span></li>`,
        )
        .join('')
    }
    const hint = this.root.querySelector('[data-hint]')!
    hint.textContent =
      streak > 0
        ? `${t('streak')} ${streak} · ${t('best')} ${bestStreak}`
        : t('localBests')
    this.root.classList.remove('hidden')
  }

  hide(): void {
    this.root.classList.add('hidden')
  }

  isVisible(): boolean {
    return !this.root.classList.contains('hidden')
  }
}
