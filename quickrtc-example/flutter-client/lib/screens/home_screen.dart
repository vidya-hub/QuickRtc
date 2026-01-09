import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../utils/responsive.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _formKey = GlobalKey<FormState>();
  final _conferenceIdController = TextEditingController();
  final _participantNameController = TextEditingController();
  final _serverUrlController = TextEditingController(
    text: 'https://10.94.48.226:3000',
  );

  // ignore: prefer_final_fields - will be used for loading state
  bool _isLoading = false;

  @override
  void dispose() {
    _conferenceIdController.dispose();
    _participantNameController.dispose();
    _serverUrlController.dispose();
    super.dispose();
  }

  void _joinConference() {
    if (!_formKey.currentState!.validate()) return;

    final conferenceId = _conferenceIdController.text.trim();
    final participantName = _participantNameController.text.trim();
    final serverUrl = _serverUrlController.text.trim();

    Navigator.pushNamed(
      context,
      '/conference',
      arguments: {
        'conferenceId': conferenceId,
        'participantName': participantName,
        'serverUrl': serverUrl,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ResponsiveBuilder(
        builder: (context, responsive) {
          return SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: responsive.screenPadding,
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    maxWidth: responsive.value(
                      mobile: double.infinity,
                      tablet: 500,
                      desktop: 600,
                    ),
                  ),
                  child: _buildContent(responsive),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildContent(Responsive responsive) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Logo and title
        _buildHeader(responsive),
        SizedBox(height: responsive.spacing * 2),

        // Form card
        _buildFormCard(responsive),
        SizedBox(height: responsive.spacing),

        // Footer
        _buildFooter(responsive),
      ],
    );
  }

  Widget _buildHeader(Responsive responsive) {
    return Column(
      children: [
        // Logo
        Container(
          width: responsive.value(mobile: 80.0, tablet: 100.0, desktop: 120.0),
          height: responsive.value(mobile: 80.0, tablet: 100.0, desktop: 120.0),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primaryContainer,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Icon(
            Icons.video_call_rounded,
            size: responsive.value(mobile: 40.0, tablet: 50.0, desktop: 60.0),
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
        SizedBox(height: responsive.spacing),
        Text(
          'QuickRTC',
          style: TextStyle(
            fontSize:
                responsive.value(mobile: 28.0, tablet: 32.0, desktop: 36.0),
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Simple video conferencing for everyone',
          style: TextStyle(
            fontSize: responsive.value(mobile: 14.0, tablet: 16.0),
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildFormCard(Responsive responsive) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(responsive.spacing),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Join a Meeting',
                style: TextStyle(
                  fontSize: responsive.value(mobile: 20.0, tablet: 22.0),
                  fontWeight: FontWeight.w600,
                ),
              ),
              SizedBox(height: responsive.spacing),

              // Server URL field
              TextFormField(
                controller: _serverUrlController,
                decoration: const InputDecoration(
                  labelText: 'Server URL',
                  hintText: 'https://your-server.com:3000',
                  prefixIcon: Icon(Icons.dns_outlined),
                ),
                keyboardType: TextInputType.url,
                textInputAction: TextInputAction.next,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter server URL';
                  }
                  if (!value.startsWith('http://') &&
                      !value.startsWith('https://')) {
                    return 'URL must start with http:// or https://';
                  }
                  return null;
                },
              ),
              SizedBox(height: responsive.spacing),

              // Conference ID and Name in row on larger screens
              if (responsive.isMobile) ...[
                // Mobile: Stack vertically
                TextFormField(
                  controller: _conferenceIdController,
                  decoration: const InputDecoration(
                    labelText: 'Meeting ID',
                    hintText: 'Enter meeting ID',
                    prefixIcon: Icon(Icons.meeting_room_outlined),
                  ),
                  textInputAction: TextInputAction.next,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z0-9-_]')),
                  ],
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter meeting ID';
                    }
                    if (value.trim().length < 3) {
                      return 'Meeting ID must be at least 3 characters';
                    }
                    return null;
                  },
                ),
                SizedBox(height: responsive.spacing),
                TextFormField(
                  controller: _participantNameController,
                  decoration: const InputDecoration(
                    labelText: 'Your Name',
                    hintText: 'Enter your name',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  textInputAction: TextInputAction.done,
                  textCapitalization: TextCapitalization.words,
                  onFieldSubmitted: (_) => _joinConference(),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter your name';
                    }
                    return null;
                  },
                ),
              ] else ...[
                // Tablet/Desktop: Side by side
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _conferenceIdController,
                        decoration: const InputDecoration(
                          labelText: 'Meeting ID',
                          hintText: 'Enter meeting ID',
                          prefixIcon: Icon(Icons.meeting_room_outlined),
                        ),
                        textInputAction: TextInputAction.next,
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(
                            RegExp(r'[a-zA-Z0-9-_]'),
                          ),
                        ],
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Please enter meeting ID';
                          }
                          if (value.trim().length < 3) {
                            return 'Meeting ID must be at least 3 characters';
                          }
                          return null;
                        },
                      ),
                    ),
                    SizedBox(width: responsive.spacing),
                    Expanded(
                      child: TextFormField(
                        controller: _participantNameController,
                        decoration: const InputDecoration(
                          labelText: 'Your Name',
                          hintText: 'Enter your name',
                          prefixIcon: Icon(Icons.person_outline),
                        ),
                        textInputAction: TextInputAction.done,
                        textCapitalization: TextCapitalization.words,
                        onFieldSubmitted: (_) => _joinConference(),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Please enter your name';
                          }
                          return null;
                        },
                      ),
                    ),
                  ],
                ),
              ],
              SizedBox(height: responsive.spacing * 1.5),

              // Join button
              SizedBox(
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: _isLoading ? null : _joinConference,
                  icon: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.video_call_rounded),
                  label: Text(
                    _isLoading ? 'Joining...' : 'Join Meeting',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFooter(Responsive responsive) {
    return Column(
      children: [
        Text(
          'Powered by QuickRTC',
          style: TextStyle(
            fontSize: 12,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextButton(
              onPressed: () {
                showAboutDialog(
                  context: context,
                  applicationName: 'QuickRTC',
                  applicationVersion: '1.0.0',
                  applicationIcon: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.video_call_rounded,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  children: const [
                    Text(
                      'A simple, open-source video conferencing solution built with Flutter and MediaSoup.',
                    ),
                  ],
                );
              },
              child: const Text('About'),
            ),
            const Text('•'),
            TextButton(
              onPressed: () {},
              child: const Text('Documentation'),
            ),
          ],
        ),
      ],
    );
  }
}
