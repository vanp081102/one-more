/** Combo milestone labels — sparse, visual-first. */
export interface ComboMilestone {
  at: number
  label: string
}

export const comboMilestones: readonly ComboMilestone[] = [
  { at: 10, label: 'NICE' },
  { at: 25, label: 'GREAT' },
  { at: 50, label: 'INSANE' },
  { at: 100, label: 'PERFECT RUN' },
]

export function milestoneForCombo(combo: number): ComboMilestone | null {
  let found: ComboMilestone | null = null
  for (const m of comboMilestones) {
    if (combo === m.at) found = m
  }
  return found
}
