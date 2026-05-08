import type { DiveUploadProgressEvent } from './types';
/**
 * Subscribe to upload progress events during offline DIVE SDK data sending.
 * Progress is a float from 0.0 to 1.0.
 * Returns an unsubscribe function.
 *
 * Note: Upload progress is only available on iOS (offline mode).
 * On Android, this listener will never fire due to Fragment API limitations.
 */
export declare function addUploadProgressListener(callback: (event: DiveUploadProgressEvent) => void): () => void;
//# sourceMappingURL=events.d.ts.map