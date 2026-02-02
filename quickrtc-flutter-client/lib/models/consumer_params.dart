import 'package:equatable/equatable.dart';

/// Parameters for creating a consumer
class ConsumerParams extends Equatable {
  final String id;
  final String producerId;
  final String kind; // 'audio' or 'video'
  final Map<String, dynamic> rtpParameters;

  const ConsumerParams({
    required this.id,
    required this.producerId,
    required this.kind,
    required this.rtpParameters,
  });

  factory ConsumerParams.fromJson(Map<String, dynamic> json) {
    return ConsumerParams(
      id: json['id'] as String,
      producerId: json['producerId'] as String,
      kind: json['kind'] as String,
      rtpParameters: Map<String, dynamic>.from(json['rtpParameters'] as Map),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'producerId': producerId,
      'kind': kind,
      'rtpParameters': rtpParameters,
    };
  }

  ConsumerParams copyWith({
    String? id,
    String? producerId,
    String? kind,
    Map<String, dynamic>? rtpParameters,
  }) {
    return ConsumerParams(
      id: id ?? this.id,
      producerId: producerId ?? this.producerId,
      kind: kind ?? this.kind,
      rtpParameters: rtpParameters ?? this.rtpParameters,
    );
  }

  @override
  List<Object?> get props => [id, producerId, kind, rtpParameters];

  @override
  String toString() {
    return 'ConsumerParams(id: $id, producerId: $producerId, kind: $kind)';
  }
}
