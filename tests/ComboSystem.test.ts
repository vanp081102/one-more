import { describe, expect, it } from 'vitest'
import { ComboSystem } from '../src/gameplay/ComboSystem'

describe('ComboSystem', () => {
  it('increments and tracks max', () => {
    const c = new ComboSystem()
    expect(c.hit()).toBe(1)
    expect(c.hit()).toBe(2)
    expect(c.getMaxCombo()).toBe(2)
  })

  it('miss resets combo but keeps max', () => {
    const c = new ComboSystem()
    c.hit()
    c.hit()
    c.hit()
    c.miss()
    expect(c.getCombo()).toBe(0)
    expect(c.getMaxCombo()).toBe(3)
  })

  it('reset clears everything', () => {
    const c = new ComboSystem()
    c.hit()
    c.hit()
    c.reset()
    expect(c.getCombo()).toBe(0)
    expect(c.getMaxCombo()).toBe(0)
  })

  it('rebuilds max after miss', () => {
    const c = new ComboSystem()
    c.hit()
    c.hit()
    c.miss()
    c.hit()
    c.hit()
    c.hit()
    expect(c.getMaxCombo()).toBe(3)
  })
})
