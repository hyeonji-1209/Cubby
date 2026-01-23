import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkConnectionAndNavigate();
  }

  Future<void> _checkConnectionAndNavigate() async {
    // 잠시 대기 (스플래시 표시)
    await Future.delayed(const Duration(milliseconds: 1500));

    // 인터넷 연결 확인
    final connectivityResult = await Connectivity().checkConnectivity();

    if (!mounted) return;

    if (connectivityResult.contains(ConnectivityResult.none)) {
      _showNoConnectionDialog();
    } else {
      Navigator.pushReplacementNamed(context, '/webview');
    }
  }

  void _showNoConnectionDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('인터넷 연결 없음'),
        content: const Text('인터넷 연결을 확인해주세요.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _checkConnectionAndNavigate();
            },
            child: const Text('다시 시도'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF6366F1),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // 로고
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(
                Icons.groups_rounded,
                size: 64,
                color: Color(0xFF6366F1),
              ),
            ),
            const SizedBox(height: 24),
            // 앱 이름
            const Text(
              'Cubby',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              '초대 기반 모임 관리',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white70,
              ),
            ),
            const SizedBox(height: 48),
            // 로딩 인디케이터
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}
