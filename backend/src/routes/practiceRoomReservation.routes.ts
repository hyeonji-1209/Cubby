import { Router } from 'express';
import { PracticeRoomReservationController } from '../controllers/practiceRoomReservation.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const controller = new PracticeRoomReservationController();

// 모든 라우트는 인증 필요
router.use(authMiddleware);

// 특정 날짜의 예약 목록 조회
router.get('/groups/:groupId/practice-room-reservations/date/:date', controller.getByDate);

// 내 예약 목록 조회
router.get('/groups/:groupId/practice-room-reservations/my', controller.getMyReservations);

// 예약 생성
router.post('/groups/:groupId/practice-room-reservations', controller.create);

// 예약 취소
router.delete('/groups/:groupId/practice-room-reservations/:reservationId', controller.cancel);

export default router;
