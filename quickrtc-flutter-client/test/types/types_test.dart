import 'package:flutter_test/flutter_test.dart';
import 'package:quickrtc_flutter_client/types.dart';

void main() {
  group('MediaType', () {
    test('has correct values', () {
      expect(MediaType.values.length, 3);
      expect(MediaType.audio.value, 'audio');
      expect(MediaType.video.value, 'video');
      expect(MediaType.screenshare.value, 'screenshare');
    });
  });

  group('StreamType', () {
    test('has correct values', () {
      expect(StreamType.values.length, 3);
      expect(StreamType.audio.value, 'audio');
      expect(StreamType.video.value, 'video');
      expect(StreamType.screenshare.value, 'screenshare');
    });

    test('fromString parses correctly', () {
      expect(StreamTypeExtension.fromString('audio'), StreamType.audio);
      expect(StreamTypeExtension.fromString('video'), StreamType.video);
      expect(StreamTypeExtension.fromString('screenshare'),
          StreamType.screenshare);
    });

    test('fromString defaults to video for unknown values', () {
      expect(StreamTypeExtension.fromString('unknown'), StreamType.video);
      expect(StreamTypeExtension.fromString(''), StreamType.video);
    });
  });

  group('MediaConfig', () {
    test('creates default config with all false', () {
      const config = MediaConfig();

      expect(config.audio, isFalse);
      expect(config.video, isFalse);
      expect(config.screenshare, isFalse);
      expect(config.audioConfig, isNull);
      expect(config.videoConfig, isNull);
      expect(config.screenshareConfig, isNull);
    });

    test('audioOnly creates config with only audio enabled', () {
      final config = MediaConfig.audioOnly();

      expect(config.audio, isTrue);
      expect(config.video, isFalse);
      expect(config.screenshare, isFalse);
    });

    test('audioOnly accepts custom AudioConfig', () {
      final config = MediaConfig.audioOnly(
        config: AudioConfig(echoCancellation: true),
      );

      expect(config.audio, isTrue);
      expect(config.audioConfig?.echoCancellation, isTrue);
    });

    test('videoOnly creates config with only video enabled', () {
      final config = MediaConfig.videoOnly();

      expect(config.audio, isFalse);
      expect(config.video, isTrue);
      expect(config.screenshare, isFalse);
    });

    test('videoOnly accepts custom VideoConfig', () {
      final config = MediaConfig.videoOnly(
        config: VideoConfig(width: 1920, height: 1080),
      );

      expect(config.video, isTrue);
      expect(config.videoConfig?.width, 1920);
      expect(config.videoConfig?.height, 1080);
    });

    test('audioVideo creates config with both enabled', () {
      final config = MediaConfig.audioVideo();

      expect(config.audio, isTrue);
      expect(config.video, isTrue);
      expect(config.screenshare, isFalse);
    });

    test('audioVideo accepts both configs', () {
      final config = MediaConfig.audioVideo(
        audioConfig: AudioConfig(noiseSuppression: true),
        videoConfig: VideoConfig(frameRate: 30),
      );

      expect(config.audio, isTrue);
      expect(config.video, isTrue);
      expect(config.audioConfig?.noiseSuppression, isTrue);
      expect(config.videoConfig?.frameRate, 30);
    });

    test('screenShareOnly creates config with only screenshare enabled', () {
      final config = MediaConfig.screenShareOnly();

      expect(config.audio, isFalse);
      expect(config.video, isFalse);
      expect(config.screenshare, isTrue);
    });

    test('screenShareWithAudio creates config with both enabled', () {
      final config = MediaConfig.screenShareWithAudio();

      expect(config.audio, isTrue);
      expect(config.video, isFalse);
      expect(config.screenshare, isTrue);
    });
  });

  group('AudioConfig', () {
    test('creates with default null values', () {
      const config = AudioConfig();

      expect(config.echoCancellation, isNull);
      expect(config.noiseSuppression, isNull);
      expect(config.autoGainControl, isNull);
      expect(config.deviceId, isNull);
    });

    test('creates with custom values', () {
      const config = AudioConfig(
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: true,
        deviceId: 'mic-123',
      );

      expect(config.echoCancellation, isTrue);
      expect(config.noiseSuppression, isFalse);
      expect(config.autoGainControl, isTrue);
      expect(config.deviceId, 'mic-123');
    });

    test('toConstraints returns correct map', () {
      const config = AudioConfig(
        echoCancellation: true,
        noiseSuppression: true,
        deviceId: 'mic-123',
      );

      final constraints = config.toConstraints();

      expect(constraints['echoCancellation'], isTrue);
      expect(constraints['noiseSuppression'], isTrue);
      expect(constraints['deviceId'], 'mic-123');
      expect(constraints.containsKey('autoGainControl'), isFalse);
    });

    test('toConstraints returns optional array when empty', () {
      const config = AudioConfig();
      final constraints = config.toConstraints();

      expect(constraints, {'optional': []});
    });
  });

  group('VideoConfig', () {
    test('creates with default null values', () {
      const config = VideoConfig();

      expect(config.width, isNull);
      expect(config.height, isNull);
      expect(config.frameRate, isNull);
      expect(config.facingMode, isNull);
      expect(config.deviceId, isNull);
    });

    test('creates with custom values', () {
      const config = VideoConfig(
        width: 1280,
        height: 720,
        frameRate: 30,
        facingMode: 'user',
        deviceId: 'cam-123',
      );

      expect(config.width, 1280);
      expect(config.height, 720);
      expect(config.frameRate, 30);
      expect(config.facingMode, 'user');
      expect(config.deviceId, 'cam-123');
    });

    test('presets have correct values', () {
      expect(VideoConfig.frontCamera.facingMode, 'user');
      expect(VideoConfig.frontCamera.width, 1280);
      expect(VideoConfig.frontCamera.height, 720);

      expect(VideoConfig.backCamera.facingMode, 'environment');
      expect(VideoConfig.backCamera.width, 1280);
      expect(VideoConfig.backCamera.height, 720);

      expect(VideoConfig.hd.width, 1280);
      expect(VideoConfig.hd.height, 720);

      expect(VideoConfig.fullHd.width, 1920);
      expect(VideoConfig.fullHd.height, 1080);

      expect(VideoConfig.uhd4k.width, 3840);
      expect(VideoConfig.uhd4k.height, 2160);
    });

    test('toConstraints returns correct map', () {
      const config = VideoConfig(
        width: 1920,
        height: 1080,
        frameRate: 60,
      );

      final constraints = config.toConstraints();

      expect(constraints['width'], 1920);
      expect(constraints['height'], 1080);
      expect(constraints['frameRate'], 60);
    });

    test('toConstraints returns optional array when empty', () {
      const config = VideoConfig();
      final constraints = config.toConstraints();

      expect(constraints, {'optional': []});
    });
  });

  group('ScreenShareConfig', () {
    test('creates with default values', () {
      const config = ScreenShareConfig();

      expect(config.width, isNull);
      expect(config.height, isNull);
      expect(config.frameRate, isNull);
      expect(config.includeSystemAudio, isFalse);
      expect(config.preferWindow, isFalse);
    });

    test('presets have correct values', () {
      expect(ScreenShareConfig.defaultConfig.width, 1920);
      expect(ScreenShareConfig.defaultConfig.height, 1080);
      expect(ScreenShareConfig.defaultConfig.frameRate, 30);

      expect(ScreenShareConfig.highQuality.width, 1920);
      expect(ScreenShareConfig.highQuality.height, 1080);
      expect(ScreenShareConfig.highQuality.frameRate, 60);
    });

    test('toConstraints returns correct map', () {
      const config = ScreenShareConfig(
        width: 1920,
        height: 1080,
        frameRate: 30,
      );

      final constraints = config.toConstraints();

      expect(constraints['width'], 1920);
      expect(constraints['height'], 1080);
      expect(constraints['frameRate'], 30);
    });
  });

  group('Participant', () {
    test('creates with required parameters', () {
      const participant = Participant(id: 'p-123', name: 'John Doe');

      expect(participant.id, 'p-123');
      expect(participant.name, 'John Doe');
      expect(participant.info, isEmpty);
    });

    test('creates with extra info', () {
      const participant = Participant(
        id: 'p-123',
        name: 'John Doe',
        info: {'role': 'moderator'},
      );

      expect(participant.info['role'], 'moderator');
    });

    test('copyWith creates new instance', () {
      const original = Participant(id: 'p-123', name: 'John');
      final copied = original.copyWith(name: 'Jane');

      expect(copied.name, 'Jane');
      expect(copied.id, 'p-123');
      expect(original.name, 'John');
    });

    test('equality works correctly', () {
      const p1 = Participant(id: 'p-123', name: 'John');
      const p2 = Participant(id: 'p-123', name: 'John');
      const p3 = Participant(id: 'p-456', name: 'John');

      expect(p1, equals(p2));
      expect(p1, isNot(equals(p3)));
    });
  });

  group('RemoteParticipant', () {
    test('creates with required parameters', () {
      const participant = RemoteParticipant(id: 'p-123', name: 'John Doe');

      expect(participant.id, 'p-123');
      expect(participant.name, 'John Doe');
      expect(participant.info, isEmpty);
      expect(participant.streams, isEmpty);
    });

    test('stream getters return null when no streams', () {
      const participant = RemoteParticipant(id: 'p-123', name: 'John');

      expect(participant.audioStream, isNull);
      expect(participant.videoStream, isNull);
      expect(participant.screenshareStream, isNull);
      expect(participant.hasAudio, isFalse);
      expect(participant.hasVideo, isFalse);
      expect(participant.hasScreenshare, isFalse);
    });

    test('mute status returns true when no streams', () {
      const participant = RemoteParticipant(id: 'p-123', name: 'John');

      expect(participant.isAudioMuted, isTrue);
      expect(participant.isVideoMuted, isTrue);
      expect(participant.isScreensharePaused, isTrue);
    });

    test('copyWith creates new instance', () {
      const original = RemoteParticipant(id: 'p-123', name: 'John');
      final copied = original.copyWith(name: 'Jane');

      expect(copied.name, 'Jane');
      expect(copied.id, 'p-123');
      expect(original.name, 'John');
    });

    test('equality works correctly', () {
      const p1 = RemoteParticipant(id: 'p-123', name: 'John');
      const p2 = RemoteParticipant(id: 'p-123', name: 'John');
      const p3 = RemoteParticipant(id: 'p-456', name: 'John');

      expect(p1, equals(p2));
      expect(p1, isNot(equals(p3)));
    });

    test('toString returns meaningful representation', () {
      const participant = RemoteParticipant(id: 'p-123', name: 'John Doe');
      final str = participant.toString();

      expect(str, contains('p-123'));
      expect(str, contains('John Doe'));
    });
  });

  group('QuickRTCConfig', () {
    test('creates with required socket', () {
      // Note: We can't easily test with a real socket, so we just test the structure
      // In a real test, you'd mock the socket
    });
  });

  group('JoinConfig', () {
    test('creates with required parameters', () {
      const config = JoinConfig(
        conferenceId: 'room-123',
        participantName: 'John Doe',
      );

      expect(config.conferenceId, 'room-123');
      expect(config.participantName, 'John Doe');
      expect(config.conferenceName, isNull);
      expect(config.participantId, isNull);
      expect(config.participantInfo, isNull);
    });

    test('creates with all parameters', () {
      const config = JoinConfig(
        conferenceId: 'room-123',
        conferenceName: 'Team Meeting',
        participantId: 'user-456',
        participantName: 'John Doe',
        participantInfo: {'role': 'host'},
      );

      expect(config.conferenceId, 'room-123');
      expect(config.conferenceName, 'Team Meeting');
      expect(config.participantId, 'user-456');
      expect(config.participantName, 'John Doe');
      expect(config.participantInfo?['role'], 'host');
    });
  });

  group('Event classes', () {
    test('ConnectedEvent has correct properties', () {
      const event = ConnectedEvent(
        conferenceId: 'room-123',
        participantId: 'user-456',
      );

      expect(event.conferenceId, 'room-123');
      expect(event.participantId, 'user-456');
    });

    test('DisconnectedEvent has correct properties', () {
      const event = DisconnectedEvent(reason: 'User left');
      expect(event.reason, 'User left');
    });

    test('ErrorEvent has correct properties', () {
      const event = ErrorEvent(message: 'Connection failed', error: 'timeout');
      expect(event.message, 'Connection failed');
      expect(event.error, 'timeout');
    });

    test('NewParticipantEvent has correct properties', () {
      const event = NewParticipantEvent(
        participantId: 'p-123',
        participantName: 'John',
        participantInfo: {'role': 'guest'},
      );

      expect(event.participantId, 'p-123');
      expect(event.participantName, 'John');
      expect(event.participantInfo['role'], 'guest');
      expect(event.streams, isEmpty);
    });

    test('ParticipantLeftEvent has correct properties', () {
      const event = ParticipantLeftEvent(participantId: 'p-123');
      expect(event.participantId, 'p-123');
    });

    test('StreamRemovedEvent has correct properties', () {
      const event = StreamRemovedEvent(
        participantId: 'p-123',
        streamId: 's-456',
        type: StreamType.video,
      );

      expect(event.participantId, 'p-123');
      expect(event.streamId, 's-456');
      expect(event.type, StreamType.video);
    });

    test('LocalStreamEndedEvent has correct properties', () {
      const event = LocalStreamEndedEvent(
        streamId: 's-123',
        type: StreamType.screenshare,
      );

      expect(event.streamId, 's-123');
      expect(event.type, StreamType.screenshare);
    });

    test('StreamPausedEvent has correct properties', () {
      const event = StreamPausedEvent(
        participantId: 'p-123',
        type: StreamType.audio,
      );

      expect(event.participantId, 'p-123');
      expect(event.type, StreamType.audio);
    });

    test('StreamResumedEvent has correct properties', () {
      const event = StreamResumedEvent(
        participantId: 'p-123',
        type: StreamType.video,
      );

      expect(event.participantId, 'p-123');
      expect(event.type, StreamType.video);
    });
  });

  group('Internal data types', () {
    test('TransportOptionsData fromJson works correctly', () {
      final json = {
        'id': 'transport-123',
        'iceParameters': {'usernameFragment': 'abc'},
        'iceCandidates': [
          {'foundation': '1'}
        ],
        'dtlsParameters': {'role': 'auto'},
        'sctpParameters': {'port': 5000},
      };

      final data = TransportOptionsData.fromJson(json);

      expect(data.id, 'transport-123');
      expect(data.iceParameters['usernameFragment'], 'abc');
      expect(data.iceCandidates.length, 1);
      expect(data.dtlsParameters['role'], 'auto');
      expect(data.sctpParameters?['port'], 5000);
    });

    test('ConsumerParamsData fromJson works correctly', () {
      final json = {
        'id': 'consumer-123',
        'producerId': 'producer-456',
        'kind': 'video',
        'rtpParameters': {'codecs': []},
        'streamType': 'video',
      };

      final data = ConsumerParamsData.fromJson(json);

      expect(data.id, 'consumer-123');
      expect(data.producerId, 'producer-456');
      expect(data.kind, 'video');
      expect(data.streamType, StreamType.video);
    });

    test('ParticipantInfoData fromJson works correctly', () {
      final json = {
        'participantId': 'p-123',
        'participantName': 'John Doe',
        'participantInfo': {'role': 'host'},
      };

      final data = ParticipantInfoData.fromJson(json);

      expect(data.participantId, 'p-123');
      expect(data.participantName, 'John Doe');
      expect(data.participantInfo?['role'], 'host');
    });

    test('ParticipantJoinedData fromJson works correctly', () {
      final json = {
        'participantId': 'p-123',
        'participantName': 'John Doe',
        'conferenceId': 'room-456',
      };

      final data = ParticipantJoinedData.fromJson(json);

      expect(data.participantId, 'p-123');
      expect(data.participantName, 'John Doe');
      expect(data.conferenceId, 'room-456');
    });

    test('ParticipantLeftData fromJson works correctly', () {
      final json = {
        'participantId': 'p-123',
        'closedProducerIds': ['prod-1', 'prod-2'],
        'closedConsumerIds': ['cons-1'],
      };

      final data = ParticipantLeftData.fromJson(json);

      expect(data.participantId, 'p-123');
      expect(data.closedProducerIds, ['prod-1', 'prod-2']);
      expect(data.closedConsumerIds, ['cons-1']);
    });

    test('NewProducerData fromJson works correctly', () {
      final json = {
        'producerId': 'prod-123',
        'participantId': 'p-456',
        'participantName': 'John',
        'kind': 'video',
        'streamType': 'screenshare',
      };

      final data = NewProducerData.fromJson(json);

      expect(data.producerId, 'prod-123');
      expect(data.participantId, 'p-456');
      expect(data.participantName, 'John');
      expect(data.kind, 'video');
      expect(data.streamType, StreamType.screenshare);
    });

    test('ProducerClosedData fromJson works correctly', () {
      final json = {
        'participantId': 'p-123',
        'producerId': 'prod-456',
        'kind': 'audio',
        'streamType': 'audio',
      };

      final data = ProducerClosedData.fromJson(json);

      expect(data.participantId, 'p-123');
      expect(data.producerId, 'prod-456');
      expect(data.kind, 'audio');
      expect(data.streamType, StreamType.audio);
    });
  });
}
