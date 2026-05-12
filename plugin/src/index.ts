import { type ConfigPlugin } from '@expo/config-plugins';

import withDiveSdkAndroidGradle, {
  type AndroidGradleProps,
} from './withAndroidGradle';
import withDiveSdkFmtWorkaround from './withFmtWorkaround';
import withDiveSdkInfoPlist, {
  type IosInfoPlistProps,
} from './withIosInfoPlist';
import withDiveSdkPodfile from './withIosPodfile';

export type DiveSdkPluginProps = IosInfoPlistProps &
  AndroidGradleProps & {
    applyFmtWorkaround?: boolean;
  };

const withDiveSdk: ConfigPlugin<DiveSdkPluginProps | void> = (
  config,
  props
) => {
  const {
    cameraPermission,
    photoLibraryPermission,
    locationPermission,
    androidNdkVersion,
    applyFmtWorkaround = true,
  } = props ?? {};

  let cfg = config;

  cfg = withDiveSdkInfoPlist(cfg, {
    cameraPermission,
    photoLibraryPermission,
    locationPermission,
  });

  cfg = withDiveSdkPodfile(cfg);

  if (applyFmtWorkaround) {
    cfg = withDiveSdkFmtWorkaround(cfg);
  }

  cfg = withDiveSdkAndroidGradle(cfg, { androidNdkVersion });

  return cfg;
};

export default withDiveSdk;
