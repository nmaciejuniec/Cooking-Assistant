#!/usr/bin/env bash
# Adds our own Android parts to the project made by "npx cap add android":
# app icons, the home Wi-Fi sync plugin and the permissions it needs.
set -euo pipefail
cp -r native/android/res/* android/app/src/main/res/
PKG=android/app/src/main/java/com/nmaciejuniec/cookingassistant
mkdir -p "$PKG"
cp native/android/java/*.java "$PKG/"
python3 - <<'PY'
p = 'android/app/src/main/AndroidManifest.xml'
s = open(p).read()
perms = ['android.permission.ACCESS_NETWORK_STATE', 'android.permission.ACCESS_WIFI_STATE',
         'android.permission.CHANGE_WIFI_MULTICAST_STATE', 'android.permission.CAMERA']
add = ''.join('    <uses-permission android:name="%s" />\n' % x for x in perms if x not in s)
add += '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n'
s = s.replace('</manifest>', add + '</manifest>', 1)
# no Android cloud backup of the app's data (it holds the API key and the pairing secret)
s = s.replace('android:allowBackup="true"', 'android:allowBackup="false"')
open(p, 'w').write(s)
print(s)
PY
