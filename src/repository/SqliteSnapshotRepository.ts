import type { SnapshotRepository } from './SnapshotRepository'
import { database } from '@/infrastructure/db/Database'

export class SqliteSnapshotRepository implements SnapshotRepository {
  async write(payload: string): Promise<void> {
    database.assertReady()
    await database.run(
      `INSERT OR REPLACE INTO widget_snapshot (version, updated_at, payload) VALUES (1, ?, ?)`,
      [Date.now(), payload],
    )
  }

  async read(): Promise<string | null> {
    database.assertReady()
    const rows = await database.query<{ payload: string }>(
      `SELECT payload FROM widget_snapshot LIMIT 1`,
    )
    return rows[0]?.payload ?? null
  }
}
