import { WIDGET_SNAPSHOT_VERSION, type WidgetSnapshot } from '@/domain/widget'
import type { NoteRepository } from '@/repository/NoteRepository'
import type { SnapshotRepository } from '@/repository/SnapshotRepository'
import type { WidgetBridge } from '@/infrastructure/widget/WidgetBridge'

export const DEFAULT_WIDGET_MAX_ITEMS = 3

/**
 * Builds and keeps the Widget Snapshot up to date. The snapshot is a
 * rebuildable cache derived from SQLite (the source of truth).
 */
export class WidgetSyncService {
  private onApplied: (() => void) | null = null

  constructor(
    private readonly repo: NoteRepository,
    private readonly snapshotRepo: SnapshotRepository,
    private readonly bridge: WidgetBridge,
  ) {
    bridge.onCompletions((ids) => this.applyCompletions(ids))
  }

  setOnApplied(handler: () => void): void {
    this.onApplied = handler
  }

  /**
   * Persists completions triggered from the widget (iOS App Intent) into the
   * source of truth, then rebuilds the snapshot. Android widgets write into
   * the shared SQLite directly and never emit this event.
   */
  async applyCompletions(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    const now = Date.now()
    for (const id of ids) {
      try {
        await this.repo.complete(id, now)
      } catch {
        // A single failing note must not block the rest.
      }
    }
    try {
      await this.syncAndReload()
    } catch {
      // Snapshot is a rebuildable cache.
    }
    this.onApplied?.()
  }

  async buildSnapshot(maxItems: number = DEFAULT_WIDGET_MAX_ITEMS): Promise<WidgetSnapshot> {
    const active = await this.repo.listActive()
    const notes = active
      .slice(0, maxItems)
      .map((n) => ({ id: n.id, text: n.text, color: n.color, sortIndex: n.sortIndex }))
    return {
      version: WIDGET_SNAPSHOT_VERSION,
      updatedAt: Date.now(),
      notes,
    }
  }

  async syncAndReload(maxItems?: number): Promise<void> {
    const snapshot = await this.buildSnapshot(maxItems)
    await this.snapshotRepo.write(JSON.stringify(snapshot))
    await this.bridge.sync(snapshot)
  }

  async reload(): Promise<void> {
    await this.bridge.reload()
  }

  /**
   * Lightweight reconcile on app start/resume: rebuilds the snapshot only when
   * it is missing, corrupted, or stale.
   */
  async reconcile(maxItems: number = DEFAULT_WIDGET_MAX_ITEMS): Promise<void> {
    const snapshot = await this.buildSnapshot(maxItems)
    const existing = await this.snapshotRepo.read()
    if (existing) {
      try {
        const parsed = JSON.parse(existing) as WidgetSnapshot
        if (parsed.version === snapshot.version && parsed.updatedAt >= snapshot.updatedAt) {
          return
        }
      } catch {
        // corrupted snapshot -> rebuild below
      }
    }
    await this.snapshotRepo.write(JSON.stringify(snapshot))
    await this.bridge.sync(snapshot)
  }
}
