import 'package:equatable/equatable.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/mediasoup.dart';
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
// MEDIA TYPES
// ============================================================================

/// Media types for getLocalMedia
enum MediaType {
  /// Microphone audio
  audio,

  /// Camera video
  video,

  /// Screen/window share (includes system audio on supported platforms)
  screenshare,
}

/// Extension for MediaType
extension MediaTypeExtension on MediaType {
  String get value {
    switch (this) {
      case MediaType.audio:
        return 'audio';
      case MediaType.video:
        return 'video';
      case MediaType.screenshare:
        return 'screenshare';
    }
  }
}

/// Configuration for getLocalMedia
class MediaConfig {
  /// Whether to capture audio (microphone)
  final bool audio;

  /// Whether to capture video (camera)
  final bool video;

  /// Whether to capture screen share
  final bool screenshare;

  /// Audio constraints (optional)
  final AudioConfig? audioConfig;

  /// Video constraints (optional)
  final VideoConfig? videoConfig;

  /// Screen share constraints (optional)
  final ScreenShareConfig? screenshareConfig;

  const MediaConfig({
    this.audio = false,
    this.video = false,
    this.screenshare = false,
    this.audioConfig,
    this.videoConfig,
    this.screenshareConfig,
  });

  /// Create config for audio only
  static MediaConfig audioOnly({AudioConfig? config}) =>
      MediaConfig(audio: true, audioConfig: config);

  /// Create config for video only
  static MediaConfig videoOnly({VideoConfig? config}) =>
      MediaConfig(video: true, videoConfig: config);

  /// Create config for audio and video
  static MediaConfig audioVideo(
          {AudioConfig? audioConfig, VideoConfig? videoConfig,}) =>
      MediaConfig(
          audio: true,
          video: true,
          audioConfig: audioConfig,
          videoConfig: videoConfig,);

  /// Create config for screen share only
  static MediaConfig screenShareOnly({ScreenShareConfig? config}) =>
      MediaConfig(screenshare: true, screenshareConfig: config);

  /// Create config for screen share with audio
  static MediaConfig screenShareWithAudio({
    ScreenShareConfig? screenshareConfig,
    AudioConfig? audioConfig,
  }) =>
      MediaConfig(
        audio: true,
        screenshare: true,
        audioConfig: audioConfig,
        screenshareConfig: screenshareConfig,
      );
}

/// Audio configuration
class AudioConfig {
  /// Enable echo cancellation
  final bool? echoCancellation;

  /// Enable noise suppression
  final bool? noiseSuppression;

  /// Enable auto gain control
  final bool? autoGainControl;

  /// Specific device ID to use
  final String? deviceId;

  const AudioConfig({
    this.echoCancellation,
    this.noiseSuppression,
    this.autoGainControl,
    this.deviceId,
  });

  Map<String, dynamic> toConstraints() {
    final constraints = <String, dynamic>{};
    if (echoCancellation != null) {
      constraints['echoCancellation'] = echoCancellation;
    }
    if (noiseSuppression != null) {
      constraints['noiseSuppression'] = noiseSuppression;
    }
    if (autoGainControl != null) {
      constraints['autoGainControl'] = autoGainControl;
    }
    if (deviceId != null) constraints['deviceId'] = deviceId;
    return constraints.isEmpty ? {'optional': []} : constraints;
  }
}

/// Video configuration
class VideoConfig {
  /// Preferred width
  final int? width;

  /// Preferred height
  final int? height;

  /// Preferred frame rate
  final int? frameRate;

  /// Facing mode ('user' for front camera, 'environment' for back camera)
  final String? facingMode;

  /// Specific device ID to use
  final String? deviceId;

  const VideoConfig({
    this.width,
    this.height,
    this.frameRate,
    this.facingMode,
    this.deviceId,
  });

  /// Front camera preset (720p)
  static const VideoConfig frontCamera = VideoConfig(
    facingMode: 'user',
    width: 1280,
    height: 720,
  );

  /// Back camera preset (720p)
  static const VideoConfig backCamera = VideoConfig(
    facingMode: 'environment',
    width: 1280,
    height: 720,
  );

  /// HD preset (720p)
  static const VideoConfig hd = VideoConfig(width: 1280, height: 720);

  /// Full HD preset (1080p)
  static const VideoConfig fullHd = VideoConfig(width: 1920, height: 1080);

  /// 4K preset
  static const VideoConfig uhd4k = VideoConfig(width: 3840, height: 2160);

  Map<String, dynamic> toConstraints() {
    final constraints = <String, dynamic>{};
    if (width != null) constraints['width'] = width;
    if (height != null) constraints['height'] = height;
    if (frameRate != null) constraints['frameRate'] = frameRate;
    if (facingMode != null) constraints['facingMode'] = facingMode;
    if (deviceId != null) constraints['deviceId'] = deviceId;
    return constraints.isEmpty ? {'optional': []} : constraints;
  }
}

