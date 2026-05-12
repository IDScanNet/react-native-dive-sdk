"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const FMT_GUARD = "target.name == 'fmt'";
const FMT_BLOCK = `installer.pods_project.targets.each do |target|
  if target.name == 'fmt'
    target.build_configurations.each do |build_config|
      build_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
    end
  end
end`;
const withDiveSdkFmtWorkaround = (config) => {
    return (0, config_plugins_1.withDangerousMod)(config, [
        'ios',
        async (cfg) => {
            const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
            let src = await fs.promises.readFile(podfilePath, 'utf8');
            if (src.includes(FMT_GUARD)) {
                return cfg;
            }
            const replaced = src.replace(/^([ \t]*)(post_install\s+do\s+\|installer\|\s*\n)/m, (_match, leading, signature) => {
                const innerIndent = leading + '  ';
                const indented = FMT_BLOCK.split('\n')
                    .map((line) => (line ? innerIndent + line : line))
                    .join('\n');
                return leading + signature + indented + '\n';
            });
            if (replaced !== src) {
                await fs.promises.writeFile(podfilePath, replaced, 'utf8');
            }
            return cfg;
        },
    ]);
};
exports.default = withDiveSdkFmtWorkaround;
