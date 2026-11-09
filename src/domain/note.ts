export const NOTE_COLORS = ['yellow', 'mint', 'pink', 'blue', 'peach', 'lilac'] as const

export type NoteColor = (typeof NOTE_COLORS)[number]

export type NoteStatus = 'active' | 'completed'

export interface Note {
  id: string
  text: string
  color: NoteColor
  status: NoteStatus
  anchorX: number
  anchorY: number
  sortIndex: number
  motionSeed: number
  completedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface CreateNoteInput {
  text: string
  color?: NoteColor
  anchorX?: number
  anchorY?: number
  sortIndex?: number
}

export interface UpdateNoteInput {
  text?: string
  color?: NoteColor
  anchorX?: number
  anchorY?: number
  sortIndex?: number
}

export const DEFAULT_NOTE_COLOR: NoteColor = 'yellow'

export function isNoteColor(value: unknown): value is NoteColor {
  return typeof value === 'string' && (NOTE_COLORS as readonly string[]).includes(value)
}
