import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.max.connectivity',
  appName: 'MAX Connectivity',
  webDir: 'out',
  server: {
    url: 'https://frontend-mu-gules-75.vercel.app',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: '#0A0A0F',
      androidSplashResourceName: 'splash',
      showSpinner: false
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
