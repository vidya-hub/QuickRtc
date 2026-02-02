# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-02-01

### Added

- **`QuickRTCConference` widget**: Batteries-included widget that handles socket connection, controller lifecycle, audio renderers, and error handling with retry support.
- **`QuickRTCController.connect()` factory method**: One-liner setup that creates socket, controller, and joins conference automatically.
- **`QuickRTCSocket.connect()` helper**: Simplifies socket connection from ~20 lines to a single line.
- **`toggleScreenShareWithPicker(context)` method**: Platform-aware screen sharing toggle that uses picker on desktop and system capture on mobile/web.
- **State convenience getters**: Added `isLocalAudioActive`, `isLocalVideoActive`, and `isLocalScreenshareActive` computed properties to `QuickRTCState`.
- **Android screen share external stop detection**: Automatically detects when screen sharing is stopped via the system notification ("Stop now" button) or when MediaProjection is revoked. Other participants are now properly notified and the screen share tile is removed.
- **Producer stats-based stall detection**: Monitors RTP stats to detect when screen share stops sending data, providing reliable detection even when `track.onEnded` doesn't fire on Android.

### Changed

- Removed freezed and json_serializable dependencies for simpler package structure.
- Replaced code-generated models with manual implementations using Equatable.
- Improved pub.dev compatibility by eliminating build_runner requirement.
- Controller now tracks socket ownership and auto-disposes socket when created via `connect()`.

### Fixed

- **Android screen share not notifying participants on stop**: Previously, when screen sharing was stopped externally on Android, other participants would see a frozen frame. Now the `closeProducer` event is properly emitted to the server.
- Fixed pub.dev static analysis errors caused by missing generated files.

## [1.0.2] - 2024-01-25

### Changed

- Bumped version to 1.0.2.
- Enhanced documentation with Builder, Consumer, and Listener patterns.
- Synchronized version across library, examples, and native podspecs.

## [1.0.1] - 2024-01-25

### Changed

- Updated dependencies to support latest stable versions (`flutter_webrtc`, `freezed_annotation`, `socket_io_client`, etc.).
- Improved SDP negotiation for both Web and Native platforms.
- Fixed `InvalidAccessError` on Web by implementing dynamic payload type remapping.
- Resolved `PlatformException` in `setRemoteDescription` on Native by syncing header extension IDs.
- Fixed missing m-line matching during production in Unified Plan.
- Internal models now support deep copying to prevent parameter contamination.
- Pass static analysis with zero warnings/errors.

## [1.0.0] - 2024-01-25

### Added

- Initial release of QuickRTC Flutter Client SDK
- `QuickRTCController` for managing video conference lifecycle
- `QuickRTCStatic` utilities for media capture and device enumeration
- `QuickRTCState` immutable state management
- `QuickRTCMediaRenderer` widget for video rendering with overlays
- `QuickRTCAudioRenderers` widget for remote audio playback
- `QuickRTCProvider`, `QuickRTCBuilder`, `QuickRTCListener`, `QuickRTCConsumer` widgets
- `QuickRTCTheme` for customizable styling
- Screen sharing support for Android, iOS, macOS, and Web
- Android 14+ screen sharing with foreground service
- macOS screen recording permission handling
- Desktop screen picker dialog
- Auto-consume for automatic handling of remote participant streams
