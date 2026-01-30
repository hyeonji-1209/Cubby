import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { AnnouncementComment } from '../models/AnnouncementComment';
import { Announcement } from '../models/Announcement';
import { Like, LikeTargetType } from '../models/Like';
import { GroupMember, MemberRole } from '../models/GroupMember';
import { AppError } from '../middlewares/error.middleware';
import { IsNull } from 'typeorm';

export class CommentController {
  private commentRepository = AppDataSource.getRepository(AnnouncementComment);
  private announcementRepository = AppDataSource.getRepository(Announcement);
  private likeRepository = AppDataSource.getRepository(Like);
  private memberRepository = AppDataSource.getRepository(GroupMember);

  // 댓글 목록 조회 (대댓글 포함)
  getComments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { announcementId } = req.params;
      const userId = req.user!.id;

      // 공지사항 조회 (groupId 확인용)
      const announcement = await this.announcementRepository.findOne({
        where: { id: announcementId },
      });

      if (!announcement) {
        throw new AppError('공지사항을 찾을 수 없습니다.', 404);
      }

      // 최상위 댓글만 가져오기 (parentId가 null인 것)
      const comments = await this.commentRepository.find({
        where: { announcementId, parentId: IsNull() },
        relations: ['author', 'replies', 'replies.author'],
        order: { createdAt: 'ASC' },
      });

      // 모든 댓글 작성자의 userId 수집
      const allAuthorIds = new Set<string>();
      comments.forEach((c) => {
        allAuthorIds.add(c.author.id);
        c.replies.forEach((r) => allAuthorIds.add(r.author.id));
      });

      // 해당 그룹에서 작성자들의 멤버십 조회 (직책 포함)
      const memberships = await this.memberRepository.find({
        where: { groupId: announcement.groupId },
      });
      const memberTitleMap = new Map(memberships.map((m) => [m.userId, m.title]));

      // 각 댓글의 좋아요 수와 내가 좋아요 했는지 조회
      const commentIds = comments.flatMap((c) => [c.id, ...c.replies.map((r) => r.id)]);

      const likeCounts = await this.likeRepository
        .createQueryBuilder('like')
        .select('like.targetId', 'targetId')
        .addSelect('COUNT(*)', 'count')
        .where('like.targetType = :type', { type: LikeTargetType.COMMENT })
        .andWhere('like.targetId IN (:...ids)', { ids: commentIds.length ? commentIds : [''] })
        .groupBy('like.targetId')
        .getRawMany();

      const myLikes = await this.likeRepository.find({
        where: {
          userId,
          targetType: LikeTargetType.COMMENT,
        },
      });

      const likeCountMap = new Map(likeCounts.map((l) => [l.targetId, parseInt(l.count)]));
      const myLikeSet = new Set(myLikes.map((l) => l.targetId));

      const formatComment = (comment: AnnouncementComment) => ({
        id: comment.id,
        content: comment.content,
        parentId: comment.parentId,
        author: {
          id: comment.author.id,
          name: comment.author.name,
          profileImage: comment.author.profileImage,
          title: memberTitleMap.get(comment.author.id) || undefined,
        },
        likeCount: likeCountMap.get(comment.id) || 0,
        isLiked: myLikeSet.has(comment.id),
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      });

