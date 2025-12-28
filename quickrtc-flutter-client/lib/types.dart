import 'package:mediasoup_client_flutter/mediasoup_client_flutter.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

// ============================================================================
// CONFIGURATION
// ============================================================================

/// Configuration for QuickRTC client instance
class QuickRTCConfig {
  /// Socket.IO client instance
  final io.Socket socket;

  /// Maximum participants allowed (0 = unlimited)
  final int maxParticipants;

  /// Enable debug logging
  final bool debug;

  const QuickRTCConfig({
    required this.socket,
    this.maxParticipants = 0,
    this.debug = false,
  });
}

/// Configuration for joining a conference
class JoinConfig {
  /// Conference/room ID
  final String conferenceId;

  /// Conference name (optional)
  final String? conferenceName;

  /// Participant ID (auto-generated if not provided)
  final String? participantId;

  /// Participant display name
  final String participantName;

  /// Extra participant info (permissions, metadata, etc.)
  final Map<String, dynamic>? participantInfo;

  const JoinConfig({
    required this.conferenceId,
    this.conferenceName,
    this.participantId,
    required this.participantName,
    this.participantInfo,
  });
}

// ============================================================================
// STREAMS
// ============================================================================

/// Stream types
enum StreamType {
  audio,
  video,
  screenshare,
}

/// Extension to convert StreamType to/from string
extension StreamTypeExtension on StreamType {
  String get value {
    switch (this) {
      case StreamType.audio:
        return 'audio';
      case StreamType.video:
        return 'video';
      case StreamType.screenshare:
        return 'screenshare';
    }
  }

  static StreamType fromString(String value) {
    switch (value) {
      case 'audio':
        return StreamType.audio;
      case 'video':
        return StreamType.video;
      case 'screenshare':
        return StreamType.screenshare;
      default:
        return StreamType.video;
    }
  }
}

/// Track with optional type hint for producing
class TrackWithType {
  final MediaStreamTrack track;
  final StreamType? type;

  const TrackWithType({
    required this.track,
    this.type,
  });
}

/// Input for produce() - can be single track, array of tracks, or tracks with types
/// Use the factory methods for convenience
abstract class ProduceInput {
  List<TrackWithType> toTrackList();

  /// Create from a single track
  static ProduceInput fromTrack(MediaStreamTrack track, {StreamType? type}) {
    return _SingleTrackInput(track, type);
  }

  /// Create from multiple tracks
  static ProduceInput fromTracks(List<MediaStreamTrack> tracks) {
    return _MultiTrackInput(tracks);
  }

  /// Create from tracks with explicit types
  static ProduceInput fromTracksWithTypes(List<TrackWithType> tracks) {
    return _TypedTracksInput(tracks);
  }
}

class _SingleTrackInput extends ProduceInput {
  final MediaStreamTrack track;
  final StreamType? type;

  _SingleTrackInput(this.track, this.type);

  @override
  List<TrackWithType> toTrackList() =>
      [TrackWithType(track: track, type: type)];
}

class _MultiTrackInput extends ProduceInput {
  final List<MediaStreamTrack> tracks;

  _MultiTrackInput(this.tracks);

  @override
  List<TrackWithType> toTrackList() =>
      tracks.map((t) => TrackWithType(track: t)).toList();
}

class _TypedTracksInput extends ProduceInput {
  final List<TrackWithType> tracks;

  _TypedTracksInput(this.tracks);

  @override
  List<TrackWithType> toTrackList() => tracks;
}

/// Local stream handle returned from produce()
class LocalStream {
  /// Unique stream ID (producer ID)
  final String id;

  /// Stream type
  final StreamType type;

  /// The MediaStream containing the track
  final MediaStream stream;

  /// The original track
  final MediaStreamTrack track;

  /// Whether the stream is paused
  bool _paused;

  /// Internal producer reference
  final Producer _producer;

  /// Callbacks for pause/resume/stop
  final Future<void> Function(String) _onPause;
  final Future<void> Function(String) _onResume;
  final Future<void> Function(String) _onStop;

  LocalStream({
    required this.id,
    required this.type,
    required this.stream,
    required this.track,
    required bool paused,
    required Producer producer,
    required Future<void> Function(String) onPause,
    required Future<void> Function(String) onResume,
    required Future<void> Function(String) onStop,
  })  : _paused = paused,
        _producer = producer,
        _onPause = onPause,
        _onResume = onResume,
        _onStop = onStop;

