---
name: doctor
description: Use when the user asks to diagnose the dev environment, run a health check, or investigate build/install failures suspected to come from disk pressure, missing NDK, stale Xcode DerivedData, or Android "signatures do not match" install errors. Diagnose only — never auto-clean or auto-install.
---

# doctor

## Overview

Diagnostic-only health check for the react-native-dive-sdk dev environment. Reports findings and suggests fixes; the user runs the fix commands themselves.

**Iron rule:** never auto-clean, auto-uninstall, or auto-install. Print the suggested command and let the user decide.

## When to Use

- User says "run doctor", "health check", "diagnose my env", or similar
- iOS build is failing in unexplained ways (suspect: full disk, bloated DerivedData)
- `npx react-native run-android` fails with `INSTALL_FAILED_UPDATE_INCOMPATIBLE` or signature errors
- Gradle complains about missing NDK or wrong NDK version
- Before opening a new branch / large build, to confirm the machine is ready

**Do NOT use** for: running the app, fixing code, or actually deleting anything.

## Procedure

Run all four checks. Collect findings. At the end, print one consolidated report with **Status** and **Suggested fix** per check. Do not execute any fix command.

### 1. Disk space

```sh
df -h / /Users
```

Flag if:
- Root `/` or `/Users` is **>85% used** → warn
- **>95% used** → critical (Xcode and Gradle will fail in confusing ways)

Suggested fix to print: `du -sh ~/Library/Developer/Xcode/DerivedData ~/Library/Caches ~/.gradle/caches` to find what to prune.

### 2. Xcode DerivedData size

```sh
du -sh ~/Library/Developer/Xcode/DerivedData 2>/dev/null
ls -1 ~/Library/Developer/Xcode/DerivedData 2>/dev/null | wc -l
```

Flag if:
- Total **>20 GB** → warn
- Total **>50 GB** → recommend cleaning
- Directory missing → fine, just report "clean"

Suggested fix to print: `rm -rf ~/Library/Developer/Xcode/DerivedData/*` (user runs it).

### 3. Android NDK install

The project requires NDK **28.2.13676358** (see root `CLAUDE.md` → `ndkVersion`).

```sh
# Resolve SDK root
ANDROID_SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
echo "SDK: $ANDROID_SDK"
ls "$ANDROID_SDK/ndk" 2>/dev/null
```

Also check `example/android/local.properties` for an explicit `sdk.dir` override.

Flag if:
- `$ANDROID_SDK/ndk` does not exist → critical
- Required version `28.2.13676358` not present → warn (build may still pull a different one, but pin is the safe path)
- Only older majors (e.g. 27.x) present → warn

Suggested fix to print:
```
sdkmanager --install "ndk;28.2.13676358"
```
or via Android Studio → SDK Manager → SDK Tools → NDK (Side by side).

### 4. Android device signature mismatch

The example app's package id is `com.example.divesdk`.

```sh
adb devices -l
```

For **each connected device** (state `device`, skip `unauthorized`/`offline`):

```sh
adb -s <serial> shell pm path com.example.divesdk
adb -s <serial> shell dumpsys package com.example.divesdk \
  | grep -E "signatures|versionName|firstInstallTime|lastUpdateTime"
```

Flag if:
- Package is installed AND was last installed by a different signing identity than the current debug keystore → this causes `INSTALL_FAILED_UPDATE_INCOMPATIBLE: Package ... signatures do not match` on next install.
- Cheap heuristic without full cert compare: if the package is installed but the user is hitting install failures, treat as suspect.

Suggested fix to print (user runs):
```
adb -s <serial> uninstall com.example.divesdk
```

Do NOT run uninstall yourself — it deletes the user's app data.

## Report format

After all checks, output exactly this shape:

```
Doctor report
=============
[1/4] Disk space        : OK | WARN | CRITICAL — <one-line detail>
[2/4] DerivedData       : OK | WARN — <size>
[3/4] Android NDK       : OK | WARN | CRITICAL — <which versions found>
[4/4] Device signatures : OK | WARN — <per-device note, or "no devices">

Suggested fixes (run yourself, nothing was changed):
- ...
- ...
```

If everything is OK, still print the report — the user wants confirmation, not silence.

## Common mistakes

| Mistake | Don't |
|---|---|
| Running `rm -rf DerivedData` because it's "obviously fine" | Print the command, let the user run it |
| Running `adb uninstall` to "fix" signature mismatch | Never — it wipes app data |
| Running `sdkmanager --install` automatically | Print the command; license prompts and disk impact are the user's call |
| Skipping the report when everything passes | Always print the report |
| Using `df -h` output to claim a problem on a 70%-full disk | Only flag at >85% |

## Red flags — STOP

- About to type `rm`, `uninstall`, `sdkmanager --install`, `pod cache clean`, or `./gradlew clean` → STOP. This skill diagnoses; it does not mutate.
- "I'll just clean a little to confirm the fix works" → no. Report and stop.
