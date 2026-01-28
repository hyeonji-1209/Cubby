import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { LessonRecord } from '../models/LessonRecord';
import { GroupMember, MemberRole } from '../models/GroupMember';
import { Group } from '../models/Group';
import { Attendance } from '../models/Attendance';
import { SubGroup, SubGroupStatus, SubGroupType } from '../models/SubGroup';
import { SubGroupMember } from '../models/SubGroupMember';
import { AppError } from '../middlewares/error.middleware';
import { requireActiveMember, isAdmin } from '../utils/membership';

export class LessonRecordController {
  private lessonRecordRepository = AppDataSource.getRepository(LessonRecord);
  private memberRepository = AppDataSource.getRepository(GroupMember);
  private groupRepository = AppDataSource.getRepository(Group);
  private attendanceRepository = AppDataSource.getRepository(Attendance);
  private subGroupRepository = AppDataSource.getRepository(SubGroup);
  private subGroupMemberRepository = AppDataSource.getRepository(SubGroupMember);

  // 다중 강사 모드에서 특정 학생에 대한 접근 권한 확인
  private async canAccessStudent(
    group: Group,
    adminMember: GroupMember,
    targetUserId: string
  ): Promise<boolean> {
    // owner는 항상 접근 가능
    if (adminMember.role === MemberRole.OWNER) {
      return true;
    }

    // 다중 강사 모드가 아니면 admin은 모든 학생 접근 가능
    if (!group.hasMultipleInstructors) {
      return true;
    }

    // 다중 강사 모드: 해당 강사의 소그룹에 학생이 소속되어 있는지 확인
    const instructorSubGroup = await this.subGroupRepository.findOne({
      where: {
        parentGroupId: group.id,
        instructorId: adminMember.userId,
        type: SubGroupType.INSTRUCTOR,
        status: SubGroupStatus.ACTIVE,
      },
    });

    if (!instructorSubGroup) {
      return false;
    }

    // 학생의 멤버십 조회
    const studentMembership = await this.memberRepository.findOne({
      where: { groupId: group.id, userId: targetUserId },
    });

    if (!studentMembership) {
      return false;
    }

    // 학생이 강사의 소그룹에 소속되어 있는지 확인
    const subGroupMember = await this.subGroupMemberRepository.findOne({
      where: {
        subGroupId: instructorSubGroup.id,
        groupMemberId: studentMembership.id,
      },
    });

    return !!subGroupMember;
  }

