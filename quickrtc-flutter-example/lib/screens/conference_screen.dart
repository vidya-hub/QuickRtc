import 'dart:async';
import 'package:flutter/material.dart';
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

class ConferenceScreen extends StatefulWidget {
  const ConferenceScreen({super.key});

  @override
  State<ConferenceScreen> createState() => _ConferenceScreenState();
}

class _ConferenceScreenState extends State<ConferenceScreen> {
  // QuickRTC instance
  QuickRTC? _rtc;
  io.Socket? _socket;

  // Local media
  MediaStream? _localStream;
  final RTCVideoRenderer _localRenderer = RTCVideoRenderer();

  // State
  bool _isJoining = false;
  bool _isConnected = false;
  String? _error;
  bool _audioEnabled = true;
  bool _videoEnabled = true;

  // Local streams from QuickRTC
  final Map<String, LocalStream> _localStreams = {};

  // Remote participants and their streams
  final Map<String, _RemoteParticipant> _remoteParticipants = {};

  @override
  void initState() {
    super.initState();
    _initRenderers();
  }

  Future<void> _initRenderers() async {
    await _localRenderer.initialize();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _joinConference();
    });
  }

  Future<void> _joinConference() async {
    if (_isJoining) return;
    setState(() {
      _isJoining = true;
      _error = null;
    });

    try {
      final args =
          ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
      final conferenceId = args['conferenceId'] as String;
      final participantName = args['participantName'] as String;
      final serverUrl = args['serverUrl'] as String;

      debugPrint('Joining conference: $conferenceId as $participantName');
      debugPrint('Server URL: $serverUrl');

      // Create socket connection
      debugPrint('Creating socket connection...');
      _socket = io.io(
        serverUrl,
        io.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .setTimeout(10000)
            .disableReconnection()
            .build(),
      );

      // Wait for socket connection
      final socketCompleter = Completer<void>();

      _socket!.onConnect((_) {
        debugPrint('Socket connected!');
        if (!socketCompleter.isCompleted) socketCompleter.complete();
      });

      _socket!.onConnectError((data) {
        debugPrint('Socket connect error: $data');
        if (!socketCompleter.isCompleted) {
          socketCompleter.completeError('Connection failed: $data');
        }
      });

      _socket!.onError((data) {
        debugPrint('Socket error: $data');
      });

      _socket!.connect();

      await socketCompleter.future.timeout(
        const Duration(seconds: 15),
        onTimeout: () {
          throw Exception('Connection timeout - server at $serverUrl');
        },
      );

      // Create QuickRTC instance
      _rtc = QuickRTC(QuickRTCConfig(
        socket: _socket!,
        debug: true,
      ));

      // Setup event listeners
      _setupEventListeners();

      // Join conference
      debugPrint('Joining conference...');
      await _rtc!.join(JoinConfig(
        conferenceId: conferenceId,
        participantName: participantName,
      ));

      setState(() => _isConnected = true);
      debugPrint('Conference joined successfully');

      // Get local media
      debugPrint('Requesting camera and microphone...');
      final mediaConstraints = {
        'audio': true,
        'video': {'facingMode': 'user', 'width': 1280, 'height': 720},
      };
      _localStream = await Helper.openCamera(mediaConstraints);
      _localRenderer.srcObject = _localStream;
      debugPrint('Got local media stream');

      // Produce media
      debugPrint('Producing media...');
      final tracks = _localStream!.getTracks();
      final localStreams = await _rtc!.produce(ProduceInput.fromTracks(tracks));

      for (final stream in localStreams) {
        _localStreams[stream.id] = stream;
      }
      debugPrint('Media produced: ${localStreams.length} streams');

      setState(() {});
    } catch (e, stackTrace) {
      debugPrint('Error joining conference: $e');
      debugPrint('Stack trace: $stackTrace');
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isJoining = false);
    }
  }

  void _setupEventListeners() {
    // New participant joined
    _rtc!.on<NewParticipantEvent>('newParticipant', (event) {
      debugPrint(
          'New participant: ${event.participantName} with ${event.streams.length} streams');

      setState(() {
        final participant = _remoteParticipants.putIfAbsent(
          event.participantId,
          () => _RemoteParticipant(
            id: event.participantId,
            name: event.participantName,
          ),
        );

        // Add streams
        for (final stream in event.streams) {
          participant.addStream(stream);
        }
      });
    });

    // Participant left
    _rtc!.on<ParticipantLeftEvent>('participantLeft', (event) {
      debugPrint('Participant left: ${event.participantId}');

      setState(() {
        final participant = _remoteParticipants.remove(event.participantId);
        participant?.dispose();
      });
    });

    // Stream added to existing participant
    _rtc!.on<StreamAddedEvent>('streamAdded', (event) {
      debugPrint(
          'Stream added: ${event.id} from ${event.participantId} (${event.type})');

      setState(() {
        final participant = _remoteParticipants[event.participantId];
        participant?.addStream(event);
      });
    });

    // Stream removed
    _rtc!.on<StreamRemovedEvent>('streamRemoved', (event) {
      debugPrint(
          'Stream removed: ${event.streamId} from ${event.participantId}');

      setState(() {
        final participant = _remoteParticipants[event.participantId];
        participant?.removeStream(event.streamId);
      });
    });

    // Disconnected
    _rtc!.on<DisconnectedEvent>('disconnected', (event) {
      debugPrint('Disconnected: ${event.reason}');

      setState(() {
        _isConnected = false;
        _error = 'Disconnected: ${event.reason}';
      });
    });

    // Error
    _rtc!.on<ErrorEvent>('error', (event) {
      debugPrint('QuickRTC Error: ${event.message}');

      setState(() {
        _error = event.message;
      });
    });
  }

  Future<void> _toggleAudio() async {
    if (_localStream == null) return;

    final audioTracks = _localStream!.getAudioTracks();
    if (audioTracks.isEmpty) return;

    setState(() => _audioEnabled = !_audioEnabled);

    for (final track in audioTracks) {
      track.enabled = _audioEnabled;
    }

    // Also pause/resume on server
    final audioStream = _localStreams.values
        .where((s) => s.type == StreamType.audio)
        .firstOrNull;

    if (audioStream != null) {
      if (_audioEnabled) {
        await audioStream.resume();
      } else {
        await audioStream.pause();
      }
    }
  }

  Future<void> _toggleVideo() async {
    if (_localStream == null) return;

    final videoTracks = _localStream!.getVideoTracks();
    if (videoTracks.isEmpty) return;

    setState(() => _videoEnabled = !_videoEnabled);

    for (final track in videoTracks) {
      track.enabled = _videoEnabled;
    }

    // Also pause/resume on server
    final videoStream = _localStreams.values
        .where((s) => s.type == StreamType.video)
        .firstOrNull;

    if (videoStream != null) {
      if (_videoEnabled) {
        await videoStream.resume();
      } else {
        await videoStream.pause();
      }
    }
  }

  Future<void> _leaveConference() async {
    try {
      await _rtc?.leave();
    } catch (e) {
      debugPrint('Error leaving: $e');
    }

    _localStream?.dispose();
    _socket?.disconnect();

    for (final participant in _remoteParticipants.values) {
      participant.dispose();
    }

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
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
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

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              const Text('Connection Error',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.red),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Go Back'),
              ),
            ],
          ),
        ),
      );
    }

    if (!_isConnected) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.info, size: 64, color: Colors.blue),
            SizedBox(height: 16),
            Text('Not connected to conference', style: TextStyle(fontSize: 18)),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Local video preview
        Container(
          height: 200,
          color: Colors.black,
          child: RTCVideoView(
            _localRenderer,
            mirror: true,
            objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
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
                  _audioEnabled ? Icons.mic : Icons.mic_off,
                  color: _audioEnabled ? Colors.blue : Colors.red,
                ),
                onPressed: _toggleAudio,
              ),
              IconButton(
                iconSize: 48,
                icon: Icon(
                  _videoEnabled ? Icons.videocam : Icons.videocam_off,
                  color: _videoEnabled ? Colors.blue : Colors.red,
                ),
                onPressed: _toggleVideo,
              ),
            ],
          ),
        ),

        // Participant count
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: Text(
            'Participants: ${_remoteParticipants.length}',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),

        // Remote participants grid
        Expanded(
          child: _remoteParticipants.isEmpty
              ? const Center(child: Text('No other participants yet'))
              : GridView.builder(
                  padding: const EdgeInsets.all(8),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 1.0,
                    crossAxisSpacing: 8,
                    mainAxisSpacing: 8,
                  ),
                  itemCount: _remoteParticipants.length,
                  itemBuilder: (context, index) {
                    final participant =
                        _remoteParticipants.values.elementAt(index);
                    return _RemoteParticipantTile(participant: participant);
                  },
                ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _localRenderer.dispose();
    _localStream?.dispose();
    _socket?.disconnect();

    for (final participant in _remoteParticipants.values) {
      participant.dispose();
    }

    super.dispose();
  }
}

