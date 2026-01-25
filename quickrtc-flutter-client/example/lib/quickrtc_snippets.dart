/// QuickRTC Flutter Client - Code Snippets
///
/// This file contains focused code snippets demonstrating key QuickRTC concepts.
/// Each snippet is a standalone example showing a specific feature.
///
/// Snippets included:
/// 1. Socket Connection Setup
/// 2. Controller Initialization
/// 3. Joining a Meeting
/// 4. Getting Local Media (Camera/Mic)
/// 5. Producing Media (Publishing to Meeting)
/// 6. Toggling Audio/Video
/// 7. Screen Sharing
/// 8. Rendering Video
/// 9. Handling Remote Participants
/// 10. Leaving a Meeting
library;

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

// =============================================================================
// 1. SOCKET CONNECTION SETUP
// =============================================================================

/// Creates and connects a Socket.IO client to the signaling server.
io.Socket createSocket(String serverUrl) {
  return io.io(
    serverUrl,
    io.OptionBuilder()
        .setTransports(['websocket'])
        .disableAutoConnect()
        .disableReconnection()
        .build(),
  );
}

/// Connects socket with timeout, returns true on success.
Future<bool> connectSocket(io.Socket socket, {int timeoutSeconds = 10}) async {
  final completer = Completer<bool>();

  socket.onConnect((_) {
    if (!completer.isCompleted) completer.complete(true);
  });

  socket.onConnectError((_) {
    if (!completer.isCompleted) completer.complete(false);
  });

  socket.connect();

  return completer.future.timeout(
    Duration(seconds: timeoutSeconds),
    onTimeout: () => false,
  );
}

// =============================================================================
// 2. CONTROLLER INITIALIZATION
// =============================================================================

/// Creates the QuickRTC controller with the connected socket.
QuickRTCController createController(io.Socket socket) {
  return QuickRTCController(
    socket: socket,
    debug: true, // Set to false in production
  );
}

// =============================================================================
// 3. JOINING A MEETING
// =============================================================================

/// Joins a meeting with the given conference ID and participant name.
Future<void> joinMeeting(
  QuickRTCController controller, {
  required String conferenceId,
  required String participantName,
}) async {
  await controller.joinMeeting(
    conferenceId: conferenceId,
    participantName: participantName,
  );
}

// =============================================================================
// 4. GETTING LOCAL MEDIA (Camera/Microphone)
// =============================================================================

/// Gets audio only (microphone).
Future<LocalMedia> getAudioOnly() async {
  return QuickRTCStatic.getLocalMedia(MediaConfig.audioOnly());
}

/// Gets video only (camera).
Future<LocalMedia> getVideoOnly() async {
  return QuickRTCStatic.getLocalMedia(
    MediaConfig.videoOnly(config: VideoConfig.frontCamera),
  );
}

/// Gets both audio and video.
Future<LocalMedia> getAudioAndVideo() async {
  return QuickRTCStatic.getLocalMedia(MediaConfig.audioVideo());
}

// =============================================================================
// 5. PRODUCING MEDIA (Publishing to Meeting)
// =============================================================================

/// Produces (publishes) local media tracks to the meeting.
Future<void> produceMedia(
  QuickRTCController controller,
  LocalMedia media,
) async {
  await controller.produce(
    ProduceInput.fromTracksWithTypes(media.tracksWithTypes),
  );
}

/// Example: Start camera and publish.
Future<void> startCameraAndPublish(QuickRTCController controller) async {
  final media = await QuickRTCStatic.getLocalMedia(
    MediaConfig.videoOnly(config: VideoConfig.frontCamera),
  );
  await controller.produce(
    ProduceInput.fromTracksWithTypes(media.tracksWithTypes),
  );
}

// =============================================================================
// 6. TOGGLING AUDIO/VIDEO
// =============================================================================

/// Toggles microphone mute/unmute.
Future<void> toggleMicrophone(QuickRTCController controller) async {
  await controller.toggleMicrophoneMute();
}

/// Toggles camera pause/resume.
Future<void> toggleCamera(QuickRTCController controller) async {
  await controller.toggleCameraPause();
}

// =============================================================================
// 7. SCREEN SHARING
// =============================================================================

