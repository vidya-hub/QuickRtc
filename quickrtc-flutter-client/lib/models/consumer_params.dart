import 'package:freezed_annotation/freezed_annotation.dart';

part 'consumer_params.freezed.dart';
part 'consumer_params.g.dart';

/// Parameters for creating a consumer
@freezed
abstract class ConsumerParams with _$ConsumerParams {
  const factory ConsumerParams({
    required String id,
    required String producerId,
    required String kind, // 'audio' or 'video'
    required Map<String, dynamic> rtpParameters,
  }) = _ConsumerParams;

  factory ConsumerParams.fromJson(Map<String, dynamic> json) =>
      _$ConsumerParamsFromJson(json);
}
