import 'package:flutter_test/flutter_test.dart';
import 'package:quickrtc_flutter_client/models/consumer_params.dart';

void main() {
  group('ConsumerParams', () {
    const testId = 'consumer-123';
    const testProducerId = 'producer-456';
    const testKind = 'video';
    final testRtpParameters = {
      'codecs': [
        {'mimeType': 'video/VP8', 'payloadType': 96}
      ],
      'headerExtensions': [],
    };

    test('creates instance with required parameters', () {
      final params = ConsumerParams(
        id: testId,
        producerId: testProducerId,
        kind: testKind,
        rtpParameters: testRtpParameters,
      );

      expect(params.id, testId);
      expect(params.producerId, testProducerId);
      expect(params.kind, testKind);
      expect(params.rtpParameters, testRtpParameters);
    });

    test('fromJson creates instance correctly', () {
      final json = {
        'id': testId,
        'producerId': testProducerId,
        'kind': testKind,
        'rtpParameters': testRtpParameters,
      };

      final params = ConsumerParams.fromJson(json);

      expect(params.id, testId);
      expect(params.producerId, testProducerId);
      expect(params.kind, testKind);
      expect(params.rtpParameters, testRtpParameters);
    });

    test('toJson returns correct map', () {
      final params = ConsumerParams(
        id: testId,
        producerId: testProducerId,
        kind: testKind,
        rtpParameters: testRtpParameters,
      );

      final json = params.toJson();

      expect(json['id'], testId);
      expect(json['producerId'], testProducerId);
      expect(json['kind'], testKind);
      expect(json['rtpParameters'], testRtpParameters);
    });

    test('copyWith creates new instance with updated values', () {
      final original = ConsumerParams(
        id: testId,
        producerId: testProducerId,
        kind: testKind,
        rtpParameters: testRtpParameters,
      );

      final copied = original.copyWith(id: 'new-id');

      expect(copied.id, 'new-id');
      expect(copied.producerId, testProducerId);
      expect(copied.kind, testKind);
      expect(original.id, testId); // Original unchanged
    });

    test('copyWith preserves original values when not specified', () {
      final original = ConsumerParams(
        id: testId,
        producerId: testProducerId,
        kind: testKind,
        rtpParameters: testRtpParameters,
      );

      final copied = original.copyWith();

      expect(copied.id, original.id);
      expect(copied.producerId, original.producerId);
      expect(copied.kind, original.kind);
      expect(copied.rtpParameters, original.rtpParameters);
    });

    test('equality works correctly', () {
      final params1 = ConsumerParams(
        id: testId,
        producerId: testProducerId,
        kind: testKind,
        rtpParameters: testRtpParameters,
      );

      final params2 = ConsumerParams(
        id: testId,
        producerId: testProducerId,
        kind: testKind,
        rtpParameters: testRtpParameters,
      );

      final params3 = ConsumerParams(
        id: 'different-id',
        producerId: testProducerId,
        kind: testKind,
        rtpParameters: testRtpParameters,
      );

      expect(params1, equals(params2));
      expect(params1, isNot(equals(params3)));
    });

    test('toString returns meaningful representation', () {
      final params = ConsumerParams(
        id: testId,
        producerId: testProducerId,
        kind: testKind,
        rtpParameters: testRtpParameters,
      );

      final str = params.toString();

      expect(str, contains(testId));
      expect(str, contains(testProducerId));
      expect(str, contains(testKind));
    });

    test('handles audio kind', () {
      final params = ConsumerParams(
        id: testId,
        producerId: testProducerId,
        kind: 'audio',
        rtpParameters: {'codecs': []},
      );

      expect(params.kind, 'audio');
    });
  });
}
