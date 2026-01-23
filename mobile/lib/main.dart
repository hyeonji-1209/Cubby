import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cubby/app.dart';
import 'package:cubby/services/push_notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Firebase 초기화
  await Firebase.initializeApp();

  // 푸시 알림 서비스 초기화
  await PushNotificationService.instance.initialize();

  runApp(const CubbyApp());
}
