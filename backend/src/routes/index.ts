import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import groupRoutes from './group.routes';
import positionRoutes from './position.routes';
import announcementRoutes from './announcement.routes';
import scheduleRoutes from './schedule.routes';
import notificationRoutes from './notification.routes';
import verificationRoutes from './verification.routes';
import uploadRoutes from './upload.routes';
import locationRoutes from './location.routes';
import practiceRoomRoutes from './practiceRoom.routes';
import practiceRoomReservationRoutes from './practiceRoomReservation.routes';
import attendanceRoutes from './attendance.routes';
import scheduleChangeRequestRoutes from './scheduleChangeRequest.routes';
import lessonRecordRoutes from './lessonRecord.routes';
import subgroupMemberRoutes from './subgroupMember.routes';
import lessonRoomRoutes from './lessonRoom.routes';
import absenceRequestRoutes from './absenceRequest.routes';
import holidayRoutes from './holiday.routes';
import cronRoutes from './cron.routes';

const router = Router();

// ============ 인증 불필요 라우트 (먼저 등록) ============
router.use('/auth', authRoutes);
router.use('/verification', verificationRoutes);

// ============ 인증 필요 라우트 ============
router.use('/users', userRoutes);
router.use('/groups', groupRoutes);
router.use('/groups', positionRoutes); // /groups/:groupId/positions
router.use('/announcements', announcementRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/notifications', notificationRoutes);
router.use('/upload', uploadRoutes);

// ============ '/'로 마운트되는 라우트 (가장 마지막에 등록) ============
// 이 라우터들은 router.use(authMiddleware)를 사용하므로 마지막에 등록
router.use('/', locationRoutes); // /groups/:groupId/locations
router.use('/', practiceRoomRoutes); // /groups/:groupId/practice-rooms
router.use('/', practiceRoomReservationRoutes); // /groups/:groupId/practice-room-reservations
router.use('/', attendanceRoutes); // /groups/:groupId/schedules/:scheduleId/attendance
router.use('/', scheduleChangeRequestRoutes); // /groups/:groupId/schedule-change-requests
router.use('/', lessonRecordRoutes); // /groups/:groupId/members/:memberId/lessons
router.use('/', subgroupMemberRoutes); // /groups/:groupId/instructor-subgroups
router.use('/', lessonRoomRoutes); // /groups/:groupId/lesson-rooms
router.use('/', absenceRequestRoutes); // /groups/:groupId/absence-requests
router.use('/', holidayRoutes); // /groups/:groupId/holidays
router.use('/cron', cronRoutes); // /cron/payment-reminders

export default router;
