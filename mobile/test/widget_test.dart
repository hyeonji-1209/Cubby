// This is a basic Flutter widget test.

import 'package:flutter_test/flutter_test.dart';

import 'package:cubby/app.dart';

void main() {
  testWidgets('App loads correctly', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const CubbyApp());

    // Verify that the app loads (SplashScreen shows Cubby title)
    expect(find.text('Cubby'), findsOneWidget);
  });
}
