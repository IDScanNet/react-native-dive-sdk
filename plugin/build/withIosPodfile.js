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
const REQUIRE_LINE = "require_relative '../node_modules/react-native-dive-sdk/ios/dive_sdk_spm'";
const SPM_CALL = 'add_dive_sdk_spm(installer)';
const withDiveSdkPodfile = (config) => {
    return (0, config_plugins_1.withDangerousMod)(config, [
        'ios',
        async (cfg) => {
            const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
            let src = await fs.promises.readFile(podfilePath, 'utf8');
            const original = src;
            if (!src.includes(REQUIRE_LINE)) {
                src = src.replace(/^(require\s+[^\n]+)$/m, `$1\n${REQUIRE_LINE}`);
            }
            if (!src.includes(SPM_CALL)) {
                src = src.replace(/^([ \t]*)(react_native_post_install\()/m, `$1${SPM_CALL}\n$1$2`);
            }
            if (src !== original) {
                await fs.promises.writeFile(podfilePath, src, 'utf8');
            }
            return cfg;
        },
    ]);
};
exports.default = withDiveSdkPodfile;
