import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:quickrtc_flutter_client/types.dart';

/// Dedicated audio stream renderer
///
/// Handles audio-only streams properly without needing a visible video element.
/// On web, audio still requires an element in the DOM tree for playback,
/// so this widget creates a minimal RTCVideoView positioned offscreen.
///
/// ## Basic Usage
///
/// ```dart
/// QuickRTCAudioRenderer(
///   stream: participant.audioStream?.stream,
///   key: ValueKey('audio_${participant.id}'),
/// )
/// ```
///
/// ## Using with RemoteStream
///
/// ```dart
/// QuickRTCAudioRenderer(
///   remoteStream: participant.audioStream,
/// )
/// ```
///
/// ## Muting Locally
///
/// ```dart
/// QuickRTCAudioRenderer(
///   stream: audioStream,
///   muted: true, // Mutes locally without affecting the source
/// )
/// ```
class QuickRTCAudioRenderer extends StatefulWidget {
  /// The audio stream to render
  final MediaStream? stream;

  /// RemoteStream convenience accessor
  final RemoteStream? remoteStream;

  /// Mute the audio locally (doesn't affect the source track)
  final bool muted;

  /// Called when audio playback starts
  final VoidCallback? onPlaying;

  /// Called when an error occurs
  final void Function(dynamic error)? onError;

  const QuickRTCAudioRenderer({
    super.key,
    this.stream,
    this.remoteStream,
    this.muted = false,
    this.onPlaying,
    this.onError,
  });

  @override
  State<QuickRTCAudioRenderer> createState() => _QuickRTCAudioRendererState();
}

class _QuickRTCAudioRendererState extends State<QuickRTCAudioRenderer> {
  final RTCVideoRenderer _renderer = RTCVideoRenderer();
  bool _initialized = false;

  MediaStream? get _stream => widget.stream ?? widget.remoteStream?.stream;

  @override
  void initState() {
    super.initState();
    _initRenderer();
  }

  @override
  void didUpdateWidget(QuickRTCAudioRenderer oldWidget) {
    super.didUpdateWidget(oldWidget);

    final oldStream = oldWidget.stream ?? oldWidget.remoteStream?.stream;
    if (_stream != oldStream) {
      _updateStream();
    }

    // Handle mute changes
    if (widget.muted != oldWidget.muted) {
      _updateMute();
    }
  }

  @override
  void dispose() {
    _renderer.srcObject = null;
    _renderer.dispose();
    super.dispose();
  }

  Future<void> _initRenderer() async {
    try {
      await _renderer.initialize();
      if (mounted) {
        setState(() => _initialized = true);
        _updateStream();
      }
    } catch (e) {
      debugPrint('QuickRTCAudioRenderer: Failed to initialize renderer: $e');
      widget.onError?.call(e);
    }
  }

  void _updateStream() {
    if (!_initialized) return;

    final stream = _stream;
    _renderer.srcObject = stream;

    if (stream != null) {
      _updateMute();
      widget.onPlaying?.call();
    }
  }

  void _updateMute() {
    final stream = _stream;
    if (stream == null) return;

    for (final track in stream.getAudioTracks()) {
      track.enabled = !widget.muted;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized || _stream == null) {
      return const SizedBox.shrink();
    }

    // Render offscreen for web audio playback
    // On native platforms, this is effectively invisible but still in widget tree
    return SizedBox(
      width: 1,
      height: 1,
      child: Opacity(
        opacity: 0,
        child: RTCVideoView(_renderer),
      ),
    );
  }
}

/// Helper widget to render all audio streams from participants
///
/// Place this once in your widget tree (e.g., in a Stack) and it will
/// automatically handle all remote audio streams.
///
/// ## Usage
///
/// ```dart
/// Stack(
///   children: [
///     // Your video grid
///     VideoGrid(participants: state.participantList),
///
///     // Audio renderers (invisible, handles playback)
///     QuickRTCAudioRenderers(participants: state.participantList),
///   ],
/// )
/// ```
///
/// ## With Custom Handling
///
/// ```dart
/// QuickRTCAudioRenderers(
///   participants: state.participantList,
///   onError: (participantId, error) {
///     print('Audio error for $participantId: $error');
///   },
/// )
/// ```
class QuickRTCAudioRenderers extends StatelessWidget {
  /// List of participants (typically from state.participantList)
  final List<RemoteParticipant> participants;

  /// Called when an audio error occurs for a participant
  final void Function(String participantId, dynamic error)? onError;

  const QuickRTCAudioRenderers({
    super.key,
    required this.participants,
    this.onError,
  });

  @override
  Widget build(BuildContext context) {
    // Build list of audio renderers for all participants with audio streams
    final audioRenderers = <Widget>[];

    for (final participant in participants) {
      final audioStream = participant.audioStream;
      if (audioStream != null) {
        audioRenderers.add(
          QuickRTCAudioRenderer(
            key: ValueKey('audio_${participant.id}_${audioStream.id}'),
            remoteStream: audioStream,
            onError: onError != null
                ? (error) => onError!(participant.id, error)
                : null,
          ),
        );
      }
    }

    if (audioRenderers.isEmpty) {
      return const SizedBox.shrink();
    }

    // Stack all audio renderers (they're invisible anyway)
    return Stack(children: audioRenderers);
  }
}

/// A widget that combines multiple audio streams into one managed group
///
/// Useful when you have a list of streams that may change frequently
/// and want efficient reconciliation.
class QuickRTCAudioGroup extends StatelessWidget {
  /// List of audio streams to manage
  final List<AudioStreamEntry> streams;

  const QuickRTCAudioGroup({
    super.key,
    required this.streams,
  });

  @override
  Widget build(BuildContext context) {
    if (streams.isEmpty) {
      return const SizedBox.shrink();
    }

    return Stack(
      children: streams
          .map(
            (entry) => QuickRTCAudioRenderer(
              key: ValueKey(entry.id),
              stream: entry.stream,
              muted: entry.muted,
            ),
          )
          .toList(),
    );
  }
}

/// Entry for audio stream in [QuickRTCAudioGroup]
class AudioStreamEntry {
  /// Unique identifier for this stream
  final String id;

  /// The audio stream
  final MediaStream stream;

  /// Whether to mute this stream locally
  final bool muted;

  const AudioStreamEntry({
    required this.id,
    required this.stream,
    this.muted = false,
  });
}
