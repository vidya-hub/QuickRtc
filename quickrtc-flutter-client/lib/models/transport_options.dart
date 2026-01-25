import 'package:freezed_annotation/freezed_annotation.dart';

part 'transport_options.freezed.dart';
part 'transport_options.g.dart';

/// Options for creating a WebRTC transport
@freezed
abstract class TransportOptions with _$TransportOptions {
  const factory TransportOptions({
    required String id,
    required Map<String, dynamic> iceParameters,
    required List<Map<String, dynamic>> iceCandidates,
    required Map<String, dynamic> dtlsParameters,
    Map<String, dynamic>? sctpParameters,
  }) = _TransportOptions;

  factory TransportOptions.fromJson(Map<String, dynamic> json) =>
      _$TransportOptionsFromJson(json);
}

/// Pair of send and receive transports
@freezed
abstract class TransportPair with _$TransportPair {
  const factory TransportPair({
    required TransportOptions sendTransport,
    required TransportOptions recvTransport,
  }) = _TransportPair;

  factory TransportPair.fromJson(Map<String, dynamic> json) =>
      _$TransportPairFromJson(json);
}
