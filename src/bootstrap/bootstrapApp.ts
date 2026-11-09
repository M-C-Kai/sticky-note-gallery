import { Capacitor } from '@capacitor/core'
import { database, type DatabaseInitStage } from '@/infrastructure/db/Database'
import {
  createNoteRepository,
  getRepositoryRuntimeInfo,
} from '@/infrastructure/db/repositoryFactory'
import { useNoteStore } from '@/stores/noteStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { BootstrapReporter } from './bootstrap.types'

function reportDatabaseStage(stage: DatabaseInitStage, report: BootstrapReporter): void {
  if (stage === 'opening') {
    report.progress({
      status: 'initializing-database',
      message: '正在准备本地数据库…',
    })
    report.step('database', 'running')
  } else if (stage === 'running-migrations') {
    report.step('database', 'success', '已连接')
    report.step('migration', 'running')
    report.progress({
      status: 'running-migrations',
      message: '正在整理本地数据…',
    })
  } else if (stage === 'migrations-ready') {
    report.step('migration', 'success', '已就绪')
    console.info('[bootstrap] migrations ready')
  } else {
    report.step('health', 'running')
    report.progress({
      status: 'running-migrations',
      message: '正在检查本地数据…',
    })
  }
}

export async function bootstrapApp(report: BootstrapReporter): Promise<void> {
  console.info('[bootstrap] start')
  report.step('application', 'success')

  const platform = Capacitor.getPlatform()
  const native = Capacitor.isNativePlatform()
  const platformLabel = platform === 'android' ? 'Android' : platform === 'ios' ? 'iOS' : 'Web'
  const sqlitePluginRegistered = native && Capacitor.isPluginAvailable('CapacitorSQLite')
  report.runtime({
    platform,
    storageAdapter: native ? 'Native SQLite' : 'LocalStorage',
    sqlitePluginLoaded: sqlitePluginRegistered,
  })
  report.step('platform', 'success', platformLabel)
  report.progress({
    status: 'initializing-database',
    message: '正在准备本地数据…',
  })

  if (native) {
    report.step(
      'sqlite-plugin',
      sqlitePluginRegistered ? 'success' : 'running',
      sqlitePluginRegistered ? 'Native' : undefined,
    )
    await database.init({
      onStage: (stage) => reportDatabaseStage(stage, report),
    })
    report.runtime({
      platform,
      storageAdapter: 'Native SQLite',
      sqlitePluginLoaded: true,
    })
    report.step('sqlite-plugin', 'success', 'Native')
    report.step('database', 'success', '已连接')
    report.step('migration', 'success', '已就绪')
    report.step('health', 'success', '正常')
  } else {
    // Web uses the LocalStorage repository adapter and has no SQLite migration.
    report.step('sqlite-plugin', 'success', 'Web 不使用')
    report.step('database', 'success', 'LocalStorage')
    report.step('migration', 'success', '不适用')
    report.step('health', 'success', '不适用')
    console.info('[bootstrap] migrations ready')
  }
  console.info('[bootstrap] database ready')

  // Creating the native repository is intentionally after database readiness.
  report.step('repository', 'running')
  createNoteRepository()
  const repositoryInfo = getRepositoryRuntimeInfo()
  report.step('repository', 'success', repositoryInfo.storageAdapter)

  report.step('notes', 'running')
  report.progress({
    status: 'loading-notes',
    message: '正在加载便签…',
  })
  const noteStore = useNoteStore()
  const activeCount = await noteStore.initialize()
  report.step('notes', 'success', `${activeCount} 条`)

  report.step('settings', 'running')
  const settingsStore = useSettingsStore()
  settingsStore.initialize()
  report.step('settings', 'success', '已加载')

  console.info(`[bootstrap] notes loaded count=${activeCount}`)
  report.progress({ status: 'ready', message: '本地数据已准备完成' })
  console.info('[bootstrap] ready')

  // Widget data is a rebuildable cache and must never block the startup gate.
  void noteStore.reconcileWidget().catch((error: unknown) => {
    console.error('[widget-sync]', error)
  })
}
