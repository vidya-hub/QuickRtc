import 'package:flutter/material.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _formKey = GlobalKey<FormState>();
  final _serverUrl = TextEditingController(text: 'https://192.168.29.46:3000');
  final _meetingId = TextEditingController();
  final _userName = TextEditingController();

  @override
  void dispose() {
    _serverUrl.dispose();
    _meetingId.dispose();
    _userName.dispose();
    super.dispose();
  }

  void _joinMeeting() {
    if (!_formKey.currentState!.validate()) return;

    Navigator.pushNamed(context, '/conference', arguments: {
      'serverUrl': _serverUrl.text.trim(),
      'conferenceId': _meetingId.text.trim(),
      'participantName': _userName.text.trim(),
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Logo
                  Icon(
                    Icons.video_call_rounded,
                    size: 72,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(height: 16),
                  Text('QuickRTC',
                      style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 32),

                  // Form fields
                  _buildTextField(_serverUrl, 'Server URL', Icons.dns_outlined),
                  const SizedBox(height: 16),
                  _buildTextField(
                      _meetingId, 'Meeting ID', Icons.meeting_room_outlined),
                  const SizedBox(height: 16),
                  _buildTextField(_userName, 'Your Name', Icons.person_outline),
                  const SizedBox(height: 24),

                  // Join button
                  FilledButton.icon(
                    onPressed: _joinMeeting,
                    icon: const Icon(Icons.video_call),
                    label: const Text('Join Meeting'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(56),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(
      TextEditingController controller, String label, IconData icon) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        border: const OutlineInputBorder(),
      ),
      validator: (v) => (v?.trim().isEmpty ?? true) ? 'Required' : null,
    );
  }
}
