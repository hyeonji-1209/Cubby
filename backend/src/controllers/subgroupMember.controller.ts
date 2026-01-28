import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { SubGroup, SubGroupStatus, SubGroupType } from '../models/SubGroup';
import { SubGroupMember, SubGroupMemberRole } from '../models/SubGroupMember';
import { GroupMember, MemberRole, MemberStatus } from '../models/GroupMember';
import { Group } from '../models/Group';
import { AppError } from '../middlewares/error.middleware';

export class SubGroupMemberController {
  private subGroupRepository = AppDataSource.getRepository(SubGroup);
  private subGroupMemberRepository = AppDataSource.getRepository(SubGroupMember);
  private memberRepository = AppDataSource.getRepository(GroupMember);
  private groupRepository = AppDataSource.getRepository(Group);

  // 강사 소그룹 생성 (다중 강사 모드에서 사용)
  createInstructorSubGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { instructorId, name, description } = req.body;
      const userId = req.user!.id;

      // 그룹 확인
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (!group) {
        throw new AppError('그룹을 찾을 수 없습니다.', 404);
      }

      // 다중 강사 모드 확인
      if (!group.hasMultipleInstructors) {
        throw new AppError('다중 강사 모드가 활성화되지 않았습니다.', 400);
      }

      // owner/admin 권한 확인
      const membership = await this.memberRepository.findOne({
        where: { groupId, userId, status: MemberStatus.ACTIVE },
      });
      if (!membership || ![MemberRole.OWNER, MemberRole.ADMIN].includes(membership.role)) {
        throw new AppError('권한이 없습니다.', 403);
      }

      // 강사 확인 (admin 역할)
      const instructorMembership = await this.memberRepository.findOne({
        where: { groupId, userId: instructorId, status: MemberStatus.ACTIVE },
        relations: ['user'],
      });
      if (!instructorMembership) {
        throw new AppError('강사를 찾을 수 없습니다.', 404);
      }
      if (instructorMembership.role !== MemberRole.ADMIN && instructorMembership.role !== MemberRole.OWNER) {
        throw new AppError('관리자 또는 소유자만 강사로 지정할 수 있습니다.', 400);
      }

      // 이미 해당 강사의 소그룹이 있는지 확인
      const existingSubGroup = await this.subGroupRepository.findOne({
        where: {
          parentGroupId: groupId,
          instructorId,
          type: SubGroupType.INSTRUCTOR,
          status: SubGroupStatus.ACTIVE,
        },
      });
      if (existingSubGroup) {
        throw new AppError('해당 강사의 소그룹이 이미 존재합니다.', 400);
      }

      // 강사 소그룹 생성
      const subGroupName = name || `${instructorMembership.nickname || instructorMembership.user.name} 강사`;
      const subGroup = this.subGroupRepository.create({
        parentGroupId: groupId,
        name: subGroupName,
        description,
        type: SubGroupType.INSTRUCTOR,
        instructorId,
        leaderId: instructorId,
        createdById: userId,
        status: SubGroupStatus.ACTIVE,
        depth: 0,
      });

      await this.subGroupRepository.save(subGroup);

      // 강사를 소그룹 리더로 추가
      const instructorSubGroupMember = this.subGroupMemberRepository.create({
        subGroupId: subGroup.id,
        groupMemberId: instructorMembership.id,
        role: SubGroupMemberRole.LEADER,
      });
      await this.subGroupMemberRepository.save(instructorSubGroupMember);

