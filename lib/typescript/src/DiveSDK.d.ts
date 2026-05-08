import type { DiveLaunchOptions, DiveOnlineLaunchOptions, DiveResult } from './types';
/**
 * Launch DIVE SDK in offline (server verification) mode.
 * Returns a Promise that resolves with the scan result.
 */
export declare function launchDive(options: DiveLaunchOptions): Promise<DiveResult>;
/**
 * Launch DIVE Online SDK for full online verification.
 *
 * The applicant must be created server-side via
 * `POST {baseUrl}/private/Applicants` (using a secret `sk_*` token); the
 * resulting `applicantId` is then passed here. The mobile client must use a
 * publishable `pk_*` token only.
 */
export declare function launchDiveOnline(options: DiveOnlineLaunchOptions): Promise<DiveResult>;
//# sourceMappingURL=DiveSDK.d.ts.map