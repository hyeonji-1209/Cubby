import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const notificationController = new NotificationController();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

// 내 알림 목록 조회
router.get('/', notificationController.getMyNotifications);

// 읽지 않은 알림 개수
router.get('/unread-count', notificationController.getUnreadCount);

// 모든 알림 읽음 처리
router.post('/read-all', notificationController.markAllAsRead);

// 모든 알림 삭제
router.delete('/all', notificationController.deleteAllNotifications);

// 특정 알림 읽음 처리
router.post('/:notificationId/read', notificationController.markAsRead);

// 특정 알림 삭제
router.delete('/:notificationId', notificationController.deleteNotification);

export default router;
