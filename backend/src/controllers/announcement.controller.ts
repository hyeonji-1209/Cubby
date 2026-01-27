import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Announcement } from '../models/Announcement';
import { AnnouncementView } from '../models/AnnouncementView';
import { GroupMember, MemberRole, MemberStatus } from '../models/GroupMember';
import { Like, LikeTargetType } from '../models/Like';
import { AppError } from '../middlewares/error.middleware';
import fs from 'fs';
import path from 'path';

// 첨부파일 URL에서 파일명 추출 후 삭제
const deleteAttachmentFiles = (attachments: Array<{ url: string }> | null) => {
  if (!attachments || attachments.length === 0) return;

  const uploadDir = path.join(__dirname, '../../uploads');

  attachments.forEach((attachment) => {
    try {
      // URL에서 파일명 추출 (예: http://localhost:3001/uploads/abc123.pdf -> abc123.pdf)
      const filename = attachment.url.split('/uploads/').pop();
      if (filename) {
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted attachment: ${filename}`);
        }
      }
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  });
};

export class AnnouncementController {
  private announcementRepository = AppDataSource.getRepository(Announcement);
  private viewRepository = AppDataSource.getRepository(AnnouncementView);
  private memberRepository = AppDataSource.getRepository(GroupMember);
  private likeRepository = AppDataSource.getRepository(Like);

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

      // 작성자들의 멤버십 조회 (직책 포함)
      const memberships = await this.memberRepository.find({
        where: { groupId },
      });
      const memberTitleMap = new Map(memberships.map((m) => [m.userId, m.title]));

      // 목록 조회: 필요한 필드만 반환 (content, attachments 제외)
      const result = announcements.map((announcement) => ({
        id: announcement.id,
        groupId: announcement.groupId,
        subGroupId: announcement.subGroupId,
        title: announcement.title,
        isPinned: announcement.isPinned,
        isAdminOnly: announcement.isAdminOnly,
        hasAttachments: !!(announcement.attachments && announcement.attachments.length > 0),
        viewCount: announcement.viewCount,
        author: {
          id: announcement.author.id,
          name: announcement.author.name,
          profileImage: announcement.author.profileImage,
          title: memberTitleMap.get(announcement.author.id) || undefined,
        },
        createdAt: announcement.createdAt,
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
      const userId = req.user!.id;

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
          userId,
          status: MemberStatus.ACTIVE,
        },
      });

      if (!membership) {
        throw new AppError('Not a member of this group', 403);
      }

      // 조회 기록 확인 및 추가 (중복 방지)
      const existingView = await this.viewRepository.findOne({
        where: { announcementId, userId },
      });

      if (!existingView) {
        // 새 조회 기록 추가
        await this.viewRepository.save(
          this.viewRepository.create({ announcementId, userId })
        );
        // 조회수 증가
        announcement.viewCount += 1;
        await this.announcementRepository.save(announcement);
      }

      // 좋아요 정보 및 작성자 직책 조회
      const [likeCount, myLike, authorMembership] = await Promise.all([
        this.likeRepository.count({
          where: { targetType: LikeTargetType.ANNOUNCEMENT, targetId: announcementId },
        }),
        this.likeRepository.findOne({
          where: { userId, targetType: LikeTargetType.ANNOUNCEMENT, targetId: announcementId },
        }),
        this.memberRepository.findOne({
          where: { groupId: announcement.groupId, userId: announcement.authorId },
        }),
      ]);

      res.json({
        success: true,
        data: {
          ...announcement,
          author: {
            id: announcement.author.id,
            name: announcement.author.name,
            profileImage: announcement.author.profileImage,
            title: authorMembership?.title || undefined,
          },
          viewCount: announcement.viewCount,
          likeCount,
          isLiked: !!myLike,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { title, content, subGroupId, isPinned, isAdminOnly, attachments } = req.body;

      const announcement = this.announcementRepository.create({
        groupId,
        subGroupId,
        authorId: req.user!.id,
        title,
        content,
        isPinned: isPinned || false,
        isAdminOnly: isAdminOnly || false,
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
      const { title, content, isPinned, isAdminOnly, attachments, isPublished } = req.body;

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
      if (isAdminOnly !== undefined) announcement.isAdminOnly = isAdminOnly;
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

      // 첨부파일 삭제
      deleteAttachmentFiles(announcement.attachments);

      // 공지사항 삭제 (hard delete)
      await this.announcementRepository.delete(announcementId);

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

  // 공지사항 좋아요 토글
  toggleLike = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { announcementId } = req.params;
      const userId = req.user!.id;

      // 공지사항 존재 확인
      const announcement = await this.announcementRepository.findOne({
        where: { id: announcementId },
      });

      if (!announcement) {
        throw new AppError('공지사항을 찾을 수 없습니다.', 404);
      }

      // 기존 좋아요 확인
      const existingLike = await this.likeRepository.findOne({
        where: {
          userId,
          targetType: LikeTargetType.ANNOUNCEMENT,
          targetId: announcementId,
        },
      });

      let isLiked: boolean;

      if (existingLike) {
        // 좋아요 취소
        await this.likeRepository.remove(existingLike);
        isLiked = false;
      } else {
        // 좋아요 추가
        const like = this.likeRepository.create({
          userId,
          targetType: LikeTargetType.ANNOUNCEMENT,
          targetId: announcementId,
        });
        await this.likeRepository.save(like);
        isLiked = true;
      }

      // 현재 좋아요 수 조회
      const likeCount = await this.likeRepository.count({
        where: {
          targetType: LikeTargetType.ANNOUNCEMENT,
          targetId: announcementId,
        },
      });

      res.json({
        success: true,
        data: {
          isLiked,
          likeCount,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
