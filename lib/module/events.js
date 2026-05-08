"use strict";

import { NativeModules, NativeEventEmitter } from 'react-native';
const {
  DiveSDKModule
} = NativeModules;
const emitter = new NativeEventEmitter(DiveSDKModule);
const UPLOAD_PROGRESS_EVENT = 'DiveSDKUploadProgress';

/**
 * Subscribe to upload progress events during offline DIVE SDK data sending.
 * Progress is a float from 0.0 to 1.0.
 * Returns an unsubscribe function.
 *
 * Note: Upload progress is only available on iOS (offline mode).
 * On Android, this listener will never fire due to Fragment API limitations.
 */
export function addUploadProgressListener(callback) {
  const subscription = emitter.addListener(UPLOAD_PROGRESS_EVENT, progress => {
    callback({
      progress: progress
    });
  });
  return () => subscription.remove();
}
//# sourceMappingURL=events.js.map