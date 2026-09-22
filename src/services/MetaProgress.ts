import { achievements } from '../data/AchievementConfig'
import type { GameModeId } from '../data/GameModeConfig'
import type { SaveService } from './SaveService'
import type { EventBus } from '../core/EventBus'
import { GameEvents } from '../core/EventBus'

export interface RunStatsForMeta {
  score: number
  maxCombo: number
  perfects: number
  ultras: number
  modeId: GameModeId
  endReason: string
}

/**
 * Evaluates cosmetic achievements / theme unlocks after a run.
 * No gameplay power — unlocks themes only.
 */
export class MetaProgress {
  private readonly save: SaveService
  private readonly bus: EventBus

  constructor(save: SaveService, bus: EventBus) {
    this.save = save
    this.bus = bus
  }

  evaluate(stats: RunStatsForMeta): string[] {
    const earned: string[] = []
    const data = this.save.get()

    const checks: Array<{ id: string; ok: boolean }> = [
      { id: 'first_run', ok: data.totalRuns >= 1 },
      { id: 'first_perfect', ok: stats.perfects + stats.ultras >= 1 },
      { id: 'combo_25', ok: stats.maxCombo >= 25 || data.bestCombo >= 25 },
      { id: 'combo_100', ok: stats.maxCombo >= 100 || data.bestCombo >= 100 },
      { id: 'score_5000', ok: stats.score >= 5000 || data.bestScore >= 5000 },
      {
        id: 'daily_clear',
        ok: data.levelProgress.cleared.length >= 10 || data.levelProgress.unlocked >= 15,
      },
      {
        id: 'zen_complete',
        ok: data.levelProgress.unlocked >= 30 || data.levelProgress.cleared.includes(25),
      },
    ]

    for (const check of checks) {
      if (check.ok && !this.save.hasAchievement(check.id)) {
        earned.push(check.id)
      }
    }

    const newly = this.save.unlockAchievements(earned)
    for (const id of newly) {
      const def = achievements.find((a) => a.id === id)
      if (def?.unlocksTheme) {
        this.save.unlockTheme(def.unlocksTheme)
      }
      if (def?.unlocksSound) {
        this.save.unlockSound(def.unlocksSound)
      }
    }

    if (newly.length > 0) {
      this.bus.emit(GameEvents.AchievementsUnlocked, { ids: newly })
    }

    return newly
  }
}
