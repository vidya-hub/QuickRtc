import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/types.dart';

/// Mixin providing socket event handling functionality
mixin QuickRTCSocketMixin {
  // Required implementations from the main class
  QuickRTCState get state;
  void updateState(QuickRTCState newState);
  io.Socket get socket;
  String? get participantId;
  int get maxParticipants;
  Map<String, ConsumerInfo> get consumers;
  Set<String> get consumedProducerIds;

  void log(String message, [dynamic data]);
  Future<List<RemoteStream>> consumeParticipantInternal(
    String participantId,
    String participantName,
    Map<String, dynamic> participantInfo,
  );
  Future<RemoteStream?> consumeSingleProducer({
    required String producerId,
    required String targetParticipantId,
    required String targetParticipantName,
    required String kind,
    String? streamType,
  });
  void cleanup();

  /// Setup socket event listeners
  void setupSocketListeners() {
    // Participant joined
    socket.on('participantJoined', (data) {
      log('Socket: participantJoined', data);

      final joinedData = ParticipantJoinedData.fromJson(
        data as Map<String, dynamic>,
      );

      // Check max participants
      if (maxParticipants > 0 && state.participants.length >= maxParticipants) {
        log('Max participants reached, ignoring new participant');
        return;
      }

      // Add participant to state with empty streams
      final remoteParticipant = RemoteParticipant(
        id: joinedData.participantId,
        name: joinedData.participantName,
        info: joinedData.participantInfo ?? {},
        streams: const [],
      );

      updateState(state.copyWith(
        participants: {
          ...state.participants,
          joinedData.participantId: remoteParticipant,
        },
      ),);
    });

    // Participant left
    socket.on('participantLeft', (data) async {
      log('Socket: participantLeft', data);

      final leftData = ParticipantLeftData.fromJson(
        data as Map<String, dynamic>,
      );

      // Close all consumers for this participant
      final consumersToRemove = consumers.entries
          .where((e) => e.value.participantId == leftData.participantId)
          .toList();

      for (final entry in consumersToRemove) {
        final info = entry.value;
        consumedProducerIds.remove(info.producerId);
        await info.consumer.close();
        consumers.remove(entry.key);
      }

      // Remove participant from state
      final updatedParticipants =
          Map<String, RemoteParticipant>.from(state.participants);
      updatedParticipants.remove(leftData.participantId);

      updateState(state.copyWith(
        participants: updatedParticipants,
      ),);
    });

    // New producer - auto-consume the specific producer
    socket.on('newProducer', (data) async {
      log('Socket: newProducer', data);

      final producerData = NewProducerData.fromJson(
        data as Map<String, dynamic>,
      );

      // Check if we already consumed this producer
      if (consumedProducerIds.contains(producerData.producerId)) {
        log('Already consumed producer ${producerData.producerId}, skipping');
        return;
      }

      // Check if this participant is already known
      var existingParticipant = state.participants[producerData.participantId];

      // Consume this specific producer directly (avoids race condition)
      final stream = await consumeSingleProducer(
        producerId: producerData.producerId,
        targetParticipantId: producerData.participantId,
        targetParticipantName: producerData.participantName,
        kind: producerData.kind,
        streamType: producerData.streamType?.value,
      );

      if (stream != null) {
        log('Auto-consumed stream from ${producerData.participantName}: ${producerData.kind}');

        // Update or create the participant with the new stream
        final updatedParticipant = existingParticipant != null
            ? existingParticipant.copyWith(
                streams: [...existingParticipant.streams, stream],
              )
            : RemoteParticipant(
                id: producerData.participantId,
                name: producerData.participantName,
                info: const {},
                streams: [stream],
              );

        updateState(state.copyWith(
          participants: {
            ...state.participants,
            producerData.participantId: updatedParticipant,
          },
        ),);
      } else {
        log('Failed to consume stream from ${producerData.participantName}: ${producerData.kind}');
      }
    });

    // Producer closed
    socket.on('producerClosed', (data) async {
      log('Socket: producerClosed', data);

      final closedData = ProducerClosedData.fromJson(
        data as Map<String, dynamic>,
      );

      // Remove from consumed tracking
      consumedProducerIds.remove(closedData.producerId);

      // Find and remove consumer by producer ID
      final consumerEntry =
          consumers.entries.cast<MapEntry<String, ConsumerInfo>?>().firstWhere(
                (e) => e!.value.producerId == closedData.producerId,
                orElse: () => null,
              );

      if (consumerEntry != null) {
        final info = consumerEntry.value;
        await info.consumer.close();
        consumers.remove(consumerEntry.key);

        // Update participant's streams in state
        final existingParticipant =
            state.participants[closedData.participantId];
        if (existingParticipant != null) {
          final updatedParticipant = existingParticipant.removeStream(info.id);

          updateState(state.copyWith(
            participants: {
              ...state.participants,
              closedData.participantId: updatedParticipant,
            },
          ),);
        }
      }
    });

    // Audio/video muted/unmuted events - update remote stream paused state
    socket.on('audioMuted', (data) {
      log('Socket: audioMuted', data);
      final d = data as Map<String, dynamic>;
      _updateRemoteStreamPausedState(
        d['participantId'] as String,
        StreamType.audio,
        true,
      );
    });

    socket.on('audioUnmuted', (data) {
      log('Socket: audioUnmuted', data);
      final d = data as Map<String, dynamic>;
      _updateRemoteStreamPausedState(
        d['participantId'] as String,
        StreamType.audio,
        false,
      );
    });

    socket.on('videoMuted', (data) {
      log('Socket: videoMuted', data);
      final d = data as Map<String, dynamic>;
      _updateRemoteStreamPausedState(
        d['participantId'] as String,
        StreamType.video,
        true,
      );
    });

    socket.on('videoUnmuted', (data) {
      log('Socket: videoUnmuted', data);
      final d = data as Map<String, dynamic>;
      _updateRemoteStreamPausedState(
        d['participantId'] as String,
        StreamType.video,
        false,
      );
    });

    // Socket disconnect
    socket.on('disconnect', (reason) {
      log('Socket: disconnected', reason);
      // Only cleanup if still connected - if disposed, state won't be connected anymore
      if (state.isConnected) {
        try {
          cleanup();
        } catch (e) {
          // Ignore errors if controller was disposed during cleanup
          log('Socket: cleanup error (likely disposed)', e);
        }
      }
    });

    // Socket error
    socket.on('error', (error) {
      log('Socket: error', error);
      updateState(state.copyWith(
        error: error.toString(),
      ),);
    });
  }

  /// Remove all socket listeners
  void removeSocketListeners() {
    socket.off('participantJoined');
    socket.off('participantLeft');
    socket.off('newProducer');
    socket.off('producerClosed');
    socket.off('audioMuted');
    socket.off('audioUnmuted');
    socket.off('videoMuted');
    socket.off('videoUnmuted');
    socket.off('disconnect');
    socket.off('error');
  }

  /// Update the paused state of a remote stream
  void _updateRemoteStreamPausedState(
    String participantId,
    StreamType type,
    bool paused,
  ) {
    final participant = state.participants[participantId];
    if (participant == null) {
      log('Cannot update stream pause state: participant $participantId not found');
      return;
    }

    final updatedStreams = participant.streams.map((s) {
      if (s.type == type) {
        return s.copyWith(paused: paused);
      }
      return s;
    }).toList();

    updateState(state.copyWith(
      participants: {
        ...state.participants,
        participantId: participant.copyWith(streams: updatedStreams),
      },
    ),);

    log('Updated $type stream paused=$paused for participant $participantId');
  }
}
