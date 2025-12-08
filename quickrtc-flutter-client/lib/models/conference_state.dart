import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:quickrtc_flutter_client/models/local_stream_info.dart';
import 'package:quickrtc_flutter_client/models/remote_participant.dart';
import 'package:quickrtc_flutter_client/models/conference_config.dart';
import 'package:quickrtc_flutter_client/models/transport_options.dart';

part 'conference_state.freezed.dart';

/// State of the conference
@freezed
class ConferenceState with _$ConferenceState {
  const factory ConferenceState({
    // Connection state
    @Default(false) bool isJoined,
    @Default(false) bool isConnecting,

    // Configuration
    ConferenceConfig? config,

    // MediaSoup state
    @JsonKey(includeFromJson: false, includeToJson: false) dynamic device,
    @JsonKey(includeFromJson: false, includeToJson: false)
    dynamic sendTransport,
    @JsonKey(includeFromJson: false, includeToJson: false)
    dynamic recvTransport,

    // Transport options (to track transport IDs)
    TransportOptions? sendTransportOptions,
    TransportOptions? recvTransportOptions,

    // Local streams
    @Default([]) List<LocalStreamInfo> localStreams,

    // Remote participants
    @Default([]) List<RemoteParticipant> remoteParticipants,

    // Error state
    String? error,
  }) = _ConferenceState;
}
