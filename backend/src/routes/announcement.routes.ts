import { Router } from 'express';
import { AnnouncementController } from '../controllers/announcement.controller';
import { CommentController } from '../controllers/comment.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireGroupMember } from '../middlewares/role.middleware';

const router = Router();
const announcementController = new AnnouncementController();
const commentController = new CommentController();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

// 모임의 공지사항 목록 조회
router.get('/group/:groupId', requireGroupMember, announcementController.getByGroup);

// 공지사항 상세 조회
router.get('/:announcementId', announcementController.getById);

// 공지사항 작성 (권한은 컨트롤러에서 확인)
router.post(
  '/group/:groupId',
  requireGroupMember,
  announcementController.create
);

// 공지사항 수정
router.patch(
  '/:announcementId',
  announcementController.update
);

// 공지사항 삭제
router.delete(
  '/:announcementId',
  announcementController.delete
);

// 공지사항 고정/해제
router.patch(
  '/:announcementId/pin',
  announcementController.togglePin
);

// 공지사항 좋아요 토글
router.post('/:announcementId/like', announcementController.toggleLike);

// === 댓글 관련 ===

// 댓글 목록 조회
router.get('/:announcementId/comments', commentController.getComments);

// 댓글 작성
router.post('/:announcementId/comments', commentController.createComment);

// 댓글 수정 (본인, owner만)
router.patch('/:announcementId/comments/:commentId', commentController.updateComment);

// 댓글 삭제 (본인, owner만)
router.delete('/:announcementId/comments/:commentId', commentController.deleteComment);

// 댓글 좋아요 토글
router.post('/:announcementId/comments/:commentId/like', commentController.toggleCommentLike);

export default router;
