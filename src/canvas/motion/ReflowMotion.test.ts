import { describe, expect, it } from 'vitest'
import { easeOutCubic, reflowPositionAt, type ReflowAnimation } from './ReflowMotion'

describe('ReflowMotion', () => {
  it('starts at the origin and finishes at the target', () => {
    const anim: ReflowAnimation = { from: { x: 0, y: 0 }, to: { x: 300, y: 200 }, start: 0, duration: 1000 }
    expect(reflowPositionAt(anim, 0)).toEqual({ x: 0, y: 0 })
    expect(reflowPositionAt(anim, 1000)).toEqual({ x: 300, y: 200 })
  })

  it('is monotonic along the straight path', () => {
    const anim: ReflowAnimation = { from: { x: 0, y: 0 }, to: { x: 300, y: 0 }, start: 0, duration: 1000 }
    let prev = 0
    for (let t = 0; t <= 1000; t += 50) {
      const pos = reflowPositionAt(anim, t)!
      expect(pos.x).toBeGreaterThanOrEqual(prev)
      expect(pos.y).toBe(0)
      prev = pos.x
    }
  })

  it('returns null after completion when queried at exact end', () => {
    const anim: ReflowAnimation = { from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, start: 0, duration: 100 }
    expect(reflowPositionAt(anim, 200)).toEqual({ x: 10, y: 10 })
  })

  it('eases out (slower at the end)', () => {
    const mid = easeOutCubic(0.5)
    expect(mid).toBeGreaterThan(0.5)
  })
})
