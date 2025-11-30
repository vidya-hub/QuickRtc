/// QuickRTC Flutter Client Library
///
/// A Flutter WebRTC client library built on MediaSoup with Provider state management
/// for real-time video conferencing.
library quickrtc_flutter_client;

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
