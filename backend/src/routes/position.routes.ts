import { Router } from 'express';
import { PositionController } from '../controllers/position.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireGroupRole, requireGroupMember } from '../middlewares/role.middleware';
import { MemberRole } from '../models/GroupMember';

const router = Router();
const positionController = new PositionController();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

// === 직책 관리 ===

// 직책 목록 조회 (멤버도 조회 가능)
router.get('/:groupId/positions', requireGroupMember, positionController.getPositions);

// 직책 생성 (운영자, 관리자만)
router.post(
  '/:groupId/positions',
  requireGroupRole(MemberRole.OWNER, MemberRole.ADMIN),
  positionController.createPosition
);

// 직책 수정
router.patch(
  '/:groupId/positions/:positionId',
  requireGroupRole(MemberRole.OWNER, MemberRole.ADMIN),
  positionController.updatePosition
);

// 직책 삭제
router.delete(
  '/:groupId/positions/:positionId',
  requireGroupRole(MemberRole.OWNER, MemberRole.ADMIN),
  positionController.deletePosition
);

// 직책별 멤버 목록
router.get(
  '/:groupId/positions/:positionId/members',
  requireGroupMember,
  positionController.getPositionMembers
);

// === 멤버 직책 관리 ===

// 멤버의 직책 목록 조회
router.get(
  '/:groupId/members/:memberId/positions',
  requireGroupMember,
  positionController.getMemberPositions
);

// 멤버에게 직책 부여
router.post(
  '/:groupId/members/:memberId/positions',
  requireGroupRole(MemberRole.OWNER, MemberRole.ADMIN, MemberRole.LEADER),
  positionController.assignPosition
);

// 멤버 직책 해제
router.delete(
  '/:groupId/members/:memberId/positions/:positionId',
  requireGroupRole(MemberRole.OWNER, MemberRole.ADMIN, MemberRole.LEADER),
  positionController.removePosition
);

export default router;
