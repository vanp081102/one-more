import { Grade } from '../core/types'
import { soundPacks, defaultSoundPackId, type SoundPackDef } from '../data/SoundPackConfig'

/** Procedural Web Audio — combo layers fill in; miss cuts them. */
export class AudioManager {
  private ctx: AudioContext | null = null
  private volume = 0.35
  private master: GainNode | null = null
  private layerGains: GainNode[] = []
  private layerOscs: OscillatorNode[] = []
  private movementOsc: OscillatorNode | null = null
  private movementGain: GainNode | null = null
  private comboLevel = 0
  private bedPlaying = false
  private muted = false
  private pack: SoundPackDef = soundPacks[defaultSoundPackId]!
  private resumePromise: Promise<void> | null = null

  /**
   * Create context on first gesture; always re-resume if suspended.
   * Must run in the user-gesture stack (capture-phase listeners).
   */
  unlock(): void {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return

    if (!this.ctx) {
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : this.volume
      this.master.connect(this.ctx.destination)
      this.setupBed()
      this.primeSilentBuffer()
    }

    void this.resume()
  }

  /** Resume AudioContext after autoplay policy / tab focus. */
  async resume(): Promise<void> {
    if (!this.ctx) return
    if (this.ctx.state === 'running') {
      if (this.master && !this.muted) this.master.gain.value = this.volume
      return
    }
    if (this.resumePromise) {
      await this.resumePromise
      return
    }
    this.resumePromise = (async () => {
      try {
        await this.ctx!.resume()
      } catch {
        // browser may still block until next gesture
      } finally {
        this.resumePromise = null
      }
    })()
    await this.resumePromise
    if (this.master && !this.muted) {
      this.master.gain.value = this.volume
    }
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.master && !this.muted) this.master.gain.value = this.volume
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master) this.master.gain.value = muted ? 0 : this.volume
  }

  isMuted(): boolean {
    return this.muted
  }

  setSoundPack(packId: string): void {
    this.pack = soundPacks[packId] ?? soundPacks[defaultSoundPackId]!
  }

  getSoundPackId(): string {
    return this.pack.id
  }

  /** Suspend audio when tab is hidden; resume when visible. */
  setSuspended(suspended: boolean): void {
    if (!this.ctx) return
    if (suspended) void this.ctx.suspend()
    else void this.resume()
  }

  dispose(): void {
    this.stopMovement()
    this.stopBed()
    for (const osc of this.layerOscs) {
      try {
        osc.stop()
      } catch {
        // ignore
      }
    }
    this.layerOscs = []
    this.layerGains = []
    if (this.ctx) {
      void this.ctx.close()
      this.ctx = null
    }
    this.master = null
    this.bedPlaying = false
    this.resumePromise = null
  }

  /** Start ambient bed (call on run start). */
  startBed(): void {
    this.runWhenReady(() => {
      if (this.bedPlaying) return
      this.bedPlaying = true
      this.setComboLevel(0)
      this.fadeLayers(true)
    })
  }

  stopBed(): void {
    this.setComboLevel(0)
    this.stopMovement()
    this.fadeLayers(false)
    this.bedPlaying = false
  }

  /** Combo fills soundtrack layers (0–5). */
  setComboLevel(combo: number): void {
    this.comboLevel = combo
    this.runWhenReady(() => {
      if (!this.ctx) return
      const active = Math.min(5, Math.floor(combo / 10) + (combo > 0 ? 1 : 0))
      const now = this.ctx.currentTime
      for (let i = 0; i < this.layerGains.length; i++) {
        const g = this.layerGains[i]
        if (!g) continue
        const target = i < active ? (0.045 - i * 0.004) * this.pack.bedMul : 0.0001
        g.gain.cancelScheduledValues(now)
        g.gain.linearRampToValueAtTime(target, now + 0.12)
      }
    })
  }

  playHold(): void {
    this.runWhenReady(() => {
      this.tone(180, 0.04, 'sine', 0.08)
      this.startMovement()
    })
  }

  stopMovement(): void {
    if (!this.ctx || !this.movementGain || !this.movementOsc) return
    const now = this.ctx.currentTime
    this.movementGain.gain.cancelScheduledValues(now)
    this.movementGain.gain.linearRampToValueAtTime(0.0001, now + 0.05)
    try {
      this.movementOsc.stop(now + 0.06)
    } catch {
      // already stopped
    }
    this.movementOsc = null
    this.movementGain = null
  }

  playRelease(grade: Grade): void {
    this.runWhenReady(() => {
      this.stopMovement()
      const p = this.pack.pitchMul
      const wave = this.pack.wave
      switch (grade) {
        case Grade.Ultra:
          this.chord([880 * p, 1320 * p, 1760 * p], 0.2)
          this.tone(2200 * p, 0.08, wave, 0.06)
          break
        case Grade.Perfect:
          this.chord([660 * p, 990 * p], 0.15)
          break
        case Grade.Great:
          this.tone(520 * p, 0.1, wave === 'square' ? 'triangle' : wave, 0.12)
          break
        case Grade.Good:
          this.tone(360 * p, 0.08, 'triangle', 0.1)
          break
        default:
          break
      }
    })
  }

  playMiss(): void {
    this.runWhenReady(() => {
      this.stopMovement()
      this.cutBed()
      this.tone(120, 0.22, 'sawtooth', 0.16)
    })
  }

  playGameOver(): void {
    this.runWhenReady(() => {
      this.tone(90, 0.3, 'sine', 0.12)
    })
  }

  playCombo(): void {
    this.runWhenReady(() => {
      this.tone(740, 0.07, 'square', 0.07)
      this.tone(1110, 0.05, 'sine', 0.05)
    })
  }

  playPhaseChange(): void {
    this.runWhenReady(() => {
      this.chord([392, 523, 784], 0.22)
    })
  }

  playChaosEnter(): void {
    this.runWhenReady(() => {
      this.chord([220, 277, 330, 440], 0.3)
      this.tone(110, 0.35, 'sawtooth', 0.08)
    })
  }

  playMasterEnter(): void {
    this.runWhenReady(() => {
      this.chord([523, 659, 784, 1046], 0.4)
      this.tone(1568, 0.15, 'sine', 0.05)
    })
  }

  playMilestone(): void {
    this.runWhenReady(() => {
      this.chord([523, 659, 784, 1046], 0.28)
    })
  }

  /** Soft ticks leading to ideal release on wow beat. */
  scheduleIdealCue(travelSec: number): void {
    this.runWhenReady(() => {
      if (!this.ctx) return
      const now = this.ctx.currentTime
      const ideal = Math.max(0.12, travelSec)
      for (const t of [ideal - 0.24, ideal - 0.12]) {
        if (t > 0.02) this.toneAt(660, 0.04, 'square', 0.05, now + t)
      }
      this.toneAt(990, 0.08, 'sine', 0.12, now + ideal)
      this.toneAt(1320, 0.06, 'sine', 0.08, now + ideal)
    })
  }

  hardSilence(seconds: number): void {
    this.runWhenReady(() => {
      if (!this.ctx || !this.master) return
      this.stopMovement()
      const now = this.ctx.currentTime
      const restore = this.muted ? 0 : this.volume
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now)
      this.master.gain.linearRampToValueAtTime(0.0001, now + 0.05)
      this.master.gain.setValueAtTime(0.0001, now + seconds)
      this.master.gain.linearRampToValueAtTime(Math.max(0.0001, restore), now + seconds + 0.15)
    })
  }

  playWowComplete(): void {
    this.runWhenReady(() => {
      if (!this.ctx || !this.master) return
      this.stopMovement()
      const now = this.ctx.currentTime
      const restore = this.muted ? 0 : this.volume
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now)
      this.master.gain.linearRampToValueAtTime(0.0001, now + 0.05)
      this.master.gain.setValueAtTime(0.0001, now + 0.55)
      this.master.gain.linearRampToValueAtTime(Math.max(0.0001, restore), now + 0.7)
      const t = now + 0.58
      for (const f of [523, 659, 784, 1046, 1568]) {
        this.toneAt(f, 0.45, 'sine', 0.1, t)
      }
    })
  }

  playWowArmed(): void {
    this.runWhenReady(() => {
      this.tone(180, 0.2, 'sine', 0.1)
      this.tone(360, 0.15, 'triangle', 0.08)
    })
  }

  playNewRecord(): void {
    this.runWhenReady(() => {
      this.chord([523, 784, 1046], 0.35)
      this.tone(1568, 0.12, 'sine', 0.06)
    })
  }

  /**
   * Run audio work only after the context is running.
   * Sounds scheduled while suspended are dropped by browsers.
   */
  private runWhenReady(fn: () => void): void {
    this.unlock()
    if (!this.ctx || !this.master || this.muted) return
    if (this.ctx.state === 'running') {
      fn()
      return
    }
    void this.resume().then(() => {
      if (this.ctx?.state === 'running' && this.master && !this.muted) fn()
    })
  }

  /** iOS often needs a silent buffer kick to fully unlock. */
  private primeSilentBuffer(): void {
    if (!this.ctx || !this.master) return
    try {
      const buf = this.ctx.createBuffer(1, 1, this.ctx.sampleRate)
      const src = this.ctx.createBufferSource()
      src.buffer = buf
      const g = this.ctx.createGain()
      g.gain.value = 0.0001
      src.connect(g)
      g.connect(this.master)
      src.start(0)
    } catch {
      // ignore
    }
  }

  private toneAt(
    freq: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    when: number,
  ): void {
    if (!this.ctx || !this.master) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, when)
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainValue), when + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(when)
    osc.stop(when + duration + 0.02)
  }

  private cutBed(): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    for (const g of this.layerGains) {
      g.gain.cancelScheduledValues(now)
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), now)
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08)
    }
    this.bedPlaying = false
  }

  private setupBed(): void {
    if (!this.ctx || !this.master) return
    if (this.layerOscs.length > 0) return
    const freqs = [110, 165, 220, 330, 440]
    for (const freq of freqs) {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.value = 0.0001
      osc.connect(gain)
      gain.connect(this.master)
      osc.start()
      this.layerOscs.push(osc)
      this.layerGains.push(gain)
    }
  }

  private fadeLayers(on: boolean): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    if (!on) {
      for (const g of this.layerGains) {
        g.gain.cancelScheduledValues(now)
        g.gain.linearRampToValueAtTime(0.0001, now + 0.2)
      }
      return
    }
    // Apply current combo level without re-entering runWhenReady recursion
    const active = Math.min(5, Math.floor(this.comboLevel / 10) + (this.comboLevel > 0 ? 1 : 0))
    for (let i = 0; i < this.layerGains.length; i++) {
      const g = this.layerGains[i]
      if (!g) continue
      const target = i < active ? (0.045 - i * 0.004) * this.pack.bedMul : 0.0001
      g.gain.cancelScheduledValues(now)
      g.gain.linearRampToValueAtTime(target, now + 0.12)
    }
  }

  private startMovement(): void {
    if (!this.ctx || !this.master) return
    this.stopMovement()
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = 90
    gain.gain.value = 0.0001
    osc.connect(gain)
    gain.connect(this.master)
    const now = this.ctx.currentTime
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.05)
    osc.frequency.linearRampToValueAtTime(140, now + 0.8)
    osc.start(now)
    this.movementOsc = osc
    this.movementGain = gain
  }

  private chord(freqs: number[], duration: number): void {
    for (const f of freqs) this.tone(f, duration, 'sine', 0.07)
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
  ): void {
    if (!this.ctx || !this.master) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainValue), now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(now)
    osc.stop(now + duration + 0.02)
  }
}
