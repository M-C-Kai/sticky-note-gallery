import { describe, expect, it } from 'vitest'
import { driftOffsetAt, driftParamsFromSeed } from './DriftMotion'

describe('DriftMotion', () => {
  it('is deterministic for the same seed', () => {
    const a = driftParamsFromSeed(123)
    const b = driftParamsFromSeed(123)
    expect(a).toEqual(b)
  })

  it('produces bounded offsets for off strength', () => {
    const params = driftParamsFromSeed(42, 'off')
    for (let t = 0; t < 100; t += 3.7) {
      const offset = driftOffsetAt(params, t)
      expect(offset.x).toBeCloseTo(0, 5)
      expect(offset.y).toBeCloseTo(0, 5)
      expect(offset.rotation).toBeCloseTo(0, 5)
    }
  })

  it('bounded by amplitude for normal strength', () => {
    const params = driftParamsFromSeed(99, 'normal')
    for (let t = 0; t < 100; t += 1.3) {
      const offset = driftOffsetAt(params, t)
      expect(Math.abs(offset.x)).toBeLessThanOrEqual(Math.abs(params.ampX) + 1e-6)
      expect(Math.abs(offset.y)).toBeLessThanOrEqual(Math.abs(params.ampY) + 1e-6)
      expect(Math.abs(offset.rotation)).toBeLessThanOrEqual(Math.abs(params.ampRot) + 1e-6)
    }
  })

  it('returns to baseline x after a full period', () => {
    const params = driftParamsFromSeed(7, 'normal')
    const atStart = driftOffsetAt(params, 0)
    const atPeriod = driftOffsetAt(params, params.period)
    expect(atStart.x).toBeCloseTo(atPeriod.x, 6)
  })
})
