<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useNoteStore } from '@/stores/noteStore'
import { NOTE_COLOR_STYLES } from '@/canvas/renderer/noteColors'
import type { Note } from '@/domain/note'

const store = useNoteStore()
const { completedNotes } = storeToRefs(store)

function formatTime(note: Note): string {
  if (!note.completedAt) return ''
  return new Date(note.completedAt).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function restore(note: Note): Promise<void> {
  await store.restoreNote(note.id)
}

async function remove(note: Note): Promise<void> {
  await store.deleteForever(note.id)
}

function bg(color: Note['color']): string {
  return NOTE_COLOR_STYLES[color].bg
}
</script>

<template>
  <div class="history-page">
    <h2 class="heading">已完成</h2>
    <p v-if="!completedNotes.length" class="empty">还没有已完成的便利贴。</p>
    <ul v-else class="list">
      <li v-for="note in completedNotes" :key="note.id" class="item">
        <span class="stripe" :style="{ background: bg(note.color) }"></span>
        <div class="content">
          <p class="text">{{ note.text }}</p>
          <span class="time">{{ formatTime(note) }}</span>
        </div>
        <div class="actions">
          <button class="mini restore" @click="restore(note)">恢复</button>
          <button class="mini delete" @click="remove(note)">删除</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.history-page {
  height: 100%;
  overflow-y: auto;
  padding: 18px;
}

.heading {
  font-size: 20px;
  margin: 0 0 16px;
}

.empty {
  color: var(--text-muted);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 12px 14px;
}

.stripe {
  width: 6px;
  height: 44px;
  border-radius: 3px;
  flex-shrink: 0;
}

.content {
  flex: 1;
  min-width: 0;
}

.text {
  margin: 0 0 4px;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  font-size: 12px;
  color: var(--text-muted);
}

.actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.mini {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
}

.mini.restore {
  background: rgba(90, 150, 110, 0.16);
  color: #2f5a45;
}

.mini.delete {
  background: rgba(198, 93, 93, 0.14);
  color: var(--danger);
}
</style>
