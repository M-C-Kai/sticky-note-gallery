import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { bootstrapApp } from './bootstrapApp'
import type {
  BootstrapProgress,
  BootstrapRuntimeInfo,
  BootstrapStatus,
  BootstrapStep,
  BootstrapStepKey,
  BootstrapStepStatus,
  RuntimeErrorInfo,
} from './bootstrap.types'

function createSteps(): BootstrapStep[] {
  return [
    { key: 'application', label: '应用启动', status: 'pending' },
    { key: 'platform', label: '运行环境', status: 'pending' },
    { key: 'sqlite-plugin', label: 'SQLite 插件', status: 'pending' },
    { key: 'database', label: '本地数据库', status: 'pending' },
    { key: 'migration', label: '数据库结构', status: 'pending' },
    { key: 'health', label: '数据库检查', status: 'pending' },
    { key: 'repository', label: '存储实现', status: 'pending' },
    { key: 'notes', label: '便利贴数据', status: 'pending' },
    { key: 'settings', label: '应用配置', status: 'pending' },
  ]
}

export const useBootstrapStore = defineStore('bootstrap', () => {
  const status = ref<BootstrapStatus>('idle')
  const message = ref('正在启动…')
  const error = ref<string | null>(null)
  const steps = ref<BootstrapStep[]>(createSteps())
  const readyAt = ref<number | null>(null)
  const lastRuntimeError = ref<RuntimeErrorInfo | null>(null)
  const platform = ref('unknown')
  const storageAdapter = ref('unknown')
  const sqlitePluginLoaded = ref(false)
  let activeRun: Promise<void> | null = null

  const isReady = computed(() => status.value === 'ready')
  const isBootstrapping = computed(
    () => status.value !== 'idle' && status.value !== 'ready' && status.value !== 'failed',
  )

  function update(progress: BootstrapProgress): void {
    status.value = progress.status
    message.value = progress.message
  }

  function updateStep(
    key: BootstrapStepKey,
    stepStatus: BootstrapStepStatus,
    detail?: string,
  ): void {
    steps.value = steps.value.map((step) =>
      step.key === key ? { ...step, status: stepStatus, detail } : step,
    )
  }

  function updateRuntime(info: BootstrapRuntimeInfo): void {
    platform.value = info.platform
    storageAdapter.value = info.storageAdapter
    sqlitePluginLoaded.value = info.sqlitePluginLoaded
  }

  function recordRuntimeError(source: string, runtimeError: unknown): void {
    lastRuntimeError.value = {
      source,
      message: runtimeError instanceof Error ? runtimeError.message : String(runtimeError),
      occurredAt: Date.now(),
    }
  }

  function start(): Promise<void> {
    if (activeRun) return activeRun
    error.value = null
    readyAt.value = null
    lastRuntimeError.value = null
    steps.value = createSteps()

    activeRun = bootstrapApp({
      progress: update,
      step: updateStep,
      runtime: updateRuntime,
    })
      .then(() => {
        readyAt.value = Date.now()
      })
      .catch((bootstrapError: unknown) => {
        error.value = bootstrapError instanceof Error ? bootstrapError.message : String(bootstrapError)
        status.value = 'failed'
        message.value = '无法初始化本地数据'
        steps.value = steps.value.map((step) =>
          step.status === 'running' ? { ...step, status: 'failed' } : step,
        )
        recordRuntimeError('bootstrap', bootstrapError)
        console.error('[bootstrap] failed', bootstrapError)
      })
      .finally(() => {
        activeRun = null
      })

    return activeRun
  }

  function retry(): Promise<void> {
    if (activeRun) return activeRun
    status.value = 'idle'
    message.value = '正在重新准备…'
    return start()
  }

  return {
    status,
    message,
    error,
    steps,
    readyAt,
    lastRuntimeError,
    platform,
    storageAdapter,
    sqlitePluginLoaded,
    isReady,
    isBootstrapping,
    start,
    retry,
    recordRuntimeError,
  }
})
