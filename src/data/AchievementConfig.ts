export interface AchievementDef {
  id: string
  label: string
  /** Theme unlocked when earned (cosmetic) */
  unlocksTheme?: string
  /** Sound pack unlocked when earned (cosmetic) */
  unlocksSound?: string
}

export const achievements: readonly AchievementDef[] = [
  { id: 'first_run', label: 'FIRST RUN' },
  { id: 'first_perfect', label: 'FIRST PERFECT', unlocksTheme: 'ember' },
  { id: 'combo_25', label: 'COMBO 25', unlocksTheme: 'ice', unlocksSound: 'soft' },
  { id: 'combo_100', label: 'ONE HUNDRED', unlocksTheme: 'void', unlocksSound: 'crystal' },
  { id: 'score_5000', label: '5K SCORE', unlocksTheme: 'signal', unlocksSound: 'punch' },
  { id: 'daily_clear', label: 'DAILY' },
  { id: 'zen_complete', label: 'ZEN CLEAR' },
]

export type AchievementId = (typeof achievements)[number]['id']
