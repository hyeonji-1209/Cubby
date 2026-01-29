import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { AbsenceRequest, AbsenceRequestStatus, AbsenceType } from '../models/AbsenceRequest';
import { GroupMember, MemberRole, MemberStatus } from '../models/GroupMember';
import { Group } from '../models/Group';
import { Attendance, AttendanceStatus } from '../models/Attendance';
import { AppError } from '../middlewares/error.middleware';
import { requireActiveMember, isAdmin } from '../utils/membership';
import { notificationService } from '../services/notification.service';
import { NotificationType } from '../models/Notification';

export class AbsenceRequestController {
  private requestRepository = AppDataSource.getRepository(AbsenceRequest);
  private memberRepository = AppDataSource.getRepository(GroupMember);
  private groupRepository = AppDataSource.getRepository(Group);
  private attendanceRepository = AppDataSource.getRepository(Attendance);

  // 결석 신청 생성
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { subGroupId, scheduleId, absenceDate, absenceType, reason, studentId } = req.body;

      // 멤버 확인
      const membership = await requireActiveMember(this.memberRepository, groupId, req.user!.id);

      // 보호자가 대신 신청하는 경우 검증
      const actualStudentId = studentId || req.user!.id;
      if (studentId && membership.role !== MemberRole.GUARDIAN) {
        throw new AppError('보호자만 자녀를 대신해 결석 신청을 할 수 있습니다.', 403);
      }

      // 이미 해당 날짜에 대한 대기 중인 요청이 있는지 확인
      const existingRequest = await this.requestRepository.findOne({
        where: {
          groupId,
          requesterId: req.user!.id,
          studentId: studentId || undefined,
          absenceDate: new Date(absenceDate),
          status: AbsenceRequestStatus.PENDING,
        },
      });
      if (existingRequest) {
        throw new AppError('해당 날짜에 이미 대기 중인 결석 신청이 있습니다.', 409);
      }

      // 요청 생성
      const absenceRequest = this.requestRepository.create({
        groupId,
        subGroupId,
        scheduleId,
        requesterId: req.user!.id,
        studentId: studentId || null,
        absenceDate: new Date(absenceDate),
        absenceType: absenceType || AbsenceType.PERSONAL,
        reason,
        status: AbsenceRequestStatus.PENDING,
      });

      await this.requestRepository.save(absenceRequest);

      // 관리자에게 알림
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      await notificationService.notifyGroupAdmins(groupId, {
        type: NotificationType.ABSENCE_REQUEST,
        title: '결석 신청',
        message: `${req.user!.name}님이 ${new Date(absenceDate).toLocaleDateString('ko-KR')} 결석을 신청했습니다.`,
        data: { requestId: absenceRequest.id, absenceDate },
        excludeUserId: req.user!.id,
      });