/// Helper class to manage remote participant state
class _RemoteParticipant {
  final String id;
  final String name;
  final Map<String, RemoteStream> streams = {};
  final Map<String, RTCVideoRenderer> renderers = {};

  MediaStream? get videoStream {
    final videoStreamEntry = streams.entries
        .where((e) =>
            e.value.type == StreamType.video ||
            e.value.type == StreamType.screenshare)
        .firstOrNull;
    return videoStreamEntry?.value.stream;
  }

  bool get hasAudio => streams.values.any((s) => s.type == StreamType.audio);

  _RemoteParticipant({
    required this.id,
    required this.name,
  });

  Future<void> addStream(RemoteStream stream) async {
    streams[stream.id] = stream;

    if (stream.type == StreamType.video ||
        stream.type == StreamType.screenshare) {
      final renderer = RTCVideoRenderer();
      await renderer.initialize();
      renderer.srcObject = stream.stream;
      renderers[stream.id] = renderer;
    }
  }

  void removeStream(String streamId) {
    streams.remove(streamId);
    final renderer = renderers.remove(streamId);
    renderer?.dispose();
  }

  void dispose() {
    for (final renderer in renderers.values) {
      renderer.dispose();
    }
    renderers.clear();
    streams.clear();
  }
}

/// Widget to display a remote participant
class _RemoteParticipantTile extends StatelessWidget {
  final _RemoteParticipant participant;

  const _RemoteParticipantTile({required this.participant});

  @override
  Widget build(BuildContext context) {
    final videoRenderer = participant.renderers.values.firstOrNull;

    return Card(
      elevation: 4,
      child: Stack(
        children: [
          // Video
          if (videoRenderer != null)
            RTCVideoView(
              videoRenderer,
              objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
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
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      participant.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Icon(
                    participant.hasAudio ? Icons.mic : Icons.mic_off,
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
  }
}
