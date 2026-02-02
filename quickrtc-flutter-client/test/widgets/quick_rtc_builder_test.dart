import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_controller.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/widgets/quick_rtc_builder.dart';
import 'package:quickrtc_flutter_client/widgets/quick_rtc_provider.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

io.Socket createMockSocket() {
  return io.io(
    'http://localhost:3000',
    io.OptionBuilder()
        .setTransports(['websocket'])
        .disableAutoConnect()
        .build(),
  );
}

void main() {
  late QuickRTCController controller;
  late io.Socket mockSocket;

  setUp(() {
    mockSocket = createMockSocket();
    controller = QuickRTCController(socket: mockSocket, debug: false);
  });

  tearDown(() {
    controller.dispose();
  });

  group('QuickRTCBuilder', () {
    testWidgets('builds with initial state', (tester) async {
      QuickRTCState? builtState;

      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: QuickRTCBuilder(
            builder: (context, state) {
              builtState = state;
              return const SizedBox();
            },
          ),
        ),
      );

      expect(builtState, isNotNull);
      expect(builtState?.status, ConnectionStatus.disconnected);
    });

    testWidgets('rebuilds when state changes', (tester) async {
      int buildCount = 0;
      final states = <QuickRTCState>[];

      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: QuickRTCBuilder(
            builder: (context, state) {
              buildCount++;
              states.add(state);
              return Text(
                'Status: ${state.status}',
                textDirection: TextDirection.ltr,
              );
            },
          ),
        ),
      );

      expect(buildCount, 1);
      expect(states.last.status, ConnectionStatus.disconnected);

      // Trigger state change by updating state internally
      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connecting),
      );
      await tester.pumpAndSettle();

      expect(buildCount, 2);
      expect(states.last.status, ConnectionStatus.connecting);
    });

    testWidgets('respects buildWhen condition', (tester) async {
      int buildCount = 0;

      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: QuickRTCBuilder(
            buildWhen: (previous, current) => previous.status != current.status,
            builder: (context, state) {
              buildCount++;
              return const SizedBox();
            },
          ),
        ),
      );

      expect(buildCount, 1);

      // Change status - should rebuild
      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connecting),
      );
      await tester.pumpAndSettle();

      expect(buildCount, 2);

      // Change something else (not status) - should NOT rebuild
      controller.updateState(
        controller.state.copyWith(conferenceId: 'room-123'),
      );
      await tester.pumpAndSettle();

      expect(buildCount, 2); // Still 2, not rebuilt
    });

    testWidgets('shows error widget when onError provided and state has error',
        (tester) async {
      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: QuickRTCBuilder(
            builder: (context, state) {
              return const Text('Normal', textDirection: TextDirection.ltr);
            },
            onError: (context, error) {
              return Text('Error: $error', textDirection: TextDirection.ltr);
            },
          ),
        ),
      );

      expect(find.text('Normal'), findsOneWidget);
      expect(find.textContaining('Error:'), findsNothing);

      // Trigger error state
      controller.updateState(
        controller.state.copyWith(error: 'Test error'),
      );
      await tester.pumpAndSettle();

      expect(find.text('Normal'), findsNothing);
      expect(find.text('Error: Test error'), findsOneWidget);
    });

    testWidgets('shows normal widget when error but no onError handler',
        (tester) async {
      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: QuickRTCBuilder(
            builder: (context, state) {
              return Text(
                state.hasError ? 'Has Error' : 'No Error',
                textDirection: TextDirection.ltr,
              );
            },
          ),
        ),
      );

      expect(find.text('No Error'), findsOneWidget);

      controller.updateState(
        controller.state.copyWith(error: 'Test error'),
      );
      await tester.pumpAndSettle();

      expect(find.text('Has Error'), findsOneWidget);
    });

    testWidgets('cleans up listener on dispose', (tester) async {
      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: QuickRTCBuilder(
            builder: (context, state) => const SizedBox(),
          ),
        ),
      );

      // Remove the widget tree
      await tester.pumpWidget(const SizedBox());

      // This should not throw - listener should be removed
      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connecting),
      );
    });
  });
}
