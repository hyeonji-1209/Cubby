import { Router } from 'express';
import { holidayController } from '../controllers/holiday.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

// 휴일 목록 조회
router.get('/groups/:groupId/holidays', holidayController.getByGroup);

// 특정 날짜 휴일 확인
router.get('/groups/:groupId/holidays/check', holidayController.checkDate);

// 휴일 생성
router.post('/groups/:groupId/holidays', holidayController.create);

// 휴일 수정
router.patch('/groups/:groupId/holidays/:holidayId', holidayController.update);

// 휴일 삭제
router.delete('/groups/:groupId/holidays/:holidayId', holidayController.delete);

export default router;
