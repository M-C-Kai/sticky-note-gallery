import { describe, expect, it } from 'vitest'
import { TEAR_COMMIT_THRESHOLD, tearDropOffset, tearPeelRotation, updateTearProgress } from './TearMotion'

describe('TearMotion', () => {
  it('animates progress toward target', () => {
    expect(updateTearProgress(0, 1, 0.1)).toBeGreaterThan(0)
    expect(updateTearProgress(0, 1, 0.1)).toBeLessThanOrEqual(1)
    expect(updateTearProgress(0.8, 1, 1)).toBe(1)
  })

  it('stays at target once reached', () => {
    expect(updateTearProgress(1, 1, 0.5)).toBe(1)
    expect(updateTearProgress(0, 0, 0.5)).toBe(0)
  })

  it('never overshoots', () => {
    for (let i = 0; i < 100; i++) {
      const value = updateTearProgress(0, 1, i / 10)
      expect(value).toBeLessThanOrEqual(1)
    }
  })

  it('commit threshold is strictly between 0 and 1', () => {
    expect(TEAR_COMMIT_THRESHOLD).toBeGreaterThan(0)
    expect(TEAR_COMMIT_THRESHOLD).toBeLessThan(1)
  })

  it('peel rotation and drop increase monotonically with progress', () => {
    expect(Math.abs(tearPeelRotation(0.9))).toBeGreaterThan(Math.abs(tearPeelRotation(0.1)))
    expect(tearDropOffset(0.9)).toBeGreaterThan(tearDropOffset(0.1))
  })
})
