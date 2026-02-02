import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_controller.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/widgets/quick_rtc_consumer.dart';
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

  group('QuickRTCConsumer', () {
    testWidgets('builds with initial state and provides controller',
        (tester) async {
      QuickRTCState? builtState;
      QuickRTCController? builtController;

      await tester.pumpWidget(
        QuickRTCConsumer(
          controller: controller,
          builder: (context, state, ctrl) {
            builtState = state;
            builtController = ctrl;
            return const SizedBox();
          },
        ),
      );

      expect(builtState, isNotNull);
      expect(builtController, isNotNull);
      expect(builtController, same(controller));
      expect(builtState?.status, ConnectionStatus.disconnected);
    });

    testWidgets('provides controller to descendants via QuickRTCProvider',
        (tester) async {
      QuickRTCController? descendantController;

      await tester.pumpWidget(
        QuickRTCConsumer(
          controller: controller,
          builder: (context, state, ctrl) {
            return Builder(
              builder: (innerContext) {
                descendantController = QuickRTCProvider.read(innerContext);
                return const SizedBox();
              },
            );
          },
        ),
      );

      expect(descendantController, isNotNull);
      expect(descendantController, same(controller));
    });

    testWidgets('rebuilds when state changes', (tester) async {
      int buildCount = 0;

      await tester.pumpWidget(
        QuickRTCConsumer(
          controller: controller,
          builder: (context, state, ctrl) {
            buildCount++;
            return Text(
              'Status: ${state.status}',
              textDirection: TextDirection.ltr,
            );
          },
        ),
      );

      expect(buildCount, 1);

      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connecting),
      );
      await tester.pumpAndSettle();

      expect(buildCount, 2);
    });

    testWidgets('calls listener on state change', (tester) async {
      int listenerCallCount = 0;

      await tester.pumpWidget(
        QuickRTCConsumer(
          controller: controller,
          listener: (context, ctrl) {
            listenerCallCount++;
          },
          builder: (context, state, ctrl) => const SizedBox(),
        ),
      );

      expect(listenerCallCount, 0);

      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connecting),
      );
      await tester.pumpAndSettle();

      expect(listenerCallCount, 1);
    });

    testWidgets('respects buildWhen condition', (tester) async {
      int buildCount = 0;

      await tester.pumpWidget(
        QuickRTCConsumer(
          controller: controller,
          buildWhen: (previous, current) => previous.status != current.status,
          builder: (context, state, ctrl) {
            buildCount++;
            return const SizedBox();
          },
        ),
      );

      expect(buildCount, 1);

      // Change status - should rebuild
      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connecting),
      );
      await tester.pumpAndSettle();

      expect(buildCount, 2);

      // Change something else - should NOT rebuild
      controller.updateState(
        controller.state.copyWith(conferenceId: 'room-123'),
      );
      await tester.pumpAndSettle();

      expect(buildCount, 2);
    });

    testWidgets('respects listenWhen condition', (tester) async {
      int listenerCallCount = 0;

      await tester.pumpWidget(
        QuickRTCConsumer(
          controller: controller,
          listenWhen: (previous, current) => previous.status != current.status,
          listener: (context, ctrl) {
            listenerCallCount++;
          },
          builder: (context, state, ctrl) => const SizedBox(),
        ),
      );

      // Change status - should call listener
      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connecting),
      );
      await tester.pumpAndSettle();

      expect(listenerCallCount, 1);

      // Change something else - should NOT call listener
      controller.updateState(
        controller.state.copyWith(conferenceId: 'room-123'),
      );
      await tester.pumpAndSettle();

      expect(listenerCallCount, 1);
    });

    testWidgets('shows error widget when onError provided', (tester) async {
      await tester.pumpWidget(
        QuickRTCConsumer(
          controller: controller,
          builder: (context, state, ctrl) {
            return const Text('Normal', textDirection: TextDirection.ltr);
          },
          onError: (context, error) {
            return Text('Error: $error', textDirection: TextDirection.ltr);
          },
        ),
      );

      expect(find.text('Normal'), findsOneWidget);

      controller.updateState(
        controller.state.copyWith(error: 'Test error'),
      );
      await tester.pumpAndSettle();

      expect(find.text('Error: Test error'), findsOneWidget);
    });

    testWidgets('handles controller swap correctly', (tester) async {
      final mockSocket2 = createMockSocket();
      final controller2 = QuickRTCController(socket: mockSocket2, debug: false);

      // Register cleanup - controller2 is disconnected so dispose won't create timers
      addTearDown(() => controller2.dispose());

      int buildCount = 0;

      await tester.pumpWidget(
        QuickRTCConsumer(
          controller: controller,
          builder: (context, state, ctrl) {
            buildCount++;
            return const SizedBox();
          },
        ),
      );

      expect(buildCount, 1);

      // Swap to new controller
      await tester.pumpWidget(
        QuickRTCConsumer(
          controller: controller2,
          builder: (context, state, ctrl) {
            buildCount++;
            return const SizedBox();
          },
        ),
      );

      expect(buildCount, 2);

      // Old controller changes should not trigger rebuild
      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connecting),
      );
      await tester.pumpAndSettle();

      expect(buildCount, 2);

      // New controller changes should trigger rebuild
      // Use 'connecting' instead of 'connected' to avoid triggering
      // leaveMeeting cleanup timers during dispose
      controller2.updateState(
        controller2.state.copyWith(status: ConnectionStatus.connecting),
      );
      await tester.pumpAndSettle();

      expect(buildCount, 3);
    });

    testWidgets('cleans up listener on dispose', (tester) async {
      await tester.pumpWidget(
        QuickRTCConsumer(
          controller: controller,
          builder: (context, state, ctrl) => const SizedBox(),
        ),
      );

      await tester.pumpWidget(const SizedBox());

      // Should not throw
      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connecting),
      );
    });
  });

  group('QuickRTCConsumerLite', () {
    testWidgets('requires QuickRTCProvider ancestor', (tester) async {
      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: QuickRTCConsumerLite(
            listener: (context, ctrl) {},
            builder: (context, state) {
              return Text(
                'Status: ${state.status}',
                textDirection: TextDirection.ltr,
              );
            },
          ),
        ),
      );

      expect(find.textContaining('Status:'), findsOneWidget);
    });

    testWidgets('builds with state and calls listener', (tester) async {
      int listenerCallCount = 0;

      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: QuickRTCConsumerLite(
            listener: (context, ctrl) {
              listenerCallCount++;
            },
            builder: (context, state) => const SizedBox(),
          ),
        ),
      );

      expect(listenerCallCount, 0);

      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connecting),
      );
      await tester.pumpAndSettle();

      expect(listenerCallCount, 1);
    });

    testWidgets('respects buildWhen and listenWhen', (tester) async {
      int buildCount = 0;
      int listenerCallCount = 0;

      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: QuickRTCConsumerLite(
            buildWhen: (prev, curr) => prev.status != curr.status,
            listenWhen: (prev, curr) => curr.hasError,
            listener: (context, ctrl) {
              listenerCallCount++;
            },
            builder: (context, state) {
              buildCount++;
              return const SizedBox();
            },
          ),
        ),
      );

      expect(buildCount, 1);
      expect(listenerCallCount, 0);

      // Status change - rebuild only
      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connecting),
      );
      await tester.pumpAndSettle();

      expect(buildCount, 2);
      expect(listenerCallCount, 0);

      // Error change - listener only
      controller.updateState(
        controller.state.copyWith(error: 'Test error'),
      );
      await tester.pumpAndSettle();

      expect(buildCount, 2);
      expect(listenerCallCount, 1);
    });
  });
}