  /// Whether the stream is paused
  bool get paused => _paused;

  /// Get the underlying producer
  Producer get producer => _producer;

  /// Pause the stream
  Future<void> pause() async {
    await _onPause(id);
    _paused = true;
  }

  /// Resume the stream
  Future<void> resume() async {
    await _onResume(id);
    _paused = false;
  }

  /// Stop and close the stream
  Future<void> stop() async {
    await _onStop(id);
  }
}

/// Remote stream from a participant
class RemoteStream {
  /// Unique stream ID (consumer ID)
  final String id;

  /// Stream type
  final StreamType type;

  /// The MediaStream
  final MediaStream stream;

  /// Producer ID on the server
  final String producerId;

  /// Participant ID who owns this stream
  final String participantId;

  /// Participant name
  final String participantName;

  const RemoteStream({
    required this.id,
    required this.type,
    required this.stream,
    required this.producerId,
    required this.participantId,
    required this.participantName,
  });
}

// ============================================================================
// PARTICIPANTS
// ============================================================================

/// Participant information
class Participant {
  /// Participant ID
  final String id;

  /// Display name
  final String name;

  /// Extra participant info
  final Map<String, dynamic> info;

  const Participant({
    required this.id,
    required this.name,
    this.info = const {},
  });
}

// ============================================================================
// EVENTS
// ============================================================================

/// Connected event data
class ConnectedEvent {
  final String conferenceId;
  final String participantId;

  const ConnectedEvent({
    required this.conferenceId,
    required this.participantId,
  });
}

/// Disconnected event data
class DisconnectedEvent {
  final String reason;

  const DisconnectedEvent({required this.reason});
}

/// Error event data
class ErrorEvent {
  final String message;
  final dynamic error;

  const ErrorEvent({
    required this.message,
    this.error,
  });
}

/// New participant event data
/// Streams array may be empty if participant hasn't started sharing media yet
class NewParticipantEvent {
  /// Participant ID
  final String participantId;

  /// Participant display name
  final String participantName;

  /// Extra participant info
  final Map<String, dynamic> participantInfo;

  /// Streams from this participant (may be empty)
  final List<RemoteStream> streams;

  const NewParticipantEvent({
    required this.participantId,
    required this.participantName,
    this.participantInfo = const {},
    this.streams = const [],
  });
}

/// Participant left event data
class ParticipantLeftEvent {
  final String participantId;

  const ParticipantLeftEvent({required this.participantId});
}

/// Stream added event (for existing participants who start new media)
typedef StreamAddedEvent = RemoteStream;

/// Stream removed event data
class StreamRemovedEvent {
  final String participantId;
  final String streamId;
  final StreamType type;

  const StreamRemovedEvent({
    required this.participantId,
    required this.streamId,
    required this.type,
  });
}

/// Local stream ended event (e.g., user clicked browser's "Stop sharing" button)
class LocalStreamEndedEvent {
  final String streamId;
  final StreamType type;

  const LocalStreamEndedEvent({
    required this.streamId,
    required this.type,
  });
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

/// Internal producer info
class ProducerInfo {
  final String id;
  final StreamType type;
  final MediaStreamTrack track;
  final Producer producer;
  final MediaStream stream;
  bool paused;

  ProducerInfo({
    required this.id,
    required this.type,
    required this.track,
    required this.producer,
    required this.stream,
    this.paused = false,
  });
}

/// Internal consumer info
class ConsumerInfo {
  final String id;
  final StreamType type;
  final Consumer consumer;
  final MediaStream stream;
  final String producerId;
  final String participantId;
  final String participantName;

  const ConsumerInfo({
    required this.id,
    required this.type,
    required this.consumer,
    required this.stream,
    required this.producerId,
    required this.participantId,
    required this.participantName,
  });
}

/// Transport options from server
class TransportOptionsData {
  final String id;
  final Map<String, dynamic> iceParameters;
  final List<dynamic> iceCandidates;
  final Map<String, dynamic> dtlsParameters;
  final Map<String, dynamic>? sctpParameters;

  const TransportOptionsData({
    required this.id,
    required this.iceParameters,
    required this.iceCandidates,
    required this.dtlsParameters,
    this.sctpParameters,
  });

