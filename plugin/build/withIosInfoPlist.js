"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const DEFAULT_CAMERA = 'Camera access is required to scan identity documents';
const DEFAULT_PHOTO_LIBRARY = 'Photo library access is required to upload document images';
const DEFAULT_LOCATION = 'DIVE SDK needs your location for verification purposes';
const withDiveSdkInfoPlist = (config, props = {}) => {
    return (0, config_plugins_1.withInfoPlist)(config, (cfg) => {
        const plist = cfg.modResults;
        plist.NSCameraUsageDescription =
            props.cameraPermission ??
                plist.NSCameraUsageDescription ??
                DEFAULT_CAMERA;
        plist.NSPhotoLibraryUsageDescription =
            props.photoLibraryPermission ??
                plist.NSPhotoLibraryUsageDescription ??
                DEFAULT_PHOTO_LIBRARY;
        plist.NSLocationWhenInUseUsageDescription =
            props.locationPermission ??
                plist.NSLocationWhenInUseUsageDescription ??
                DEFAULT_LOCATION;
        return cfg;
    });
};
exports.default = withDiveSdkInfoPlist;
