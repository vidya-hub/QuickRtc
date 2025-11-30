import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

part 'remote_participant.freezed.dart';

/// Information about a remote participant in the conference
@freezed
class RemoteParticipant with _$RemoteParticipant {
  const factory RemoteParticipant({
    required String participantId,
    required String participantName,
    @JsonKey(includeFromJson: false, includeToJson: false)
    MediaStream? videoStream,
    @JsonKey(includeFromJson: false, includeToJson: false)
    MediaStream? audioStream,
    @JsonKey(includeFromJson: false, includeToJson: false)
    dynamic videoConsumer,
    @JsonKey(includeFromJson: false, includeToJson: false)
    dynamic audioConsumer,
    @Default(false) bool isAudioEnabled,
    @Default(false) bool isVideoEnabled,
  }) = _RemoteParticipant;
}
