import { Router } from 'express';
import { PositionController } from '../controllers/position.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireGroupMember, requireGroupOwner } from '../middlewares/role.middleware';

const router = Router();
const positionController = new PositionController();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

// === 직책 관리 ===

// 직책 목록 조회 (멤버도 조회 가능)
router.get('/:groupId/positions', requireGroupMember, positionController.getPositions);

// 직책 생성 (운영자만)
router.post(
  '/:groupId/positions',
  requireGroupOwner,
  positionController.createPosition
);

// 직책 수정 (운영자만)
router.patch(
  '/:groupId/positions/:positionId',
  requireGroupOwner,
  positionController.updatePosition
);

// 직책 삭제 (운영자만)
router.delete(
  '/:groupId/positions/:positionId',
  requireGroupOwner,
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

// 멤버에게 직책 부여 (운영자만)
router.post(
  '/:groupId/members/:memberId/positions',
  requireGroupOwner,
  positionController.assignPosition
);

// 멤버 직책 해제 (운영자만)
router.delete(
  '/:groupId/members/:memberId/positions/:positionId',
  requireGroupOwner,
  positionController.removePosition
);

export default router;
