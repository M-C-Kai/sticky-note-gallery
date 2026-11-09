<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Capacitor } from '@capacitor/core'
import { useBootstrapStore } from '@/bootstrap/bootstrapStore'
import { BUILD_INFO } from '@/generated/buildInfo'
import { database, type DatabaseStatus } from '@/infrastructure/db/Database'
import {
  getRepositoryRuntimeInfo,
  type RepositoryRuntimeInfo,
} from '@/infrastructure/db/repositoryFactory'
import { useNoteStore } from '@/stores/noteStore'
import { useSettingsStore } from '@/stores/settingsStore'

interface StatusRow {
  label: string
  value: string
  tone?: 'ok' | 'error' | 'muted'
}

const bootstrap = useBootstrapStore()
const noteStore = useNoteStore()
const settingsStore = useSettingsStore()
const {
  isReady,
  readyAt,
  lastRuntimeError,
  sqlitePluginLoaded,
} = storeToRefs(bootstrap)
const { initialized: notesInitialized } = storeToRefs(noteStore)
const { initialized: settingsInitialized } = storeToRefs(settingsStore)

const databaseStatus = ref<DatabaseStatus>(database.getStatus())
const repositoryInfo = ref<RepositoryRuntimeInfo>(getRepositoryRuntimeInfo())
const checking = ref(false)
const checkError = ref<string | null>(null)
const showDebugError = import.meta.env.DEV

const isNative = computed(() => repositoryInfo.value.noteRepository === 'sqlite')

function platformLabel(platform: string): string {
  if (platform === 'android') return 'Android'
  if (platform === 'ios') return 'iOS'
  if (platform === 'web') return 'Web'
  return platform
}

function formatTime(timestamp: number | null): string {
  if (!timestamp) return '无'
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const rows = computed<StatusRow[]>(() => {
  const native = isNative.value
  const db = databaseStatus.value
  const info = repositoryInfo.value
  const noteCount = native
    ? db.notesCount
    : noteStore.activeNotes.length + noteStore.completedNotes.length
  const widgetAvailable = Capacitor.isPluginAvailable('WidgetBridge')

  return [
    { label: '版本', value: BUILD_INFO.version },
    { label: '构建时间', value: BUILD_INFO.buildTime },
    { label: 'Build ID', value: BUILD_INFO.buildId },
    { label: '应用状态', value: isReady.value ? '正常' : '异常', tone: isReady.value ? 'ok' : 'error' },
    { label: '运行平台', value: platformLabel(info.platform) },
    { label: '存储实现', value: info.storageAdapter },
    {
      label: 'SQLite 插件',
      value: native ? (sqlitePluginLoaded.value ? '已加载' : '未加载') : '不适用',
      tone: native && !sqlitePluginLoaded.value ? 'error' : native ? 'ok' : 'muted',
    },
    {
      label: 'Repository',
      value: info.noteRepositoryReady ? '已就绪' : '未就绪',
      tone: info.noteRepositoryReady ? 'ok' : 'error',
    },
    {
      label: '数据库',
      value: native ? (db.ready && db.connectionOpen ? 'Ready / 已连接' : '异常') : '不适用',
      tone: native ? (db.ready && db.connectionOpen ? 'ok' : 'error') : 'muted',
    },
    {
      label: '数据库结构',
      value: native ? (db.migrationReady ? '已就绪' : '未就绪') : '不适用',
      tone: native ? (db.migrationReady ? 'ok' : 'error') : 'muted',
    },
    {
      label: '数据库检查',
      value: native ? (db.healthCheckPassed ? '正常' : '失败') : '不适用',
      tone: native ? (db.healthCheckPassed ? 'ok' : 'error') : 'muted',
    },
    { label: '便利贴记录', value: noteCount == null ? '未知' : `${noteCount} 条` },
    {
      label: '便利贴数据',
      value: notesInitialized.value ? '已加载' : '未加载',
      tone: notesInitialized.value ? 'ok' : 'error',
    },
    {
      label: '应用配置',
      value: settingsInitialized.value ? '已加载' : '未加载',
      tone: settingsInitialized.value ? 'ok' : 'error',
    },
    {
      label: 'Widget Bridge',
      value: native ? (widgetAvailable ? '可用' : '不可用') : '不适用',
      tone: native ? (widgetAvailable ? 'ok' : 'error') : 'muted',
    },
    { label: '最后启动', value: formatTime(readyAt.value) },
    {
      label: '最后错误',
      value: lastRuntimeError.value
        ? `${lastRuntimeError.value.source} · ${formatTime(lastRuntimeError.value.occurredAt)}`
        : '无',
      tone: lastRuntimeError.value ? 'error' : 'muted',
    },
  ]
})

function refreshSnapshot(): void {
  databaseStatus.value = database.getStatus()
  repositoryInfo.value = getRepositoryRuntimeInfo()
}

async function recheck(): Promise<void> {
  if (checking.value) return
  checking.value = true
  checkError.value = null
  try {
    if (isNative.value) {
      await database.checkHealth()
    }
  } catch (error) {
    checkError.value = error instanceof Error ? error.message : String(error)
    bootstrap.recordRuntimeError('database-check', error)
    console.error('[database-check]', error)
  } finally {
    refreshSnapshot()
    checking.value = false
  }
}
</script>

<template>
  <section class="runtime-panel">
    <h3>运行状态</h3>
    <dl class="status-list">
      <template v-for="row in rows" :key="row.label">
        <dt>{{ row.label }}</dt>
        <dd :class="row.tone">{{ row.value }}</dd>
      </template>
    </dl>
    <p v-if="showDebugError && (checkError || lastRuntimeError)" class="runtime-error">
      {{ checkError ?? lastRuntimeError?.message }}
    </p>
    <button type="button" class="recheck-button" :disabled="checking" @click="recheck">
      {{ checking ? '检查中…' : '重新检查' }}
    </button>
  </section>
</template>

<style scoped>
.runtime-panel {
  max-width: 480px;
  margin: 0 auto 24px;
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-sm);
}

h3 {
  margin: 0 0 14px;
  font-size: 15px;
}

.status-list {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px 18px;
  margin: 0;
  font-size: 13px;
}

dt {
  color: var(--text-muted);
}

dd {
  margin: 0;
  color: var(--text-primary);
  text-align: right;
}

dd.ok {
  color: #39704f;
}

dd.error,
.runtime-error {
  color: var(--danger);
}

dd.muted {
  color: var(--text-muted);
}

.runtime-error {
  margin: 14px 0 0;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.recheck-button {
  margin-top: 16px;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(60, 50, 30, 0.07);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
}

.recheck-button:disabled {
  opacity: 0.55;
}
</style>
