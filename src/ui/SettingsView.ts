import type { GameSettings } from '../services/SaveService'
import { t, getLang, type Lang } from '../data/Locale'

const DEFAULT_ACCENT = '#7dffb3'

export class SettingsView {
  private root: HTMLElement
  private onChange: ((s: GameSettings) => void) | null = null
  private onClose: (() => void) | null = null
  private onLanguage: ((lang: Lang) => void) | null = null

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div')
    this.root.className = 'overlay-panel hidden'
    this.root.innerHTML = this.buildHtml()
    parent.appendChild(this.root)
    this.bind()
  }

  private buildHtml(): string {
    return `
      <div class="overlay-card">
        <h2 data-title>${t('settings')}</h2>
        <label class="setting-row">
          <span data-l="volume">${t('volume')}</span>
          <input type="range" min="0" max="100" data-volume />
        </label>
        <label class="setting-row">
          <span data-l="language">${t('language')}</span>
          <select data-lang class="setting-select">
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </label>
        <label class="setting-row">
          <span data-l="accentColor">${t('accentColor')}</span>
          <span class="accent-controls">
            <input type="color" data-accent value="${DEFAULT_ACCENT}" />
            <button type="button" class="btn-mini" data-accent-reset>${t('resetAccent')}</button>
          </span>
        </label>
        <label class="setting-row toggle">
          <span data-l="reducedMotion">${t('reducedMotion')}</span>
          <input type="checkbox" data-reduced />
        </label>
        <label class="setting-row toggle">
          <span data-l="vibration">${t('vibration')}</span>
          <input type="checkbox" data-vibration />
        </label>
        <label class="setting-row toggle">
          <span data-l="timingGhost">${t('timingGhost')}</span>
          <input type="checkbox" data-ghost />
        </label>
        <label class="setting-row toggle">
          <span data-l="colorblind">${t('colorblind')}</span>
          <input type="checkbox" data-colorblind />
        </label>
        <label class="setting-row toggle">
          <span data-l="noAudioCues">${t('noAudioCues')}</span>
          <input type="checkbox" data-audio-ind />
        </label>
        <button type="button" class="btn-ghost" data-close>${t('back')}</button>
      </div>
    `
  }

  private bind(): void {
    this.root.querySelector('[data-close]')!.addEventListener('click', (e) => {
      e.stopPropagation()
      this.hide()
      this.onClose?.()
    })

    const emit = () => {
      if (!this.onChange) return
      this.onChange(this.read())
    }

    this.root.querySelector('[data-volume]')!.addEventListener('input', emit)
    this.root.querySelectorAll('input[type=checkbox]').forEach((el) => {
      el.addEventListener('change', emit)
    })
    this.root.querySelector('[data-lang]')!.addEventListener('change', () => {
      const lang = (this.root.querySelector('[data-lang]') as HTMLSelectElement).value as Lang
      this.onLanguage?.(lang)
      emit()
    })
    this.root.querySelector('[data-accent]')!.addEventListener('input', emit)
    this.root.querySelector('[data-accent-reset]')!.addEventListener('click', (e) => {
      e.stopPropagation()
      const accent = this.root.querySelector('[data-accent]') as HTMLInputElement
      accent.dataset.cleared = '1'
      accent.value = DEFAULT_ACCENT
      emit()
    })
  }

  setHandlers(
    onChange: (s: GameSettings) => void,
    onClose: () => void,
    onLanguage?: (lang: Lang) => void,
  ): void {
    this.onChange = onChange
    this.onClose = onClose
    this.onLanguage = onLanguage ?? null
  }

  applyLocale(): void {
    this.root.querySelector('[data-title]')!.textContent = t('settings')
    this.root.querySelector('[data-l="volume"]')!.textContent = t('volume')
    this.root.querySelector('[data-l="language"]')!.textContent = t('language')
    this.root.querySelector('[data-l="accentColor"]')!.textContent = t('accentColor')
    this.root.querySelector('[data-accent-reset]')!.textContent = t('resetAccent')
    this.root.querySelector('[data-l="reducedMotion"]')!.textContent = t('reducedMotion')
    this.root.querySelector('[data-l="vibration"]')!.textContent = t('vibration')
    this.root.querySelector('[data-l="timingGhost"]')!.textContent = t('timingGhost')
    this.root.querySelector('[data-l="colorblind"]')!.textContent = t('colorblind')
    this.root.querySelector('[data-l="noAudioCues"]')!.textContent = t('noAudioCues')
    this.root.querySelector('[data-close]')!.textContent = t('back')
  }

  show(settings: GameSettings): void {
    this.applyLocale()
    const vol = this.root.querySelector('[data-volume]') as HTMLInputElement
    const reduced = this.root.querySelector('[data-reduced]') as HTMLInputElement
    const vib = this.root.querySelector('[data-vibration]') as HTMLInputElement
    const ghost = this.root.querySelector('[data-ghost]') as HTMLInputElement
    const cb = this.root.querySelector('[data-colorblind]') as HTMLInputElement
    const audioInd = this.root.querySelector('[data-audio-ind]') as HTMLInputElement
    const lang = this.root.querySelector('[data-lang]') as HTMLSelectElement
    const accent = this.root.querySelector('[data-accent]') as HTMLInputElement
    vol.value = String(Math.round(settings.volume * 100))
    reduced.checked = settings.reducedMotion
    vib.checked = settings.vibration
    ghost.checked = settings.visualTimingIndicators
    cb.checked = settings.colorblindFriendly
    audioInd.checked = settings.audioIndependent
    lang.value = settings.language || getLang()
    if (settings.customAccent) {
      accent.value = settings.customAccent
      delete accent.dataset.cleared
    } else {
      accent.value = DEFAULT_ACCENT
      accent.dataset.cleared = '1'
    }
    this.root.classList.remove('hidden')
  }

  hide(): void {
    this.root.classList.add('hidden')
  }

  isVisible(): boolean {
    return !this.root.classList.contains('hidden')
  }

  private read(): GameSettings {
    const vol = this.root.querySelector('[data-volume]') as HTMLInputElement
    const reduced = this.root.querySelector('[data-reduced]') as HTMLInputElement
    const vib = this.root.querySelector('[data-vibration]') as HTMLInputElement
    const ghost = this.root.querySelector('[data-ghost]') as HTMLInputElement
    const cb = this.root.querySelector('[data-colorblind]') as HTMLInputElement
    const audioInd = this.root.querySelector('[data-audio-ind]') as HTMLInputElement
    const lang = this.root.querySelector('[data-lang]') as HTMLSelectElement
    const accent = this.root.querySelector('[data-accent]') as HTMLInputElement
    const customAccent =
      accent.dataset.cleared === '1' ? null : (accent.value || null)
    if (customAccent) delete accent.dataset.cleared
    return {
      volume: Number(vol.value) / 100,
      reducedMotion: reduced.checked,
      vibration: vib.checked,
      visualTimingIndicators: ghost.checked || audioInd.checked,
      colorblindFriendly: cb.checked,
      audioIndependent: audioInd.checked,
      language: lang.value === 'en' ? 'en' : 'vi',
      customAccent,
    }
  }
}
