/// QuickRTC Flutter Client Library
///
/// A Flutter WebRTC client library built on MediaSoup for real-time video conferencing.
///
/// ## Quick Start (Simplest API)
///
/// The easiest way to add conferencing to your app:
///
/// ```dart
/// import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
///
/// // Use QuickRTCConference widget - handles everything for you
/// QuickRTCConference(
///   serverUrl: 'https://your-server.com',
///   conferenceId: 'room-123',
///   participantName: 'Alice',
///   onJoined: (controller) => controller.enableMedia(),
///   builder: (context, state, controller) {
///     return VideoGrid(
///       participants: state.participantList,
///       localVideo: state.localVideoStream,
///     );
///   },
/// )
/// ```
///
/// ## Quick Start (Controller-Based API)
///
/// For more control over the connection lifecycle:
///
/// ```dart
/// // Connect and join in one step
/// final controller = await QuickRTCController.connect(
///   serverUrl: 'https://your-server.com',
///   conferenceId: 'room-123',
///   participantName: 'Alice',
/// );
///
/// // Enable media
/// await controller.enableMedia();
///
/// // Check active state using convenience getters
/// if (state.isLocalAudioActive) { /* audio enabled and not paused */ }
/// if (state.isLocalVideoActive) { /* video enabled and not paused */ }
///
/// // Screen share with platform-appropriate picker
/// await controller.toggleScreenShareWithPicker(context);
///
/// // Leave when done
/// await controller.leaveMeeting();
/// controller.dispose();
/// ```
///
/// ## Manual Setup (Full Control)
///
/// ```dart
/// // Create socket and controller separately
/// final socket = await QuickRTCSocket.connect('https://your-server.com');
/// final controller = QuickRTCController(socket: socket);
///
/// // Join meeting
/// await controller.joinMeeting(
///   conferenceId: 'room-123',
///   participantName: 'Alice',
/// );
///
/// // Wrap your app with QuickRTCProvider
/// QuickRTCProvider(
///   controller: controller,
///   child: MyApp(),
/// )
///
/// // Use QuickRTCBuilder to react to state changes
/// QuickRTCBuilder(
///   buildWhen: (prev, curr) => prev.participants != curr.participants,
///   builder: (context, state) {
///     return ParticipantGrid(participants: state.participantList);
///   },
/// )
/// ```
library quickrtc_flutter_client;

// Re-export dependencies for convenience
export 'package:flutter_webrtc/flutter_webrtc.dart';
export 'package:socket_io_client/socket_io_client.dart';

// Platform interface (for screen capture service)
export 'platform/quickrtc_platform.dart';

// Controller API (new)
export 'src/controller/quickrtc_controller.dart';
export 'src/controller/quickrtc_static.dart';

// Socket helper
export 'src/quickrtc_socket.dart';

// Types
export 'types.dart';

// State management
export 'state/quick_rtc_state.dart';

// Widgets
export 'widgets/quick_rtc_provider.dart';
export 'widgets/quick_rtc_builder.dart';
export 'widgets/quick_rtc_listener.dart';
export 'widgets/quick_rtc_consumer.dart';
export 'widgets/rtc_video_renderer_widget.dart';
export 'widgets/screen_select_dialog.dart';

// New widgets (enhanced)
export 'widgets/quick_rtc_theme.dart';
export 'widgets/quick_rtc_media_renderer.dart';
export 'widgets/quick_rtc_audio_renderer.dart';
export 'widgets/quick_rtc_conference.dart';
