import type { WidgetSnapshot } from '@/domain/widget'

export interface WidgetBridge {
  sync(snapshot: WidgetSnapshot): Promise<void>
  reload(): Promise<void>
  /**
   * Registers a listener for widget-initiated completions (iOS App Intent).
   * No-op on platforms where the widget persists into the shared SQLite
   * directly (Android).
   */
  onCompletions(listener: (ids: string[]) => void): void
}