      res.status(201).json({
        success: true,
        data: {
          ...subGroup,
          instructor: {
            id: instructorMembership.user.id,
            name: instructorMembership.nickname || instructorMembership.user.name,
            profileImage: instructorMembership.user.profileImage,
          },
        },
        message: '강사 소그룹이 생성되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 강사 소그룹 목록 조회
  getInstructorSubGroups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      const subGroups = await this.subGroupRepository.find({
        where: {
          parentGroupId: groupId,
          type: SubGroupType.INSTRUCTOR,
          status: SubGroupStatus.ACTIVE,
        },
        relations: ['instructor'],
        order: { createdAt: 'ASC' },
      });

      // 각 소그룹의 멤버 수 조회
      const result = await Promise.all(
        subGroups.map(async (sg) => {
          const memberCount = await this.subGroupMemberRepository.count({
            where: { subGroupId: sg.id },
          });

          return {
            id: sg.id,
            name: sg.name,
            description: sg.description,
            instructorId: sg.instructorId,
            instructor: sg.instructor
              ? {
                  id: sg.instructor.id,
                  name: sg.instructor.name,
                  profileImage: sg.instructor.profileImage,
                }
              : null,
            memberCount: memberCount - 1, // 강사 제외
            createdAt: sg.createdAt,
          };
        })
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // 소그룹에 학생 배정
  assignStudentToSubGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, subGroupId } = req.params;
      const { memberId } = req.body; // GroupMember ID
      const userId = req.user!.id;

      // 소그룹 확인
      const subGroup = await this.subGroupRepository.findOne({
        where: { id: subGroupId, parentGroupId: groupId, status: SubGroupStatus.ACTIVE },
      });
      if (!subGroup) {
        throw new AppError('소그룹을 찾을 수 없습니다.', 404);
      }

      // 권한 확인 (owner, admin, 또는 해당 소그룹의 강사)
      const membership = await this.memberRepository.findOne({
        where: { groupId, userId, status: MemberStatus.ACTIVE },
      });
      if (!membership) {
        throw new AppError('권한이 없습니다.', 403);
      }

      const isOwnerOrAdmin = [MemberRole.OWNER, MemberRole.ADMIN].includes(membership.role);
      const isInstructor = subGroup.instructorId === userId;
      if (!isOwnerOrAdmin && !isInstructor) {
        throw new AppError('권한이 없습니다.', 403);
      }

      // 학생 멤버십 확인
      const studentMembership = await this.memberRepository.findOne({
        where: { id: memberId, groupId, status: MemberStatus.ACTIVE },
        relations: ['user'],
      });
      if (!studentMembership) {
        throw new AppError('멤버를 찾을 수 없습니다.', 404);
      }

      // 이미 배정되어 있는지 확인
      const existing = await this.subGroupMemberRepository.findOne({
        where: { subGroupId, groupMemberId: memberId },
      });
      if (existing) {
        throw new AppError('이미 해당 소그룹에 배정되어 있습니다.', 400);
      }

      // 소그룹 멤버 추가
      const subGroupMember = this.subGroupMemberRepository.create({
        subGroupId,
        groupMemberId: memberId,
        role: SubGroupMemberRole.MEMBER,
      });
      await this.subGroupMemberRepository.save(subGroupMember);

      res.status(201).json({
        success: true,
        data: {
          id: subGroupMember.id,
          subGroupId,
          groupMember: {
            id: studentMembership.id,
            userId: studentMembership.userId,
            nickname: studentMembership.nickname,
            user: {
              id: studentMembership.user.id,
              name: studentMembership.user.name,
              profileImage: studentMembership.user.profileImage,
            },
          },
          role: subGroupMember.role,
          joinedAt: subGroupMember.joinedAt,
        },
        message: '학생이 소그룹에 배정되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 소그룹에서 학생 제거
  removeStudentFromSubGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, subGroupId, memberId } = req.params;
      const userId = req.user!.id;

      // 소그룹 확인
      const subGroup = await this.subGroupRepository.findOne({
        where: { id: subGroupId, parentGroupId: groupId, status: SubGroupStatus.ACTIVE },
      });
      if (!subGroup) {
        throw new AppError('소그룹을 찾을 수 없습니다.', 404);
      }

      // 권한 확인
      const membership = await this.memberRepository.findOne({
        where: { groupId, userId, status: MemberStatus.ACTIVE },
      });
      if (!membership) {
        throw new AppError('권한이 없습니다.', 403);
      }

      const isOwnerOrAdmin = [MemberRole.OWNER, MemberRole.ADMIN].includes(membership.role);
      const isInstructor = subGroup.instructorId === userId;
      if (!isOwnerOrAdmin && !isInstructor) {
        throw new AppError('권한이 없습니다.', 403);
      }

      // 소그룹 멤버 확인 및 삭제
      const subGroupMember = await this.subGroupMemberRepository.findOne({
        where: { subGroupId, groupMemberId: memberId },
      });
      if (!subGroupMember) {
        throw new AppError('해당 멤버를 찾을 수 없습니다.', 404);
      }

      // 리더(강사)는 삭제 불가
      if (subGroupMember.role === SubGroupMemberRole.LEADER) {
        throw new AppError('강사는 소그룹에서 제거할 수 없습니다.', 400);
      }

      await this.subGroupMemberRepository.remove(subGroupMember);

      res.json({
        success: true,
        message: '학생이 소그룹에서 제거되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 소그룹 멤버 목록 조회
  getSubGroupMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, subGroupId } = req.params;

      // 소그룹 확인
      const subGroup = await this.subGroupRepository.findOne({
        where: { id: subGroupId, parentGroupId: groupId, status: SubGroupStatus.ACTIVE },
      });
      if (!subGroup) {
        throw new AppError('소그룹을 찾을 수 없습니다.', 404);
      }

      const members = await this.subGroupMemberRepository.find({
        where: { subGroupId },
        relations: ['groupMember', 'groupMember.user'],
        order: { role: 'ASC', joinedAt: 'ASC' },
      });

      const result = members.map((m) => ({
        id: m.id,
        subGroupId: m.subGroupId,
        groupMemberId: m.groupMemberId,
        role: m.role,
        joinedAt: m.joinedAt,
        groupMember: m.groupMember
          ? {
              id: m.groupMember.id,
              userId: m.groupMember.userId,
              nickname: m.groupMember.nickname,
              lessonSchedule: m.groupMember.lessonSchedule,
              user: {
                id: m.groupMember.user.id,
                name: m.groupMember.user.name,
                email: m.groupMember.user.email,
                profileImage: m.groupMember.user.profileImage,
              },
            }
          : null,
      }));

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // 특정 멤버가 소속된 강사 소그룹 조회 (수업 기록 권한 체크용)
  getMemberInstructorSubGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, memberId } = req.params;

      const subGroupMember = await this.subGroupMemberRepository.findOne({
        where: { groupMemberId: memberId },
        relations: ['subGroup', 'subGroup.instructor'],
      });

      if (!subGroupMember || subGroupMember.subGroup.parentGroupId !== groupId) {
        res.json({
          success: true,
          data: null,
        });
        return;
      }

      res.json({
        success: true,
        data: {
          subGroupId: subGroupMember.subGroup.id,
          subGroupName: subGroupMember.subGroup.name,
          instructorId: subGroupMember.subGroup.instructorId,
          instructor: subGroupMember.subGroup.instructor
            ? {
                id: subGroupMember.subGroup.instructor.id,
                name: subGroupMember.subGroup.instructor.name,
              }
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 미배정 학생 목록 조회 (강사 소그룹에 배정되지 않은 학생들)
  getUnassignedStudents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      // 모든 멤버 조회 (owner, admin 제외)
      const allMembers = await this.memberRepository.find({
        where: { groupId, status: MemberStatus.ACTIVE },
        relations: ['user'],
      });

      const studentMembers = allMembers.filter(
        (m) => m.role === MemberRole.MEMBER || m.role === MemberRole.GUARDIAN
      );

      // 이미 강사 소그룹에 배정된 멤버 ID들
      const assignedMemberIds = await this.subGroupMemberRepository
        .createQueryBuilder('sgm')
        .innerJoin('sgm.subGroup', 'sg')
        .where('sg.parentGroupId = :groupId', { groupId })
        .andWhere('sg.type = :type', { type: SubGroupType.INSTRUCTOR })
        .andWhere('sg.status = :status', { status: SubGroupStatus.ACTIVE })
        .select('sgm.groupMemberId')
        .getRawMany();

      const assignedIds = new Set(assignedMemberIds.map((r) => r.sgm_groupMemberId));

      // 미배정 학생 필터링
      const unassigned = studentMembers.filter((m) => !assignedIds.has(m.id));

      const result = unassigned.map((m) => ({
        id: m.id,
        userId: m.userId,
        nickname: m.nickname,
        lessonSchedule: m.lessonSchedule,
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          profileImage: m.user.profileImage,
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
