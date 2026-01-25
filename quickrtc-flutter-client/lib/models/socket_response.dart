import 'package:freezed_annotation/freezed_annotation.dart';

part 'socket_response.freezed.dart';
part 'socket_response.g.dart';

/// Standard response from socket server
@Freezed(genericArgumentFactories: true)
abstract class SocketResponse<T> with _$SocketResponse<T> {
  const factory SocketResponse({
    required String status, // 'ok' or 'error'
    T? data,
    String? error,
  }) = _SocketResponse<T>;

  factory SocketResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object?) fromJsonT,
  ) =>
      _$SocketResponseFromJson(json, fromJsonT);
}
