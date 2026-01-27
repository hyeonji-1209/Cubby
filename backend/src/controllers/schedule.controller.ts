import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Schedule } from '../models/Schedule';
import { GroupMember, MemberRole, MemberStatus } from '../models/GroupMember';
import { AppError } from '../middlewares/error.middleware';
import { requireActiveMember } from '../utils/membership';

export class ScheduleController {
  private scheduleRepository = AppDataSource.getRepository(Schedule);
  private memberRepository = AppDataSource.getRepository(GroupMember);

  getByGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { subGroupId, startDate, endDate } = req.query;

      const queryBuilder = this.scheduleRepository
        .createQueryBuilder('schedule')
        .leftJoinAndSelect('schedule.author', 'author')
        .where('schedule.groupId = :groupId', { groupId });

      if (subGroupId) {
        queryBuilder.andWhere('schedule.subGroupId = :subGroupId', { subGroupId });
      }

      if (startDate && endDate) {
        queryBuilder.andWhere('schedule.startAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      }

      const schedules = await queryBuilder
        .orderBy('schedule.startAt', 'ASC')
        .getMany();

      const result = schedules.map((schedule) => ({
        ...schedule,
        author: {
          id: schedule.author.id,
          name: schedule.author.name,
          profileImage: schedule.author.profileImage,
        },
      }));

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scheduleId } = req.params;

      const schedule = await this.scheduleRepository.findOne({
        where: { id: scheduleId },
        relations: ['author', 'group'],
      });

      if (!schedule) {
        throw new AppError('Schedule not found', 404);
      }

      // 멤버인지 확인
      await requireActiveMember(this.memberRepository, schedule.groupId, req.user!.id);

      res.json({
        success: true,
        data: {
          ...schedule,
          author: {
            id: schedule.author.id,
            name: schedule.author.name,
            profileImage: schedule.author.profileImage,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { title, description, subGroupId, startAt, endAt, isAllDay, location, color, recurrence } = req.body;

      const schedule = this.scheduleRepository.create({
        groupId,
        subGroupId,
        authorId: req.user!.id,
        title,
        description,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        isAllDay: isAllDay || false,
        location,
        color,
        recurrence,
      });

      await this.scheduleRepository.save(schedule);

      res.status(201).json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scheduleId } = req.params;
      const { title, description, startAt, endAt, isAllDay, location, color, recurrence } = req.body;

      const schedule = await this.scheduleRepository.findOne({
        where: { id: scheduleId },
      });

      if (!schedule) {
        throw new AppError('Schedule not found', 404);
      }

      // 멤버십 확인
      const membership = await this.memberRepository.findOne({
        where: {
          groupId: schedule.groupId,
          userId: req.user!.id,
          status: MemberStatus.ACTIVE,
        },
      });

      // 작성자이거나 관리자인지 확인
      const canEdit =
        schedule.authorId === req.user!.id ||
        (membership && [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.LEADER].includes(membership.role));

      if (!canEdit) {
        throw new AppError('Not authorized to edit this schedule', 403);
      }

      if (title) schedule.title = title;
      if (description !== undefined) schedule.description = description;
      if (startAt) schedule.startAt = new Date(startAt);
      if (endAt) schedule.endAt = new Date(endAt);
      if (isAllDay !== undefined) schedule.isAllDay = isAllDay;
      if (location !== undefined) schedule.location = location;
      if (color !== undefined) schedule.color = color;
      if (recurrence !== undefined) schedule.recurrence = recurrence;

      await this.scheduleRepository.save(schedule);

      res.json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scheduleId } = req.params;

      const schedule = await this.scheduleRepository.findOne({
        where: { id: scheduleId },
      });

      if (!schedule) {
        throw new AppError('Schedule not found', 404);
      }

      // 멤버십 확인
      const membership = await this.memberRepository.findOne({
        where: {
          groupId: schedule.groupId,
          userId: req.user!.id,
          status: MemberStatus.ACTIVE,
        },
      });

      const canDelete =
        schedule.authorId === req.user!.id ||
        (membership && [MemberRole.OWNER, MemberRole.ADMIN].includes(membership.role));

      if (!canDelete) {
        throw new AppError('Not authorized to delete this schedule', 403);
      }

      await this.scheduleRepository.softDelete(scheduleId);

      res.json({
        success: true,
        message: 'Schedule deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getMySchedules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate } = req.query;

      // 내가 속한 모든 그룹 조회
      const memberships = await this.memberRepository.find({
        where: {
          userId: req.user!.id,
          status: MemberStatus.ACTIVE,
        },
      });

      if (memberships.length === 0) {
        return res.json({
          success: true,
          data: [],
        });
      }

      const groupIds = memberships.map((m) => m.groupId);

      const queryBuilder = this.scheduleRepository
        .createQueryBuilder('schedule')
        .leftJoinAndSelect('schedule.author', 'author')
        .leftJoinAndSelect('schedule.group', 'group')
        .where('schedule.groupId IN (:...groupIds)', { groupIds });

      if (startDate && endDate) {
        queryBuilder.andWhere('schedule.startAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      }

      const schedules = await queryBuilder
        .orderBy('schedule.startAt', 'ASC')
        .getMany();

      const result = schedules.map((schedule) => ({
        ...schedule,
        author: {
          id: schedule.author.id,
          name: schedule.author.name,
          profileImage: schedule.author.profileImage,
        },
        group: {
          id: schedule.group.id,
          name: schedule.group.name,
          type: schedule.group.type,
        },
      }));

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
