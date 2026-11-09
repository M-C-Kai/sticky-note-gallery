import type { Note } from '@/domain/note'

const TOLERANCE = 8

/**
 * Assigns stable sort indices from visual position (y first, then x).
 * Used after a manual drag so that reflow keeps a consistent reading order.
 */
export function reorderByPosition(notes: Array<Pick<Note, 'id' | 'anchorX' | 'anchorY' | 'sortIndex'>>): Map<string, number> {
  const sorted = [...notes].sort((a, b) => {
    const dy = a.anchorY - b.anchorY
    if (Math.abs(dy) > TOLERANCE) return dy
    return a.anchorX - b.anchorX
  })
  const result = new Map<string, number>()
  sorted.forEach((note, i) => result.set(note.id, i))
  return result
}
