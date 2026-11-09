import {
  DEFAULT_NOTE_COLOR,
  type CreateNoteInput,
  type Note,
  type UpdateNoteInput,
} from '@/domain/note'
import type { NoteRepository } from '@/repository/NoteRepository'
import { createId, nextMotionSeed } from '@/infrastructure/ids'

export class InMemoryNoteRepository implements NoteRepository {
  protected notes = new Map<string, Note>()

  async listActive(): Promise<Note[]> {
    return [...this.notes.values()]
      .filter((n) => n.status === 'active')
      .sort((a, b) => a.sortIndex - b.sortIndex || a.createdAt - b.createdAt)
  }

  async listCompleted(): Promise<Note[]> {
    return [...this.notes.values()]
      .filter((n) => n.status === 'completed')
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  }

  async getById(id: string): Promise<Note | null> {
    return this.notes.get(id) ?? null
  }

  async create(input: CreateNoteInput): Promise<Note> {
    const now = Date.now()
    const note: Note = {
      id: createId(),
      text: input.text,
      color: input.color ?? DEFAULT_NOTE_COLOR,
      status: 'active',
      anchorX: input.anchorX ?? 0,
      anchorY: input.anchorY ?? 0,
      sortIndex: input.sortIndex ?? this.notes.size,
      motionSeed: nextMotionSeed(),
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    this.notes.set(note.id, note)
    return note
  }

  async update(id: string, patch: UpdateNoteInput): Promise<Note> {
    const existing = this.notes.get(id)
    if (!existing) {
      throw new Error(`Note not found: ${id}`)
    }
    const merged: Note = {
      ...existing,
      text: patch.text ?? existing.text,
      color: patch.color ?? existing.color,
      anchorX: patch.anchorX ?? existing.anchorX,
      anchorY: patch.anchorY ?? existing.anchorY,
      sortIndex: patch.sortIndex ?? existing.sortIndex,
      updatedAt: Date.now(),
    }
    this.notes.set(id, merged)
    return merged
  }

  async complete(id: string, completedAt: number): Promise<void> {
    const note = this.notes.get(id)
    if (!note || note.status !== 'active') return
    note.status = 'completed'
    note.completedAt = completedAt
    note.updatedAt = Date.now()
  }

  async restore(id: string): Promise<void> {
    const note = this.notes.get(id)
    if (!note) return
    note.status = 'active'
    note.completedAt = null
    note.updatedAt = Date.now()
  }

  async permanentlyDelete(id: string): Promise<void> {
    this.notes.delete(id)
  }
}
