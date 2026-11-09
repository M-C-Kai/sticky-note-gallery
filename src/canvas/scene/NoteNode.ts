import type { Note } from '@/domain/note'

export type InteractionState = 'idle' | 'move' | 'tear'

export interface Vector2 {
  x: number
  y: number
}

export interface RenderOffset {
  x: number
  y: number
  rotation: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export class NoteNode {
  readonly id: string
  model: Note

  anchor: Vector2
  renderOffset: RenderOffset = { x: 0, y: 0, rotation: 0 }
  interactionState: InteractionState = 'idle'
  tearProgress = 0
  tearTarget: 0 | 1 | null = null
  zIndex = 0
  reflowFrom: Vector2 | null = null
  reflowTo: Vector2 | null = null
  reflowStart = 0
  reflowDuration = 0

  constructor(model: Note) {
    this.id = model.id
    this.model = model
    this.anchor = { x: model.anchorX, y: model.anchorY }
  }

  get color(): Note['color'] {
    return this.model.color
  }

  get sortIndex(): number {
    return this.model.sortIndex
  }

  get isInteracting(): boolean {
    return this.interactionState !== 'idle'
  }
}
