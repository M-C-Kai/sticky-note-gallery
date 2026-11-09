import type { Vector2 } from '../scene/NoteNode'

export interface LayoutOptions {
  logicalWidth: number
  logicalHeight: number
  noteWidth: number
  noteHeight: number
  gap: number
  padding: number
}

function rectAt(col: number, row: number, opts: LayoutOptions): Rect {
  return {
    x: opts.padding + col * (opts.noteWidth + opts.gap),
    y: opts.padding + row * (opts.noteHeight + opts.gap),
    width: opts.noteWidth,
    height: opts.noteHeight,
  }
}

function columnCount(opts: LayoutOptions): number {
  const step = opts.noteWidth + opts.gap
  return Math.max(1, Math.floor((opts.logicalWidth - opts.padding * 2 + opts.gap) / step))
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Finds the first free grid cell that does not overlap any existing anchor.
 * Scan order favors the top-left area, so new notes fill space predictably.
 */
export function findFreeAnchor(existing: Vector2[], opts: LayoutOptions): Vector2 {
  const cols = columnCount(opts)
  const maxRow = Math.ceil(opts.logicalHeight / (opts.noteHeight + opts.gap)) + 1
  const existingRects = existing.map((a) => ({
    x: a.x - opts.noteWidth / 2,
    y: a.y - opts.noteHeight / 2,
    width: opts.noteWidth,
    height: opts.noteHeight,
  }))

  for (let row = 0; row <= maxRow; row++) {
    for (let col = 0; col < cols; col++) {
      const rect = rectAt(col, row, opts)
      if (!existingRects.some((r) => overlaps(r, rect))) {
        return { x: rect.x + opts.noteWidth / 2, y: rect.y + opts.noteHeight / 2 }
      }
    }
  }
  // Fallback: stack near the top-left with slight overlap is unlikely; place at bottom.
  const lastRow = maxRow
  return { x: opts.padding + opts.noteWidth / 2, y: opts.padding + lastRow * (opts.noteHeight + opts.gap) + opts.noteHeight / 2 }
}

export interface ReflowTarget {
  id: string
  to: Vector2
}

/**
 * Packs the given nodes into a stable grid ordered by sortIndex.
 * Returns the target anchor for each node.
 */
export function computeReflowTargets(
  nodes: Array<{ id: string; sortIndex: number }>,
  opts: LayoutOptions,
): ReflowTarget[] {
  const cols = columnCount(opts)
  const sorted = [...nodes].sort((a, b) => a.sortIndex - b.sortIndex)
  return sorted.map((node, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const rect = rectAt(col, row, opts)
    return { id: node.id, to: { x: rect.x + opts.noteWidth / 2, y: rect.y + opts.noteHeight / 2 } }
  })
}
