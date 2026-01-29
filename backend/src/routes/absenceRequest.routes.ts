import { Router } from 'express';
import { AbsenceRequestController } from '../controllers/absenceRequest.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const controller = new AbsenceRequestController();

// 모든 라우트에 인증 필요
router.use(authenticate);

// 결석 신청 생성
router.post('/groups/:groupId/absence-requests', controller.create);

// 내 결석 신청 목록 조회
router.get('/groups/:groupId/absence-requests/my', controller.getMyRequests);

// 대기 중인 결석 신청 목록 (관리자)
router.get('/groups/:groupId/absence-requests/pending', controller.getPendingRequests);

// 모든 결석 신청 목록 (관리자)
router.get('/groups/:groupId/absence-requests', controller.getAllRequests);

// 결석 신청 승인 (관리자)
router.post('/groups/:groupId/absence-requests/:requestId/approve', controller.approve);

// 결석 신청 거절 (관리자)
router.post('/groups/:groupId/absence-requests/:requestId/reject', controller.reject);

// 결석 신청 취소 (신청자)
router.post('/groups/:groupId/absence-requests/:requestId/cancel', controller.cancel);

export default router;
