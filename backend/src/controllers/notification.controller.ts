import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';

export class NotificationController {
  // 내 알림 목록 조회
  getMyNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unreadOnly === 'true';

      const notifications = await notificationService.getUserNotifications(userId, limit, offset, unreadOnly);
      const unreadCount = await notificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: {
          notifications,
          unreadCount,
          pagination: { limit, offset },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 읽지 않은 알림 개수
  getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const count = await notificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { unreadCount: count },
      });
    } catch (error) {
      next(error);
    }
  };

  // 알림 읽음 처리
  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { notificationId } = req.params;

      await notificationService.markAsRead(notificationId, userId);

      res.json({
        success: true,
        message: '알림을 읽음 처리했습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 모든 알림 읽음 처리
  markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      await notificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: '모든 알림을 읽음 처리했습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 알림 삭제
  deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { notificationId } = req.params;

      await notificationService.deleteNotification(notificationId, userId);

      res.json({
        success: true,
        message: '알림이 삭제되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 모든 알림 삭제
  deleteAllNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      await notificationService.deleteAllNotifications(userId);

      res.json({
        success: true,
        message: '모든 알림이 삭제되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };
}
