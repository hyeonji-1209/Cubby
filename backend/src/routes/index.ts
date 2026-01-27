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

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/groups', groupRoutes);
router.use('/groups', positionRoutes); // /groups/:groupId/positions
router.use('/', locationRoutes); // /groups/:groupId/locations
router.use('/', practiceRoomRoutes); // /groups/:groupId/practice-rooms
router.use('/', practiceRoomReservationRoutes); // /groups/:groupId/practice-room-reservations
router.use('/announcements', announcementRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/notifications', notificationRoutes);
router.use('/verification', verificationRoutes);
router.use('/upload', uploadRoutes);

export default router;
