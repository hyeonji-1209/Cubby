import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:cubby/services/push_notification_service.dart';
import 'package:cubby/services/native_bridge_service.dart';
import 'package:url_launcher/url_launcher.dart';

class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;

  // 웹앱 URL (개발/프로덕션 환경에 따라 변경)
  static const String _webAppUrl = String.fromEnvironment(
    'WEB_APP_URL',
    defaultValue: 'http://localhost:5173', // 개발 환경
  );

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            if (progress == 100) {
              setState(() => _isLoading = false);
            }
          },
          onPageStarted: (String url) {
            setState(() {
              _isLoading = true;
              _hasError = false;
            });
          },
          onPageFinished: (String url) {
            setState(() => _isLoading = false);
            _injectBridge();
          },
          onWebResourceError: (WebResourceError error) {
            setState(() {
              _isLoading = false;
              _hasError = true;
            });
          },
          onNavigationRequest: (NavigationRequest request) {
            // 외부 링크는 브라우저로 열기
            if (!request.url.startsWith(_webAppUrl) &&
                !request.url.startsWith('http://localhost') &&
                !request.url.startsWith('https://localhost')) {
              _launchExternalUrl(request.url);
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..addJavaScriptChannel(
        'FlutterBridge',
        onMessageReceived: _handleJsMessage,
      )
      ..loadRequest(Uri.parse(_webAppUrl));
  }

  // JavaScript Bridge 주입
  Future<void> _injectBridge() async {
    final fcmToken = await PushNotificationService.instance.getToken();
    final platform = Platform.isIOS ? 'ios' : 'android';

    final bridgeScript = '''
      window.CubbyNative = {
        platform: '$platform',
        fcmToken: '${fcmToken ?? ''}',

        // Flutter로 메시지 전송
        postMessage: function(action, data) {
          FlutterBridge.postMessage(JSON.stringify({
            action: action,
            data: data
          }));
        },

        // 공유하기
        share: function(title, text, url) {
          this.postMessage('share', { title, text, url });
        },

        // 클립보드 복사
        copyToClipboard: function(text) {
          this.postMessage('copyToClipboard', { text });
        },

        // 외부 URL 열기
        openExternalUrl: function(url) {
          this.postMessage('openExternalUrl', { url });
        },

        // 토스트 메시지
        showToast: function(message) {
          this.postMessage('showToast', { message });
        },

        // 진동
        vibrate: function() {
          this.postMessage('vibrate', {});
        },

        // FCM 토큰 갱신 요청
        refreshFcmToken: function() {
          this.postMessage('refreshFcmToken', {});
        },

        // 이미지 피커 열기
        openImagePicker: function(source) {
          this.postMessage('openImagePicker', { source }); // 'camera' or 'gallery'
        },

        // 생체 인증
        authenticateBiometric: function() {
          this.postMessage('authenticateBiometric', {});
        }
      };

      // 브릿지 준비 완료 이벤트
      window.dispatchEvent(new CustomEvent('CubbyNativeReady', {
        detail: {
          platform: '$platform',
          fcmToken: '${fcmToken ?? ''}'
        }
      }));

      console.log('CubbyNative bridge initialized');
    ''';

    await _controller.runJavaScript(bridgeScript);
  }

  // JavaScript에서 오는 메시지 처리
  void _handleJsMessage(JavaScriptMessage message) async {
    try {
      final data = jsonDecode(message.message);
      final action = data['action'] as String;
      final payload = data['data'] as Map<String, dynamic>?;

      await NativeBridgeService.handleAction(
        context: context,
        controller: _controller,
        action: action,
        data: payload ?? {},
      );
    } catch (e) {
      debugPrint('JS Bridge Error: $e');
    }
  }

  Future<void> _launchExternalUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<bool> _onWillPop() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (bool didPop, dynamic result) async {
        if (didPop) return;
        final canPop = await _onWillPop();
        if (canPop && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: Stack(
            children: [
              // WebView
              WebViewWidget(controller: _controller),

              // 로딩 인디케이터
              if (_isLoading)
                const Center(
                  child: CircularProgressIndicator(),
                ),

              // 에러 화면
              if (_hasError)
                _buildErrorWidget(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildErrorWidget() {
    return Container(
      color: Colors.white,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.grey,
            ),
            const SizedBox(height: 16),
            const Text(
              '페이지를 불러올 수 없습니다',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              '네트워크 연결을 확인해주세요',
              style: TextStyle(
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _hasError = false;
                  _isLoading = true;
                });
                _controller.reload();
              },
              child: const Text('다시 시도'),
            ),
          ],
        ),
      ),
    );
  }
}
