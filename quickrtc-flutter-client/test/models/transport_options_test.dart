import 'package:flutter_test/flutter_test.dart';
import 'package:quickrtc_flutter_client/models/transport_options.dart';

void main() {
  group('TransportOptions', () {
    const testId = 'transport-123';
    final testIceParameters = {
      'usernameFragment': 'abc',
      'password': 'xyz',
      'iceLite': true,
    };
    final testIceCandidates = [
      {
        'foundation': '1',
        'priority': 1000,
        'ip': '192.168.1.1',
        'port': 5000,
        'type': 'host',
        'protocol': 'udp',
      }
    ];
    final testDtlsParameters = {
      'role': 'auto',
      'fingerprints': [
        {'algorithm': 'sha-256', 'value': 'abc123'}
      ],
    };
    final testSctpParameters = {
      'port': 5000,
      'OS': 1024,
      'MIS': 1024,
      'maxMessageSize': 262144,
    };

    test('creates instance with required parameters', () {
      final options = TransportOptions(
        id: testId,
        iceParameters: testIceParameters,
        iceCandidates: testIceCandidates,
        dtlsParameters: testDtlsParameters,
      );

      expect(options.id, testId);
      expect(options.iceParameters, testIceParameters);
      expect(options.iceCandidates, testIceCandidates);
      expect(options.dtlsParameters, testDtlsParameters);
      expect(options.sctpParameters, isNull);
    });

    test('creates instance with optional sctpParameters', () {
      final options = TransportOptions(
        id: testId,
        iceParameters: testIceParameters,
        iceCandidates: testIceCandidates,
        dtlsParameters: testDtlsParameters,
        sctpParameters: testSctpParameters,
      );

      expect(options.sctpParameters, testSctpParameters);
    });

    test('fromJson creates instance correctly', () {
      final json = {
        'id': testId,
        'iceParameters': testIceParameters,
        'iceCandidates': testIceCandidates,
        'dtlsParameters': testDtlsParameters,
        'sctpParameters': testSctpParameters,
      };

      final options = TransportOptions.fromJson(json);

      expect(options.id, testId);
      expect(options.iceParameters, testIceParameters);
      expect(options.iceCandidates.length, testIceCandidates.length);
      expect(options.dtlsParameters, testDtlsParameters);
      expect(options.sctpParameters, testSctpParameters);
    });

    test('fromJson handles null sctpParameters', () {
      final json = {
        'id': testId,
        'iceParameters': testIceParameters,
        'iceCandidates': testIceCandidates,
        'dtlsParameters': testDtlsParameters,
      };

      final options = TransportOptions.fromJson(json);

      expect(options.sctpParameters, isNull);
    });

    test('toJson returns correct map', () {
      final options = TransportOptions(
        id: testId,
        iceParameters: testIceParameters,
        iceCandidates: testIceCandidates,
        dtlsParameters: testDtlsParameters,
        sctpParameters: testSctpParameters,
      );

      final json = options.toJson();

      expect(json['id'], testId);
      expect(json['iceParameters'], testIceParameters);
      expect(json['iceCandidates'], testIceCandidates);
      expect(json['dtlsParameters'], testDtlsParameters);
      expect(json['sctpParameters'], testSctpParameters);
    });

    test('toJson excludes null sctpParameters', () {
      final options = TransportOptions(
        id: testId,
        iceParameters: testIceParameters,
        iceCandidates: testIceCandidates,
        dtlsParameters: testDtlsParameters,
      );

      final json = options.toJson();

      expect(json.containsKey('sctpParameters'), isFalse);
    });

    test('copyWith creates new instance with updated values', () {
      final original = TransportOptions(
        id: testId,
        iceParameters: testIceParameters,
        iceCandidates: testIceCandidates,
        dtlsParameters: testDtlsParameters,
      );

      final copied = original.copyWith(id: 'new-transport-id');

      expect(copied.id, 'new-transport-id');
      expect(copied.iceParameters, testIceParameters);
      expect(original.id, testId);
    });

    test('equality works correctly', () {
      final options1 = TransportOptions(
        id: testId,
        iceParameters: testIceParameters,
        iceCandidates: testIceCandidates,
        dtlsParameters: testDtlsParameters,
      );

      final options2 = TransportOptions(
        id: testId,
        iceParameters: testIceParameters,
        iceCandidates: testIceCandidates,
        dtlsParameters: testDtlsParameters,
      );

      final options3 = TransportOptions(
        id: 'different-id',
        iceParameters: testIceParameters,
        iceCandidates: testIceCandidates,
        dtlsParameters: testDtlsParameters,
      );

      expect(options1, equals(options2));
      expect(options1, isNot(equals(options3)));
    });

    test('toString returns meaningful representation', () {
      final options = TransportOptions(
        id: testId,
        iceParameters: testIceParameters,
        iceCandidates: testIceCandidates,
        dtlsParameters: testDtlsParameters,
      );

      expect(options.toString(), contains(testId));
    });
  });

  group('TransportPair', () {
    late TransportOptions sendTransport;
    late TransportOptions recvTransport;

    setUp(() {
      sendTransport = TransportOptions(
        id: 'send-transport-123',
        iceParameters: {'usernameFragment': 'send'},
        iceCandidates: [],
        dtlsParameters: {'role': 'auto'},
      );

      recvTransport = TransportOptions(
        id: 'recv-transport-456',
        iceParameters: {'usernameFragment': 'recv'},
        iceCandidates: [],
        dtlsParameters: {'role': 'auto'},
      );
    });

    test('creates instance with required parameters', () {
      final pair = TransportPair(
        sendTransport: sendTransport,
        recvTransport: recvTransport,
      );

      expect(pair.sendTransport, sendTransport);
      expect(pair.recvTransport, recvTransport);
    });

    test('fromJson creates instance correctly', () {
      final json = {
        'sendTransport': {
          'id': 'send-transport-123',
          'iceParameters': {'usernameFragment': 'send'},
          'iceCandidates': <Map<String, dynamic>>[],
          'dtlsParameters': {'role': 'auto'},
        },
        'recvTransport': {
          'id': 'recv-transport-456',
          'iceParameters': {'usernameFragment': 'recv'},
          'iceCandidates': <Map<String, dynamic>>[],
          'dtlsParameters': {'role': 'auto'},
        },
      };

      final pair = TransportPair.fromJson(json);

      expect(pair.sendTransport.id, 'send-transport-123');
      expect(pair.recvTransport.id, 'recv-transport-456');
    });

    test('toJson returns correct map', () {
      final pair = TransportPair(
        sendTransport: sendTransport,
        recvTransport: recvTransport,
      );

      final json = pair.toJson();

      expect(json['sendTransport']['id'], 'send-transport-123');
      expect(json['recvTransport']['id'], 'recv-transport-456');
    });

    test('copyWith creates new instance with updated values', () {
      final pair = TransportPair(
        sendTransport: sendTransport,
        recvTransport: recvTransport,
      );

      final newSendTransport = sendTransport.copyWith(id: 'new-send-id');
      final copied = pair.copyWith(sendTransport: newSendTransport);

      expect(copied.sendTransport.id, 'new-send-id');
      expect(copied.recvTransport.id, recvTransport.id);
      expect(pair.sendTransport.id, sendTransport.id);
    });

    test('equality works correctly', () {
      final pair1 = TransportPair(
        sendTransport: sendTransport,
        recvTransport: recvTransport,
      );

      final pair2 = TransportPair(
        sendTransport: sendTransport,
        recvTransport: recvTransport,
      );

      expect(pair1, equals(pair2));
    });

    test('toString returns meaningful representation', () {
      final pair = TransportPair(
        sendTransport: sendTransport,
        recvTransport: recvTransport,
      );

      final str = pair.toString();
      expect(str, contains('send-transport-123'));
      expect(str, contains('recv-transport-456'));
    });
  });
}
