"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const withAndroidGradle_1 = __importDefault(require("./withAndroidGradle"));
const withFmtWorkaround_1 = __importDefault(require("./withFmtWorkaround"));
const withIosInfoPlist_1 = __importDefault(require("./withIosInfoPlist"));
const withIosPodfile_1 = __importDefault(require("./withIosPodfile"));
const withDiveSdk = (config, props) => {
    const { cameraPermission, photoLibraryPermission, locationPermission, androidNdkVersion, applyFmtWorkaround = true, } = props ?? {};
    let cfg = config;
    cfg = (0, withIosInfoPlist_1.default)(cfg, {
        cameraPermission,
        photoLibraryPermission,
        locationPermission,
    });
    cfg = (0, withIosPodfile_1.default)(cfg);
    if (applyFmtWorkaround) {
        cfg = (0, withFmtWorkaround_1.default)(cfg);
    }
    cfg = (0, withAndroidGradle_1.default)(cfg, { androidNdkVersion });
    return cfg;
};
exports.default = withDiveSdk;