/// Screen share configuration
class ScreenShareConfig {
  /// Preferred width
  final int? width;

  /// Preferred height
  final int? height;

  /// Preferred frame rate
  final int? frameRate;

  /// Include system audio (supported on some platforms)
  final bool includeSystemAudio;

  /// For desktop: prefer window capture over full screen
  final bool preferWindow;

  const ScreenShareConfig({
    this.width,
    this.height,
    this.frameRate,
    this.includeSystemAudio = false,
    this.preferWindow = false,
  });

  /// Default screen share config (1080p, 30fps)
  static const ScreenShareConfig defaultConfig = ScreenShareConfig(
    width: 1920,
    height: 1080,
    frameRate: 30,
  );

  /// High quality screen share (1080p, 60fps)
  static const ScreenShareConfig highQuality = ScreenShareConfig(
    width: 1920,
    height: 1080,
    frameRate: 60,
  );

  Map<String, dynamic> toConstraints() {
    final constraints = <String, dynamic>{};
    if (width != null) constraints['width'] = width;
    if (height != null) constraints['height'] = height;
    if (frameRate != null) constraints['frameRate'] = frameRate;
    return constraints;
  }
}

/// Result from getLocalMedia containing streams and tracks
class LocalMedia {
  /// The MediaStream containing all tracks
  final MediaStream stream;

  /// Audio track (if requested and available)
  final MediaStreamTrack? audioTrack;

  /// Video track (if requested and available)
  final MediaStreamTrack? videoTrack;

  /// Screen share video track (if requested and available)
  final MediaStreamTrack? screenshareTrack;

  /// Screen share audio track (if available - system audio)
  final MediaStreamTrack? screenshareAudioTrack;

  /// Stream for screen share (separate from camera stream)
  final MediaStream? screenshareStream;

  /// The media types that were successfully captured
  final Set<MediaType> capturedTypes;

  const LocalMedia({
    required this.stream,
    this.audioTrack,
    this.videoTrack,
    this.screenshareTrack,
    this.screenshareAudioTrack,
    this.screenshareStream,
    required this.capturedTypes,
  });

  /// Get all video tracks (camera + screenshare)
  List<MediaStreamTrack> get allVideoTracks {
    final tracks = <MediaStreamTrack>[];
    if (videoTrack != null) tracks.add(videoTrack!);
    if (screenshareTrack != null) tracks.add(screenshareTrack!);
    return tracks;
  }

  /// Get all audio tracks (mic + system audio)
  List<MediaStreamTrack> get allAudioTracks {
    final tracks = <MediaStreamTrack>[];
    if (audioTrack != null) tracks.add(audioTrack!);
    if (screenshareAudioTrack != null) tracks.add(screenshareAudioTrack!);
    return tracks;
  }

  /// Get all tracks
  List<MediaStreamTrack> get allTracks {
    return [...allAudioTracks, ...allVideoTracks];
  }

  /// Get tracks with their types for producing
  ///
  /// Includes the source stream reference for proper camera release on macOS.
  List<TrackWithType> get tracksWithTypes {
    final result = <TrackWithType>[];
    if (audioTrack != null) {
      result.add(TrackWithType(
        track: audioTrack!,
        type: StreamType.audio,
        sourceStream: stream, // Pass the original stream from getUserMedia
      ),);
    }
    if (videoTrack != null) {
      result.add(TrackWithType(
        track: videoTrack!,
        type: StreamType.video,
        sourceStream: stream, // Pass the original stream from getUserMedia
      ),);
    }
    if (screenshareTrack != null) {
      result.add(TrackWithType(
        track: screenshareTrack!,
        type: StreamType.screenshare,
        sourceStream: screenshareStream, // Pass the screen share stream
      ),);
    }
    // Note: screenshareAudioTrack is typically mixed with the screenshare
    return result;
  }

  /// Dispose all streams and tracks
  Future<void> dispose() async {
    for (final track in stream.getTracks()) {
      track.stop();
    }
    await stream.dispose();

    if (screenshareStream != null) {
      for (final track in screenshareStream!.getTracks()) {
        track.stop();
      }
      await screenshareStream!.dispose();
    }
  }
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

  /// The original MediaStream from getUserMedia.
  /// On macOS, the camera is only released when this specific stream is disposed.
  /// Pass this to ensure proper camera release on pause.
  final MediaStream? sourceStream;

