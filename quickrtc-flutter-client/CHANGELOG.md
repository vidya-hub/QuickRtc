# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
