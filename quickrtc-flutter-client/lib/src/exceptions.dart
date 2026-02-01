/// Custom exceptions for QuickRTC
///
/// These exceptions provide better error handling and debugging
/// compared to throwing plain strings.

/// Base class for all QuickRTC exceptions
abstract class QuickRTCException implements Exception {
  /// The error message
  final String message;

  /// Optional underlying cause
  final Object? cause;

  const QuickRTCException(this.message, [this.cause]);

  @override
  String toString() {
    if (cause != null) {
      return '$runtimeType: $message (caused by: $cause)';
    }
    return '$runtimeType: $message';
  }
}

/// Thrown when an operation times out
class QuickRTCTimeoutException extends QuickRTCException {
  /// The duration that was exceeded
  final Duration timeout;

  /// The operation that timed out
  final String operation;

  QuickRTCTimeoutException({
    required this.operation,
    required this.timeout,
    Object? cause,
  }) : super('$operation timed out after ${timeout.inSeconds} seconds', cause);
}

/// Thrown when the controller is disposed during an operation
class QuickRTCDisposedException extends QuickRTCException {
  QuickRTCDisposedException([String? operation])
      : super(operation != null
            ? 'Controller disposed during $operation'
            : 'Controller has been disposed');
}

/// Thrown when not connected to a conference
class QuickRTCNotConnectedException extends QuickRTCException {
  QuickRTCNotConnectedException([String? operation])
      : super(operation != null
            ? 'Not connected to a conference: cannot perform $operation'
            : 'Not connected to a conference');
}

/// Thrown when already connected to a conference
class QuickRTCAlreadyConnectedException extends QuickRTCException {
  QuickRTCAlreadyConnectedException()
      : super('Already connected to a conference');
}

/// Thrown when a transport operation fails
class QuickRTCTransportException extends QuickRTCException {
  QuickRTCTransportException(super.message, [super.cause]);
}

/// Thrown when a producer operation fails
class QuickRTCProducerException extends QuickRTCException {
  /// The producer ID if available
  final String? producerId;

  QuickRTCProducerException(
    String message, {
    this.producerId,
    Object? cause,
  }) : super(message, cause);
}

/// Thrown when a consumer operation fails
class QuickRTCConsumerException extends QuickRTCException {
  /// The consumer ID if available
  final String? consumerId;

  QuickRTCConsumerException(
    String message, {
    this.consumerId,
    Object? cause,
  }) : super(message, cause);
}

/// Thrown when a media operation fails (camera, microphone, screen share)
class QuickRTCMediaException extends QuickRTCException {
  QuickRTCMediaException(super.message, [super.cause]);
}

/// Thrown when a socket communication fails
class QuickRTCSocketException extends QuickRTCException {
  /// The event name that failed
  final String? event;

  QuickRTCSocketException(
    String message, {
    this.event,
    Object? cause,
  }) : super(message, cause);
}

/// Thrown when server returns an error response
class QuickRTCServerException extends QuickRTCException {
  /// The server error code if available
  final String? errorCode;

  QuickRTCServerException(
    String message, {
    this.errorCode,
    Object? cause,
  }) : super(message, cause);
}

/// Thrown when device capabilities are insufficient
class QuickRTCCapabilityException extends QuickRTCException {
  QuickRTCCapabilityException(super.message, [super.cause]);
}

/// Thrown when an invalid argument is provided
class QuickRTCArgumentException extends QuickRTCException {
  /// The name of the invalid argument
  final String argumentName;

  QuickRTCArgumentException(this.argumentName, String message, [Object? cause])
      : super('Invalid argument "$argumentName": $message', cause);
}

/// Thrown when a resource is not found
class QuickRTCNotFoundException extends QuickRTCException {
  /// The type of resource not found
  final String resourceType;

  /// The ID of the resource
  final String resourceId;

  QuickRTCNotFoundException(this.resourceType, this.resourceId)
      : super('$resourceType not found: $resourceId');
}
