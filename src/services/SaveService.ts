import type { GameModeId } from '../data/GameModeConfig'
import { utcDateKey } from '../data/GameModeConfig'
import { themes, defaultThemeId } from '../data/ThemeConfig'
import { soundPacks, defaultSoundPackId } from '../data/SoundPackConfig'

const STORAGE_KEY = 'one-more-save-v2'
const LEADERBOARD_MAX = 10

export interface ModeBest {
  bestScore: number
  bestCombo: number
  bestAccuracy: number
}

export interface DailyRecord {
  date: string
  bestScore: number
  bestCombo: number
  bestAccuracy: number
  attempts: number
}

export interface LeaderboardEntry {
  score: number
  maxCombo: number
  modeId: GameModeId
  date: string
  seed: number
}

export interface GameSettings {
  volume: number
  reducedMotion: boolean
  vibration: boolean
  visualTimingIndicators: boolean
  colorblindFriendly: boolean
  audioIndependent: boolean
  language: 'vi' | 'en'
  /** Custom accent color (#rrggbb) — overrides theme accent when set */
  customAccent: string | null
}

export interface SaveData {
  bestScore: number
  bestCombo: number
  totalRuns: number
  streak: number
  bestStreak: number
  lastPlayDate: string | null
  modeBests: Partial<Record<GameModeId, ModeBest>>
  daily: DailyRecord | null
  achievements: string[]
  unlockedThemes: string[]
  activeTheme: string
  unlockedSounds: string[]
  activeSound: string
  leaderboard: LeaderboardEntry[]
  settings: GameSettings
}

export interface RecordRunResult {
  bestScore: number
  bestCombo: number
  isNewBest: boolean
  streak: number
}

const emptyModeBest = (): ModeBest => ({
  bestScore: 0,
  bestCombo: 0,
  bestAccuracy: 0,
})

const defaultSave = (): SaveData => ({
  bestScore: 0,
  bestCombo: 0,
  totalRuns: 0,
  streak: 0,
  bestStreak: 0,
  lastPlayDate: null,
  modeBests: {},
  daily: null,
  achievements: [],
  unlockedThemes: Object.keys(themes),
  activeTheme: defaultThemeId,
  unlockedSounds: Object.keys(soundPacks),
  activeSound: defaultSoundPackId,
  leaderboard: [],
  settings: {
    volume: 0.35,
    reducedMotion: false,
    vibration: true,
    visualTimingIndicators: true,
    colorblindFriendly: false,
    audioIndependent: false,
    language: 'vi',
    customAccent: null,
  },
})

