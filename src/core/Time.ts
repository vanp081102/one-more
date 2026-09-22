export class Time {
  private lastMs = 0
  private _delta = 0
  private _elapsed = 0
  private paused = false
  private scale = 1
  private hitStopRemaining = 0

  get delta(): number {
    return this._delta
  }

  get elapsed(): number {
    return this._elapsed
  }

  get now(): number {
    return performance.now()
  }

  get timeScale(): number {
    return this.scale
  }

  start(nowMs: number = performance.now()): void {
    this.lastMs = nowMs
    this._delta = 0
    this._elapsed = 0
    this.paused = false
    this.scale = 1
    this.hitStopRemaining = 0
  }

  /** Brief slowdown for PERFECT/ULTRA — does not affect input clock. */
  hitStop(seconds: number, scale = 0.35): void {
    this.hitStopRemaining = Math.max(this.hitStopRemaining, seconds)
    this.scale = scale
  }

  tick(nowMs: number = performance.now()): number {
    if (this.paused) {
      this.lastMs = nowMs
      this._delta = 0
      return 0
    }
    const raw = (nowMs - this.lastMs) / 1000
    this.lastMs = nowMs

    if (this.hitStopRemaining > 0) {
      this.hitStopRemaining -= raw
      if (this.hitStopRemaining <= 0) {
        this.hitStopRemaining = 0
        this.scale = 1
      }
    }

    this._delta = Math.min(raw, 0.05) * this.scale
    this._elapsed += this._delta
    return this._delta
  }

  setPaused(value: boolean): void {
    this.paused = value
  }
}
