import { type ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

const FMT_GUARD = "target.name == 'fmt'";

const FMT_BLOCK = `installer.pods_project.targets.each do |target|
  if target.name == 'fmt'
    target.build_configurations.each do |build_config|
      build_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
    end
  end
end`;

const withDiveSdkFmtWorkaround: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        'Podfile'
      );
      let src = await fs.promises.readFile(podfilePath, 'utf8');

      if (src.includes(FMT_GUARD)) {
        return cfg;
      }

      const replaced = src.replace(
        /^([ \t]*)(post_install\s+do\s+\|installer\|\s*\n)/m,
        (_match, leading, signature) => {
          const innerIndent = leading + '  ';
          const indented = FMT_BLOCK.split('\n')
            .map((line) => (line ? innerIndent + line : line))
            .join('\n');
          return leading + signature + indented + '\n';
        }
      );

      if (replaced !== src) {
        await fs.promises.writeFile(podfilePath, replaced, 'utf8');
      }
      return cfg;
    },
  ]);
};

export default withDiveSdkFmtWorkaround;
