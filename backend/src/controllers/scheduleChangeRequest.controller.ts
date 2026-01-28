import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { ScheduleChangeRequest, ScheduleChangeRequestStatus } from '../models/ScheduleChangeRequest';
import { Schedule } from '../models/Schedule';
import { GroupMember } from '../models/GroupMember';
import { AppError } from '../middlewares/error.middleware';
import { requireActiveMember, isAdmin } from '../utils/membership';

export class ScheduleChangeRequestController {
  private requestRepository = AppDataSource.getRepository(ScheduleChangeRequest);
  private scheduleRepository = AppDataSource.getRepository(Schedule);
  private memberRepository = AppDataSource.getRepository(GroupMember);

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
