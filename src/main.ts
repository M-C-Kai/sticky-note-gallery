import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Capacitor } from '@capacitor/core'
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader'
import App from './App.vue'
import router from './router'
import './styles/theme.css'

const isNative = Capacitor.isNativePlatform()

if (!isNative) {
  jeepSqlite(window)
} else {
  // Native Android/iOS use the Capacitor SQLite plugin. The web-only custom
  // element must not participate in native hit testing or initialization.
  document.querySelector('jeep-sqlite')?.remove()
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
