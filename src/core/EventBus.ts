type Handler<T> = (payload: T) => void

export class EventBus {
  private listeners = new Map<string, Set<Handler<unknown>>>()

  on<T>(event: string, handler: Handler<T>): () => void {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    set.add(handler as Handler<unknown>)
    return () => set!.delete(handler as Handler<unknown>)
  }

  emit<T>(event: string, payload: T): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const handler of set) {
      ;(handler as Handler<T>)(payload)
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}

export const GameEvents = {
  Judged: 'judged',
  RunEnded: 'run_ended',
  RunStarted: 'run_started',
  HudUpdated: 'hud_updated',
  Feedback: 'feedback',
  HoldStarted: 'hold_started',
  HoldCancelled: 'hold_cancelled',
  PhaseChanged: 'phase_changed',
  ComboMilestone: 'combo_milestone',
  WowArmed: 'wow_armed',
  WowBeat: 'wow_beat',
  WowComplete: 'wow_complete',
  AchievementsUnlocked: 'achievements_unlocked',
  LevelUp: 'level_up',
} as const
