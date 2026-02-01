import 'package:flutter_test/flutter_test.dart';
import 'package:quickrtc_flutter_client/models/participant_info.dart';

void main() {
  group('ParticipantInfo', () {
    const testParticipantId = 'participant-123';
    const testParticipantName = 'John Doe';
    final testProducerIds = ['producer-1', 'producer-2', 'producer-3'];

    test('creates instance with required parameters', () {
      final info = ParticipantInfo(
        participantId: testParticipantId,
        participantName: testParticipantName,
      );

      expect(info.participantId, testParticipantId);
      expect(info.participantName, testParticipantName);
      expect(info.producerIds, isEmpty);
    });

    test('creates instance with optional producerIds', () {
      final info = ParticipantInfo(
        participantId: testParticipantId,
        participantName: testParticipantName,
        producerIds: testProducerIds,
      );

      expect(info.producerIds, testProducerIds);
      expect(info.producerIds.length, 3);
    });

    test('default producerIds is empty list', () {
      final info = ParticipantInfo(
        participantId: testParticipantId,
        participantName: testParticipantName,
      );

      expect(info.producerIds, isA<List<String>>());
      expect(info.producerIds, isEmpty);
    });

    test('fromJson creates instance correctly', () {
      final json = {
        'participantId': testParticipantId,
        'participantName': testParticipantName,
        'producerIds': testProducerIds,
      };

      final info = ParticipantInfo.fromJson(json);

      expect(info.participantId, testParticipantId);
      expect(info.participantName, testParticipantName);
      expect(info.producerIds, testProducerIds);
    });

    test('fromJson handles null producerIds', () {
      final json = {
        'participantId': testParticipantId,
        'participantName': testParticipantName,
      };

      final info = ParticipantInfo.fromJson(json);

      expect(info.producerIds, isEmpty);
    });

    test('fromJson handles missing producerIds key', () {
      final json = {
        'participantId': testParticipantId,
        'participantName': testParticipantName,
      };

      final info = ParticipantInfo.fromJson(json);

      expect(info.producerIds, isEmpty);
    });

    test('toJson returns correct map', () {
      final info = ParticipantInfo(
        participantId: testParticipantId,
        participantName: testParticipantName,
        producerIds: testProducerIds,
      );

      final json = info.toJson();

      expect(json['participantId'], testParticipantId);
      expect(json['participantName'], testParticipantName);
      expect(json['producerIds'], testProducerIds);
    });

    test('toJson includes empty producerIds', () {
      final info = ParticipantInfo(
        participantId: testParticipantId,
        participantName: testParticipantName,
      );

      final json = info.toJson();

      expect(json.containsKey('producerIds'), isTrue);
      expect(json['producerIds'], isEmpty);
    });

    test('copyWith creates new instance with updated participantId', () {
      final original = ParticipantInfo(
        participantId: testParticipantId,
        participantName: testParticipantName,
        producerIds: testProducerIds,
      );

      final copied = original.copyWith(participantId: 'new-id');

      expect(copied.participantId, 'new-id');
      expect(copied.participantName, testParticipantName);
      expect(copied.producerIds, testProducerIds);
      expect(original.participantId, testParticipantId);
    });

    test('copyWith creates new instance with updated participantName', () {
      final original = ParticipantInfo(
        participantId: testParticipantId,
        participantName: testParticipantName,
      );

      final copied = original.copyWith(participantName: 'Jane Doe');

      expect(copied.participantName, 'Jane Doe');
      expect(original.participantName, testParticipantName);
    });

    test('copyWith creates new instance with updated producerIds', () {
      final original = ParticipantInfo(
        participantId: testParticipantId,
        participantName: testParticipantName,
        producerIds: testProducerIds,
      );

      final newProducerIds = ['new-producer-1'];
      final copied = original.copyWith(producerIds: newProducerIds);

      expect(copied.producerIds, newProducerIds);
      expect(original.producerIds, testProducerIds);
    });

    test('copyWith preserves original values when not specified', () {
      final original = ParticipantInfo(
        participantId: testParticipantId,
        participantName: testParticipantName,
        producerIds: testProducerIds,
      );

      final copied = original.copyWith();

      expect(copied.participantId, original.participantId);
      expect(copied.participantName, original.participantName);
      expect(copied.producerIds, original.producerIds);
    });

    test('equality works correctly', () {
      final info1 = ParticipantInfo(
        participantId: testParticipantId,
        participantName: testParticipantName,
        producerIds: testProducerIds,
      );

      final info2 = ParticipantInfo(
        participantId: testParticipantId,
        participantName: testParticipantName,
        producerIds: testProducerIds,
      );

      final info3 = ParticipantInfo(
        participantId: 'different-id',
        participantName: testParticipantName,
        producerIds: testProducerIds,
      );

      expect(info1, equals(info2));
      expect(info1, isNot(equals(info3)));
    });

    test('equality considers producerIds', () {
      final info1 = ParticipantInfo(
        participantId: testParticipantId,
        participantName: testParticipantName,
        producerIds: ['a', 'b'],
      );

      final info2 = ParticipantInfo(
        participantId: testParticipantId,
        participantName: testParticipantName,
        producerIds: ['a', 'b'],
      );

      final info3 = ParticipantInfo(
        participantId: testParticipantId,
        participantName: testParticipantName,
        producerIds: ['a', 'c'],
      );

      expect(info1, equals(info2));
      expect(info1, isNot(equals(info3)));
    });

    test('toString returns meaningful representation', () {
      final info = ParticipantInfo(
        participantId: testParticipantId,
        participantName: testParticipantName,
        producerIds: testProducerIds,
      );

      final str = info.toString();

      expect(str, contains(testParticipantId));
      expect(str, contains(testParticipantName));
      expect(str, contains('3')); // producer count
    });

    test('roundtrip serialization works', () {
      final original = ParticipantInfo(
        participantId: testParticipantId,
        participantName: testParticipantName,
        producerIds: testProducerIds,
      );

      final json = original.toJson();
      final restored = ParticipantInfo.fromJson(json);

      expect(restored, equals(original));
    });
  });
}
