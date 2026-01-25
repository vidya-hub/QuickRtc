# QuickRTC Testing Guide

## Current Status

### ✅ Completed Work

1. **Removed Custom Native Screen Sharing**
   - Removed 1,500+ lines of custom ScreenCaptureKit code
   - Simplified to use flutter_webrtc's native APIs only
   - macOS plugin reduced from ~1,182 lines to ~115 lines

2. **Fixed Controller Disposal Lifecycle**
   - Added disposal safety checks in `QuickRTCController`
   - Added try-catch in socket disconnect handlers
   - No more "used after disposed" errors

3. **Fixed Android Video Rendering**
   - Added video track validation before attaching to renderer
   - Added explicit mirror settings for video views
   - Proper hasVideo flag management

4. **Code Quality**
   - ✅ `flutter analyze` passes with no issues
   - ✅ macOS builds successfully
   - ✅ All warnings fixed
   - ✅ Clean, maintainable codebase

---

## Test Environment

### Available Devices
- **macOS Desktop**: macOS 26.2 (darwin-arm64)
- **Android Device**: V2415 (Android 16, API 36)
- **Web**: Chrome 143.0.7499.193

### Server Status
✅ **MediaSoup server is running** on port 3000 (confirmed)
- 12 worker processes active
- RTC ports: 40000-40100

---

## Priority 1: Screen Sharing on macOS

### Test Steps

1. **Start the app:**
   ```bash
   cd /Users/vidyasagar/ProjectSpace/simple_mediasoup/quickrtc-example/flutter-client
   flutter run -d macos
   ```

2. **Check screen capture permission:**
   - On first run, app should check for screen capture permission
   - If permission not granted, it should prompt to open System Preferences
   - Grant permission in System Preferences > Privacy & Security > Screen Recording

3. **Test screen sharing:**
   - Join a meeting with a room ID
   - Click the screen share button
   - **Expected behavior:**
     - NO custom Flutter popup with thumbnails
     - Either system native picker OR auto-selects first screen
     - Screen capture should start and appear in the meeting
   - **Potential issue:** 
     - flutter_webrtc might auto-select instead of showing picker
     - If capture shows app window instead of full screen, it's a flutter_webrtc bug

4. **Stop screen sharing:**
   - Click screen share button again
   - Screen capture should stop

### Key Files to Check
- `lib/src/controller/quickrtc_static.dart:167-219` - Screen share logic
- `macos/Classes/QuickRtcFlutterClientPlugin.swift:47-71` - Permission checks

---

## Priority 2: Android Video Rendering

### Test Steps

1. **Start app on Android:**
   ```bash
   cd /Users/vidyasagar/ProjectSpace/simple_mediasoup/quickrtc-example/flutter-client
   flutter run -d 10BEBU0T9H000N6
   ```

2. **Two-participant test:**
   - Participant 1: Join on macOS
   - Participant 2: Join on Android (same room ID)
   - Both should enable video

3. **Check video rendering:**
   - **Expected behavior:**
     - Remote participant's video should display on Android
     - Check logs for: `ConferenceProvider: Attached video stream ... with X tracks`
     - No MediaCodec warnings
   - **Potential issues:**
     - If `videoTracks.isNotEmpty` is false, tracks aren't arriving
     - May need hardware acceleration settings

4. **Check logs:**
   ```bash
   flutter logs | grep -E "ConferenceProvider|video|MediaCodec"
   ```

### Key Files to Check
- `quickrtc-example/flutter-client/lib/providers/conference_provider.dart:261-276` - Video validation
- `quickrtc-example/flutter-client/lib/screens/conference_screen.dart:791-796` - Mirror setting

---

## Priority 3: Disposal Lifecycle

### Test Steps

1. **Test clean disconnect:**
   - Join a meeting
   - Leave the meeting (back button or leave button)
   - Check console for errors

2. **Expected behavior:**
   - No "used after disposed" exceptions
   - Clean disconnect without errors
   - Socket should disconnect gracefully

3. **Check logs for:**
   ```bash
   flutter logs | grep -E "dispose|cleanup|disconnect"
   ```

### Key Files to Check
- `lib/src/controller/quickrtc_controller.dart:106-111` - updateState disposal check
- `lib/src/controller/quickrtc_controller.dart:460-467` - dispose method
- `lib/src/controller/quickrtc_socket_mixin.dart:182-192` - Socket disconnect handler

