import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CreateNoteInput, Note, UpdateNoteInput } from '@/domain/note'
import { reorderByPosition } from '@/application/orderNotes'
import {
  createCompletionService,
  createNoteService,
  createWidgetSyncService,
} from '@/application/serviceContainer'

export const useNoteStore = defineStore('notes', () => {
  const activeNotes = ref<Note[]>([])
  const completedNotes = ref<Note[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  const noteService = createNoteService()
  const completionService = createCompletionService()
  const widgetSync = createWidgetSyncService()

  widgetSync.setOnApplied(() => {
    if (!initialized.value) return
    void reloadActive().catch((reloadError: unknown) => {
      console.error('[widget-sync] failed to reload active notes', reloadError)
    })
    void reloadCompleted().catch((reloadError: unknown) => {
      console.error('[widget-sync] failed to reload completed notes', reloadError)
    })
  })

  function assertInitialized(): void {
    if (!initialized.value) {
      throw new Error('Note store is not initialized')
    }
  }

  async function initialize(): Promise<number> {
    loading.value = true
    error.value = null
    try {
      activeNotes.value = await noteService.listActive()
      completedNotes.value = await noteService.listCompleted()
      initialized.value = true
      return activeNotes.value.length
    } catch (e) {
      initialized.value = false
      error.value = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function reloadActive(): Promise<void> {
    assertInitialized()
    activeNotes.value = await noteService.listActive()
  }

  async function addNote(input: CreateNoteInput): Promise<Note> {
    assertInitialized()
    const note = await noteService.create(input)
    // NoteCanvas watches the notes array reference to synchronize its scene.
    // Replace the array instead of mutating it in place so a newly persisted
    // note is rendered immediately.
    activeNotes.value = [...activeNotes.value, note]
    // The widget snapshot is a rebuildable cache. Native bridge work must not
    // keep the primary note save pending or prevent the editor from closing.
    void syncWidget().catch((syncError: unknown) => {
      console.error('[note-save] widget sync failed after create', syncError)
    })
    return note
  }

  async function updateNote(id: string, patch: UpdateNoteInput): Promise<Note> {
    assertInitialized()
    const updated = await noteService.save(id, patch)
    const index = activeNotes.value.findIndex((n) => n.id === id)
    if (index >= 0) {
      activeNotes.value = activeNotes.value.map((note, noteIndex) =>
        noteIndex === index ? updated : note,
      )
    }
    return updated
  }

  async function completeNote(id: string, source: 'app' | 'widget' = 'app'): Promise<void> {
    assertInitialized()
    await completionService.complete(id, source)
    activeNotes.value = activeNotes.value.filter((n) => n.id !== id)
    await reloadCompleted()
  }

  async function restoreNote(id: string): Promise<void> {
    assertInitialized()
    await completionService.restore(id)
    completedNotes.value = completedNotes.value.filter((n) => n.id !== id)
    await reloadActive()
  }

  async function deleteForever(id: string): Promise<void> {
    assertInitialized()
    await noteService.permanentlyDelete(id)
    completedNotes.value = completedNotes.value.filter((n) => n.id !== id)
  }

  async function reloadCompleted(): Promise<void> {
    assertInitialized()
    completedNotes.value = await noteService.listCompleted()
  }

  async function syncWidget(): Promise<void> {
    assertInitialized()
    await widgetSync.syncAndReload()
  }

  async function reconcileWidget(): Promise<void> {
    assertInitialized()
    await widgetSync.reconcile()
  }

  /**
   * Persists the current visual ordering (y first, then x) into sort_index.
   */
  async function persistOrder(): Promise<void> {
    assertInitialized()
    const order = reorderByPosition(activeNotes.value)
    const changed = activeNotes.value.filter((n) => n.sortIndex !== order.get(n.id))
    for (const note of changed) {
      const next = order.get(note.id)
      if (next === undefined) continue
      await noteService.save(note.id, { sortIndex: next })
      note.sortIndex = next
    }
  }

  return {
    activeNotes,
    completedNotes,
    loading,
    error,
    initialized,
    initialize,
    reloadActive,
    addNote,
    updateNote,
    completeNote,
    restoreNote,
    deleteForever,
    syncWidget,
    reconcileWidget,
    persistOrder,
  }
})
