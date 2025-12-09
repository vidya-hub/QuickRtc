import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

part 'local_stream_info.freezed.dart';

/// Type of local media stream
enum LocalStreamType {
  audio,
  video,
  screenshare,
}

/// Information about a local media stream
@freezed
class LocalStreamInfo with _$LocalStreamInfo {
  const factory LocalStreamInfo({
    required String id,
    required LocalStreamType type,
    @JsonKey(includeFromJson: false, includeToJson: false)
    required MediaStreamTrack track,
    @JsonKey(includeFromJson: false, includeToJson: false)
    required MediaStream stream,
    required bool enabled,
    @JsonKey(includeFromJson: false, includeToJson: false)
    required dynamic producer, // RTCRtpSender
  }) = _LocalStreamInfo;
}
