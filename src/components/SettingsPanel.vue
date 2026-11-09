<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores/settingsStore'
import { DRIFT_STRENGTHS } from '@/canvas/motion/DriftMotion'
import type { DriftStrength } from '@/canvas/motion/DriftMotion'

const settings = useSettingsStore()
const { driftStrength, widgetMaxItems, hapticEnabled } = storeToRefs(settings)

const driftLabels: Record<DriftStrength, string> = {
  off: '关闭',
  soft: '轻柔',
  normal: '普通',
  strong: '明显',
}

function onMaxItems(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  settings.setWidgetMaxItems(value)
}
</script>

<template>
  <div class="settings-panel">
    <section class="group">
      <h3 class="group-title">漂浮动画</h3>
      <div class="segmented">
        <button
          v-for="s in DRIFT_STRENGTHS"
          :key="s"
          class="segment"
          :class="{ active: driftStrength === s }"
          @click="settings.setDriftStrength(s)"
        >
          {{ driftLabels[s] }}
        </button>
      </div>
    </section>

    <section class="group">
      <h3 class="group-title">Widget 展示数量</h3>
      <input
        class="range"
        type="range"
        min="1"
        max="8"
        :value="widgetMaxItems"
        @input="onMaxItems"
      />
      <span class="hint">当前：{{ widgetMaxItems }} 条</span>
    </section>

    <section class="group row">
      <div>
        <h3 class="group-title">触感反馈</h3>
        <p class="hint">撕纸完成时轻微震动</p>
      </div>
      <label class="switch">
        <input type="checkbox" :checked="hapticEnabled" @change="settings.setHapticEnabled(($event.target as HTMLInputElement).checked)" />
        <span class="track"></span>
      </label>
    </section>
  </div>
</template>

<style scoped>
.settings-panel {
  max-width: 480px;
  margin: 0 auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.group {
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 16px;
}

.group.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.group-title {
  margin: 0 0 12px;
  font-size: 15px;
}

.group.row .group-title {
  margin-bottom: 4px;
}

.hint {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.segmented {
  display: flex;
  gap: 8px;
}

.segment {
  flex: 1;
  padding: 9px 0;
  border-radius: 999px;
  background: rgba(60, 50, 30, 0.06);
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 600;
}

.segment.active {
  background: var(--accent);
  color: #4a3a15;
}

.range {
  width: 100%;
  accent-color: var(--accent);
}

.switch input {
  display: none;
}

.track {
  display: inline-block;
  width: 48px;
  height: 28px;
  border-radius: 999px;
  background: rgba(60, 50, 30, 0.2);
  position: relative;
  transition: background 0.15s ease;
  cursor: pointer;
}

.track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s ease;
}

.switch input:checked + .track {
  background: var(--accent);
}

.switch input:checked + .track::after {
  transform: translateX(20px);
}
</style>
