import { Router } from 'express';
import { VerificationController } from '../controllers/verification.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const verificationController = new VerificationController();

// ============ 회원가입용 (인증 없이 접근 가능) ============

// 회원가입용 이메일 인증 코드 발송
router.post('/signup/email/send', verificationController.sendEmailCodeForSignup);

// 회원가입용 이메일 인증 확인
router.post('/signup/email/verify', verificationController.verifyEmailForSignup);

// ============ 로그인 사용자용 (인증 필요) ============

// 이메일 인증 코드 발송
router.post('/email/send', authMiddleware, verificationController.sendEmailCode);

// 이메일 인증 확인
router.post('/email/verify', authMiddleware, verificationController.verifyEmail);

// 휴대폰 인증 코드 발송 (프로필 수정용)
router.post('/phone/send', authMiddleware, verificationController.sendPhoneCode);

// 휴대폰 인증 확인 (프로필 수정용)
router.post('/phone/verify', authMiddleware, verificationController.verifyPhone);

export default router;
