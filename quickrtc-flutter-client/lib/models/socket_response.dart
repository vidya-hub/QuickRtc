import 'package:equatable/equatable.dart';

/// Standard response from socket server
class SocketResponse<T> extends Equatable {
  final String status; // 'ok' or 'error'
  final T? data;
  final String? error;

  const SocketResponse({
    required this.status,
    this.data,
    this.error,
  });

  /// Check if the response is successful
  bool get isSuccess => status == 'ok';

  /// Check if the response is an error
  bool get isError => status == 'error';

  factory SocketResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object?) fromJsonT,
  ) {
    return SocketResponse(
      status: json['status'] as String,
      data: json['data'] != null ? fromJsonT(json['data']) : null,
      error: json['error'] as String?,
    );
  }

  /// Convenience factory for simple responses without data transformation
  factory SocketResponse.fromJsonSimple(Map<String, dynamic> json) {
    return SocketResponse(
      status: json['status'] as String,
      data: json['data'] as T?,
      error: json['error'] as String?,
    );
  }

  Map<String, dynamic> toJson(Object? Function(T)? toJsonT) {
    return {
      'status': status,
      if (data != null) 'data': toJsonT != null ? toJsonT(data as T) : data,
      if (error != null) 'error': error,
    };
  }

  SocketResponse<T> copyWith({
    String? status,
    T? data,
    String? error,
  }) {
    return SocketResponse(
      status: status ?? this.status,
      data: data ?? this.data,
      error: error ?? this.error,
    );
  }

  @override
  List<Object?> get props => [status, data, error];

  @override
  String toString() {
    if (isError) {
      return 'SocketResponse.error($error)';
    }
    return 'SocketResponse.ok(data: $data)';
  }
}
