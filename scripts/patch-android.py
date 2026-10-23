#!/usr/bin/env python3
"""Runs after `npx cap add android`: system bar colours, keyboard resize, permissions, version number and (optional) fixed signing key."""
import os, pathlib, re

app = pathlib.Path('android/app')
main = app / 'src/main'
BG = '#1a1a1e'

# 1) system bars + splash background
styles = main / 'res/values/styles.xml'
if styles.exists():
    s = styles.read_text(encoding='utf-8')
    if 'navigationBarColor' not in s:
        s = re.sub(r'(<style name="AppTheme\.NoActionBar"[^>]*>)',
                   r'\1\n        <item name="android:navigationBarColor">%s</item>\n        <item name="android:statusBarColor">%s</item>' % (BG, BG), s, count=1)
    if 'windowSplashScreenBackground' not in s:
        s = re.sub(r'(<style name="AppTheme\.NoActionBarLaunch"[^>]*parent="Theme\.SplashScreen"[^>]*>)',
                   r'\1\n        <item name="windowSplashScreenBackground">%s</item>' % BG, s, count=1)
    styles.write_text(s, encoding='utf-8')

# 2) manifest: permissions + keyboard pushes the chat input up instead of covering it
manifest = main / 'AndroidManifest.xml'
m = manifest.read_text(encoding='utf-8')
extra = ''
for p in ('INTERNET', 'ACCESS_NETWORK_STATE', 'VIBRATE', 'POST_NOTIFICATIONS', 'CAMERA'):
    if 'android.permission.%s"' % p not in m:
        extra += '    <uses-permission android:name="android.permission.%s" />\n' % p
if 'android.hardware.camera' not in m:
    extra += '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n'
if extra:
    m = m.replace('</manifest>', extra + '</manifest>')
if 'windowSoftInputMode' not in m:
    m = m.replace('<activity', '<activity android:windowSoftInputMode="adjustResize"', 1)
manifest.write_text(m, encoding='utf-8')

# 3) version number + fixed signing key (only if the secrets exist)
gradle = app / 'build.gradle'
g = gradle.read_text(encoding='utf-8')
code = os.environ.get('VERSION_CODE', '1')
name = os.environ.get('VERSION_NAME', '1.0.0')
g = re.sub(r'versionCode\s+\d+', 'versionCode %s' % code, g, count=1)
g = re.sub(r'versionName\s+"[^"]*"', 'versionName "%s"' % name, g, count=1)
if os.environ.get('SIGNING') == '1' and 'signingConfigs' not in g:
    signing = '''    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_PATH"))
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {'''
    g = g.replace('    buildTypes {', signing, 1)
    g = re.sub(r'(buildTypes\s*\{\s*release\s*\{)', r'\1\n            signingConfig signingConfigs.release', g, count=1)
gradle.write_text(g, encoding='utf-8')
print('patched: version %s (%s), signing=%s' % (name, code, os.environ.get('SIGNING') == '1'))
