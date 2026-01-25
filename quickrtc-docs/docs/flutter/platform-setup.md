---
sidebar_position: 5
---

# Platform Setup

Configure permissions for each platform.

## Android

### Permissions

`android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

<!-- Screen sharing (Android 14+) -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" />
```

### Min SDK

`android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        minSdkVersion 24
    }
}
```

---

## iOS

`ios/Runner/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone for audio calls</string>
```

---

## macOS

### Entitlements

`macos/Runner/DebugProfile.entitlements` and `Release.entitlements`:

```xml
<key>com.apple.security.device.camera</key>
<true/>
<key>com.apple.security.device.audio-input</key>
<true/>
<key>com.apple.security.network.client</key>
<true/>
```

### Screen Sharing

Screen recording permission is managed by macOS. Users must grant it in:

**System Preferences → Privacy & Security → Screen Recording**

---

## Web

`web/index.html`:

```html
<script src="https://cdn.socket.io/4.5.0/socket.io.min.js"></script>
```

Browser permissions are requested automatically when calling `getLocalMedia()`.
