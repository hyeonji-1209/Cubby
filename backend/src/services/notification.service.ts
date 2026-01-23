import { AppDataSource } from '../config/database';
import { Notification, NotificationType } from '../models/Notification';
import { GroupMember, MemberRole, MemberStatus } from '../models/GroupMember';
import { SubGroup } from '../models/SubGroup';

export class NotificationService {
  private notificationRepository = AppDataSource.getRepository(Notification);
  private memberRepository = AppDataSource.getRepository(GroupMember);
  private subGroupRepository = AppDataSource.getRepository(SubGroup);

  // 단일 알림 생성
  async create(params: {
    userId: string;
    groupId?: string;
    type: NotificationType;
    title: string;
    message?: string;
    data?: Record<string, unknown>;
  }): Promise<Notification> {
    const notification = this.notificationRepository.create(params);
    return this.notificationRepository.save(notification);
  }

  // 여러 사용자에게 알림 발송
  async createMany(
    userIds: string[],
    params: {
      groupId?: string;
      type: NotificationType;
      title: string;
      message?: string;
      data?: Record<string, unknown>;
    }
  ): Promise<void> {
    const notifications = userIds.map((userId) =>
      this.notificationRepository.create({ userId, ...params })
    );
    await this.notificationRepository.save(notifications);
  }

  // 모임의 관리자들에게 알림 발송
  async notifyGroupAdmins(
    groupId: string,
    params: {
      type: NotificationType;
      title: string;
      message?: string;
      data?: Record<string, unknown>;
      excludeUserId?: string; // 특정 사용자 제외
    }
  ): Promise<void> {
    const adminRoles = [MemberRole.OWNER, MemberRole.ADMIN];

    const admins = await this.memberRepository.find({
      where: adminRoles.map((role) => ({
        groupId,
        role,
        status: MemberStatus.ACTIVE,
      })),
    });

    const adminIds = admins
      .map((a) => a.userId)
      .filter((id) => id !== params.excludeUserId);

    if (adminIds.length > 0) {
      await this.createMany(adminIds, {
        groupId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data,
      });
    }
  }

  // 소모임의 리더와 상위 관리자들에게 알림 발송
  async notifySubGroupAdmins(
    subGroupId: string,
    params: {
      type: NotificationType;
      title: string;
      message?: string;
      data?: Record<string, unknown>;
      excludeUserId?: string;
    }
  ): Promise<void> {
    const subGroup = await this.subGroupRepository.findOne({
      where: { id: subGroupId },
      relations: ['parentGroup'],
    });

    if (!subGroup) return;

    const userIds: string[] = [];

    // 소모임 리더 추가
    if (subGroup.leaderId && subGroup.leaderId !== params.excludeUserId) {
      userIds.push(subGroup.leaderId);
    }

    // 상위 모임 관리자들도 알림 받음
    await this.notifyGroupAdmins(subGroup.parentGroupId, params);
  }

  // 소모임 생성 요청 알림 (승인권자에게)
  async notifySubGroupRequest(params: {
    groupId: string;
    parentSubGroupId?: string;
    requesterName: string;
    subGroupName: string;
    requestId: string;
  }): Promise<void> {
    const { groupId, parentSubGroupId, requesterName, subGroupName, requestId } = params;

    if (parentSubGroupId) {
      // 중간 소모임 내 생성 요청 → 해당 소모임 리더에게 알림
      const parentSubGroup = await this.subGroupRepository.findOne({
        where: { id: parentSubGroupId },
      });

      if (parentSubGroup?.leaderId) {
        await this.create({
          userId: parentSubGroup.leaderId,
          groupId,
          type: NotificationType.SUBGROUP_REQUEST,
          title: '소모임 생성 요청',
          message: `${requesterName}님이 "${subGroupName}" 소모임 생성을 요청했습니다.`,
          data: { requestId, parentSubGroupId },
        });
      }

      // 큰 모임 관리자에게도 알림 (정보성)
      await this.notifyGroupAdmins(groupId, {
        type: NotificationType.SUBGROUP_CREATED_NOTIFY,
        title: '하위 소모임 생성 요청 알림',
        message: `${requesterName}님이 "${parentSubGroup?.name}" 내에 "${subGroupName}" 소모임 생성을 요청했습니다.`,
        data: { requestId, parentSubGroupId },
      });
    } else {
      // 큰 모임 직속 소모임 생성 요청 → 큰 모임 관리자에게 알림
      await this.notifyGroupAdmins(groupId, {
        type: NotificationType.SUBGROUP_REQUEST,
        title: '소모임 생성 요청',
        message: `${requesterName}님이 "${subGroupName}" 소모임 생성을 요청했습니다.`,
        data: { requestId },
      });
    }
  }

  // 요청 승인/거절 알림 (요청자에게)
  async notifyRequestResult(params: {
    userId: string;
    groupId: string;
    approved: boolean;
    subGroupName: string;
    subGroupId?: string;
    rejectionReason?: string;
  }): Promise<void> {
    const { userId, groupId, approved, subGroupName, subGroupId, rejectionReason } = params;

    await this.create({
      userId,
      groupId,
      type: approved ? NotificationType.SUBGROUP_APPROVED : NotificationType.SUBGROUP_REJECTED,
      title: approved ? '소모임 생성 승인' : '소모임 생성 거절',
      message: approved
        ? `"${subGroupName}" 소모임이 승인되었습니다.`
        : `"${subGroupName}" 소모임 생성이 거절되었습니다.${rejectionReason ? ` 사유: ${rejectionReason}` : ''}`,
      data: { subGroupId },
    });
  }

  // 사용자 알림 목록 조회
  async getUserNotifications(userId: string, limit = 20, offset = 0) {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  // 알림 읽음 처리
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId, userId },
      { isRead: true, readAt: new Date() }
    );
  }

  // 모든 알림 읽음 처리
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  // 읽지 않은 알림 개수
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }
}

export const notificationService = new NotificationService();
