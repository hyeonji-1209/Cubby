import { Request, Response, NextFunction } from 'express';
import { IsNull } from 'typeorm';
import { AppDataSource } from '../config/database';
import {
  Group,
  GroupType,
  GroupStatus,
  EducationSettings,
  CoupleSettings,
  DEFAULT_TYPE_SETTINGS,
} from '../models/Group';
import { GroupMember, MemberRole, MemberStatus, EducationStudentData } from '../models/GroupMember';
import { SubGroup, SubGroupType, SubGroupStatus } from '../models/SubGroup';
import { SubGroupMember, SubGroupMemberRole } from '../models/SubGroupMember';
import { Announcement } from '../models/Announcement';
import { Schedule } from '../models/Schedule';
import { GroupPosition } from '../models/GroupPosition';
import { generateInviteCode, getInviteCodeExpiryDate, isInviteCodeExpired } from '../utils/inviteCode.util';
import { AppError } from '../middlewares/error.middleware';
import { notificationService } from '../services/notification.service';

export class GroupController {
  private groupRepository = AppDataSource.getRepository(Group);
  private memberRepository = AppDataSource.getRepository(GroupMember);
  private subGroupRepository = AppDataSource.getRepository(SubGroup); // Used for counting subgroups
  private subGroupMemberRepository = AppDataSource.getRepository(SubGroupMember);
  private announcementRepository = AppDataSource.getRepository(Announcement);
  private scheduleRepository = AppDataSource.getRepository(Schedule);
  private positionRepository = AppDataSource.getRepository(GroupPosition);

  // 유니크한 초대 코드 생성 헬퍼
  private generateUniqueInviteCode = async (): Promise<string> => {
    let inviteCode = generateInviteCode();
    let existingCode = await this.groupRepository.findOne({ where: { inviteCode } });
    while (existingCode) {
      inviteCode = generateInviteCode();
      existingCode = await this.groupRepository.findOne({ where: { inviteCode } });
    }
    return inviteCode;
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        description,
        type,
        icon,
        color,
        logoImage,
        coverImage,
        settings,
        enabledFeatures,
        // 타입별 설정 (프론트엔드에서 typeSettings로 전달하거나 개별 필드로 전달)
        typeSettings: rawTypeSettings,
        // 하위 호환성: 개별 필드도 지원
        hasClasses,
        hasPracticeRooms,
        allowGuardians,
        hasAttendance,
        hasMultipleInstructors,
        practiceRoomSettings,
        operatingHours,
        // 커플 타입
        anniversaryDate,
        myBirthday,
        coupleRole,
      } = req.body;

      if (!Object.values(GroupType).includes(type)) {
        throw new AppError('Invalid group type', 400);
      }

      const inviteCode = await this.generateUniqueInviteCode();

      // 타입별 설정 생성
      let typeSettings = rawTypeSettings;
      if (!typeSettings) {
        if (type === GroupType.EDUCATION) {
          const isEducation1on1 = !hasClasses;
          typeSettings = {
            hasClasses: hasClasses ?? false,
            hasMultipleInstructors: hasMultipleInstructors ?? false,
            hasAttendance: hasAttendance ?? false,
            hasPracticeRooms: hasPracticeRooms ?? false,
            allowGuardians: allowGuardians ?? false,
            requiresApproval: isEducation1on1,
            allowSameDayChange: false,
            ...(operatingHours && { operatingHours }),
            ...(practiceRoomSettings && { practiceRoomSettings }),
          } as EducationSettings;
        } else if (type === GroupType.COUPLE) {
          typeSettings = {
            anniversaryDate,
            myBirthday,
            myRole: coupleRole,
          } as CoupleSettings;
        } else {
          typeSettings = DEFAULT_TYPE_SETTINGS[type as GroupType] || null;
        }
      }

      const group = this.groupRepository.create({
        name,
        description,
        type,
        icon,
        color,
        logoImage,
        coverImage,
        inviteCode,
        inviteCodeExpiresAt: getInviteCodeExpiryDate(),
        settings,
        enabledFeatures,
        ownerId: req.user!.id,
        typeSettings,
      });

      await this.groupRepository.save(group);

