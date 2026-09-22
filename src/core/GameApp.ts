import { EventBus, GameEvents } from './EventBus'
import { Time } from './Time'
import { defaultTimingConfig } from '../data/TimingConfig'
import { defaultScoreConfig } from '../data/ScoreConfig'
import { defaultDifficultyConfig } from '../data/DifficultyConfig'
import { GameModeId, utcDateKey, gameModes, difficultyStars } from '../data/GameModeConfig'
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
import { SaveService, type GameSettings } from '../services/SaveService'
import { MetaProgress } from '../services/MetaProgress'
import {
  setLang,
  t,
  getLang,
  themeLabel,
  soundLabel,
  modeLabel,
  modeBlurb,
  type Lang,
} from '../data/Locale'

export class GameApp {
  private readonly bus = new EventBus()
  private readonly time = new Time()
  private readonly input = new InputManager()
  private readonly audio = new AudioManager()
  private readonly save = new SaveService()
  private readonly meta: MetaProgress
  private readonly run: RunManager
  private readonly feedback: FeedbackSystem
  private readonly renderer: CanvasRenderer
  private readonly hud: HudView
  private readonly result: ResultView
  private readonly settingsView: SettingsView
  private readonly leaderboardView: LeaderboardView
  private readonly canvas: HTMLCanvasElement
  private readonly root: HTMLElement
  private raf = 0
  private showMenu = true
  private activeMode: GameModeId = GameModeId.Classic
  private lastSeed = 0

  constructor(root: HTMLElement) {
    this.root = root
    this.meta = new MetaProgress(this.save, this.bus)

    const lang = this.save.get().settings.language ?? 'vi'
    setLang(lang)

    const daily = this.save.getDaily()
    const dailyHint = daily
      ? `${t('best')} ${daily.bestScore}`
      : utcDateKey()

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

    const modeOrder: GameModeId[] = [
      GameModeId.Zen,
      GameModeId.Perfect,
      GameModeId.Speed,
      GameModeId.Mirror,
      GameModeId.Drift,
      GameModeId.Blink,
      GameModeId.Chaos,
      GameModeId.Endless,
      GameModeId.Daily,
    ]
    const modeCells = modeOrder
      .map(
        (id) => `
          <div class="mode-cell">
            <button type="button" class="btn-mode" data-mode="${id}" data-l="${id}">${t(id)}</button>
            <button type="button" class="btn-mode-info" data-mode-info="${id}" aria-label="${t('modeInfo')}">?</button>
          </div>`,
      )
      .join('')

    root.innerHTML = `
      <div class="game-shell">
        <div class="brand">ONE MORE</div>
        <canvas class="game-canvas"></canvas>
        <div class="ui-layer"></div>
        <div class="menu" data-menu>
          <h1>ONE MORE</h1>
          <p class="tagline" data-tagline>${t('tagline')}</p>
          <div class="play-row">
            <button type="button" class="btn-primary" data-mode="classic" data-play>${t('play')}</button>
            <button type="button" class="btn-mode-info play-info" data-mode-info="classic" aria-label="${t('modeInfo')}">?</button>
          </div>
          <div class="menu-modes">${modeCells}</div>
          <p class="menu-mode-hint" data-mode-hint>${t('pickModeHint')}</p>
          <p class="menu-daily" data-daily-hint>${dailyHint}</p>
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
      this.save.recordRun(score, combo, accuracy, modeId, seed),
    )

    this.result.setHandlers(
      () => this.restartInstant(),
      () => this.goHome(),
      () => this.replaySeed(),
    )
    this.hud.setBackHandler(() => this.goHome())

    this.settingsView.setHandlers(
      (s) => this.applySettings(this.save.updateSettings(s)),
      () => {},
      (lang) => this.changeLanguage(lang),
    )
    this.leaderboardView.setHandlers(() => {})

    root.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.mode as GameModeId
        this.audio.unlock()
        this.startPlaying(id)
      })
    })

    root.querySelectorAll('[data-mode-info]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const id = (btn as HTMLElement).dataset.modeInfo as GameModeId
        this.showModeHint(id)
      })
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
      this.leaderboardView.show(d.leaderboard, d.streak, d.bestStreak)
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

    window.addEventListener('pointerdown', () => this.audio.unlock(), { once: true })
    window.addEventListener('keydown', () => this.audio.unlock(), { once: true })

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

  private showModeHint(modeId: GameModeId): void {
    const mode = gameModes[modeId]
    if (!mode) return
    const hint = this.root.querySelector('[data-mode-hint]')
    if (!hint) return
    const stars = difficultyStars(mode.difficulty)
    hint.innerHTML = `<strong>${modeLabel(modeId)}</strong> · ${t('difficulty')} ${stars}<br/><span>${modeBlurb(modeId)}</span>`
    hint.classList.add('active')
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
    this.root.querySelectorAll('[data-mode-info]').forEach((el) => {
      ;(el as HTMLElement).setAttribute('aria-label', t('modeInfo'))
    })
    const hint = this.root.querySelector('[data-mode-hint]')
    if (hint && !hint.classList.contains('active')) {
      hint.textContent = t('pickModeHint')
    } else if (hint?.classList.contains('active')) {
      // re-render last shown if we can parse from strong — reset to pick hint on lang change
      hint.classList.remove('active')
      hint.textContent = t('pickModeHint')
    }
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
    const daily = this.save.getDaily()
    const dHint = this.root.querySelector('[data-daily-hint]')
    if (dHint) {
      dHint.textContent = daily ? `${t('best')} ${daily.bestScore}` : utcDateKey()
    }
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

  private startPlaying(modeId: GameModeId): void {
    this.activeMode = modeId
    this.run.setMode(modeId)
    this.showMenu = false
    const menu = this.root.querySelector('[data-menu]') as HTMLElement
    menu.classList.add('hidden')
    this.settingsView.hide()
    this.leaderboardView.hide()
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
    this.result.hide()
    this.hud.setVisible(true)
    this.feedback.reset()
    this.input.setEnabled(true)
    this.run.startRun()
    this.lastSeed = this.run.getSeed()
    this.run.tryBeginHold(this.time.now)
  }

  /** Same seed — practice the run that just ended. */
  private replaySeed(): void {
    this.audio.unlock()
    this.run.setMode(this.activeMode)
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
    this.hud.setVisible(false)
    this.feedback.reset()
    this.audio.stopBed()
    this.input.setEnabled(false)
    const menu = this.root.querySelector('[data-menu]') as HTMLElement
    menu.classList.remove('hidden')
    const daily = this.save.getDaily()
    const hint = this.root.querySelector('[data-daily-hint]')
    if (hint) {
      hint.textContent = daily ? `${t('best')} ${daily.bestScore}` : utcDateKey()
    }
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
    if (payload.isNewBest) this.audio.playNewRecord()
    this.lastSeed = payload.seed
    this.hud.setVisible(false)
    this.result.show(payload, unlocked)
    this.input.setEnabled(true)
    this.refreshThemeButtons()
    this.refreshSoundButtons()
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop)

    // Skip heavy work while tab is hidden — timer already paused
    if (document.hidden) return

    this.input.poll()
    const dt = this.time.tick()
    const now = this.time.now

    if (this.settingsView.isVisible() || this.leaderboardView.isVisible()) {
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