  // 특정 멤버의 수업 기록 목록 조회
  getByMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, memberId } = req.params;
      const { limit = 10, offset = 0 } = req.query;

      // 관리자 확인
      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 조회할 수 있습니다', 403);
      }

      // 그룹 확인 (1:1 교육 그룹인지)
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (!group || group.type !== 'education' || group.hasClasses) {
        throw new AppError('1:1 교육 그룹만 지원됩니다', 400);
      }

      // 다중 강사 모드에서 권한 확인
      const canAccess = await this.canAccessStudent(group, member, memberId);
      if (!canAccess) {
        throw new AppError('해당 학생의 기록에 접근할 권한이 없습니다', 403);
      }

      const [records, total] = await this.lessonRecordRepository.findAndCount({
        where: { groupId, memberId },
        order: { lessonDate: 'DESC', lessonStartTime: 'DESC' },
        take: Number(limit),
        skip: Number(offset),
      });

      res.json({
        success: true,
        data: {
          items: records,
          total,
          hasMore: Number(offset) + records.length < total,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 특정 수업 기록 조회
  getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, memberId, recordId } = req.params;

      // 관리자 확인
      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 조회할 수 있습니다', 403);
      }

      // 그룹 확인 및 권한 체크
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (group) {
        const canAccess = await this.canAccessStudent(group, member, memberId);
        if (!canAccess) {
          throw new AppError('해당 학생의 기록에 접근할 권한이 없습니다', 403);
        }
      }

      const record = await this.lessonRecordRepository.findOne({
        where: { id: recordId, groupId, memberId },
      });

      if (!record) {
        throw new AppError('수업 기록을 찾을 수 없습니다', 404);
      }

      res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };

  // 오늘 수업 기록 조회 또는 생성
  getTodayOrCreate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, memberId } = req.params;

      // 관리자 확인
      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 조회할 수 있습니다', 403);
      }

      // 그룹 확인
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (!group || group.type !== 'education' || group.hasClasses) {
        throw new AppError('1:1 교육 그룹만 지원됩니다', 400);
      }

      // 다중 강사 모드에서 권한 확인
      const canAccess = await this.canAccessStudent(group, member, memberId);
      if (!canAccess) {
        throw new AppError('해당 학생의 기록에 접근할 권한이 없습니다', 403);
      }

      // 대상 멤버 확인
      const targetMember = await this.memberRepository.findOne({
        where: { groupId, userId: memberId },
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

      // 기존 기록 조회
      let record = await this.lessonRecordRepository.findOne({
        where: {
          groupId,
          memberId,
          lessonDate: todayDateStr,
          lessonStartTime: todayLesson.startTime,
        },
      });

      // 기록이 없으면 생성
      if (!record) {
        // 이전 수업 기록 조회 (지난 수업 내용 가져오기)
        const previousRecord = await this.lessonRecordRepository.findOne({
          where: { groupId, memberId },
          order: { lessonDate: 'DESC', lessonStartTime: 'DESC' },
        });

        record = this.lessonRecordRepository.create({
          groupId,
          memberId,
          lessonDate: todayDateStr,
          lessonStartTime: todayLesson.startTime,
          lessonEndTime: todayLesson.endTime,
          previousContent: previousRecord?.currentContent || undefined,
          createdById: req.user!.id,
        });

        await this.lessonRecordRepository.save(record);
      }

      // 출석 정보도 함께 조회
      const virtualScheduleId = `lesson-${memberId}-${todayDateStr}-${todayLesson.startTime}`;
      const attendance = await this.attendanceRepository.findOne({
        where: { scheduleId: virtualScheduleId, userId: memberId },
      });

      res.json({
        success: true,
        data: {
          record,
          attendance,
          lessonSchedule: todayLesson,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 수업 기록 생성/수정
  upsert = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, memberId } = req.params;
      const { lessonDate, lessonStartTime, lessonEndTime, previousContent, currentContent, homework, note } = req.body;

      // 관리자 확인
      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 수정할 수 있습니다', 403);
      }

      // 그룹 확인
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (!group || group.type !== 'education' || group.hasClasses) {
        throw new AppError('1:1 교육 그룹만 지원됩니다', 400);
      }

      // 다중 강사 모드에서 권한 확인
      const canAccess = await this.canAccessStudent(group, member, memberId);
      if (!canAccess) {
        throw new AppError('해당 학생의 기록에 접근할 권한이 없습니다', 403);
      }

      // 기존 기록 확인
      let record = await this.lessonRecordRepository.findOne({
        where: {
          groupId,
          memberId,
          lessonDate,
          lessonStartTime,
        },
      });

      if (record) {
        // 업데이트
        if (previousContent !== undefined) record.previousContent = previousContent;
        if (currentContent !== undefined) record.currentContent = currentContent;
        if (homework !== undefined) record.homework = homework;
        if (note !== undefined) record.note = note;
      } else {
        // 생성
        record = this.lessonRecordRepository.create({
          groupId,
          memberId,
          lessonDate,
          lessonStartTime,
          lessonEndTime,
          previousContent,
          currentContent,
          homework,
          note,
          createdById: req.user!.id,
        });
      }

      await this.lessonRecordRepository.save(record);

      res.json({
        success: true,
        data: record,
        message: '저장되었습니다',
      });
    } catch (error) {
      next(error);
    }
  };

  // 학생 본인의 수업 기록 조회 (note 필드 제외)
  getMyLessons = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { limit = 10, offset = 0 } = req.query;
      const userId = req.user!.id;

      // 멤버 확인
      const member = await requireActiveMember(this.memberRepository, groupId, userId);

      // 그룹 확인 (1:1 교육 그룹인지)
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (!group || group.type !== 'education' || group.hasClasses) {
        throw new AppError('1:1 교육 그룹만 지원됩니다', 400);
      }

      const [records, total] = await this.lessonRecordRepository.findAndCount({
        where: { groupId, memberId: userId },
        order: { lessonDate: 'DESC', lessonStartTime: 'DESC' },
        take: Number(limit),
        skip: Number(offset),
      });

      // note 필드 제외하고 반환
      const filteredRecords = records.map(record => ({
        id: record.id,
        groupId: record.groupId,
        memberId: record.memberId,
        lessonDate: record.lessonDate,
        lessonStartTime: record.lessonStartTime,
        lessonEndTime: record.lessonEndTime,
        previousContent: record.previousContent,
        currentContent: record.currentContent,
        homework: record.homework,
        // note 필드 제외
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      }));

      // 출석 정보도 함께 조회
      const attendanceList = await this.attendanceRepository.find({
        where: { groupId, userId },
        order: { checkedAt: 'DESC' },
      });

      res.json({
        success: true,
        data: {
          items: filteredRecords,
          attendanceList,
          total,
          hasMore: Number(offset) + records.length < total,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 수업 기록 삭제
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, memberId, recordId } = req.params;

      // 관리자 확인
      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);
      if (!isAdmin(member)) {
        throw new AppError('관리자만 삭제할 수 있습니다', 403);
      }

      // 그룹 확인 및 권한 체크
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (group) {
        const canAccess = await this.canAccessStudent(group, member, memberId);
        if (!canAccess) {
          throw new AppError('해당 학생의 기록에 접근할 권한이 없습니다', 403);
        }
      }

      const record = await this.lessonRecordRepository.findOne({
        where: { id: recordId, groupId, memberId },
      });

      if (!record) {
        throw new AppError('수업 기록을 찾을 수 없습니다', 404);
      }

      await this.lessonRecordRepository.remove(record);

      res.json({
        success: true,
        message: '삭제되었습니다',
      });
    } catch (error) {
      next(error);
    }
  };
}
