import type { Note } from '@/domain/note'
import { InMemoryNoteRepository } from './InMemoryNoteRepository'

const STORAGE_KEY = 'stickynote.notes.v1'

function readFromStorage(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Note[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export class LocalStorageNoteRepository extends InMemoryNoteRepository {
  constructor() {
    super()
    for (const note of readFromStorage()) {
      this.notes.set(note.id, note)
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.notes.values()]))
    } catch {
      // storage quota / unavailable: keep in memory only
    }
  }

  override async create(input: Parameters<InMemoryNoteRepository['create']>[0]) {
    const note = await super.create(input)
    this.persist()
    return note
  }

  override async update(id: string, patch: Parameters<InMemoryNoteRepository['update']>[1]) {
    const note = await super.update(id, patch)
    this.persist()
    return note
  }

  override async complete(id: string, completedAt: number) {
    await super.complete(id, completedAt)
    this.persist()
  }

  override async restore(id: string) {
    await super.restore(id)
    this.persist()
  }

  override async permanentlyDelete(id: string) {
    await super.permanentlyDelete(id)
    this.persist()
  }
}
