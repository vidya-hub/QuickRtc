import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

/// Widget for rendering RTC video streams
class RTCVideoRendererWidget extends StatefulWidget {
  final MediaStream? stream;
  final bool mirror;
  final RTCVideoViewObjectFit objectFit;

  const RTCVideoRendererWidget({
    super.key,
    required this.stream,
    this.mirror = false,
    this.objectFit = RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
  });

  @override
  State<RTCVideoRendererWidget> createState() => _RTCVideoRendererWidgetState();
}

class _RTCVideoRendererWidgetState extends State<RTCVideoRendererWidget> {
  final RTCVideoRenderer _renderer = RTCVideoRenderer();
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _initRenderer();
  }

  @override
  void didUpdateWidget(RTCVideoRendererWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.stream != widget.stream) {
      _updateStream();
    }
  }

  Future<void> _initRenderer() async {
    await _renderer.initialize();
    setState(() {
      _initialized = true;
    });
    _updateStream();
  }

  void _updateStream() {
    if (_initialized && widget.stream != null) {
      _renderer.srcObject = widget.stream;
    }
  }

  @override
  void dispose() {
    _renderer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized || widget.stream == null) {
      return Container(
        color: Colors.black,
        child: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return RTCVideoView(
      _renderer,
      mirror: widget.mirror,
      objectFit: widget.objectFit,
    );
  }
}
