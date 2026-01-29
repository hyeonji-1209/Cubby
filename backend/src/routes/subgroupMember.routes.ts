import { Router } from 'express';
import { SubGroupMemberController } from '../controllers/subgroupMember.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const controller = new SubGroupMemberController();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

// 강사 소그룹 관리 (1:1 수업용)
router.post('/groups/:groupId/instructor-subgroups', controller.createInstructorSubGroup);
router.get('/groups/:groupId/instructor-subgroups', controller.getInstructorSubGroups);

// 반(CLASS) 소그룹 관리 (그룹 수업용)
router.post('/groups/:groupId/class-subgroups', controller.createClassSubGroup);
router.get('/groups/:groupId/class-subgroups', controller.getClassSubGroups);
router.put('/groups/:groupId/class-subgroups/:subGroupId', controller.updateClassSubGroup);

// 미배정 학생 조회
router.get('/groups/:groupId/unassigned-students', controller.getUnassignedStudents);

// 소그룹 멤버 관리
router.get('/groups/:groupId/subgroups/:subGroupId/members', controller.getSubGroupMembers);
router.post('/groups/:groupId/subgroups/:subGroupId/members', controller.assignStudentToSubGroup);
router.delete('/groups/:groupId/subgroups/:subGroupId/members/:memberId', controller.removeStudentFromSubGroup);

// 특정 멤버의 강사 소그룹 조회
router.get('/groups/:groupId/members/:memberId/instructor-subgroup', controller.getMemberInstructorSubGroup);

export default router;
