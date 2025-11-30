import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:logger/logger.dart';

/// Service for managing MediaSoup device
class DeviceService {
  static final DeviceService _instance = DeviceService._internal();
  factory DeviceService() => _instance;
  DeviceService._internal();

  final Logger _logger = Logger();

  RTCPeerConnection? _device;
  Map<String, dynamic>? _rtpCapabilities;
  bool _isLoaded = false;

  /// Load device with router RTP capabilities
  Future<RTCPeerConnection> loadDevice(
      Map<String, dynamic> routerRtpCapabilities) async {
    try {
      _logger.d('Loading device with router RTP capabilities');

      // In flutter_webrtc, we use RTCPeerConnection instead of mediasoup Device
      // The device initialization is handled differently
      final Map<String, dynamic> configuration = {
        'iceServers': [],
        'sdpSemantics': 'unified-plan',
      };

      _device = await createPeerConnection(configuration);
      _rtpCapabilities = routerRtpCapabilities;
      _isLoaded = true;

      _logger.i('Device loaded successfully');
      return _device!;
    } catch (e) {
      _logger.e('Failed to load device: $e');
      rethrow;
    }
  }

  /// Get the device instance
  RTCPeerConnection? getDevice() {
    return _device;
  }

  /// Get RTP capabilities
  Map<String, dynamic>? getRtpCapabilities() {
    return _rtpCapabilities;
  }

  /// Check if device is loaded
  bool isLoaded() {
    return _isLoaded;
  }

  /// Reset device
  Future<void> reset() async {
    _logger.d('Resetting device');

    if (_device != null) {
      await _device!.close();
      _device = null;
    }

    _rtpCapabilities = null;
    _isLoaded = false;

    _logger.i('Device reset completed');
  }
}