  factory TransportOptionsData.fromJson(Map<String, dynamic> json) {
    return TransportOptionsData(
      id: json['id'] as String,
      iceParameters: json['iceParameters'] as Map<String, dynamic>,
      iceCandidates: json['iceCandidates'] as List<dynamic>,
      dtlsParameters: json['dtlsParameters'] as Map<String, dynamic>,
      sctpParameters: json['sctpParameters'] as Map<String, dynamic>?,
    );
  }
}

/// Consumer parameters from server
class ConsumerParamsData {
  final String id;
  final String producerId;
  final String kind;
  final Map<String, dynamic> rtpParameters;
  final StreamType? streamType;

  const ConsumerParamsData({
    required this.id,
    required this.producerId,
    required this.kind,
    required this.rtpParameters,
    this.streamType,
  });

  factory ConsumerParamsData.fromJson(Map<String, dynamic> json) {
    return ConsumerParamsData(
      id: json['id'] as String,
      producerId: json['producerId'] as String,
      kind: json['kind'] as String,
      rtpParameters: json['rtpParameters'] as Map<String, dynamic>,
      streamType: json['streamType'] != null
          ? StreamTypeExtension.fromString(json['streamType'] as String)
          : null,
    );
  }
}

/// Participant info from server
class ParticipantInfoData {
  final String participantId;
  final String participantName;
  final Map<String, dynamic>? participantInfo;

  const ParticipantInfoData({
    required this.participantId,
    required this.participantName,
    this.participantInfo,
  });

  factory ParticipantInfoData.fromJson(Map<String, dynamic> json) {
    return ParticipantInfoData(
      participantId: json['participantId'] as String,
      participantName: json['participantName'] as String,
      participantInfo: json['participantInfo'] as Map<String, dynamic>?,
    );
  }
}

// ============================================================================
// SOCKET EVENT DATA TYPES
// ============================================================================

class ParticipantJoinedData {
  final String participantId;
  final String participantName;
  final Map<String, dynamic>? participantInfo;
  final String conferenceId;

  const ParticipantJoinedData({
    required this.participantId,
    required this.participantName,
    this.participantInfo,
    required this.conferenceId,
  });

  factory ParticipantJoinedData.fromJson(Map<String, dynamic> json) {
    return ParticipantJoinedData(
      participantId: json['participantId'] as String,
      participantName: json['participantName'] as String,
      participantInfo: json['participantInfo'] as Map<String, dynamic>?,
      conferenceId: json['conferenceId'] as String,
    );
  }
}

class ParticipantLeftData {
  final String participantId;
  final List<String> closedProducerIds;
  final List<String> closedConsumerIds;

  const ParticipantLeftData({
    required this.participantId,
    this.closedProducerIds = const [],
    this.closedConsumerIds = const [],
  });

  factory ParticipantLeftData.fromJson(Map<String, dynamic> json) {
    return ParticipantLeftData(
      participantId: json['participantId'] as String,
      closedProducerIds:
          (json['closedProducerIds'] as List<dynamic>?)?.cast<String>() ?? [],
      closedConsumerIds:
          (json['closedConsumerIds'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }
}

class NewProducerData {
  final String producerId;
  final String participantId;
  final String participantName;
  final String kind;
  final StreamType? streamType;

  const NewProducerData({
    required this.producerId,
    required this.participantId,
    required this.participantName,
    required this.kind,
    this.streamType,
  });

  factory NewProducerData.fromJson(Map<String, dynamic> json) {
    return NewProducerData(
      producerId: json['producerId'] as String,
      participantId: json['participantId'] as String,
      participantName: json['participantName'] as String,
      kind: json['kind'] as String,
      streamType: json['streamType'] != null
          ? StreamTypeExtension.fromString(json['streamType'] as String)
          : null,
    );
  }
}

class ProducerClosedData {
  final String participantId;
  final String producerId;
  final String kind;
  final StreamType? streamType;

  const ProducerClosedData({
    required this.participantId,
    required this.producerId,
    required this.kind,
    this.streamType,
  });

  factory ProducerClosedData.fromJson(Map<String, dynamic> json) {
    return ProducerClosedData(
      participantId: json['participantId'] as String,
      producerId: json['producerId'] as String,
      kind: json['kind'] as String,
      streamType: json['streamType'] != null
          ? StreamTypeExtension.fromString(json['streamType'] as String)
          : null,
    );
  }
}
