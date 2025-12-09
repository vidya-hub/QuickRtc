# 🚀 QuickRTC Flutter Client - Setup Guide

Complete setup instructions for the QuickRTC Flutter Client.

## 📋 Prerequisites

- **Flutter SDK**: >=3.10.0
- **Dart SDK**: >=3.0.0
- **Platform Requirements**:
  - Android: Minimum SDK 21 (Android 5.0)
  - iOS: Minimum iOS 12.0
  - Web: Modern browser with WebRTC support
  - macOS/Windows/Linux: Desktop support available

## 🛠️ Installation Steps

### 1. Install Flutter Dependencies

Navigate to the Flutter client directory and install dependencies:

```bash
cd quickrtc-flutter-client
flutter pub get
```

### 2. Generate Freezed Code

The models use Freezed for immutability. Generate the required code:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

This will generate `.freezed.dart` and `.g.dart` files for all models.

### 3. Verify Installation

Run the analyzer to check for any issues:

```bash
flutter analyze
```

## 📱 Platform-Specific Setup

### Android Setup

#### 1. Update `android/app/build.gradle`

```gradle
android {
    compileSdkVersion 33

    defaultConfig {
        minSdkVersion 21  // Required for flutter_webrtc
        targetSdkVersion 33
    }
}
```

#### 2. Permissions in `AndroidManifest.xml`

Already included in the example, but here's what you need:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

#### 3. ProGuard Rules (if using release builds)

Add to `android/app/proguard-rules.pro`:

```proguard
-keep class org.webrtc.** { *; }
```

### iOS Setup

#### 1. Update `ios/Podfile`

Ensure platform is set:

```ruby
platform :ios, '12.0'
```

#### 2. Permissions in `Info.plist`

Already included in the example:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is required for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone access is required for audio calls</string>
```

#### 3. Background Modes

Enable in Xcode or add to `Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
    <string>voip</string>
</array>
```

#### 4. Install Pods

```bash
cd ios
pod install
cd ..
```

### Web Setup

#### 1. Update `web/index.html`

Add Socket.IO client script (if using Socket.IO from CDN):

```html
<head>
  <script src="https://cdn.socket.io/4.5.0/socket.io.min.js"></script>
</head>
```

#### 2. HTTPS Requirement

WebRTC requires HTTPS in production. For local development:

```bash
flutter run -d chrome --web-browser-flag "--disable-web-security"
```

### macOS Setup

#### 1. Update `macos/Runner/DebugProfile.entitlements`

```xml
<key>com.apple.security.network.client</key>
<true/>
<key>com.apple.security.network.server</key>
<true/>
<key>com.apple.security.device.camera</key>
<true/>
<key>com.apple.security.device.microphone</key>
<true/>
```

## 🧪 Running the Example

### 1. Start the QuickRTC Server

First, start the server (from the main project):

```bash
cd quickrtc_example
npm install
npm run start:https
```

The server will run on `https://localhost:3443`

### 2. Run the Flutter Example

```bash
cd quickrtc-flutter-example
flutter pub get

# Generate models in client library first
cd ../quickrtc-flutter-client
flutter pub run build_runner build --delete-conflicting-outputs
cd ../quickrtc-flutter-example

# Run on Android
flutter run

# Run on iOS
flutter run -d ios

# Run on Web
flutter run -d chrome --web-browser-flag "--disable-web-security"

# Run on macOS
flutter run -d macos
```

## 🔧 Development Workflow

### Updating Models

If you modify any model classes:

```bash
cd quickrtc-flutter-client
flutter pub run build_runner build --delete-conflicting-outputs
```

### Hot Reload

Flutter supports hot reload during development:

- Press `r` in terminal to hot reload
- Press `R` to hot restart

### Debugging

Enable verbose logging:

```dart
import 'package:logger/logger.dart';

// In your app
Logger.level = Level.debug;
```

## 📦 Using in Your Own Project

### 1. Add as Dependency

In your `pubspec.yaml`:

```yaml
dependencies:
  quickrtc_flutter_client:
    path: ../path/to/quickrtc-flutter-client
    # or from git:
    # git:
    #   url: https://github.com/vidya-hub/QuickRTC.git
    #   path: quickrtc-flutter-client
```

### 2. Import

```dart
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
```

### 3. Wrap Your App

```dart
void main() {
  runApp(
    QuickRTCProviderWidget(
      child: MyApp(),
    ),
  );
}
```

### 4. Use in Widgets

```dart
class MyScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<ConferenceProvider>(context);

    // Use provider methods and state
    return Scaffold(
      body: Text('Joined: ${provider.isJoined}'),
    );
  }
}
```

## 🐛 Troubleshooting

### Build Runner Issues

If you see errors about missing `.freezed.dart` or `.g.dart` files:

```bash
cd quickrtc-flutter-client
flutter pub run build_runner clean
flutter pub run build_runner build --delete-conflicting-outputs
```

### Conflicting Dependencies

If you have version conflicts:

```bash
flutter pub outdated
flutter pub upgrade
```

### Permission Issues

**Android**: Check that permissions are in `AndroidManifest.xml` and are being requested at runtime.

**iOS**: Verify `Info.plist` has usage descriptions. Check app settings on device.

### WebRTC Connection Issues

1. Ensure server is running and accessible
2. Check HTTPS/SSL certificates
3. Verify firewall/network settings
4. Test with STUN/TURN servers if behind NAT

### Platform-Specific Issues

**Android Emulator**: WebRTC may not work properly. Use physical device.

**iOS Simulator**: Limited camera support. Use physical device for testing.

**Web**: Requires HTTPS in production. Use dev flags for local testing.

## 📚 Next Steps

- Read the [API Documentation](./README.md#-api-reference)
- Check out the [Usage Examples](./README.md#-usage-examples)
- Review the [Example App](../quickrtc-flutter-example)
- Join the community discussions

## 🤝 Getting Help

- **Issues**: [GitHub Issues](https://github.com/vidya-hub/QuickRTC/issues)
- **Discussions**: [GitHub Discussions](https://github.com/vidya-hub/QuickRTC/discussions)
- **Documentation**: Check the READMEs in each package

---

**Happy Coding! 🎉**
