import 'package:freezed_annotation/freezed_annotation.dart';

part 'participant_info.freezed.dart';
part 'participant_info.g.dart';

/// Basic information about a participant
@freezed
abstract class ParticipantInfo with _$ParticipantInfo {
  const factory ParticipantInfo({
    required String participantId,
    required String participantName,
    @Default([]) List<String> producerIds,
  }) = _ParticipantInfo;

  factory ParticipantInfo.fromJson(Map<String, dynamic> json) =>
      _$ParticipantInfoFromJson(json);
}
