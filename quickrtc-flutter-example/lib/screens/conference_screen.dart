import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:flutter_webrtc/flutter_webrtc.dart';

class ConferenceScreen extends StatefulWidget {
  const ConferenceScreen({Key? key}) : super(key: key);

  @override
  State<ConferenceScreen> createState() => _ConferenceScreenState();
}

class _ConferenceScreenState extends State<ConferenceScreen> {
  MediaStream? _localStream;
  bool _isJoining = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _joinConference();
    });
  }

  Future<void> _joinConference() async {
    setState(() => _isJoining = true);

    try {
      final args =
          ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
      final conferenceId = args['conferenceId'] as String;
      final participantName = args['participantName'] as String;
      final serverUrl = args['serverUrl'] as String;

      debugPrint('🔵 Joining conference: $conferenceId as $participantName');
      debugPrint('🔵 Server URL: $serverUrl');

      final provider = Provider.of<ConferenceProvider>(context, listen: false);

      // Create socket connection
      debugPrint('🔵 Creating socket connection to $serverUrl...');
      final socket = io.io(
          serverUrl,
          io.OptionBuilder()
              .setTransports(['websocket'])
              .disableAutoConnect()
              .setTimeout(10000)
              .disableReconnection() // Disable auto-reconnect for cleaner error handling
              .setExtraHeaders(
                  {'foo': 'bar'}) // Placeholder for any custom headers
              .build());

      // Setup error handlers
      socket.onConnectError((data) {
        debugPrint('🔴 Socket connect error: $data');
      });

      socket.onError((data) {
        debugPrint('🔴 Socket error: $data');
      });

      // Wait for socket to connect with timeout
      debugPrint('🔵 Connecting to socket...');
      final completer = Completer<void>();

      socket.onConnect((_) {
        debugPrint('🔵 Socket connected successfully!');
        if (!completer.isCompleted) completer.complete();
      });

      socket.connect();

      // Wait for connection with 15 second timeout
      await completer.future.timeout(
        const Duration(seconds: 15),
        onTimeout: () {
          throw Exception(
              'Connection timeout - could not connect to server at $serverUrl. Make sure the server is running and accessible. If using HTTPS, the certificate must be trusted or you need to disable SSL verification.');
        },
      );

      // Join conference
      final participantId = DateTime.now().millisecondsSinceEpoch.toString();
      debugPrint('🔵 Joining conference with ID: $participantId');
      await provider.joinConference(
        ConferenceConfig(
          conferenceId: conferenceId,
          participantId: participantId,
          participantName: participantName,
          socket: socket,
        ),
      );
      debugPrint('🔵 Conference joined successfully');

      // Get local media
      debugPrint('🔵 Requesting camera and microphone access...');
      final mediaConstraints = {
        'audio': true,
        'video': {'facingMode': 'user', 'width': 1280, 'height': 720},
      };
      _localStream = await Helper.openCamera(mediaConstraints);
      debugPrint('🔵 Got local media stream');

      // Produce media
      debugPrint('🔵 Producing media...');
      await provider.produceMedia(
        audioTrack: _localStream!.getAudioTracks().first,
        videoTrack: _localStream!.getVideoTracks().first,
      );
      debugPrint('🔵 Media produced');

      // Consume existing participants
      debugPrint('🔵 Consuming existing streams...');
      await provider.consumeExistingStreams();
      debugPrint('🔵 Setup complete!');
    } catch (e, stackTrace) {
      debugPrint('🔴 Error in _joinConference: $e');
      debugPrint('🔴 Stack trace: $stackTrace');
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 5),
        ));
      }
    } finally {
      setState(() => _isJoining = false);
    }
  }

  Future<void> _leaveConference() async {
    final provider = Provider.of<ConferenceProvider>(context, listen: false);
    await provider.leaveConference();
    _localStream?.dispose();
    if (mounted) {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Conference'),
        actions: [
          IconButton(
            icon: const Icon(Icons.call_end),
            onPressed: _leaveConference,
            color: Colors.red,
          ),
        ],
      ),
      body: Consumer<ConferenceProvider>(
        builder: (context, provider, child) {
          debugPrint(
              '🔵 Building conference UI - isJoining: $_isJoining, error: ${provider.error}, isJoined: ${provider.isJoined}');

          if (_isJoining) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Joining conference...', style: TextStyle(fontSize: 18)),
                  SizedBox(height: 8),
                  Text('This may take a few seconds',
                      style: TextStyle(color: Colors.grey)),
                ],
              ),
            );
          }

          if (provider.error != null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error, size: 64, color: Colors.red),
                    const SizedBox(height: 16),
                    const Text('Connection Error',
                        style: TextStyle(
                            fontSize: 20, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Text(
                      '${provider.error}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.red),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () {
                        provider.clearError();
                        Navigator.pop(context);
                      },
                      child: const Text('Go Back'),
                    ),
                  ],
                ),
              ),
            );
          }

          if (!provider.isJoined) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.info, size: 64, color: Colors.blue),
                  SizedBox(height: 16),
                  Text('Not connected to conference',
                      style: TextStyle(fontSize: 18)),
                ],
              ),
            );
          }

          return Column(
            children: [
              // Local video preview
              if (_localStream != null)
                Container(
                  height: 200,
                  color: Colors.black,
                  child: RTCVideoRendererWidget(
                    stream: _localStream,
                    mirror: true,
                  ),
                ),

              // Controls
              Container(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    IconButton(
                      iconSize: 48,
                      icon: Icon(
                        provider.hasLocalAudio ? Icons.mic : Icons.mic_off,
                        color:
                            provider.hasLocalAudio ? Colors.blue : Colors.red,
                      ),
                      onPressed: () => provider.toggleAudio(),
                    ),
                    IconButton(
                      iconSize: 48,
                      icon: Icon(
                        provider.hasLocalVideo
                            ? Icons.videocam
                            : Icons.videocam_off,
                        color:
                            provider.hasLocalVideo ? Colors.blue : Colors.red,
                      ),
                      onPressed: () => provider.toggleVideo(),
                    ),
                  ],
                ),
              ),

              // Participant count
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: Text(
                  'Participants: ${provider.remoteParticipants.length}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),

              // Remote participants grid
              Expanded(
                child: provider.remoteParticipants.isEmpty
                    ? const Center(child: Text('No other participants yet'))
                    : GridView.builder(
                        padding: const EdgeInsets.all(8),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 1.0,
                          crossAxisSpacing: 8,
                          mainAxisSpacing: 8,
                        ),
                        itemCount: provider.remoteParticipants.length,
                        itemBuilder: (context, index) {
                          final participant =
                              provider.remoteParticipants[index];
                          return Card(
                            elevation: 4,
                            child: Stack(
                              children: [
                                // Video
                                if (participant.videoStream != null)
                                  RTCVideoRendererWidget(
                                    stream: participant.videoStream,
                                  )
                                else
                                  Container(
                                    color: Colors.grey[800],
                                    child: const Center(
                                      child: Icon(
                                        Icons.person,
                                        size: 64,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),

                                // Participant name overlay
                                Positioned(
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  child: Container(
                                    color: Colors.black54,
                                    padding: const EdgeInsets.all(8),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            participant.participantName,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.bold,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        Icon(
                                          participant.isAudioEnabled
                                              ? Icons.mic
                                              : Icons.mic_off,
                                          color: Colors.white,
                                          size: 16,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  void dispose() {
    _localStream?.dispose();
    super.dispose();
  }
}