      res.json({
        success: true,
        data: comments.map((comment) => ({
          ...formatComment(comment),
          replies: comment.replies
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map(formatComment),
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  // 댓글 작성 (대댓글 포함)
  createComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { announcementId } = req.params;
      const { content, parentId } = req.body;

      if (!content?.trim()) {
        throw new AppError('댓글 내용을 입력해주세요.', 400);
      }

      // 공지사항 존재 확인
      const announcement = await this.announcementRepository.findOne({
        where: { id: announcementId },
      });

      if (!announcement) {
        throw new AppError('공지사항을 찾을 수 없습니다.', 404);
      }

      // 대댓글인 경우 부모 댓글 확인
      if (parentId) {
        const parentComment = await this.commentRepository.findOne({
          where: { id: parentId, announcementId },
        });

        if (!parentComment) {
          throw new AppError('부모 댓글을 찾을 수 없습니다.', 404);
        }

        // 대대댓글 방지 (1단계만 허용)
        if (parentComment.parentId) {
          throw new AppError('대댓글에는 답글을 달 수 없습니다.', 400);
        }
      }

      const comment = this.commentRepository.create({
        announcementId,
        authorId: req.user!.id,
        parentId: parentId || null,
        content: content.trim(),
      });

      await this.commentRepository.save(comment);

      // author 정보 포함해서 반환
      const savedComment = await this.commentRepository.findOne({
        where: { id: comment.id },
        relations: ['author'],
      });

      // 작성자의 직책 조회
      const membership = await this.memberRepository.findOne({
        where: { groupId: announcement.groupId, userId: req.user!.id },
      });

      res.status(201).json({
        success: true,
        data: {
          id: savedComment!.id,
          content: savedComment!.content,
          parentId: savedComment!.parentId,
          author: {
            id: savedComment!.author.id,
            name: savedComment!.author.name,
            profileImage: savedComment!.author.profileImage,
            title: membership?.title || undefined,
          },
          likeCount: 0,
          isLiked: false,
          createdAt: savedComment!.createdAt,
          updatedAt: savedComment!.updatedAt,
        },
        message: parentId ? '답글이 작성되었습니다.' : '댓글이 작성되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 댓글 수정 (본인, 관리자, 오너만)
  updateComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { announcementId, commentId } = req.params;
      const { content } = req.body;

      if (!content?.trim()) {
        throw new AppError('댓글 내용을 입력해주세요.', 400);
      }

      const comment = await this.commentRepository.findOne({
        where: { id: commentId, announcementId },
        relations: ['announcement'],
      });

      if (!comment) {
        throw new AppError('댓글을 찾을 수 없습니다.', 404);
      }

      // 권한 확인: 본인 또는 오너
      const isAuthor = comment.authorId === req.user!.id;

      if (!isAuthor) {
        const membership = await this.memberRepository.findOne({
          where: { groupId: comment.announcement.groupId, userId: req.user!.id },
        });

        if (!membership || membership.role !== MemberRole.OWNER) {
          throw new AppError('수정 권한이 없습니다.', 403);
        }
      }

      comment.content = content.trim();
      await this.commentRepository.save(comment);

      res.json({
        success: true,
        data: {
          id: comment.id,
          content: comment.content,
          updatedAt: comment.updatedAt,
        },
        message: '댓글이 수정되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 댓글 삭제 (본인, 관리자, 오너만)
  deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { announcementId, commentId } = req.params;

      const comment = await this.commentRepository.findOne({
        where: { id: commentId, announcementId },
        relations: ['announcement'],
      });

      if (!comment) {
        throw new AppError('댓글을 찾을 수 없습니다.', 404);
      }

      // 권한 확인: 본인 또는 오너
      const isAuthor = comment.authorId === req.user!.id;

      if (!isAuthor) {
        const membership = await this.memberRepository.findOne({
          where: { groupId: comment.announcement.groupId, userId: req.user!.id },
        });

        if (!membership || membership.role !== MemberRole.OWNER) {
          throw new AppError('삭제 권한이 없습니다.', 403);
        }
      }

      // 댓글 삭제 시 관련 좋아요도 삭제
      await this.likeRepository.delete({
        targetType: LikeTargetType.COMMENT,
        targetId: commentId,
      });

      await this.commentRepository.remove(comment);

      res.json({
        success: true,
        message: '댓글이 삭제되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 댓글 좋아요 토글
  toggleCommentLike = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { announcementId, commentId } = req.params;
      const userId = req.user!.id;

      // 댓글 존재 확인
      const comment = await this.commentRepository.findOne({
        where: { id: commentId, announcementId },
      });

      if (!comment) {
        throw new AppError('댓글을 찾을 수 없습니다.', 404);
      }

      // 기존 좋아요 확인
      const existingLike = await this.likeRepository.findOne({
        where: {
          userId,
          targetType: LikeTargetType.COMMENT,
          targetId: commentId,
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
          targetType: LikeTargetType.COMMENT,
          targetId: commentId,
        });
        await this.likeRepository.save(like);
        isLiked = true;
      }

      // 현재 좋아요 수 조회
      const likeCount = await this.likeRepository.count({
        where: {
          targetType: LikeTargetType.COMMENT,
          targetId: commentId,
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
