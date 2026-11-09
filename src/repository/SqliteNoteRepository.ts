import {
  DEFAULT_NOTE_COLOR,
  isNoteColor,
  type CreateNoteInput,
  type Note,
  type UpdateNoteInput,
} from '@/domain/note'
import type { NoteRepository } from './NoteRepository'
import { database } from '@/infrastructure/db/Database'
import { createId, nextMotionSeed } from '@/infrastructure/ids'

interface NoteRow {
  id: string
  text: string
  color: string
  status: string
  anchor_x: number
  anchor_y: number
  sort_index: number
  motion_seed: number
  completed_at: number | null
  created_at: number
  updated_at: number
}

const NOTE_COLUMNS = [
  'id',
  'text',
  'color',
  'status',
  'anchor_x',
  'anchor_y',
  'sort_index',
  'motion_seed',
  'completed_at',
  'created_at',
  'updated_at',
].join(', ')

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    text: row.text,
    color: isNoteColor(row.color) ? row.color : DEFAULT_NOTE_COLOR,
    status: row.status === 'completed' ? 'completed' : 'active',
    anchorX: Number(row.anchor_x),
    anchorY: Number(row.anchor_y),
    sortIndex: Number(row.sort_index),
    motionSeed: Number(row.motion_seed),
    completedAt: row.completed_at == null ? null : Number(row.completed_at),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

export class SqliteNoteRepository implements NoteRepository {
  private assertReady(): void {
    database.assertReady()
  }

  async listActive(): Promise<Note[]> {
    this.assertReady()
    const rows = await database.query<NoteRow>(
      `SELECT ${NOTE_COLUMNS} FROM notes WHERE status = 'active' ORDER BY sort_index ASC, created_at ASC`,
    )
    return rows.map(toNote)
  }

  async listCompleted(): Promise<Note[]> {
    this.assertReady()
    const rows = await database.query<NoteRow>(
      `SELECT ${NOTE_COLUMNS} FROM notes WHERE status = 'completed' ORDER BY completed_at DESC`,
    )
    return rows.map(toNote)
  }

  async getById(id: string): Promise<Note | null> {
    this.assertReady()
    const rows = await database.query<NoteRow>(
      `SELECT ${NOTE_COLUMNS} FROM notes WHERE id = ? LIMIT 1`,
      [id],
    )
    return rows[0] ? toNote(rows[0]) : null
  }

  async create(input: CreateNoteInput): Promise<Note> {
    this.assertReady()
    const now = Date.now()
    const note: Note = {
      id: createId(),
      text: input.text,
      color: input.color ?? DEFAULT_NOTE_COLOR,
      status: 'active',
      anchorX: input.anchorX ?? 0,
      anchorY: input.anchorY ?? 0,
      sortIndex: input.sortIndex ?? 0,
      motionSeed: nextMotionSeed(),
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    await database.run(
      `INSERT INTO notes (id, text, color, status, anchor_x, anchor_y, sort_index, motion_seed, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        note.id,
        note.text,
        note.color,
        note.status,
        note.anchorX,
        note.anchorY,
        note.sortIndex,
        note.motionSeed,
        null,
        note.createdAt,
        note.updatedAt,
      ],
    )
    return note
  }

  async update(id: string, patch: UpdateNoteInput): Promise<Note> {
    this.assertReady()
    const existing = await this.getById(id)
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
    await database.run(
      `UPDATE notes SET text = ?, color = ?, anchor_x = ?, anchor_y = ?, sort_index = ?, updated_at = ? WHERE id = ?`,
      [merged.text, merged.color, merged.anchorX, merged.anchorY, merged.sortIndex, merged.updatedAt, id],
    )
    return merged
  }

  async complete(id: string, completedAt: number): Promise<void> {
    this.assertReady()
    await database.run(
      `UPDATE notes SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ? AND status = 'active'`,
      [completedAt, Date.now(), id],
    )
  }

  async restore(id: string): Promise<void> {
    this.assertReady()
    await database.run(
      `UPDATE notes SET status = 'active', completed_at = NULL, updated_at = ? WHERE id = ?`,
      [Date.now(), id],
    )
  }

  async permanentlyDelete(id: string): Promise<void> {
    this.assertReady()
    await database.run(`DELETE FROM notes WHERE id = ?`, [id])
  }
}
