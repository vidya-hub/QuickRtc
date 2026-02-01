import 'dart:async';

import 'package:events2/events2.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/common/logger.dart';

Logger _logger = Logger('EnhancedEventEmitter');

/// Default timeout for safeEmitAsFuture operations
const Duration _defaultEmitTimeout = Duration(seconds: 30);

class EnhancedEventEmitter extends EventEmitter {
  /// Internal storage for event handlers that bypasses events2's broken callback mechanism.
  /// The events2 package uses func.runtimeType.toString() for argument detection,
  /// which fails on web builds due to minification.
  final Map<String, List<Function>> _safeHandlers = {};

  EnhancedEventEmitter() : super();

  /// Registers an event handler that works correctly on web builds.
  /// Use this instead of [on] when handlers need to receive Map arguments.
  @override
  void on(String event, Function handler) {
    _safeHandlers.putIfAbsent(event, () => []);
    _safeHandlers[event]!.add(handler);
  }

  /// Removes an event handler.
  @override
  void remove(String event, Function handler) {
    _safeHandlers[event]?.remove(handler);
  }

  /// Removes all handlers for an event.
  @override
  void off(String event) {
    _safeHandlers[event]?.clear();
  }

  /// Returns all listeners for an event.
  @override
  List<dynamic> listeners(dynamic event) {
    return _safeHandlers[event as String] ?? [];
  }

  /// Clears all event handlers.
  @override
  void clearListeners() {
    _safeHandlers.clear();
  }

  /// Emits an event, calling all registered handlers with the provided data.
  /// This implementation bypasses events2's broken argument detection.
  /// It tries to call handlers with the argument first, then without if that fails.
  @override
  void emit(String event, [arg0, arg1, arg2, arg3, arg4, arg5]) {
    final handlers = _safeHandlers[event]?.toList() ?? [];
    for (final handler in handlers) {
      try {
        // Try calling with argument first (most handlers expect Map)
        if (arg0 != null) {
          try {
            handler(arg0);
          } on NoSuchMethodError {
            // Handler doesn't accept arguments, call without
            handler();
          }
        } else {
          // No argument provided, try without first then with null
          try {
            handler();
          } on NoSuchMethodError {
            // Handler expects an argument, call with null
            handler(null);
          }
        }
      } catch (e) {
        if (e is! NoSuchMethodError) {
          _logger.error('emit() handler threw error for event "$event": $e');
        }
      }
    }
  }

  void safeEmit(String event, [Map<String, dynamic>? args]) {
    try {
      emit(event, args);
    } catch (error) {
      _logger.error(
        'safeEmit() event listener threw an error [event:$event]:$error',
      );
    }
  }

  /// Emits an event and returns a Future that completes when the callback is invoked.
  ///
  /// [timeout] - Optional timeout duration. Defaults to 30 seconds.
  /// If the timeout is reached before the callback is invoked, the Future
  /// completes with a TimeoutException.
  Future<dynamic> safeEmitAsFuture(
    String event, [
    Map<String, dynamic>? args,
    Duration? timeout,
  ]) async {
    try {
      final Completer<dynamic> completer = Completer<dynamic>();
      final effectiveTimeout = timeout ?? _defaultEmitTimeout;

      Map<String, dynamic> args0 = {
        'callback': (dynamic result) {
          if (!completer.isCompleted) {
            completer.complete(result);
          }
        },
        'errback': (dynamic error) {
          if (!completer.isCompleted) {
            completer.completeError(error);
          }
        },
        ...?args,
      };

      // Use our safe emit instead of events2's emitAsFuture which has
      // broken argument detection on web builds
      emit(event, args0);

      return completer.future.timeout(
        effectiveTimeout,
        onTimeout: () {
          throw TimeoutException(
            'safeEmitAsFuture timed out for event: $event',
            effectiveTimeout,
          );
        },
      );
    } catch (error) {
      _logger.error(
        'safeEmitAsFuture() event listener threw an error [event:$event]:$error',
      );
      rethrow;
    }
  }
}
