import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Attendance, AttendanceStatus } from '../models/Attendance';
import { Schedule } from '../models/Schedule';
import { Group } from '../models/Group';
import { GroupMember, MemberStatus } from '../models/GroupMember';
import { SubGroupMember } from '../models/SubGroupMember';
import { AbsenceRequest, AbsenceRequestStatus } from '../models/AbsenceRequest';
import { AppError } from '../middlewares/error.middleware';
import { requireActiveMember, isAdmin } from '../utils/membership';

// QR 코드용 임시 토큰 저장 (실제로는 Redis 사용 권장)
interface QRTokenData {
  groupId: string;
  expiresAt: Date;
  // 일반 스케줄용
  scheduleId?: string;
  // 1:1 수업용
  memberId?: string;
  lessonDate?: string; // YYYY-MM-DD
  lessonStartTime?: string; // HH:mm
  lessonEndTime?: string; // HH:mm
}
const qrTokens = new Map<string, QRTokenData>();

// 1:1 수업용 토큰 역 조회 (lessonKey -> token)
// 수업마다 동일한 QR 유지를 위해 사용
const lessonTokenLookup = new Map<string, string>();

export class AttendanceController {
  private attendanceRepository = AppDataSource.getRepository(Attendance);
  private scheduleRepository = AppDataSource.getRepository(Schedule);
  private groupRepository = AppDataSource.getRepository(Group);
  private memberRepository = AppDataSource.getRepository(GroupMember);
  private subGroupMemberRepository = AppDataSource.getRepository(SubGroupMember);
  private absenceRequestRepository = AppDataSource.getRepository(AbsenceRequest);

