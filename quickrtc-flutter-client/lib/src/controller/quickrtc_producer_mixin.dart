import 'dart:async';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/mediasoup.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/types.dart';
import 'package:quickrtc_flutter_client/src/exceptions.dart';
import 'package:quickrtc_flutter_client/platform/quickrtc_platform.dart';

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
  Duration get operationTimeout;

  /// Timer for monitoring Android screen share track state
  Timer? _androidScreenShareMonitor;

  void log(String message, [dynamic data]);
  Future<Map<String, dynamic>> emitWithAck(
    String event,
    Map<String, dynamic> data, {
    Duration? timeout,
  });

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
      throw QuickRTCNotConnectedException('produce');
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

      // Wait for the producer via callback with timeout
      final Producer producer;
      try {
        producer = await completer.future.timeout(
          operationTimeout,
          onTimeout: () {
            pendingProducers.remove(produceKey);
            throw QuickRTCTimeoutException(
              operation: 'Producer creation for ${track.kind}',
              timeout: operationTimeout,
            );
          },
        );
      } catch (e) {
        pendingProducers.remove(produceKey);
        if (e is QuickRTCException) rethrow;
        throw QuickRTCProducerException(
          'Failed to create producer for ${track.kind}',
          cause: e,
        );
      }
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

      // For Android screen share, start monitoring the track state
      // This is needed because track.onEnded doesn't fire reliably on Android
      // when MediaProjection is stopped via the system notification
      if (!kIsWeb &&
          Platform.isAndroid &&
          streamType == StreamType.screenshare) {
        _startAndroidScreenShareMonitor(producer.id, track);
      }

      results.add(localStream);
    }

    // Update state with new local streams
    updateState(
      state.copyWith(
        localStreams: [...state.localStreams, ...results],
      ),
    );

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
      throw QuickRTCNotFoundException('Producer', streamId);
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
        .where(
          (p) =>
              p.id != producerInfo.id &&
              p.stream.id == sharedStreamId &&
              !p.paused,
        )
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
      throw QuickRTCNotFoundException('Producer', streamId);
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
        log(
          'resumeStream: Failed to re-acquire ${isVideo ? "camera" : "microphone"}',
          e,
        );
        throw QuickRTCMediaException(
          'Failed to re-acquire ${isVideo ? "camera" : "microphone"}',
          e,
        );
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
      log('stopStream: Producer not found, already stopped?', streamId);
      return;
    }

    log('stopStream: Found producer', {
      'id': producerInfo.id,
      'type': producerInfo.type.value,
      'trackId': producerInfo.track.id,
    });

    // Clear callbacks to prevent callbacks during cleanup
    producerInfo.track.onEnded = null;
    producerInfo.track.onMute = null;

    // Stop Android screen share monitor if this was a screenshare
    if (producerInfo.type == StreamType.screenshare) {
      _stopAndroidScreenShareMonitor();
    }

    producerInfo.producer.close();
    log('stopStream: Producer closed locally');

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

    // Stop Android foreground service if this was a screenshare
    if (producerInfo.type == StreamType.screenshare) {
      if (!kIsWeb && Platform.isAndroid) {
        log('stopStream: Stopping Android screen capture service');
        await QuickRTCPlatform.stopScreenCaptureService();
      }
    }

    log('stopStream: Emitting closeProducer to server', {
      'conferenceId': conferenceId,
      'participantId': participantId,
      'producerId': streamId,
    });

    await emitWithAck('closeProducer', {
      'conferenceId': conferenceId,
      'participantId': participantId,
      'extraData': {
        'producerId': streamId,
      },
    });

    log('stopStream: Server acknowledged closeProducer');

    // Update state - remove the local stream
    final previousCount = state.localStreams.length;
    updateState(
      state.copyWith(
        localStreams:
            state.localStreams.where((s) => s.id != streamId).toList(),
      ),
    );
    log('stopStream: Updated local state', {
      'previousStreamCount': previousCount,
      'newStreamCount': state.localStreams.length,
    });
  }

  /// Close all producers (defensive - ignores errors during cleanup)
  Future<void> closeAllProducers() async {
    // Stop Android screen share monitor
    _stopAndroidScreenShareMonitor();

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
    log(
      '_updateLocalStreamPausedState',
      {'streamId': streamId, 'paused': paused},
    );

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

  // ============================================================================
  // ANDROID SCREEN SHARE MONITORING
  // ============================================================================

  /// Last bytes sent count for the screen share producer (used for stall detection)
  int? _lastBytesSent;

  /// Count of consecutive checks with no new bytes sent
  int _stallCount = 0;

  /// Number of consecutive stalls before considering the stream stopped
  /// At 500ms intervals, 4 stalls = 2 seconds of no data
  static const int _maxStallCount = 4;

  /// Start monitoring Android screen share track for external stop.
  ///
  /// On Android, when MediaProjection is stopped via the system notification
  /// ("Stop now" button), track.onEnded doesn't fire reliably. We use multiple
  /// detection strategies:
  ///
  /// 1. **track.onMute callback** - May fire when MediaProjection stops
  /// 2. **track.muted property** - Checked periodically
  /// 3. **Producer stats monitoring** - If no new bytes are sent for a period,
  ///    the stream is likely stopped. This is the most reliable method.
  void _startAndroidScreenShareMonitor(
    String producerId,
    MediaStreamTrack track,
  ) {
    // Cancel any existing monitor
    _stopAndroidScreenShareMonitor();

    log('Starting Android screen share monitor for producer: $producerId');

    // Reset stall detection state
    _lastBytesSent = null;
    _stallCount = 0;

    // Set up onMute callback - this may fire when MediaProjection is stopped
    track.onMute = () {
      log('Android screen share: Track muted event received');
      _handleAndroidScreenShareStopped(producerId, 'onMute');
    };

    // Monitor via timer - check every 500ms
    _androidScreenShareMonitor =
        Timer.periodic(const Duration(milliseconds: 500), (timer) async {
      // Check if we still have this producer
      final producerInfo = producers[producerId];
      if (producerInfo == null) {
        log('Android screen share monitor: Producer no longer exists, stopping monitor');
        _stopAndroidScreenShareMonitor();
        return;
      }

      // Skip if we're paused
      if (producerInfo.paused) {
        return;
      }

      // Strategy 1: Check track.muted
      if (track.muted == true) {
        log('Android screen share monitor: Track muted externally');
        _handleAndroidScreenShareStopped(producerId, 'muted state');
        return;
      }

      // Strategy 2: Check producer stats for stalled stream
      // When MediaProjection is stopped, the producer stops sending bytes
      try {
        final stats = await producerInfo.producer.getStats();

        // Find the outbound-rtp stat for video
        int? currentBytesSent;
        for (final stat in stats) {
          final type = stat.type;
          if (type == 'outbound-rtp') {
            final values = stat.values;
            if (values.containsKey('bytesSent')) {
              currentBytesSent = values['bytesSent'] as int?;
              break;
            }
          }
        }

        if (currentBytesSent != null) {
          if (_lastBytesSent != null) {
            if (currentBytesSent == _lastBytesSent) {
              // No new bytes sent - increment stall counter
              _stallCount++;
              log('Android screen share monitor: No new bytes sent (stall count: $_stallCount/$_maxStallCount)');

              if (_stallCount >= _maxStallCount) {
                log('Android screen share monitor: Stream stalled for too long, treating as stopped');
                _handleAndroidScreenShareStopped(
                    producerId, 'stalled stream (no bytes sent)');
                return;
              }
            } else {
              // Bytes are being sent, reset stall counter
              if (_stallCount > 0) {
                log('Android screen share monitor: Stream recovered, resetting stall count');
              }
              _stallCount = 0;
            }
          }
          _lastBytesSent = currentBytesSent;
        }
      } catch (e) {
        // Stats retrieval failed, which might indicate the producer is closed
        log('Android screen share monitor: Failed to get stats', e);
        _stallCount++;
        if (_stallCount >= _maxStallCount) {
          log('Android screen share monitor: Stats failed too many times, treating as stopped');
          _handleAndroidScreenShareStopped(producerId, 'stats unavailable');
        }
      }
    });
  }

  /// Handle Android screen share stopped externally.
  void _handleAndroidScreenShareStopped(String producerId, String source) {
    log('Android screen share stopped externally via $source');
    _stopAndroidScreenShareMonitor();

    // Trigger stop if we still have the producer
    if (producers.containsKey(producerId)) {
      // Use microtask to avoid blocking the callback
      Future.microtask(() async {
        try {
          await stopStream(producerId);
          log('Android screen share: Screen share stopped successfully');
        } catch (e) {
          log('Android screen share: Error stopping screen share', e);
        }
      });
    }
  }

  /// Stop the Android screen share monitor.
  void _stopAndroidScreenShareMonitor() {
    if (_androidScreenShareMonitor != null) {
      log('Stopping Android screen share monitor');
      _androidScreenShareMonitor?.cancel();
      _androidScreenShareMonitor = null;
    }
    // Reset state
    _lastBytesSent = null;
    _stallCount = 0;
  }
}
