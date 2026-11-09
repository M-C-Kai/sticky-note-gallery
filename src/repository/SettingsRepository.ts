export interface SettingsRepository {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

export const SETTING_KEYS = {
  canvasMotionEnabled: 'canvas.motion.enabled',
  canvasMotionStrength: 'canvas.motion.strength',
  widgetMaxItems: 'widget.max_items',
  hapticEnabled: 'haptic.enabled',
} as const
