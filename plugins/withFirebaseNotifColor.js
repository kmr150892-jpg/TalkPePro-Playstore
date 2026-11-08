const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NAMES = [
  'com.google.firebase.messaging.default_notification_color',
  'com.google.firebase.messaging.default_notification_icon',
];

module.exports = (config) => {
  // main manifest
  config = withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const app = manifest.application && manifest.application[0];
    ((app && app['meta-data']) || []).forEach((m) => {
      if (NAMES.includes(m.$['android:name'])) {
        m.$['tools:replace'] = 'android:resource';
      }
    });
    return c;
  });

  // debug manifest (error adhula dhaan vandhuchu)
  config = withDangerousMod(config, [
    'android',
    async (c) => {
      const p = path.join(c.modRequest.platformProjectRoot, 'app/src/debug/AndroidManifest.xml');
      if (!fs.existsSync(p)) return c;
      let xml = fs.readFileSync(p, 'utf8');
      if (!xml.includes('xmlns:tools')) {
        xml = xml.replace('<manifest', '<manifest xmlns:tools="http://schemas.android.com/tools"');
      }
      NAMES.forEach((n) => {
        const re = new RegExp(`(<meta-data[^>]*android:name="${n}")(?![^>]*tools:replace)`, 'g');
        xml = xml.replace(re, '$1 tools:replace="android:resource"');
      });
      fs.writeFileSync(p, xml);
      return c;
    },
  ]);

  return config;
};