import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const authController = new AuthController();

// 회원가입
router.post('/register', authController.register);

// 로그인
router.post('/login', authController.login);

// 토큰 갱신
router.post('/refresh', authController.refresh);

// 로그아웃
router.post('/logout', authMiddleware, authController.logout);

// 비밀번호 재설정 요청
router.post('/forgot-password', authController.forgotPassword);

// 비밀번호 재설정
router.post('/reset-password', authController.resetPassword);

// 이메일 인증
router.post('/verify-email', authController.verifyEmail);

// OAuth - Google
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

// OAuth - Kakao
router.get('/kakao', authController.kakaoAuth);
router.get('/kakao/callback', authController.kakaoCallback);

export default router;
