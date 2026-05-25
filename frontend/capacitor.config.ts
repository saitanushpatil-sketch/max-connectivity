import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.max.connectivity',
  appName: 'MAX',
  webDir: 'out',
  server: {
    url: 'https://frontend-mu-gules-75.vercel.app',
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['*']
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
