import type { GameModeId } from '../data/GameModeConfig'
import { utcDateKey } from '../data/GameModeConfig'
import { themes, defaultThemeId } from '../data/ThemeConfig'
import { soundPacks, defaultSoundPackId } from '../data/SoundPackConfig'
import { LEVEL_COUNT } from '../data/LevelConfig'

const STORAGE_KEY = 'one-more-save-v3'
const LEADERBOARD_MAX = 10

export interface ModeBest {
  bestScore: number
  bestCombo: number
  bestAccuracy: number
}

export interface LevelProgress {
  /** Highest level unlocked (1–500) */
  unlocked: number
  cleared: number[]
  /** Best score per level number */
  bests: Record<number, number>
}

/** @deprecated alias */
export type ModeLevelProgress = LevelProgress

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
  level?: number
}

export interface GameSettings {
  volume: number
  reducedMotion: boolean
  vibration: boolean
  visualTimingIndicators: boolean
  colorblindFriendly: boolean
  audioIndependent: boolean
  language: 'vi' | 'en'
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
  levelProgress: LevelProgress
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

const emptyLevelProgress = (): LevelProgress => ({
  unlocked: 1,
  cleared: [],
  bests: {},
})

const defaultSave = (): SaveData => ({
  bestScore: 0,
  bestCombo: 0,
  totalRuns: 0,
  streak: 0,
  bestStreak: 0,
  lastPlayDate: null,
  modeBests: {},
  levelProgress: emptyLevelProgress(),
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

function normalizeProgress(raw: Partial<LevelProgress> | undefined): LevelProgress {
  if (!raw) return emptyLevelProgress()
  return {
    unlocked: Math.max(1, Math.min(LEVEL_COUNT, raw.unlocked || 1)),
    cleared: Array.isArray(raw.cleared)
      ? [...new Set(raw.cleared.filter((n) => n >= 1 && n <= LEVEL_COUNT))].sort((a, b) => a - b)
      : [],
    bests: { ...(raw.bests ?? {}) },
  }
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

  getLevelProgress(): LevelProgress {
    return {
      unlocked: this.data.levelProgress.unlocked,
      cleared: [...this.data.levelProgress.cleared],
      bests: { ...this.data.levelProgress.bests },
    }
  }

  /** Compatibility for older cloud merge shape */
  getAllModeLevels(): Partial<Record<GameModeId, LevelProgress>> {
    return { classic: this.getLevelProgress() }
  }

  applyLevelProgress(progress: LevelProgress): void {
    this.data.levelProgress = normalizeProgress(progress)
    this.persist()
  }

  applyModeLevels(levels: Partial<Record<GameModeId, LevelProgress>>): void {
    const classic = levels.classic
    if (classic) this.applyLevelProgress(classic)
  }

  recordLevelRun(
    level: number,
    score: number,
    clearScore: number,
  ): { cleared: boolean; unlockedNext: boolean; unlocked: number } {
    const prog = this.getLevelProgress()
    const lv = Math.max(1, Math.min(LEVEL_COUNT, Math.floor(level)))
    prog.bests[lv] = Math.max(prog.bests[lv] ?? 0, score)
    let cleared = false
    let unlockedNext = false
    if (score >= clearScore && !prog.cleared.includes(lv)) {
      prog.cleared.push(lv)
      cleared = true
    }
    if (cleared && lv >= prog.unlocked && lv < LEVEL_COUNT) {
      prog.unlocked = lv + 1
      unlockedNext = true
    }
    const maxCleared = prog.cleared.reduce((a, b) => Math.max(a, b), 0)
    prog.unlocked = Math.max(prog.unlocked, Math.min(LEVEL_COUNT, maxCleared + 1), 1)
    this.data.levelProgress = prog
    this.persist()
    return { cleared, unlockedNext, unlocked: prog.unlocked }
  }

  getDaily(): DailyRecord | null {
    const today = utcDateKey()
    if (this.data.daily && this.data.daily.date === today) return this.data.daily
    return null
  }

  /** Sum of best scores across all levels — ranking metric. */
  getTotalScore(): number {
    let sum = 0
    for (const v of Object.values(this.data.levelProgress.bests)) {
      if (typeof v === 'number' && v > 0) sum += v
    }
    return sum
  }

  /** Level shown on leaderboards (highest unlocked). */
  getStandingLevel(): number {
    return this.data.levelProgress.unlocked
  }

  /**
   * Local board: levels ranked by best score (high → low), labeled Level X.
   * Falls back to legacy run list if no level bests yet.
   */
  getLeaderboard(): LeaderboardEntry[] {
    const bests = this.data.levelProgress.bests
    const fromLevels = Object.entries(bests)
      .map(([k, score]) => {
        const level = Number(k)
        return {
          score: score ?? 0,
          maxCombo: 0,
          modeId: 'classic' as GameModeId,
          date: '',
          seed: 0,
          level,
        }
      })
      .filter((e) => e.score > 0 && e.level >= 1)
      .sort((a, b) => b.score - a.score || (b.level ?? 0) - (a.level ?? 0))
      .slice(0, LEADERBOARD_MAX)

    if (fromLevels.length > 0) return fromLevels

    return [...this.data.leaderboard].sort(
      (a, b) => b.score - a.score || (b.level ?? 0) - (a.level ?? 0),
    )
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
    level = 1,
  ): RecordRunResult {
    const prevBest = this.data.bestScore
    this.data.totalRuns += 1
    this.updateStreak()

    if (score > this.data.bestScore) this.data.bestScore = score
    if (maxCombo > this.data.bestCombo) this.data.bestCombo = maxCombo

    const prev = this.data.modeBests[modeId] ?? emptyModeBest()
    this.data.modeBests[modeId] = {
      bestScore: Math.max(prev.bestScore, score),
      bestCombo: Math.max(prev.bestCombo, maxCombo),
      bestAccuracy: Math.max(prev.bestAccuracy, accuracy),
    }

    if (score > 0) {
      this.pushLeaderboard({
        score,
        maxCombo,
        modeId,
        date: utcDateKey(),
        seed,
        level,
      })
    }

    this.persist()
    return {
      bestScore: this.data.modeBests[modeId]!.bestScore,
      bestCombo: this.data.modeBests[modeId]!.bestCombo,
      isNewBest: score > prevBest,
      streak: this.data.streak,
    }
  }

  /** Standing used for global ranking (total points + level). */
  getStanding(): { totalScore: number; level: number; bestCombo: number } {
    return {
      totalScore: this.getTotalScore(),
      level: this.getStandingLevel(),
      bestCombo: this.data.bestCombo,
    }
  }

  private updateStreak(): void {
    const today = utcDateKey()
    const last = this.data.lastPlayDate
    if (!last) {
      this.data.streak = 1
    } else if (last === today) {
      // same day
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
      const raw =
        storage.getItem(STORAGE_KEY) ??
        storage.getItem('one-more-save-v2') ??
        storage.getItem('one-more-save-v1')
      if (!raw) return defaultSave()
      const parsed = JSON.parse(raw) as Partial<SaveData> & {
        modeLevels?: Partial<Record<string, LevelProgress>>
      }
      const base = defaultSave()
      const unlocked = Object.keys(themes)
      let active = parsed.activeTheme ?? defaultThemeId
      if (!unlocked.includes(active)) active = defaultThemeId
      const unlockedSounds = Object.keys(soundPacks)
      let activeSound = parsed.activeSound ?? defaultSoundPackId
      if (!unlockedSounds.includes(activeSound)) activeSound = defaultSoundPackId

      let levelProgress = normalizeProgress(parsed.levelProgress)
      if (
        (!parsed.levelProgress || parsed.levelProgress.unlocked <= 1) &&
        parsed.modeLevels?.classic
      ) {
        levelProgress = normalizeProgress(parsed.modeLevels.classic)
      }

      return {
        ...base,
        ...parsed,
        modeBests: { ...parsed.modeBests },
        levelProgress,
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
