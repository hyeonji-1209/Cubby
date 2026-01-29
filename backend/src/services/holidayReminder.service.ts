import { AppDataSource } from '../config/database';
import { Holiday, HolidayType } from '../models/Holiday';
import { GroupMember, MemberRole, MemberStatus } from '../models/GroupMember';
import { Group, GroupType } from '../models/Group';
import { SubGroup, SubGroupType } from '../models/SubGroup';
import { notificationService } from './notification.service';
import { NotificationType } from '../models/Notification';
import { Between } from 'typeorm';

/**
 * 휴일 리마인더 서비스
 * - 1주일 후 휴일에 대해 수업이 있는 멤버/강사에게 알림 발송
 */
export class HolidayReminderService {
  private holidayRepository = AppDataSource.getRepository(Holiday);
  private memberRepository = AppDataSource.getRepository(GroupMember);
  private groupRepository = AppDataSource.getRepository(Group);
  private subGroupRepository = AppDataSource.getRepository(SubGroup);

  /**
   * 1주일 후 휴일 알림 발송
   */
  async checkAndSendHolidayReminders(): Promise<{ sent: number; errors: number }> {
    const today = new Date();

    // 7일 후 날짜
    const oneWeekLater = new Date(today);
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
    const targetDateStr = oneWeekLater.toISOString().split('T')[0];
    const targetDayOfWeek = oneWeekLater.getDay();

    let sent = 0;
    let errors = 0;

    // 1. 특정 날짜 휴일 확인
    const specificHolidays = await this.holidayRepository.find({
      where: {
        type: HolidayType.SPECIFIC,
        date: targetDateStr,
        notifyMembers: true,
        notificationSent: false,
      },
      relations: ['group'],
    });

    for (const holiday of specificHolidays) {
      try {
        await this.sendHolidayNotifications(holiday, targetDateStr, targetDayOfWeek);

        // 알림 발송 완료 표시
        holiday.notificationSent = true;
        holiday.notificationSentAt = new Date();
        await this.holidayRepository.save(holiday);

        sent++;
      } catch (error) {
        console.error(`Failed to send holiday reminder for ${holiday.id}:`, error);
        errors++;
      }
    }

    // 2. 기간 휴일 확인 (시작일이 7일 후인 경우)
    const rangeHolidays = await this.holidayRepository.find({
      where: {
        type: HolidayType.RANGE,
        startDate: targetDateStr,
        notifyMembers: true,
        notificationSent: false,
      },
      relations: ['group'],
    });

    for (const holiday of rangeHolidays) {
      try {
        await this.sendHolidayNotifications(holiday, targetDateStr, targetDayOfWeek);

        holiday.notificationSent = true;
        holiday.notificationSentAt = new Date();
        await this.holidayRepository.save(holiday);

        sent++;
      } catch (error) {
        console.error(`Failed to send holiday reminder for ${holiday.id}:`, error);
        errors++;
      }
    }

    return { sent, errors };
  }

  /**
   * 휴일 알림 발송 (해당 날짜에 수업이 있는 사람들에게)
   */
  private async sendHolidayNotifications(
    holiday: Holiday,
    dateStr: string,
    dayOfWeek: number
  ): Promise<void> {
    const group = await this.groupRepository.findOne({
      where: { id: holiday.groupId },
    });

    if (!group || group.type !== GroupType.EDUCATION) return;

    const [, month, day] = dateStr.split('-');
    const formattedDate = `${parseInt(month)}월 ${parseInt(day)}일`;

    if (group.hasClasses) {
      // 그룹 수업: 해당 요일에 수업이 있는 소그룹(반)의 리더(강사)에게 알림
      const classSubGroups = await this.subGroupRepository.find({
        where: {
          parentGroupId: group.id,
          type: SubGroupType.CLASS,
        },
      });

      for (const subGroup of classSubGroups) {
        if (!subGroup.classSchedule || !Array.isArray(subGroup.classSchedule)) continue;

        const hasLessonOnDay = subGroup.classSchedule.some(
          (schedule) => schedule.dayOfWeek === dayOfWeek
        );

        if (hasLessonOnDay && subGroup.leaderId) {
          await notificationService.create({
            userId: subGroup.leaderId,
            groupId: group.id,
            type: NotificationType.SYSTEM,
            title: '휴일 수업 안내',
            message: `${formattedDate}은 "${holiday.name}" 휴일입니다. "${subGroup.name}" 반 수업 일정을 확인하고 보강 일정을 잡아주세요.`,
            data: {
              holidayId: holiday.id,
              subGroupId: subGroup.id,
              requiresMakeup: holiday.requiresMakeup,
              showAnnouncementModal: true,
            },
          });
        }
      }
    } else {
      // 1:1 수업: 해당 요일에 수업이 있는 학생과 강사에게 알림
      const members = await this.memberRepository.find({
        where: {
          groupId: group.id,
          status: MemberStatus.ACTIVE,
          role: MemberRole.MEMBER,
        },
        relations: ['user'],
      });

      const notifiedInstructors = new Set<string>();

      for (const member of members) {
        if (!member.lessonSchedule || !Array.isArray(member.lessonSchedule)) continue;

        const hasLessonOnDay = member.lessonSchedule.some(
          (schedule) => schedule.dayOfWeek === dayOfWeek
        );

        if (!hasLessonOnDay) continue;

        // 학생에게 알림
        await notificationService.create({
          userId: member.userId,
          groupId: group.id,
          type: NotificationType.SYSTEM,
          title: '휴일 수업 안내',
          message: `${formattedDate}은 "${holiday.name}" 휴일입니다. 수업 일정 변경이 필요할 수 있습니다.`,
          data: { holidayId: holiday.id },
        });

        // 강사에게 알림 (중복 방지)
        const instructorId = member.instructorId || group.ownerId;
        if (instructorId && !notifiedInstructors.has(instructorId)) {
          await notificationService.create({
            userId: instructorId,
            groupId: group.id,
            type: NotificationType.SYSTEM,
            title: '휴일 수업 안내',
            message: `${formattedDate}은 "${holiday.name}" 휴일입니다. 해당 날짜에 수업이 있는 학생들의 일정을 확인해주세요.`,
            data: {
              holidayId: holiday.id,
              showAnnouncementModal: true,
            },
          });
          notifiedInstructors.add(instructorId);
        }
      }
    }
  }
}

export const holidayReminderService = new HolidayReminderService();
