import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thegroves.inspection',
  appName: 'The Groves Inspection',
  webDir: 'dist',
  android: {
    buildOptions: {
      keystorePath: undefined,
    },
  },
  plugins: {
    Filesystem: {
      // Allow saving to external storage (Documents folder)
    },
  },
};

export default config;
