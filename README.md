# react-native-dive-sdk

React Native wrapper for [IDScan DIVE SDK](https://idscan.net) — exposes both **DIVE SDK**  and **DIVE Online** on iOS and Android.

## Requirements

| | Minimum version |
|---|---|
| React Native | 0.73 |
| iOS | 13.4 |
| Android | API 24 (Android 7.0) |
| Node.js | 18 |

New Architecture (TurboModules) is required. Legacy Architecture is not supported.

### Native SDK versions

The wrapper bundles fixed versions of the upstream IDScan SDKs. Use this table
to map a wrapper release to the corresponding upstream changelog.

| Platform | Native SDK | Version | Source of truth |
|---|---|---|---|
| iOS | [DIVE-SDK-iOS](https://github.com/IDScanNet/DIVE-SDK-iOS) (XCFramework — contains both DIVE SDK and DIVE Online) | `3.251121.1` | [`ios/dive_sdk_spm.rb`](ios/dive_sdk_spm.rb) |
| Android | [DIVE-SDK-Android](https://github.com/IDScanNet/DIVE-SDK-Android) — `net.idscan.components.android:dvs` | `1.14.0` | [`android/build.gradle`](android/build.gradle) |
| Android | [DIVE-ONLINE-SDK-Android](https://github.com/IDScanNet/DIVE-ONLINE-SDK-Android) — `net.idscan.components.android:dvsonline` | `1.14.0` | [`android/build.gradle`](android/build.gradle) |

## Updating the native SDK without updating the RN module

The RN module pins specific versions of each upstream native SDK. If IDScan
releases a bugfix or a new feature you need, you can pull it in by editing two
files — no changes to the JS/TS layer are required.

> **Before bumping a native SDK version:** check whether a newer release of
> this RN module already pins the version you need — upgrading the module
> itself is the safer path and avoids native API mismatches.

> **Major version bumps:** a major native SDK release often changes native APIs
> that the RN module bridges directly (method signatures, result types, config
> structs). In that case you **must** update the RN module alongside the native
> SDK version — bumping the version string alone will break the build or cause
> runtime crashes.

### iOS

**File:** [`ios/dive_sdk_spm.rb`](ios/dive_sdk_spm.rb), line 21

```ruby
DIVE_SDK_SPM_VERSION = "3.251121.1"   # ← change this to the new tag
```

The tag must match a release tag in the
[DIVE-SDK-iOS](https://github.com/IDScanNet/DIVE-SDK-iOS) repository.

After editing:

```sh
# Delete the resolved SPM cache so CocoaPods fetches the new version.
# The exact path depends on where Xcode stores DerivedData for your workspace
# (Xcode → File → Project Settings shows the build location).
rm -rf ~/Library/Developer/Xcode/DerivedData/<YourApp-hash>/SourcePackages

cd ios && pod install
```

### Android

**File:** [`android/build.gradle`](android/build.gradle)

```groovy
dependencies {
  implementation "net.idscan.components.android:dvs:1.14.0"       // ← bump this
  implementation "net.idscan.components.android:dvsonline:1.14.0" // ← and/or this
}
```

Both packages are published to Maven Central. To check available versions:

- `dvs` — [maven central: dvs](https://central.sonatype.com/artifact/net.idscan.components.android/dvs)
- `dvsonline` — [maven central: dvsonline](https://central.sonatype.com/artifact/net.idscan.components.android/dvsonline)

After editing, run a Gradle sync (**Android Studio → File → Sync Project with
Gradle Files**) or trigger a build — Gradle resolves and downloads the new
version automatically.

### Verification checklist

1. Build on both platforms to confirm the RN module still compiles (`npx tsc --noEmit` + native build).
2. Test `launchDive` and `launchDiveOnline` end-to-end on a physical device.
3. Update the version strings in the [Native SDK versions](#native-sdk-versions) table above.

---

## Installation

```sh
# Latest version from main branch:
npm install IDScanNet/react-native-dive-sdk
# or
yarn add IDScanNet/react-native-dive-sdk

# Specific release tag (recommended for production):
npm install IDScanNet/react-native-dive-sdk#v0.2.0
```

---

## Accounts and credentials

Both products require credentials issued by IDScan. Request them from
**support@idscan.net**.

### DIVE SDK (`launchDive`)

You need a **license key** bound to your app's bundle id / `applicationId`. Two ways to obtain it:

- Sign in to the DIVE SDK portal at <https://mydive.idscan.net/> and generate it
  on the **Access Tokens** page; or
- Email **support@idscan.net** with the bundle id (iOS) and `applicationId`
  (Android) you intend to ship, and they will issue the license.

You also need an `token` (DVS API token) provided alongside the license.

### DIVE Online

Sign up at the DIVE Online portal (request access via support@idscan.net). In
the portal you need to:

1. Generate two tokens: a publishable `pk_*` (mobile) and a secret `sk_*` (server only).
2. Create a **Bundle** for each platform you ship — one bound to your iOS
   bundle id, one bound to your Android `applicationId`. Each Bundle has its
   own `integrationId` (UUID). Use the right one at runtime via `Platform.OS`.

---

## iOS Setup

### 1. Add to your Podfile

```ruby
require_relative '../node_modules/react-native-dive-sdk/ios/dive_sdk_spm'

target 'YourApp' do
  # ... existing pods ...
end

post_install do |installer|
  add_dive_sdk_spm(installer)
  react_native_post_install(installer, __dir__)
  # ... other post_install hooks ...
end
```

`add_dive_sdk_spm` adds a build phase that embeds the binary XCFrameworks
(`IDScanCapture`, `IDScanMRZDetector`, `IDScanPDFDetector`) shipped by
DIVE-SDK-iOS into your app bundle at build time. Without this step the app
crashes at launch with a `Library not loaded` dyld error.

### 2. Install pods

```sh
cd ios && pod install
```

### 3. Add Info.plist permissions

```xml
<!-- Camera — required for document scanning -->
<key>NSCameraUsageDescription</key>
<string>Camera access is required to scan identity documents</string>

<!-- Photo library — required to upload document images -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Photo library access is required to upload document images</string>

<!-- Location — required for DIVE Online mode only -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>DIVE SDK needs your location for verification purposes</string>
```

---

## Android Setup

### 1. Permissions

The library's `AndroidManifest.xml` declares `CAMERA` and `INTERNET`
permissions automatically via manifest merge — no changes to your app's
manifest are needed.

### 2. Minimum SDK version

Your `android/build.gradle` must declare `minSdkVersion` of **24** or higher:

```groovy
android {
  defaultConfig {
    minSdkVersion 24   // required by DIVE SDK
    // ...
  }
}
```

### 3. Theme (optional)

The library ships `Theme.DiveSDK` with a light and a dark-mode variant.
Override the colour tokens in your app's `res/values/colors.xml` to match your
brand. All resource names are prefixed with `diveSdk` to avoid conflicts:

```xml
<!-- res/values/colors.xml -->
<color name="diveSdkColorPrimary">#1A73E8</color>
<color name="diveSdkColorPrimaryDark">#1557B0</color>
<color name="diveSdkColorPrimaryVariant">#4285F4</color>
<color name="diveSdkColorOnPrimary">#FFFFFF</color>
<color name="diveSdkColorSecondary">#03DAC6</color>
```

Add equivalent overrides to `res/values-night/colors.xml` for dark mode.

---

## Usage

### DIVE SDK (server verification via DVS)

```tsx
import { launchDive } from 'react-native-dive-sdk';
import type { DiveCaptureConfiguration } from 'react-native-dive-sdk';

const configuration: DiveCaptureConfiguration = {
  autoContinue: false,
  autoStart: false,
  autoSubmit: false,
  isShowDocumentTypeSelect: false,
  realFaceMode: 'auto',
  documentTypes: [
    {
      isActive: true,
      type: 'ID', // 'ID' or 'DL' — see DiveCaptureConfiguration below
      steps: [
        { type: 'front', name: 'Document Front', mode: { uploader: true, video: true } },
        { type: 'pdf',   name: 'PDF417',         mode: { uploader: true, video: true } },
        { type: 'face',  name: 'Face',           mode: { uploader: true, video: true } },
      ],
    },
    {
      isActive: true,
      type: 'Passport',
      steps: [
        { type: 'front', name: 'Document Front', mode: { uploader: true, video: true } },
        { type: 'face',  name: 'Face',           mode: { uploader: true, video: true } },
      ],
    },
  ],
};

const result = await launchDive({
  token: 'YOUR_API_TOKEN',
  licenseKey: 'YOUR_LICENSE_KEY',
  configuration,
});

if (result.type === 'success') {
  console.log('Request key:', result.requestKey);
} else if (result.type === 'error') {
  console.error(`[${result.code}] ${result.message}`);
} else {
  // result.type === 'cancelled'
  console.log('User cancelled');
}
```

### Multi-environment setup

Use `configureDiveEnvironment` once at app startup to set the default DVS endpoint.
All subsequent `launchDive` calls will use it automatically — no need to pass `baseUrl` every time.

```tsx
// bootstrap.ts — call once when your app starts
import { configureDiveEnvironment } from 'react-native-dive-sdk';

// Point the SDK at your backend. Replace with your actual endpoint.
// Common values:
configureDiveEnvironment({
  baseUrl: 'https://dvs.idscan.net/api/v3',
  // userAgent: 'MyApp/1.0',  // Android only — set a custom User-Agent if required
});
```

Then launch as usual — `baseUrl` is resolved from the global environment:

```tsx
const result = await launchDive({
  token: 'YOUR_API_TOKEN',
  licenseKey: 'YOUR_LICENSE_KEY',
  configuration,
});
```

A **per-call** `baseUrl` overrides the global default for that single call:

```tsx
const result = await launchDive({
  token: 'YOUR_API_TOKEN',
  licenseKey: 'YOUR_LICENSE_KEY',
  configuration,
  baseUrl: 'https://dvs.idscan.net/api/v3', // overrides configureDiveEnvironment for this call
});
```

**Priority:** per-call `baseUrl` → `configureDiveEnvironment` default → SDK built-in default (`dive.idscan.net`).

> **Note:** `userAgent` is an Android-only option and is silently ignored on iOS.

### DIVE Online

DIVE Online uses two token types — `pk_*` (publishable) and `sk_*` (secret).
The mobile SDK never creates applicants: an applicant is created via
`POST {baseUrl}/private/Applicants` with an `sk_*` token, and the resulting
`applicantId` is then passed to `launchDiveOnline` together with a `pk_*` token.

How `sk_*` is handled depends on whether you're shipping to production or
running a demo:

| Setup | Where `sk_*` lives | When to use |
|---|---|---|
| **Production** | On your backend only — never in the mobile bundle | Apps that ship to App Store / Play Store |
| **Demo / quick-start** | Embedded in the mobile bundle (no backend required) | The [example app](example/), internal prototypes, sales demos |

> **Production rule:** anyone who extracts `sk_*` from a shipped app can create
> applicants under your account. Always front it with a backend proxy in
> production builds. The demo exception only exists because demos have no
> backend to proxy through.

#### Production setup (with a backend proxy)

##### 1. Create the applicant on your server

```sh
curl -X POST https://api-diveonline.idscan.net/api/v2/private/Applicants \
  -H "Authorization: Bearer sk_xxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "integrationId": "YOUR_INTEGRATION_UUID",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  }'
# → { "applicantId": "..." }
```

Return the `applicantId` to your mobile app over your own authenticated channel.

##### 2. Launch verification on the device

```tsx
import { launchDiveOnline } from 'react-native-dive-sdk';

const result = await launchDiveOnline({
  token: 'pk_publishable_token',
  integrationId: 'YOUR_INTEGRATION_UUID', // see note below — different per platform
  baseUrl: 'https://api-diveonline.idscan.net/api/v2/',
  applicantId, // from your backend
  android: {
    companyPrefix: 'YourCo', // optional, default 'IDScan' — see API reference
  },
});
```

> **`integrationId` is per-platform.** In the DIVE Online portal you must create
> two **Bundles** — one bound to your iOS bundle id and one bound to your
> Android `applicationId`. They have different `integrationId` values; pick the
> right one at runtime via `Platform.OS`.

#### Demo / quick-start (no backend)

For the [example app](example/) and other purely demonstrational builds you can
skip the server step and create the applicant directly from the device using an
`sk_*` token. **Do not ship this configuration to end users.**

```tsx
import { Platform } from 'react-native';
import { launchDiveOnline } from 'react-native-dive-sdk';

// 1. Create the applicant from the device (demo only — sk_* must not ship to production)
const res = await fetch('https://api-diveonline.idscan.net/api/v2/private/Applicants', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_xxxxxxxx',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ integrationId: 'YOUR_INTEGRATION_UUID', firstName: 'Demo', lastName: 'User' }),
});
const { applicantId } = await res.json();

// 2. Launch verification
const result = await launchDiveOnline({
  token: 'pk_publishable_token',
  integrationId: Platform.select({ ios: 'IOS_INTEGRATION_UUID', android: 'ANDROID_INTEGRATION_UUID' })!,
  baseUrl: 'https://api-diveonline.idscan.net/api/v2/',
  applicantId,
});
```

### Upload progress (iOS, DIVE SDK)

```tsx
import { addUploadProgressListener } from 'react-native-dive-sdk';
import { useEffect } from 'react';

function MyScreen() {
  useEffect(() => {
    const unsubscribe = addUploadProgressListener(({ progress }) => {
      console.log(`Upload: ${Math.round(progress * 100)}%`);
    });
    return unsubscribe; // clean up on unmount
  }, []);
}
```

---

## API Reference

### `launchDive(options)`

Launches **DIVE SDK** (server verification via DVS). Returns a promise that
resolves when the user completes, cancels, or an error occurs.

```ts
launchDive(options: DiveLaunchOptions): Promise<DiveResult>
```

| Option | Type | Description |
|---|---|---|
| `token` | `string` | API token provided by IDScan |
| `licenseKey` | `string` | Base64-encoded license key bound to your app's bundle ID |
| `configuration` | `DiveCaptureConfiguration` | **Required.** Document types, capture steps, and capture flags. See [DiveCaptureConfiguration](#divecaptureconfiguration) below. |
| `baseUrl` | `string` | Optional. Custom DVS endpoint. Overrides `configureDiveEnvironment` for this call. |
| `userAgent` | `string` | Optional. Custom User-Agent (Android only, ignored on iOS). Overrides `configureDiveEnvironment` for this call. |
| `theme` | `DiveTheme` | Optional visual overrides (accent colour, button text colour, font size) |
| `ios` | `DiveIosOptions` | Optional iOS-only capture knobs — see [Platform-specific options](#platform-specific-options) |
| `android` | `DiveAndroidOptions` | Optional Android-only verification flags — see [Platform-specific options](#platform-specific-options) |

---

### `configureDiveEnvironment(env)`

Sets the default DVS endpoint for all subsequent `launchDive` calls. Call once at app startup.

```ts
configureDiveEnvironment(env: DiveEnvironment): void
getDiveEnvironment(): DiveEnvironment
```

| Field | Type | Description |
|---|---|---|
| `baseUrl` | `string` | Default DVS base URL. Used when `launchDive` does not supply `baseUrl`. |
| `userAgent` | `string` | Default User-Agent (Android only). Used when `launchDive` does not supply `userAgent`. |

---

### `launchDiveOnline(options)`

Launches DIVE Online SDK against an applicant your backend already created
(see [Online mode](#online-mode-dive-online) above).

```ts
launchDiveOnline(options: DiveOnlineLaunchOptions): Promise<DiveResult>
```

| Option | Type | Description |
|---|---|---|
| `token` | `string` | **Publishable** token (`pk_*`). Secret tokens (`sk_*`) MUST stay on your server. |
| `integrationId` | `string` | Integration UUID (different per platform — get from DIVE Online dashboard) |
| `baseUrl` | `string` | Base URL of your DIVE Online API endpoint |
| `applicantId` | `string` | Applicant id returned by your backend after `POST /private/Applicants` |
| `theme` | `DiveTheme` | Optional visual overrides (accent colour, font size) |
| `android` | `DiveOnlineAndroidOptions` | Optional Android-only knobs: `companyPrefix` |

---

### `DiveCaptureConfiguration`

Describes which document types the SDK should offer and how each capture step should behave.

```ts
interface DiveCaptureConfiguration {
  autoContinue?: boolean;           // auto-advance after each step
  autoStart?: boolean;              // skip the intro screen and start capture immediately
  autoSubmit?: boolean;             // submit automatically when all steps are done
  isShowDocumentTypeSelect?: boolean; // show the document type picker
  realFaceMode?: 'auto' | 'all' | 'none'; // liveness check: 'auto' (default), 'all', or 'none'
  documentTypes: DiveDocumentConfig[];  // at least one entry required
}

interface DiveDocumentConfig {
  isActive: boolean;
  /**
   * Document type. `'ID'` is the canonical value going forward; `'DL'` is
   * kept as a backwards-compatible alias. Use either — both work on iOS and
   * Android — but only one per documentTypes entry.
   */
  type: 'ID' | 'DL' | 'Passport' | 'PassportCard' | 'GreenCard' | 'InternationalId';
  steps: DiveCaptureStep[];
}

interface DiveCaptureStep {
  type: 'front' | 'back' | 'pdf' | 'mrz' | 'face';
  name: string;                     // display name shown in the SDK UI
  mode: { uploader: boolean; video: boolean };
}
```

**`'ID'` vs `'DL'`** — pick one per `documentTypes` entry; both names work
on iOS and Android. The wrapper handles platform routing transparently:

| JS value | iOS | Android |
|---|---|---|
| `'ID'` *(canonical)* | passed to `DIVESDK` as-is | mapped to `DocumentType.IdentificationCard` |
| `'DL'` *(backwards-compatible alias)* | passed to `DIVESDK` as-is | mapped to `DocumentType.DriverLicense` |

You cannot configure the same flow as both DL and ID simultaneously — IDScan
treats the two as different document types in `documentTypes` and the user
picks one in the document-type selector UI.

**Step type naming across platforms**

iOS and Android use different names for the back-side capture step:

| Step type | iOS | Android |
|---|---|---|
| `'front'` | front side | front side |
| `'back'` | back side | back side |
| `'pdf'` | back side + PDF417 | mapped to `back` by the wrapper |
| `'mrz'` | back side + MRZ | mapped to `back` by the wrapper |
| `'face'` | liveness / face | liveness / face |

The wrapper normalises this: on Android, `'pdf'` and `'mrz'` both trigger `withBack`, and the Android neural net auto-detects PDF417 / MRZ / plain back automatically. A step list written for iOS (`[front, pdf, face]`) therefore works correctly on Android without any changes.

**Other Android notes:**
- `realFaceMode: 'none'` disables liveness; any other value enables it globally for all face steps.

---

### `DiveTheme`

Optional theme overrides passed to either launch function. All fields are optional — omitting a field keeps the SDK default.

```ts
interface DiveTheme {
  accentColor?: string;      // '#RRGGBB' — primary colour for buttons & highlights
  onPrimaryColor?: string;   // '#RRGGBB' — text colour on filled buttons (Android only)
  fontSizeModifier?: number; // 0 = default, positive = larger, negative = smaller
}
```

Pass `theme` inside the launch options:

```tsx
import { launchDive } from 'react-native-dive-sdk';

const result = await launchDive({
  token: 'YOUR_API_TOKEN',
  licenseKey: 'YOUR_LICENSE_KEY',
  theme: {
    accentColor: '#E91E63',    // hot pink buttons & highlights
    fontSizeModifier: 2,       // slightly larger text
  },
});

// Force white text on a light accent colour (Android):
const result2 = await launchDive({
  token: 'YOUR_API_TOKEN',
  licenseKey: 'YOUR_LICENSE_KEY',
  theme: {
    accentColor: '#4CAF50',
    onPrimaryColor: '#FFFFFF', // override auto-calculated text colour
  },
});
```

#### Platform support

| Field | iOS | Android |
|---|---|---|
| `accentColor` | ✅ exact colour via `DIVESDKTheme.accentColor` | ✅ exact colour applied to buttons; nearest of 12 presets used for other Material elements (toolbars, ripples) |
| `onPrimaryColor` | ❌ ignored | ✅ text colour on filled buttons; auto-calculated via WCAG luminance if omitted |
| `fontSizeModifier` | ✅ `DIVESDKTheme.fontSizeModifier` (pt offset) | ✅ mapped to `fontScale` in `attachBaseContext` (`mod / 10`) |

**Android `onPrimaryColor` auto-calculation:** when `onPrimaryColor` is omitted, the SDK computes white or black text using the WCAG 2.1 relative luminance formula — sRGB gamma linearization applied before weighting (0.2126 R + 0.7152 G + 0.0722 B). The threshold is luminance 0.179 (the point where contrast with white equals contrast with black). Supply `onPrimaryColor` explicitly when the automatic choice doesn't match your design intent.

---

### Platform-specific options

Both `launchDive` and `launchDiveOnline` accept optional `ios` and `android`
fields for knobs that have no cross-platform equivalent.

#### `DiveIosOptions` (passed via `ios` on `launchDive`)

```ts
interface DiveIosOptions {
  captureSettings?: {
    vibroFeedback?: boolean;   // haptic feedback on capture events; default: true
    blurThreshold?: number;    // blur rejection 0–1; default: 0.3 (lower = stricter)
    logs?: boolean;            // emit DIVE SDK native console logs; default: false
  };
}
```

`launchDiveOnline` currently has no iOS-specific options.

#### `DiveAndroidOptions` (passed via `android` on `launchDive`)

```ts
interface DiveAndroidOptions {
  verificationMode?: 'server' | 'local' | 'standalone'; // default: 'server'
  verificationConfig?: DiveAndroidVerificationConfig;   // 13 booleans, see below
}
```

**`verificationMode`** maps directly onto the three modes exposed by the
Android DIVE SDK:

| Value | Behaviour |
|---|---|
| `'server'` *(default)* | Capture on device, send to your DVS server, receive `VerificationRequest` |
| `'local'` | Capture and run verification on device, return `VerificationResult` |
| `'standalone'` | Capture only, return `VerificationData` — no verification step |

**`verificationConfig`** toggles individual verification rules in the DVS
pipeline (Android only — iOS reads these from the server bundle). All flags are
optional and default to the SDK's own defaults.

| Flag | What it controls |
|---|---|
| `isOCREnabled` | Run OCR on document fields |
| `isAddressCheckEnabled` | Cross-check the address fields against the DVS database |
| `isCrossMatchRequired` | Require cross-match between document fields |
| `isDMVEnabled` | Full DMV (US Department of Motor Vehicles) lookup |
| `isDMVPartialEnabled` | Partial DMV lookup |
| `isIdentiFraudEnabled` | IdentiFraud service check |
| `isIdentiFraudFullCaseEnabled` | Full IdentiFraud case (more expensive) |
| `isDmvOrIdentiFraudEnabled` | Pass if **either** DMV or IdentiFraud succeeds |
| `isDmvAndIdentiFraudEnabled` | Pass only if **both** succeed |
| `isDmvOrIdentiFraudPartialEnabled` | OR-mode, partial variants |
| `isDmvAndIdentiFraudPartialEnabled` | AND-mode, partial variants |
| `isFaceRequiredOnDocument` | Reject documents without a face photo |
| `faceVerification` | Match selfie against the document portrait (liveness + face match) |

> Exact server-side behaviour of these flags is defined by IDScan's DVS
> backend. See the upstream [DIVE-SDK-Android](https://github.com/IDScanNet/DIVE-SDK-Android)
> README for canonical descriptions.

#### `DiveOnlineAndroidOptions` (passed via `android` on `launchDiveOnline`)

```ts
interface DiveOnlineAndroidOptions {
  companyPrefix?: string;  // default: 'IDScan'
}
```

`companyPrefix` maps to the 4th argument of `DvsOnlineConfig.Builder` in the
upstream Android SDK. Override it only if IDScan support has assigned your
organisation a custom prefix.

---

### `addUploadProgressListener(callback)`

Subscribes to upload progress events emitted by `launchDive` (DIVE SDK). iOS only —
the callback is never fired on Android.

```ts
addUploadProgressListener(
  callback: (event: DiveUploadProgressEvent) => void
): () => void
```

Returns an **unsubscribe** function. Call it when the component unmounts or
when you no longer need progress updates.

| Callback field | Type | Description |
|---|---|---|
| `progress` | `number` | Upload progress from `0.0` to `1.0` |

---

### Types

```ts
type DiveResult =
  | { type: 'success';   requestKey: string; fullResult?: Record<string, unknown> }
  | { type: 'error';     code: string; message: string }
  | { type: 'cancelled' }
```

#### `fullResult` schema (success)

`fullResult` is the raw verification result from DIVE SDK / DIVE Online,
forwarded from the native module unchanged. The shape comes from the upstream
SDK; the fields below are the most useful ones to consume in JS:

| Key | Type | Meaning |
|---|---|---|
| `validationRequestId` | `string` | Server-side request id (matches `requestKey` on `DiveSuccessResult`) |
| `validationResponseId` | `string` | Server-side response id |
| `created` | `string` (ISO timestamp) | When the verification was processed |
| `documentType` | `string` | Detected document type (e.g. `"DriverLicense"`) |
| `documentTypeInt` | `number` | Numeric document-type code |
| `status` | `0 \| 1 \| 2 \| 3` | Overall verdict — see below |
| `validationStatus` | `{ documentIsValid: boolean; faceIsValid: boolean; expired: boolean }` | Per-aspect verdict |
| `documentFailStatusReasons` | `string[]` | Why the document was rejected, if any |
| `faceFailStatusReasons` | `string[]` | Why the face check failed, if any |
| `invalidDataErrors` | `string[]` | Field-level data errors (OCR / cross-check) |
| `document` | `Record<string, unknown>` | Extracted document fields (OCR, MRZ, PDF417) |

**`status` values:**

| Value | Meaning |
|---|---|
| `0` | Valid — verification passed |
| `1` | Fake / spoof detected |
| `2` | Data error — document fields failed validation |
| `3` | Server error — verification could not complete |

> The upstream SDKs occasionally add fields to this payload. The wrapper
> intentionally types `fullResult` as `Record<string, unknown>` so newly added
> fields are passed through without a wrapper release. Cast to a stricter type
> in your app if you depend on specific keys.

#### Error codes (`DiveErrorResult.code`)

User cancellation never reaches the error branch — it is reported as
`{ type: 'cancelled' }`. The remaining codes you can receive are:

| Code | Platform | When it fires |
|---|---|---|
| `CONFIGURATION_ERROR` | iOS, Android | Missing/invalid `token`, `licenseKey`, `configuration`, or `applicantId` |
| `PERMISSION_DENIED` | Android | The user denied the camera permission |
| `RESULT_PROCESSING_ERROR` | Android | The native result payload could not be parsed |
| `SDK_ERROR` | iOS, Android | Any other failure surfaced by the underlying DIVE SDK (network, signing, internal exception). `message` carries the native description. |

---

## Base URLs

Each product talks to a different backend. Defaults are shipped with the SDK
and can be overridden via [`configureDiveEnvironment`](#configurediveenvironmentenv)
or per call via `baseUrl`.

| Product | Default base URL |
|---|---|
| DIVE SDK (`launchDive`) | `https://dvs.idscan.net/api/v3` |
| DIVE Online (`launchDiveOnline`) | `https://api-diveonline.idscan.net/api/v2/` |

Resolution priority for `launchDive`:

1. Per-call `baseUrl`
2. Default set via `configureDiveEnvironment`
3. Built-in default (above)

For `launchDiveOnline`, `baseUrl` is required on every call.

---

## Platform Differences

| Feature | iOS | Android |
|---|---|---|
| Upload progress events | ✅ | ❌ (Fragment API limitation) |
| SDK configuration | JS `configuration` object passed through | JS `configuration` object serialised to JSON Intent extra |
| Native dependency delivery | SPM via CocoaPods (auto via `add_dive_sdk_spm`) | Maven Central (auto via Gradle) |
| Location permission | Required for Online mode | Not required |

---

## Example app

The repo ships a runnable RN app under [example/](example/). It exercises both
`launchDive` and `launchDiveOnline` and is the easiest way to validate your
credentials end-to-end.

```sh
cd example
npm install
npm start                  # start Metro
npm run ios                # iOS simulator / device
npm run android            # Android device / emulator
```

The example uses inline `sk_*` credentials for the DIVE Online flow — that's
acceptable for a demo (see [DIVE Online → Demo / quick-start](#demo--quick-start-no-backend))
but **must not** be used as a template for production builds.

---

## Privacy and data handling

When you ship a DIVE SDK or DIVE Online integration you are processing personal
data and biometrics. The relevant facts for App Store / Play Store submission:

- **Camera and document images** are captured on device and uploaded to the
  IDScan backend (DVS or DIVE Online) for verification. The upload destination
  is the `baseUrl` you configure.
- **Liveness check** uses the front camera (and TrueDepth / ARKit on supporting
  iOS devices). According to the upstream SDK documentation, the biometric
  signal used for liveness is processed on device only — the wrapper itself
  does not persist or transmit raw biometric data beyond what the underlying
  SDK does.
- **Location** (`NSLocationWhenInUseUsageDescription`) is read by DIVE Online
  to attach approximate location metadata to the verification request. It is
  not used by `launchDive`.
- **Photo library** access is requested by `launchDive` so the user can upload
  an existing image instead of taking a new photo.

Always confirm the current data flow with IDScan support before submitting to
the stores — the upstream SDK's behaviour can change between releases.

### App Store / Play Store submission notes

- iOS — fill the `Info.plist` strings shown in [iOS Setup](#3-add-infoplist-permissions).
  In **App Privacy**, declare the data types you actually collect: camera
  imagery, selfie/face data, identity document fields, and (DIVE Online only)
  approximate location.
- Android — declare the same in the **Data safety** form on Play Console.
  `CAMERA` is requested at runtime by the SDK; you do not need to add anything
  to your `AndroidManifest.xml`.

---

## Troubleshooting

### `Library not loaded: @rpath/IDScanCapture.framework` (iOS)

The binary XCFrameworks from DIVE-SDK-iOS are not embedded in your app bundle.
Make sure `add_dive_sdk_spm(installer)` is called in your Podfile's
`post_install` hook **before** `react_native_post_install`, then run
`pod install` again.

### `minSdkVersion` build error (Android)

DIVE SDK requires Android API 24. Set `minSdkVersion 24` (or higher) in your
`android/build.gradle`.

### `fmt`: `consteval` errors on Xcode 26 / Clang 20+ (iOS)

React Native ships an older version of `fmt` that is incompatible with the
C++20 default of Xcode 26's Clang. Until React Native bumps `fmt`, force the
pod to C++17 from your `Podfile`:

```ruby
post_install do |installer|
  add_dive_sdk_spm(installer)
  react_native_post_install(installer, __dir__)

  installer.pods_project.targets.each do |target|
    if target.name == 'fmt'
      target.build_configurations.each do |config|
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
      end
    end
  end
end
```

Stable Xcode 15 / 16 builds do not need this workaround.

### Android NDK 28 or higher required

The DIVE Android SDK ships native code that needs NDK 28 or newer. The RN 0.79
template defaults to NDK 27, which can fail to link. Set the NDK version in
your `android/build.gradle`:

```groovy
ext {
  ndkVersion = "28.2.13676358"
}
```

---

## Support

- Questions and issues with the wrapper: [GitHub Issues](https://github.com/IDScanNet/react-native-dive-sdk/issues)
- Account, credentials, license keys: **support@idscan.net**
- Upstream repositories:
  - [DIVE-SDK-iOS](https://github.com/IDScanNet/DIVE-SDK-iOS)
  - [DIVE-SDK-Android](https://github.com/IDScanNet/DIVE-SDK-Android)
  - [DIVE-ONLINE-SDK-Android](https://github.com/IDScanNet/DIVE-ONLINE-SDK-Android)