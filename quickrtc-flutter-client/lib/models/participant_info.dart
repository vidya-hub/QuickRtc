import 'package:equatable/equatable.dart';

/// Basic information about a participant
class ParticipantInfo extends Equatable {
  final String participantId;
  final String participantName;
  final List<String> producerIds;

  const ParticipantInfo({
    required this.participantId,
    required this.participantName,
    this.producerIds = const [],
  });

  factory ParticipantInfo.fromJson(Map<String, dynamic> json) {
    return ParticipantInfo(
      participantId: json['participantId'] as String,
      participantName: json['participantName'] as String,
      producerIds: json['producerIds'] != null
          ? List<String>.from(json['producerIds'] as List)
          : const [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'participantId': participantId,
      'participantName': participantName,
      'producerIds': producerIds,
    };
  }

  ParticipantInfo copyWith({
    String? participantId,
    String? participantName,
    List<String>? producerIds,
  }) {
    return ParticipantInfo(
      participantId: participantId ?? this.participantId,
      participantName: participantName ?? this.participantName,
      producerIds: producerIds ?? this.producerIds,
    );
  }

  @override
  List<Object?> get props => [participantId, participantName, producerIds];

  @override
  String toString() {
    return 'ParticipantInfo(id: $participantId, name: $participantName, producers: ${producerIds.length})';
  }
}
