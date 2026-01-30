import { Router } from 'express';
import { ScheduleController } from '../controllers/schedule.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireGroupMember } from '../middlewares/role.middleware';

const router = Router();
const scheduleController = new ScheduleController();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

// 모임의 일정 목록 조회
router.get('/group/:groupId', requireGroupMember, scheduleController.getByGroup);

// 일정 상세 조회
router.get('/:scheduleId', scheduleController.getById);

// 일정 생성 (권한은 컨트롤러에서 확인)
router.post(
  '/group/:groupId',
  requireGroupMember,
  scheduleController.create
);

// 일정 수정
router.patch(
  '/:scheduleId',
  scheduleController.update
);

// 일정 삭제
router.delete(
  '/:scheduleId',
  scheduleController.delete
);

// 내 일정 전체 조회 (모든 모임)
router.get('/my/all', scheduleController.getMySchedules);

export default router;
