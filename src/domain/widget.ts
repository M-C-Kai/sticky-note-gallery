import type { NoteColor } from './note'

export const WIDGET_SNAPSHOT_VERSION = 1 as const

export interface WidgetSnapshotNote {
  id: string
  text: string
  color: NoteColor
  sortIndex: number
}

export interface WidgetSnapshot {
  version: typeof WIDGET_SNAPSHOT_VERSION
  updatedAt: number
  notes: WidgetSnapshotNote[]
}
