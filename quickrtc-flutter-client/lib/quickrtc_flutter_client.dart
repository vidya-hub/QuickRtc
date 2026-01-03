/// QuickRTC Flutter Client Library
///
/// A Flutter WebRTC client library built on MediaSoup for real-time video conferencing.
///
/// ## Quick Start (New Event-Driven API)
///
/// ```dart
/// import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
/// import 'package:socket_io_client/socket_io_client.dart' as io;
///
/// // Create socket and QuickRTC instance
/// final socket = io.io('https://your-server.com');
/// final rtc = QuickRTC(QuickRTCConfig(socket: socket));
///
/// // Listen for events
/// rtc.on<NewParticipantEvent>('newParticipant', (event) {
///   print('${event.participantName} joined');
/// });
///
/// // Join and produce media
/// await rtc.join(JoinConfig(conferenceId: 'room-123', participantName: 'Alice'));
/// final streams = await rtc.produce(ProduceInput.fromTracks(mediaTracks));
///
/// // Leave
/// await rtc.leave();
/// ```
library quickrtc_flutter_client;

// Re-export dependencies for convenience
export 'package:flutter_webrtc/flutter_webrtc.dart';
export 'package:socket_io_client/socket_io_client.dart';

// Platform interface (for screen capture service)
export 'platform/quickrtc_platform.dart';

// New Event-Driven API (recommended)
export 'quickrtc.dart';
export 'types.dart';

// Legacy Provider-based API (for backward compatibility)
// Models
export 'models/conference_config.dart';
export 'models/conference_state.dart';
export 'models/local_stream_info.dart';
export 'models/remote_participant.dart';
export 'models/transport_options.dart';
export 'models/consumer_params.dart';
export 'models/participant_info.dart';
export 'models/socket_response.dart';

// Providers
export 'providers/conference_provider.dart';

// Services (optionally exposed for advanced usage)
export 'services/device_service.dart';
export 'services/socket_service.dart';
export 'services/stream_service.dart';

// Widgets
export 'widgets/rtc_video_renderer_widget.dart';
export 'widgets/quick_rtc_provider_widget.dart';
