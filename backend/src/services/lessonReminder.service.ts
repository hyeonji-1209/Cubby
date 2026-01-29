import { AppDataSource } from '../config/database';
import { GroupMember, MemberRole, MemberStatus } from '../models/GroupMember';
import { Group, GroupType } from '../models/Group';
import { LessonRoomReservation } from '../models/LessonRoomReservation';
import { LessonRoom } from '../models/LessonRoom';
import { notificationService } from './notification.service';

/**
 * 수업 관련 리마인더 서비스
 * - 매일 실행하여 2일 후 수업에 대한 수업실 배정 알림 발송
 * - 당일 수업 시작 전 학생에게 수업실 입장 알림 발송
 */
export class LessonReminderService {
  private memberRepository = AppDataSource.getRepository(GroupMember);
  private groupRepository = AppDataSource.getRepository(Group);
  private reservationRepository = AppDataSource.getRepository(LessonRoomReservation);
  private lessonRoomRepository = AppDataSource.getRepository(LessonRoom);

  /**
   * 2일 후 수업 중 수업실 미배정 건에 대한 알림 발송
   */
  async checkAndSendLessonRoomReminders(): Promise<{ sent: number; errors: number }> {
    const today = new Date();

    // 2일 후 날짜 계산
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    const targetDateStr = twoDaysLater.toISOString().split('T')[0];
    const targetDayOfWeek = twoDaysLater.getDay();

    let sent = 0;
    let errors = 0;

    // 교육 타입 그룹 중 1:1 수업 그룹 (hasClasses = false) 조회
    const educationGroups = await this.groupRepository.find({
      where: { type: GroupType.EDUCATION, hasClasses: false },
    });

    for (const group of educationGroups) {
      // 수업 스케줄이 있는 활성 멤버들 조회
      const members = await this.memberRepository
        .createQueryBuilder('member')
        .leftJoinAndSelect('member.user', 'user')
        .where('member.groupId = :groupId', { groupId: group.id })
        .andWhere('member.status = :status', { status: MemberStatus.ACTIVE })
        .andWhere('member.lessonSchedule IS NOT NULL')
        .andWhere('member.role = :role', { role: MemberRole.MEMBER })
        .getMany();

      for (const member of members) {
        if (!member.lessonSchedule || member.lessonSchedule.length === 0) continue;

        // 해당 요일에 수업이 있는지 확인
        const todayLesson = member.lessonSchedule.find(
          (lesson) => lesson.dayOfWeek === targetDayOfWeek
        );

        if (!todayLesson) continue;

        // 수업실이 이미 배정되어 있는지 확인 (스케줄에 lessonRoomId가 있거나 예약이 있는 경우)
        if (todayLesson.lessonRoomId) continue;

        // 해당 날짜에 예약이 있는지 확인 (studentId로 조회)
        const existingReservation = await this.reservationRepository.findOne({
          where: {
            groupId: group.id,
            studentId: member.userId,
            date: targetDateStr,
          },
        });

        if (existingReservation) continue;

        // 강사 찾기 (member.instructorId 또는 그룹 owner)
        const instructorId = member.instructorId || group.ownerId;

        try {
          await notificationService.notifyLessonRoomReminder({
            instructorId,
            groupId: group.id,
            studentName: member.user?.name || member.nickname || '학생',
            date: targetDateStr,
            startTime: todayLesson.startTime,
            studentMemberId: member.id,
          });
          sent++;
        } catch (error) {
          console.error(`Failed to send lesson room reminder for ${member.id}:`, error);
          errors++;
        }
      }
    }

    return { sent, errors };
  }

