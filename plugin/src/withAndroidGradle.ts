import {
  type ConfigPlugin,
  withProjectBuildGradle,
} from '@expo/config-plugins';

const DEFAULT_NDK_VERSION = '28.2.13676358';
const REQUIRED_MIN_SDK = 24;

export type AndroidGradleProps = {
  androidNdkVersion?: string;
};

const withDiveSdkAndroidGradle: ConfigPlugin<AndroidGradleProps> = (
  config,
  props = {}
) => {
  const ndkVersion = props.androidNdkVersion ?? DEFAULT_NDK_VERSION;

  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      return cfg;
    }

    let src = cfg.modResults.contents;

    src = src.replace(/minSdkVersion\s*=\s*(\d+)/, (match, val) => {
      const n = parseInt(val, 10);
      return n < REQUIRED_MIN_SDK
        ? `minSdkVersion = ${REQUIRED_MIN_SDK}`
        : match;
    });

    src = src.replace(
      /minSdkVersion\s*=\s*Integer\.parseInt\(\s*findProperty\(\s*'android\.minSdkVersion'\s*\)\s*\?:\s*'(\d+)'\s*\)/,
      (match, val) => {
        const n = parseInt(val, 10);
        return n < REQUIRED_MIN_SDK
          ? `minSdkVersion = Integer.parseInt(findProperty('android.minSdkVersion') ?: '${REQUIRED_MIN_SDK}')`
          : match;
      }
    );

    if (/ndkVersion\s*=\s*['"][^'"]*['"]/.test(src)) {
      src = src.replace(
        /ndkVersion\s*=\s*['"][^'"]*['"]/,
        `ndkVersion = '${ndkVersion}'`
      );
    } else if (/^\s*ndkVersion\s+['"][^'"]*['"]/m.test(src)) {
      src = src.replace(
        /^(\s*)ndkVersion\s+['"][^'"]*['"]/m,
        `$1ndkVersion '${ndkVersion}'`
      );
    } else if (/\bext\s*\{[^\n]*\n/.test(src)) {
      src = src.replace(
        /(\bext\s*\{[^\n]*\n)/,
        `$1        ndkVersion = '${ndkVersion}'\n`
      );
    } else {
      // Expo SDK 54+ template: no ext block in build.gradle — append one.
      // app/build.gradle reads rootProject.ext.* so this ext block supplies the values.
      src =
        src +
        `\next {\n    minSdkVersion = ${REQUIRED_MIN_SDK}\n    ndkVersion = '${ndkVersion}'\n}\n`;
    }

    cfg.modResults.contents = src;
    return cfg;
  });
};

export default withDiveSdkAndroidGradle;
