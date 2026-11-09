<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Note } from '@/domain/note'
import { CanvasEngine } from '@/canvas/CanvasEngine'
import type { DriftStrength } from '@/canvas/motion/DriftMotion'
import type { NoteNode, Vector2 } from '@/canvas/scene/NoteNode'

const props = defineProps<{
  notes: Note[]
  driftStrength?: DriftStrength
}>()

const emit = defineEmits<{
  edit: [note: NoteNode]
  completed: [note: NoteNode]
  tearCommitted: [note: NoteNode]
  anchorChanged: [note: NoteNode]
  interactionChange: [interacting: boolean]
}>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const engine = ref<CanvasEngine | null>(null)

onMounted(() => {
  if (!canvasEl.value) return
  const eng = new CanvasEngine({
    canvas: canvasEl.value,
    driftStrength: props.driftStrength ?? 'normal',
    callbacks: {
      onEditRequest: (note) => emit('edit', note),
      onCompleted: (note) => emit('completed', note),
      onTearCommitted: (note) => emit('tearCommitted', note),
      onAnchorChanged: (note) => emit('anchorChanged', note),
      onInteractionChange: (interacting) => emit('interactionChange', interacting),
    },
  })
  engine.value = eng
  eng.syncFromNotes(props.notes)
  eng.start()
})

onBeforeUnmount(() => {
  engine.value?.stop()
  engine.value = null
})

watch(
  () => props.notes,
  (notes) => {
    engine.value?.syncFromNotes(notes)
  },
)

watch(
  () => props.driftStrength,
  (strength) => {
    if (strength) engine.value?.setDriftStrength(strength)
  },
)

function getNextAnchor(): Vector2 {
  return engine.value?.getNextAnchor() ?? { x: 0, y: 0 }
}

defineExpose({ getNextAnchor })
</script>

<template>
  <canvas ref="canvasEl" class="note-canvas"></canvas>
</template>

<style scoped>
.note-canvas {
  display: block;
  position: relative;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto;
  touch-action: none;
}
</style>
