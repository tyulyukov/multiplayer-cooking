#!/bin/sh
# Starts an Android emulator window and forwards the local Convex ports into it.
# 127.0.0.1 inside the emulator is the emulator itself, so the Сільпо OAuth callback
# on :3211 and the Convex client on :3210 need adb reverse to reach this machine.
set -eu

avd="${ANDROID_AVD:-$(emulator -list-avds | head -n 1)}"

if [ -z "$avd" ]; then
  echo "No Android Virtual Device found. Create one with avdmanager." >&2
  exit 1
fi

if ! adb devices | grep -q '^emulator-'; then
  nohup emulator -avd "$avd" >/dev/null 2>&1 &
fi

adb wait-for-device
adb reverse tcp:3210 tcp:3210
adb reverse tcp:3211 tcp:3211
echo "Android emulator ready: Convex ports 3210 and 3211 are forwarded."
