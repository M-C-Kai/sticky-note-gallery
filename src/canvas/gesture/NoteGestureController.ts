import type { NoteNode, Vector2 } from '../scene/NoteNode'
import { TEAR_COMMIT_THRESHOLD } from '../motion/TearMotion'

export interface SceneView {
  noteWidth: number
  noteHeight: number
  tearHandleHeight: number
  logicalWidth: number
  logicalHeight: number
  hitTest(x: number, y: number): NoteNode | null
  isTearHandle(x: number, y: number, note: NoteNode): boolean
  setNoteAnchor(note: NoteNode, anchor: Vector2): void
}

export interface PointerPoint {
  x: number
  y: number
  id: number
}

export interface GestureCallbacks {
  onTap(note: NoteNode): void
  onMoveEnded(note: NoteNode, anchor: Vector2): void
  onTearCommitted(note: NoteNode): void
  onTearCancelled(note: NoteNode): void
  onTearProgress?(note: NoteNode, progress: number): void
  onMoveStarted?(note: NoteNode): void
}

type Mode = 'idle' | 'move' | 'tear'

const MOVE_SLOP = 4

export class NoteGestureController {
  private activePointerId: number | null = null
  private activeNote: NoteNode | null = null
  private mode: Mode = 'idle'
  private startPoint: PointerPoint = { x: 0, y: 0, id: -1 }
  private noteStartAnchor: Vector2 = { x: 0, y: 0 }
  private moved = false

  constructor(
    private readonly scene: SceneView,
    private readonly callbacks: GestureCallbacks,
  ) {}

  get activePointer(): number | null {
    return this.activePointerId
  }

  isBusy(): boolean {
    return this.mode !== 'idle'
  }

  onPointerDown(point: PointerPoint): void {
    if (this.activePointerId !== null) return

    const hit = this.scene.hitTest(point.x, point.y)
    if (!hit) {
      this.mode = 'idle'
      return
    }

    this.activePointerId = point.id
    this.activeNote = hit
    this.startPoint = { ...point }
    this.noteStartAnchor = { ...hit.anchor }
    this.moved = false

    if (this.scene.isTearHandle(point.x, point.y, hit)) {
      this.mode = 'tear'
      hit.interactionState = 'tear'
    } else {
      this.mode = 'move'
      hit.interactionState = 'move'
      this.callbacks.onMoveStarted?.(hit)
    }
  }

  onPointerMove(point: PointerPoint): void {
    if (this.activePointerId === null || this.activePointerId !== point.id) return
    if (!this.activeNote) return

    const dx = point.x - this.startPoint.x
    const dy = point.y - this.startPoint.y

    if (!this.moved && Math.hypot(dx, dy) < MOVE_SLOP) return
    this.moved = true

    if (this.mode === 'move') {
      const anchor: Vector2 = {
        x: this.clampX(this.noteStartAnchor.x + dx),
        y: this.clampY(this.noteStartAnchor.y + dy),
      }
      this.scene.setNoteAnchor(this.activeNote, anchor)
    } else if (this.mode === 'tear') {
      const drag = point.y - this.startPoint.y
      const distance = this.scene.noteHeight * 0.9
      const progress = Math.max(0, Math.min(1, drag / distance))
      this.activeNote.tearProgress = progress
      this.callbacks.onTearProgress?.(this.activeNote, progress)
    }
  }

  onPointerUp(point: PointerPoint): void {
    if (this.activePointerId === null || this.activePointerId !== point.id) return
    const note = this.activeNote

    if (note && this.mode === 'move') {
      if (this.moved) {
        this.callbacks.onMoveEnded(note, { ...note.anchor })
      } else {
        this.callbacks.onTap(note)
      }
      note.interactionState = 'idle'
    } else if (note && this.mode === 'tear') {
      if (note.tearProgress >= TEAR_COMMIT_THRESHOLD) {
        note.tearTarget = 1
        this.callbacks.onTearCommitted(note)
      } else {
        note.tearTarget = 0
        this.callbacks.onTearCancelled(note)
      }
      note.interactionState = 'idle'
    }

    this.reset()
  }

  onPointerCancel(): void {
    const note = this.activeNote
    if (note) {
      if (this.mode === 'tear') {
        note.tearTarget = 0
        this.callbacks.onTearCancelled(note)
      }
      note.interactionState = 'idle'
    }
    this.reset()
  }

  private reset(): void {
    this.activePointerId = null
    this.activeNote = null
    this.mode = 'idle'
    this.moved = false
  }

  private clampX(x: number): number {
    return Math.max(0, Math.min(x, this.scene.logicalWidth))
  }

  private clampY(y: number): number {
    return Math.max(0, Math.min(y, this.scene.logicalHeight))
  }
}
