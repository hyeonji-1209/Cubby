import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const userController = new UserController();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

// 내 정보 조회
router.get('/me', userController.getMe);

// 내 정보 수정
router.patch('/me', userController.updateMe);

// 비밀번호 변경
router.patch('/me/password', userController.updatePassword);

// 회원 탈퇴
router.delete('/me', userController.deleteMe);

// 내가 속한 모임 목록
router.get('/me/groups', userController.getMyGroups);

// 내 구독 정보 조회
router.get('/me/subscription', userController.getMySubscription);

// 디바이스 토큰 등록 (FCM 푸시 알림)
router.post('/me/device-token', userController.registerDeviceToken);

// 디바이스 토큰 삭제 (로그아웃 시)
router.delete('/me/device-token', userController.removeDeviceToken);

export default router;
