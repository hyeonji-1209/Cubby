import { Router } from 'express';
import { LessonRecordController } from '../controllers/lessonRecord.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const controller = new LessonRecordController();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

// 내 수업 기록 조회 (학생용 - note 필드 제외)
router.get('/groups/:groupId/my-lessons', controller.getMyLessons);

// 특정 멤버의 수업 기록 목록 (관리자용)
router.get('/groups/:groupId/members/:memberId/lessons', controller.getByMember);

// 오늘 수업 기록 조회 또는 생성
router.get('/groups/:groupId/members/:memberId/lessons/today', controller.getTodayOrCreate);

// 특정 수업 기록 조회
router.get('/groups/:groupId/members/:memberId/lessons/:recordId', controller.getOne);

// 수업 기록 생성/수정
router.post('/groups/:groupId/members/:memberId/lessons', controller.upsert);

// 수업 기록 삭제
router.delete('/groups/:groupId/members/:memberId/lessons/:recordId', controller.delete);

export default router;
