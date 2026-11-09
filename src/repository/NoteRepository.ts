import type { CreateNoteInput, Note, NoteStatus, UpdateNoteInput } from '@/domain/note'

export interface NoteRepository {
  listActive(): Promise<Note[]>
  listCompleted(): Promise<Note[]>
  getById(id: string): Promise<Note | null>
  create(input: CreateNoteInput): Promise<Note>
  update(id: string, patch: UpdateNoteInput): Promise<Note>
  complete(id: string, completedAt: number): Promise<void>
  restore(id: string): Promise<void>
  permanentlyDelete(id: string): Promise<void>
}

export interface NoteQuery {
  status?: NoteStatus
}

export function listByStatus(notes: Note[], status: NoteStatus): Note[] {
  return notes.filter((n) => n.status === status)
}
