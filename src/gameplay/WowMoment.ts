/**
 * Tracks the 99 → 100 "ONE MORE" wow beat.
 * At 99: next beat is audio-only.
 * At 100: freeze / silence / massive PERFECT.
 */
export const WowState = {
  Idle: 'idle',
  Armed: 'armed',
  Active: 'active',
  Celebrating: 'celebrating',
} as const

export type WowState = (typeof WowState)[keyof typeof WowState]

export class WowMomentController {
  private state: WowState = WowState.Idle
  private celebrateTimer = 0

  reset(): void {
    this.state = WowState.Idle
    this.celebrateTimer = 0
  }

  getState(): WowState {
    return this.state
  }

  isArmed(): boolean {
    return this.state === WowState.Armed
  }

  isActive(): boolean {
    return this.state === WowState.Active
  }

  isCelebrating(): boolean {
    return this.state === WowState.Celebrating
  }

  /** Call after a hit that reaches combo 99. */
  arm(): void {
    this.state = WowState.Armed
  }

  /** Call when the special beat begins. */
  activate(): void {
    if (this.state === WowState.Armed) this.state = WowState.Active
  }

  /** Call after successful hit to combo 100. */
  celebrate(durationSec = 1.4): void {
    this.state = WowState.Celebrating
    this.celebrateTimer = durationSec
  }

  update(dt: number): boolean {
    if (this.state !== WowState.Celebrating) return false
    this.celebrateTimer -= dt
    if (this.celebrateTimer <= 0) {
      this.state = WowState.Idle
      return true // celebration finished
    }
    return false
  }

  /** Miss / fail clears wow. */
  cancel(): void {
    this.state = WowState.Idle
    this.celebrateTimer = 0
  }
}
