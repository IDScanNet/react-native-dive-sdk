import { type ConfigPlugin, withInfoPlist } from '@expo/config-plugins';

export type IosInfoPlistProps = {
  cameraPermission?: string;
  photoLibraryPermission?: string;
  locationPermission?: string;
};

const DEFAULT_CAMERA = 'Camera access is required to scan identity documents';
const DEFAULT_PHOTO_LIBRARY =
  'Photo library access is required to upload document images';
const DEFAULT_LOCATION =
  'DIVE SDK needs your location for verification purposes';

const withDiveSdkInfoPlist: ConfigPlugin<IosInfoPlistProps> = (
  config,
  props = {}
) => {
  return withInfoPlist(config, (cfg) => {
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

export default withDiveSdkInfoPlist;
