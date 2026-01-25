import 'package:flutter/foundation.dart';

const String appName = 'mediasoup-client';

typedef LoggerDebug = void Function(dynamic message);

class Logger {
  final String? _prefix;

  late LoggerDebug debug;
  late LoggerDebug warn;
  late LoggerDebug error;

  Logger(this._prefix) {
    if (_prefix != null) {
      debug = (dynamic message) {
        debugPrint('$appName:$_prefix $message');
      };
      warn = (dynamic message) {
        debugPrint('$appName:WARN:$_prefix $message');
      };
      error = (dynamic message) {
        debugPrint('$appName:ERROR:$_prefix $message');
      };
    } else {
      debug = (dynamic message) {
        debugPrint('$appName $message');
      };
      warn = (dynamic message) {
        debugPrint('$appName:WARN $message');
      };
      error = (dynamic message) {
        debugPrint('$appName:ERROR $message');
      };
    }
  }
}
