/// Bundled MediaSoup Client for Flutter
///
/// This is a bundled version of mediasoup_client_flutter for use with QuickRTC.
/// All classes are re-exported from this single file.
library mediasoup;

// Core classes
export 'device.dart';
export 'transport.dart';
export 'producer.dart';
export 'consumer.dart';
export 'data_producer.dart';
export 'data_consumer.dart';

// Parameters
export 'rtp_parameters.dart';
export 'sctp_parameters.dart';
export 'ortc.dart';
export 'sdp_object.dart';
export 'scalability_modes.dart';

// Utilities
export 'utils.dart';

// Common
export 'common/enhanced_event_emitter.dart';
export 'common/logger.dart';

// Handlers
export 'handlers/handler_interface.dart';
export 'handlers/unified_plan.dart';
export 'handlers/plan_b.dart';

// SDP utilities
export 'handlers/sdp/remote_sdp.dart';
export 'handlers/sdp/common_utils.dart';
export 'handlers/sdp/media_section.dart';
export 'handlers/sdp/unified_plan_utils.dart';
export 'handlers/sdp/plan_b_utils.dart';
export 'handlers/sdp/plain_rtp_utils.dart';

// FlexQueue
export 'FlexQueue/flex_queue.dart';
