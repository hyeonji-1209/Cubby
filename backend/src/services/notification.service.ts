import { AppDataSource } from '../config/database';
import { Notification, NotificationType, NotificationPriority } from '../models/Notification';
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
    priority?: NotificationPriority;
    actorId?: string;
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

  // 모임의 운영자들에게 알림 발송 (새로운 시스템: owner만)
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
    // 새로운 시스템: owner만 관리자로 취급
    const admins = await this.memberRepository.find({
      where: {
        groupId,
        role: MemberRole.OWNER,
        status: MemberStatus.ACTIVE,
      },
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
  async getUserNotifications(userId: string, limit = 20, offset = 0, unreadOnly = false) {
    const where: { userId: string; isRead?: boolean } = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    return this.notificationRepository.find({
      where,
      relations: ['group', 'actor'],
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

  // 알림 삭제
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepository.delete({ id: notificationId, userId });
  }

  // 모든 알림 삭제
  async deleteAllNotifications(userId: string): Promise<void> {
    await this.notificationRepository.delete({ userId });
  }

  // ===== 멤버 관련 알림 =====

  // 가입 신청 알림 (관리자에게)
  async notifyMemberJoinRequest(params: {
    groupId: string;
    groupName: string;
    requesterName: string;
    requesterId: string;
    memberId: string;
  }): Promise<void> {
    const { groupId, groupName, requesterName, requesterId, memberId } = params;

    await this.notifyGroupAdmins(groupId, {
      type: NotificationType.MEMBER_JOIN_REQUEST,
      title: '가입 신청',
      message: `${requesterName}님이 "${groupName}" 모임에 가입을 신청했습니다.`,
      data: { memberId, requesterId, link: `/groups/${groupId}?tab=members` },
    });
  }

  // 가입 승인 알림 (신청자에게)
  async notifyMemberApproved(params: {
    userId: string;
    groupId: string;
    groupName: string;
  }): Promise<void> {
    const { userId, groupId, groupName } = params;

    await this.create({
      userId,
      groupId,
      type: NotificationType.MEMBER_APPROVED,
      title: '가입 승인',
      message: `"${groupName}" 모임 가입이 승인되었습니다.`,
      data: { link: `/groups/${groupId}` },
    });
  }

  // 가입 거절 알림 (신청자에게)
  async notifyMemberRejected(params: {
    userId: string;
    groupId: string;
    groupName: string;
    reason?: string;
  }): Promise<void> {
    const { userId, groupId, groupName, reason } = params;

    await this.create({
      userId,
      groupId,
      type: NotificationType.MEMBER_REJECTED,
      title: '가입 거절',
      message: `"${groupName}" 모임 가입이 거절되었습니다.${reason ? ` 사유: ${reason}` : ''}`,
    });
  }

  // 새 멤버 가입 알림 (관리자에게)
  async notifyMemberJoined(params: {
    groupId: string;
    groupName: string;
    memberName: string;
    memberId: string;
  }): Promise<void> {
    const { groupId, groupName, memberName, memberId } = params;

    await this.notifyGroupAdmins(groupId, {
      type: NotificationType.MEMBER_JOINED,
      title: '새 멤버 가입',
      message: `${memberName}님이 "${groupName}" 모임에 가입했습니다.`,
      data: { memberId },
    });
  }

  // ===== 일정 관련 알림 =====

  // 새 일정 알림 (그룹 멤버들에게)
  async notifyNewSchedule(params: {
    groupId: string;
    groupName: string;
    scheduleId: string;
    scheduleTitle: string;
    creatorId: string;
  }): Promise<void> {
    const { groupId, scheduleId, scheduleTitle, creatorId } = params;

    const members = await this.memberRepository.find({
      where: { groupId, status: MemberStatus.ACTIVE },
    });

    const memberIds = members
      .map(m => m.userId)
      .filter(id => id !== creatorId);

    if (memberIds.length > 0) {
      await this.createMany(memberIds, {
        groupId,
        type: NotificationType.SCHEDULE_CREATED,
        title: '새 일정',
        message: `새 일정 "${scheduleTitle}"이(가) 등록되었습니다.`,
        data: { scheduleId, link: `/groups/${groupId}?tab=schedules` },
      });
    }
  }

  // 공지사항 알림 (그룹 멤버들에게)
  async notifyNewAnnouncement(params: {
    groupId: string;
    announcementId: string;
    title: string;
    authorId: string;
  }): Promise<void> {
    const { groupId, announcementId, title, authorId } = params;

    const members = await this.memberRepository.find({
      where: { groupId, status: MemberStatus.ACTIVE },
    });

    const memberIds = members
      .map(m => m.userId)
      .filter(id => id !== authorId);

    if (memberIds.length > 0) {
      await this.createMany(memberIds, {
        groupId,
        type: NotificationType.ANNOUNCEMENT_NEW,
        title: '새 공지',
        message: `새 공지사항 "${title}"이(가) 등록되었습니다.`,
        data: { announcementId, link: `/groups/${groupId}?tab=announcements` },
      });
    }
  }

  // ===== 수업실 예약 관련 알림 =====

  // 수업실 예약 알림 (학생에게)
  async notifyLessonRoomReservation(params: {
    studentId: string;
    groupId: string;
    roomName: string;
    date: string;
    startTime: string;
    endTime: string;
    instructorName: string;
  }): Promise<void> {
    const { studentId, groupId, roomName, date, startTime, endTime, instructorName } = params;

    // 날짜 포맷 (YYYY-MM-DD → MM월 DD일)
    const [, month, day] = date.split('-');
    const formattedDate = `${parseInt(month)}월 ${parseInt(day)}일`;

    await this.create({
      userId: studentId,
      groupId,
      type: NotificationType.RESERVATION_CREATED,
      title: '수업실 예약',
      message: `${formattedDate} ${startTime}~${endTime} 수업이 "${roomName}"에서 진행됩니다.`,
      data: { date, roomName, instructorName },
    });
  }

  // 수업실 미배정 리마인더 (강사에게) - 2일 전
  async notifyLessonRoomReminder(params: {
    instructorId: string;
    groupId: string;
    studentName: string;
    date: string;
    startTime: string;
    studentMemberId?: string;
  }): Promise<void> {
    const { instructorId, groupId, studentName, date, startTime, studentMemberId } = params;

    const [, month, day] = date.split('-');
    const formattedDate = `${parseInt(month)}월 ${parseInt(day)}일`;

    await this.create({
      userId: instructorId,
      groupId,
      type: NotificationType.RESERVATION_REMINDER,
      title: '수업실 배정 필요',
      message: `${studentName}님의 ${formattedDate} ${startTime} 수업입니다. 수업실 배정을 진행해주세요.`,
      data: { date, studentMemberId, link: `/groups/${groupId}?tab=lessonrooms` },
      priority: NotificationPriority.HIGH,
    });
  }

  // ===== 수업 완료 알림 =====

  // 수업 완료 알림 (학생에게)
  async notifyLessonCompleted(params: {
    studentId: string;
    groupId: string;
    lessonDate: string;
    instructorName: string;
    lessonRecordId?: string;
  }): Promise<void> {
    const { studentId, groupId, lessonDate, instructorName, lessonRecordId } = params;

    const [, month, day] = lessonDate.split('-');
    const formattedDate = `${parseInt(month)}월 ${parseInt(day)}일`;

    await this.create({
      userId: studentId,
      groupId,
      type: NotificationType.SCHEDULE_UPDATED,
      title: '수업 완료',
      message: `${formattedDate} 수업이 완료되었습니다. 수업 내용을 확인해보세요.`,
      data: { lessonRecordId, instructorName },
    });
  }

  // 당일 수업 입장 알림 (학생에게)
  async notifyTodayLessonEntry(params: {
    studentId: string;
    groupId: string;
    groupName: string;
    roomName: string;
    startTime: string;
    endTime: string;
  }): Promise<void> {
    const { studentId, groupId, groupName, roomName, startTime, endTime } = params;

    await this.create({
      userId: studentId,
      groupId,
      type: NotificationType.RESERVATION_REMINDER,
      title: '오늘 수업 안내',
      message: `오늘 ${startTime}~${endTime} "${groupName}" 수업이 "${roomName}"에서 진행됩니다. 늦지 않게 입장해주세요!`,
      data: { roomName, startTime, endTime },
      priority: NotificationPriority.NORMAL,
    });
  }

  // ===== 수강료 납부 알림 =====

  // 수강료 납부일 알림 (학생에게)
  async notifyPaymentDue(params: {
    studentId: string;
    groupId: string;
    groupName: string;
    dueDay: number;
  }): Promise<void> {
    const { studentId, groupId, groupName, dueDay } = params;

    await this.create({
      userId: studentId,
      groupId,
      type: NotificationType.SYSTEM,
      title: '수강료 납부일',
      message: `"${groupName}" 수강료 납부일입니다. (매월 ${dueDay}일)`,
      data: { dueDay },
      priority: NotificationPriority.HIGH,
    });
  }

  // 수강료 납부 리마인더 (3일 전)
  async notifyPaymentReminder(params: {
    studentId: string;
    groupId: string;
    groupName: string;
    dueDay: number;
    daysUntil: number;
  }): Promise<void> {
    const { studentId, groupId, groupName, dueDay, daysUntil } = params;

    await this.create({
      userId: studentId,
      groupId,
      type: NotificationType.SYSTEM,
      title: '수강료 납부 예정',
      message: `"${groupName}" 수강료 납부일이 ${daysUntil}일 남았습니다. (${dueDay}일)`,
      data: { dueDay, daysUntil },
    });
  }
}

export const notificationService = new NotificationService();
