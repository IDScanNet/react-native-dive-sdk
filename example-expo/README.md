# DIVE Expo Demo

An Expo (managed-workflow) example app that demonstrates
`react-native-dive-sdk` integrated via the package's config plugin —
no manual `Podfile`, `Info.plist`, or `build.gradle` edits.

> **Expo Go is not supported.** The SDK ships native code. Use a
> development build (`expo run:*`) or EAS.

> **Demo only.** The DIVE Online flow embeds an `sk_*` secret token in
> the device — fine for local demos, never ship a production build that
> does this. See the root [README → DIVE Online](../README.md#dive-online).

## Prerequisites

- Node 20+, npm
- For iOS — Xcode 15+, CocoaPods, a **physical iPhone**
  (Simulator is not supported by DIVE SDK)
- For Android — Android Studio with NDK 28+, a device on Android 7.0+
- IDScan credentials — see root
  [README → Accounts and credentials](../README.md#accounts-and-credentials).
  The bundle identifier is `com.example.divesdk`, identical to the bare
  `example/` — your existing DIVE SDK license key works here unchanged.

## Setup

```sh
npm install
npx expo prebuild --clean       # generates ios/ and android/
```

`ios/` and `android/` are gitignored — they are prebuild output, not source.

## Configure credentials

Edit `App.tsx`, replace the `YOUR_*` placeholders at the top of the file
with real values from your IDScan dashboard. Mint a fresh `applicantId`
for each DIVE Online run — see [`../example/README.md`](../example/README.md#mint-an-applicantid-dive-online).

## Run

```sh
npx expo run:ios --device        # real device — Simulator not supported
npx expo run:android --device
```

## What this demonstrates

- One-line plugin entry in `app.json` replaces manual Podfile / Info.plist
  / Gradle edits.
- Both DIVE SDK (`launchDive`) and DIVE Online (`launchDiveOnline`) flows.
- JS surface is identical to the bare `example/` — the diff is purely
  build configuration.

## Troubleshooting

For build / runtime errors, see the root
[README → Troubleshooting](../README.md#troubleshooting). Expo-specific
issues live under [README → Using with Expo](../README.md#using-with-expo).
