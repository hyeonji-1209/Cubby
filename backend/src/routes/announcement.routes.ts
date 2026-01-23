import { Router } from 'express';
import { AnnouncementController } from '../controllers/announcement.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireGroupRole, requireGroupMember } from '../middlewares/role.middleware';
import { MemberRole } from '../models/GroupMember';

const router = Router();
const announcementController = new AnnouncementController();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

// 모임의 공지사항 목록 조회
router.get('/group/:groupId', requireGroupMember, announcementController.getByGroup);

// 공지사항 상세 조회
router.get('/:announcementId', announcementController.getById);

// 공지사항 작성 (운영자, 관리자, 리더만)
router.post(
  '/group/:groupId',
  requireGroupRole(MemberRole.OWNER, MemberRole.ADMIN, MemberRole.LEADER),
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

export default router;
