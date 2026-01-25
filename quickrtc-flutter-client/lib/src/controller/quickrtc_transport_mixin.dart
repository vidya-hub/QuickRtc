import 'dart:async';
import 'package:quickrtc_flutter_client/src/mediasoup/mediasoup.dart';
import 'package:quickrtc_flutter_client/types.dart';

/// Mixin providing transport creation and handling functionality
mixin QuickRTCTransportMixin {
  // These must be implemented by the class using this mixin
  Device? get device;
  set device(Device? value);
  Transport? get sendTransport;
  set sendTransport(Transport? value);
  Transport? get recvTransport;
  set recvTransport(Transport? value);
  String? get conferenceId;
  String? get participantId;

  void log(String message, [dynamic data]);
  Future<Map<String, dynamic>> emitWithAck(
      String event, Map<String, dynamic> data,);
  void onProducerCallback(Producer producer);
  void onConsumerCallback(Consumer consumer, [dynamic accept]);

  /// Create send and receive transports
  Future<void> createTransports() async {
    log('Creating transports');

    // Create send transport
    final sendResponse = await emitWithAck('createTransport', {
      'conferenceId': conferenceId,
      'participantId': participantId,
      'direction': 'producer',
    });

    if (sendResponse['status'] != 'ok') {
      throw Exception(
        sendResponse['error'] ?? 'Failed to create send transport',
      );
    }

    final sendData = TransportOptionsData.fromJson(
      sendResponse['data'] as Map<String, dynamic>,
    );

    sendTransport = device!.createSendTransportFromMap(
      {
        'id': sendData.id,
        'iceParameters': sendData.iceParameters,
        'iceCandidates': sendData.iceCandidates,
        'dtlsParameters': sendData.dtlsParameters,
        'sctpParameters': sendData.sctpParameters,
      },
      producerCallback: onProducerCallback,
    );

    _setupSendTransportHandlers();

    // Create receive transport
    final recvResponse = await emitWithAck('createTransport', {
      'conferenceId': conferenceId,
      'participantId': participantId,
      'direction': 'consumer',
    });

    if (recvResponse['status'] != 'ok') {
      throw Exception(
        recvResponse['error'] ?? 'Failed to create receive transport',
      );
    }

    final recvData = TransportOptionsData.fromJson(
      recvResponse['data'] as Map<String, dynamic>,
    );

    recvTransport = device!.createRecvTransportFromMap(
      {
        'id': recvData.id,
        'iceParameters': recvData.iceParameters,
        'iceCandidates': recvData.iceCandidates,
        'dtlsParameters': recvData.dtlsParameters,
        'sctpParameters': recvData.sctpParameters,
      },
      consumerCallback: onConsumerCallback,
    );

    _setupRecvTransportHandlers();

    log('Transports created');
  }

  void _setupSendTransportHandlers() {
    sendTransport!.on('connect', (Map data) async {
      log('Send transport connect');
      try {
        final response = await emitWithAck('connectTransport', {
          'conferenceId': conferenceId,
          'participantId': participantId,
          'direction': 'producer',
          'dtlsParameters': data['dtlsParameters'].toMap(),
        });

        if (response['status'] == 'ok') {
          data['callback']();
        } else {
          data['errback'](Exception(response['error']));
        }
      } catch (e) {
        data['errback'](e);
      }
    });

    sendTransport!.on('produce', (Map data) async {
      log('Send transport produce', data['kind']);
      try {
        final appData = data['appData'] as Map<String, dynamic>? ?? {};
        final streamType = appData['streamType'] as String?;

        final response = await emitWithAck('produce', {
          'conferenceId': conferenceId,
          'participantId': participantId,
          'transportId': sendTransport!.id,
          'kind': data['kind'],
          'rtpParameters': data['rtpParameters'].toMap(),
          'appData': appData,
          'streamType': streamType,
        });

        if (response['status'] == 'ok') {
          final producerId = response['data']['producerId'] as String;
          data['callback'](producerId);
        } else {
          data['errback'](Exception(response['error']));
        }
      } catch (e) {
        data['errback'](e);
      }
    });
  }

  void _setupRecvTransportHandlers() {
    recvTransport!.on('connect', (Map data) async {
      log('Recv transport connect');
      try {
        final response = await emitWithAck('connectTransport', {
          'conferenceId': conferenceId,
          'participantId': participantId,
          'direction': 'consumer',
          'dtlsParameters': data['dtlsParameters'].toMap(),
        });

        if (response['status'] == 'ok') {
          data['callback']();
        } else {
          data['errback'](Exception(response['error']));
        }
      } catch (e) {
        data['errback'](e);
      }
    });
  }

  /// Close transports (defensive - ignores errors during cleanup)
  void closeTransports() {
    try {
      sendTransport?.close();
    } catch (_) {
      // Ignore errors during cleanup
    }
    try {
      recvTransport?.close();
    } catch (_) {
      // Ignore errors during cleanup
    }
    sendTransport = null;
    recvTransport = null;
  }
}
