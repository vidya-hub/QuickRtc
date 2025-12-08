import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:logger/logger.dart';
import 'package:quickrtc_flutter_client/models/local_stream_info.dart';
import 'package:quickrtc_flutter_client/models/remote_participant.dart';

/// Options for producing media
class ProduceMediaOptions {
  final MediaStreamTrack? audioTrack;
  final MediaStreamTrack? videoTrack;

  ProduceMediaOptions({
    this.audioTrack,
    this.videoTrack,
  });
}

/// Result of producing media
class ProduceMediaResult {
  final String? audioStreamId;
  final String? videoStreamId;

  ProduceMediaResult({
    this.audioStreamId,
    this.videoStreamId,
  });
}

/// Service for managing media streams
class StreamService {
  static final StreamService _instance = StreamService._internal();
  factory StreamService() => _instance;
  StreamService._internal();

  final Logger _logger = Logger();

  /// Produce media from tracks
  Future<ProduceMediaResult> produceMedia({
    required RTCPeerConnection sendTransport,
    required ProduceMediaOptions options,
    required Function(String kind, Map<String, dynamic> rtpParameters)
        onProduce,
  }) async {
    _logger.d('Producing media');

    String? audioStreamId;
    String? videoStreamId;

    try {
      // Create a local media stream to hold the tracks
      final localStream = await createLocalMediaStream('local_stream');

      // Produce audio if provided
      if (options.audioTrack != null) {
        _logger.d('Adding audio track to transport');
        await localStream.addTrack(options.audioTrack!);
        final audioSender = await sendTransport.addTrack(
          options.audioTrack!,
          localStream,
        );
        final audioParams = await _getRtpParameters(audioSender);
        audioStreamId = await onProduce('audio', audioParams);
        _logger.i('Audio produced with ID: $audioStreamId');
      }

      // Produce video if provided
      if (options.videoTrack != null) {
        _logger.d('Adding video track to transport');
        await localStream.addTrack(options.videoTrack!);
        final videoSender = await sendTransport.addTrack(
          options.videoTrack!,
          localStream,
        );
        final videoParams = await _getRtpParameters(videoSender);
        videoStreamId = await onProduce('video', videoParams);
        _logger.i('Video produced with ID: $videoStreamId');
      }

      return ProduceMediaResult(
        audioStreamId: audioStreamId,
        videoStreamId: videoStreamId,
      );
    } catch (e) {
      _logger.e('Failed to produce media: $e');
      rethrow;
    }
  }

  /// Create local stream info
  Future<LocalStreamInfo> createLocalStreamInfo({
    required String streamId,
    required LocalStreamType type,
    required MediaStreamTrack track,
    required dynamic producer,
  }) async {
    // Create a new MediaStream using helper
    final stream = await createLocalMediaStream(streamId);
    await stream.addTrack(track);

    return LocalStreamInfo(
      id: streamId,
      type: type,
      track: track,
      stream: stream,
      enabled: track.enabled,
      producer: producer,
    );
  }

  /// Stop local stream
  Future<void> stopLocalStream(LocalStreamInfo streamInfo) async {
    _logger.d('Stopping local stream: ${streamInfo.id}');

    try {
      // Stop the track
      await streamInfo.track.stop();

      // Dispose the stream
      streamInfo.stream.dispose();

      _logger.i('Local stream stopped: ${streamInfo.id}');
    } catch (e) {
      _logger.e('Failed to stop local stream: $e');
      rethrow;
    }
  }

  /// Consume participant media
  Future<RemoteParticipant> consumeParticipant({
    required RTCPeerConnection recvTransport,
    required String participantId,
    required String participantName,
    required List<Map<String, dynamic>> consumerParams,
  }) async {
    _logger.d('Consuming participant: $participantId');

    MediaStream? audioStream;
    MediaStream? videoStream;
    dynamic audioConsumer;
    dynamic videoConsumer;

    try {
      for (final params in consumerParams) {
        final kind = params['kind'] as String;

        _logger.d('Creating consumer for $kind');

        // Add transceiver for receiving
        final transceiverInit = RTCRtpTransceiverInit(
          direction: TransceiverDirection.RecvOnly,
        );

        final transceiver = await recvTransport.addTransceiver(
          kind: kind == 'audio'
              ? RTCRtpMediaType.RTCRtpMediaTypeAudio
              : RTCRtpMediaType.RTCRtpMediaTypeVideo,
          init: transceiverInit,
        );

        if (kind == 'audio') {
          audioConsumer = transceiver.receiver;
          final track = transceiver.receiver.track;
          if (track != null) {
            audioStream =
                await createLocalMediaStream('${participantId}_audio');
            await audioStream.addTrack(track);
          }
        } else if (kind == 'video') {
          videoConsumer = transceiver.receiver;
          final track = transceiver.receiver.track;
          if (track != null) {
            videoStream =
                await createLocalMediaStream('${participantId}_video');
            await videoStream.addTrack(track);
          }
        }
      }
      _logger.i('Participant consumed: $participantId');

      return RemoteParticipant(
        participantId: participantId,
        participantName: participantName,
        audioStream: audioStream,
        videoStream: videoStream,
        audioConsumer: audioConsumer,
        videoConsumer: videoConsumer,
        isAudioEnabled: audioStream != null,
        isVideoEnabled: videoStream != null,
      );
    } catch (e) {
      _logger.e('Failed to consume participant: $e');
      rethrow;
    }
  }

  /// Stop consuming participant
  Future<void> stopConsumingParticipant(RemoteParticipant participant) async {
    _logger
        .d('Stopping consumption of participant: ${participant.participantId}');

    try {
      // Dispose audio stream
      if (participant.audioStream != null) {
        participant.audioStream!.dispose();
      }

      // Dispose video stream
      if (participant.videoStream != null) {
        participant.videoStream!.dispose();
      }

      _logger.i('Stopped consuming participant: ${participant.participantId}');
    } catch (e) {
      _logger.e('Failed to stop consuming participant: $e');
      rethrow;
    }
  }

  /// Close consumer
  void closeConsumer(dynamic consumer) {
    _logger.d('Closing consumer');
    // Consumer cleanup if needed
  }

  /// Get RTP parameters from sender
  Future<Map<String, dynamic>> _getRtpParameters(RTCRtpSender sender) async {
    // In flutter_webrtc, we need to construct RTP parameters manually
    // The actual parameters will be negotiated via SDP during peer connection
    final track = sender.track;
    if (track == null) {
      throw Exception('Sender track is null');
    }

    // Return minimal RTP parameters structure
    // The actual negotiation happens through the peer connection's SDP exchange
    return {
      'codecs': [],
      'headerExtensions': [],
      'encodings': [
        {
          'active': true,
          'ssrc': DateTime.now().millisecondsSinceEpoch, // Temporary SSRC
        }
      ],
      'rtcp': {
        'cname': 'flutter-${track.id}',
      },
    };
  }

  /// Reset stream service
  Future<void> reset() async {
    _logger.d('Resetting stream service');
    // Any cleanup needed
    _logger.i('Stream service reset completed');
  }
}
