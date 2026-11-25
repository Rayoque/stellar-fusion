import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stellarfusion.app',
  appName: 'Stellar Fusion',
  webDir: 'dist',
  backgroundColor: '#050508',
  ios: {
    contentInset: 'always',
    backgroundColor: '#050508',
  },
};

export default config;
