import 'package:equatable/equatable.dart';
import 'package:quickrtc_flutter_client/types.dart';

/// Connection status for QuickRTC
enum ConnectionStatus {
  /// Not connected to any conference
  disconnected,

  /// Currently connecting to a conference
  connecting,

  /// Connected to a conference
  connected,
}

/// Immutable state for QuickRTC
///
/// This class represents the complete state of a QuickRTC session,
/// including connection status, local streams, and remote participants.
///
/// Example:
/// ```dart
/// QuickRTCBuilder(
///   buildWhen: (prev, curr) => prev.status != curr.status,
///   builder: (context, state) {
///     if (state.isConnected) {
///       return ConferenceView(participants: state.participantList);
///     }
///     return JoinButton();
///   },
/// )
/// ```
class QuickRTCState extends Equatable {
  /// Version counter - increments on every state change to ensure inequality
  /// This solves issues where nested objects (like MediaStream) don't properly
  /// compare, causing Equatable to incorrectly report states as equal.
  final int version;

  /// Current connection status
  final ConnectionStatus status;

  /// Conference/room ID (null if not connected)
  final String? conferenceId;

  /// Local participant ID (null if not connected)
  final String? participantId;

  /// Local participant display name
  final String? participantName;

  /// List of local streams (audio, video, screenshare)
  final List<LocalStream> localStreams;

  /// Map of remote participants by their ID
  final Map<String, RemoteParticipant> participants;

  /// Current error message (null if no error)
  final String? error;

  const QuickRTCState({
    this.version = 0,
    this.status = ConnectionStatus.disconnected,
    this.conferenceId,
    this.participantId,
    this.participantName,
    this.localStreams = const [],
    this.participants = const {},
    this.error,
  });

  // ============================================================================
  // CONVENIENCE GETTERS
  // ============================================================================

  /// Whether currently connected to a conference
  bool get isConnected => status == ConnectionStatus.connected;

  /// Whether currently connecting to a conference
  bool get isConnecting => status == ConnectionStatus.connecting;

  /// Whether disconnected from any conference
  bool get isDisconnected => status == ConnectionStatus.disconnected;

  /// Whether there is an error
  bool get hasError => error != null;

  /// List of all remote participants
  List<RemoteParticipant> get participantList => participants.values.toList();

  /// Total number of remote participants
  int get participantCount => participants.length;

  /// All remote streams from all participants
  List<RemoteStream> get allRemoteStreams =>
      participants.values.expand((p) => p.streams).toList();

  /// Local audio stream (null if not producing audio)
  LocalStream? get localAudioStream =>
      localStreams.cast<LocalStream?>().firstWhere(
            (s) => s?.type == StreamType.audio,
            orElse: () => null,
          );

  /// Local video stream (null if not producing video)
  LocalStream? get localVideoStream =>
      localStreams.cast<LocalStream?>().firstWhere(
            (s) => s?.type == StreamType.video,
            orElse: () => null,
          );

  /// Local screenshare stream (null if not sharing screen)
  LocalStream? get localScreenshareStream =>
      localStreams.cast<LocalStream?>().firstWhere(
            (s) => s?.type == StreamType.screenshare,
            orElse: () => null,
          );

  /// Whether local audio is being produced
  bool get hasLocalAudio => localAudioStream != null;

  /// Whether local video is being produced
  bool get hasLocalVideo => localVideoStream != null;

  /// Whether screen is being shared
  bool get hasLocalScreenshare => localScreenshareStream != null;

  /// Whether local audio is paused
  bool get isLocalAudioPaused => localAudioStream?.paused ?? true;

  /// Whether local video is paused
  bool get isLocalVideoPaused => localVideoStream?.paused ?? true;

  /// Whether local screenshare is paused
  bool get isLocalScreensharePaused => localScreenshareStream?.paused ?? true;

  // ============================================================================
  // COPY WITH
  // ============================================================================

  /// Create a copy of this state with the given fields replaced
  ///
  /// Use [clearError] to explicitly clear the error field.
  /// Use [clearConferenceId], [clearParticipantId], [clearParticipantName]
  /// to explicitly clear those fields.
  ///
  /// Note: The version is automatically incremented on every copyWith call
  /// to ensure state changes are always detected.
  QuickRTCState copyWith({
    ConnectionStatus? status,
    String? conferenceId,
    String? participantId,
    String? participantName,
    List<LocalStream>? localStreams,
    Map<String, RemoteParticipant>? participants,
    String? error,
    bool clearError = false,
    bool clearConferenceId = false,
    bool clearParticipantId = false,
    bool clearParticipantName = false,
  }) {
    return QuickRTCState(
      version: version + 1, // Always increment version
      status: status ?? this.status,
      conferenceId:
          clearConferenceId ? null : (conferenceId ?? this.conferenceId),
      participantId:
          clearParticipantId ? null : (participantId ?? this.participantId),
      participantName: clearParticipantName
          ? null
          : (participantName ?? this.participantName),
      localStreams: localStreams ?? this.localStreams,
      participants: participants ?? this.participants,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props => [
        version, // Include version to ensure state changes are always detected
        status,
        conferenceId,
        participantId,
        participantName,
        localStreams,
        participants,
        error,
      ];

  @override
  String toString() {
    return 'QuickRTCState('
        'version: $version, '
        'status: $status, '
        'conferenceId: $conferenceId, '
        'participantId: $participantId, '
        'localStreams: ${localStreams.length}, '
        'participants: ${participants.length}, '
        'error: $error)';
  }
}
