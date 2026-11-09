import { defineStore } from 'pinia'
import { ref } from 'vue'
import { SETTING_KEYS } from '@/repository/SettingsRepository'
import type { DriftStrength } from '@/canvas/motion/DriftMotion'
import { DRIFT_STRENGTHS } from '@/canvas/motion/DriftMotion'

function read(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore quota / unavailable storage
  }
}

function isDriftStrength(value: string): value is DriftStrength {
  return (DRIFT_STRENGTHS as readonly string[]).includes(value)
}

function resolveDriftStrength(): DriftStrength {
  const value = read(SETTING_KEYS.canvasMotionStrength, 'normal')
  return isDriftStrength(value) ? value : 'normal'
}

function resolveWidgetMaxItems(): number {
  const value = Number(read(SETTING_KEYS.widgetMaxItems, '3'))
  return Number.isFinite(value) && value > 0 ? value : 3
}

function resolveHapticEnabled(): boolean {
  return read(SETTING_KEYS.hapticEnabled, 'true') === 'true'
}

export const useSettingsStore = defineStore('settings', () => {
  const driftStrength = ref<DriftStrength>(resolveDriftStrength())
  const widgetMaxItems = ref<number>(resolveWidgetMaxItems())
  const hapticEnabled = ref<boolean>(resolveHapticEnabled())
  const initialized = ref(false)

  function initialize(): void {
    driftStrength.value = resolveDriftStrength()
    widgetMaxItems.value = resolveWidgetMaxItems()
    hapticEnabled.value = resolveHapticEnabled()
    initialized.value = true
  }

  function setDriftStrength(value: DriftStrength): void {
    driftStrength.value = value
    write(SETTING_KEYS.canvasMotionStrength, value)
  }

  function setWidgetMaxItems(value: number): void {
    const clamped = Math.max(1, Math.min(8, Math.round(value)))
    widgetMaxItems.value = clamped
    write(SETTING_KEYS.widgetMaxItems, String(clamped))
  }

  function setHapticEnabled(value: boolean): void {
    hapticEnabled.value = value
    write(SETTING_KEYS.hapticEnabled, String(value))
  }

  return {
    driftStrength,
    widgetMaxItems,
    hapticEnabled,
    initialized,
    initialize,
    setDriftStrength,
    setWidgetMaxItems,
    setHapticEnabled,
  }
})
