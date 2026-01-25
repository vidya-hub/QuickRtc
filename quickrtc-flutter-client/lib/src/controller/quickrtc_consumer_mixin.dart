import 'dart:async';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/mediasoup.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/types.dart';

/// Mixin providing consumer functionality (consuming remote media)
mixin QuickRTCConsumerMixin {
  // Required implementations from the main class
  QuickRTCState get state;
  void updateState(QuickRTCState newState);
  Device? get device;
  Transport? get recvTransport;
  String? get conferenceId;
  String? get participantId;
  Map<String, ConsumerInfo> get consumers;
  Set<String> get consumedProducerIds;
  Map<String, Completer<Consumer>> get pendingConsumers;

  void log(String message, [dynamic data]);
  Future<Map<String, dynamic>> emitWithAck(
      String event, Map<String, dynamic> data,);

  /// Auto-consume all existing participants in the conference
  Future<void> consumeExistingParticipants() async {
    log('consumeExistingParticipants: Starting...', {
      'conferenceId': conferenceId,
      'participantId': participantId,
      'recvTransportExists': recvTransport != null,
    });

    if (recvTransport == null) {
      log('consumeExistingParticipants: No receive transport, skipping');
      return;
    }

    try {
      final response = await emitWithAck('getParticipants', {
        'conferenceId': conferenceId,
      });

      log('consumeExistingParticipants: getParticipants response', response);

      if (response['status'] != 'ok') {
        log('Failed to get participants', response['error']);
        return;
      }

      final participantsList = response['data'] as List<dynamic>;
      log('consumeExistingParticipants: Found ${participantsList.length} participants');

      for (final p in participantsList) {
        final pData = p as Map<String, dynamic>;
        final pId = pData['participantId'] as String;
        final pName = pData['participantName'] as String;
        final pInfo = pData['participantInfo'] as Map<String, dynamic>? ?? {};

        // Skip self
        if (pId == participantId) continue;

        // Consume their streams (may be empty)
        final streams = await consumeParticipantInternal(pId, pName, pInfo);

        log('Existing participant: $pName with ${streams.length} streams');

        // Add participant to state
        final remoteParticipant = RemoteParticipant(
          id: pId,
          name: pName,
          info: pInfo,
          streams: streams,
        );

        updateState(state.copyWith(
          participants: {
            ...state.participants,
            pId: remoteParticipant,
          },
        ),);
      }
    } catch (error) {
      log('Error consuming existing participants', error);
    }
  }

  /// Internal: Consume all media from a participant
  Future<List<RemoteStream>> consumeParticipantInternal(
    String targetParticipantId,
    String targetParticipantName,
    Map<String, dynamic> targetParticipantInfo,
  ) async {
    log('consumeParticipantInternal: Starting', {
      'targetParticipantId': targetParticipantId,
      'targetParticipantName': targetParticipantName,
      'isConnected': state.isConnected,
      'recvTransportExists': recvTransport != null,
    });

    if (!state.isConnected || recvTransport == null) {
      log('consumeParticipantInternal: Not connected or no recvTransport, returning empty');
      return [];
    }

    try {
      log('consumeParticipantInternal: Calling consumeParticipantMedia');
      final response = await emitWithAck('consumeParticipantMedia', {
        'conferenceId': conferenceId,
        'participantId': participantId,
        'targetParticipantId': targetParticipantId,
        'rtpCapabilities': device!.rtpCapabilities.toMap(),
      });

      log('consumeParticipantInternal: Response received', response);

      if (response['status'] != 'ok') {
        log('consumeParticipantInternal: Failed', response['error']);
        return [];
      }

      final consumerParamsList = response['data'] as List<dynamic>;
      log('consumeParticipantInternal: Got ${consumerParamsList.length} consumer params');
      final streams = <RemoteStream>[];

      for (final params in consumerParamsList) {
        final consumerParams = ConsumerParamsData.fromJson(
          params as Map<String, dynamic>,
        );

        // Skip if we already have this producer consumed
        if (consumedProducerIds.contains(consumerParams.producerId)) {
          log(
            'Skipping already consumed producer: ${consumerParams.producerId}',
          );
          continue;
        }

        // Track this producer as consumed
        consumedProducerIds.add(consumerParams.producerId);

        // Create completer for this consumer
        final completer = Completer<Consumer>();
        pendingConsumers[consumerParams.id] = completer;

        // Start consume
        recvTransport!.consume(
          id: consumerParams.id,
          producerId: consumerParams.producerId,
          kind: RTCRtpMediaTypeExtension.fromString(consumerParams.kind),
          rtpParameters: RtpParameters.fromMap(consumerParams.rtpParameters),
          peerId: targetParticipantId,
        );

        // Wait for the consumer via callback
        final consumer = await completer.future;

        // Resume consumer on server
        await emitWithAck('unpauseConsumer', {
          'conferenceId': conferenceId,
          'participantId': participantId,
          'consumerId': consumerParams.id,
        });

        // Determine stream type
        final streamType = consumerParams.streamType ??
            (consumerParams.kind == 'audio'
                ? StreamType.audio
                : StreamType.video);

        final track = consumer.track;
        log('Consumer created - id: ${consumer.id}, producerId: ${consumerParams.producerId}, kind: ${consumerParams.kind}, streamType: ${streamType.value}');

        // IMPORTANT: Ensure track is enabled (Android/iOS may receive tracks in disabled state)
        if (!track.enabled) {
          track.enabled = true;
          log('Consumer track was disabled, enabled it');
        }

        // For video streams, create a dedicated MediaStream
        // This is required because the consumer's stream may not be properly associated
        // with the track on all platforms (especially Android)
        MediaStream streamToUse;
        if (consumerParams.kind == 'video') {
          // Create a new stream and add the track
          final dedicatedStream =
              await createLocalMediaStream('consumer_${consumer.id}');
          await dedicatedStream.addTrack(track);
          streamToUse = dedicatedStream;

          // On Android, give extra time for the stream to be ready
          if (!kIsWeb && Platform.isAndroid) {
            await Future.delayed(const Duration(milliseconds: 100));
          }

          log('Created dedicated video stream', {
            'streamId': streamToUse.id,
            'trackId': track.id,
            'trackEnabled': track.enabled,
          });
        } else {
          streamToUse = consumer.stream;
        }

        // Store consumer info
        final consumerInfo = ConsumerInfo(
          id: consumer.id,
          type: streamType,
          consumer: consumer,
          stream: streamToUse,
          producerId: consumerParams.producerId,
          participantId: targetParticipantId,
          participantName: targetParticipantName,
        );

        consumers[consumer.id] = consumerInfo;

        streams.add(RemoteStream(
          id: consumer.id,
          type: streamType,
          stream: streamToUse,
          producerId: consumerParams.producerId,
          participantId: targetParticipantId,
          participantName: targetParticipantName,
        ),);
      }

      return streams;
    } catch (error) {
      log('Error consuming participant', error);
      return [];
    }
  }

  /// Consume a single producer by ID
  /// This is used when a newProducer event is received to avoid race conditions
  Future<RemoteStream?> consumeSingleProducer({
    required String producerId,
    required String targetParticipantId,
    required String targetParticipantName,
    required String kind,
    String? streamType,
  }) async {
    log('consumeSingleProducer: Starting', {
      'producerId': producerId,
      'targetParticipantId': targetParticipantId,
      'kind': kind,
    });

    if (!state.isConnected || recvTransport == null) {
      log('consumeSingleProducer: Not connected or no recvTransport');
      return null;
    }

    // Check if already consumed
    if (consumedProducerIds.contains(producerId)) {
      log('consumeSingleProducer: Already consumed producer $producerId');
      return null;
    }

    try {
      // Call the server's consume endpoint with the specific producer ID
      final response = await emitWithAck('consume', {
        'conferenceId': conferenceId,
        'participantId': participantId,
        'consumeOptions': {
          'producerId': producerId,
          'rtpCapabilities': device!.rtpCapabilities.toMap(),
        },
      });

      log('consumeSingleProducer: Response received', response);

      if (response['status'] != 'ok' || response['data'] == null) {
        log('consumeSingleProducer: Failed', response['error']);
        return null;
      }

      final consumerParams = ConsumerParamsData.fromJson(
        response['data'] as Map<String, dynamic>,
      );

      // Track this producer as consumed
      consumedProducerIds.add(producerId);

      // Create completer for this consumer
      final completer = Completer<Consumer>();
      pendingConsumers[consumerParams.id] = completer;

      // Start consume
      recvTransport!.consume(
        id: consumerParams.id,
        producerId: consumerParams.producerId,
        kind: RTCRtpMediaTypeExtension.fromString(consumerParams.kind),
        rtpParameters: RtpParameters.fromMap(consumerParams.rtpParameters),
        peerId: targetParticipantId,
      );

      // Wait for the consumer via callback
      final consumer = await completer.future;

      // Resume consumer on server
      await emitWithAck('unpauseConsumer', {
        'conferenceId': conferenceId,
        'participantId': participantId,
        'consumerId': consumerParams.id,
      });

      // Determine stream type
      final resolvedStreamType = streamType != null
          ? StreamType.values.firstWhere(
              (t) => t.value == streamType,
              orElse: () =>
                  kind == 'audio' ? StreamType.audio : StreamType.video,
            )
          : (kind == 'audio' ? StreamType.audio : StreamType.video);

      final track = consumer.track;
      log('consumeSingleProducer: Consumer created - id: ${consumer.id}, producerId: $producerId, kind: $kind, streamType: ${resolvedStreamType.value}');

      // IMPORTANT: Ensure track is enabled (Android/iOS may receive tracks in disabled state)
      if (!track.enabled) {
        track.enabled = true;
        log('consumeSingleProducer: Track was disabled, enabled it');
      }

      // For video streams, create a dedicated MediaStream
      // This is required because the consumer's stream may not be properly associated
      // with the track on all platforms (especially Android)
      MediaStream streamToUse;
      if (kind == 'video') {
        // Create a new stream and add the track
        final dedicatedStream =
            await createLocalMediaStream('consumer_${consumer.id}');
        await dedicatedStream.addTrack(track);
        streamToUse = dedicatedStream;

        // On Android, give extra time for the stream to be ready
        if (!kIsWeb && Platform.isAndroid) {
          await Future.delayed(const Duration(milliseconds: 100));
        }

        log('consumeSingleProducer: Created dedicated video stream', {
          'streamId': streamToUse.id,
          'trackId': track.id,
          'trackEnabled': track.enabled,
        });
      } else {
        streamToUse = consumer.stream;
      }

      // Store consumer info
      final consumerInfo = ConsumerInfo(
        id: consumer.id,
        type: resolvedStreamType,
        consumer: consumer,
        stream: streamToUse,
        producerId: producerId,
        participantId: targetParticipantId,
        participantName: targetParticipantName,
      );

      consumers[consumer.id] = consumerInfo;

      return RemoteStream(
        id: consumer.id,
        type: resolvedStreamType,
        stream: streamToUse,
        producerId: producerId,
        participantId: targetParticipantId,
        participantName: targetParticipantName,
      );
    } catch (error) {
      log('consumeSingleProducer: Error', error);
      consumedProducerIds.remove(producerId); // Rollback
      return null;
    }
  }

  /// Close a specific consumer
  Future<void> closeConsumer(String consumerId) async {
    final consumerInfo = consumers.remove(consumerId);
    if (consumerInfo != null) {
      consumedProducerIds.remove(consumerInfo.producerId);
      try {
        await consumerInfo.consumer.close();
      } catch (_) {
        // Ignore errors - peer connection may already be closed
      }
    }
  }

  /// Close all consumers for a participant
  Future<void> closeConsumersForParticipant(String targetParticipantId) async {
    final consumersToRemove = consumers.entries
        .where((e) => e.value.participantId == targetParticipantId)
        .toList();

    for (final entry in consumersToRemove) {
      final info = entry.value;
      consumedProducerIds.remove(info.producerId);
      try {
        await info.consumer.close();
      } catch (_) {
        // Ignore errors - peer connection may already be closed
      }
      consumers.remove(entry.key);
    }
  }

  /// Close all consumers (defensive - ignores errors during cleanup)
  Future<void> closeAllConsumers() async {
    for (final consumer in consumers.values) {
      try {
        await consumer.consumer.close();
      } catch (_) {
        // Ignore errors during cleanup - peer connection may already be closed
      }
    }
    consumers.clear();
    consumedProducerIds.clear();
  }
}