/// Starts screen sharing (mobile).
Future<void> startScreenShareMobile(QuickRTCController controller) async {
  final media = await QuickRTCStatic.getLocalMedia(
    MediaConfig.screenShareOnly(),
  );
  if (media.screenshareTrack != null) {
    await controller.produce(
      ProduceInput.fromTrack(
        media.screenshareTrack!,
        type: StreamType.screenshare,
      ),
    );
  }
}

/// Starts screen sharing (desktop with picker).
Future<void> startScreenShareDesktop(
  QuickRTCController controller,
  BuildContext context,
) async {
  final media = await QuickRTCStatic.getScreenShareWithPicker(context);
  if (media.screenshareTrack != null) {
    await controller.produce(
      ProduceInput.fromTrack(
        media.screenshareTrack!,
        type: StreamType.screenshare,
      ),
    );
  }
}

/// Stops screen sharing.
Future<void> stopScreenShare(QuickRTCController controller) async {
  final state = controller.state;
  await state.localScreenshareStream?.stop();
}

// =============================================================================
// 8. RENDERING VIDEO
// =============================================================================

/// Renders local video stream.
Widget renderLocalVideo(MediaStream? stream, String userName) {
  return QuickRTCMediaRenderer(
    stream: stream,
    mirror: true,
    isLocal: true,
    participantName: userName,
    showName: true,
    showLocalLabel: true,
  );
}

/// Renders remote participant video.
Widget renderRemoteVideo(RemoteParticipant participant) {
  return QuickRTCMediaRenderer(
    remoteStream: participant.videoStream,
    participantName: participant.name,
    isAudioEnabled: participant.hasAudio && !participant.isAudioMuted,
    isVideoEnabled: participant.hasVideo && !participant.isVideoMuted,
    showAudioIndicator: true,
    showName: true,
  );
}

/// Plays audio for all remote participants (invisible widget).
Widget renderRemoteAudio(List<RemoteParticipant> participants) {
  return QuickRTCAudioRenderers(participants: participants);
}

// =============================================================================
// 9. HANDLING REMOTE PARTICIPANTS
// =============================================================================

/// Gets list of remote participants from state.
List<RemoteParticipant> getParticipants(QuickRTCController controller) {
  return controller.state.participantList;
}

/// Example: Building a participant grid.
Widget buildParticipantGrid(QuickRTCState state) {
  return GridView.builder(
    padding: const EdgeInsets.all(8),
    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: 2,
      childAspectRatio: 16 / 9,
      crossAxisSpacing: 8,
      mainAxisSpacing: 8,
    ),
    itemCount: state.participantList.length,
    itemBuilder: (_, index) {
      final participant = state.participantList[index];
      return QuickRTCMediaRenderer(
        remoteStream: participant.videoStream,
        participantName: participant.name,
        isAudioEnabled: participant.hasAudio && !participant.isAudioMuted,
        isVideoEnabled: participant.hasVideo && !participant.isVideoMuted,
      );
    },
  );
}

// =============================================================================
// 10. LEAVING A MEETING
// =============================================================================

/// Leaves the current meeting and cleans up resources.
Future<void> leaveMeeting(
  QuickRTCController controller,
  io.Socket socket,
  MediaStream? localStream,
) async {
  await controller.leaveMeeting();
  localStream?.dispose();
  controller.dispose();
  socket.disconnect();
}

// =============================================================================
// COMPLETE EXAMPLE: Full meeting flow
// =============================================================================

/// Complete example demonstrating the full meeting flow.
class MeetingFlowExample {
  io.Socket? socket;
  QuickRTCController? controller;
  MediaStream? localStream;

  /// Join a meeting with camera and microphone.
  Future<void> join({
    required String serverUrl,
    required String conferenceId,
    required String userName,
  }) async {
    // 1. Create and connect socket
    socket = createSocket(serverUrl);
    final connected = await connectSocket(socket!);
    if (!connected) throw Exception('Connection failed');

    // 2. Create controller
    controller = createController(socket!);

    // 3. Join meeting
    await joinMeeting(
      controller!,
      conferenceId: conferenceId,
      participantName: userName,
    );

    // 4. Start camera and mic
    final media = await getAudioAndVideo();
    localStream = media.stream;
    await produceMedia(controller!, media);
  }

  /// Leave the meeting.
  Future<void> leave() async {
    if (controller != null && socket != null) {
      await leaveMeeting(controller!, socket!, localStream);
    }
    socket = null;
    controller = null;
    localStream = null;
  }
}
