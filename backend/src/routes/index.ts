import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import groupRoutes from './group.routes';
import positionRoutes from './position.routes';
import announcementRoutes from './announcement.routes';
import scheduleRoutes from './schedule.routes';
import notificationRoutes from './notification.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/groups', groupRoutes);
router.use('/groups', positionRoutes); // /groups/:groupId/positions
router.use('/announcements', announcementRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/notifications', notificationRoutes);

export default router;
