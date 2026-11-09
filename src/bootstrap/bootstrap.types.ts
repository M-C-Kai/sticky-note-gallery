export type BootstrapStatus =
  | 'idle'
  | 'initializing-database'
  | 'running-migrations'
  | 'loading-notes'
  | 'ready'
  | 'failed'

export interface BootstrapProgress {
  status: BootstrapStatus
  message: string
}

export type BootstrapStepStatus = 'pending' | 'running' | 'success' | 'failed'

export type BootstrapStepKey =
  | 'application'
  | 'platform'
  | 'sqlite-plugin'
  | 'database'
  | 'migration'
  | 'health'
  | 'repository'
  | 'notes'
  | 'settings'

export interface BootstrapStep {
  key: BootstrapStepKey
  label: string
  status: BootstrapStepStatus
  detail?: string
}

export interface RuntimeErrorInfo {
  source: string
  message: string
  occurredAt: number
}

export interface BootstrapRuntimeInfo {
  platform: string
  storageAdapter: string
  sqlitePluginLoaded: boolean
}

export interface BootstrapReporter {
  progress: (progress: BootstrapProgress) => void
  step: (
    key: BootstrapStepKey,
    status: BootstrapStepStatus,
    detail?: string,
  ) => void
  runtime: (info: BootstrapRuntimeInfo) => void
}