  const TrackWithType({
    required this.track,
    this.type,
    this.sourceStream,
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
class RemoteStream extends Equatable {
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

  /// Whether the stream is paused (muted by remote participant)
  final bool paused;

  const RemoteStream({
    required this.id,
    required this.type,
    required this.stream,
    required this.producerId,
    required this.participantId,
    required this.participantName,
    this.paused = false,
  });

  /// Create a copy with the given fields replaced
  RemoteStream copyWith({
    String? id,
    StreamType? type,
    MediaStream? stream,
    String? producerId,
    String? participantId,
    String? participantName,
    bool? paused,
  }) {
    return RemoteStream(
      id: id ?? this.id,
      type: type ?? this.type,
      stream: stream ?? this.stream,
      producerId: producerId ?? this.producerId,
      participantId: participantId ?? this.participantId,
      participantName: participantName ?? this.participantName,
      paused: paused ?? this.paused,
    );
  }

  @override
  List<Object?> get props =>
      [id, type, producerId, participantId, participantName, paused];
}

// ============================================================================
// PARTICIPANTS
// ============================================================================

/// Participant information
class Participant extends Equatable {
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

  /// Create a copy with the given fields replaced
  Participant copyWith({
    String? id,
    String? name,
    Map<String, dynamic>? info,
  }) {
    return Participant(
      id: id ?? this.id,
      name: name ?? this.name,
      info: info ?? this.info,
    );
  }

  @override
  List<Object?> get props => [id, name, info];
}

/// Remote participant with their streams
///
/// This class represents a remote participant in the conference,
/// including their identity and all their media streams.
class RemoteParticipant extends Equatable {
  /// Participant ID
  final String id;

  /// Display name
  final String name;

  /// Extra participant info (permissions, metadata, etc.)
  final Map<String, dynamic> info;

  /// List of streams from this participant
  final List<RemoteStream> streams;

  const RemoteParticipant({
    required this.id,
    required this.name,
    this.info = const {},
    this.streams = const [],
  });

  /// Create from a Participant
  factory RemoteParticipant.fromParticipant(
    Participant participant, {
    List<RemoteStream> streams = const [],
  }) {
    return RemoteParticipant(
      id: participant.id,
      name: participant.name,
      info: participant.info,
      streams: streams,
    );
  }

  /// Get audio stream (null if not available)
  RemoteStream? get audioStream => streams.cast<RemoteStream?>().firstWhere(
        (s) => s?.type == StreamType.audio,
        orElse: () => null,
      );

  /// Get video stream (null if not available)
  RemoteStream? get videoStream => streams.cast<RemoteStream?>().firstWhere(
        (s) => s?.type == StreamType.video,
        orElse: () => null,
      );

  /// Get screenshare stream (null if not available)
  RemoteStream? get screenshareStream =>
      streams.cast<RemoteStream?>().firstWhere(
            (s) => s?.type == StreamType.screenshare,
            orElse: () => null,
          );

  /// Whether participant has audio
  bool get hasAudio => audioStream != null;

  /// Whether participant has video
  bool get hasVideo => videoStream != null;

  /// Whether participant is sharing screen
  bool get hasScreenshare => screenshareStream != null;

  /// Whether audio stream is muted (paused by remote participant)
  bool get isAudioMuted => audioStream?.paused ?? true;

  /// Whether video stream is muted (paused by remote participant)
  bool get isVideoMuted => videoStream?.paused ?? true;

  /// Whether screenshare stream is paused
  bool get isScreensharePaused => screenshareStream?.paused ?? true;

  /// Create a copy with the given fields replaced
  RemoteParticipant copyWith({
    String? id,
    String? name,
    Map<String, dynamic>? info,
    List<RemoteStream>? streams,
  }) {
    return RemoteParticipant(
      id: id ?? this.id,
      name: name ?? this.name,
      info: info ?? this.info,
      streams: streams ?? this.streams,
    );
  }

  /// Add a stream to this participant
  RemoteParticipant addStream(RemoteStream stream) {
    return copyWith(streams: [...streams, stream]);
  }

  /// Remove a stream from this participant by ID
  RemoteParticipant removeStream(String streamId) {
    return copyWith(
      streams: streams.where((s) => s.id != streamId).toList(),
    );
  }

  @override
  List<Object?> get props => [id, name, info, streams];

  @override
  String toString() {
    return 'RemoteParticipant(id: $id, name: $name, streams: ${streams.length})';
  }
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

/// Stream paused event (remote participant muted audio/video)
class StreamPausedEvent {
  final String participantId;
  final StreamType type;

  const StreamPausedEvent({
    required this.participantId,
    required this.type,
  });
}

/// Stream resumed event (remote participant unmuted audio/video)
class StreamResumedEvent {
  final String participantId;
  final StreamType type;

  const StreamResumedEvent({
    required this.participantId,
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
  MediaStreamTrack track; // Mutable - can be replaced on resume after stop
  final Producer producer;
  MediaStream stream; // Mutable - can be replaced on resume after stop
  bool paused;

  /// Stores the original track settings for re-acquisition on resume
  /// Only used for video tracks that were stopped (not just paused)
  Map<String, dynamic>? stoppedTrackSettings;

  ProducerInfo({
    required this.id,
    required this.type,
    required this.track,
    required this.producer,
    required this.stream,
    this.paused = false,
    this.stoppedTrackSettings,
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
