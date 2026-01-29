import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const controller = new AttendanceController();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

// QR 토큰 생성 (관리자) - 일반 스케줄용
router.post('/groups/:groupId/schedules/:scheduleId/attendance/qr', controller.generateQRToken);

// QR 토큰 생성 (관리자) - 1:1 수업용
router.post('/groups/:groupId/members/:memberId/lesson-qr', controller.generateLessonQRToken);

// QR로 출석 체크
router.post('/attendance/qr-checkin', controller.checkInByQR);

// 수동 출석 체크 (관리자)
router.post('/groups/:groupId/schedules/:scheduleId/attendance', controller.checkInManual);

// 일정별 출석 목록
router.get('/groups/:groupId/schedules/:scheduleId/attendance', controller.getBySchedule);

// 일정별 전체 멤버 출석 현황 (관리자) - 미출석 멤버 포함
router.get('/groups/:groupId/schedules/:scheduleId/attendance/members', controller.getScheduleMembers);

// 내 출석 상태 확인 (특정 일정)
router.get('/groups/:groupId/schedules/:scheduleId/attendance/me', controller.getMyAttendance);

// 내 모든 출석 기록 조회 (그룹 내)
router.get('/groups/:groupId/attendance/me', controller.getMyAllAttendances);

// 특정 멤버의 출석 통계 조회 (관리자)
router.get('/groups/:groupId/members/:userId/attendance-stats', controller.getMemberStats);

// 조퇴 처리 (관리자)
router.patch('/groups/:groupId/attendance/:attendanceId/early-leave', controller.markEarlyLeave);

// 출석 삭제 (관리자)
router.delete('/groups/:groupId/attendance/:attendanceId', controller.delete);

export default router;
