import { Router } from 'express';
import { lessonRoomController } from '../controllers/lessonRoom.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

// 레슨실 목록 조회
router.get('/groups/:groupId/lesson-rooms', lessonRoomController.getByGroup);

// 레슨실 생성
router.post('/groups/:groupId/lesson-rooms', lessonRoomController.create);

// 레슨실 순서 변경
router.put('/groups/:groupId/lesson-rooms/reorder', lessonRoomController.reorder);

// 레슨실 충돌 검사
router.get('/groups/:groupId/lesson-rooms/:roomId/conflicts', lessonRoomController.checkConflicts);

// 레슨실 스케줄 조회
router.get('/groups/:groupId/lesson-rooms/:roomId/schedule', lessonRoomController.getSchedule);

// 레슨실 수정
router.put('/groups/:groupId/lesson-rooms/:roomId', lessonRoomController.update);

// 레슨실 삭제
router.delete('/groups/:groupId/lesson-rooms/:roomId', lessonRoomController.delete);

export default router;
