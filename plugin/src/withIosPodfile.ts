import { type ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

const REQUIRE_LINE =
  "require_relative '../node_modules/react-native-dive-sdk/ios/dive_sdk_spm'";
const SPM_CALL = 'add_dive_sdk_spm(installer)';

const withDiveSdkPodfile: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        'Podfile'
      );
      let src = await fs.promises.readFile(podfilePath, 'utf8');
      const original = src;

      if (!src.includes(REQUIRE_LINE)) {
        src = src.replace(/^(require\s+[^\n]+)$/m, `$1\n${REQUIRE_LINE}`);
      }

      if (!src.includes(SPM_CALL)) {
        src = src.replace(
          /^([ \t]*)(react_native_post_install\()/m,
          `$1${SPM_CALL}\n$1$2`
        );
      }

      if (src !== original) {
        await fs.promises.writeFile(podfilePath, src, 'utf8');
      }
      return cfg;
    },
  ]);
};

export default withDiveSdkPodfile;
