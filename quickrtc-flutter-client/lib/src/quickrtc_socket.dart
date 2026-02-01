import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;

/// Exception thrown when socket connection fails
class QuickRTCSocketConnectionException implements Exception {
  final String message;
  final dynamic cause;

  const QuickRTCSocketConnectionException(this.message, {this.cause});

  @override
  String toString() =>
      'QuickRTCSocketConnectionException: $message${cause != null ? ' ($cause)' : ''}';
}

/// Helper class for creating and managing Socket.IO connections
///
/// Simplifies the socket connection process with sensible defaults.
///
/// Example:
/// ```dart
/// // Simple connection
/// final socket = await QuickRTCSocket.connect('https://your-server.com');
///
/// // With options
/// final socket = await QuickRTCSocket.connect(
///   'https://your-server.com',
///   timeout: Duration(seconds: 15),
///   autoReconnect: true,
/// );
///
/// // Create controller with the socket
/// final controller = QuickRTCController(socket: socket);
/// ```
abstract class QuickRTCSocket {
  /// Connect to a Socket.IO server
  ///
  /// [serverUrl] - The URL of the Socket.IO server
  /// [timeout] - Connection timeout (default: 10 seconds)
  /// [autoReconnect] - Whether to auto-reconnect on disconnect (default: false)
  /// [extraHeaders] - Additional headers to send with the connection
  /// [query] - Query parameters to send with the connection
  ///
  /// Returns a connected [io.Socket] instance.
  /// Throws [QuickRTCSocketConnectionException] if connection fails or times out.
  static Future<io.Socket> connect(
    String serverUrl, {
    Duration timeout = const Duration(seconds: 10),
    bool autoReconnect = false,
    Map<String, String>? extraHeaders,
    Map<String, dynamic>? query,
  }) async {
    final completer = Completer<bool>();

    // Build socket options
    final optionBuilder =
        io.OptionBuilder().setTransports(['websocket']).disableAutoConnect();

    if (!autoReconnect) {
      optionBuilder.disableReconnection();
    }

    if (extraHeaders != null) {
      optionBuilder.setExtraHeaders(extraHeaders);
    }

    if (query != null) {
      optionBuilder.setQuery(query);
    }

    final socket = io.io(serverUrl, optionBuilder.build());

    // Setup connection handlers
    void onConnect(_) {
      if (!completer.isCompleted) {
        completer.complete(true);
      }
    }

    void onConnectError(error) {
      if (!completer.isCompleted) {
        completer.complete(false);
      }
    }

    void onError(error) {
      if (!completer.isCompleted) {
        completer.complete(false);
      }
    }

    socket.onConnect(onConnect);
    socket.onConnectError(onConnectError);
    socket.onError(onError);

    // Start connection
    socket.connect();

    // Wait for connection with timeout
    try {
      final connected = await completer.future.timeout(
        timeout,
        onTimeout: () => false,
      );

      if (!connected) {
        socket.disconnect();
        socket.dispose();
        throw QuickRTCSocketConnectionException(
          'Failed to connect to $serverUrl',
        );
      }

      return socket;
    } catch (e) {
      socket.disconnect();
      socket.dispose();
      if (e is QuickRTCSocketConnectionException) rethrow;
      throw QuickRTCSocketConnectionException(
        'Connection error',
        cause: e,
      );
    }
  }

  /// Create a socket without connecting
  ///
  /// Useful when you need to set up additional listeners before connecting.
  ///
  /// Example:
  /// ```dart
  /// final socket = QuickRTCSocket.create('https://your-server.com');
  /// socket.onAny((event, data) => print('Event: $event'));
  /// socket.connect();
  /// ```
  static io.Socket create(
    String serverUrl, {
    bool autoReconnect = false,
    Map<String, String>? extraHeaders,
    Map<String, dynamic>? query,
  }) {
    final optionBuilder =
        io.OptionBuilder().setTransports(['websocket']).disableAutoConnect();

    if (!autoReconnect) {
      optionBuilder.disableReconnection();
    }

    if (extraHeaders != null) {
      optionBuilder.setExtraHeaders(extraHeaders);
    }

    if (query != null) {
      optionBuilder.setQuery(query);
    }

    return io.io(serverUrl, optionBuilder.build());
  }
}
