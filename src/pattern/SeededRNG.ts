/** Deterministic mulberry32 PRNG — same seed ⇒ same sequence. */
export class SeededRNG {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /** Next float in [0, 1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  nextInt(min: number, maxExclusive: number): number {
    return min + Math.floor(this.next() * (maxExclusive - min))
  }

  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('SeededRNG.pick: empty')
    return items[this.nextInt(0, items.length)]!
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  getState(): number {
    return this.state >>> 0
  }
}

/** Stable hash of string → seed. */
export function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
