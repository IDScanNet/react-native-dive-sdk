# react-native-dive-sdk — Example App

A runnable React Native app that exercises both `launchDive` (DIVE SDK) and
`launchDiveOnline` (DIVE Online). It is the fastest way to validate your IDScan
credentials end-to-end on iOS and Android, and to see the wrapper's full result
schema rendered live.

> **Demo only.** This app embeds an `sk_*` secret token to create the DIVE
> Online applicant directly from the device. That's fine for local
> demonstration, but **never** ship a build that contains an `sk_*` token to
> end users — see the root [README → DIVE Online](../README.md#dive-online)
> for the production architecture.

## Prerequisites

- Node.js 20+ (see `engines` in [package.json](package.json))
- React Native 0.83 toolchain — follow the official
  [environment setup](https://reactnative.dev/docs/set-up-your-environment)
- **iOS** — Xcode 15 or later, CocoaPods, and a **physical iOS device**
  (the iOS DIVE SDK cannot capture from the simulator)
- **Android** — Android Studio with NDK 28+, an emulator or device running
  Android 7.0+ (API 24)
- Credentials issued by IDScan — see the root
  [README → Accounts and credentials](../README.md#accounts-and-credentials)

## 1. Configure your credentials

Open [`src/App.tsx`](src/App.tsx) and replace the `YOUR_*` placeholders at the
top of the file:

```ts
const DIVE_SDK_TOKEN = 'YOUR_DIVE_SDK_TOKEN';
const DIVE_SDK_LICENSE_KEY = 'YOUR_DIVE_SDK_LICENSE_KEY';

const DIVE_ONLINE_TOKEN = 'pk_YOUR_PUBLISHABLE_TOKEN';
const DIVE_ONLINE_INTEGRATION_ID =
  Platform.select({
    ios: 'YOUR_IOS_INTEGRATION_UUID',
    android: 'YOUR_ANDROID_INTEGRATION_UUID',
  }) ?? '';
const DIVE_ONLINE_APPLICANT_ID = 'YOUR_APPLICANT_ID';
```

| Placeholder | Where to get it |
|---|---|
| `DIVE_SDK_TOKEN` | DVS API token issued by IDScan support, alongside the license |
| `DIVE_SDK_LICENSE_KEY` | license key bound to the example's identifier — iOS `PRODUCT_BUNDLE_IDENTIFIER` and Android `applicationId` are both `com.example.divesdk`. Generate the license on the [DIVE SDK portal](https://mydive.idscan.net/) or request it via support@idscan.net. If you change the bundle id / `applicationId` you must regenerate the license. |
| `DIVE_ONLINE_TOKEN` | Publishable token (`pk_*`) from the DIVE Online portal |
| `DIVE_ONLINE_INTEGRATION_ID` | Two integration UUIDs from the DIVE Online portal — one Bundle bound to the iOS bundle id, one bound to the Android `applicationId` |
| `DIVE_ONLINE_APPLICANT_ID` | Single-use applicant id — mint a fresh one before each test run, see below |

### Mint an `applicantId` (DIVE Online)

Applicant ids are single-use; regenerate one before every verification run.
The example skips a backend and creates the applicant from a `curl` call:

```sh
curl -X POST https://api-diveonline.idscan.net/api/v2/private/Applicants \
  -H "Authorization: Bearer sk_YOUR_SECRET_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "integrationId": "YOUR_INTEGRATION_UUID",
    "firstName": "Demo",
    "lastName": "User"
  }'
# → { "applicantId": "..." }
```

Paste the returned `applicantId` into `DIVE_ONLINE_APPLICANT_ID` in
[`src/App.tsx`](src/App.tsx). Pass the same `integrationId` to the API as the
platform you intend to test on.

> **Reminder:** the secret token (`sk_*`) used for this `curl` must never ship
> inside a production app bundle.

## 2. Install dependencies

```sh
cd example
npm install
```

This pulls `react-native-dive-sdk` from GitHub
(`IDScanNet/react-native-dive-sdk`) — see
[`package.json`](package.json). To test against an unreleased version of the
wrapper, change that line to a local path (`../`) and follow
[CLAUDE.md → step 6](../CLAUDE.md) to set up Metro for a local SDK path.

## 3. Start Metro

```sh
npm start
```

Leave Metro running in this terminal — open a second terminal for the build
commands below.

## 4. Run on iOS

First-time setup or after pulling new native deps:

```sh
cd ios && pod install && cd ..
```

Then build and launch on a physical device:

```sh
npm run ios -- --device "Your iPhone"
```

Or open [`ios/DiveSdkExample.xcworkspace`](ios/DiveSdkExample.xcworkspace) in
Xcode and run from there. The DIVE SDK requires camera access on a real
device — the iOS Simulator cannot run capture flows.

> **Xcode 26 / Clang 20+:** if the build fails on `fmt` `consteval` errors,
> apply the workaround documented in the root
> [README → Troubleshooting](../README.md#fmt-consteval-errors-on-xcode-26--clang-20-ios).
> The example's [`Podfile`](ios/Podfile) already wires `add_dive_sdk_spm` for
> you.

## 5. Run on Android

Make sure an emulator is running or a device is connected
(`adb devices`), then:

```sh
npm run android
```

If Metro is on a different host or you're on a USB device that can't reach
`localhost:8081`, run `adb reverse tcp:8081 tcp:8081` first.

> **NDK 28+ required.** The DIVE Android SDK ships native code that needs
> NDK 28 or newer. The version is pinned in
> [`example/android/build.gradle`](android/build.gradle).

## 6. Use the app

The app exposes two tabs:

- **DIVE SDK** — calls `launchDive` with a fixed
  `DiveCaptureConfiguration` covering ID, Passport, PassportCard, GreenCard,
  and InternationalId flows. Useful for testing every document-capture
  combination shipped by the wrapper.
- **DIVE Online** — calls `launchDiveOnline` against the `applicantId` you
  configured. Mint a fresh applicant id between runs.

The accent-colour swatches at the top let you confirm theme overrides work for
both flows. Pick a colour, then tap **Start Verification**. The result panel
renders the full SDK response (including base64 images) when the run succeeds,
or the SDK error code on failure.

Every result is logged via `console.log('[App] ...')` — open the Metro console
or React Native DevTools to inspect the raw payload.

## Build a standalone APK / IPA

Debug builds rely on the Metro dev server at runtime. To produce a self-contained
APK that boots without Metro, follow the
[CLAUDE.md → "Standalone APK with bundled JS"](../CLAUDE.md) instructions.

## Troubleshooting

For build failures, check the root
[README → Troubleshooting](../README.md#troubleshooting) — it covers:

- iOS — `Library not loaded: @rpath/IDScanCapture.framework`
- iOS — `fmt` `consteval` errors on Xcode 26
- Android — `minSdkVersion` build error
- Android — NDK 28 or higher required

For runtime failures, check the JS console for the
`{ type: 'error'; code; message }` payload — the codes and what they mean are
documented in the root
[README → Error codes](../README.md#error-codes-diveerrorresultcode).
