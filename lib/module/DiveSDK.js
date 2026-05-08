"use strict";

import { NativeModules } from 'react-native';
import { resolveBaseUrl, resolveUserAgent } from "./environment.js";
function getDiveSDKModule() {
  const module = NativeModules.DiveSDKModule;
  if (!module) {
    throw new Error('react-native-dive-sdk: NativeModule not found. Make sure the library is linked correctly.');
  }
  return module;
}

/**
 * Parse native result map into a typed DiveResult discriminated union.
 */
function parseNativeResult(nativeResult) {
  console.log('[DiveSDK] parseNativeResult: raw nativeResult =', JSON.stringify(nativeResult));
  if (!nativeResult) {
    console.log('[DiveSDK] parseNativeResult: nativeResult is null/undefined → cancelled');
    return {
      type: 'cancelled'
    };
  }
  if (nativeResult.success) {
    const result = {
      type: 'success',
      requestKey: nativeResult.requestKey ?? '',
      fullResult: nativeResult.fullResult
    };
    console.log('[DiveSDK] parseNativeResult: success, requestKey=', result.requestKey, 'hasFullResult=', result.fullResult != null);
    return result;
  }
  console.log('[DiveSDK] parseNativeResult: success=false, nativeResult.success=', nativeResult.success, '→ cancelled');
  return {
    type: 'cancelled'
  };
}

/**
 * Launch DIVE SDK in offline (server verification) mode.
 * Returns a Promise that resolves with the scan result.
 */
export async function launchDive(options) {
  if (!options.configuration || !Array.isArray(options.configuration.documentTypes) || options.configuration.documentTypes.length === 0) {
    return {
      type: 'error',
      code: 'CONFIGURATION_ERROR',
      message: 'launchDive: `configuration.documentTypes` must be a non-empty array'
    };
  }
  const baseUrl = resolveBaseUrl(options.baseUrl) ?? null;
  const userAgent = resolveUserAgent(options.userAgent) ?? null;
  console.log('[DiveSDK] launchDive: calling native module, baseUrl=', baseUrl);
  try {
    const nativeResult = await getDiveSDKModule().launchDive(options.token, options.licenseKey, options.configuration, baseUrl, userAgent, options.theme ?? null, options.ios ?? null, options.android ?? null);
    console.log('[DiveSDK] launchDive: native module resolved');
    return parseNativeResult(nativeResult);
  } catch (error) {
    console.log('[DiveSDK] launchDive: native module rejected, code=', error.code, 'message=', error.message);
    if (error.code === 'USER_CANCELLED') {
      return {
        type: 'cancelled'
      };
    }
    return {
      type: 'error',
      code: error.code ?? 'UNKNOWN',
      message: error.message ?? 'Unknown error'
    };
  }
}

/**
 * Launch DIVE Online SDK for full online verification.
 *
 * The applicant must be created server-side via
 * `POST {baseUrl}/private/Applicants` (using a secret `sk_*` token); the
 * resulting `applicantId` is then passed here. The mobile client must use a
 * publishable `pk_*` token only.
 */
export async function launchDiveOnline(options) {
  if (!options.applicantId) {
    return {
      type: 'error',
      code: 'CONFIGURATION_ERROR',
      message: 'launchDiveOnline: `applicantId` is required. Create the applicant on your server (POST /private/Applicants with a secret token) and pass the returned id here.'
    };
  }
  console.log('[DiveSDK] launchDiveOnline: calling native module, baseUrl=', options.baseUrl);
  try {
    const nativeResult = await getDiveSDKModule().launchDiveOnline(options.token, options.integrationId, options.baseUrl, options.applicantId, options.theme ?? null, options.ios ?? null, options.android ?? null);
    console.log('[DiveSDK] launchDiveOnline: native module resolved');
    return parseNativeResult(nativeResult);
  } catch (error) {
    console.log('[DiveSDK] launchDiveOnline: native module rejected, code=', error.code, 'message=', error.message);
    if (error.code === 'USER_CANCELLED') {
      return {
        type: 'cancelled'
      };
    }
    return {
      type: 'error',
      code: error.code ?? 'UNKNOWN',
      message: error.message ?? 'Unknown error'
    };
  }
}
//# sourceMappingURL=DiveSDK.js.map