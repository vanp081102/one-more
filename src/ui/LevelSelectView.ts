import { LEVEL_COUNT, getLevelDef, levelFeatureTags, levelTierName } from '../data/LevelConfig'
import { t } from '../data/Locale'

const PAGE_SIZE = 20

export class LevelSelectView {
  private root: HTMLElement
  private onPick: ((level: number) => void) | null = null
  private onClose: (() => void) | null = null
  private page = 0
  private unlockedMax = 1
  private cleared: number[] = []
  private bests: Record<number, number> = {}

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div')
    this.root.className = 'overlay-panel hidden'
    this.root.innerHTML = `
      <div class="overlay-card level-card">
        <h2 data-title>${t('selectLevel')}</h2>
        <p class="overlay-hint" data-page-hint></p>
        <div class="level-grid" data-grid></div>
        <div class="level-pager">
          <button type="button" class="btn-mini" data-prev>‹</button>
          <span data-page>1</span>
          <button type="button" class="btn-mini" data-next>›</button>
        </div>
        <button type="button" class="btn-ghost" data-close>${t('back')}</button>
      </div>
    `
    parent.appendChild(this.root)
    this.root.querySelector('[data-close]')!.addEventListener('click', (e) => {
      e.stopPropagation()
      this.hide()
      this.onClose?.()
    })
    this.root.querySelector('[data-prev]')!.addEventListener('click', (e) => {
      e.stopPropagation()
      this.page = Math.max(0, this.page - 1)
      this.renderGrid()
    })
    this.root.querySelector('[data-next]')!.addEventListener('click', (e) => {
      e.stopPropagation()
      const maxPage = Math.ceil(LEVEL_COUNT / PAGE_SIZE) - 1
      this.page = Math.min(maxPage, this.page + 1)
      this.renderGrid()
    })
  }

  setHandlers(onPick: (level: number) => void, onClose?: () => void): void {
    this.onPick = onPick
    this.onClose = onClose ?? null
  }

  applyLocale(): void {
    this.root.querySelector('[data-title]')!.textContent = t('selectLevel')
    this.root.querySelector('[data-close]')!.textContent = t('back')
  }

  show(
    unlockedMax: number,
    cleared: readonly number[],
    bests: Readonly<Record<number, number>>,
  ): void {
    this.unlockedMax = unlockedMax
    this.cleared = [...cleared]
    this.bests = { ...bests }
    this.page = Math.floor(Math.max(0, unlockedMax - 1) / PAGE_SIZE)
    this.applyLocale()
    this.renderGrid()
    this.root.classList.remove('hidden')
  }

  hide(): void {
    this.root.classList.add('hidden')
  }

  isVisible(): boolean {
    return !this.root.classList.contains('hidden')
  }

  private renderGrid(): void {
    const start = this.page * PAGE_SIZE + 1
    const end = Math.min(LEVEL_COUNT, start + PAGE_SIZE - 1)
    const maxPage = Math.ceil(LEVEL_COUNT / PAGE_SIZE)
    this.root.querySelector('[data-page]')!.textContent = `${this.page + 1}/${maxPage}`
    this.root.querySelector('[data-page-hint]')!.textContent =
      `${t('level')} ${start}–${end} · ${t('unlocked')} ${this.unlockedMax}`

    const grid = this.root.querySelector('[data-grid]') as HTMLElement
    const bits: string[] = []
    for (let lv = start; lv <= end; lv++) {
      const def = getLevelDef(lv)
      const open = lv <= this.unlockedMax
      const done = this.cleared.includes(lv)
      const best = this.bests[lv] ?? 0
      const tags = levelFeatureTags(lv)
      const tier = t(levelTierName(lv))
      bits.push(`
        <button type="button" class="btn-level${open ? '' : ' locked'}${done ? ' cleared' : ''}"
          data-level="${lv}" ${open ? '' : 'disabled'}>
          <span class="lvl-num">${t('level')} ${lv}</span>
          <span class="lvl-stars">${tier}</span>
          <span class="lvl-goal">${t('clearAt')} ${def.clearScore}${tags.length ? ` · ${tags.join('+')}` : ''}</span>
          <span class="lvl-best">${best > 0 ? `${t('best')} ${best}` : open ? '—' : t('locked')}</span>
        </button>
      `)
    }
    grid.innerHTML = bits.join('')
    grid.querySelectorAll('[data-level]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const lv = Number((btn as HTMLElement).dataset.level)
        if (!lv) return
        this.hide()
        this.onPick?.(lv)
      })
    })
  }
}
