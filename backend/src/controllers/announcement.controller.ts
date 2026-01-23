import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Announcement } from '../models/Announcement';
import { GroupMember, MemberRole, MemberStatus } from '../models/GroupMember';
import { AppError } from '../middlewares/error.middleware';

export class AnnouncementController {
  private announcementRepository = AppDataSource.getRepository(Announcement);
  private memberRepository = AppDataSource.getRepository(GroupMember);

  getByGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { subGroupId, page = 1, limit = 20 } = req.query;

      const queryBuilder = this.announcementRepository
        .createQueryBuilder('announcement')
        .leftJoinAndSelect('announcement.author', 'author')
        .where('announcement.groupId = :groupId', { groupId })
        .andWhere('announcement.isPublished = :isPublished', { isPublished: true });

      if (subGroupId) {
        queryBuilder.andWhere('announcement.subGroupId = :subGroupId', { subGroupId });
      }

      const [announcements, total] = await queryBuilder
        .orderBy('announcement.isPinned', 'DESC')
        .addOrderBy('announcement.createdAt', 'DESC')
        .skip((Number(page) - 1) * Number(limit))
        .take(Number(limit))
        .getManyAndCount();

      const result = announcements.map((announcement) => ({
        ...announcement,
        author: {
          id: announcement.author.id,
          name: announcement.author.name,
          profileImage: announcement.author.profileImage,
        },
      }));

      res.json({
        success: true,
        data: result,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { announcementId } = req.params;

      const announcement = await this.announcementRepository.findOne({
        where: { id: announcementId },
        relations: ['author', 'group'],
      });

      if (!announcement) {
        throw new AppError('Announcement not found', 404);
      }

      // 멤버인지 확인
      const membership = await this.memberRepository.findOne({
        where: {
          groupId: announcement.groupId,
          userId: req.user!.id,
          status: MemberStatus.ACTIVE,
        },
      });

      if (!membership) {
        throw new AppError('Not a member of this group', 403);
      }

      res.json({
        success: true,
        data: {
          ...announcement,
          author: {
            id: announcement.author.id,
            name: announcement.author.name,
            profileImage: announcement.author.profileImage,
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
      const { title, content, subGroupId, isPinned, attachments } = req.body;

      const announcement = this.announcementRepository.create({
        groupId,
        subGroupId,
        authorId: req.user!.id,
        title,
        content,
        isPinned: isPinned || false,
        attachments,
        isPublished: true,
      });

      await this.announcementRepository.save(announcement);

      res.status(201).json({
        success: true,
        data: announcement,
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { announcementId } = req.params;
      const { title, content, isPinned, attachments, isPublished } = req.body;

      const announcement = await this.announcementRepository.findOne({
        where: { id: announcementId },
      });

      if (!announcement) {
        throw new AppError('Announcement not found', 404);
      }

      // 작성자이거나 관리자인지 확인
      const membership = await this.memberRepository.findOne({
        where: {
          groupId: announcement.groupId,
          userId: req.user!.id,
          status: MemberStatus.ACTIVE,
        },
      });

      const canEdit =
        announcement.authorId === req.user!.id ||
        (membership && [MemberRole.OWNER, MemberRole.ADMIN].includes(membership.role));

      if (!canEdit) {
        throw new AppError('Not authorized to edit this announcement', 403);
      }

      if (title) announcement.title = title;
      if (content) announcement.content = content;
      if (isPinned !== undefined) announcement.isPinned = isPinned;
      if (attachments !== undefined) announcement.attachments = attachments;
      if (isPublished !== undefined) announcement.isPublished = isPublished;

      await this.announcementRepository.save(announcement);

      res.json({
        success: true,
        data: announcement,
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { announcementId } = req.params;

      const announcement = await this.announcementRepository.findOne({
        where: { id: announcementId },
      });

      if (!announcement) {
        throw new AppError('Announcement not found', 404);
      }

      // 작성자이거나 관리자인지 확인
      const membership = await this.memberRepository.findOne({
        where: {
          groupId: announcement.groupId,
          userId: req.user!.id,
          status: MemberStatus.ACTIVE,
        },
      });

      const canDelete =
        announcement.authorId === req.user!.id ||
        (membership && [MemberRole.OWNER, MemberRole.ADMIN].includes(membership.role));

      if (!canDelete) {
        throw new AppError('Not authorized to delete this announcement', 403);
      }

      await this.announcementRepository.softDelete(announcementId);

      res.json({
        success: true,
        message: 'Announcement deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  togglePin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { announcementId } = req.params;

      const announcement = await this.announcementRepository.findOne({
        where: { id: announcementId },
      });

      if (!announcement) {
        throw new AppError('Announcement not found', 404);
      }

      // 관리자인지 확인
      const membership = await this.memberRepository.findOne({
        where: {
          groupId: announcement.groupId,
          userId: req.user!.id,
          status: MemberStatus.ACTIVE,
        },
      });

      if (!membership || ![MemberRole.OWNER, MemberRole.ADMIN, MemberRole.LEADER].includes(membership.role)) {
        throw new AppError('Not authorized to pin/unpin announcements', 403);
      }

      announcement.isPinned = !announcement.isPinned;
      await this.announcementRepository.save(announcement);

      res.json({
        success: true,
        data: { isPinned: announcement.isPinned },
      });
    } catch (error) {
      next(error);
    }
  };
}
