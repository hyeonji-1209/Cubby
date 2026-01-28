import { Router } from 'express';
import { ScheduleChangeRequestController } from '../controllers/scheduleChangeRequest.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const controller = new ScheduleChangeRequestController();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

// 일정 변경 요청 생성
router.post('/groups/:groupId/schedules/:scheduleId/change-requests', controller.create);

// 내 요청 목록
router.get('/groups/:groupId/schedule-change-requests/me', controller.getMyRequests);

// 대기 중인 요청 목록 (관리자)
router.get('/groups/:groupId/schedule-change-requests/pending', controller.getPendingRequests);

// 요청 승인 (관리자)
router.post('/groups/:groupId/schedule-change-requests/:requestId/approve', controller.approve);

// 요청 거절 (관리자)
router.post('/groups/:groupId/schedule-change-requests/:requestId/reject', controller.reject);

// 요청 취소 (요청자)
router.delete('/groups/:groupId/schedule-change-requests/:requestId', controller.cancel);

export default router;
