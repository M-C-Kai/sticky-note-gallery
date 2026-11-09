import { Capacitor } from '@capacitor/core'
import { registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import type { WidgetBridge } from './WidgetBridge'
import type { WidgetSnapshot } from '@/domain/widget'

interface WidgetBridgeNative {
  sync(options: { snapshot: string }): Promise<void>
  reload(): Promise<void>
  addListener(
    eventName: 'widgetCompletions',
    listener: (data: { ids: string[] }) => void,
  ): Promise<PluginListenerHandle>
}

const native = Capacitor.isNativePlatform()
  ? registerPlugin<WidgetBridgeNative>('WidgetBridge')
  : null

/**
 * Crosses the Web/Native boundary. On web there is no native widget, so all
 * operations are no-ops and the app relies on the local SQLite/localStorage
 * store only.
 */
export class CapacitorWidgetBridge implements WidgetBridge {
  async sync(snapshot: WidgetSnapshot): Promise<void> {
    if (!native) return
    await native.sync({ snapshot: JSON.stringify(snapshot) })
  }

  async reload(): Promise<void> {
    if (!native) return
    await native.reload()
  }

  onCompletions(listener: (ids: string[]) => void): void {
    if (!native) return
    void native.addListener('widgetCompletions', (data: { ids: string[] }) => {
      listener(data.ids)
    })
  }
}
