import 'package:flutter_test/flutter_test.dart';
import 'package:quickrtc_flutter_example/main.dart';

void main() {
  testWidgets('App launches', (tester) async {
    await tester.pumpWidget(const QuickRTCApp());
    expect(find.text('QuickRTC'), findsOneWidget);
  });
}
