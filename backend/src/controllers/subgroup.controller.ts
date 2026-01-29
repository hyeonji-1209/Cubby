import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { FindOptionsWhere, IsNull } from 'typeorm';
import { SubGroup, SubGroupStatus } from '../models/SubGroup';
import { SubGroupRequest, RequestStatus } from '../models/SubGroupRequest';
import { GroupMember, MemberRole, MemberStatus } from '../models/GroupMember';
import { Group } from '../models/Group';
import { NotificationType } from '../models/Notification';
import { AppError } from '../middlewares/error.middleware';
import { subscriptionService } from '../services/subscription.service';
import { notificationService } from '../services/notification.service';

export class SubGroupController {
  private subGroupRepository = AppDataSource.getRepository(SubGroup);
  private requestRepository = AppDataSource.getRepository(SubGroupRequest);
  private memberRepository = AppDataSource.getRepository(GroupMember);
  private groupRepository = AppDataSource.getRepository(Group);

  // 소모임 생성 요청
  requestCreate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { name, description, parentSubGroupId } = req.body;
      const userId = req.user!.id;

      // 모임 존재 확인
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (!group) {
        throw new AppError('모임을 찾을 수 없습니다.', 404);
      }

      // 멤버인지 확인
      const membership = await this.memberRepository.findOne({
        where: { groupId, userId, status: MemberStatus.ACTIVE },
      });

      if (!membership) {
        throw new AppError('모임 멤버만 소모임을 생성할 수 있습니다.', 403);
      }

      // 구독 플랜 제한 체크
      const canCreate = await subscriptionService.canCreateSubGroup(userId, groupId, parentSubGroupId);
      if (!canCreate.allowed) {
        throw new AppError(canCreate.reason || '소모임을 생성할 수 없습니다.', 403);
      }

      // 상위 소모임 존재 확인 (중첩 구조)
      if (parentSubGroupId) {
        const parentSubGroup = await this.subGroupRepository.findOne({
          where: { id: parentSubGroupId, parentGroupId: groupId, status: SubGroupStatus.ACTIVE },
        });
        if (!parentSubGroup) {
          throw new AppError('상위 소모임을 찾을 수 없습니다.', 404);
        }
      }

      // 관리자인 경우 바로 생성, 아닌 경우 요청 생성
      const isAdmin = [MemberRole.OWNER, MemberRole.ADMIN].includes(membership.role);
      const isLeaderOfParent =
        parentSubGroupId &&
        (await this.subGroupRepository.findOne({
          where: { id: parentSubGroupId, leaderId: userId },
        }));

      if (isAdmin || isLeaderOfParent) {
        // 바로 생성
        const subGroup = this.subGroupRepository.create({
          parentGroupId: groupId,
          parentSubGroupId: parentSubGroupId || undefined,
          depth: canCreate.depth || 0,
          name,
          description,
          createdById: userId,
          leaderId: userId,
          status: SubGroupStatus.ACTIVE,
        });

        await this.subGroupRepository.save(subGroup);

        // 상위 관리자에게 알림 (정보성)
        if (parentSubGroupId) {
          await notificationService.notifyGroupAdmins(groupId, {
            type: NotificationType.SUBGROUP_CREATED_NOTIFY,
            title: '소모임 생성 알림',
            message: `${req.user!.name}님이 새로운 소모임 "${name}"을(를) 생성했습니다.`,
            data: { subGroupId: subGroup.id },
            excludeUserId: userId,
          });
        }

        return res.status(201).json({
          success: true,
          data: subGroup,
          message: '소모임이 생성되었습니다.',
        });
      }

      // 일반 멤버: 승인 요청 생성
      const request = this.requestRepository.create({
        groupId,
        parentSubGroupId: parentSubGroupId || undefined,
        requesterId: userId,
        name,
        description,
        status: RequestStatus.PENDING,
      });

      await this.requestRepository.save(request);

