import type { NoteRepository } from '@/repository/NoteRepository'
import type { WidgetSyncService } from './WidgetSyncService'

export type CompletionSource = 'app' | 'widget'

/**
 * Completes a note: writes status = completed to the source of truth first,
 * then refreshes the Widget snapshot. Widget refresh failure never rolls back
 * the completed state (ADR-003 / 失败策略).
 */
export class CompletionService {
  constructor(
    private readonly repo: NoteRepository,
    private readonly widgetSync: WidgetSyncService,
  ) {}

  async complete(noteId: string, source: CompletionSource = 'app'): Promise<void> {
    await this.repo.complete(noteId, Date.now())
    try {
      await this.widgetSync.syncAndReload()
    } catch {
      // Snapshot is a rebuildable cache; next reconcile fixes it.
    }
    void source
  }

  async restore(noteId: string): Promise<void> {
    await this.repo.restore(noteId)
    try {
      await this.widgetSync.syncAndReload()
    } catch {
      // ignore
    }
  }
}
