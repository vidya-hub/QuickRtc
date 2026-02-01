import 'package:flutter_test/flutter_test.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/types.dart';

// Mock classes for testing
class MockMediaStream {
  final String id;
  MockMediaStream(this.id);
}

void main() {
  group('ConnectionStatus', () {
    test('has correct values', () {
      expect(ConnectionStatus.values.length, 3);
      expect(ConnectionStatus.disconnected.index, 0);
      expect(ConnectionStatus.connecting.index, 1);
      expect(ConnectionStatus.connected.index, 2);
    });
  });

  group('QuickRTCState', () {
    test('creates default state correctly', () {
      const state = QuickRTCState();

      expect(state.version, 0);
      expect(state.status, ConnectionStatus.disconnected);
      expect(state.conferenceId, isNull);
      expect(state.participantId, isNull);
      expect(state.participantName, isNull);
      expect(state.localStreams, isEmpty);
      expect(state.participants, isEmpty);
      expect(state.error, isNull);
    });

    test('creates state with custom values', () {
      final state = QuickRTCState(
        version: 5,
        status: ConnectionStatus.connected,
        conferenceId: 'room-123',
        participantId: 'user-456',
        participantName: 'John Doe',
        error: null,
      );

      expect(state.version, 5);
      expect(state.status, ConnectionStatus.connected);
      expect(state.conferenceId, 'room-123');
      expect(state.participantId, 'user-456');
      expect(state.participantName, 'John Doe');
    });

    group('convenience getters', () {
      test('isConnected returns true when connected', () {
        const state = QuickRTCState(status: ConnectionStatus.connected);
        expect(state.isConnected, isTrue);
        expect(state.isConnecting, isFalse);
        expect(state.isDisconnected, isFalse);
      });

      test('isConnecting returns true when connecting', () {
        const state = QuickRTCState(status: ConnectionStatus.connecting);
        expect(state.isConnecting, isTrue);
        expect(state.isConnected, isFalse);
        expect(state.isDisconnected, isFalse);
      });

      test('isDisconnected returns true when disconnected', () {
        const state = QuickRTCState(status: ConnectionStatus.disconnected);
        expect(state.isDisconnected, isTrue);
        expect(state.isConnected, isFalse);
        expect(state.isConnecting, isFalse);
      });

      test('hasError returns true when error exists', () {
        const stateWithError = QuickRTCState(error: 'Test error');
        const stateWithoutError = QuickRTCState();

        expect(stateWithError.hasError, isTrue);
        expect(stateWithoutError.hasError, isFalse);
      });

      test('participantList returns list of participants', () {
        final participant1 = RemoteParticipant(id: 'p1', name: 'User 1');
        final participant2 = RemoteParticipant(id: 'p2', name: 'User 2');

        final state = QuickRTCState(
          participants: {
            'p1': participant1,
            'p2': participant2,
          },
        );

        expect(state.participantList.length, 2);
        expect(state.participantCount, 2);
      });

      test('participantCount returns correct count', () {
        const emptyState = QuickRTCState();
        expect(emptyState.participantCount, 0);

        final stateWithParticipants = QuickRTCState(
          participants: {
            'p1': RemoteParticipant(id: 'p1', name: 'User 1'),
          },
        );
        expect(stateWithParticipants.participantCount, 1);
      });
    });

    group('copyWith', () {
      test('increments version automatically', () {
        const original = QuickRTCState(version: 0);
        final copied = original.copyWith();

        expect(copied.version, 1);
      });

      test('updates status', () {
        const original = QuickRTCState(status: ConnectionStatus.disconnected);
        final copied = original.copyWith(status: ConnectionStatus.connected);

        expect(copied.status, ConnectionStatus.connected);
        expect(original.status, ConnectionStatus.disconnected);
      });

      test('updates conferenceId', () {
        const original = QuickRTCState();
        final copied = original.copyWith(conferenceId: 'room-123');

        expect(copied.conferenceId, 'room-123');
        expect(original.conferenceId, isNull);
      });

      test('clears conferenceId with clearConferenceId flag', () {
        final original = QuickRTCState(conferenceId: 'room-123');
        final copied = original.copyWith(clearConferenceId: true);

        expect(copied.conferenceId, isNull);
      });

      test('updates participantId', () {
        const original = QuickRTCState();
        final copied = original.copyWith(participantId: 'user-456');

        expect(copied.participantId, 'user-456');
      });

      test('clears participantId with clearParticipantId flag', () {
        final original = QuickRTCState(participantId: 'user-456');
        final copied = original.copyWith(clearParticipantId: true);

        expect(copied.participantId, isNull);
      });

      test('updates participantName', () {
        const original = QuickRTCState();
        final copied = original.copyWith(participantName: 'John Doe');

        expect(copied.participantName, 'John Doe');
      });

      test('clears participantName with clearParticipantName flag', () {
        final original = QuickRTCState(participantName: 'John Doe');
        final copied = original.copyWith(clearParticipantName: true);

        expect(copied.participantName, isNull);
      });

      test('updates error', () {
        const original = QuickRTCState();
        final copied = original.copyWith(error: 'Test error');

        expect(copied.error, 'Test error');
        expect(copied.hasError, isTrue);
      });

      test('clears error with clearError flag', () {
        final original = QuickRTCState(error: 'Test error');
        final copied = original.copyWith(clearError: true);

        expect(copied.error, isNull);
        expect(copied.hasError, isFalse);
      });

      test('updates participants', () {
        const original = QuickRTCState();
        final newParticipants = {
          'p1': RemoteParticipant(id: 'p1', name: 'User 1'),
        };
        final copied = original.copyWith(participants: newParticipants);

        expect(copied.participants, newParticipants);
        expect(copied.participantCount, 1);
      });

      test('preserves unspecified values', () {
        final original = QuickRTCState(
          status: ConnectionStatus.connected,
          conferenceId: 'room-123',
          participantId: 'user-456',
          participantName: 'John Doe',
        );

        final copied = original.copyWith(status: ConnectionStatus.connecting);

        expect(copied.status, ConnectionStatus.connecting);
        expect(copied.conferenceId, 'room-123');
        expect(copied.participantId, 'user-456');
        expect(copied.participantName, 'John Doe');
      });
    });

    group('equality', () {
      test('equal states with same values are equal', () {
        const state1 = QuickRTCState(
          version: 1,
          status: ConnectionStatus.connected,
          conferenceId: 'room-123',
        );

        const state2 = QuickRTCState(
          version: 1,
          status: ConnectionStatus.connected,
          conferenceId: 'room-123',
        );

        expect(state1, equals(state2));
      });

      test('different versions make states not equal', () {
        const state1 = QuickRTCState(version: 1);
        const state2 = QuickRTCState(version: 2);

        expect(state1, isNot(equals(state2)));
      });

      test('different status makes states not equal', () {
        const state1 = QuickRTCState(status: ConnectionStatus.connected);
        const state2 = QuickRTCState(status: ConnectionStatus.disconnected);

        expect(state1, isNot(equals(state2)));
      });

      test('props includes all relevant fields', () {
        const state = QuickRTCState(
          version: 1,
          status: ConnectionStatus.connected,
          conferenceId: 'room-123',
          participantId: 'user-456',
          participantName: 'John',
          error: 'error',
        );

        expect(state.props.length, 8);
        expect(state.props, contains(1)); // version
        expect(state.props, contains(ConnectionStatus.connected));
        expect(state.props, contains('room-123'));
        expect(state.props, contains('user-456'));
        expect(state.props, contains('John'));
        expect(state.props, contains('error'));
      });
    });

    group('toString', () {
      test('returns meaningful representation', () {
        final state = QuickRTCState(
          version: 5,
          status: ConnectionStatus.connected,
          conferenceId: 'room-123',
          participantId: 'user-456',
        );

        final str = state.toString();

        expect(str, contains('version: 5'));
        expect(str, contains('connected'));
        expect(str, contains('room-123'));
        expect(str, contains('user-456'));
      });

      test('includes participant and stream counts', () {
        final state = QuickRTCState(
          participants: {
            'p1': RemoteParticipant(id: 'p1', name: 'User 1'),
            'p2': RemoteParticipant(id: 'p2', name: 'User 2'),
          },
        );

        final str = state.toString();
        expect(str, contains('participants: 2'));
      });

      test('includes error when present', () {
        const state = QuickRTCState(error: 'Connection failed');
        expect(state.toString(), contains('error: Connection failed'));
      });
    });

    group('allRemoteStreams', () {
      test('returns empty list when no participants', () {
        const state = QuickRTCState();
        expect(state.allRemoteStreams, isEmpty);
      });

      test('returns empty list when participants have no streams', () {
        final state = QuickRTCState(
          participants: {
            'p1': RemoteParticipant(id: 'p1', name: 'User 1'),
          },
        );
        expect(state.allRemoteStreams, isEmpty);
      });
    });

    group('local stream getters', () {
      test('hasLocalAudio returns false when no audio stream', () {
        const state = QuickRTCState();
        expect(state.hasLocalAudio, isFalse);
        expect(state.localAudioStream, isNull);
      });

      test('hasLocalVideo returns false when no video stream', () {
        const state = QuickRTCState();
        expect(state.hasLocalVideo, isFalse);
        expect(state.localVideoStream, isNull);
      });

      test('hasLocalScreenshare returns false when no screenshare stream', () {
        const state = QuickRTCState();
        expect(state.hasLocalScreenshare, isFalse);
        expect(state.localScreenshareStream, isNull);
      });

      test('isLocalAudioPaused returns true when no audio stream', () {
        const state = QuickRTCState();
        expect(state.isLocalAudioPaused, isTrue);
      });

      test('isLocalVideoPaused returns true when no video stream', () {
        const state = QuickRTCState();
        expect(state.isLocalVideoPaused, isTrue);
      });

      test('isLocalScreensharePaused returns true when no screenshare stream',
          () {
        const state = QuickRTCState();
        expect(state.isLocalScreensharePaused, isTrue);
      });
    });
  });
}
