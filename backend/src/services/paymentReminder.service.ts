import { AppDataSource } from '../config/database';
import { GroupMember, MemberStatus } from '../models/GroupMember';
import { Group, GroupType } from '../models/Group';
import { notificationService } from './notification.service';

/**
 * 수강료 납부 알림 서비스
 * - 매일 실행하여 납부일 당일 및 3일 전 알림 발송
 */
export class PaymentReminderService {
  private memberRepository = AppDataSource.getRepository(GroupMember);
  private groupRepository = AppDataSource.getRepository(Group);

  /**
   * 납부일 알림 체크 및 발송
   * - 당일: 납부일 알림
   * - 3일 전: 리마인더 알림
   */
  async checkAndSendReminders(): Promise<{ sent: number; errors: number }> {
    const today = new Date();
    const currentDay = today.getDate();

    // 3일 후 날짜 계산
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const reminderDay = threeDaysLater.getDate();

    let sent = 0;
    let errors = 0;

    // 교육 타입 그룹의 모든 멤버 조회 (납부일이 설정된)
    const educationGroups = await this.groupRepository.find({
      where: { type: GroupType.EDUCATION },
    });

    for (const group of educationGroups) {
      // 납부일이 설정된 멤버들 조회
      const members = await this.memberRepository
        .createQueryBuilder('member')
        .where('member.groupId = :groupId', { groupId: group.id })
        .andWhere('member.status = :status', { status: MemberStatus.ACTIVE })
        .andWhere('member.paymentDueDay IS NOT NULL')
        .getMany();

      for (const member of members) {
        if (!member.paymentDueDay) continue;

        try {
          // 당일 납부일인 경우
          if (member.paymentDueDay === currentDay) {
            await notificationService.notifyPaymentDue({
              studentId: member.userId,
              groupId: group.id,
              groupName: group.name,
              dueDay: member.paymentDueDay,
            });
            sent++;
          }
          // 3일 전인 경우 (리마인더)
          else if (member.paymentDueDay === reminderDay) {
            await notificationService.notifyPaymentReminder({
              studentId: member.userId,
              groupId: group.id,
              groupName: group.name,
              dueDay: member.paymentDueDay,
              daysUntil: 3,
            });
            sent++;
          }
        } catch (error) {
          console.error(`Failed to send payment reminder to ${member.userId}:`, error);
          errors++;
        }
      }
    }

    return { sent, errors };
  }

  /**
   * 특정 그룹의 납부 알림 수동 발송
   */
  async sendGroupReminders(groupId: string): Promise<{ sent: number; errors: number }> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId, type: GroupType.EDUCATION },
    });

    if (!group) {
      throw new Error('교육 그룹을 찾을 수 없습니다.');
    }

    const today = new Date();
    const currentDay = today.getDate();

    let sent = 0;
    let errors = 0;

    // 납부일이 오늘인 멤버들 조회
    const members = await this.memberRepository
      .createQueryBuilder('member')
      .where('member.groupId = :groupId', { groupId })
      .andWhere('member.status = :status', { status: MemberStatus.ACTIVE })
      .andWhere('member.paymentDueDay = :currentDay', { currentDay })
      .getMany();

    for (const member of members) {
      try {
        await notificationService.notifyPaymentDue({
          studentId: member.userId,
          groupId: group.id,
          groupName: group.name,
          dueDay: member.paymentDueDay!,
        });
        sent++;
      } catch (error) {
        console.error(`Failed to send payment reminder to ${member.userId}:`, error);
        errors++;
      }
    }

    return { sent, errors };
  }
}

export const paymentReminderService = new PaymentReminderService();
