import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Group, GroupType, GroupStatus } from '../models/Group';
import { GroupMember, MemberRole, MemberStatus } from '../models/GroupMember';
import { SubGroup } from '../models/SubGroup';
import { Announcement } from '../models/Announcement';
import { Schedule } from '../models/Schedule';
import { generateInviteCode, getInviteCodeExpiryDate, isInviteCodeExpired } from '../utils/inviteCode.util';
import { AppError } from '../middlewares/error.middleware';

export class GroupController {
  private groupRepository = AppDataSource.getRepository(Group);
  private memberRepository = AppDataSource.getRepository(GroupMember);
  private subGroupRepository = AppDataSource.getRepository(SubGroup);
  private announcementRepository = AppDataSource.getRepository(Announcement);
  private scheduleRepository = AppDataSource.getRepository(Schedule);

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, type, icon, color, logoImage, coverImage, settings, enabledFeatures } = req.body;

      if (!Object.values(GroupType).includes(type)) {
        throw new AppError('Invalid group type', 400);
      }

      let inviteCode = generateInviteCode();
      let existingCode = await this.groupRepository.findOne({ where: { inviteCode } });
      while (existingCode) {
        inviteCode = generateInviteCode();
        existingCode = await this.groupRepository.findOne({ where: { inviteCode } });
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

  joinByInviteCode = async (req: Request, res: Response, next: NextFunction) => {
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
        },
      });

      if (existingMembership) {
        if (existingMembership.status === MemberStatus.ACTIVE) {
          throw new AppError('Already a member of this group', 400);
        }
        // 이전에 탈퇴했다면 다시 활성화
        existingMembership.status = MemberStatus.ACTIVE;
        await this.memberRepository.save(existingMembership);
      } else {
        // 새 멤버로 추가
        const membership = this.memberRepository.create({
          groupId: group.id,
          userId: req.user!.id,
          role: MemberRole.MEMBER,
          status: MemberStatus.ACTIVE,
        });
        await this.memberRepository.save(membership);
      }

      res.json({
        success: true,
        data: {
          id: group.id,
          name: group.name,
          type: group.type,
        },
        message: 'Joined group successfully',
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

      res.json({
        success: true,
        data: {
          ...group,
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

      res.json({
        success: true,
        data: {
          group: {
            ...group,
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
      const { name, description, icon, color, logoImage, coverImage, settings, enabledFeatures } = req.body;

      const group = await this.groupRepository.findOne({ where: { id: groupId } });

      if (!group) {
        throw new AppError('Group not found', 404);
      }

      if (name) group.name = name;
      if (description !== undefined) group.description = description;
      if (icon !== undefined) group.icon = icon;
      if (color !== undefined) group.color = color;
      if (logoImage !== undefined) group.logoImage = logoImage;
      if (coverImage !== undefined) group.coverImage = coverImage;
      if (settings !== undefined) group.settings = settings;
      if (enabledFeatures !== undefined) group.enabledFeatures = enabledFeatures;

      await this.groupRepository.save(group);

      res.json({
        success: true,
        data: group,
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

      // 새 초대 코드 생성
      let inviteCode = generateInviteCode();
      let existingCode = await this.groupRepository.findOne({ where: { inviteCode } });
      while (existingCode) {
        inviteCode = generateInviteCode();
        existingCode = await this.groupRepository.findOne({ where: { inviteCode } });
      }

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

      membership.role = role;
      await this.memberRepository.save(membership);

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
      const { nickname, title } = req.body;

      const membership = await this.memberRepository.findOne({
        where: { groupId, userId: req.user!.id, status: MemberStatus.ACTIVE },
      });

      if (!membership) {
        throw new AppError('Not a member of this group', 400);
      }

      if (nickname !== undefined) membership.nickname = nickname;
      if (title !== undefined) membership.title = title;

      await this.memberRepository.save(membership);

      res.json({
        success: true,
        data: {
          nickname: membership.nickname,
          title: membership.title,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // === 소모임 관련 ===
  getSubGroups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      const subGroups = await this.subGroupRepository.find({
        where: { parentGroupId: groupId },
        relations: ['leader'],
        order: { createdAt: 'ASC' },
      });

      res.json({
        success: true,
        data: subGroups.map((sg) => ({
          ...sg,
          leader: sg.leader
            ? {
                id: sg.leader.id,
                name: sg.leader.name,
                profileImage: sg.leader.profileImage,
              }
            : null,
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  createSubGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { name, description, coverImage, leaderId, settings } = req.body;

      const subGroup = this.subGroupRepository.create({
        parentGroupId: groupId,
        name,
        description,
        coverImage,
        leaderId,
        settings,
      });

      await this.subGroupRepository.save(subGroup);

      res.status(201).json({
        success: true,
        data: subGroup,
      });
    } catch (error) {
      next(error);
    }
  };

  getSubGroupById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { subGroupId } = req.params;

      const subGroup = await this.subGroupRepository.findOne({
        where: { id: subGroupId },
        relations: ['leader', 'parentGroup'],
      });

      if (!subGroup) {
        throw new AppError('SubGroup not found', 404);
      }

      res.json({
        success: true,
        data: subGroup,
      });
    } catch (error) {
      next(error);
    }
  };

  updateSubGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { subGroupId } = req.params;
      const { name, description, coverImage, leaderId, settings } = req.body;

      const subGroup = await this.subGroupRepository.findOne({
        where: { id: subGroupId },
      });

      if (!subGroup) {
        throw new AppError('SubGroup not found', 404);
      }

      if (name) subGroup.name = name;
      if (description !== undefined) subGroup.description = description;
      if (coverImage !== undefined) subGroup.coverImage = coverImage;
      if (leaderId !== undefined) subGroup.leaderId = leaderId;
      if (settings !== undefined) subGroup.settings = settings;

      await this.subGroupRepository.save(subGroup);

      res.json({
        success: true,
        data: subGroup,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteSubGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { subGroupId } = req.params;

      await this.subGroupRepository.softDelete(subGroupId);

      res.json({
        success: true,
        message: 'SubGroup deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
