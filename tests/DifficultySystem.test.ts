import { describe, expect, it } from 'vitest'
import { DifficultySystem } from '../src/gameplay/DifficultySystem'
import {
  defaultDifficultyConfig,
  DifficultyPhaseId,
} from '../src/data/DifficultyConfig'

function advanceTo(d: DifficultySystem, successes: number): void {
  while (d.getSuccesses() < successes) d.onSuccess()
}

describe('DifficultySystem phases', () => {
  it('unlocks Chaos then Master', () => {
    const d = new DifficultySystem(defaultDifficultyConfig)
    advanceTo(d, 110)
    expect(d.getPhaseId()).toBe(DifficultyPhaseId.Chaos)
    expect(d.isChaosMix()).toBe(true)
    expect(d.allowsFakeTargets()).toBe(true)
    expect(d.allowsMemory()).toBe(true)

    advanceTo(d, 135)
    expect(d.getPhaseId()).toBe(DifficultyPhaseId.Master)
    expect(d.isMasterPressure()).toBe(true)
    expect(d.getMemoryTelegraphSec()).toBe(
      defaultDifficultyConfig.masterMemoryTelegraphSec,
    )
  })

  it('Master raises speed ceiling', () => {
    const d = new DifficultySystem(defaultDifficultyConfig)
    advanceTo(d, 135)
    // Push many successes under master
    for (let i = 0; i < 40; i++) d.onSuccess()
    expect(d.getSpeed()).toBeGreaterThan(defaultDifficultyConfig.maxSpeed)
    expect(d.getSpeed()).toBeLessThanOrEqual(defaultDifficultyConfig.masterMaxSpeed)
    expect(d.getTargetWidth()).toBeGreaterThanOrEqual(
      defaultDifficultyConfig.masterMinTargetWidth,
    )
  })

  it('reset clears endgame flags', () => {
    const d = new DifficultySystem(defaultDifficultyConfig)
    advanceTo(d, 140)
    d.reset()
    expect(d.getPhaseId()).toBe(DifficultyPhaseId.Discovery)
    expect(d.isChaosMix()).toBe(false)
    expect(d.isMasterPressure()).toBe(false)
  })
})
