import { describe, expect, it } from 'vitest'
import { computeReflowTargets, findFreeAnchor, type LayoutOptions } from './AnchorLayout'

const opts: LayoutOptions = {
  logicalWidth: 1000,
  logicalHeight: 720,
  noteWidth: 200,
  noteHeight: 170,
  gap: 26,
  padding: 40,
}

describe('findFreeAnchor', () => {
  it('places the first note at the first free cell', () => {
    const anchor = findFreeAnchor([], opts)
    expect(anchor).toEqual({ x: 140, y: 125 })
  })

  it('finds the next free cell after the first is occupied', () => {
    const anchor = findFreeAnchor([{ x: 140, y: 125 }], opts)
    expect(anchor.x).toBeGreaterThan(140)
    expect(anchor.y).toBe(125)
  })

  it('does not collide with any existing anchor', () => {
    const existing = [
      { x: 140, y: 125 },
      { x: 366, y: 125 },
      { x: 592, y: 125 },
      { x: 818, y: 125 },
    ]
    const anchor = findFreeAnchor(existing, opts)
    const halfW = opts.noteWidth / 2
    const halfH = opts.noteHeight / 2
    for (const e of existing) {
      const overlaps =
        anchor.x - halfW < e.x + halfW &&
        anchor.x + halfW > e.x - halfW &&
        anchor.y - halfH < e.y + halfH &&
        anchor.y + halfH > e.y - halfH
      expect(overlaps).toBe(false)
    }
  })

  it('always returns a point inside the logical space', () => {
    const anchor = findFreeAnchor([], { ...opts, logicalWidth: 100, logicalHeight: 100 })
    expect(anchor.x).toBeGreaterThanOrEqual(0)
    expect(anchor.y).toBeGreaterThanOrEqual(0)
  })
})

describe('computeReflowTargets', () => {
  it('packs nodes row-major in sortIndex order', () => {
    const targets = computeReflowTargets(
      [
        { id: 'a', sortIndex: 1 },
        { id: 'b', sortIndex: 0 },
      ],
      opts,
    )
    const a = targets.find((t) => t.id === 'a')!
    const b = targets.find((t) => t.id === 'b')!
    expect(a.to).toEqual({ x: 366, y: 125 })
    expect(b.to).toEqual({ x: 140, y: 125 })
  })

  it('keeps every input node in the output', () => {
    const nodes = [
      { id: 'a', sortIndex: 0 },
      { id: 'b', sortIndex: 1 },
      { id: 'c', sortIndex: 2 },
    ]
    const targets = computeReflowTargets(nodes, opts)
    expect(targets).toHaveLength(3)
    expect(new Set(targets.map((t) => t.id))).toEqual(new Set(['a', 'b', 'c']))
  })
})