function daysBetweenUtc(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00Z`)
  const tb = Date.parse(`${b}T00:00:00Z`)
  return Math.round((tb - ta) / 86_400_000)
}

export class SaveService {
  private data: SaveData
  private storage: Storage | null = null

  constructor(storage?: Storage) {
    this.data = this.load(storage ?? (typeof localStorage !== 'undefined' ? localStorage : null))
  }

  get(): SaveData {
    return this.data
  }

  getModeBest(modeId: GameModeId): ModeBest {
    return this.data.modeBests[modeId] ?? emptyModeBest()
  }

  getDaily(): DailyRecord | null {
    const today = utcDateKey()
    if (this.data.daily && this.data.daily.date === today) return this.data.daily
    return null
  }

  getLeaderboard(): LeaderboardEntry[] {
    return this.data.leaderboard
  }

  hasAchievement(id: string): boolean {
    return this.data.achievements.includes(id)
  }

  unlockAchievements(ids: string[]): string[] {
    const newly: string[] = []
    for (const id of ids) {
      if (!this.data.achievements.includes(id)) {
        this.data.achievements.push(id)
        newly.push(id)
      }
    }
    if (newly.length > 0) this.persist()
    return newly
  }

  unlockTheme(themeId: string): boolean {
    if (this.data.unlockedThemes.includes(themeId)) return false
    this.data.unlockedThemes.push(themeId)
    this.persist()
    return true
  }

  setActiveTheme(themeId: string): boolean {
    if (!this.data.unlockedThemes.includes(themeId)) return false
    this.data.activeTheme = themeId
    this.persist()
    return true
  }

  unlockSound(packId: string): boolean {
    if (this.data.unlockedSounds.includes(packId)) return false
    this.data.unlockedSounds.push(packId)
    this.persist()
    return true
  }

  setActiveSound(packId: string): boolean {
    if (!this.data.unlockedSounds.includes(packId)) return false
    this.data.activeSound = packId
    this.persist()
    return true
  }

  updateSettings(partial: Partial<GameSettings>): GameSettings {
    this.data.settings = { ...this.data.settings, ...partial }
    this.persist()
    return this.data.settings
  }

  recordRun(
    score: number,
    maxCombo: number,
    accuracy: number,
    modeId: GameModeId,
    seed = 0,
  ): RecordRunResult {
    const prevBest = this.data.bestScore
    this.data.totalRuns += 1
    this.updateStreak()

    if (score > this.data.bestScore) this.data.bestScore = score
    if (maxCombo > this.data.bestCombo) this.data.bestCombo = maxCombo

    const prev = this.data.modeBests[modeId] ?? emptyModeBest()
    const next: ModeBest = {
      bestScore: Math.max(prev.bestScore, score),
      bestCombo: Math.max(prev.bestCombo, maxCombo),
      bestAccuracy: Math.max(prev.bestAccuracy, accuracy),
    }
    this.data.modeBests[modeId] = next

    if (modeId === 'daily') {
      const today = utcDateKey()
      const daily = this.data.daily?.date === today
        ? this.data.daily
        : {
            date: today,
            bestScore: 0,
            bestCombo: 0,
            bestAccuracy: 0,
            attempts: 0,
          }
      daily.attempts += 1
      daily.bestScore = Math.max(daily.bestScore, score)
      daily.bestCombo = Math.max(daily.bestCombo, maxCombo)
      daily.bestAccuracy = Math.max(daily.bestAccuracy, accuracy)
      this.data.daily = daily
    }

    if (score > 0) {
      this.pushLeaderboard({
        score,
        maxCombo,
        modeId,
        date: utcDateKey(),
        seed,
      })
    }

    this.persist()
    return {
      bestScore: next.bestScore,
      bestCombo: next.bestCombo,
      isNewBest: score > prevBest,
      streak: this.data.streak,
    }
  }

  private updateStreak(): void {
    const today = utcDateKey()
    const last = this.data.lastPlayDate
    if (!last) {
      this.data.streak = 1
    } else if (last === today) {
      // same day — keep streak
    } else if (daysBetweenUtc(last, today) === 1) {
      this.data.streak += 1
    } else {
      this.data.streak = 1
    }
    this.data.lastPlayDate = today
    this.data.bestStreak = Math.max(this.data.bestStreak, this.data.streak)
  }

  private pushLeaderboard(entry: LeaderboardEntry): void {
    const list = [...this.data.leaderboard, entry]
    list.sort((a, b) => b.score - a.score || b.maxCombo - a.maxCombo)
    this.data.leaderboard = list.slice(0, LEADERBOARD_MAX)
  }

  private load(storage: Storage | null): SaveData {
    this.storage = storage
    try {
      if (!storage) return defaultSave()
      const raw = storage.getItem(STORAGE_KEY) ?? storage.getItem('one-more-save-v1')
      if (!raw) return defaultSave()
      const parsed = JSON.parse(raw) as Partial<SaveData>
      const base = defaultSave()
      // Always unlock every theme/sound pack so Settings UI is fully selectable
      const unlocked = Object.keys(themes)
      let active = parsed.activeTheme ?? defaultThemeId
      if (!unlocked.includes(active)) active = defaultThemeId
      const unlockedSounds = Object.keys(soundPacks)
      let activeSound = parsed.activeSound ?? defaultSoundPackId
      if (!unlockedSounds.includes(activeSound)) activeSound = defaultSoundPackId
      return {
        ...base,
        ...parsed,
        modeBests: { ...parsed.modeBests },
        achievements: Array.isArray(parsed.achievements) ? [...parsed.achievements] : [],
        unlockedThemes: unlocked,
        activeTheme: active,
        unlockedSounds,
        activeSound,
        leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
        streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
        bestStreak: typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0,
        lastPlayDate: parsed.lastPlayDate ?? null,
        settings: { ...base.settings, ...parsed.settings },
      }
    } catch {
      return defaultSave()
    }
  }

  private persist(): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.data))
    } catch {
      // ignore
    }
  }
}
