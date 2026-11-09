import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.stickynote.app',
  appName: '便利贴',
  webDir: 'dist',
  android: {
    backgroundColor: '#f7f1e3',
  },
  ios: {
    contentInset: 'never',
  },
}

export default config
