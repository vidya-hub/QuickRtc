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
        streams: [],
      );

      updateState(state.copyWith(
        participants: {
          ...state.participants,
          joinedData.participantId: remoteParticipant,
        },
      ));
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
      ));
    });

    // New producer - auto-consume and update state
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

      // Auto-consume this participant's streams
      final streams = await consumeParticipantInternal(
        producerData.participantId,
        producerData.participantName,
        existingParticipant?.info ?? {},
      );

      if (streams.isNotEmpty) {
        log(
          'Auto-consumed ${streams.length} streams from ${producerData.participantName}',
        );

        // Update or create the participant with the new streams
        final updatedParticipant = existingParticipant != null
            ? existingParticipant.copyWith(
                streams: [...existingParticipant.streams, ...streams],
              )
            : RemoteParticipant(
                id: producerData.participantId,
                name: producerData.participantName,
                info: {},
                streams: streams,
              );

        updateState(state.copyWith(
          participants: {
            ...state.participants,
            producerData.participantId: updatedParticipant,
          },
        ));
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
          ));
        }
      }
    });

    // Audio/video muted/unmuted events (logged for now)
    socket.on('audioMuted', (data) => log('Socket: audioMuted', data));
    socket.on('audioUnmuted', (data) => log('Socket: audioUnmuted', data));
    socket.on('videoMuted', (data) => log('Socket: videoMuted', data));
    socket.on('videoUnmuted', (data) => log('Socket: videoUnmuted', data));

    // Socket disconnect
    socket.on('disconnect', (reason) {
      log('Socket: disconnected', reason);
      if (state.isConnected) {
        cleanup();
      }
    });

    // Socket error
    socket.on('error', (error) {
      log('Socket: error', error);
      updateState(state.copyWith(
        error: error.toString(),
      ));
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
}
