import { Capacitor } from '@capacitor/core'
import type { NoteRepository } from '@/repository/NoteRepository'
import type { SnapshotRepository } from '@/repository/SnapshotRepository'
import { SqliteNoteRepository } from '@/repository/SqliteNoteRepository'
import { SqliteSnapshotRepository } from '@/repository/SqliteSnapshotRepository'
import { LocalStorageNoteRepository } from './LocalStorageNoteRepository'
import { LocalStorageSnapshotRepository } from '@/repository/LocalStorageSnapshotRepository'
import { database } from './Database'

let noteRepo: NoteRepository | null = null
let snapshotRepo: SnapshotRepository | null = null

export interface RepositoryRuntimeInfo {
  platform: string
  storageAdapter: 'Native SQLite' | 'LocalStorage'
  noteRepository: 'sqlite' | 'localStorage'
  snapshotRepository: 'sqlite' | 'localStorage'
  noteRepositoryReady: boolean
  snapshotRepositoryReady: boolean
}

export function getRepositoryRuntimeInfo(): RepositoryRuntimeInfo {
  const native = Capacitor.isNativePlatform()
  return {
    platform: Capacitor.getPlatform(),
    storageAdapter: native ? 'Native SQLite' : 'LocalStorage',
    noteRepository: native ? 'sqlite' : 'localStorage',
    snapshotRepository: native ? 'sqlite' : 'localStorage',
    noteRepositoryReady: noteRepo !== null,
    snapshotRepositoryReady: snapshotRepo !== null,
  }
}

export function createNoteRepository(): NoteRepository {
  if (noteRepo) return noteRepo
  if (Capacitor.isNativePlatform()) {
    database.assertReady()
    noteRepo = new SqliteNoteRepository()
  } else {
    noteRepo = new LocalStorageNoteRepository()
  }
  return noteRepo
}

export function createSnapshotRepository(): SnapshotRepository {
  if (snapshotRepo) return snapshotRepo
  if (Capacitor.isNativePlatform()) {
    database.assertReady()
    snapshotRepo = new SqliteSnapshotRepository()
  } else {
    snapshotRepo = new LocalStorageSnapshotRepository()
  }
  return snapshotRepo
}
