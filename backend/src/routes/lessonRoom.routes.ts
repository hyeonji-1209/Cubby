import { Router } from 'express';
import { lessonRoomController } from '../controllers/lessonRoom.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

// 수업실 목록 조회
router.get('/groups/:groupId/lesson-rooms', lessonRoomController.getByGroup);

// 수업실 생성
router.post('/groups/:groupId/lesson-rooms', lessonRoomController.create);

// 수업실 순서 변경
router.put('/groups/:groupId/lesson-rooms/reorder', lessonRoomController.reorder);

// 수업실 충돌 검사
router.get('/groups/:groupId/lesson-rooms/:roomId/conflicts', lessonRoomController.checkConflicts);

// 수업실 스케줄 조회
router.get('/groups/:groupId/lesson-rooms/:roomId/schedule', lessonRoomController.getSchedule);

// 수업실 수정
router.put('/groups/:groupId/lesson-rooms/:roomId', lessonRoomController.update);

// 수업실 삭제
router.delete('/groups/:groupId/lesson-rooms/:roomId', lessonRoomController.delete);

// ===== 예약 관련 라우트 =====

// 예약 목록 조회 (날짜 범위)
router.get('/groups/:groupId/lesson-room-reservations', lessonRoomController.getReservations);

// 내 예약 목록 조회
router.get('/groups/:groupId/lesson-room-reservations/my', lessonRoomController.getMyReservations);

// 특정 수업실의 예약 가능 시간 조회
router.get('/groups/:groupId/lesson-rooms/:roomId/available-slots', lessonRoomController.getAvailableSlots);

// 예약 생성
router.post('/groups/:groupId/lesson-room-reservations', lessonRoomController.createReservation);

// 예약 취소
router.delete('/groups/:groupId/lesson-room-reservations/:reservationId', lessonRoomController.cancelReservation);

export default router;
