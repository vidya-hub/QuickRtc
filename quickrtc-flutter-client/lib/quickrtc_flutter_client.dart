/// QuickRTC Flutter Client Library
///
/// A Flutter WebRTC client library built on MediaSoup for real-time video conferencing.
///
/// ## Quick Start (Controller-Based API)
///
/// ```dart
/// import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
/// import 'package:socket_io_client/socket_io_client.dart' as io;
///
/// // Create socket and controller
/// final socket = io.io('https://your-server.com');
/// final controller = QuickRTCController(socket: socket);
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
///
/// // Join and produce media (high-level API)
/// await controller.joinMeeting(conferenceId: 'room-123', participantName: 'Alice');
/// await controller.enableMedia(); // Enables camera and microphone
///
/// // Or use low-level API for more control
/// final media = await QuickRTCStatic.getLocalMedia(MediaConfig.audioVideo());
/// await controller.produce(ProduceInput.fromTracksWithTypes(media.tracksWithTypes));
///
/// // Control media
/// await controller.toggleCamera();
/// await controller.toggleMicrophone();
/// await controller.startScreenShare();
///
/// // Leave
/// await controller.leaveMeeting();
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