      // 생성자를 운영자로 추가
      const membership = this.memberRepository.create({
        groupId: group.id,
        userId: req.user!.id,
        role: MemberRole.OWNER,
        status: MemberStatus.ACTIVE,
      });
      await this.memberRepository.save(membership);

      res.status(201).json({
        success: true,
        data: {
          ...group,
          myMembershipId: membership.id,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 초대 코드 검증 (가입 전 그룹 정보 확인)
  validateInviteCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { inviteCode } = req.body;

      const group = await this.groupRepository.findOne({
        where: { inviteCode, status: GroupStatus.ACTIVE },
      });

      if (!group) {
        throw new AppError('Invalid invite code', 400);
      }

      // 초대 코드 유효기간 확인
      if (isInviteCodeExpired(group.inviteCodeExpiresAt)) {
        throw new AppError('Invite code has expired', 400);
      }

      // 이미 멤버인지 확인
      const existingMembership = await this.memberRepository.findOne({
        where: {
          groupId: group.id,
          userId: req.user!.id,
          status: MemberStatus.ACTIVE,
        },
      });

      if (existingMembership) {
        throw new AppError('Already a member of this group', 400);
      }

      // 직책 목록 조회 (메인 그룹 직책만)
      const positions = await this.positionRepository.find({
        where: { groupId: group.id, isActive: true, subGroupId: IsNull() },
        order: { sortOrder: 'ASC' },
      });

      res.json({
        success: true,
        data: {
          id: group.id,
          name: group.name,
          type: group.type,
          allowGuardians: group.allowGuardians,
          positions: positions.map((p: GroupPosition) => ({ id: p.id, name: p.name, color: p.color })),
        },
        message: 'Invite code is valid',
      });
    } catch (error) {
      next(error);
    }
  };

  joinByInviteCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { inviteCode, isGuardian, childInfo, positionId } = req.body;

      const group = await this.groupRepository.findOne({
        where: { inviteCode, status: GroupStatus.ACTIVE },
      });

      if (!group) {
        throw new AppError('Invalid invite code', 400);
      }

      // 초대 코드 유효기간 확인
      if (isInviteCodeExpired(group.inviteCodeExpiresAt)) {
        throw new AppError('Invite code has expired', 400);
      }

      // 보호자로 가입하려는데 보호자 허용이 안된 그룹인 경우
      if (isGuardian && !group.allowGuardians) {
        throw new AppError('This group does not allow guardian membership', 400);
      }

      // 이미 멤버인지 확인
      const existingMembership = await this.memberRepository.findOne({
        where: {
          groupId: group.id,
          userId: req.user!.id,
        },
      });

      // 멤버 역할 결정
      const role = isGuardian ? MemberRole.GUARDIAN : MemberRole.MEMBER;

      // 가입 승인 필요 여부 확인 (보호자는 승인 불필요)
      const needsApproval = group.requiresApproval && !isGuardian;
      const memberStatus = needsApproval ? MemberStatus.PENDING : MemberStatus.ACTIVE;

      let savedMembership: GroupMember;

      if (existingMembership) {
        if (existingMembership.status === MemberStatus.ACTIVE) {
          throw new AppError('Already a member of this group', 400);
        }
        if (existingMembership.status === MemberStatus.PENDING) {
          // 이미 대기 중인 경우 에러 대신 정보 반환
          return res.json({
            success: true,
            data: {
              id: group.id,
              name: group.name,
              type: group.type,
              allowGuardians: group.allowGuardians,
              requiresApproval: group.requiresApproval,
              isPending: true,
              alreadyPending: true,
            },
          });
        }
        // 이전에 탈퇴했다면 다시 활성화/대기
        existingMembership.status = memberStatus;
        existingMembership.role = role;
        if (isGuardian && childInfo) {
          existingMembership.typeData = { children: childInfo };
        }
        if (positionId) {
          existingMembership.positionId = positionId;
        }
        savedMembership = await this.memberRepository.save(existingMembership);
      } else {
        // 새 멤버로 추가
        const membership = this.memberRepository.create({
          groupId: group.id,
          userId: req.user!.id,
          role,
          status: memberStatus,
          typeData: isGuardian && childInfo ? { children: childInfo } : undefined,
          positionId: positionId || undefined,
        });
        savedMembership = await this.memberRepository.save(membership);
      }

      // 가입 신청 알림 (승인 대기 상태인 경우 관리자에게 알림)
      if (needsApproval) {
        await notificationService.notifyMemberJoinRequest({
          groupId: group.id,
          groupName: group.name,
          requesterName: req.user!.name,
          requesterId: req.user!.id,
          memberId: savedMembership.id,
        });
      } else {
        // 바로 가입인 경우 관리자에게 알림
        await notificationService.notifyMemberJoined({
          groupId: group.id,
          groupName: group.name,
          memberName: req.user!.name,
          memberId: savedMembership.id,
        });
      }

      // 직책 목록 조회 (메인 그룹 직책만, 소모임 직책 제외)
      const positions = await this.positionRepository.find({
        where: { groupId: group.id, isActive: true, subGroupId: IsNull() },
        order: { sortOrder: 'ASC' },
      });

      res.json({
        success: true,
        data: {
          id: group.id,
          name: group.name,
          type: group.type,
          allowGuardians: group.allowGuardians,
          requiresApproval: group.requiresApproval,
          isPending: needsApproval,
          positions: positions.map((p: GroupPosition) => ({ id: p.id, name: p.name, color: p.color })),
        },
        message: needsApproval ? 'Join request submitted. Waiting for approval.' : 'Joined group successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      const group = await this.groupRepository.findOne({
        where: { id: groupId },
        relations: ['owner'],
      });

      if (!group) {
        throw new AppError('Group not found', 404);
      }

      // 멤버 수 조회
      const memberCount = await this.memberRepository.count({
        where: { groupId, status: MemberStatus.ACTIVE },
      });

      // 소모임 수 조회
      const subGroupCount = await this.subGroupRepository.count({
        where: { parentGroupId: groupId },
      });

      // 현재 사용자의 역할 조회
      const currentMembership = await this.memberRepository.findOne({
        where: { groupId, userId: req.user!.id, status: MemberStatus.ACTIVE },
      });

      // toJSON()을 명시적으로 호출하여 getter 값(hasClasses, operatingHours 등)을 포함
      res.json({
        success: true,
        data: {
          ...group.toJSON(),
          memberCount,
          subGroupCount,
          myRole: currentMembership?.role,
          owner: {
            id: group.owner.id,
            name: group.owner.name,
            profileImage: group.owner.profileImage,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 홈탭용 통합 조회 (그룹 정보 + 최근 공지사항 + 이번 달 일정)
  getOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      // 그룹 정보 조회
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
        relations: ['owner'],
      });

      if (!group) {
        throw new AppError('Group not found', 404);
      }

      // 멤버 수, 소모임 수 조회
      const [memberCount, subGroupCount] = await Promise.all([
        this.memberRepository.count({
          where: { groupId, status: MemberStatus.ACTIVE },
        }),
        this.subGroupRepository.count({
          where: { parentGroupId: groupId },
        }),
      ]);

      // 현재 사용자의 역할 조회
      const currentMembership = await this.memberRepository.findOne({
        where: { groupId, userId: req.user!.id, status: MemberStatus.ACTIVE },
      });

      // 최근 공지사항 5개 (고정 우선, 최신순)
      const announcements = await this.announcementRepository
        .createQueryBuilder('announcement')
        .leftJoinAndSelect('announcement.author', 'author')
        .where('announcement.groupId = :groupId', { groupId })
        .andWhere('announcement.isPublished = :isPublished', { isPublished: true })
        .andWhere('announcement.deletedAt IS NULL')
        .orderBy('announcement.isPinned', 'DESC')
        .addOrderBy('announcement.createdAt', 'DESC')
        .take(5)
        .getMany();

      // 이번 달 일정
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const schedules = await this.scheduleRepository
        .createQueryBuilder('schedule')
        .leftJoinAndSelect('schedule.author', 'author')
        .where('schedule.groupId = :groupId', { groupId })
        .andWhere('schedule.deletedAt IS NULL')
        .andWhere(
          '(schedule.startAt BETWEEN :startOfMonth AND :endOfMonth OR schedule.endAt BETWEEN :startOfMonth AND :endOfMonth)',
          { startOfMonth, endOfMonth }
        )
        .orderBy('schedule.startAt', 'ASC')
        .getMany();

      // toJSON()을 명시적으로 호출하여 getter 값(hasClasses, operatingHours 등)을 포함
      res.json({
        success: true,
        data: {
          group: {
            ...group.toJSON(),
            memberCount,
            subGroupCount,
            myRole: currentMembership?.role,
            owner: {
              id: group.owner.id,
              name: group.owner.name,
              profileImage: group.owner.profileImage,
            },
          },
          announcements: announcements.map((a) => ({
            id: a.id,
            title: a.title,
            isPinned: a.isPinned,
            isAdminOnly: a.isAdminOnly,
            hasAttachments: !!(a.attachments && a.attachments.length > 0),
            author: {
              id: a.author.id,
              name: a.author.name,
              profileImage: a.author.profileImage,
            },
            createdAt: a.createdAt,
          })),
          schedules: schedules.map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            startAt: s.startAt,
            endAt: s.endAt,
            isAllDay: s.isAllDay,
            location: s.location,
            color: s.color,
            authorId: s.authorId,
            author: {
              id: s.author.id,
              name: s.author.name,
              profileImage: s.author.profileImage,
            },
            createdAt: s.createdAt,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const {
        name,
        description,
        icon,
        color,
        logoImage,
        coverImage,
        settings,
        enabledFeatures,
        // 타입별 설정 (전체 교체 또는 개별 필드)
        typeSettings: rawTypeSettings,
        // 하위 호환성: education 개별 필드
        hasClasses,
        hasPracticeRooms,
        allowGuardians,
        hasAttendance,
        hasMultipleInstructors,
        requiresApproval,
        allowSameDayChange,
        practiceRoomSettings,
        operatingHours,
      } = req.body;

      const group = await this.groupRepository.findOne({ where: { id: groupId } });

      if (!group) {
        throw new AppError('Group not found', 404);
      }

      // 기본 필드 업데이트
      if (name) group.name = name;
      if (description !== undefined) group.description = description;
      if (icon !== undefined) group.icon = icon;
      if (color !== undefined) group.color = color;
      if (logoImage !== undefined) group.logoImage = logoImage;
      if (coverImage !== undefined) group.coverImage = coverImage;
      if (settings !== undefined) group.settings = settings;
      if (enabledFeatures !== undefined) group.enabledFeatures = enabledFeatures;

      // 타입별 설정 업데이트
      if (rawTypeSettings !== undefined) {
        // 전체 교체
        group.typeSettings = rawTypeSettings;
      } else if (group.type === GroupType.EDUCATION) {
        // 개별 필드 업데이트 (education 타입)
        const currentSettings = (group.typeSettings || {}) as EducationSettings;
        group.typeSettings = {
          ...currentSettings,
          ...(hasClasses !== undefined && { hasClasses }),
          ...(hasPracticeRooms !== undefined && { hasPracticeRooms }),
          ...(allowGuardians !== undefined && { allowGuardians }),
          ...(hasAttendance !== undefined && { hasAttendance }),
          ...(hasMultipleInstructors !== undefined && { hasMultipleInstructors }),
          ...(requiresApproval !== undefined && { requiresApproval }),
          ...(allowSameDayChange !== undefined && { allowSameDayChange }),
          ...(practiceRoomSettings !== undefined && { practiceRoomSettings }),
          ...(operatingHours !== undefined && { operatingHours }),
        };
      }

      await this.groupRepository.save(group);

      // toJSON()을 명시적으로 호출하여 getter 값 포함
      res.json({
        success: true,
        data: group.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      await this.groupRepository.softDelete(groupId);

      res.json({
        success: true,
        message: 'Group deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  regenerateInviteCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      const group = await this.groupRepository.findOne({ where: { id: groupId } });

      if (!group) {
        throw new AppError('Group not found', 404);
      }

      const inviteCode = await this.generateUniqueInviteCode();
      group.inviteCode = inviteCode;
      group.inviteCodeExpiresAt = getInviteCodeExpiryDate();

      await this.groupRepository.save(group);

      res.json({
        success: true,
        data: {
          inviteCode,
          expiresAt: group.inviteCodeExpiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { role, status } = req.query;

      const queryBuilder = this.memberRepository
        .createQueryBuilder('member')
        .leftJoinAndSelect('member.user', 'user')
        .where('member.groupId = :groupId', { groupId });

      if (role) {
        queryBuilder.andWhere('member.role = :role', { role });
      }

      if (status) {
        queryBuilder.andWhere('member.status = :status', { status });
      } else {
        queryBuilder.andWhere('member.status = :status', { status: MemberStatus.ACTIVE });
      }

      const members = await queryBuilder
        .orderBy('member.role', 'ASC')
        .addOrderBy('member.joinedAt', 'ASC')
        .getMany();

      const result = members.map((member) => ({
        id: member.id,
        role: member.role,
        status: member.status,
        nickname: member.nickname,
        title: member.title,
        positionId: member.positionId,
        childInfo: member.childInfo,
        lessonSchedule: member.lessonSchedule,
        paymentDueDay: member.paymentDueDay,
        joinedAt: member.joinedAt,
        user: {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          profileImage: member.user.profileImage,
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

  updateMemberRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, memberId } = req.params;
      const { role } = req.body;

      const membership = await this.memberRepository.findOne({
        where: { id: memberId, groupId },
        relations: ['user'],
      });

      if (!membership) {
        throw new AppError('Member not found', 404);
      }

      // 운영자 역할은 변경 불가
      if (membership.role === MemberRole.OWNER) {
        throw new AppError('Cannot change owner role', 400);
      }

      if (!Object.values(MemberRole).includes(role) || role === MemberRole.OWNER) {
        throw new AppError('Invalid role', 400);
      }

      const previousRole = membership.role;
      membership.role = role;
      await this.memberRepository.save(membership);

      // 그룹 수업 모드에서 LEADER(강사)로 역할 변경 시 자동으로 강사별 소그룹 생성
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (
        group &&
        group.type === GroupType.EDUCATION &&
        group.hasClasses === true &&
        role === MemberRole.LEADER &&
        previousRole !== MemberRole.LEADER
      ) {
        // 이미 해당 강사의 소그룹이 있는지 확인
        const existingInstructorSubGroup = await this.subGroupRepository.findOne({
          where: {
            parentGroupId: groupId,
            type: SubGroupType.INSTRUCTOR,
            instructorId: membership.userId,
          },
        });

        if (!existingInstructorSubGroup) {
          // 강사별 소그룹 자동 생성
          const instructorName = membership.user?.name || membership.nickname || '강사';
          const instructorSubGroup = this.subGroupRepository.create({
            parentGroupId: groupId,
            name: `${instructorName} 반`,
            description: `${instructorName} 강사의 수업`,
            leaderId: membership.userId,
            instructorId: membership.userId,
            type: SubGroupType.INSTRUCTOR,
            status: SubGroupStatus.ACTIVE,
            depth: 0,
            createdById: req.user!.id,
          });

          const savedSubGroup = await this.subGroupRepository.save(instructorSubGroup);

          // 강사를 소그룹의 리더로 자동 추가
          const subGroupMember = this.subGroupMemberRepository.create({
            subGroupId: savedSubGroup.id,
            groupMemberId: membership.id,
            role: SubGroupMemberRole.LEADER,
          });
          await this.subGroupMemberRepository.save(subGroupMember);
        }
      }

      res.json({
        success: true,
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  };

  removeMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, memberId } = req.params;

      const membership = await this.memberRepository.findOne({
        where: { id: memberId, groupId },
      });

      if (!membership) {
        throw new AppError('Member not found', 404);
      }

      // 운영자는 제거 불가
      if (membership.role === MemberRole.OWNER) {
        throw new AppError('Cannot remove owner', 400);
      }

      await this.memberRepository.delete(memberId);

      res.json({
        success: true,
        message: 'Member removed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  leave = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      const membership = await this.memberRepository.findOne({
        where: { groupId, userId: req.user!.id },
      });

      if (!membership) {
        throw new AppError('Not a member of this group', 400);
      }

      // 운영자는 나가기 불가 (소유권 이전 필요)
      if (membership.role === MemberRole.OWNER) {
        throw new AppError('Owner cannot leave. Transfer ownership first.', 400);
      }

      // 교육 타입 그룹에서 일반 멤버는 직접 나가기 불가
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (group?.type === GroupType.EDUCATION && membership.role === MemberRole.MEMBER) {
        throw new AppError('학생은 직접 모임을 나갈 수 없습니다. 관리자에게 문의해주세요.', 400);
      }

      await this.memberRepository.delete(membership.id);

      res.json({
        success: true,
        message: 'Left group successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // 본인 프로필 수정 (닉네임, 직책)
  updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { nickname, title, positionId } = req.body;

      const membership = await this.memberRepository.findOne({
        where: { groupId, userId: req.user!.id, status: MemberStatus.ACTIVE },
      });

      if (!membership) {
        throw new AppError('Not a member of this group', 400);
      }

      if (nickname !== undefined) membership.nickname = nickname;
      if (title !== undefined) membership.title = title;
      if (positionId !== undefined) membership.positionId = positionId;

      await this.memberRepository.save(membership);

      res.json({
        success: true,
        data: {
          nickname: membership.nickname,
          title: membership.title,
          positionId: membership.positionId,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 멤버 수업 정보 업데이트 (1:1 교육 그룹용)
  updateMemberLessonInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, memberId } = req.params;
      const { lessonSchedule, paymentDueDay, instructorId } = req.body;

      // 권한 확인: 관리자만 수정 가능
      const currentMembership = await this.memberRepository.findOne({
        where: { groupId, userId: req.user!.id, status: MemberStatus.ACTIVE },
      });

      if (!currentMembership || ![MemberRole.OWNER, MemberRole.ADMIN].includes(currentMembership.role)) {
        throw new AppError('Only admins can update member lesson info', 403);
      }

      const membership = await this.memberRepository.findOne({
        where: { id: memberId, groupId },
        relations: ['user'],
      });

      if (!membership) {
        throw new AppError('Member not found', 404);
      }

      // typeData를 통해 업데이트
      const currentTypeData = (membership.typeData || {}) as EducationStudentData;
      membership.typeData = {
        ...currentTypeData,
        ...(lessonSchedule !== undefined && { lessonSchedule }),
        ...(paymentDueDay !== undefined && { paymentDueDay }),
        ...(instructorId !== undefined && { instructorId }),
      };

      await this.memberRepository.save(membership);

      const typeData = membership.typeData as EducationStudentData;

      res.json({
        success: true,
        data: {
          id: membership.id,
          lessonSchedule: typeData?.lessonSchedule,
          paymentDueDay: typeData?.paymentDueDay,
          instructorId: typeData?.instructorId,
          user: {
            id: membership.user.id,
            name: membership.user.name,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 가입 대기 멤버 목록 조회
  getPendingMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      // 권한 확인: 관리자만 조회 가능
      const currentMembership = await this.memberRepository.findOne({
        where: { groupId, userId: req.user!.id, status: MemberStatus.ACTIVE },
      });

      if (!currentMembership || ![MemberRole.OWNER, MemberRole.ADMIN].includes(currentMembership.role)) {
        throw new AppError('Only admins can view pending members', 403);
      }

      const pendingMembers = await this.memberRepository.find({
        where: { groupId, status: MemberStatus.PENDING },
        relations: ['user'],
        order: { joinedAt: 'ASC' },
      });

      const result = pendingMembers.map((member) => ({
        id: member.id,
        role: member.role,
        status: member.status,
        positionId: member.positionId,
        joinedAt: member.joinedAt,
        user: {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          profileImage: member.user.profileImage,
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

  // 멤버 승인 (1:1 교육 그룹용 - 강사/레슨시간/납부일 설정 포함)
  approveMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, memberId } = req.params;
      const { instructorId, lessonSchedule, paymentDueDay } = req.body;

      // 권한 확인: 관리자만 승인 가능
      const currentMembership = await this.memberRepository.findOne({
        where: { groupId, userId: req.user!.id, status: MemberStatus.ACTIVE },
      });

      if (!currentMembership || ![MemberRole.OWNER, MemberRole.ADMIN].includes(currentMembership.role)) {
        throw new AppError('Only admins can approve members', 403);
      }

      const membership = await this.memberRepository.findOne({
        where: { id: memberId, groupId, status: MemberStatus.PENDING },
        relations: ['user'],
      });

      if (!membership) {
        throw new AppError('Pending member not found', 404);
      }

      // 그룹 정보 조회 (1:1 수업인지 확인)
      const group = await this.groupRepository.findOne({ where: { id: groupId } });

      // 승인 처리
      membership.status = MemberStatus.ACTIVE;

      // 1:1 교육 그룹인 경우 추가 정보 설정 (typeData 사용)
      if (group && group.type === GroupType.EDUCATION && !group.hasClasses) {
        const currentTypeData = (membership.typeData || {}) as EducationStudentData;
        const actualInstructorId = instructorId || (group.hasMultipleInstructors ? null : group.ownerId);

        membership.typeData = {
          ...currentTypeData,
          ...(actualInstructorId && { instructorId: actualInstructorId }),
          ...(lessonSchedule && { lessonSchedule }),
          ...(paymentDueDay && { paymentDueDay }),
        };
      }

      await this.memberRepository.save(membership);

      // 승인 알림 전송
      await notificationService.notifyMemberApproved({
        userId: membership.userId,
        groupId: group!.id,
        groupName: group!.name,
      });

      // 응답 데이터 (하위 호환성)
      const typeData = membership.typeData as EducationStudentData | null;

      res.json({
        success: true,
        data: {
          id: membership.id,
          status: membership.status,
          instructorId: typeData?.instructorId,
          lessonSchedule: typeData?.lessonSchedule,
          paymentDueDay: typeData?.paymentDueDay,
          user: {
            id: membership.user.id,
            name: membership.user.name,
          },
        },
        message: 'Member approved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // 멤버 거부/삭제
  rejectMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, memberId } = req.params;
      const { reason } = req.body;

      // 권한 확인: 관리자만 거부 가능
      const currentMembership = await this.memberRepository.findOne({
        where: { groupId, userId: req.user!.id, status: MemberStatus.ACTIVE },
      });

      if (!currentMembership || ![MemberRole.OWNER, MemberRole.ADMIN].includes(currentMembership.role)) {
        throw new AppError('Only admins can reject members', 403);
      }

      const membership = await this.memberRepository.findOne({
        where: { id: memberId, groupId, status: MemberStatus.PENDING },
      });

      if (!membership) {
        throw new AppError('Pending member not found', 404);
      }

      // 그룹 정보 조회
      const group = await this.groupRepository.findOne({ where: { id: groupId } });

      // 거절 알림 전송
      await notificationService.notifyMemberRejected({
        userId: membership.userId,
        groupId,
        groupName: group?.name || '모임',
        reason,
      });

      await this.memberRepository.delete(memberId);

      res.json({
        success: true,
        message: 'Member rejected successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // 강사 목록 조회 (다중 강사 모드용)
  getInstructors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      // 그룹 멤버인지 확인
      const currentMembership = await this.memberRepository.findOne({
        where: { groupId, userId: req.user!.id, status: MemberStatus.ACTIVE },
      });

      if (!currentMembership) {
        throw new AppError('Not a member of this group', 403);
      }

      // 강사 (OWNER, ADMIN, LEADER) 목록 조회
      const instructors = await this.memberRepository.find({
        where: [
          { groupId, status: MemberStatus.ACTIVE, role: MemberRole.OWNER },
          { groupId, status: MemberStatus.ACTIVE, role: MemberRole.ADMIN },
          { groupId, status: MemberStatus.ACTIVE, role: MemberRole.LEADER },
        ],
        relations: ['user'],
        order: { role: 'ASC', joinedAt: 'ASC' },
      });

      const result = instructors.map((member) => ({
        id: member.id,
        role: member.role,
        nickname: member.nickname,
        title: member.title,
        user: {
          id: member.user.id,
          name: member.user.name,
          profileImage: member.user.profileImage,
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
