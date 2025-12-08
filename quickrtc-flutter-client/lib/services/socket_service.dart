import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:logger/logger.dart';
import 'package:quickrtc_flutter_client/models/transport_options.dart';
import 'package:quickrtc_flutter_client/models/consumer_params.dart';
import 'package:quickrtc_flutter_client/models/participant_info.dart';

/// Service for managing Socket.IO communication
class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  final Logger _logger = Logger();

  io.Socket? _socket;
  String? _conferenceId;
  String? _participantId;

  // Event controllers
  final _participantJoinedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _participantLeftController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _newProducerController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _producerClosedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _consumerClosedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _audioMutedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _audioUnmutedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _videoMutedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _videoUnmutedController =
      StreamController<Map<String, dynamic>>.broadcast();

  // Event streams
  Stream<Map<String, dynamic>> get onParticipantJoined =>
      _participantJoinedController.stream;
  Stream<Map<String, dynamic>> get onParticipantLeft =>
      _participantLeftController.stream;
  Stream<Map<String, dynamic>> get onNewProducer =>
      _newProducerController.stream;
  Stream<Map<String, dynamic>> get onProducerClosed =>
      _producerClosedController.stream;
  Stream<Map<String, dynamic>> get onConsumerClosed =>
      _consumerClosedController.stream;
  Stream<Map<String, dynamic>> get onAudioMuted => _audioMutedController.stream;
  Stream<Map<String, dynamic>> get onAudioUnmuted =>
      _audioUnmutedController.stream;
  Stream<Map<String, dynamic>> get onVideoMuted => _videoMutedController.stream;
  Stream<Map<String, dynamic>> get onVideoUnmuted =>
      _videoUnmutedController.stream;

  /// Set socket connection
  void setSocket(io.Socket socket, String conferenceId, String participantId) {
    _socket = socket;
    // Store conference ID for debugging if needed: _conferenceId = conferenceId
    _setupEventListeners();
    _logger.i('Socket service initialized for conference: $conferenceId');
  }

  /// Setup socket event listeners
  void _setupEventListeners() {
    if (_socket == null) return;

    _socket!.on('participantJoined', (data) {
      _logger.d('Participant joined: $data');
      _participantJoinedController.add(data as Map<String, dynamic>);
    });

    _socket!.on('participantLeft', (data) {
      _logger.d('Participant left: $data');
      _participantLeftController.add(data as Map<String, dynamic>);
    });

    _socket!.on('newProducer', (data) {
      _logger.d('New producer: $data');
      _newProducerController.add(data as Map<String, dynamic>);
    });

    _socket!.on('producerClosed', (data) {
      _logger.d('Producer closed: $data');
      _producerClosedController.add(data as Map<String, dynamic>);
    });

    _socket!.on('consumerClosed', (data) {
      _logger.d('Consumer closed: $data');
      _consumerClosedController.add(data as Map<String, dynamic>);
    });

    _socket!.on('audioMuted', (data) {
      _audioMutedController.add(data as Map<String, dynamic>);
    });

    _socket!.on('audioUnmuted', (data) {
      _audioUnmutedController.add(data as Map<String, dynamic>);
    });

    _socket!.on('videoMuted', (data) {
      _videoMutedController.add(data as Map<String, dynamic>);
    });

    _socket!.on('videoUnmuted', (data) {
      _videoUnmutedController.add(data as Map<String, dynamic>);
    });
  }

  /// Join conference
  Future<Map<String, dynamic>> joinConference({
    required String conferenceId,
    required String participantId,
    required String participantName,
  }) async {
    _logger.d('Joining conference: $conferenceId');

    // Store conference and participant IDs for future use
    _conferenceId = conferenceId;
    _participantId = participantId;

    final completer = Completer<Map<String, dynamic>>();

    // Wrap data according to server's expected format: { data: { conferenceId, participantId, participantName } }
    _socket!.emitWithAck('joinConference', {
      'data': {
        'conferenceId': conferenceId,
        'participantId': participantId,
        'participantName': participantName,
      }
    }, ack: (response) {
      _logger.d('Join conference response: $response');
      if (response != null && response['status'] == 'ok') {
        _logger.i('Joined conference successfully');
        completer.complete(response['data'] as Map<String, dynamic>);
      } else {
        final error = response?['error'] ?? 'Unknown error joining conference';
        _logger.e('Failed to join conference: $error');
        completer.completeError(Exception(error));
      }
    });

    return completer.future;
  }

  /// Create transports
  Future<TransportPair> createTransports() async {
    _logger.d('Creating transports');

    if (_conferenceId == null || _participantId == null) {
      throw Exception('Must join conference before creating transports');
    }

    final sendCompleter = Completer<TransportOptions>();
    final recvCompleter = Completer<TransportOptions>();

    _socket!.emitWithAck('createTransport', {
      'conferenceId': _conferenceId,
      'participantId': _participantId,
      'direction': 'producer',
    }, ack: (response) {
      if (response['status'] == 'ok') {
        sendCompleter.complete(TransportOptions.fromJson(response['data']));
      } else {
        sendCompleter.completeError(Exception(response['error']));
      }
    });

    _socket!.emitWithAck('createTransport', {
      'conferenceId': _conferenceId,
      'participantId': _participantId,
      'direction': 'consumer',
    }, ack: (response) {
      if (response['status'] == 'ok') {
        recvCompleter.complete(TransportOptions.fromJson(response['data']));
      } else {
        recvCompleter.completeError(Exception(response['error']));
      }
    });

    final results =
        await Future.wait([sendCompleter.future, recvCompleter.future]);

    _logger.i('Transports created successfully');
    return TransportPair(sendTransport: results[0], recvTransport: results[1]);
  }

  /// Connect transport
  Future<void> connectTransport({
    required String direction,
    required Map<String, dynamic> dtlsParameters,
  }) async {
    _logger.d('Connecting transport: $direction');

    if (_conferenceId == null || _participantId == null) {
      throw Exception('Must join conference before connecting transport');
    }

    final completer = Completer<void>();

    _socket!.emitWithAck('connectTransport', {
      'conferenceId': _conferenceId,
      'participantId': _participantId,
      'direction': direction,
      'dtlsParameters': dtlsParameters,
    }, ack: (response) {
      if (response['status'] == 'ok') {
        _logger.i('Transport connected: $direction');
        completer.complete();
      } else {
        _logger.e('Failed to connect transport: ${response['error']}');
        completer.completeError(Exception(response['error']));
      }
    });

    return completer.future;
  }

  /// Produce media
  Future<String> produce({
    required String transportId,
    required String kind,
    required Map<String, dynamic> rtpParameters,
  }) async {
    _logger.d('Producing media: $kind');

    if (_conferenceId == null || _participantId == null) {
      throw Exception('Must join conference before producing');
    }

    final completer = Completer<String>();

    _socket!.emitWithAck('produce', {
      'conferenceId': _conferenceId,
      'participantId': _participantId,
      'transportId': transportId,
      'kind': kind,
      'rtpParameters': rtpParameters,
    }, ack: (response) {
      if (response['status'] == 'ok') {
        final producerId = response['data']['producerId'] as String;
        _logger.i('Media produced: $kind, producerId: $producerId');
        completer.complete(producerId);
      } else {
        _logger.e('Failed to produce media: ${response['error']}');
        completer.completeError(Exception(response['error']));
      }
    });

    return completer.future;
  }

  /// Consume participant media
  Future<List<ConsumerParams>> consumeParticipantMedia({
    required String targetParticipantId,
    required Map<String, dynamic> rtpCapabilities,
  }) async {
    _logger.d('Consuming participant media: $targetParticipantId');

    if (_conferenceId == null || _participantId == null) {
      throw Exception('Must join conference before consuming');
    }

    final completer = Completer<List<ConsumerParams>>();

    _socket!.emitWithAck('consumeParticipantMedia', {
      'conferenceId': _conferenceId,
      'participantId': _participantId,
      'targetParticipantId': targetParticipantId,
      'rtpCapabilities': rtpCapabilities,
    }, ack: (response) {
      if (response['status'] == 'ok') {
        final consumers = (response['data'] as List)
            .map((e) => ConsumerParams.fromJson(e as Map<String, dynamic>))
            .toList();
        _logger.i('Consuming ${consumers.length} streams from participant');
        completer.complete(consumers);
      } else {
        _logger.e('Failed to consume media: ${response['error']}');
        completer.completeError(Exception(response['error']));
      }
    });

    return completer.future;
  }

  /// Resume consumer
  Future<void> resumeConsumer(String consumerId) async {
    _logger.d('Resuming consumer: $consumerId');

    if (_conferenceId == null || _participantId == null) {
      throw Exception('Must join conference before resuming consumer');
    }

    final completer = Completer<void>();

    _socket!.emitWithAck('unpauseConsumer', {
      'conferenceId': _conferenceId,
      'participantId': _participantId,
      'consumerId': consumerId,
    }, ack: (response) {
      if (response['status'] == 'ok') {
        _logger.i('Consumer resumed: $consumerId');
        completer.complete();
      } else {
        _logger.e('Failed to resume consumer: ${response['error']}');
        completer.completeError(Exception(response['error']));
      }
    });

    return completer.future;
  }

  /// Close producer
  Future<void> closeProducer(String producerId) async {
    _logger.d('Closing producer: $producerId');

    if (_conferenceId == null || _participantId == null) {
      throw Exception('Must join conference before closing producer');
    }

    final completer = Completer<void>();

    _socket!.emitWithAck('closeProducer', {
      'conferenceId': _conferenceId,
      'participantId': _participantId,
      'extraData': {
        'producerId': producerId,
      },
    }, ack: (response) {
      if (response['status'] == 'ok') {
        _logger.i('Producer closed: $producerId');
        completer.complete();
      } else {
        _logger.e('Failed to close producer: ${response['error']}');
        completer.completeError(Exception(response['error']));
      }
    });

    return completer.future;
  }

  /// Close consumer
  Future<void> closeConsumer(String consumerId) async {
    _logger.d('Closing consumer: $consumerId');

    if (_conferenceId == null || _participantId == null) {
      throw Exception('Must join conference before closing consumer');
    }

    final completer = Completer<void>();

    _socket!.emitWithAck('closeConsumer', {
      'conferenceId': _conferenceId,
      'participantId': _participantId,
      'extraData': {
        'consumerId': consumerId,
      },
    }, ack: (response) {
      if (response['status'] == 'ok') {
        _logger.i('Consumer closed: $consumerId');
        completer.complete();
      } else {
        _logger.e('Failed to close consumer: ${response['error']}');
        completer.completeError(Exception(response['error']));
      }
    });

    return completer.future;
  }

  /// Get participants
  Future<List<ParticipantInfo>> getParticipants() async {
    _logger.d('Getting participants');

    if (_conferenceId == null) {
      throw Exception('Must join conference before getting participants');
    }

    final completer = Completer<List<ParticipantInfo>>();

    _socket!.emitWithAck('getParticipants', {
      'conferenceId': _conferenceId,
    }, ack: (response) {
      if (response['status'] == 'ok') {
        final participants = (response['data'] as List)
            .map((e) => ParticipantInfo.fromJson(e as Map<String, dynamic>))
            .toList();
        _logger.i('Retrieved ${participants.length} participants');
        completer.complete(participants);
      } else {
        _logger.e('Failed to get participants: ${response['error']}');
        completer.completeError(Exception(response['error']));
      }
    });

    return completer.future;
  }

  /// Leave conference
  Future<void> leaveConference() async {
    _logger.d('Leaving conference');

    if (_conferenceId == null || _participantId == null) {
      throw Exception('Not currently in a conference');
    }

    final completer = Completer<void>();

    _socket!.emitWithAck('leaveConference', {
      'conferenceId': _conferenceId,
      'participantId': _participantId,
    }, ack: (response) {
      if (response['status'] == 'ok') {
        _logger.i('Left conference successfully');
        _conferenceId = null;
        _participantId = null;
        completer.complete();
      } else {
        _logger.e('Failed to leave conference: ${response['error']}');
        completer.completeError(Exception(response['error']));
      }
    });

    return completer.future;
  }

  /// Reset socket service
  Future<void> reset() async {
    _logger.d('Resetting socket service');

    if (_socket != null) {
      _socket!.off('participantJoined');
      _socket!.off('participantLeft');
      _socket!.off('newProducer');
      _socket!.off('producerClosed');
      _socket!.off('consumerClosed');
      _socket!.off('audioMuted');
      _socket!.off('audioUnmuted');
      _socket!.off('videoMuted');
      _socket!.off('videoUnmuted');
    }

    _socket = null;
    _conferenceId = null;
    _participantId = null;

    _logger.i('Socket service reset completed');
  }

  /// Dispose resources
  Future<void> dispose() async {
    await _participantJoinedController.close();
    await _participantLeftController.close();
    await _newProducerController.close();
    await _producerClosedController.close();
    await _consumerClosedController.close();
    await _audioMutedController.close();
    await _audioUnmutedController.close();
    await _videoMutedController.close();
    await _videoUnmutedController.close();
  }
}
