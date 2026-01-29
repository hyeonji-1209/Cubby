import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { ScheduleChangeRequest, ScheduleChangeRequestStatus } from '../models/ScheduleChangeRequest';
import { Schedule } from '../models/Schedule';
import { GroupMember } from '../models/GroupMember';
import { Group } from '../models/Group';
import { AppError } from '../middlewares/error.middleware';
import { requireActiveMember, isAdmin } from '../utils/membership';
import { notificationService } from '../services/notification.service';
import { NotificationType } from '../models/Notification';

export class ScheduleChangeRequestController {
  private requestRepository = AppDataSource.getRepository(ScheduleChangeRequest);
  private scheduleRepository = AppDataSource.getRepository(Schedule);
  private memberRepository = AppDataSource.getRepository(GroupMember);
  private groupRepository = AppDataSource.getRepository(Group);

  // 일정 변경 요청 생성
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, scheduleId } = req.params;
      const { requestedStartAt, requestedEndAt, reason } = req.body;

      // 멤버 확인
      await requireActiveMember(this.memberRepository, groupId, req.user!.id);

      // 일정 확인
      const schedule = await this.scheduleRepository.findOne({
        where: { id: scheduleId, groupId },
      });
      if (!schedule) {
        throw new AppError('일정을 찾을 수 없습니다', 404);
      }

      // 그룹 설정 확인 (당일 변경 허용 여부)
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (group && !group.allowSameDayChange) {
        // 오늘 날짜와 일정 날짜 비교
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduleDate = new Date(schedule.startAt);
        scheduleDate.setHours(0, 0, 0, 0);

        if (scheduleDate.getTime() === today.getTime()) {
          throw new AppError('당일 일정 변경은 허용되지 않습니다', 400);
        }
      }

      // 3주 이내 일정만 변경 요청 가능
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 21); // 3주

      const scheduleDate = new Date(schedule.startAt);
      scheduleDate.setHours(0, 0, 0, 0);

      if (scheduleDate > maxDate) {
        throw new AppError('3주 이내의 수업만 변경 요청할 수 있습니다', 400);
      }

      // 변경 요청 날짜도 3주 이내여야 함
      if (requestedStartAt) {
        const requestedDate = new Date(requestedStartAt);
        requestedDate.setHours(0, 0, 0, 0);
        if (requestedDate > maxDate) {
          throw new AppError('변경 요청 날짜는 3주 이내여야 합니다', 400);
        }
      }

      // 이미 대기 중인 요청이 있는지 확인
      const existingRequest = await this.requestRepository.findOne({
        where: {
          scheduleId,
          requesterId: req.user!.id,
          status: ScheduleChangeRequestStatus.PENDING,
        },
      });
      if (existingRequest) {
        throw new AppError('이미 대기 중인 변경 요청이 있습니다', 409);
      }

      // 요청 생성
      const changeRequest = this.requestRepository.create({
        scheduleId,
        groupId,
        requesterId: req.user!.id,
        requestedStartAt: requestedStartAt ? new Date(requestedStartAt) : undefined,
        requestedEndAt: requestedEndAt ? new Date(requestedEndAt) : undefined,
        reason,
        status: ScheduleChangeRequestStatus.PENDING,
      });

      await this.requestRepository.save(changeRequest);

      // 관리자에게 알림 발송
      await notificationService.notifyGroupAdmins(groupId, {
        type: NotificationType.SCHEDULE_CHANGE_REQUEST,
        title: '일정 변경 요청',
        message: `${req.user!.name}님이 "${schedule.title}" 일정 변경을 요청했습니다.`,
        data: { requestId: changeRequest.id, scheduleId, link: `/groups/${groupId}?tab=schedules` },
        excludeUserId: req.user!.id,
      });

      res.status(201).json({
        success: true,
        data: changeRequest,
        message: '일정 변경 요청이 제출되었습니다',
      });
    } catch (error) {
      next(error);
    }
  };

  // 내 요청 목록 조회
  getMyRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      // 멤버 확인
      await requireActiveMember(this.memberRepository, groupId, req.user!.id);

      const requests = await this.requestRepository.find({
        where: { groupId, requesterId: req.user!.id },
        relations: ['schedule'],
        order: { createdAt: 'DESC' },
      });

      res.json({
        success: true,
        data: requests.map((r) => ({
          id: r.id,
          scheduleId: r.scheduleId,
          scheduleTitle: r.schedule?.title,
          requestedStartAt: r.requestedStartAt,
          requestedEndAt: r.requestedEndAt,
          reason: r.reason,
          status: r.status,
          responseNote: r.responseNote,
          createdAt: r.createdAt,
          respondedAt: r.respondedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  // 대기 중인 요청 목록 (관리자)
  getPendingRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      // 관리자 확인
      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 조회할 수 있습니다', 403);
      }

      const requests = await this.requestRepository.find({
        where: { groupId, status: ScheduleChangeRequestStatus.PENDING },
        relations: ['schedule', 'requester'],
        order: { createdAt: 'ASC' },
      });

      res.json({
        success: true,
        data: requests.map((r) => ({
          id: r.id,
          scheduleId: r.scheduleId,
          scheduleTitle: r.schedule?.title,
          originalStartAt: r.schedule?.startAt,
          originalEndAt: r.schedule?.endAt,
          requestedStartAt: r.requestedStartAt,
          requestedEndAt: r.requestedEndAt,
          reason: r.reason,
          status: r.status,
          requester: {
            id: r.requester?.id,
            name: r.requester?.name,
            profileImage: r.requester?.profileImage,
          },
          createdAt: r.createdAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  // 요청 승인
  approve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, requestId } = req.params;
      const { note } = req.body;

      // 관리자 확인
      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 승인할 수 있습니다', 403);
      }

      const changeRequest = await this.requestRepository.findOne({
        where: { id: requestId, groupId },
        relations: ['schedule'],
      });

      if (!changeRequest) {
        throw new AppError('요청을 찾을 수 없습니다', 404);
      }

      if (changeRequest.status !== ScheduleChangeRequestStatus.PENDING) {
        throw new AppError('이미 처리된 요청입니다', 400);
      }

      // 일정 업데이트
      if (changeRequest.schedule) {
        if (changeRequest.requestedStartAt) {
          changeRequest.schedule.startAt = changeRequest.requestedStartAt;
        }
        if (changeRequest.requestedEndAt) {
          changeRequest.schedule.endAt = changeRequest.requestedEndAt;
        }
        await this.scheduleRepository.save(changeRequest.schedule);
      }

      // 요청 상태 업데이트
      changeRequest.status = ScheduleChangeRequestStatus.APPROVED;
      changeRequest.responseNote = note;
      changeRequest.respondedById = req.user!.id;
      changeRequest.respondedAt = new Date();

      await this.requestRepository.save(changeRequest);

      // 요청자에게 승인 알림
      await notificationService.create({
        userId: changeRequest.requesterId,
        groupId,
        type: NotificationType.SCHEDULE_CHANGE_APPROVED,
        title: '일정 변경 승인',
        message: `"${changeRequest.schedule?.title}" 일정 변경 요청이 승인되었습니다.`,
        data: { requestId: changeRequest.id, scheduleId: changeRequest.scheduleId },
      });

      res.json({
        success: true,
        data: changeRequest,
        message: '일정 변경 요청이 승인되었습니다',
      });
    } catch (error) {
      next(error);
    }
  };

  // 요청 거절
  reject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, requestId } = req.params;
      const { note } = req.body;

      // 관리자 확인
      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 거절할 수 있습니다', 403);
      }

      const changeRequest = await this.requestRepository.findOne({
        where: { id: requestId, groupId },
        relations: ['schedule'],
      });

      if (!changeRequest) {
        throw new AppError('요청을 찾을 수 없습니다', 404);
      }

      if (changeRequest.status !== ScheduleChangeRequestStatus.PENDING) {
        throw new AppError('이미 처리된 요청입니다', 400);
      }

      // 요청 상태 업데이트
      changeRequest.status = ScheduleChangeRequestStatus.REJECTED;
      changeRequest.responseNote = note;
      changeRequest.respondedById = req.user!.id;
      changeRequest.respondedAt = new Date();

      await this.requestRepository.save(changeRequest);

      // 요청자에게 거절 알림
      await notificationService.create({
        userId: changeRequest.requesterId,
        groupId,
        type: NotificationType.SCHEDULE_CHANGE_REJECTED,
        title: '일정 변경 거절',
        message: `"${changeRequest.schedule?.title}" 일정 변경 요청이 거절되었습니다.${note ? ` 사유: ${note}` : ''}`,
        data: { requestId: changeRequest.id, scheduleId: changeRequest.scheduleId },
      });

      res.json({
        success: true,
        data: changeRequest,
        message: '일정 변경 요청이 거절되었습니다',
      });
    } catch (error) {
      next(error);
    }
  };

  // 요청 취소 (요청자)
  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, requestId } = req.params;

      // 멤버 확인
      await requireActiveMember(this.memberRepository, groupId, req.user!.id);

      const changeRequest = await this.requestRepository.findOne({
        where: { id: requestId, groupId, requesterId: req.user!.id },
      });

      if (!changeRequest) {
        throw new AppError('요청을 찾을 수 없습니다', 404);
      }

      if (changeRequest.status !== ScheduleChangeRequestStatus.PENDING) {
        throw new AppError('대기 중인 요청만 취소할 수 있습니다', 400);
      }

      await this.requestRepository.remove(changeRequest);

      res.json({
        success: true,
        message: '일정 변경 요청이 취소되었습니다',
      });
    } catch (error) {
      next(error);
    }
  };
}
