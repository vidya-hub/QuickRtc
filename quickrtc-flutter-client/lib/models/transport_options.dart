import 'package:equatable/equatable.dart';

/// Options for creating a WebRTC transport
class TransportOptions extends Equatable {
  final String id;
  final Map<String, dynamic> iceParameters;
  final List<Map<String, dynamic>> iceCandidates;
  final Map<String, dynamic> dtlsParameters;
  final Map<String, dynamic>? sctpParameters;

  const TransportOptions({
    required this.id,
    required this.iceParameters,
    required this.iceCandidates,
    required this.dtlsParameters,
    this.sctpParameters,
  });

  factory TransportOptions.fromJson(Map<String, dynamic> json) {
    return TransportOptions(
      id: json['id'] as String,
      iceParameters: Map<String, dynamic>.from(json['iceParameters'] as Map),
      iceCandidates: (json['iceCandidates'] as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList(),
      dtlsParameters: Map<String, dynamic>.from(json['dtlsParameters'] as Map),
      sctpParameters: json['sctpParameters'] != null
          ? Map<String, dynamic>.from(json['sctpParameters'] as Map)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'iceParameters': iceParameters,
      'iceCandidates': iceCandidates,
      'dtlsParameters': dtlsParameters,
      if (sctpParameters != null) 'sctpParameters': sctpParameters,
    };
  }

  TransportOptions copyWith({
    String? id,
    Map<String, dynamic>? iceParameters,
    List<Map<String, dynamic>>? iceCandidates,
    Map<String, dynamic>? dtlsParameters,
    Map<String, dynamic>? sctpParameters,
  }) {
    return TransportOptions(
      id: id ?? this.id,
      iceParameters: iceParameters ?? this.iceParameters,
      iceCandidates: iceCandidates ?? this.iceCandidates,
      dtlsParameters: dtlsParameters ?? this.dtlsParameters,
      sctpParameters: sctpParameters ?? this.sctpParameters,
    );
  }

  @override
  List<Object?> get props => [
        id,
        iceParameters,
        iceCandidates,
        dtlsParameters,
        sctpParameters,
      ];

  @override
  String toString() {
    return 'TransportOptions(id: $id)';
  }
}

/// Pair of send and receive transports
class TransportPair extends Equatable {
  final TransportOptions sendTransport;
  final TransportOptions recvTransport;

  const TransportPair({
    required this.sendTransport,
    required this.recvTransport,
  });

  factory TransportPair.fromJson(Map<String, dynamic> json) {
    return TransportPair(
      sendTransport: TransportOptions.fromJson(
        json['sendTransport'] as Map<String, dynamic>,
      ),
      recvTransport: TransportOptions.fromJson(
        json['recvTransport'] as Map<String, dynamic>,
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sendTransport': sendTransport.toJson(),
      'recvTransport': recvTransport.toJson(),
    };
  }

  TransportPair copyWith({
    TransportOptions? sendTransport,
    TransportOptions? recvTransport,
  }) {
    return TransportPair(
      sendTransport: sendTransport ?? this.sendTransport,
      recvTransport: recvTransport ?? this.recvTransport,
    );
  }

  @override
  List<Object?> get props => [sendTransport, recvTransport];

  @override
  String toString() {
    return 'TransportPair(send: ${sendTransport.id}, recv: ${recvTransport.id})';
  }
}
