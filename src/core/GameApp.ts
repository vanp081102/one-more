import { EventBus, GameEvents } from './EventBus'
import { Time } from './Time'
import { defaultTimingConfig } from '../data/TimingConfig'
import { defaultScoreConfig } from '../data/ScoreConfig'
import { defaultDifficultyConfig } from '../data/DifficultyConfig'
import { GameModeId } from '../data/GameModeConfig'
import { getLevelDef, LEVEL_COUNT } from '../data/LevelConfig'
import { themes, defaultThemeId, withCustomAccent } from '../data/ThemeConfig'
import { soundPacks, defaultSoundPackId } from '../data/SoundPackConfig'
import { InputManager } from '../input/InputManager'
import { RunManager, type HudPayload, type RunEndedPayload } from '../gameplay/RunManager'
import { FeedbackSystem } from '../feedback/FeedbackSystem'
import { AudioManager } from '../audio/AudioManager'
import { CanvasRenderer } from '../render/CanvasRenderer'
import { HudView } from '../ui/HudView'
import { ResultView } from '../ui/ResultView'
import { SettingsView } from '../ui/SettingsView'
import { LeaderboardView } from '../ui/LeaderboardView'
import { LevelSelectView } from '../ui/LevelSelectView'
import { SaveService, type GameSettings } from '../services/SaveService'
import { CloudService, mergeModeLevels } from '../services/CloudService'
import { MetaProgress } from '../services/MetaProgress'
import {
  setLang,
  t,
  getLang,
  themeLabel,
  soundLabel,
  type Lang,
} from '../data/Locale'

export class GameApp {
  private readonly bus = new EventBus()
  private readonly time = new Time()
  private readonly input = new InputManager()
  private readonly audio = new AudioManager()
  private readonly save = new SaveService()
  private readonly cloud = new CloudService()
  private readonly meta: MetaProgress
  private readonly run: RunManager
  private readonly feedback: FeedbackSystem
  private readonly renderer: CanvasRenderer
  private readonly hud: HudView
  private readonly result: ResultView
  private readonly settingsView: SettingsView
  private readonly leaderboardView: LeaderboardView
  private readonly levelSelect: LevelSelectView
  private readonly canvas: HTMLCanvasElement
  private readonly root: HTMLElement
  private raf = 0
  private showMenu = true
  private activeMode: GameModeId = GameModeId.Classic
  private activeLevel = 1
  private lastSeed = 0

