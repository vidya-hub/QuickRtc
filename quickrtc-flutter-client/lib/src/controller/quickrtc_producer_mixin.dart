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
      String event, Map<String, dynamic> data,);

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

      // IMPORTANT: Use the original stream from getUserMedia if provided.
      // On macOS, the camera is only released when the ORIGINAL stream from
      // getUserMedia is disposed. If we create a new stream here, the original
      // stream is never disposed and the camera LED stays on.
      final MediaStream stream;
      if (trackWithType.sourceStream != null) {
        // Use the original stream - this is critical for proper camera release on macOS
        stream = trackWithType.sourceStream!;
        log('Using original stream from getUserMedia', stream.id);
      } else {
        // Fallback: create a new stream if no source stream provided
        // This may cause camera LED to stay on macOS when pausing
        stream = await createLocalMediaStream('quickrtc_${track.id}');
        stream.addTrack(track);
        log('Created new stream (no sourceStream provided)', stream.id);
      }

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
    ),);

    return results;
  }

  /// Pause a local stream
  ///
  /// For video streams, this stops the track completely to turn off the camera LED.
  /// For audio streams, this just disables the track (mutes).
  Future<void> pauseStream(String streamId) async {
    log('Pausing stream', streamId);

    final producerInfo = producers[streamId];
    if (producerInfo == null) {
      log('pauseStream: Producer not found', streamId);
      throw Exception('Producer not found: $streamId');
    }

    log('pauseStream: Pausing producer', {
      'id': producerInfo.id,
      'type': producerInfo.type.value,
      'trackEnabled': producerInfo.track.enabled,
    });

    // Pause the producer (stops sending to server)
    producerInfo.producer.pause();
    producerInfo.paused = true;

    // Stop the track completely to release the hardware (camera LED / microphone)
    // Store track settings for re-acquisition on resume
    if (producerInfo.type == StreamType.video ||
        producerInfo.type == StreamType.screenshare) {
      producerInfo.stoppedTrackSettings = {
        'facingMode': 'user', // Default to front camera
      };
      log('pauseStream: Stopping video track to release camera');
    } else {
      // Audio track
      producerInfo.stoppedTrackSettings = {
        'type': 'audio',
      };
      log('pauseStream: Stopping audio track to release microphone');
    }

    // Store reference to track and stream before clearing
    final trackToStop = producerInfo.track;
    final streamToDispose = producerInfo.stream;

    // Clear onEnded handler to prevent callbacks during cleanup
    trackToStop.onEnded = null;

    // CRITICAL: Replace the track in RTCRtpSender with null first
    // This disconnects the track from the peer connection
    try {
      final rtpSender = producerInfo.producer.rtpSender;
      if (rtpSender != null) {
        await rtpSender.replaceTrack(null);
        log('pauseStream: RTCRtpSender track replaced with null');
      }
    } catch (e) {
      log('pauseStream: Failed to replace RTCRtpSender track with null', e);
    }

    log('pauseStream: About to release camera', {
      'trackId': trackToStop.id,
      'trackKind': trackToStop.kind,
      'streamId': streamToDispose.id,
    });

    // Check if any other producer is using the same stream before disposing.
    // This can happen when audio and video tracks come from the same getUserMedia stream.
    final sharedStreamId = streamToDispose.id;
    final otherProducersUsingSameStream = producers.values
        .where((p) =>
            p.id != producerInfo.id &&
            p.stream.id == sharedStreamId &&
            !p.paused,)
        .toList();

    if (otherProducersUsingSameStream.isEmpty) {
      // CAMERA RELEASE STRATEGY:
      // On macOS, use stream.dispose() instead of track.stop().
      //
      // Why? Native `streamDispose` directly looks up the stream by ID and calls
      // the video capturer stop handler. In contrast, `track.stop()` triggers
      // `trackDispose` which must search through localStreams to find the track.
      //
      // The stream.dispose() path is more reliable because:
      // 1. It uses the stream ID directly (no searching required)
      // 2. The original stream from getUserMedia is guaranteed to be in localStreams
      // 3. It handles both the track stop and stream cleanup in one call
      try {
        await streamToDispose.dispose();
        log('pauseStream: Stream disposed - camera should be released now');
      } catch (e) {
        log('pauseStream: Failed to dispose stream', e);
        // Fallback: try track.stop() if stream.dispose() fails
        try {
          await trackToStop.stop();
          log('pauseStream: Fallback track.stop() called');
        } catch (e2) {
          log('pauseStream: Fallback track.stop() also failed', e2);
        }
      }
    } else {
      // Other producers are using this stream - just stop the track
      // The stream stays alive for other tracks
      log('pauseStream: Other producers using stream, stopping track only');
      try {
        await trackToStop.stop();
        log('pauseStream: Track stopped (stream kept for other producers)');
      } catch (e) {
        log('pauseStream: Failed to stop track', e);
      }
    }

    log('pauseStream: Camera release completed');

    await emitWithAck('pauseProducer', {
      'conferenceId': conferenceId,
      'participantId': participantId,
      'extraData': {'producerId': streamId},
    });

    log('pauseStream: Server notified, updating state');

    // Update local stream state
    _updateLocalStreamPausedState(streamId, true);

    log('pauseStream: State updated, stream is now paused');
  }

  /// Resume a local stream
  ///
  /// For video streams that were stopped, this re-acquires the camera track.
  /// For audio streams, this just re-enables the track.
  Future<void> resumeStream(String streamId) async {
    log('Resuming stream', streamId);

    final producerInfo = producers[streamId];
    if (producerInfo == null) {
      log('resumeStream: Producer not found', streamId);
      throw Exception('Producer not found: $streamId');
    }

    log('resumeStream: Resuming producer', {
      'id': producerInfo.id,
      'type': producerInfo.type.value,
      'wasStopped': producerInfo.stoppedTrackSettings != null,
    });

    // For tracks that were stopped, we need to re-acquire the hardware
    if (producerInfo.stoppedTrackSettings != null) {
      final isVideo = producerInfo.type == StreamType.video ||
          producerInfo.type == StreamType.screenshare;

      log('resumeStream: Re-acquiring ${isVideo ? "camera" : "microphone"} track');

      try {
        // Get new track based on type
        final Map<String, dynamic> mediaConstraints;
        if (isVideo) {
          mediaConstraints = {
            'audio': false,
            'video': producerInfo.type == StreamType.screenshare
                ? {'mandatory': {}, 'optional': []}
                : {
                    'facingMode':
                        producerInfo.stoppedTrackSettings?['facingMode'] ??
                            'user',
                    'width': 1280,
                    'height': 720,
                  },
          };
        } else {
          // Audio constraints
          mediaConstraints = {
            'audio': true,
            'video': false,
          };
        }

        final newStream =
            await navigator.mediaDevices.getUserMedia(mediaConstraints);
        final newTrack = isVideo
            ? newStream.getVideoTracks().first
            : newStream.getAudioTracks().first;

        log('resumeStream: Got new track', newTrack.id);

        // Replace the track in the producer's RTCRtpSender
        await producerInfo.producer.replaceTrack(newTrack);

        // Use the new stream from getUserMedia - this ensures the UI gets a fresh reference
        producerInfo.stream = newStream;
        producerInfo.track = newTrack;
        producerInfo.stoppedTrackSettings = null; // Clear the stopped flag

        // Handle track ended event for the new track
        newTrack.onEnded = () async {
          log('Track ended externally: ${producerInfo.id} (${producerInfo.type.value})');
          if (producers.containsKey(producerInfo.id)) {
            await stopStream(producerInfo.id);
          }
        };

        log('resumeStream: Track replaced successfully');
      } catch (e) {
        log('resumeStream: Failed to re-acquire ${isVideo ? "camera" : "microphone"}',
            e,);
        throw Exception(
            'Failed to re-acquire ${isVideo ? "camera" : "microphone"}: $e',);
      }
    } else {
      // Track wasn't fully stopped, just re-enable it
      producerInfo.track.enabled = true;
      log('resumeStream: Track re-enabled');
    }

    // Resume the producer
    producerInfo.producer.resume();
    producerInfo.paused = false;

    await emitWithAck('unpauseProducer', {
      'conferenceId': conferenceId,
      'participantId': participantId,
      'extraData': {'producerId': streamId},
    });

    log('resumeStream: Server notified, updating state');

    // Update local stream state
    _updateLocalStreamPausedState(streamId, false);

    log('resumeStream: State updated, stream is now active');
  }

  /// Stop a local stream
  Future<void> stopStream(String streamId) async {
    log('Stopping stream', streamId);

    final producerInfo = producers.remove(streamId);
    if (producerInfo == null) {
      return;
    }

    // Clear onEnded to prevent callbacks during cleanup
    producerInfo.track.onEnded = null;

    producerInfo.producer.close();

    // CAMERA RELEASE: Use stream.dispose() for reliable camera release on macOS.
    // See pauseStream() for detailed explanation.
    try {
      await producerInfo.stream.dispose();
      log('stopStream: Stream disposed - camera released');
    } catch (e) {
      log('stopStream: Failed to dispose stream, trying track.stop()', e);
      try {
        await producerInfo.track.stop();
      } catch (e2) {
        log('stopStream: track.stop() also failed', e2);
      }
    }

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
    ),);
  }

  /// Close all producers (defensive - ignores errors during cleanup)
  Future<void> closeAllProducers() async {
    for (final producer in producers.values) {
      try {
        producer.producer.close();
      } catch (_) {
        // Ignore errors during cleanup - peer connection may already be closed
      }
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
    log('_updateLocalStreamPausedState',
        {'streamId': streamId, 'paused': paused},);

    // Get current producer info to get latest track reference
    final producerInfo = producers[streamId];

    final updatedStreams = state.localStreams.map((s) {
      if (s.id == streamId) {
        log('_updateLocalStreamPausedState: Found matching stream', {
          'id': s.id,
          'type': s.type.value,
          'oldPaused': s.paused,
          'newPaused': paused,
        });
        return LocalStream(
          id: s.id,
          type: s.type,
          stream: producerInfo?.stream ?? s.stream, // Use latest stream
          track: producerInfo?.track ??
              s.track, // Use latest track (may have been replaced)
          paused: paused,
          producer: s.producer,
          onPause: pauseStream,
          onResume: resumeStream,
          onStop: stopStream,
        );
      }
      return s;
    }).toList();

    log('_updateLocalStreamPausedState: Updating state with ${updatedStreams.length} streams');
    updateState(state.copyWith(localStreams: updatedStreams));
  }
}
