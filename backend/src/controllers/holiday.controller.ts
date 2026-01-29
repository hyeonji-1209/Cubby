import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Holiday, HolidayType } from '../models/Holiday';
import { GroupMember, MemberRole, MemberStatus } from '../models/GroupMember';
import { Group } from '../models/Group';
import { AppError } from '../middlewares/error.middleware';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

const holidayRepository = AppDataSource.getRepository(Holiday);
const memberRepository = AppDataSource.getRepository(GroupMember);
const groupRepository = AppDataSource.getRepository(Group);

// 관리자 권한 체크
const checkAdminPermission = async (groupId: string, userId: string): Promise<boolean> => {
  const member = await memberRepository.findOne({
    where: { groupId, userId, status: MemberStatus.ACTIVE },
  });
  return member?.role === MemberRole.OWNER || member?.role === MemberRole.ADMIN;
};

export const holidayController = {
  // 휴일 목록 조회
  async getByGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params;
      const { year, month } = req.query;
      const userId = req.user!.id;

      // 멤버 확인
      const member = await memberRepository.findOne({
        where: { groupId, userId, status: MemberStatus.ACTIVE },
      });
      if (!member) {
        throw new AppError('그룹 멤버만 조회할 수 있습니다', 403);
      }

      let whereCondition: any = { groupId };

      // 월별 필터링
      if (year && month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(Number(year), Number(month), 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        whereCondition = [
          // 특정 날짜 휴일
          { groupId, type: HolidayType.SPECIFIC, date: Between(startDate, endDate) },
          // 기간 휴일 (해당 월과 겹치는)
          { groupId, type: HolidayType.RANGE, startDate: LessThanOrEqual(endDate), endDate: MoreThanOrEqual(startDate) },
          // 정기 휴일 (매주 반복)
          { groupId, type: HolidayType.REGULAR },
        ];
      }

      const holidays = await holidayRepository.find({
        where: whereCondition,
        relations: ['createdBy'],
        order: { date: 'ASC', startDate: 'ASC' },
      });

      res.json({
        success: true,
        data: holidays.map(h => ({
          id: h.id,
          type: h.type,
          name: h.name,
          description: h.description,
          date: h.date,
          startDate: h.startDate,
          endDate: h.endDate,
          recurringDays: h.recurringDays,
          notifyMembers: h.notifyMembers,
          requiresMakeup: h.requiresMakeup,
          createdBy: h.createdBy ? { id: h.createdBy.id, name: h.createdBy.name } : null,
          createdAt: h.createdAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  },

  // 휴일 생성
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params;
      const userId = req.user!.id;
      const { type, name, description, date, startDate, endDate, recurringDays, notifyMembers, requiresMakeup } = req.body;

      // 관리자 권한 확인
      const isAdmin = await checkAdminPermission(groupId, userId);
      if (!isAdmin) {
        throw new AppError('관리자만 휴일을 등록할 수 있습니다', 403);
      }

      // 유효성 검사
      if (type === HolidayType.SPECIFIC && !date) {
        throw new AppError('특정 날짜 휴일은 날짜가 필요합니다', 400);
      }
      if (type === HolidayType.RANGE && (!startDate || !endDate)) {
        throw new AppError('기간 휴일은 시작일과 종료일이 필요합니다', 400);
      }
      if (type === HolidayType.REGULAR && (!recurringDays || recurringDays.length === 0)) {
        throw new AppError('정기 휴일은 반복 요일이 필요합니다', 400);
      }

      const holiday = holidayRepository.create({
        groupId,
        type: type || HolidayType.SPECIFIC,
        name,
        description,
        date: type === HolidayType.SPECIFIC ? date : null,
        startDate: type === HolidayType.RANGE ? startDate : null,
        endDate: type === HolidayType.RANGE ? endDate : null,
        recurringDays: type === HolidayType.REGULAR ? recurringDays : null,
        notifyMembers: notifyMembers ?? true,
        requiresMakeup: requiresMakeup ?? false,
        createdById: userId,
      });

      await holidayRepository.save(holiday);

      res.status(201).json({
        success: true,
        data: holiday,
        message: '휴일이 등록되었습니다',
      });
    } catch (error) {
      next(error);
    }
  },

  // 휴일 수정
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupId, holidayId } = req.params;
      const userId = req.user!.id;
      const { name, description, date, startDate, endDate, recurringDays, notifyMembers, requiresMakeup } = req.body;

      // 관리자 권한 확인
      const isAdmin = await checkAdminPermission(groupId, userId);
      if (!isAdmin) {
        throw new AppError('관리자만 휴일을 수정할 수 있습니다', 403);
      }

      const holiday = await holidayRepository.findOne({
        where: { id: holidayId, groupId },
      });

      if (!holiday) {
        throw new AppError('휴일을 찾을 수 없습니다', 404);
      }

      // 업데이트
      if (name !== undefined) holiday.name = name;
      if (description !== undefined) holiday.description = description;
      if (date !== undefined && holiday.type === HolidayType.SPECIFIC) holiday.date = date;
      if (startDate !== undefined && holiday.type === HolidayType.RANGE) holiday.startDate = startDate;
      if (endDate !== undefined && holiday.type === HolidayType.RANGE) holiday.endDate = endDate;
      if (recurringDays !== undefined && holiday.type === HolidayType.REGULAR) holiday.recurringDays = recurringDays;
      if (notifyMembers !== undefined) holiday.notifyMembers = notifyMembers;
      if (requiresMakeup !== undefined) holiday.requiresMakeup = requiresMakeup;

      await holidayRepository.save(holiday);

      res.json({
        success: true,
        data: holiday,
        message: '휴일이 수정되었습니다',
      });
    } catch (error) {
      next(error);
    }
  },

  // 휴일 삭제
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupId, holidayId } = req.params;
      const userId = req.user!.id;

      // 관리자 권한 확인
      const isAdmin = await checkAdminPermission(groupId, userId);
      if (!isAdmin) {
        throw new AppError('관리자만 휴일을 삭제할 수 있습니다', 403);
      }

      const holiday = await holidayRepository.findOne({
        where: { id: holidayId, groupId },
      });

      if (!holiday) {
        throw new AppError('휴일을 찾을 수 없습니다', 404);
      }

      await holidayRepository.remove(holiday);

      res.json({
        success: true,
        message: '휴일이 삭제되었습니다',
      });
    } catch (error) {
      next(error);
    }
  },

  // 특정 날짜가 휴일인지 확인
  async checkDate(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params;
      const { date } = req.query;
      const userId = req.user!.id;

      if (!date) {
        throw new AppError('날짜가 필요합니다', 400);
      }

      // 멤버 확인
      const member = await memberRepository.findOne({
        where: { groupId, userId, status: MemberStatus.ACTIVE },
      });
      if (!member) {
        throw new AppError('그룹 멤버만 조회할 수 있습니다', 403);
      }

      const checkDate = new Date(date as string);
      const dayOfWeek = checkDate.getDay();
      const dateStr = date as string;

      // 1. 특정 날짜 휴일 체크
      const specificHoliday = await holidayRepository.findOne({
        where: { groupId, type: HolidayType.SPECIFIC, date: dateStr },
      });

      if (specificHoliday) {
        return res.json({
          success: true,
          data: { isHoliday: true, holiday: specificHoliday },
        });
      }

      // 2. 기간 휴일 체크
      const rangeHoliday = await holidayRepository.findOne({
        where: {
          groupId,
          type: HolidayType.RANGE,
          startDate: LessThanOrEqual(dateStr),
          endDate: MoreThanOrEqual(dateStr),
        },
      });

      if (rangeHoliday) {
        return res.json({
          success: true,
          data: { isHoliday: true, holiday: rangeHoliday },
        });
      }

      // 3. 정기 휴일 체크
      const regularHolidays = await holidayRepository.find({
        where: { groupId, type: HolidayType.REGULAR },
      });

      for (const holiday of regularHolidays) {
        if (holiday.recurringDays && holiday.recurringDays.includes(dayOfWeek)) {
          return res.json({
            success: true,
            data: { isHoliday: true, holiday },
          });
        }
      }

      res.json({
        success: true,
        data: { isHoliday: false, holiday: null },
      });
    } catch (error) {
      next(error);
    }
  },
};
