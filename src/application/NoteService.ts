import type { CreateNoteInput, Note, UpdateNoteInput } from '@/domain/note'
import type { NoteRepository } from '@/repository/NoteRepository'

export class NoteService {
  constructor(private readonly repo: NoteRepository) {}

  async listActive(): Promise<Note[]> {
    return this.repo.listActive()
  }

  async listCompleted(): Promise<Note[]> {
    return this.repo.listCompleted()
  }

  async getById(id: string): Promise<Note | null> {
    return this.repo.getById(id)
  }

  async create(input: CreateNoteInput): Promise<Note> {
    return this.repo.create(input)
  }

  async save(id: string, patch: UpdateNoteInput): Promise<Note> {
    return this.repo.update(id, patch)
  }

  async restore(id: string): Promise<void> {
    await this.repo.restore(id)
  }

  async permanentlyDelete(id: string): Promise<void> {
    await this.repo.permanentlyDelete(id)
  }
}
