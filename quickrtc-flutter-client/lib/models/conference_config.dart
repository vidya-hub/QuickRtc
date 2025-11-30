import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

part 'conference_config.freezed.dart';

/// Configuration for joining a conference
@freezed
class ConferenceConfig with _$ConferenceConfig {
  const factory ConferenceConfig({
    required String conferenceId,
    String? conferenceName,
    required String participantId,
    required String participantName,
    @JsonKey(includeFromJson: false, includeToJson: false)
    required io.Socket socket,
  }) = _ConferenceConfig;
}