  // QR 토큰 생성 (관리자만)
  generateQRToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, scheduleId } = req.params;

      // 관리자 확인
      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 QR 코드를 생성할 수 있습니다', 403);
      }

      // 그룹 출석 기능 확인
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (!group?.hasAttendance) {
        throw new AppError('출석 기능이 활성화되지 않은 모임입니다', 400);
      }

      // 일정 확인
      const schedule = await this.scheduleRepository.findOne({
        where: { id: scheduleId, groupId },
      });
      if (!schedule) {
        throw new AppError('일정을 찾을 수 없습니다', 404);
      }

      // QR 토큰 생성 (5분 유효)
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      qrTokens.set(token, { scheduleId, groupId, expiresAt });

      // 만료된 토큰 정리
      setTimeout(() => {
        qrTokens.delete(token);
      }, 5 * 60 * 1000);

      res.json({
        success: true,
        data: {
          token,
          expiresAt,
          scheduleId,
          scheduleName: schedule.title,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 1:1 수업용 QR 토큰 생성 (관리자)
  generateLessonQRToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, memberId } = req.params;

      // 관리자 확인
      const adminMember = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(adminMember)) {
        throw new AppError('관리자만 QR 코드를 생성할 수 있습니다', 403);
      }

      // 그룹 확인 (1:1 교육 그룹 + 출석 기능 활성화)
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (!group) {
        throw new AppError('모임을 찾을 수 없습니다', 404);
      }
      if (group.type !== 'education' || group.hasClasses) {
        throw new AppError('1:1 수업 그룹만 지원됩니다', 400);
      }
      if (!group.hasAttendance) {
        throw new AppError('출석 기능이 활성화되지 않은 모임입니다', 400);
      }

      // 대상 멤버 확인
      const targetMember = await this.memberRepository.findOne({
        where: { groupId, userId: memberId },
        relations: ['user'],
      });
      if (!targetMember) {
        throw new AppError('멤버를 찾을 수 없습니다', 404);
      }

      // 오늘 요일에 해당하는 수업 스케줄 찾기
      const now = new Date();
      const todayDayOfWeek = now.getDay();
      const todayDateStr = now.toISOString().split('T')[0];

      const lessonSchedule = targetMember.lessonSchedule || [];
      const todayLesson = lessonSchedule.find(l => l.dayOfWeek === todayDayOfWeek);

      if (!todayLesson) {
        throw new AppError('오늘 예정된 수업이 없습니다', 400);
      }

      // 수업 시간 확인 (10분 전 ~ 수업 종료)
      const [startHour, startMin] = todayLesson.startTime.split(':').map(Number);
      const [endHour, endMin] = todayLesson.endTime.split(':').map(Number);

      const lessonStart = new Date(now);
      lessonStart.setHours(startHour, startMin, 0, 0);

      const lessonEnd = new Date(now);
      lessonEnd.setHours(endHour, endMin, 0, 0);

      const tenMinutesBefore = new Date(lessonStart.getTime() - 10 * 60 * 1000);

      if (now < tenMinutesBefore || now > lessonEnd) {
        throw new AppError('수업 시간이 아닙니다 (수업 시작 10분 전부터 종료까지)', 400);
      }

      // 수업별 고유 키 (멤버 + 날짜 + 시작시간)
      const lessonKey = `${memberId}-${todayDateStr}-${todayLesson.startTime}`;

      // 기존 토큰이 있는지 확인
      const existingToken = lessonTokenLookup.get(lessonKey);
      if (existingToken) {
        const existingData = qrTokens.get(existingToken);
        // 토큰이 아직 유효하면 기존 토큰 반환
        if (existingData && new Date() < existingData.expiresAt) {
          res.json({
            success: true,
            data: {
              token: existingToken,
              expiresAt: existingData.expiresAt,
              memberName: targetMember.user?.name || targetMember.nickname,
              lessonTime: `${todayLesson.startTime} - ${todayLesson.endTime}`,
            },
          });
          return;
        }
        // 만료된 토큰이면 정리
        qrTokens.delete(existingToken);
        lessonTokenLookup.delete(lessonKey);
      }

      // 새 QR 토큰 생성 (수업 종료시간까지 유효)
      const token = randomBytes(32).toString('hex');
      const expiresAt = lessonEnd; // 수업 종료시간까지 유효

      qrTokens.set(token, {
        groupId,
        memberId,
        lessonDate: todayDateStr,
        lessonStartTime: todayLesson.startTime,
        lessonEndTime: todayLesson.endTime,
        expiresAt,
      });

      // 역조회 저장
      lessonTokenLookup.set(lessonKey, token);

      // 수업 종료 시 토큰 정리
      const timeUntilEnd = lessonEnd.getTime() - now.getTime();
      setTimeout(() => {
        qrTokens.delete(token);
        lessonTokenLookup.delete(lessonKey);
      }, timeUntilEnd);

      res.json({
        success: true,
        data: {
          token,
          expiresAt,
          memberName: targetMember.user?.name || targetMember.nickname,
          lessonTime: `${todayLesson.startTime} - ${todayLesson.endTime}`,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // QR 스캔으로 출석 체크
  checkInByQR = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;

      if (!token) {
        throw new AppError('QR 토큰이 필요합니다', 400);
      }

      // 토큰 확인
      const tokenData = qrTokens.get(token);
      if (!tokenData) {
        throw new AppError('유효하지 않거나 만료된 QR 코드입니다', 400);
      }

      if (new Date() > tokenData.expiresAt) {
        qrTokens.delete(token);
        throw new AppError('만료된 QR 코드입니다', 400);
      }

      const { groupId } = tokenData;
      const now = new Date();

      // 멤버 확인
      await requireActiveMember(this.memberRepository, groupId, req.user!.id);

      // 1:1 수업 QR인 경우
      if (tokenData.memberId) {
        // 본인 QR인지 확인
        if (tokenData.memberId !== req.user!.id) {
          throw new AppError('본인의 QR 코드가 아닙니다', 403);
        }

        // 가상 스케줄 ID 생성 (날짜 + 시간 기반)
        const virtualScheduleId = `lesson-${tokenData.memberId}-${tokenData.lessonDate}-${tokenData.lessonStartTime}`;

        // 이미 출석했는지 확인
        const existing = await this.attendanceRepository.findOne({
          where: { scheduleId: virtualScheduleId, userId: req.user!.id },
        });

        if (existing) {
          throw new AppError('이미 출석 처리되었습니다', 409);
        }

        // 지각 여부 확인
        const [startHour, startMin] = tokenData.lessonStartTime!.split(':').map(Number);
        const lessonStart = new Date(tokenData.lessonDate!);
        lessonStart.setHours(startHour, startMin, 0, 0);
        const isLate = now > lessonStart;

        // 출석 기록 생성
        const attendance = this.attendanceRepository.create({
          scheduleId: virtualScheduleId,
          groupId,
          userId: req.user!.id,
          status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
          checkedAt: now,
        });

        await this.attendanceRepository.save(attendance);

        // 토큰 사용 완료 - 삭제
        qrTokens.delete(token);
        // 역조회 맵에서도 삭제
        const lessonKey = `${tokenData.memberId}-${tokenData.lessonDate}-${tokenData.lessonStartTime}`;
        lessonTokenLookup.delete(lessonKey);

        res.json({
          success: true,
          data: {
            id: attendance.id,
            status: attendance.status,
            checkedAt: attendance.checkedAt,
            scheduleName: `${tokenData.lessonStartTime} 수업`,
          },
          message: isLate ? '지각 처리되었습니다' : '출석 완료되었습니다',
        });
        return;
      }

      // 일반 스케줄 QR인 경우
      const { scheduleId } = tokenData;

      // 일정 확인
      const schedule = await this.scheduleRepository.findOne({
        where: { id: scheduleId },
      });
      if (!schedule) {
        throw new AppError('일정을 찾을 수 없습니다', 404);
      }

      // 이미 출석했는지 확인
      const existing = await this.attendanceRepository.findOne({
        where: { scheduleId, userId: req.user!.id },
      });

      if (existing) {
        throw new AppError('이미 출석 처리되었습니다', 409);
      }

      // 지각 여부 확인 (일정 시작 시간 이후면 지각)
      const isLate = now > schedule.startAt;

      // 출석 기록 생성
      const attendance = this.attendanceRepository.create({
        scheduleId,
        groupId,
        userId: req.user!.id,
        status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
        checkedAt: now,
      });

      await this.attendanceRepository.save(attendance);

      // 토큰 사용 완료 - 삭제
      qrTokens.delete(token);

      res.json({
        success: true,
        data: {
          id: attendance.id,
          status: attendance.status,
          checkedAt: attendance.checkedAt,
          scheduleName: schedule.title,
        },
        message: isLate ? '지각 처리되었습니다' : '출석 완료되었습니다',
      });
    } catch (error) {
      next(error);
    }
  };

  // 수동 출석 체크 (관리자)
  checkInManual = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, scheduleId } = req.params;
      const { userId, status, note } = req.body;

      // 관리자 확인
      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 수동 출석 처리할 수 있습니다', 403);
      }

      // 대상 멤버 확인
      await requireActiveMember(this.memberRepository, groupId, userId);

      // 일정 확인
      const schedule = await this.scheduleRepository.findOne({
        where: { id: scheduleId, groupId },
      });
      if (!schedule) {
        throw new AppError('일정을 찾을 수 없습니다', 404);
      }

      // 기존 출석 기록 확인
      let attendance = await this.attendanceRepository.findOne({
        where: { scheduleId, userId },
      });

      if (attendance) {
        // 업데이트
        attendance.status = status || attendance.status;
        attendance.note = note ?? attendance.note;
        attendance.checkedById = req.user!.id;
      } else {
        // 생성
        attendance = this.attendanceRepository.create({
          scheduleId,
          groupId,
          userId,
          status: status || AttendanceStatus.PRESENT,
          note,
          checkedAt: new Date(),
          checkedById: req.user!.id,
        });
      }

      await this.attendanceRepository.save(attendance);

      res.json({
        success: true,
        data: attendance,
        message: '출석 처리되었습니다',
      });
    } catch (error) {
      next(error);
    }
  };

  // 일정별 출석 목록 조회 (사유결석 정보 포함)
  getBySchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, scheduleId } = req.params;

      // 멤버 확인
      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);

      // 일정 확인
      const schedule = await this.scheduleRepository.findOne({
        where: { id: scheduleId, groupId },
      });
      if (!schedule) {
        throw new AppError('일정을 찾을 수 없습니다', 404);
      }

      const attendances = await this.attendanceRepository.find({
        where: { scheduleId },
        relations: ['user'],
        order: { checkedAt: 'ASC' },
      });

      // 사유결석 신청 정보 조회 (승인된 것만)
      const absenceRequests = await this.absenceRequestRepository.find({
        where: {
          scheduleId,
          status: AbsenceRequestStatus.APPROVED,
        },
      });

      // 사유결석 맵 생성 (userId -> absenceRequest)
      const absenceMap = new Map<string, AbsenceRequest>();
      absenceRequests.forEach(req => {
        const targetUserId = req.studentId || req.requesterId;
        absenceMap.set(targetUserId, req);
      });

      // 관리자가 아니면 본인 것만
      const filteredAttendances = isAdmin(member)
        ? attendances
        : attendances.filter((a) => a.userId === req.user!.id);

      res.json({
        success: true,
        data: filteredAttendances.map((a) => {
          const absenceRequest = absenceMap.get(a.userId);
          return {
            id: a.id,
            userId: a.userId,
            userName: a.user?.name,
            status: a.status,
            checkedAt: a.checkedAt,
            leftAt: a.leftAt,
            note: a.note,
            // 사유결석 정보
            absenceRequest: absenceRequest ? {
              id: absenceRequest.id,
              absenceType: absenceRequest.absenceType,
              reason: absenceRequest.reason,
              responseNote: absenceRequest.responseNote,
            } : null,
          };
        }),
      });
    } catch (error) {
      next(error);
    }
  };

  // 일정별 전체 멤버 출석 현황 조회 (관리자) - 출석하지 않은 멤버 포함
  getScheduleMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, scheduleId } = req.params;

      // 관리자 확인
      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 조회할 수 있습니다', 403);
      }

      // 일정 확인
      const schedule = await this.scheduleRepository.findOne({
        where: { id: scheduleId, groupId },
      });
      if (!schedule) {
        throw new AppError('일정을 찾을 수 없습니다', 404);
      }

      // 대상 멤버 목록 결정
      let targetMembers: GroupMember[];

      if (schedule.subGroupId) {
        // 소그룹 일정인 경우: 해당 소그룹 멤버만
        const subGroupMembers = await this.subGroupMemberRepository.find({
          where: { subGroupId: schedule.subGroupId },
          relations: ['groupMember', 'groupMember.user'],
        });
        targetMembers = subGroupMembers
          .map(sgm => sgm.groupMember)
          .filter(gm => gm && gm.status === MemberStatus.ACTIVE);
      } else {
        // 그룹 전체 일정인 경우: 전체 활성 멤버
        targetMembers = await this.memberRepository.find({
          where: { groupId, status: MemberStatus.ACTIVE },
          relations: ['user'],
        });
      }

      // 출석 기록 조회
      const attendances = await this.attendanceRepository.find({
        where: { scheduleId },
      });
      const attendanceMap = new Map<string, Attendance>();
      attendances.forEach(a => attendanceMap.set(a.userId, a));

      // 사유결석 신청 조회 (대기 중 + 승인된 것)
      const absenceRequests = await this.absenceRequestRepository.find({
        where: {
          scheduleId,
          status: In([AbsenceRequestStatus.PENDING, AbsenceRequestStatus.APPROVED]),
        },
      });
      const absenceMap = new Map<string, AbsenceRequest>();
      absenceRequests.forEach(req => {
        const targetUserId = req.studentId || req.requesterId;
        absenceMap.set(targetUserId, req);
      });

      // 결과 생성
      const result = targetMembers.map(gm => {
        const attendance = attendanceMap.get(gm.userId);
        const absenceRequest = absenceMap.get(gm.userId);

        return {
          memberId: gm.id,
          userId: gm.userId,
          userName: gm.user?.name || gm.nickname,
          profileImage: gm.user?.profileImage,
          role: gm.role,
          // 출석 정보
          attendanceId: attendance?.id || null,
          status: attendance?.status || null,
          checkedAt: attendance?.checkedAt || null,
          leftAt: attendance?.leftAt || null,
          note: attendance?.note || null,
          // 사유결석 정보
          absenceRequest: absenceRequest ? {
            id: absenceRequest.id,
            status: absenceRequest.status,
            absenceType: absenceRequest.absenceType,
            reason: absenceRequest.reason,
            responseNote: absenceRequest.responseNote,
          } : null,
        };
      });

      // 이름순 정렬
      result.sort((a, b) => (a.userName || '').localeCompare(b.userName || '', 'ko'));

      res.json({
        success: true,
        data: {
          schedule: {
            id: schedule.id,
            title: schedule.title,
            startAt: schedule.startAt,
            endAt: schedule.endAt,
          },
          members: result,
          summary: {
            total: result.length,
            present: result.filter(r => r.status === AttendanceStatus.PRESENT).length,
            late: result.filter(r => r.status === AttendanceStatus.LATE).length,
            excused: result.filter(r => r.status === AttendanceStatus.EXCUSED).length,
            absent: result.filter(r => r.status === AttendanceStatus.ABSENT).length,
            earlyLeave: result.filter(r => r.status === AttendanceStatus.EARLY_LEAVE).length,
            notChecked: result.filter(r => !r.status).length,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 내 출석 상태 확인 (특정 일정)
  getMyAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, scheduleId } = req.params;

      // 멤버 확인
      await requireActiveMember(this.memberRepository, groupId, req.user!.id);

      const attendance = await this.attendanceRepository.findOne({
        where: { scheduleId, userId: req.user!.id },
      });

      res.json({
        success: true,
        data: attendance
          ? {
              id: attendance.id,
              status: attendance.status,
              checkedAt: attendance.checkedAt,
              note: attendance.note,
            }
          : null,
      });
    } catch (error) {
      next(error);
    }
  };

  // 내 모든 출석 기록 조회 (그룹 내)
  getMyAllAttendances = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      // 멤버 확인
      await requireActiveMember(this.memberRepository, groupId, req.user!.id);

      const attendances = await this.attendanceRepository.find({
        where: { groupId, userId: req.user!.id },
        order: { checkedAt: 'DESC' },
      });

      res.json({
        success: true,
        data: attendances.map((a) => ({
          id: a.id,
          scheduleId: a.scheduleId,
          status: a.status,
          checkedAt: a.checkedAt,
          note: a.note,
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  // 특정 멤버의 출석 통계 조회 (관리자)
  getMemberStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, userId } = req.params;

      // 관리자 확인
      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 조회할 수 있습니다', 403);
      }

      // 대상 멤버 확인
      await requireActiveMember(this.memberRepository, groupId, userId);

      const attendances = await this.attendanceRepository.find({
        where: { groupId, userId },
        order: { checkedAt: 'DESC' },
      });

      // 통계 계산
      const stats = {
        total: attendances.length,
        present: attendances.filter((a) => a.status === 'present').length,
        late: attendances.filter((a) => a.status === 'late').length,
        absent: attendances.filter((a) => a.status === 'absent').length,
        excused: attendances.filter((a) => a.status === 'excused').length,
        earlyLeave: attendances.filter((a) => a.status === 'early_leave').length,
      };

      // 최근 5개 출석 기록
      const recentAttendances = attendances.slice(0, 5).map((a) => ({
        id: a.id,
        scheduleId: a.scheduleId,
        status: a.status,
        checkedAt: a.checkedAt,
      }));

      res.json({
        success: true,
        data: {
          stats,
          recentAttendances,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 조퇴 처리 (관리자)
  markEarlyLeave = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, attendanceId } = req.params;
      const { note } = req.body;

      // 관리자 확인
      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 조퇴 처리할 수 있습니다', 403);
      }

      const attendance = await this.attendanceRepository.findOne({
        where: { id: attendanceId, groupId },
      });

      if (!attendance) {
        throw new AppError('출석 기록을 찾을 수 없습니다', 404);
      }

      // 이미 조퇴 처리된 경우
      if (attendance.status === AttendanceStatus.EARLY_LEAVE) {
        throw new AppError('이미 조퇴 처리되었습니다', 400);
      }

      // 출석하지 않은 경우 조퇴 처리 불가
      if (attendance.status === AttendanceStatus.ABSENT) {
        throw new AppError('결석 상태에서는 조퇴 처리할 수 없습니다', 400);
      }

      // 조퇴 처리
      attendance.status = AttendanceStatus.EARLY_LEAVE;
      attendance.leftAt = new Date();
      if (note) {
        attendance.note = note;
      }

      await this.attendanceRepository.save(attendance);

      res.json({
        success: true,
        data: {
          id: attendance.id,
          status: attendance.status,
          leftAt: attendance.leftAt,
          note: attendance.note,
        },
        message: '조퇴 처리되었습니다',
      });
    } catch (error) {
      next(error);
    }
  };

  // 출석 삭제 (관리자)
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, attendanceId } = req.params;

      // 관리자 확인
      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 출석 기록을 삭제할 수 있습니다', 403);
      }

      const attendance = await this.attendanceRepository.findOne({
        where: { id: attendanceId, groupId },
      });

      if (!attendance) {
        throw new AppError('출석 기록을 찾을 수 없습니다', 404);
      }

      await this.attendanceRepository.remove(attendance);

      res.json({
        success: true,
        message: '출석 기록이 삭제되었습니다',
      });
    } catch (error) {
      next(error);
    }
  };
}
