import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_controller.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/widgets/quick_rtc_provider.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

// Create a mock socket for testing
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

  group('QuickRTCProvider', () {
    testWidgets('provides controller to descendants', (tester) async {
      QuickRTCController? retrievedController;

      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: Builder(
            builder: (context) {
              retrievedController = QuickRTCProvider.read(context);
              return const SizedBox();
            },
          ),
        ),
      );

      expect(retrievedController, isNotNull);
      expect(retrievedController, same(controller));
    });

    testWidgets('read() throws when provider not found', (tester) async {
      await tester.pumpWidget(
        Builder(
          builder: (context) {
            expect(
              () => QuickRTCProvider.read(context),
              throwsA(isA<FlutterError>()),
            );
            return const SizedBox();
          },
        ),
      );
    });

    testWidgets('of() returns controller and listens for changes',
        (tester) async {
      QuickRTCController? retrievedController;

      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: Builder(
            builder: (context) {
              retrievedController = QuickRTCProvider.of(context);
              return const SizedBox();
            },
          ),
        ),
      );

      expect(retrievedController, isNotNull);
      expect(retrievedController, same(controller));
    });

    testWidgets('of() throws when provider not found', (tester) async {
      await tester.pumpWidget(
        Builder(
          builder: (context) {
            expect(
              () => QuickRTCProvider.of(context),
              throwsA(isA<FlutterError>()),
            );
            return const SizedBox();
          },
        ),
      );
    });

    testWidgets('stateOf() returns current state', (tester) async {
      QuickRTCState? state;

      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: Builder(
            builder: (context) {
              state = QuickRTCProvider.stateOf(context);
              return const SizedBox();
            },
          ),
        ),
      );

      expect(state, isNotNull);
      expect(state?.status, ConnectionStatus.disconnected);
    });

    testWidgets('maybeOf() returns null when provider not found',
        (tester) async {
      QuickRTCController? maybeController;

      await tester.pumpWidget(
        Builder(
          builder: (context) {
            maybeController = QuickRTCProvider.maybeOf(context);
            return const SizedBox();
          },
        ),
      );

      expect(maybeController, isNull);
    });

    testWidgets('maybeOf() returns controller when provider exists',
        (tester) async {
      QuickRTCController? maybeController;

      await tester.pumpWidget(
        QuickRTCProvider(
          controller: controller,
          child: Builder(
            builder: (context) {
              maybeController = QuickRTCProvider.maybeOf(context);
              return const SizedBox();
            },
          ),
        ),
      );

      expect(maybeController, isNotNull);
      expect(maybeController, same(controller));
    });

    testWidgets('updateShouldNotify returns true for different controllers',
        (tester) async {
      final controller2 = QuickRTCController(socket: mockSocket, debug: false);

      final provider1 = QuickRTCProvider(
        controller: controller,
        child: const SizedBox(),
      );

      final provider2 = QuickRTCProvider(
        controller: controller2,
        child: const SizedBox(),
      );

      expect(provider2.updateShouldNotify(provider1), isTrue);

      controller2.dispose();
    });

    testWidgets('updateShouldNotify returns false for same controller',
        (tester) async {
      final provider1 = QuickRTCProvider(
        controller: controller,
        child: const SizedBox(),
      );

      final provider2 = QuickRTCProvider(
        controller: controller,
        child: const SizedBox(),
      );

      expect(provider2.updateShouldNotify(provider1), isFalse);
    });
  });
}