  constructor(root: HTMLElement) {
    this.root = root
    this.meta = new MetaProgress(this.save, this.bus)

    const lang = this.save.get().settings.language ?? 'vi'
    setLang(lang)

    const themeButtons = Object.values(themes)
      .map((th) => {
        const active = this.save.get().activeTheme === th.id
        return `<button type="button" class="btn-theme swatch${active ? ' active' : ''}" data-theme="${th.id}" title="${themeLabel(th.id)}"><span class="swatch-dot" style="background:${th.accent}"></span> ${themeLabel(th.id)}</button>`
      })
      .join('')

    const soundButtons = Object.values(soundPacks)
      .map((s) => {
        const active = this.save.get().activeSound === s.id
        return `<button type="button" class="btn-theme${active ? ' active' : ''}" data-sound="${s.id}" title="${soundLabel(s.id)}">${soundLabel(s.id)}</button>`
      })
      .join('')

    const prog = this.save.getLevelProgress()
    const levelHint = `${t('level')} ${prog.unlocked}/${LEVEL_COUNT}`

    root.innerHTML = `
      <div class="game-shell">
        <div class="brand">ONE MORE</div>
        <canvas class="game-canvas"></canvas>
        <div class="ui-layer"></div>
        <div class="menu" data-menu>
          <h1>ONE MORE</h1>
          <p class="tagline" data-tagline>${t('tagline')}</p>
          <button type="button" class="btn-primary" data-play>${t('play')}</button>
          <p class="menu-mode-hint" data-mode-hint>${levelHint}</p>
          <div class="menu-nav">
            <button type="button" class="btn-link" data-open-scores data-l="scores">${t('scores')}</button>
            <button type="button" class="btn-link" data-open-settings data-l="settings">${t('settings')}</button>
          </div>
          <div class="menu-themes" data-themes>
            <p class="themes-label" data-l="theme">${t('theme')}</p>
            <div class="theme-row">${themeButtons}</div>
            <p class="themes-label" data-l="sound">${t('sound')}</p>
            <div class="theme-row" data-sound-row>${soundButtons}</div>
          </div>
        </div>
        <div class="overlay-root" data-overlays></div>
      </div>
    `

    this.canvas = root.querySelector('.game-canvas') as HTMLCanvasElement
    const uiLayer = root.querySelector('.ui-layer') as HTMLElement
    const overlays = root.querySelector('[data-overlays]') as HTMLElement
    this.renderer = new CanvasRenderer(this.canvas)
    this.hud = new HudView(uiLayer)
    this.result = new ResultView(overlays)
    this.settingsView = new SettingsView(overlays)
    this.leaderboardView = new LeaderboardView(overlays)
    this.levelSelect = new LevelSelectView(overlays)

    this.run = new RunManager(
      this.bus,
      this.input,
      defaultTimingConfig,
      defaultScoreConfig,
      defaultDifficultyConfig,
    )
    this.feedback = new FeedbackSystem(this.bus, this.audio)
    this.applySettings(this.save.get().settings)

    const themeId = this.save.get().activeTheme || defaultThemeId
    this.renderer.setTheme(themeId)
    this.applyShellAccent(themeId)
    this.audio.setSoundPack(this.save.get().activeSound || defaultSoundPackId)

    this.run.setBestUpdater((score, combo, accuracy, modeId, seed) =>
      this.save.recordRun(score, combo, accuracy, modeId, seed, this.activeLevel),
    )

    this.result.setHandlers(
      () => this.restartInstant(),
      () => this.goHome(),
      () => this.replaySeed(),
      () => this.goNextLevel(),
    )
    this.hud.setBackHandler(() => this.goHome())

    this.settingsView.setHandlers(
      (s) => this.applySettings(this.save.updateSettings(s)),
      () => {},
      (lang) => this.changeLanguage(lang),
    )
    this.leaderboardView.setHandlers({
      onClose: () => {},
      onLoginGoogle: () => void this.handleLogin('google'),
      onLoginGuest: () => void this.handleLogin('guest'),
      onLogout: () => void this.handleLogout(),
      onRefreshGlobal: () => void this.refreshGlobalLeaderboard(),
    })
    this.leaderboardView.setCloudReady(this.cloud.isConfigured())
    this.cloud.onAuthChanged((u) => {
      this.leaderboardView.setUser(u)
      if (u) void this.syncCloudProgress()
    })
    this.levelSelect.setHandlers(
      (level) => this.startPlaying(level),
      () => {},
    )

    root.querySelector('[data-play]')!.addEventListener('click', () => {
      this.audio.unlock()
      this.openLevelSelect()
    })

    root.querySelectorAll('[data-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.theme
        if (!id) return
        if (this.save.setActiveTheme(id)) {
          this.renderer.setTheme(id)
          this.applyShellAccent(id)
          this.refreshThemeButtons()
        }
      })
    })

    root.querySelectorAll('[data-sound]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.sound
        if (!id) return
        if (this.save.setActiveSound(id)) {
          this.audio.unlock()
          this.audio.setSoundPack(id)
          this.refreshSoundButtons()
        }
      })
    })

    root.querySelector('[data-open-settings]')!.addEventListener('click', () => {
      this.settingsView.show(this.save.get().settings)
    })
    root.querySelector('[data-open-scores]')!.addEventListener('click', () => {
      const d = this.save.get()
      this.leaderboardView.show(
        this.save.getLeaderboard(),
        d.streak,
        d.bestStreak,
        this.save.getAllModeLevels(),
        this.save.getStanding(),
      )
      void this.refreshGlobalLeaderboard()
    })

    this.bus.on<HudPayload>(GameEvents.HudUpdated, (p) => this.hud.update(p))
    this.bus.on<RunEndedPayload>(GameEvents.RunEnded, (p) => this.onRunEnded(p))

    this.input.attach(this.root.querySelector('.game-shell') as HTMLElement)
    this.input.setEnabled(false)
    this.layout()
    window.addEventListener('resize', () => this.layout())
    window.addEventListener('orientationchange', () => this.layout())
    document.addEventListener('visibilitychange', () => {
      const hidden = document.hidden
      this.time.setPaused(hidden)
      this.audio.setSuspended(hidden)
    })

    window.addEventListener('pointerdown', () => {
      this.audio.unlock()
    })
    window.addEventListener('keydown', () => {
      this.audio.unlock()
    })
    window.addEventListener('touchstart', () => {
      this.audio.unlock()
    }, { passive: true })

    this.hud.setVisible(false)
    this.time.start()
    this.feedback.start()
    this.loop()
  }

  private applySettings(s: GameSettings): void {
    if (s.language && s.language !== getLang()) {
      setLang(s.language)
      this.refreshLocale()
    }
    this.feedback.setReducedMotion(s.reducedMotion)
    this.feedback.setVibrationEnabled(s.vibration)
    this.audio.setVolume(s.volume)
    this.audio.setMuted(s.audioIndependent)
    const ghost = s.visualTimingIndicators || s.audioIndependent
    this.run.setShowTimingGhost(ghost)
    this.renderer.setColorblind(s.colorblindFriendly)
    this.renderer.setReducedMotion(s.reducedMotion)
    this.renderer.setCustomAccent(s.customAccent)
    this.applyShellAccent(this.save.get().activeTheme || defaultThemeId)
  }

  private changeLanguage(lang: Lang): void {
    setLang(lang)
    this.save.updateSettings({ language: lang })
    this.refreshLocale()
  }

  private async handleLogin(kind: 'google' | 'guest'): Promise<void> {
    if (!this.cloud.isConfigured()) {
      this.leaderboardView.setStatus(t('cloudSetupHint'))
      return
    }
    this.leaderboardView.setStatus(t('syncing'))
    try {
      if (kind === 'google') await this.cloud.signInGoogle()
      else await this.cloud.signInGuest()
      await this.syncCloudProgress()
      this.leaderboardView.setStatus(t('synced'))
      await this.refreshGlobalLeaderboard()
    } catch {
      this.leaderboardView.setStatus(t('loginFailed'))
    }
  }

  private async handleLogout(): Promise<void> {
    await this.cloud.signOut()
    this.leaderboardView.setStatus(t('notLoggedIn'))
  }

  private async syncCloudProgress(): Promise<void> {
    if (!this.cloud.getUser()) return
    this.leaderboardView.setStatus(t('syncing'))
    const remote = await this.cloud.loadProgress()
    const merged = mergeModeLevels(this.save.getAllModeLevels(), remote)
    this.save.applyModeLevels(merged)
    await this.cloud.saveProgress(merged)
    const standing = this.save.getStanding()
    await this.cloud.submitStanding({
      totalScore: standing.totalScore,
      level: standing.level,
      maxCombo: standing.bestCombo,
    })
    this.leaderboardView.setModeLevels(merged)
    this.leaderboardView.setStanding(standing)
    this.leaderboardView.setStatus(t('synced'))
  }

  private async refreshGlobalLeaderboard(): Promise<void> {
    if (!this.cloud.isConfigured()) return
    try {
      const entries = await this.cloud.fetchLeaderboard(20)
      this.leaderboardView.setGlobalEntries(entries)
    } catch {
      // ignore offline / rules
    }
  }

  private async pushCloudAfterRun(_payload: RunEndedPayload): Promise<void> {
    if (!this.cloud.getUser()) return
    try {
      await this.cloud.saveProgress(this.save.getAllModeLevels())
      const standing = this.save.getStanding()
      await this.cloud.submitStanding({
        totalScore: standing.totalScore,
        level: standing.level,
        maxCombo: standing.bestCombo,
      })
      await this.refreshGlobalLeaderboard()
    } catch {
      // keep local progress
    }
  }

  private showModeHint(_modeId?: GameModeId): void {
    const prog = this.save.getLevelProgress()
    const hint = this.root.querySelector('[data-mode-hint]')
    if (hint) {
      hint.textContent = `${t('level')} ${prog.unlocked}/${LEVEL_COUNT}`
    }
  }

  private refreshLocale(): void {
    const tagline = this.root.querySelector('[data-tagline]')
    if (tagline) tagline.textContent = t('tagline')
    const play = this.root.querySelector('[data-play]')
    if (play) play.textContent = t('play')
    this.root.querySelectorAll('[data-l]').forEach((el) => {
      const key = (el as HTMLElement).dataset.l
      if (key) el.textContent = t(key)
    })
    this.showModeHint()
    this.root.querySelectorAll('[data-theme]').forEach((el) => {
      const id = (el as HTMLElement).dataset.theme
      if (!id) return
      const th = themes[id]
      const label = themeLabel(id)
      el.innerHTML = th
        ? `<span class="swatch-dot" style="background:${th.accent}"></span> ${label}`
        : label
      ;(el as HTMLElement).title = label
    })
    this.root.querySelectorAll('[data-sound]').forEach((el) => {
      const id = (el as HTMLElement).dataset.sound
      if (!id) return
      const label = soundLabel(id)
      el.textContent = label
      ;(el as HTMLElement).title = label
    })
    this.hud.applyLocale()
    this.result.applyLocale()
    this.settingsView.applyLocale()
    this.leaderboardView.applyLocale()
    this.levelSelect.applyLocale()
  }

  private applyShellAccent(themeId: string): void {
    const base = themes[themeId] ?? themes[defaultThemeId]!
    const accent = this.save.get().settings.customAccent
    const resolved = withCustomAccent(base, accent)
    this.root.style.setProperty('--accent', resolved.accent)
    const shell = this.root.querySelector('.game-shell') as HTMLElement | null
    if (shell) shell.style.background = resolved.bg0
  }

  private refreshThemeButtons(): void {
    const row = this.root.querySelector('.theme-row')
    if (!row) return
    const data = this.save.get()
    row.querySelectorAll('[data-theme]').forEach((el) => {
      const btn = el as HTMLButtonElement
      const id = btn.dataset.theme!
      btn.disabled = false
      btn.classList.remove('locked')
      btn.classList.toggle('active', data.activeTheme === id)
    })
  }

  private refreshSoundButtons(): void {
    const row = this.root.querySelector('[data-sound-row]')
    if (!row) return
    const data = this.save.get()
    row.querySelectorAll('[data-sound]').forEach((el) => {
      const btn = el as HTMLButtonElement
      const id = btn.dataset.sound!
      btn.disabled = false
      btn.classList.remove('locked')
      btn.classList.toggle('active', data.activeSound === id)
    })
  }

  private layout(): void {
    const shell = this.root.querySelector('.game-shell') as HTMLElement
    const maxW = Math.min(420, window.innerWidth)
    const maxH = window.innerHeight
    let w = maxW
    let h = Math.floor(w * (16 / 9))
    if (h > maxH) {
      h = maxH
      w = Math.floor(h * (9 / 16))
    }
    shell.style.width = `${w}px`
    shell.style.height = `${h}px`
    this.renderer.resize(w, h)
    this.run.setPlayfield(w, h)
  }

  private openLevelSelect(): void {
    const prog = this.save.getLevelProgress()
    this.levelSelect.show(prog.unlocked, prog.cleared, prog.bests)
  }

  private startPlaying(level = 1): void {
    const prog = this.save.getLevelProgress()
    const lv = Math.max(1, Math.min(LEVEL_COUNT, Math.floor(level)))
    // Progression lock: cannot start a level that is still locked
    if (lv > prog.unlocked) {
      this.openLevelSelect()
      return
    }
    this.audio.unlock()
    void this.audio.resume()
    this.activeMode = GameModeId.Classic
    this.activeLevel = lv
    this.run.setMode(GameModeId.Classic)
    this.run.setLevel(lv)
    this.showMenu = false
    const menu = this.root.querySelector('[data-menu]') as HTMLElement
    menu.classList.add('hidden')
    this.settingsView.hide()
    this.leaderboardView.hide()
    this.levelSelect.hide()
    this.result.hide()
    this.hud.setVisible(true)
    this.feedback.reset()
    this.input.setEnabled(true)
    this.run.startRun()
    this.lastSeed = this.run.getSeed()
    if (this.save.get().totalRuns === 0) {
      this.hud.beginTeach(10)
    }
  }

  private restartInstant(): void {
    this.audio.unlock()
    this.run.setMode(this.activeMode)
    this.run.setLevel(this.activeLevel)
    this.result.hide()
    this.hud.setVisible(true)
    this.feedback.reset()
    this.input.setEnabled(true)
    this.run.startRun()
    this.lastSeed = this.run.getSeed()
    this.run.tryBeginHold(this.time.now)
  }

  private goNextLevel(): void {
    const prog = this.save.getLevelProgress()
    const next = this.activeLevel + 1
    // Must clear current level before advancing; otherwise replay
    if (
      this.activeLevel >= LEVEL_COUNT ||
      !prog.cleared.includes(this.activeLevel) ||
      next > prog.unlocked
    ) {
      this.restartInstant()
      return
    }
    this.startPlaying(next)
  }

  /** Same seed — practice the run that just ended. */
  private replaySeed(): void {
    this.audio.unlock()
    this.run.setMode(this.activeMode)
    this.run.setLevel(this.activeLevel)
    this.result.hide()
    this.hud.setVisible(true)
    this.feedback.reset()
    this.input.setEnabled(true)
    const seed = this.result.getLastSeed() || this.lastSeed
    this.run.startRun(seed)
    this.lastSeed = this.run.getSeed()
    this.run.tryBeginHold(this.time.now)
  }

  private goHome(): void {
    this.showMenu = true
    this.result.hide()
    this.levelSelect.hide()
    this.hud.setVisible(false)
    this.feedback.reset()
    this.audio.stopBed()
    this.input.setEnabled(false)
    const menu = this.root.querySelector('[data-menu]') as HTMLElement
    menu.classList.remove('hidden')
    this.showModeHint()
    this.refreshThemeButtons()
    this.refreshSoundButtons()
  }

  private onRunEnded(payload: RunEndedPayload): void {
    const unlocked = this.meta.evaluate({
      score: payload.stats.score,
      maxCombo: payload.stats.maxCombo,
      perfects: payload.stats.perfects,
      ultras: payload.stats.ultras,
      modeId: payload.modeId,
      endReason: payload.endReason,
    })
    const curDef = getLevelDef(payload.level)
    // Cleared this run only when score meets the level goal
    const levelCleared = payload.stats.score >= curDef.clearScore
    let nextLevelUnlocked = false
    const toRecord = new Set(this.run.getClearedDuringRun())
    if (levelCleared) {
      toRecord.add(payload.level)
    }
    for (const lv of [...toRecord].sort((a, b) => a - b)) {
      const def = getLevelDef(lv)
      const r = this.save.recordLevelRun(lv, payload.stats.score, def.clearScore)
      if (r.unlockedNext) nextLevelUnlocked = true
    }
    const prog = this.save.getLevelProgress()
    // Offer next only if this level is cleared and the next slot is unlocked
    if (levelCleared && payload.level < LEVEL_COUNT && prog.unlocked > payload.level) {
      nextLevelUnlocked = true
    }
    // Still track best score on a failed run (no unlock)
    if (!levelCleared && payload.stats.score > 0) {
      this.save.recordLevelRun(payload.level, payload.stats.score, curDef.clearScore)
    }
    this.activeLevel = payload.level
    if (payload.isNewBest) this.audio.playNewRecord()
    this.lastSeed = payload.seed
    this.hud.setVisible(false)
    this.result.show(
      { ...payload, levelCleared, nextLevelUnlocked },
      unlocked,
    )
    this.input.setEnabled(true)
    this.refreshThemeButtons()
    this.refreshSoundButtons()
    void this.pushCloudAfterRun(payload)
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop)

    // Skip heavy work while tab is hidden — timer already paused
    if (document.hidden) return

    this.input.poll()
    const dt = this.time.tick()
    const now = this.time.now

    if (this.settingsView.isVisible() || this.leaderboardView.isVisible() || this.levelSelect.isVisible()) {
      this.input.endFrame()
      this.feedback.update(dt)
      this.renderer.draw(this.run, this.feedback)
      return
    }

    if (!this.showMenu && !this.result.isVisible()) {
      this.run.update(dt, now)
    } else if (this.result.isVisible()) {
      const action = this.input.getAction()
      if (action.justPressed) {
        this.restartInstant()
      }
      this.input.endFrame()
    } else {
      this.input.endFrame()
    }

    this.feedback.update(dt)
    this.renderer.draw(this.run, this.feedback)
  }

  destroy(): void {
    cancelAnimationFrame(this.raf)
    this.feedback.stop()
    this.input.detach()
    this.audio.dispose()
    this.bus.clear()
  }
}
