import type { SnapshotRepository } from './SnapshotRepository'

const STORAGE_KEY = 'stickynote.widget_snapshot.v1'

export class LocalStorageSnapshotRepository implements SnapshotRepository {
  async write(payload: string): Promise<void> {
    localStorage.setItem(STORAGE_KEY, payload)
  }

  async read(): Promise<string | null> {
    return localStorage.getItem(STORAGE_KEY)
  }
}
