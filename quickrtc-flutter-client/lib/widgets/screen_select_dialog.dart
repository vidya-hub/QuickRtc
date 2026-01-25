import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

/// A dialog for selecting a screen to share.
///
/// This dialog uses flutter_webrtc's desktopCapturer to enumerate
/// available screens with live thumbnail previews.
///
/// Note: Window sharing has been removed due to macOS WebRTC limitations.
/// Only entire screen capture is supported.
///
/// Usage:
/// ```dart
/// final source = await ScreenSelectDialog.show(context);
/// if (source != null) {
///   // Use source.id for screen capture
/// }
/// ```
class ScreenSelectDialog extends StatefulWidget {
  const ScreenSelectDialog({super.key});

  /// Shows the screen select dialog and returns the selected source.
  /// Returns null if the user cancels.
  static Future<DesktopCapturerSource?> show(BuildContext context) {
    return showDialog<DesktopCapturerSource>(
      context: context,
      builder: (context) => const ScreenSelectDialog(),
    );
  }

  @override
  State<ScreenSelectDialog> createState() => _ScreenSelectDialogState();
}

class _ScreenSelectDialogState extends State<ScreenSelectDialog> {
  /// List of available screen sources
  List<DesktopCapturerSource> _sources = [];

  /// Currently selected source
  DesktopCapturerSource? _selectedSource;

  /// Loading state
  bool _isLoading = true;

  /// Subscriptions for source updates
  StreamSubscription? _onAddedSubscription;
  StreamSubscription? _onRemovedSubscription;
  StreamSubscription? _onThumbnailChangedSubscription;

  /// Timer for periodic thumbnail updates
  Timer? _updateTimer;

  @override
  void initState() {
    super.initState();
    _setupListeners();
    _loadSources();
    // Periodically update thumbnails
    _updateTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      _updateThumbnails();
    });
  }

  @override
  void dispose() {
    _onAddedSubscription?.cancel();
    _onRemovedSubscription?.cancel();
    _onThumbnailChangedSubscription?.cancel();
    _updateTimer?.cancel();
    super.dispose();
  }

  void _setupListeners() {
    _onAddedSubscription = desktopCapturer.onAdded.stream.listen((source) {
      if (source.type == SourceType.Screen) {
        setState(() {
          _sources.add(source);
        });
      }
    });

    _onRemovedSubscription = desktopCapturer.onRemoved.stream.listen((source) {
      setState(() {
        _sources.removeWhere((s) => s.id == source.id);
        if (_selectedSource?.id == source.id) {
          _selectedSource = null;
        }
      });
    });

    _onThumbnailChangedSubscription =
        desktopCapturer.onThumbnailChanged.stream.listen((source) {
      final index = _sources.indexWhere((s) => s.id == source.id);
      if (index != -1) {
        setState(() {
          _sources[index] = source;
        });
      }
    });
  }

  Future<void> _loadSources() async {
    setState(() {
      _isLoading = true;
      _selectedSource = null;
    });

    try {
      // Only load Screen sources (no Window sources)
      final sources = await desktopCapturer.getSources(
        types: [SourceType.Screen],
      );

      // Debug logging
      debugPrint(
          'ScreenSelectDialog: ========================================',);
      debugPrint('ScreenSelectDialog: Loaded ${sources.length} screen sources');
      for (final source in sources) {
        debugPrint('ScreenSelectDialog: Source:');
        debugPrint('ScreenSelectDialog:   name="${source.name}"');
        debugPrint('ScreenSelectDialog:   id="${source.id}"');
        debugPrint('ScreenSelectDialog:   type=${source.type}');
      }
      debugPrint(
          'ScreenSelectDialog: ========================================',);

      if (mounted) {
        setState(() {
          _sources = sources;
          _isLoading = false;
        });
      }
    } catch (e, stackTrace) {
      debugPrint('ScreenSelectDialog: Error loading sources: $e');
      debugPrint('ScreenSelectDialog: Stack trace: $stackTrace');
      if (mounted) {
        setState(() {
          _sources = [];
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _updateThumbnails() async {
    try {
      await desktopCapturer.updateSources(types: [SourceType.Screen]);
    } catch (e) {
      debugPrint('Error updating thumbnails: $e');
    }
  }

  void _onSourceSelected(DesktopCapturerSource source) {
    debugPrint(
        'ScreenSelectDialog: Source selected: name="${source.name}", id="${source.id}", type=${source.type}',);
    setState(() {
      _selectedSource = source;
    });
  }

  void _onShare() {
    if (_selectedSource != null) {
      debugPrint(
          'ScreenSelectDialog: Sharing source: name="${_selectedSource!.name}", id="${_selectedSource!.id}", type=${_selectedSource!.type}',);
      Navigator.of(context).pop(_selectedSource);
    }
  }

  void _onCancel() {
    Navigator.of(context).pop(null);
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Container(
        width: 800,
        height: 600,
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Title
            const Text(
              'Select a screen to share',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),

            // Subtitle
            Text(
              'Choose an entire screen to share with other participants',
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(context).colorScheme.outline,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),

            // Source grid
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _sources.isEmpty
                      ? _buildEmptyState()
                      : _buildSourceGrid(),
            ),

            const SizedBox(height: 16),

            // Action buttons
            _buildActionButtons(),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.desktop_access_disabled,
            size: 64,
            color: Theme.of(context).colorScheme.outline,
          ),
          const SizedBox(height: 16),
          Text(
            'No screens available',
            style: TextStyle(
              color: Theme.of(context).colorScheme.outline,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Make sure screen recording permission is granted',
            style: TextStyle(
              color: Theme.of(context).colorScheme.outline,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSourceGrid() {
    return GridView.builder(
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 16 / 12,
      ),
      itemCount: _sources.length,
      itemBuilder: (context, index) {
        final source = _sources[index];
        return _SourceTile(
          source: source,
          isSelected: _selectedSource?.id == source.id,
          onTap: () => _onSourceSelected(source),
        );
      },
    );
  }

  Widget _buildActionButtons() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        TextButton(
          onPressed: _onCancel,
          child: const Text('Cancel'),
        ),
        const SizedBox(width: 12),
        FilledButton(
          onPressed: _selectedSource != null ? _onShare : null,
          child: const Text('Share'),
        ),
      ],
    );
  }
}

/// Individual source tile with thumbnail
class _SourceTile extends StatelessWidget {
  final DesktopCapturerSource source;
  final bool isSelected;
  final VoidCallback onTap;

  const _SourceTile({
    required this.source,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isSelected
          ? Theme.of(context).colorScheme.primaryContainer
          : Theme.of(context).colorScheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? Theme.of(context).colorScheme.primary
                  : Colors.transparent,
              width: 2,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Thumbnail
              Expanded(
                child: ClipRRect(
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(10)),
                  child: _buildThumbnail(context),
                ),
              ),
              // Name
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Text(
                  source.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight:
                        isSelected ? FontWeight.w600 : FontWeight.normal,
                    color: isSelected
                        ? Theme.of(context).colorScheme.onPrimaryContainer
                        : Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildThumbnail(BuildContext context) {
    final thumbnail = source.thumbnail;
    if (thumbnail != null) {
      return Image.memory(
        thumbnail,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildPlaceholder(context),
      );
    }
    return _buildPlaceholder(context);
  }

  Widget _buildPlaceholder(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: Center(
        child: Icon(
          Icons.desktop_windows,
          size: 48,
          color: Theme.of(context).colorScheme.outline,
        ),
      ),
    );
  }
}

