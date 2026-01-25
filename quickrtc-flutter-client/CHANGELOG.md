# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
