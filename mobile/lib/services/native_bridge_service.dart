import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:image_picker/image_picker.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:cubby/services/push_notification_service.dart';

class NativeBridgeService {
  static Future<void> handleAction({
    required BuildContext context,
    required WebViewController controller,
    required String action,
    required Map<String, dynamic> data,
  }) async {
    switch (action) {
      case 'share':
        await _handleShare(data);
        break;

      case 'copyToClipboard':
        await _handleCopyToClipboard(context, data);
        break;

      case 'openExternalUrl':
        await _handleOpenExternalUrl(data);
        break;

      case 'showToast':
        _handleShowToast(context, data);
        break;

      case 'vibrate':
        _handleVibrate();
        break;

      case 'refreshFcmToken':
        await _handleRefreshFcmToken(controller);
        break;

      case 'openImagePicker':
        await _handleOpenImagePicker(controller, data);
        break;

      case 'authenticateBiometric':
        await _handleBiometricAuth(controller);
        break;

      default:
        debugPrint('Unknown bridge action: $action');
    }
  }

  // 공유하기
  static Future<void> _handleShare(Map<String, dynamic> data) async {
    final title = data['title'] as String? ?? '';
    final text = data['text'] as String? ?? '';
    final url = data['url'] as String? ?? '';

    final shareText = [title, text, url].where((s) => s.isNotEmpty).join('\n');

    await Share.share(shareText);
  }

  // 클립보드 복사
  static Future<void> _handleCopyToClipboard(
    BuildContext context,
    Map<String, dynamic> data,
  ) async {
    final text = data['text'] as String? ?? '';

    await Clipboard.setData(ClipboardData(text: text));

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('클립보드에 복사되었습니다'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  // 외부 URL 열기
  static Future<void> _handleOpenExternalUrl(Map<String, dynamic> data) async {
    final url = data['url'] as String? ?? '';

    if (url.isEmpty) return;

    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  // 토스트 메시지
  static void _handleShowToast(BuildContext context, Map<String, dynamic> data) {
    final message = data['message'] as String? ?? '';

    if (message.isEmpty || !context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // 진동
  static void _handleVibrate() {
    HapticFeedback.mediumImpact();
  }

  // FCM 토큰 갱신
  static Future<void> _handleRefreshFcmToken(WebViewController controller) async {
    final token = await PushNotificationService.instance.getToken();

    if (token != null) {
      await controller.runJavaScript('''
        window.CubbyNative.fcmToken = '$token';
        window.dispatchEvent(new CustomEvent('fcmTokenRefreshed', {
          detail: { token: '$token' }
        }));
      ''');
    }
  }

  // 이미지 피커
  static Future<void> _handleOpenImagePicker(
    WebViewController controller,
    Map<String, dynamic> data,
  ) async {
    final source = data['source'] as String? ?? 'gallery';
    final picker = ImagePicker();

    try {
      final XFile? image = await picker.pickImage(
        source: source == 'camera' ? ImageSource.camera : ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );

      if (image != null) {
        final bytes = await image.readAsBytes();
        final base64Image = base64Encode(bytes);
        final mimeType = _getMimeType(image.path);

        await controller.runJavaScript('''
          window.dispatchEvent(new CustomEvent('imageSelected', {
            detail: {
              base64: '$base64Image',
              mimeType: '$mimeType',
              fileName: '${image.name}'
            }
          }));
        ''');
      } else {
        await controller.runJavaScript('''
          window.dispatchEvent(new CustomEvent('imageSelectionCancelled'));
        ''');
      }
    } catch (e) {
      debugPrint('이미지 선택 실패: $e');
      await controller.runJavaScript('''
        window.dispatchEvent(new CustomEvent('imageSelectionError', {
          detail: { error: '이미지 선택에 실패했습니다' }
        }));
      ''');
    }
  }

  // 생체 인증
  static Future<void> _handleBiometricAuth(WebViewController controller) async {
    // TODO: local_auth 패키지로 생체 인증 구현
    // 현재는 항상 성공으로 처리
    await controller.runJavaScript('''
      window.dispatchEvent(new CustomEvent('biometricAuthResult', {
        detail: { success: true }
      }));
    ''');
  }

  static String _getMimeType(String path) {
    final ext = path.split('.').last.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }
}
