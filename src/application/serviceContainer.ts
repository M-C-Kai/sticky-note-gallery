import type { NoteRepository } from '@/repository/NoteRepository'
import type { SnapshotRepository } from '@/repository/SnapshotRepository'
import {
  createNoteRepository,
  createSnapshotRepository,
} from '@/infrastructure/db/repositoryFactory'
import { CapacitorWidgetBridge } from '@/infrastructure/widget/CapacitorWidgetBridge'
import type { WidgetBridge } from '@/infrastructure/widget/WidgetBridge'
import { NoteService } from './NoteService'
import { CompletionService } from './CompletionService'
import { WidgetSyncService } from './WidgetSyncService'

let noteService: NoteService | null = null
let completionService: CompletionService | null = null
let widgetSyncService: WidgetSyncService | null = null

export function createNoteService(repo?: NoteRepository): NoteService {
  if (!noteService) {
    noteService = new NoteService(repo ?? createNoteRepository())
  }
  return noteService
}

export function createWidgetSyncService(
  repo?: NoteRepository,
  snapshotRepo?: SnapshotRepository,
  bridge?: WidgetBridge,
): WidgetSyncService {
  if (!widgetSyncService) {
    widgetSyncService = new WidgetSyncService(
      repo ?? createNoteRepository(),
      snapshotRepo ?? createSnapshotRepository(),
      bridge ?? new CapacitorWidgetBridge(),
    )
  }
  return widgetSyncService
}

export function createCompletionService(repo?: NoteRepository): CompletionService {
  if (!completionService) {
    completionService = new CompletionService(repo ?? createNoteRepository(), createWidgetSyncService(repo))
  }
  return completionService
}

export function resetServiceSingletons(): void {
  noteService = null
  completionService = null
  widgetSyncService = null
}
