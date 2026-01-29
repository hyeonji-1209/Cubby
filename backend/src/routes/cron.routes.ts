import { Router, Request, Response } from 'express';
import { paymentReminderService } from '../services/paymentReminder.service';
import { lessonReminderService } from '../services/lessonReminder.service';
import { holidayReminderService } from '../services/holidayReminder.service';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

/**
 * 크론 작업 API (관리자 또는 시스템 호출용)
 * 실제 운영 환경에서는 서버 크론잡에서 호출하거나
 * AWS Lambda, Cloud Functions 등에서 스케줄링
 */

// 수강료 납부 알림 발송 (일일 실행용)
router.post('/payment-reminders', authenticate, async (req: Request, res: Response) => {
  try {
    // 관리자만 실행 가능 (실제로는 시스템 계정 또는 API 키 체크)
    const result = await paymentReminderService.checkAndSendReminders();
    res.json({
      success: true,
      message: `납부 알림 발송 완료: ${result.sent}건 성공, ${result.errors}건 실패`,
      data: result,
    });
  } catch (error) {
    console.error('Failed to send payment reminders:', error);
    res.status(500).json({
      success: false,
      message: '납부 알림 발송 중 오류가 발생했습니다.',
    });
  }
});

// 특정 그룹의 납부 알림 수동 발송
router.post('/groups/:groupId/payment-reminders', authenticate, async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const result = await paymentReminderService.sendGroupReminders(groupId);
    res.json({
      success: true,
      message: `납부 알림 발송 완료: ${result.sent}건 성공, ${result.errors}건 실패`,
      data: result,
    });
  } catch (error) {
    console.error('Failed to send group payment reminders:', error);
    res.status(500).json({
      success: false,
      message: '납부 알림 발송 중 오류가 발생했습니다.',
    });
  }
});

// 수업실 미배정 알림 발송 (일일 실행용) - 2일 후 수업 대상
router.post('/lesson-room-reminders', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await lessonReminderService.checkAndSendLessonRoomReminders();
    res.json({
      success: true,
      message: `수업실 배정 알림 발송 완료: ${result.sent}건 성공, ${result.errors}건 실패`,
      data: result,
    });
  } catch (error) {
    console.error('Failed to send lesson room reminders:', error);
    res.status(500).json({
      success: false,
      message: '수업실 배정 알림 발송 중 오류가 발생했습니다.',
    });
  }
});

// 특정 그룹의 수업실 미배정 알림 수동 발송
router.post('/groups/:groupId/lesson-room-reminders', authenticate, async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const result = await lessonReminderService.sendGroupLessonReminders(groupId);
    res.json({
      success: true,
      message: `수업실 배정 알림 발송 완료: ${result.sent}건 성공, ${result.errors}건 실패`,
      data: result,
    });
  } catch (error) {
    console.error('Failed to send group lesson room reminders:', error);
    res.status(500).json({
      success: false,
      message: '수업실 배정 알림 발송 중 오류가 발생했습니다.',
    });
  }
});

// 당일 수업실 입장 알림 발송 (오전에 실행 - 학생에게 오늘 수업 정보 안내)
router.post('/today-lesson-entries', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await lessonReminderService.sendTodayLessonEntryNotifications();
    res.json({
      success: true,
      message: `수업실 입장 알림 발송 완료: ${result.sent}건 성공, ${result.errors}건 실패`,
      data: result,
    });
  } catch (error) {
    console.error('Failed to send today lesson entry notifications:', error);
    res.status(500).json({
      success: false,
      message: '수업실 입장 알림 발송 중 오류가 발생했습니다.',
    });
  }
});

// 휴일 1주일 전 알림 발송 (일일 실행용)
router.post('/holiday-reminders', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await holidayReminderService.checkAndSendHolidayReminders();
    res.json({
      success: true,
      message: `휴일 알림 발송 완료: ${result.sent}건 성공, ${result.errors}건 실패`,
      data: result,
    });
  } catch (error) {
    console.error('Failed to send holiday reminders:', error);
    res.status(500).json({
      success: false,
      message: '휴일 알림 발송 중 오류가 발생했습니다.',
    });
  }
});

export default router;