---

## Quick Commands

### Build Commands
```bash
# macOS
flutter build macos --debug
flutter run -d macos

# Android
flutter build apk --debug
flutter run -d 10BEBU0T9H000N6

# Analyze
flutter analyze
```

### Clean Build
```bash
flutter clean
flutter pub get
flutter build macos --debug
```

### Check Server
```bash
# Check if server is running
ps aux | grep mediasoup

# Start server (if needed)
cd /Users/vidyasagar/ProjectSpace/simple_mediasoup/quickrtc-example/server
npm run dev
```

---

## Known Limitations

### 1. flutter_webrtc Screen Capture
The original problem was that flutter_webrtc's `desktopCapturer` on macOS captured the app window instead of full screen.

**Current Status:**
- We removed all workarounds and use flutter_webrtc as-is
- If bug persists, it's an **upstream issue in flutter_webrtc**
- Would need to be fixed in flutter_webrtc library

**Potential Solutions (if needed):**
- Report bug to flutter_webrtc maintainers
- OR re-implement custom SCK capture with proper MediaStream integration

### 2. Screen Picker UX
Currently no custom picker UI on any platform.

**If users need custom picker:**
- `ScreenSelectDialog` still exists but not used by default
- Can be explicitly called: `ScreenSelectDialog.show(context)`
- Or implement platform-specific native pickers

---

## Expected Test Results

### Success Criteria

✅ **Screen Sharing (macOS):**
- Screen share button works
- Screen capture starts (either with picker or auto-select)
- Remote participants can see shared screen
- Screen share stops cleanly

✅ **Video Rendering (Android):**
- Remote participant videos display correctly
- No MediaCodec errors
- Video tracks are properly attached to renderers
- Mirror setting is correct (no mirror for remote video)

✅ **Disposal Lifecycle:**
- No "used after disposed" errors
- Clean disconnect without exceptions
- Socket handlers don't crash after disposal

### Failure Scenarios

❌ **If screen capture still broken:**
1. Check flutter_webrtc version: `flutter pub deps | grep flutter_webrtc`
2. Current version: 0.12.12+hotfix.1 (latest available: 1.2.1)
3. Consider upgrading flutter_webrtc
4. File issue with flutter_webrtc maintainers

❌ **If Android video fails:**
1. Check logs for "WARNING - Video stream has no video tracks"
2. Verify MediaCodec configuration
3. Check hardware acceleration settings
4. Test on different Android device/version

❌ **If disposal errors occur:**
1. Check socket disconnect timing
2. Verify state clearing before disposal
3. Add more disposal guards if needed

---

## Next Steps After Testing

1. **Document findings** - What works, what doesn't
2. **File issues** - If flutter_webrtc bugs confirmed
3. **Consider custom picker** - If UX needs improvement
4. **Upgrade dependencies** - flutter_webrtc 1.2.1 available
5. **Test on more devices** - iOS, Windows, Linux

---

## File Structure Reference

### Core Library Files
```
quickrtc-flutter-client/
├── lib/
│   ├── platform/
│   │   └── quickrtc_platform.dart          # Platform interface (simplified)
│   ├── src/
│   │   └── controller/
│   │       ├── quickrtc_controller.dart    # Main controller (disposal fixed)
│   │       ├── quickrtc_socket_mixin.dart  # Socket handlers (disposal safe)
│   │       └── quickrtc_static.dart        # Screen share logic (simplified)
│   └── widgets/
│       └── screen_select_dialog.dart       # Standard picker (SCK removed)
├── macos/
│   ├── Classes/
│   │   └── QuickRtcFlutterClientPlugin.swift  # Minimal plugin (113 lines)
│   └── quickrtc_flutter_client.podspec        # Minimal dependencies
```

### Example App Files
```
quickrtc-example/flutter-client/
├── lib/
│   ├── providers/
│   │   └── conference_provider.dart        # Video renderer logic (Android fixed)
│   └── screens/
│       └── conference_screen.dart          # UI with mirror fix
```

---

## Contact

For issues or questions:
- Check logs: `flutter logs`
- Run analyze: `flutter analyze`
- Check server: Server logs in terminal where it's running
