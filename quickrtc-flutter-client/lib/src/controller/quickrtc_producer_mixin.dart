import 'dart:async';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/mediasoup.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/types.dart';

/// Mixin providing producer functionality (producing local media)
mixin QuickRTCProducerMixin {
  // Required implementations from the main class
  QuickRTCState get state;
  void updateState(QuickRTCState newState);
  Transport? get sendTransport;
  String? get conferenceId;
  String? get participantId;
  Map<String, ProducerInfo> get producers;
  Map<String, Completer<Producer>> get pendingProducers;

  void log(String message, [dynamic data]);
  Future<Map<String, dynamic>> emitWithAck(
      String event, Map<String, dynamic> data);

  /// Produce media tracks
  ///
  /// Accepts:
  /// - Single track: `produce(ProduceInput.fromTrack(track))`
  /// - Array of tracks: `produce(ProduceInput.fromTracks([audioTrack, videoTrack]))`
  /// - Track with type hint: `produce(ProduceInput.fromTrack(screenTrack, type: StreamType.screenshare))`
  ///
  /// Returns array of LocalStream handles with pause/resume/stop methods
  Future<List<LocalStream>> produce(ProduceInput input) async {
    if (!state.isConnected) {
      throw Exception('Not connected to a conference');
    }

    final tracksWithTypes = input.toTrackList();
    log('Producing tracks', tracksWithTypes.length);

    final results = <LocalStream>[];

    for (final trackWithType in tracksWithTypes) {
      final track = trackWithType.track;
      final streamType = trackWithType.type ?? _inferStreamType(track);

      log('Producing track', '${track.kind} as ${streamType.value}');

      // Create MediaStream for the track
      final stream = await createLocalMediaStream('quickrtc_${track.id}');
      stream.addTrack(track);

      // Create a completer and unique key for this produce request
      final produceKey =
          'produce_${DateTime.now().millisecondsSinceEpoch}_${track.id}';
      final completer = Completer<Producer>();
      pendingProducers[produceKey] = completer;

      // Start produce (returns void, producer comes via callback)
      sendTransport!.produce(
        track: track,
        stream: stream,
        appData: {'streamType': streamType.value},
        source:
            streamType == StreamType.screenshare ? 'screenshare' : track.kind!,
      );

      // Wait for the producer via callback
      final producer = await completer.future;
      pendingProducers.remove(produceKey);

      // Store producer info
      final producerInfo = ProducerInfo(
        id: producer.id,
        type: streamType,
        track: track,
        producer: producer,
        stream: stream,
        paused: producer.paused,
      );

      producers[producer.id] = producerInfo;

      // Create LocalStream handle
      final localStream = _createLocalStreamHandle(producerInfo);

      // Handle native track ended (e.g., browser "Stop sharing" button)
      track.onEnded = () async {
        log('Track ended externally: ${producer.id} (${streamType.value})');

        // Only cleanup if we still have this producer
        if (producers.containsKey(producer.id)) {
          await stopStream(producer.id);
        }
      };

      results.add(localStream);
    }

    // Update state with new local streams
    updateState(state.copyWith(
      localStreams: [...state.localStreams, ...results],
    ));

    return results;
  }

  /// Pause a local stream
  Future<void> pauseStream(String streamId) async {
    log('Pausing stream', streamId);

    final producerInfo = producers[streamId];
    if (producerInfo == null) {
      throw Exception('Producer not found: $streamId');
    }

    producerInfo.producer.pause();
    producerInfo.paused = true;

    await emitWithAck('pauseProducer', {
      'conferenceId': conferenceId,
      'participantId': participantId,
      'producerId': streamId,
    });

    // Update local stream state
    _updateLocalStreamPausedState(streamId, true);
  }

  /// Resume a local stream
  Future<void> resumeStream(String streamId) async {
    log('Resuming stream', streamId);

    final producerInfo = producers[streamId];
    if (producerInfo == null) {
      throw Exception('Producer not found: $streamId');
    }

    producerInfo.producer.resume();
    producerInfo.paused = false;

    await emitWithAck('unpauseProducer', {
      'conferenceId': conferenceId,
      'participantId': participantId,
      'producerId': streamId,
    });

    // Update local stream state
    _updateLocalStreamPausedState(streamId, false);
  }

  /// Stop a local stream
  Future<void> stopStream(String streamId) async {
    log('Stopping stream', streamId);

    final producerInfo = producers.remove(streamId);
    if (producerInfo == null) {
      return;
    }

    producerInfo.producer.close();
    producerInfo.track.stop();

    await emitWithAck('closeProducer', {
      'conferenceId': conferenceId,
      'participantId': participantId,
      'extraData': {
        'producerId': streamId,
      },
    });

    // Update state - remove the local stream
    updateState(state.copyWith(
      localStreams: state.localStreams.where((s) => s.id != streamId).toList(),
    ));
  }

  /// Close all producers
  Future<void> closeAllProducers() async {
    for (final producer in producers.values) {
      producer.producer.close();
    }
    producers.clear();
  }

  /// Infer stream type from track kind
  StreamType _inferStreamType(MediaStreamTrack track) {
    return track.kind == 'audio' ? StreamType.audio : StreamType.video;
  }

  /// Create LocalStream handle from ProducerInfo
  LocalStream _createLocalStreamHandle(ProducerInfo info) {
    return LocalStream(
      id: info.id,
      type: info.type,
      stream: info.stream,
      track: info.track,
      paused: info.paused,
      producer: info.producer,
      onPause: pauseStream,
      onResume: resumeStream,
      onStop: stopStream,
    );
  }

  /// Update the paused state of a local stream in state
  void _updateLocalStreamPausedState(String streamId, bool paused) {
    final updatedStreams = state.localStreams.map((s) {
      if (s.id == streamId) {
        return LocalStream(
          id: s.id,
          type: s.type,
          stream: s.stream,
          track: s.track,
          paused: paused,
          producer: s.producer,
          onPause: pauseStream,
          onResume: resumeStream,
          onStop: stopStream,
        );
      }
      return s;
    }).toList();

    updateState(state.copyWith(localStreams: updatedStreams));
  }
}
