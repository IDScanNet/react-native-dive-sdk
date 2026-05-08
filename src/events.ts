import { NativeModules, NativeEventEmitter } from 'react-native';
import type { DiveUploadProgressEvent } from './types';

const { DiveSDKModule } = NativeModules;
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
export function addUploadProgressListener(
  callback: (event: DiveUploadProgressEvent) => void
): () => void {
  const subscription = emitter.addListener(
    UPLOAD_PROGRESS_EVENT,
    (progress: unknown) => {
      callback({ progress: progress as number });
    }
  );
  return () => subscription.remove();
}
