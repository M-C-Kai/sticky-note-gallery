import { Capacitor } from '@capacitor/core'
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite'
import { MIGRATIONS } from './migrations'

export const DB_NAME = 'stickynote'

export type SqlValue = string | number | null | Uint8Array
export type DatabaseInitStage =
  | 'opening'
  | 'running-migrations'
  | 'migrations-ready'
  | 'health-check'

export interface DatabaseInitOptions {
  onStage?: (stage: DatabaseInitStage) => void
}

export interface DatabaseStatus {
  ready: boolean
  connectionOpen: boolean
  migrationReady: boolean
  healthCheckPassed: boolean
  databaseName: string
  notesCount: number | null
  settingsCount: number | null
  lastHealthCheckAt: number | null
  lastError: string | null
}

export interface DatabaseHealthResult {
  ok: true
  notesCount: number
  settingsCount: number
  checkedAt: number
}

interface CountRow {
  count: number
}

class Database {
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite)
  private db: SQLiteDBConnection | null = null
  private initPromise: Promise<void> | null = null
  private initialized = false
  private migrationsApplied = false
  private healthPassed = false
  private notesCount: number | null = null
  private settingsCount: number | null = null
  private lastHealthCheckAt: number | null = null
  private lastError: string | null = null

  get isReady(): boolean {
    return this.initialized && this.db !== null
  }

  init(options: DatabaseInitOptions = {}): Promise<void> {
    if (this.isReady) return Promise.resolve()
    if (this.initPromise) return this.initPromise

    this.migrationsApplied = false
    this.healthPassed = false
    this.lastError = null

    this.initPromise = this.bootstrap(options)
      .catch(async (error: unknown) => {
        this.initialized = false
        this.healthPassed = false
        this.lastError = error instanceof Error ? error.message : String(error)
        this.db = null
        try {
          await this.sqlite.closeConnection(DB_NAME, false)
        } catch {
          // Preserve the original initialization error. The connection may not
          // have been created yet, so cleanup is intentionally best-effort.
        }
        throw error
      })
      .finally(() => {
        this.initPromise = null
      })

    return this.initPromise
  }

  assertReady(): void {
    if (!this.isReady) {
      throw new Error('Database is not initialized')
    }
  }

  getStatus(): DatabaseStatus {
    return {
      ready: this.isReady,
      connectionOpen: this.db !== null,
      migrationReady: this.migrationsApplied,
      healthCheckPassed: this.healthPassed,
      databaseName: DB_NAME,
      notesCount: this.notesCount,
      settingsCount: this.settingsCount,
      lastHealthCheckAt: this.lastHealthCheckAt,
      lastError: this.lastError,
    }
  }

  private async bootstrap(options: DatabaseInitOptions): Promise<void> {
    options.onStage?.('opening')

    if (Capacitor.getPlatform() === 'web') {
      await customElements.whenDefined('jeep-sqlite')
      const jeep = document.querySelector('jeep-sqlite') as
        | { init: () => Promise<void> }
        | null
        | undefined
      if (jeep) {
        await jeep.init()
      }
    }

    await this.sqlite.checkConnectionsConsistency()
    this.db = await this.sqlite.createConnection(
      DB_NAME,
      false,
      'no-encryption',
      MIGRATIONS[MIGRATIONS.length - 1]!.version,
      false,
    )
    await this.db.open()
    options.onStage?.('running-migrations')
    await this.runMigrations(this.db)
    this.migrationsApplied = true
    options.onStage?.('migrations-ready')
    options.onStage?.('health-check')
    await this.healthCheck(this.db)
    this.initialized = true
  }

  private async runMigrations(db: SQLiteDBConnection): Promise<void> {
    const result = await db.query('PRAGMA user_version')
    let current = 0
    const row = result.values?.[0] as { user_version?: number } | undefined
    if (row && typeof row.user_version === 'number') {
      current = row.user_version
    }

    for (const migration of MIGRATIONS) {
      if (migration.version <= current) continue
      await db.beginTransaction()
      try {
        for (const statement of migration.sql) {
          // The migration already owns an explicit transaction. Passing true
          // here makes the native plugin start another transaction and fails
          // with "Already in transaction" before the schema is created.
          await db.execute(statement, false)
        }
        await db.execute(`PRAGMA user_version = ${migration.version}`, false)
        await db.commitTransaction()
      } catch (error) {
        await db.rollbackTransaction()
        throw error
      }
      current = migration.version
    }
  }

  private async healthCheck(db: SQLiteDBConnection): Promise<void> {
    await db.query('SELECT 1 AS ok')
    const notes = await db.query('SELECT COUNT(*) AS count FROM notes')
    const settings = await db.query('SELECT COUNT(*) AS count FROM settings')
    await db.query('SELECT COUNT(*) AS count FROM widget_snapshot')
    this.notesCount = Number((notes.values?.[0] as CountRow | undefined)?.count ?? 0)
    this.settingsCount = Number((settings.values?.[0] as CountRow | undefined)?.count ?? 0)
    this.lastHealthCheckAt = Date.now()
    this.healthPassed = true
    this.lastError = null
  }

  async checkHealth(): Promise<DatabaseHealthResult> {
    const db = this.getDb()
    try {
      await db.query('SELECT 1 AS ok')
      const notes = await db.query('SELECT COUNT(*) AS count FROM notes')
      const settings = await db.query('SELECT COUNT(*) AS count FROM settings')
      const checkedAt = Date.now()
      this.notesCount = Number((notes.values?.[0] as CountRow | undefined)?.count ?? 0)
      this.settingsCount = Number((settings.values?.[0] as CountRow | undefined)?.count ?? 0)
      this.lastHealthCheckAt = checkedAt
      this.healthPassed = true
      this.lastError = null
      return {
        ok: true,
        notesCount: this.notesCount,
        settingsCount: this.settingsCount,
        checkedAt,
      }
    } catch (error) {
      this.healthPassed = false
      this.lastError = error instanceof Error ? error.message : String(error)
      throw error
    }
  }

  private getDb(): SQLiteDBConnection {
    this.assertReady()
    return this.db!
  }

  async query<T>(sql: string, values?: SqlValue[]): Promise<T[]> {
    const db = this.getDb()
    const result = await db.query(sql, values)
    return (result.values ?? []) as T[]
  }

  async run(sql: string, values?: SqlValue[]): Promise<void> {
    const db = this.getDb()
    await db.run(sql, values, false)
  }

  async execute(sql: string): Promise<void> {
    const db = this.getDb()
    await db.execute(sql, false)
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    const db = this.getDb()
    await db.beginTransaction()
    try {
      const result = await work()
      await db.commitTransaction()
      return result
    } catch (error) {
      await db.rollbackTransaction()
      throw error
    }
  }
}

export const database = new Database()
