<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { Note, NoteColor } from '@/domain/note'
import { NOTE_COLORS } from '@/domain/note'
import { NOTE_COLOR_STYLES } from '@/canvas/renderer/noteColors'

const props = defineProps<{
  note: Note | null
  initialColor?: NoteColor
  saving?: boolean
  saveError?: string | null
}>()

const emit = defineEmits<{
  save: [payload: { text: string; color: NoteColor }]
  cancel: []
}>()

const text = ref(props.note?.text ?? '')
const color = ref<NoteColor>(props.note?.color ?? props.initialColor ?? 'yellow')
const inputEl = ref<HTMLTextAreaElement | null>(null)
const showDebugError = import.meta.env.DEV

watch(
  () => props.note,
  (note) => {
    text.value = note?.text ?? ''
    color.value = note?.color ?? props.initialColor ?? 'yellow'
  },
)

onMounted(() => {
  inputEl.value?.focus()
})

function submit(): void {
  // Vue deliberately delays v-model updates while an IME composition is in
  // progress. Android keyboards may not dispatch compositionend before the
  // Save click, so read the textarea itself to avoid dropping the last text.
  const value = (inputEl.value?.value ?? text.value).trim()
  if (!value) return
  text.value = value
  emit('save', { text: value, color: color.value })
}

function cancel(): void {
  if (!props.saving) emit('cancel')
}

function swatchBg(c: NoteColor): string {
  return NOTE_COLOR_STYLES[c].bg
}
</script>

<template>
  <div class="editor-overlay" @pointerdown.self="cancel">
    <div class="editor-card">
      <textarea
        ref="inputEl"
        v-model="text"
        class="editor-input"
        :maxlength="500"
        rows="3"
        placeholder="写点什么…"
        @keydown.esc="cancel"
      ></textarea>
      <div v-if="saveError" class="save-error" role="alert">
        <span>保存失败，请重试</span>
        <small v-if="showDebugError">{{ saveError }}</small>
      </div>
      <div class="editor-footer">
        <div class="palette">
          <button
            v-for="c in NOTE_COLORS"
            :key="c"
            type="button"
            class="swatch"
            :class="{ active: color === c }"
            :style="{ background: swatchBg(c) }"
            :aria-label="`颜色 ${c}`"
            @click="color = c"
          ></button>
        </div>
        <div class="editor-actions">
          <button type="button" class="btn ghost" :disabled="saving" @click="cancel">取消</button>
          <button
            type="button"
            class="btn primary"
            :disabled="saving || !text.trim()"
            @click="submit"
          >{{ saving ? '保存中…' : '保存' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(40, 34, 24, 0.35);
  z-index: 100;
  padding: 20px;
}

.editor-card {
  width: min(420px, 100%);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.editor-input {
  width: 100%;
  border: 1px solid rgba(60, 50, 30, 0.15);
  border-radius: var(--radius-md);
  padding: 12px;
  font-size: 16px;
  line-height: 1.5;
  resize: none;
  background: #fff;
  color: var(--text-primary);
  outline: none;
}

.editor-input:focus {
  border-color: var(--accent);
}

.save-error {
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: var(--danger);
  font-size: 13px;
}

.save-error small {
  overflow-wrap: anywhere;
}

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.palette {
  display: flex;
  gap: 8px;
}

.swatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid transparent;
  box-shadow: var(--shadow-sm);
}

.swatch.active {
  border-color: var(--accent-strong);
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
}

.btn.ghost {
  color: var(--text-muted);
}

.btn.ghost:hover {
  color: var(--text-primary);
}

.btn.primary {
  background: var(--accent);
  color: #4a3a15;
}

.btn.primary:hover {
  background: var(--accent-strong);
}

.btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
