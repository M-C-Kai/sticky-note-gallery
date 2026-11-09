<script setup lang="ts">
import type { BootstrapStatus, BootstrapStep } from '@/bootstrap/bootstrap.types'

defineProps<{
  status: BootstrapStatus
  message: string
  error: string | null
  steps: BootstrapStep[]
}>()

const emit = defineEmits<{
  retry: []
}>()

const showDebugError = import.meta.env.DEV

function stepIcon(step: BootstrapStep): string {
  if (step.status === 'success') return '✓'
  if (step.status === 'failed') return '✕'
  if (step.status === 'running') return '→'
  return '○'
}
</script>

<template>
  <main class="bootstrap-screen" aria-live="polite">
    <section class="bootstrap-card">
      <h1>便利贴 App</h1>
      <p class="status-message">{{ message }}</p>
      <ul class="step-list">
        <li v-for="step in steps" :key="step.key" :class="`step-${step.status}`">
          <span class="step-icon" aria-hidden="true">{{ stepIcon(step) }}</span>
          <span class="step-label">{{ step.label }}</span>
          <span v-if="step.detail" class="step-detail">{{ step.detail }}</span>
        </li>
      </ul>
      <template v-if="status === 'failed'">
        <p class="failure-message">本地数据初始化失败</p>
        <p v-if="showDebugError && error" class="debug-error">{{ error }}</p>
        <button type="button" class="retry-button" @click="emit('retry')">重试</button>
      </template>
    </section>
  </main>
</template>

<style scoped>
.bootstrap-screen {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.bootstrap-card {
  width: min(360px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 28px 24px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md);
  text-align: center;
}

h1,
p {
  margin: 0;
}

h1 {
  font-size: 20px;
}

p {
  color: var(--text-muted);
  font-size: 14px;
}

.status-message {
  min-height: 20px;
}

.step-list {
  width: 100%;
  margin: 0;
  padding: 12px 0;
  list-style: none;
  border-top: 1px solid rgba(60, 50, 30, 0.08);
  border-bottom: 1px solid rgba(60, 50, 30, 0.08);
}

.step-list li {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  color: var(--text-muted);
  font-size: 13px;
  text-align: left;
}

.step-icon {
  font-weight: 700;
  text-align: center;
}

.step-detail {
  font-size: 12px;
}

.step-success {
  color: var(--text-primary) !important;
}

.step-running .step-icon {
  color: var(--accent-strong);
}

.step-failed,
.failure-message {
  color: var(--danger) !important;
}

.debug-error {
  max-width: 100%;
  color: var(--danger);
  overflow-wrap: anywhere;
}

.retry-button {
  padding: 8px 18px;
  border-radius: 999px;
  background: var(--accent);
  color: #4a3a15;
  font-weight: 600;
}

</style>
