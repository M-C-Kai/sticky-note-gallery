import { describe, expect, it, vi } from 'vitest'
import { NoteNode, type Vector2 } from '../scene/NoteNode'
import type { Note } from '@/domain/note'
import { NoteGestureController, type SceneView } from './NoteGestureController'
import { TEAR_COMMIT_THRESHOLD } from '../motion/TearMotion'

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    text: 'hello',
    color: 'yellow',
    status: 'active',
    anchorX: 140,
    anchorY: 140,
    sortIndex: 0,
    motionSeed: 1,
    completedAt: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

function makeNode(overrides: Partial<Note> = {}): NoteNode {
  return new NoteNode(makeNote(overrides))
}

class FakeScene implements SceneView {
  noteWidth = 200
  noteHeight = 170
  tearHandleHeight = 26
  logicalWidth = 1000
  logicalHeight = 720

  nodes: NoteNode[]
  onSetAnchor: (note: NoteNode, anchor: Vector2) => void = () => undefined

  constructor(nodes: NoteNode[]) {
    this.nodes = nodes
  }

  hitTest(x: number, y: number): NoteNode | null {
    for (const node of this.nodes) {
      const r = this.rectOf(node)
      if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) return node
    }
    return null
  }

  isTearHandle(x: number, y: number, note: NoteNode): boolean {
    const r = this.rectOf(note)
    const cx = r.x + r.width / 2
    const tabHalf = r.width * 0.28
    const tabTop = r.y + r.height - this.tearHandleHeight
    return x >= cx - tabHalf && x <= cx + tabHalf && y >= tabTop && y <= r.y + r.height
  }

  setNoteAnchor(note: NoteNode, anchor: Vector2): void {
    note.anchor = anchor
    this.onSetAnchor(note, anchor)
  }

  private rectOf(node: NoteNode) {
    return { x: node.anchor.x - 100, y: node.anchor.y - 85, width: this.noteWidth, height: this.noteHeight }
  }
}

function centerOf(node: NoteNode) {
  return { x: node.anchor.x, y: node.anchor.y }
}

describe('NoteGestureController', () => {
  it('opens editor on a simple tap', () => {
    const node = makeNode()
    const scene = new FakeScene([node])
    const onTap = vi.fn()
    const controller = new NoteGestureController(scene, { onTap } as never)

    const center = centerOf(node)
    controller.onPointerDown({ x: center.x, y: center.y, id: 1 })
    controller.onPointerUp({ x: center.x, y: center.y, id: 1 })

    expect(onTap).toHaveBeenCalledTimes(1)
    expect(node.interactionState).toBe('idle')
  })

  it('does not fire tap after a move', () => {
    const node = makeNode()
    const scene = new FakeScene([node])
    const onTap = vi.fn()
    const onMoveEnded = vi.fn()
    const controller = new NoteGestureController(scene, {
      onTap,
      onMoveEnded,
    } as never)

    const center = centerOf(node)
    controller.onPointerDown({ x: center.x, y: center.y, id: 1 })
    controller.onPointerMove({ x: center.x + 30, y: center.y + 20, id: 1 })
    controller.onPointerUp({ x: center.x + 30, y: center.y + 20, id: 1 })

    expect(onTap).not.toHaveBeenCalled()
    expect(onMoveEnded).toHaveBeenCalledTimes(1)
    expect(node.anchor.x).toBeCloseTo(center.x + 30)
    expect(node.anchor.y).toBeCloseTo(center.y + 20)
  })

  it('clamps moved anchors to the logical space', () => {
    const node = makeNode({ anchorX: 50, anchorY: 50 })
    const scene = new FakeScene([node])
    const controller = new NoteGestureController(scene, { onMoveEnded: vi.fn() } as never)

    controller.onPointerDown({ x: 50, y: 50, id: 1 })
    controller.onPointerMove({ x: -5000, y: -5000, id: 1 })
    controller.onPointerUp({ x: -5000, y: -5000, id: 1 })

    expect(node.anchor.x).toBe(0)
    expect(node.anchor.y).toBe(0)
  })

  it('increases tear progress when dragging down on the tear handle', () => {
    const node = makeNode()
    const scene = new FakeScene([node])
    const onTearProgress = vi.fn()
    const controller = new NoteGestureController(scene, { onTearProgress } as never)

    const bottom = node.anchor.y + 85 - scene.tearHandleHeight / 2
    controller.onPointerDown({ x: node.anchor.x, y: bottom, id: 1 })
    controller.onPointerMove({ x: node.anchor.x, y: bottom + scene.noteHeight * 0.5, id: 1 })

    expect(node.tearProgress).toBeGreaterThan(0)
    expect(onTearProgress).toHaveBeenCalled()
  })

  it('commits tear when dragged past the threshold', () => {
    const node = makeNode()
    const scene = new FakeScene([node])
    const onTearCommitted = vi.fn()
    const controller = new NoteGestureController(scene, { onTearCommitted } as never)

    const bottom = node.anchor.y + 85 - scene.tearHandleHeight / 2
    controller.onPointerDown({ x: node.anchor.x, y: bottom, id: 1 })
    controller.onPointerMove({
      x: node.anchor.x,
      y: bottom + scene.noteHeight * (TEAR_COMMIT_THRESHOLD + 0.2),
      id: 1,
    })
    controller.onPointerUp({ x: node.anchor.x, y: bottom + scene.noteHeight, id: 1 })

    expect(onTearCommitted).toHaveBeenCalledTimes(1)
    expect(node.tearTarget).toBe(1)
    expect(node.interactionState).toBe('idle')
  })

  it('cancels tear when released below the threshold', () => {
    const node = makeNode()
    const scene = new FakeScene([node])
    const onTearCancelled = vi.fn()
    const controller = new NoteGestureController(scene, { onTearCancelled } as never)

    const bottom = node.anchor.y + 85 - scene.tearHandleHeight / 2
    controller.onPointerDown({ x: node.anchor.x, y: bottom, id: 1 })
    controller.onPointerMove({ x: node.anchor.x, y: bottom + 10, id: 1 })
    controller.onPointerUp({ x: node.anchor.x, y: bottom + 10, id: 1 })

    expect(onTearCancelled).toHaveBeenCalledTimes(1)
    expect(node.tearTarget).toBe(0)
  })

  it('ignores pointers not on a note', () => {
    const node = makeNode()
    const scene = new FakeScene([node])
    const onTap = vi.fn()
    const controller = new NoteGestureController(scene, { onTap } as never)

    controller.onPointerDown({ x: 5, y: 5, id: 1 })
    controller.onPointerUp({ x: 5, y: 5, id: 1 })
    expect(onTap).not.toHaveBeenCalled()
  })
})
