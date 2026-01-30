import { Router } from 'express';
import { GroupController } from '../controllers/group.controller';
import { SubGroupController } from '../controllers/subgroup.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireGroupRole, requireGroupMember, requireGroupOwner } from '../middlewares/role.middleware';
import { MemberRole } from '../models/GroupMember';

const router = Router();
const groupController = new GroupController();
const subGroupController = new SubGroupController();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

// 모임 생성
router.post('/', groupController.create);

// 초대 코드 검증 (가입 전 그룹 정보 확인)
router.post('/validate-invite', groupController.validateInviteCode);

// 초대 코드로 모임 가입
router.post('/join', groupController.joinByInviteCode);

// 모임 상세 조회
router.get('/:groupId', requireGroupMember, groupController.getById);

// 모임 홈 개요 조회 (그룹 정보 + 최근 공지사항 + 이번 달 일정)
router.get('/:groupId/overview', requireGroupMember, groupController.getOverview);

// 모임 수정 (운영자만)
router.patch(
  '/:groupId',
  requireGroupOwner,
  groupController.update
);

// 모임 삭제 (운영자만)
router.delete(
  '/:groupId',
  requireGroupRole(MemberRole.OWNER),
  groupController.delete
);

// 초대 코드 재생성 (운영자만)
router.post(
  '/:groupId/invite-code',
  requireGroupOwner,
  groupController.regenerateInviteCode
);

// 멤버 목록 조회
router.get('/:groupId/members', requireGroupMember, groupController.getMembers);

// 강사 목록 조회 (다중 강사 모드용)
router.get('/:groupId/instructors', requireGroupMember, groupController.getInstructors);

// 가입 대기 멤버 목록 조회 (운영자만)
router.get(
  '/:groupId/pending-members',
  requireGroupOwner,
  groupController.getPendingMembers
);

// 멤버 승인 (운영자만)
router.post(
  '/:groupId/members/:memberId/approve',
  requireGroupOwner,
  groupController.approveMember
);

// 멤버 거부 (운영자만)
router.post(
  '/:groupId/members/:memberId/reject',
  requireGroupOwner,
  groupController.rejectMember
);

// 멤버 역할 변경 (운영자만)
router.patch(
  '/:groupId/members/:memberId',
  requireGroupOwner,
  groupController.updateMemberRole
);

// 멤버 수업 정보 업데이트 (운영자만 - 1:1 교육용)
router.patch(
  '/:groupId/members/:memberId/lesson-info',
  requireGroupOwner,
  groupController.updateMemberLessonInfo
);

// 멤버 제거 (운영자만)
router.delete(
  '/:groupId/members/:memberId',
  requireGroupOwner,
  groupController.removeMember
);

// 모임 나가기
router.post('/:groupId/leave', requireGroupMember, groupController.leave);

// 본인 프로필 수정 (닉네임, 직책)
router.patch('/:groupId/my-profile', requireGroupMember, groupController.updateMyProfile);

// === 소모임 관련 (계층 구조 + 승인 시스템) ===

// 소모임 목록 조회 (계층 구조)
router.get('/:groupId/subgroups', requireGroupMember, subGroupController.getSubGroupsHierarchy);

// 소모임 생성 요청 (모든 멤버 가능, 권한에 따라 바로 생성 또는 승인 대기)
router.post('/:groupId/subgroups', requireGroupMember, subGroupController.requestCreate);

// 소모임 생성 요청 목록 조회 (운영자만)
router.get(
  '/:groupId/subgroup-requests',
  requireGroupOwner,
  subGroupController.getRequests
);

// 소모임 생성 요청 승인
router.post(
  '/:groupId/subgroup-requests/:requestId/approve',
  requireGroupMember,
  subGroupController.approveRequest
);

// 소모임 생성 요청 거절
router.post(
  '/:groupId/subgroup-requests/:requestId/reject',
  requireGroupMember,
  subGroupController.rejectRequest
);

// 소모임 상세 조회
router.get('/:groupId/subgroups/:subGroupId', requireGroupMember, subGroupController.getById);

// 소모임 수정 (운영자 또는 리더)
router.patch(
  '/:groupId/subgroups/:subGroupId',
  requireGroupMember, // 권한은 컨트롤러에서 확인
  subGroupController.update
);

// 소모임 삭제 (운영자만)
router.delete(
  '/:groupId/subgroups/:subGroupId',
  requireGroupOwner,
  subGroupController.delete
);

export default router;