      // 승인권자에게 알림 발송
      await notificationService.notifySubGroupRequest({
        groupId,
        parentSubGroupId,
        requesterName: req.user!.name,
        subGroupName: name,
        requestId: request.id,
      });

      res.status(201).json({
        success: true,
        data: request,
        message: '소모임 생성 요청이 제출되었습니다. 관리자 승인을 기다려주세요.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 소모임 요청 목록 조회 (관리자용)
  getRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { status } = req.query;

      const queryBuilder = this.requestRepository
        .createQueryBuilder('request')
        .leftJoinAndSelect('request.requester', 'requester')
        .leftJoinAndSelect('request.parentSubGroup', 'parentSubGroup')
        .where('request.groupId = :groupId', { groupId });

      if (status) {
        queryBuilder.andWhere('request.status = :status', { status });
      }

      const requests = await queryBuilder.orderBy('request.createdAt', 'DESC').getMany();

      res.json({
        success: true,
        data: requests.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          status: r.status,
          createdAt: r.createdAt,
          requester: {
            id: r.requester.id,
            name: r.requester.name,
            profileImage: r.requester.profileImage,
          },
          parentSubGroup: r.parentSubGroup
            ? { id: r.parentSubGroup.id, name: r.parentSubGroup.name }
            : null,
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  // 소모임 요청 승인
  approveRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, requestId } = req.params;
      const userId = req.user!.id;

      const request = await this.requestRepository.findOne({
        where: { id: requestId, groupId, status: RequestStatus.PENDING },
        relations: ['requester', 'parentSubGroup'],
      });

      if (!request) {
        throw new AppError('요청을 찾을 수 없거나 이미 처리되었습니다.', 404);
      }

      // 승인 권한 체크
      const hasPermission = await this.checkApprovalPermission(
        userId,
        groupId,
        request.parentSubGroupId
      );

      if (!hasPermission) {
        throw new AppError('승인 권한이 없습니다.', 403);
      }

      // 구독 제한 재확인
      const canCreate = await subscriptionService.canCreateSubGroup(
        request.requesterId,
        groupId,
        request.parentSubGroupId
      );

      if (!canCreate.allowed) {
        throw new AppError(canCreate.reason || '구독 제한으로 소모임을 생성할 수 없습니다.', 403);
      }

      // 소모임 생성
      const subGroup = this.subGroupRepository.create({
        parentGroupId: groupId,
        parentSubGroupId: request.parentSubGroupId || undefined,
        depth: canCreate.depth || 0,
        name: request.name,
        description: request.description,
        createdById: request.requesterId,
        leaderId: request.requesterId,
        status: SubGroupStatus.ACTIVE,
      });

      await this.subGroupRepository.save(subGroup);

      // 요청 상태 업데이트
      request.status = RequestStatus.APPROVED;
      request.approverId = userId;
      request.createdSubGroupId = subGroup.id;
      await this.requestRepository.save(request);

      // 요청자에게 알림
      await notificationService.notifyRequestResult({
        userId: request.requesterId,
        groupId,
        approved: true,
        subGroupName: request.name,
        subGroupId: subGroup.id,
      });

      res.json({
        success: true,
        data: subGroup,
        message: '소모임 생성 요청이 승인되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 소모임 요청 거절
  rejectRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, requestId } = req.params;
      const { reason } = req.body;
      const userId = req.user!.id;

      const request = await this.requestRepository.findOne({
        where: { id: requestId, groupId, status: RequestStatus.PENDING },
        relations: ['requester'],
      });

      if (!request) {
        throw new AppError('요청을 찾을 수 없거나 이미 처리되었습니다.', 404);
      }

      // 거절 권한 체크
      const hasPermission = await this.checkApprovalPermission(
        userId,
        groupId,
        request.parentSubGroupId
      );

      if (!hasPermission) {
        throw new AppError('거절 권한이 없습니다.', 403);
      }

      request.status = RequestStatus.REJECTED;
      request.approverId = userId;
      request.rejectionReason = reason;
      await this.requestRepository.save(request);

      // 요청자에게 알림
      await notificationService.notifyRequestResult({
        userId: request.requesterId,
        groupId,
        approved: false,
        subGroupName: request.name,
        rejectionReason: reason,
      });

      res.json({
        success: true,
        message: '소모임 생성 요청이 거절되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 계층 구조로 소모임 목록 조회
  getSubGroupsHierarchy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { parentSubGroupId } = req.query;

      const whereClause: FindOptionsWhere<SubGroup> = {
        parentGroupId: groupId,
        status: SubGroupStatus.ACTIVE,
      };

      if (parentSubGroupId) {
        whereClause.parentSubGroupId = parentSubGroupId as string;
      } else {
        whereClause.parentSubGroupId = IsNull(); // depth 0 (큰모임 직속)
      }

      const subGroups = await this.subGroupRepository.find({
        where: whereClause,
        relations: ['leader', 'childSubGroups'],
        order: { createdAt: 'ASC' },
      });

      // 각 소모임의 하위 소모임 개수 포함
      const result = await Promise.all(
        subGroups.map(async (sg) => {
          const childCount = await this.subGroupRepository.count({
            where: { parentSubGroupId: sg.id, status: SubGroupStatus.ACTIVE },
          });

          return {
            id: sg.id,
            name: sg.name,
            description: sg.description,
            coverImage: sg.coverImage,
            depth: sg.depth,
            status: sg.status,
            createdAt: sg.createdAt,
            childSubGroupCount: childCount,
            leader: sg.leader
              ? {
                  id: sg.leader.id,
                  name: sg.leader.name,
                  profileImage: sg.leader.profileImage,
                }
              : null,
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

  // 소모임 상세 조회
  getById = async (req: Request, res: Response, next: NextFunction) => {
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

  // 소모임 수정
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { subGroupId } = req.params;
      const { name, description, coverImage, leaderId, settings, classSchedule, lessonRoomId } = req.body;

      const subGroup = await this.subGroupRepository.findOne({
        where: { id: subGroupId },
        relations: ['lessonRoom'],
      });

      if (!subGroup) {
        throw new AppError('SubGroup not found', 404);
      }

      if (name) subGroup.name = name;
      if (description !== undefined) subGroup.description = description;
      if (coverImage !== undefined) subGroup.coverImage = coverImage;
      if (leaderId !== undefined) subGroup.leaderId = leaderId;
      if (settings !== undefined) subGroup.settings = settings;
      // 반(CLASS) 또는 강사(INSTRUCTOR) 소그룹용 필드
      if (classSchedule !== undefined) subGroup.classSchedule = classSchedule;
      if (lessonRoomId !== undefined) subGroup.lessonRoomId = lessonRoomId || null;

      await this.subGroupRepository.save(subGroup);

      // 수업실 정보 포함하여 반환
      const updatedSubGroup = await this.subGroupRepository.findOne({
        where: { id: subGroupId },
        relations: ['lessonRoom', 'leader'],
      });

      res.json({
        success: true,
        data: updatedSubGroup,
      });
    } catch (error) {
      next(error);
    }
  };

  // 소모임 삭제
  delete = async (req: Request, res: Response, next: NextFunction) => {
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

  // 승인 권한 체크 헬퍼
  private async checkApprovalPermission(
    userId: string,
    groupId: string,
    parentSubGroupId?: string | null
  ): Promise<boolean> {
    // 큰 모임 관리자는 항상 승인 권한 있음
    const membership = await this.memberRepository.findOne({
      where: { groupId, userId, status: MemberStatus.ACTIVE },
    });

    if (membership && [MemberRole.OWNER, MemberRole.ADMIN].includes(membership.role)) {
      return true;
    }

    // 상위 소모임 리더인 경우
    if (parentSubGroupId) {
      const parentSubGroup = await this.subGroupRepository.findOne({
        where: { id: parentSubGroupId, leaderId: userId },
      });

      if (parentSubGroup) {
        return true;
      }
    }

    return false;
  }
}
