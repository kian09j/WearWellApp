import type { CapacitorConfig } from '@capacitor/cli'

// The iOS and Android apps wrap the same web build (dist/). After `npm run build`, run
// `npx cap sync` to copy it into the native projects. See README for building each app.
const config: CapacitorConfig = {
  appId: 'com.wearwellapp.app',
  appName: 'WearWell',
  webDir: 'dist',
  backgroundColor: '#fbf6ec',
  android: {
    backgroundColor: '#fbf6ec',
  },
  ios: {
    backgroundColor: '#fbf6ec',
    contentInset: 'never',
  },
}

export default config
