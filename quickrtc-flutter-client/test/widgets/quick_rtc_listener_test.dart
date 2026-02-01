import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_controller.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/widgets/quick_rtc_listener.dart';
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

  group('QuickRTCListener', () {
    testWidgets('calls listener on state change', (tester) async {
      int listenerCallCount = 0;
      QuickRTCController? receivedController;

      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: QuickRTCListener(
            listener: (context, ctrl) {
              listenerCallCount++;
              receivedController = ctrl;
            },
            child: const SizedBox(),
          ),
        ),
      );

      expect(listenerCallCount, 0); // Not called on initial build

      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connecting),
      );
      await tester.pumpAndSettle();

      expect(listenerCallCount, 1);
      expect(receivedController, same(controller));
    });

    testWidgets('respects listenWhen condition', (tester) async {
      int listenerCallCount = 0;

      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: QuickRTCListener(
            listenWhen: (previous, current) =>
                previous.status != current.status,
            listener: (context, ctrl) {
              listenerCallCount++;
            },
            child: const SizedBox(),
          ),
        ),
      );

      // Change status - should call listener
      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connecting),
      );
      await tester.pumpAndSettle();

      expect(listenerCallCount, 1);

      // Change something else (not status) - should NOT call listener
      controller.updateState(
        controller.state.copyWith(conferenceId: 'room-123'),
      );
      await tester.pumpAndSettle();

      expect(listenerCallCount, 1); // Still 1
    });

    testWidgets('renders child widget', (tester) async {
      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: QuickRTCListener(
            listener: (context, ctrl) {},
            child: const Text('Child Widget', textDirection: TextDirection.ltr),
          ),
        ),
      );

      expect(find.text('Child Widget'), findsOneWidget);
    });

    testWidgets('listener receives correct controller with state',
        (tester) async {
      ConnectionStatus? capturedStatus;

      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: QuickRTCListener(
            listener: (context, ctrl) {
              capturedStatus = ctrl.state.status;
            },
            child: const SizedBox(),
          ),
        ),
      );

      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connected),
      );
      await tester.pumpAndSettle();

      expect(capturedStatus, ConnectionStatus.connected);
    });

    testWidgets('listener called multiple times for multiple state changes',
        (tester) async {
      final statusHistory = <ConnectionStatus>[];

      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: QuickRTCListener(
            listener: (context, ctrl) {
              statusHistory.add(ctrl.state.status);
            },
            child: const SizedBox(),
          ),
        ),
      );

      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connecting),
      );
      await tester.pumpAndSettle();

      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connected),
      );
      await tester.pumpAndSettle();

      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.disconnected),
      );
      await tester.pumpAndSettle();

      expect(statusHistory, [
        ConnectionStatus.connecting,
        ConnectionStatus.connected,
        ConnectionStatus.disconnected,
      ]);
    });

    testWidgets('cleans up listener on dispose', (tester) async {
      int listenerCallCount = 0;

      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: QuickRTCListener(
            listener: (context, ctrl) {
              listenerCallCount++;
            },
            child: const SizedBox(),
          ),
        ),
      );

      // Remove the widget tree
      await tester.pumpWidget(const SizedBox());

      // This should not call the listener or throw
      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connecting),
      );
      await tester.pumpAndSettle();

      expect(listenerCallCount, 0);
    });

    testWidgets('does not rebuild child on state change', (tester) async {
      int childBuildCount = 0;

      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: QuickRTCListener(
            listener: (context, ctrl) {},
            child: Builder(
              builder: (context) {
                childBuildCount++;
                return const SizedBox();
              },
            ),
          ),
        ),
      );

      expect(childBuildCount, 1);

      controller.updateState(
        controller.state.copyWith(status: ConnectionStatus.connecting),
      );
      await tester.pumpAndSettle();

      // Child should not rebuild - QuickRTCListener only calls listener
      expect(childBuildCount, 1);
    });
  });
}