  /**
   * 특정 그룹의 수업실 미배정 알림 수동 발송
   */
  async sendGroupLessonReminders(groupId: string): Promise<{ sent: number; errors: number }> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId, type: GroupType.EDUCATION, hasClasses: false },
    });

    if (!group) {
      throw new Error('1:1 교육 그룹을 찾을 수 없습니다.');
    }

    const today = new Date();
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    const targetDateStr = twoDaysLater.toISOString().split('T')[0];
    const targetDayOfWeek = twoDaysLater.getDay();

    let sent = 0;
    let errors = 0;

    const members = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('member.groupId = :groupId', { groupId })
      .andWhere('member.status = :status', { status: MemberStatus.ACTIVE })
      .andWhere('member.lessonSchedule IS NOT NULL')
      .andWhere('member.role = :role', { role: MemberRole.MEMBER })
      .getMany();

    for (const member of members) {
      if (!member.lessonSchedule || member.lessonSchedule.length === 0) continue;

      const todayLesson = member.lessonSchedule.find(
        (lesson) => lesson.dayOfWeek === targetDayOfWeek
      );

      if (!todayLesson || todayLesson.lessonRoomId) continue;

      const existingReservation = await this.reservationRepository.findOne({
        where: {
          groupId: group.id,
          studentId: member.userId,
          date: targetDateStr,
        },
      });

      if (existingReservation) continue;

      const instructorId = member.instructorId || group.ownerId;

      try {
        await notificationService.notifyLessonRoomReminder({
          instructorId,
          groupId: group.id,
          studentName: member.user?.name || member.nickname || '학생',
          date: targetDateStr,
          startTime: todayLesson.startTime,
          studentMemberId: member.id,
        });
        sent++;
      } catch (error) {
        console.error(`Failed to send lesson room reminder for ${member.id}:`, error);
        errors++;
      }
    }

    return { sent, errors };
  }

  /**
   * 당일 수업 학생에게 수업실 입장 알림 발송
   * - 오전에 실행하여 오늘 수업이 있는 학생들에게 수업실 정보 알림
   */
  async sendTodayLessonEntryNotifications(): Promise<{ sent: number; errors: number }> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayDayOfWeek = today.getDay();

    let sent = 0;
    let errors = 0;

    // 교육 타입 그룹 중 1:1 수업 그룹 조회
    const educationGroups = await this.groupRepository.find({
      where: { type: GroupType.EDUCATION, hasClasses: false },
    });

    for (const group of educationGroups) {
      // 수업 스케줄이 있는 활성 멤버들 조회
      const members = await this.memberRepository
        .createQueryBuilder('member')
        .leftJoinAndSelect('member.user', 'user')
        .where('member.groupId = :groupId', { groupId: group.id })
        .andWhere('member.status = :status', { status: MemberStatus.ACTIVE })
        .andWhere('member.lessonSchedule IS NOT NULL')
        .andWhere('member.role = :role', { role: MemberRole.MEMBER })
        .getMany();

      for (const member of members) {
        if (!member.lessonSchedule || member.lessonSchedule.length === 0) continue;

        // 오늘 수업이 있는지 확인
        const todayLesson = member.lessonSchedule.find(
          (lesson) => lesson.dayOfWeek === todayDayOfWeek
        );

        if (!todayLesson) continue;

        // 수업실 정보 조회
        let roomName: string | null = null;
        let roomInfo: LessonRoom | null = null;

        // 1. 먼저 스케줄에 배정된 수업실 확인
        if (todayLesson.lessonRoomId) {
          roomInfo = await this.lessonRoomRepository.findOne({
            where: { id: todayLesson.lessonRoomId },
          });
          roomName = roomInfo?.name || null;
        }

        // 2. 스케줄에 없으면 오늘 예약 확인
        if (!roomName) {
          const reservation = await this.reservationRepository.findOne({
            where: {
              groupId: group.id,
              studentId: member.userId,
              date: todayStr,
            },
            relations: ['room'],
          });
          if (reservation && reservation.room) {
            roomName = reservation.room.name;
          }
        }

        // 수업실이 없으면 알림 스킵 (미배정 상태)
        if (!roomName) continue;

        try {
          await notificationService.notifyTodayLessonEntry({
            studentId: member.userId,
            groupId: group.id,
            groupName: group.name,
            roomName,
            startTime: todayLesson.startTime,
            endTime: todayLesson.endTime,
          });
          sent++;
        } catch (error) {
          console.error(`Failed to send today lesson entry notification for ${member.id}:`, error);
          errors++;
        }
      }
    }

    return { sent, errors };
  }
}

export const lessonReminderService = new LessonReminderService();
