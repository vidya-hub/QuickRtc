import 'dart:async';
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
      String event, Map<String, dynamic> data);

  /// Auto-consume all existing participants in the conference
  Future<void> consumeExistingParticipants() async {
    log('Fetching and consuming existing participants...');

    try {
      final response = await emitWithAck('getParticipants', {
        'conferenceId': conferenceId,
      });

      if (response['status'] != 'ok') {
        log('Failed to get participants', response['error']);
        return;
      }

      final participantsList = response['data'] as List<dynamic>;

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
        ));
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
    if (!state.isConnected || recvTransport == null) {
      return [];
    }

    log('Consuming participant', targetParticipantId);

    try {
      final response = await emitWithAck('consumeParticipantMedia', {
        'conferenceId': conferenceId,
        'participantId': participantId,
        'targetParticipantId': targetParticipantId,
        'rtpCapabilities': device!.rtpCapabilities.toMap(),
      });

      if (response['status'] != 'ok') {
        log('Failed to consume participant', response['error']);
        return [];
      }

      final consumerParamsList = response['data'] as List<dynamic>;
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

        // For video streams, create a dedicated MediaStream
        MediaStream streamToUse;
        if (consumerParams.kind == 'video') {
          final dedicatedStream =
              await createLocalMediaStream('consumer_${consumer.id}');
          dedicatedStream.addTrack(track);
          streamToUse = dedicatedStream;
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
        ));
      }

      return streams;
    } catch (error) {
      log('Error consuming participant', error);
      return [];
    }
  }

  /// Close a specific consumer
  Future<void> closeConsumer(String consumerId) async {
    final consumerInfo = consumers.remove(consumerId);
    if (consumerInfo != null) {
      consumedProducerIds.remove(consumerInfo.producerId);
      await consumerInfo.consumer.close();
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
      await info.consumer.close();
      consumers.remove(entry.key);
    }
  }

  /// Close all consumers
  Future<void> closeAllConsumers() async {
    for (final consumer in consumers.values) {
      await consumer.consumer.close();
    }
    consumers.clear();
    consumedProducerIds.clear();
  }
}
