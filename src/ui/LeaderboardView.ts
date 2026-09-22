import type { LeaderboardEntry } from '../services/SaveService'
import type { CloudLeaderboardEntry, CloudUser } from '../services/CloudService'
import type { GameModeId } from '../data/GameModeConfig'
import { LEVEL_COUNT } from '../data/LevelConfig'
import { t } from '../data/Locale'
import type { ModeLevelProgress } from '../services/SaveService'

export type LeaderboardTab = 'local' | 'global' | 'progress'

export class LeaderboardView {
  private root: HTMLElement
  private onClose: (() => void) | null = null
  private onLoginGoogle: (() => void) | null = null
  private onLoginGuest: (() => void) | null = null
  private onLogout: (() => void) | null = null
  private onRefreshGlobal: (() => void) | null = null
  private tab: LeaderboardTab = 'local'
  private cloudReady = false
  private user: CloudUser | null = null
  private localEntries: LeaderboardEntry[] = []
  private globalEntries: CloudLeaderboardEntry[] = []
  private modeLevels: Partial<Record<GameModeId, ModeLevelProgress>> = {}
  private streak = 0
  private bestStreak = 0
  private standing = { totalScore: 0, level: 1 }
  private status = ''

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div')
    this.root.className = 'overlay-panel hidden'
    this.root.innerHTML = `
      <div class="overlay-card lb-card">
        <h2 data-title>${t('scores')}</h2>
        <div class="auth-row" data-auth>
          <span class="auth-user" data-user></span>
          <button type="button" class="btn-mini" data-login-google>${t('loginGoogle')}</button>
          <button type="button" class="btn-mini" data-login-guest>${t('loginGuest')}</button>
          <button type="button" class="btn-mini hidden" data-logout>${t('logout')}</button>
        </div>
        <p class="overlay-hint" data-status></p>
        <div class="lb-tabs">
          <button type="button" class="lb-tab active" data-tab="local">${t('tabLocal')}</button>
          <button type="button" class="lb-tab" data-tab="global">${t('tabGlobal')}</button>
          <button type="button" class="lb-tab" data-tab="progress">${t('tabProgress')}</button>
        </div>
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
    this.root.querySelector('[data-login-google]')!.addEventListener('click', (e) => {
      e.stopPropagation()
      this.onLoginGoogle?.()
    })
    this.root.querySelector('[data-login-guest]')!.addEventListener('click', (e) => {
      e.stopPropagation()
      this.onLoginGuest?.()
    })
    this.root.querySelector('[data-logout]')!.addEventListener('click', (e) => {
      e.stopPropagation()
      this.onLogout?.()
    })
    this.root.querySelectorAll('[data-tab]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        this.tab = (el as HTMLElement).dataset.tab as LeaderboardTab
        this.render()
        if (this.tab === 'global') this.onRefreshGlobal?.()
      })
    })
  }

  setHandlers(handlers: {
    onClose: () => void
    onLoginGoogle?: () => void
    onLoginGuest?: () => void
    onLogout?: () => void
    onRefreshGlobal?: () => void
  }): void {
    this.onClose = handlers.onClose
    this.onLoginGoogle = handlers.onLoginGoogle ?? null
    this.onLoginGuest = handlers.onLoginGuest ?? null
    this.onLogout = handlers.onLogout ?? null
    this.onRefreshGlobal = handlers.onRefreshGlobal ?? null
  }

  applyLocale(): void {
    this.root.querySelector('[data-title]')!.textContent = t('scores')
    this.root.querySelector('[data-close]')!.textContent = t('back')
    this.root.querySelector('[data-login-google]')!.textContent = t('loginGoogle')
    this.root.querySelector('[data-login-guest]')!.textContent = t('loginGuest')
    this.root.querySelector('[data-logout]')!.textContent = t('logout')
    this.root.querySelector('[data-tab="local"]')!.textContent = t('tabLocal')
    this.root.querySelector('[data-tab="global"]')!.textContent = t('tabGlobal')
    this.root.querySelector('[data-tab="progress"]')!.textContent = t('tabProgress')
  }

  setCloudReady(ready: boolean): void {
    this.cloudReady = ready
  }

  setUser(user: CloudUser | null): void {
    this.user = user
    this.renderAuth()
  }

  setStatus(msg: string): void {
    this.status = msg
    const el = this.root.querySelector('[data-status]')
    if (el) el.textContent = msg
  }

  setGlobalEntries(entries: CloudLeaderboardEntry[]): void {
    this.globalEntries = entries
    if (this.tab === 'global') this.render()
  }

  setModeLevels(levels: Partial<Record<GameModeId, ModeLevelProgress>>): void {
    this.modeLevels = levels
    if (this.tab === 'progress') this.render()
  }

  setStanding(standing: { totalScore: number; level: number }): void {
    this.standing = standing
    if (this.tab === 'local' || this.tab === 'global') this.render()
  }

  show(
    entries: LeaderboardEntry[],
    streak: number,
    bestStreak: number,
    modeLevels?: Partial<Record<GameModeId, ModeLevelProgress>>,
    standing?: { totalScore: number; level: number },
  ): void {
    this.applyLocale()
    this.localEntries = entries
    this.streak = streak
    this.bestStreak = bestStreak
    if (modeLevels) this.modeLevels = modeLevels
    if (standing) this.standing = standing
    this.renderAuth()
    this.render()
    this.root.classList.remove('hidden')
  }

  hide(): void {
    this.root.classList.add('hidden')
  }

  isVisible(): boolean {
    return !this.root.classList.contains('hidden')
  }

  private renderAuth(): void {
    const google = this.root.querySelector('[data-login-google]') as HTMLElement
    const guest = this.root.querySelector('[data-login-guest]') as HTMLElement
    const logout = this.root.querySelector('[data-logout]') as HTMLElement
    const userEl = this.root.querySelector('[data-user]') as HTMLElement
    if (!this.cloudReady) {
      google.classList.add('hidden')
      guest.classList.add('hidden')
      logout.classList.add('hidden')
      userEl.textContent = t('cloudOff')
      return
    }
    if (this.user) {
      google.classList.add('hidden')
      guest.classList.add('hidden')
      logout.classList.remove('hidden')
      userEl.textContent = this.user.displayName
    } else {
      google.classList.remove('hidden')
      guest.classList.remove('hidden')
      logout.classList.add('hidden')
      userEl.textContent = t('notLoggedIn')
    }
  }

  private levelLabel(level: number): string {
    return `${t('level')} ${level}`
  }

  private render(): void {
    this.root.querySelectorAll('[data-tab]').forEach((el) => {
      el.classList.toggle('active', (el as HTMLElement).dataset.tab === this.tab)
    })
    const list = this.root.querySelector('[data-list]')!
    const status = this.root.querySelector('[data-status]')!

    if (this.tab === 'local') {
      const totalLine = `${t('totalScore')} ${this.standing.totalScore} · ${this.levelLabel(this.standing.level)}`
      status.textContent =
        this.status ||
        (this.streak > 0
          ? `${totalLine} · ${t('streak')} ${this.streak}/${this.bestStreak}`
          : totalLine)
      if (this.localEntries.length === 0 && this.standing.totalScore <= 0) {
        list.innerHTML = `<li class="lb-empty">${t('noRunsYet')}</li>`
      } else {
        const rows: string[] = [
          `<li class="lb-progress"><span class="lb-rank">#</span><span class="lb-score">${this.standing.totalScore}</span><span class="lb-meta">${this.levelLabel(this.standing.level)}</span></li>`,
        ]
        for (let i = 0; i < this.localEntries.length; i++) {
          const e = this.localEntries[i]!
          const lv = e.level ?? 1
          rows.push(
            `<li><span class="lb-rank">${i + 1}</span><span class="lb-score">${e.score}</span><span class="lb-meta">${this.levelLabel(lv)}</span></li>`,
          )
        }
        list.innerHTML = rows.join('')
      }
      return
    }

    if (this.tab === 'global') {
      status.textContent =
        this.status ||
        (this.user
          ? `${t('rankByTotal')} · ${t('you')}: ${this.standing.totalScore} · ${this.levelLabel(this.standing.level)}`
          : t('loginForGlobal'))
      if (!this.cloudReady) {
        list.innerHTML = `<li class="lb-empty">${t('cloudSetupHint')}</li>`
        return
      }
      if (this.globalEntries.length === 0) {
        list.innerHTML = `<li class="lb-empty">${t('noGlobalYet')}</li>`
      } else {
        list.innerHTML = this.globalEntries
          .map(
            (e, i) =>
              `<li><span class="lb-rank">${i + 1}</span><span class="lb-score">${e.score}</span><span class="lb-meta">${e.name} · ${this.levelLabel(e.level)}</span></li>`,
          )
          .join('')
      }
      return
    }

    // progress — single 1–500 ladder
    status.textContent = this.status || t('clearedLevels')
    const p = this.modeLevels.classic ?? { unlocked: 1, cleared: [], bests: {} }
    const cleared = p.cleared.length
    const pct = Math.round((cleared / LEVEL_COUNT) * 100)
    list.innerHTML = `
      <li class="lb-progress"><span class="lb-rank">${t('level')}</span><span class="lb-score">${p.unlocked}/${LEVEL_COUNT}</span><span class="lb-meta">${t('unlocked')}</span></li>
      <li class="lb-progress"><span class="lb-rank">${t('complete')}</span><span class="lb-score">${cleared}</span><span class="lb-meta">${pct}%</span></li>
      <li class="lb-progress"><span class="lb-rank">${t('totalScore')}</span><span class="lb-score">${this.standing.totalScore}</span><span class="lb-meta">${this.levelLabel(this.standing.level)}</span></li>
    `
    const recent = [...p.cleared].sort((a, b) => b - a).slice(0, 8)
    for (const lv of recent) {
      const best = p.bests[lv] ?? 0
      list.innerHTML += `<li><span class="lb-rank">${this.levelLabel(lv)}</span><span class="lb-score">${best}</span><span class="lb-meta">${t('best')}</span></li>`
    }
  }
}
