export interface Migration {
  version: number
  sql: string[]
}

const SCHEMA_V1: Migration = {
  version: 1,
  sql: [
    `CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      text TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'yellow',
      status TEXT NOT NULL DEFAULT 'active',
      anchor_x REAL NOT NULL DEFAULT 0,
      anchor_y REAL NOT NULL DEFAULT 0,
      sort_index INTEGER NOT NULL DEFAULT 0,
      motion_seed INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS widget_snapshot (
      version INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      payload TEXT NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status)',
    'CREATE INDEX IF NOT EXISTS idx_notes_sort ON notes(sort_index)',
  ],
}

export const MIGRATIONS: Migration[] = [SCHEMA_V1]

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version
