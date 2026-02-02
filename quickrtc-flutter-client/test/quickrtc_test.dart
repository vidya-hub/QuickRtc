/// QuickRTC Flutter Client - Main Test Suite
///
/// This file imports and executes all tests for the QuickRTC package.
/// Run with: flutter test test/quickrtc_test.dart
///
/// Or run all tests: flutter test
library;

// Model tests
import 'models/consumer_params_test.dart' as consumer_params_test;
import 'models/participant_info_test.dart' as participant_info_test;
import 'models/socket_response_test.dart' as socket_response_test;
import 'models/transport_options_test.dart' as transport_options_test;

// State tests
import 'state/quick_rtc_state_test.dart' as quick_rtc_state_test;

// Types tests
import 'types/types_test.dart' as types_test;

// Widget tests
import 'widgets/quick_rtc_builder_test.dart' as quick_rtc_builder_test;
import 'widgets/quick_rtc_consumer_test.dart' as quick_rtc_consumer_test;
import 'widgets/quick_rtc_listener_test.dart' as quick_rtc_listener_test;
import 'widgets/quick_rtc_provider_test.dart' as quick_rtc_provider_test;
import 'widgets/quick_rtc_theme_test.dart' as quick_rtc_theme_test;

void main() {
  // ============================================================================
  // MODEL TESTS
  // ============================================================================
  consumer_params_test.main();
  participant_info_test.main();
  socket_response_test.main();
  transport_options_test.main();

  // ============================================================================
  // STATE TESTS
  // ============================================================================
  quick_rtc_state_test.main();

  // ============================================================================
  // TYPES TESTS
  // ============================================================================
  types_test.main();

  // ============================================================================
  // WIDGET TESTS
  // ============================================================================
  quick_rtc_builder_test.main();
  quick_rtc_consumer_test.main();
  quick_rtc_listener_test.main();
  quick_rtc_provider_test.main();
  quick_rtc_theme_test.main();
}
