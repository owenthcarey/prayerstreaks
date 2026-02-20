import { defineConfig } from '@norrix/cli';

export default defineConfig({
  ios: {
    teamId: '984WS83CKT',
    distributionType: 'appstore',
  },
  android: {
    keystorePath: './signing/release.keystore',
    keyAlias: 'prayerstreaks',
  },
  defaultConfiguration: 'release',
});
