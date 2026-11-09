<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useNoteStore } from '@/stores/noteStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useBootstrapStore } from '@/bootstrap/bootstrapStore'
import NoteCanvas from '@/components/NoteCanvas.vue'
import NoteEditor from '@/components/NoteEditor.vue'
import type { Note, NoteColor } from '@/domain/note'
import { DEFAULT_NOTE_COLOR } from '@/domain/note'
import type { NoteNode } from '@/canvas/scene/NoteNode'

const store = useNoteStore()
const settings = useSettingsStore()
const bootstrap = useBootstrapStore()
const { activeNotes } = storeToRefs(store)
const { driftStrength } = storeToRefs(settings)

const canvasRef = ref<InstanceType<typeof NoteCanvas> | null>(null)
const editorOpen = ref(false)
const creating = ref(false)
const editorNote = ref<Note | null>(null)
const editorColor = ref<NoteColor>(DEFAULT_NOTE_COLOR)
const saving = ref(false)
const saveError = ref<string | null>(null)

function openCreate(): void {
  saving.value = false
  saveError.value = null
  creating.value = true
  editorNote.value = null
  editorColor.value = DEFAULT_NOTE_COLOR
  editorOpen.value = true
}

function openEdit(node: NoteNode): void {
  saving.value = false
  saveError.value = null
  creating.value = false
  editorNote.value = { ...node.model }
  editorColor.value = node.model.color
  editorOpen.value = true
}

async function onSave(payload: { text: string; color: NoteColor }): Promise<void> {
  if (saving.value) return

  // Capture the mode and id before awaiting persistence so UI lifecycle
  // changes cannot redirect an edit into the create path.
  const mode = creating.value ? 'create' : 'update'
  const noteId = editorNote.value?.id ?? null
  saving.value = true
  saveError.value = null

  try {
    if (mode === 'create') {
      const anchor = canvasRef.value?.getNextAnchor() ?? { x: 0, y: 0 }
      await store.addNote({
        text: payload.text,
        color: payload.color,
        anchorX: anchor.x,
        anchorY: anchor.y,
      })
    } else {
      if (!noteId) throw new Error('Missing note id for update')
      await store.updateNote(noteId, {
        text: payload.text,
        color: payload.color,
      })
    }
    editorOpen.value = false
  } catch (error) {
    console.error('[note-save]', error)
    saveError.value = error instanceof Error ? error.message : String(error)
    bootstrap.recordRuntimeError('note-save', error)
  } finally {
    saving.value = false
  }
}

async function onCompleted(node: NoteNode): Promise<void> {
  await store.completeNote(node.id, 'app')
}

async function onAnchorChanged(node: NoteNode): Promise<void> {
  await store.updateNote(node.id, { anchorX: node.anchor.x, anchorY: node.anchor.y })
  await store.persistOrder()
}
</script>

<template>
  <div class="home-page">
    <NoteCanvas
      ref="canvasRef"
      :notes="activeNotes"
      :drift-strength="driftStrength"
      @edit="openEdit"
      @completed="onCompleted"
      @anchor-changed="onAnchorChanged"
    />
    <button class="add-button" aria-label="新增便利贴" @click="openCreate">+</button>
    <NoteEditor
      v-if="editorOpen"
      :note="editorNote"
      :initial-color="editorColor"
      :saving="saving"
      :save-error="saveError"
      @save="onSave"
      @cancel="editorOpen = false"
    />
  </div>
</template>

<style scoped>
.home-page {
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 100%;
}

.add-button {
  position: absolute;
  right: 20px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent);
  color: #4a3a15;
  font-size: 28px;
  line-height: 1;
  box-shadow: var(--shadow-md);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  touch-action: manipulation;
  transition: transform 0.12s ease, background 0.12s ease;
}

.add-button:hover {
  background: var(--accent-strong);
  transform: scale(1.05);
}

.add-button:active {
  transform: scale(0.96);
}
</style>
