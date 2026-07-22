const { withStringsXml, AndroidConfig } = require('@expo/config-plugins');

// The app's Xcode/Gradle project name is derived from `expo.name`, and Expo's
// sanitizer strips accented characters (e.g. "GuériEnergies" -> "GuriEnergies").
// So `expo.name` is kept accent-free ("GueriEnergies") to get a clean native
// project name, and the user-facing display name is restored per-platform:
// iOS via ios.infoPlist.CFBundleDisplayName, Android via this plugin.
const DISPLAY_NAME = 'GuériEnergies';

module.exports = function withAndroidDisplayName(config) {
  return withStringsXml(config, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      [{ _: DISPLAY_NAME, $: { name: 'app_name', translatable: 'false' } }],
      cfg.modResults
    );
    return cfg;
  });
};
