import { Router } from 'express';
import { PracticeRoomController } from '../controllers/practiceRoom.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const practiceRoomController = new PracticeRoomController();

// 모든 라우트는 인증 필요
router.use(authMiddleware);

// 연습실 목록 조회
router.get('/groups/:groupId/practice-rooms', practiceRoomController.getList);

// 연습실 생성
router.post('/groups/:groupId/practice-rooms', practiceRoomController.create);

// 연습실 순서 변경
router.patch('/groups/:groupId/practice-rooms/reorder', practiceRoomController.reorder);

// 연습실 수정
router.patch('/groups/:groupId/practice-rooms/:roomId', practiceRoomController.update);

// 연습실 삭제
router.delete('/groups/:groupId/practice-rooms/:roomId', practiceRoomController.delete);

export default router;