      res.status(201).json({
        success: true,
        data: absenceRequest,
        message: '결석 신청이 제출되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 내 결석 신청 목록 조회
  getMyRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { status } = req.query;

      await requireActiveMember(this.memberRepository, groupId, req.user!.id);

      const queryBuilder = this.requestRepository
        .createQueryBuilder('request')
        .leftJoinAndSelect('request.schedule', 'schedule')
        .leftJoinAndSelect('request.subGroup', 'subGroup')
        .leftJoinAndSelect('request.student', 'student')
        .where('request.groupId = :groupId', { groupId })
        .andWhere('request.requesterId = :requesterId', { requesterId: req.user!.id });

      if (status) {
        queryBuilder.andWhere('request.status = :status', { status });
      }

      const requests = await queryBuilder.orderBy('request.createdAt', 'DESC').getMany();

      res.json({
        success: true,
        data: requests.map((r) => ({
          id: r.id,
          absenceDate: r.absenceDate,
          absenceType: r.absenceType,
          reason: r.reason,
          status: r.status,
          responseNote: r.responseNote,
          scheduleId: r.scheduleId,
          scheduleTitle: r.schedule?.title,
          subGroupId: r.subGroupId,
          subGroupName: r.subGroup?.name,
          studentId: r.studentId,
          studentName: r.student?.name,
          createdAt: r.createdAt,
          respondedAt: r.respondedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  // 대기 중인 결석 신청 목록 (관리자)
  getPendingRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 조회할 수 있습니다.', 403);
      }

      const requests = await this.requestRepository.find({
        where: { groupId, status: AbsenceRequestStatus.PENDING },
        relations: ['requester', 'student', 'schedule', 'subGroup'],
        order: { absenceDate: 'ASC', createdAt: 'ASC' },
      });

      res.json({
        success: true,
        data: requests.map((r) => ({
          id: r.id,
          absenceDate: r.absenceDate,
          absenceType: r.absenceType,
          reason: r.reason,
          status: r.status,
          scheduleId: r.scheduleId,
          scheduleTitle: r.schedule?.title,
          subGroupId: r.subGroupId,
          subGroupName: r.subGroup?.name,
          requester: {
            id: r.requester?.id,
            name: r.requester?.name,
            profileImage: r.requester?.profileImage,
          },
          student: r.student
            ? {
                id: r.student.id,
                name: r.student.name,
                profileImage: r.student.profileImage,
              }
            : null,
          createdAt: r.createdAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  // 모든 결석 신청 목록 (관리자)
  getAllRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { status, startDate, endDate } = req.query;

      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 조회할 수 있습니다.', 403);
      }

      const queryBuilder = this.requestRepository
        .createQueryBuilder('request')
        .leftJoinAndSelect('request.requester', 'requester')
        .leftJoinAndSelect('request.student', 'student')
        .leftJoinAndSelect('request.schedule', 'schedule')
        .leftJoinAndSelect('request.subGroup', 'subGroup')
        .where('request.groupId = :groupId', { groupId });

      if (status) {
        queryBuilder.andWhere('request.status = :status', { status });
      }

      if (startDate) {
        queryBuilder.andWhere('request.absenceDate >= :startDate', { startDate });
      }

      if (endDate) {
        queryBuilder.andWhere('request.absenceDate <= :endDate', { endDate });
      }

      const requests = await queryBuilder.orderBy('request.absenceDate', 'DESC').getMany();

      res.json({
        success: true,
        data: requests.map((r) => ({
          id: r.id,
          absenceDate: r.absenceDate,
          absenceType: r.absenceType,
          reason: r.reason,
          status: r.status,
          responseNote: r.responseNote,
          scheduleId: r.scheduleId,
          scheduleTitle: r.schedule?.title,
          subGroupId: r.subGroupId,
          subGroupName: r.subGroup?.name,
          requester: {
            id: r.requester?.id,
            name: r.requester?.name,
            profileImage: r.requester?.profileImage,
          },
          student: r.student
            ? {
                id: r.student.id,
                name: r.student.name,
                profileImage: r.student.profileImage,
              }
            : null,
          createdAt: r.createdAt,
          respondedAt: r.respondedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  // 결석 신청 승인
  approve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, requestId } = req.params;
      const { note } = req.body;

      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 승인할 수 있습니다.', 403);
      }

      const absenceRequest = await this.requestRepository.findOne({
        where: { id: requestId, groupId },
        relations: ['schedule'],
      });

      if (!absenceRequest) {
        throw new AppError('결석 신청을 찾을 수 없습니다.', 404);
      }

      if (absenceRequest.status !== AbsenceRequestStatus.PENDING) {
        throw new AppError('이미 처리된 신청입니다.', 400);
      }

      // 승인 처리
      absenceRequest.status = AbsenceRequestStatus.APPROVED;
      absenceRequest.responseNote = note;
      absenceRequest.respondedById = req.user!.id;
      absenceRequest.respondedAt = new Date();

      await this.requestRepository.save(absenceRequest);

      // 일정이 있으면 출석 기록에 사유결석으로 표시
      if (absenceRequest.scheduleId) {
        const studentId = absenceRequest.studentId || absenceRequest.requesterId;
        const existingAttendance = await this.attendanceRepository.findOne({
          where: { scheduleId: absenceRequest.scheduleId, userId: studentId },
        });

        if (existingAttendance) {
          existingAttendance.status = AttendanceStatus.EXCUSED;
          existingAttendance.note = absenceRequest.reason;
          await this.attendanceRepository.save(existingAttendance);
        } else {
          const attendance = this.attendanceRepository.create({
            scheduleId: absenceRequest.scheduleId,
            groupId,
            userId: studentId,
            status: AttendanceStatus.EXCUSED,
            note: absenceRequest.reason,
            checkedById: req.user!.id,
          });
          await this.attendanceRepository.save(attendance);
        }
      }

      // 신청자에게 알림
      await notificationService.create({
        userId: absenceRequest.requesterId,
        groupId,
        type: NotificationType.ABSENCE_APPROVED,
        title: '결석 신청 승인',
        message: `${new Date(absenceRequest.absenceDate).toLocaleDateString('ko-KR')} 결석 신청이 승인되었습니다.`,
        data: { requestId: absenceRequest.id },
      });

      res.json({
        success: true,
        data: absenceRequest,
        message: '결석 신청이 승인되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 결석 신청 거절
  reject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, requestId } = req.params;
      const { note } = req.body;

      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 거절할 수 있습니다.', 403);
      }

      const absenceRequest = await this.requestRepository.findOne({
        where: { id: requestId, groupId },
      });

      if (!absenceRequest) {
        throw new AppError('결석 신청을 찾을 수 없습니다.', 404);
      }

      if (absenceRequest.status !== AbsenceRequestStatus.PENDING) {
        throw new AppError('이미 처리된 신청입니다.', 400);
      }

      // 거절 처리
      absenceRequest.status = AbsenceRequestStatus.REJECTED;
      absenceRequest.responseNote = note;
      absenceRequest.respondedById = req.user!.id;
      absenceRequest.respondedAt = new Date();

      await this.requestRepository.save(absenceRequest);

      // 신청자에게 알림
      await notificationService.create({
        userId: absenceRequest.requesterId,
        groupId,
        type: NotificationType.ABSENCE_REJECTED,
        title: '결석 신청 거절',
        message: `${new Date(absenceRequest.absenceDate).toLocaleDateString('ko-KR')} 결석 신청이 거절되었습니다.${note ? ` 사유: ${note}` : ''}`,
        data: { requestId: absenceRequest.id },
      });

      res.json({
        success: true,
        data: absenceRequest,
        message: '결석 신청이 거절되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 결석 신청 취소 (신청자)
  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, requestId } = req.params;

      await requireActiveMember(this.memberRepository, groupId, req.user!.id);

      const absenceRequest = await this.requestRepository.findOne({
        where: { id: requestId, groupId, requesterId: req.user!.id },
      });

      if (!absenceRequest) {
        throw new AppError('결석 신청을 찾을 수 없습니다.', 404);
      }

      if (absenceRequest.status !== AbsenceRequestStatus.PENDING) {
        throw new AppError('대기 중인 신청만 취소할 수 있습니다.', 400);
      }

      absenceRequest.status = AbsenceRequestStatus.CANCELLED;
      await this.requestRepository.save(absenceRequest);

      res.json({
        success: true,
        message: '결석 신청이 취소되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };
}
