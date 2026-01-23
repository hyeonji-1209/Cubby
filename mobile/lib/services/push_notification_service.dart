import 'dart:convert';
import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

// 백그라운드 메시지 핸들러 (top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('백그라운드 메시지 수신: ${message.messageId}');
}

class PushNotificationService {
  static final PushNotificationService instance = PushNotificationService._();
  PushNotificationService._();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  String? _fcmToken;
  Function(RemoteMessage)? _onMessageOpenedApp;

  // FCM 토큰 getter
  String? get fcmToken => _fcmToken;

  // 초기화
  Future<void> initialize() async {
    // 백그라운드 핸들러 등록
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // 권한 요청
    await _requestPermission();

    // 로컬 알림 설정
    await _setupLocalNotifications();

    // FCM 토큰 가져오기
    await _getToken();

    // 메시지 리스너 설정
    _setupMessageListeners();
  }

  // 권한 요청
  Future<void> _requestPermission() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
      announcement: false,
      carPlay: false,
      criticalAlert: false,
    );

    debugPrint('푸시 알림 권한: ${settings.authorizationStatus}');

    // iOS 포그라운드 알림 표시 설정
    if (Platform.isIOS) {
      await _messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );
    }
  }

  // 로컬 알림 설정
  Future<void> _setupLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    // Android 알림 채널 생성
    if (Platform.isAndroid) {
      const channel = AndroidNotificationChannel(
        'cubby_notifications',
        'Cubby 알림',
        description: '모임 관련 알림',
        importance: Importance.high,
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);
    }
  }

  // FCM 토큰 가져오기
  Future<String?> _getToken() async {
    try {
      _fcmToken = await _messaging.getToken();
      debugPrint('FCM Token: $_fcmToken');

      // 토큰 로컬 저장
      if (_fcmToken != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('fcm_token', _fcmToken!);
      }

      // 토큰 갱신 리스너
      _messaging.onTokenRefresh.listen((newToken) {
        _fcmToken = newToken;
        debugPrint('FCM Token 갱신됨: $newToken');
        _saveToken(newToken);
      });

      return _fcmToken;
    } catch (e) {
      debugPrint('FCM 토큰 가져오기 실패: $e');
      return null;
    }
  }

  Future<String?> getToken() async {
    return _fcmToken ?? await _getToken();
  }

  Future<void> _saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('fcm_token', token);
  }

  // 메시지 리스너 설정
  void _setupMessageListeners() {
    // 포그라운드 메시지
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // 알림 탭으로 앱 열기
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);

    // 종료 상태에서 알림 탭으로 앱 열기
    _checkInitialMessage();
  }

  // 포그라운드 메시지 처리
  Future<void> _handleForegroundMessage(RemoteMessage message) async {
    debugPrint('포그라운드 메시지: ${message.notification?.title}');

    final notification = message.notification;
    final android = message.notification?.android;

    // Android에서 로컬 알림 표시 (iOS는 자동 표시)
    if (notification != null && Platform.isAndroid) {
      await _localNotifications.show(
        notification.hashCode,
        notification.title,
        notification.body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            'cubby_notifications',
            'Cubby 알림',
            channelDescription: '모임 관련 알림',
            importance: Importance.high,
            priority: Priority.high,
            icon: android?.smallIcon ?? '@mipmap/ic_launcher',
          ),
        ),
        payload: jsonEncode(message.data),
      );
    }
  }

  // 알림 탭으로 앱 열기 처리
  void _handleMessageOpenedApp(RemoteMessage message) {
    debugPrint('알림 탭으로 앱 열림: ${message.data}');
    _onMessageOpenedApp?.call(message);
  }

  // 앱 시작 시 초기 메시지 확인
  Future<void> _checkInitialMessage() async {
    final message = await _messaging.getInitialMessage();
    if (message != null) {
      debugPrint('초기 메시지: ${message.data}');
      _handleMessageOpenedApp(message);
    }
  }

  // 로컬 알림 탭 처리
  void _onNotificationTap(NotificationResponse response) {
    debugPrint('로컬 알림 탭: ${response.payload}');
    if (response.payload != null) {
      try {
        final data = jsonDecode(response.payload!);
        // 알림 데이터에 따라 네비게이션 처리
        debugPrint('알림 데이터: $data');
      } catch (e) {
        debugPrint('알림 페이로드 파싱 실패: $e');
      }
    }
  }

  // 알림 탭 콜백 설정
  void setOnMessageOpenedApp(Function(RemoteMessage) callback) {
    _onMessageOpenedApp = callback;
  }

  // 토픽 구독
  Future<void> subscribeToTopic(String topic) async {
    await _messaging.subscribeToTopic(topic);
    debugPrint('토픽 구독: $topic');
  }

  // 토픽 구독 해제
  Future<void> unsubscribeFromTopic(String topic) async {
    await _messaging.unsubscribeFromTopic(topic);
    debugPrint('토픽 구독 해제: $topic');
  }

  // 토큰 삭제 (로그아웃 시)
  Future<void> deleteToken() async {
    await _messaging.deleteToken();
    _fcmToken = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('fcm_token');
  }
}
