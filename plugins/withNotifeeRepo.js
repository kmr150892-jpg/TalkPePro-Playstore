// Notifee oda local maven repo ah android/build.gradle la auto add pannum (prebuild --clean kku aprom um)
const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withNotifeeRepo(config) {
  return withProjectBuildGradle(config, (cfg) => {
    const marker = '@notifee/react-native/android/libs';
    const repoLine = 'maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }';

    if (cfg.modResults.language === 'groovy' && !cfg.modResults.contents.includes(marker)) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /allprojects\s*\{\s*repositories\s*\{/,
        (m) => m + '\n    ' + repoLine
      );
    }
    return cfg;
  });
};