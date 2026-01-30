import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { LessonRoom, Group, GroupMember, MemberRole, SubGroup, LessonRoomReservation, LessonReservationStatus, User } from '../models';
import type { LessonSchedule } from '../models/GroupMember';
import { Between, In } from 'typeorm';
import { notificationService } from '../services/notification.service';

const lessonRoomRepository = AppDataSource.getRepository(LessonRoom);
const groupRepository = AppDataSource.getRepository(Group);
const groupMemberRepository = AppDataSource.getRepository(GroupMember);
const subGroupRepository = AppDataSource.getRepository(SubGroup);
const reservationRepository = AppDataSource.getRepository(LessonRoomReservation);

// 최대 예약 가능 주
const MAX_WEEKS_ADVANCE = 3;

// 시간 겹침 체크 헬퍼
const timesOverlap = (
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean => {
  // "HH:MM" 형식을 분 단위로 변환
  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);

  // 겹치는 경우: start1 < end2 AND start2 < end1
  return s1 < e2 && s2 < e1;
};

// owner 권한 체크 헬퍼
const checkAdminPermission = async (groupId: string, userId: string): Promise<boolean> => {
  const member = await groupMemberRepository.findOne({
    where: { groupId, userId },
  });
  return member?.role === MemberRole.OWNER;
};

export const lessonRoomController = {
  // 수업실 목록 조회
  async getByGroup(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.user!.id;

      // 그룹 멤버인지 확인
      const member = await groupMemberRepository.findOne({
        where: { groupId, userId },
      });

      if (!member) {
        return res.status(403).json({ message: '그룹 멤버만 조회할 수 있습니다.' });
      }

      const lessonRooms = await lessonRoomRepository.find({
        where: { groupId },
        order: { order: 'ASC', createdAt: 'ASC' },
      });

      return res.json({ data: lessonRooms });
    } catch (error) {
      console.error('Failed to get lesson rooms:', error);
      return res.status(500).json({ message: '수업실 목록 조회에 실패했습니다.' });
    }
  },

  // 수업실 생성
  async create(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.user!.id;
      const { name, capacity = 1, color } = req.body;

      // 관리자 권한 확인
      const isAdmin = await checkAdminPermission(groupId, userId);
      if (!isAdmin) {
        return res.status(403).json({ message: '관리자만 수업실을 생성할 수 있습니다.' });
      }

      // 그룹이 education 타입이고 1:1 수업인지 확인
      const group = await groupRepository.findOne({ where: { id: groupId } });
      if (!group) {
        return res.status(404).json({ message: '그룹을 찾을 수 없습니다.' });
      }

      if (group.type !== 'education' || group.hasClasses) {
        return res.status(400).json({ message: '1:1 수업 학원만 수업실을 사용할 수 있습니다.' });
      }

      // 순서 계산
      const maxOrder = await lessonRoomRepository
        .createQueryBuilder('room')
        .where('room.groupId = :groupId', { groupId })
        .select('MAX(room.order)', 'max')
        .getRawOne();

      const lessonRoom = lessonRoomRepository.create({
        groupId,
        name: name.trim(),
        capacity,
        color,
        order: (maxOrder?.max ?? -1) + 1,
      });

      await lessonRoomRepository.save(lessonRoom);

      return res.status(201).json({ data: lessonRoom });
    } catch (error) {
      console.error('Failed to create lesson room:', error);
      return res.status(500).json({ message: '수업실 생성에 실패했습니다.' });
    }
  },

  // 수업실 수정
  async update(req: Request, res: Response) {
    try {
      const { groupId, roomId } = req.params;
      const userId = req.user!.id;
      const { name, capacity, color, isActive } = req.body;

      // 관리자 권한 확인
      const isAdmin = await checkAdminPermission(groupId, userId);
      if (!isAdmin) {
        return res.status(403).json({ message: '관리자만 수업실을 수정할 수 있습니다.' });
      }

      const lessonRoom = await lessonRoomRepository.findOne({
        where: { id: roomId, groupId },
      });

      if (!lessonRoom) {
        return res.status(404).json({ message: '수업실을 찾을 수 없습니다.' });
      }

      if (name !== undefined) lessonRoom.name = name.trim();
      if (capacity !== undefined) lessonRoom.capacity = capacity;
      if (color !== undefined) lessonRoom.color = color;
      if (isActive !== undefined) lessonRoom.isActive = isActive;

      await lessonRoomRepository.save(lessonRoom);

      return res.json({ data: lessonRoom });
    } catch (error) {
      console.error('Failed to update lesson room:', error);
      return res.status(500).json({ message: '수업실 수정에 실패했습니다.' });
    }
  },

  // 수업실 삭제
  async delete(req: Request, res: Response) {
    try {
      const { groupId, roomId } = req.params;
      const userId = req.user!.id;

      // 관리자 권한 확인
      const isAdmin = await checkAdminPermission(groupId, userId);
      if (!isAdmin) {
        return res.status(403).json({ message: '관리자만 수업실을 삭제할 수 있습니다.' });
      }

      const lessonRoom = await lessonRoomRepository.findOne({
        where: { id: roomId, groupId },
      });

      if (!lessonRoom) {
        return res.status(404).json({ message: '수업실을 찾을 수 없습니다.' });
      }

      // TODO: 해당 수업실에 배정된 수업이 있는지 확인하고 경고

      await lessonRoomRepository.remove(lessonRoom);

      return res.json({ message: '수업실이 삭제되었습니다.' });
    } catch (error) {
      console.error('Failed to delete lesson room:', error);
      return res.status(500).json({ message: '수업실 삭제에 실패했습니다.' });
    }
  },

  // 수업실 순서 변경
  async reorder(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.user!.id;
      const { roomIds } = req.body; // 순서대로 정렬된 ID 배열

      // 관리자 권한 확인
      const isAdmin = await checkAdminPermission(groupId, userId);
      if (!isAdmin) {
        return res.status(403).json({ message: '관리자만 순서를 변경할 수 있습니다.' });
      }

      // 순서 업데이트
      await Promise.all(
        roomIds.map((id: string, index: number) =>
          lessonRoomRepository.update({ id, groupId }, { order: index })
        )
      );

      return res.json({ message: '순서가 변경되었습니다.' });
    } catch (error) {
      console.error('Failed to reorder lesson rooms:', error);
      return res.status(500).json({ message: '순서 변경에 실패했습니다.' });
    }
  },

  // 수업실 충돌 검사
  async checkConflicts(req: Request, res: Response) {
    try {
      const { groupId, roomId } = req.params;
      const userId = req.user!.id;
      const { dayOfWeek, startTime, endTime, excludeMemberId } = req.query;

      // 그룹 멤버인지 확인
      const member = await groupMemberRepository.findOne({
        where: { groupId, userId },
      });

      if (!member) {
        return res.status(403).json({ message: '그룹 멤버만 조회할 수 있습니다.' });
      }

      // 수업실 존재 확인
      const lessonRoom = await lessonRoomRepository.findOne({
        where: { id: roomId, groupId },
      });

      if (!lessonRoom) {
        return res.status(404).json({ message: '수업실을 찾을 수 없습니다.' });
      }

      const dayOfWeekNum = Number(dayOfWeek);
      const conflicts: {
        type: 'member' | 'class';
        id: string;
        name: string;
        schedule: { dayOfWeek: number; startTime: string; endTime: string };
      }[] = [];

      // 1. 멤버의 레슨 스케줄에서 충돌 검사
      const allMembers = await groupMemberRepository.find({
        where: { groupId },
        relations: ['user'],
      });

      for (const m of allMembers) {
        // 자기 자신은 제외 (수정할 때 기존 스케줄과 충돌 방지)
        if (excludeMemberId && m.id === excludeMemberId) continue;

        if (m.lessonSchedule && Array.isArray(m.lessonSchedule)) {
          for (const schedule of m.lessonSchedule as LessonSchedule[]) {
            if (
              schedule.lessonRoomId === roomId &&
              schedule.dayOfWeek === dayOfWeekNum &&
              timesOverlap(
                startTime as string,
                endTime as string,
                schedule.startTime,
                schedule.endTime
              )
            ) {
              conflicts.push({
                type: 'member',
                id: m.id,
                name: m.nickname || m.user?.name || '알 수 없음',
                schedule: {
                  dayOfWeek: schedule.dayOfWeek,
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                },
              });
            }
          }
        }
      }

      // 2. 반(SubGroup)의 수업 스케줄에서 충돌 검사
      const allSubGroups = await subGroupRepository.find({
        where: { parentGroupId: groupId, type: 'class' as any },
      });

      for (const sg of allSubGroups) {
        if (sg.lessonRoomId === roomId && sg.classSchedule && Array.isArray(sg.classSchedule)) {
          for (const schedule of sg.classSchedule) {
            if (
              schedule.dayOfWeek === dayOfWeekNum &&
              timesOverlap(
                startTime as string,
                endTime as string,
                schedule.startTime,
                schedule.endTime
              )
            ) {
              conflicts.push({
                type: 'class',
                id: sg.id,
                name: sg.name,
                schedule: {
                  dayOfWeek: schedule.dayOfWeek,
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                },
              });
            }
          }
        }
      }

      return res.json({
        data: {
          hasConflict: conflicts.length > 0,
          conflicts,
        },
      });
    } catch (error) {
      console.error('Failed to check lesson room conflicts:', error);
      return res.status(500).json({ message: '충돌 검사에 실패했습니다.' });
    }
  },

  // 특정 수업실의 모든 예약 현황 조회
  async getSchedule(req: Request, res: Response) {
    try {
      const { groupId, roomId } = req.params;
      const userId = req.user!.id;

      // 그룹 멤버인지 확인
      const member = await groupMemberRepository.findOne({
        where: { groupId, userId },
      });

      if (!member) {
        return res.status(403).json({ message: '그룹 멤버만 조회할 수 있습니다.' });
      }

      // 수업실 존재 확인
      const lessonRoom = await lessonRoomRepository.findOne({
        where: { id: roomId, groupId },
      });

      if (!lessonRoom) {
        return res.status(404).json({ message: '수업실을 찾을 수 없습니다.' });
      }

      const schedules: {
        type: 'member' | 'class';
        id: string;
        name: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
      }[] = [];

      // 1. 멤버의 레슨 스케줄
      const allMembers = await groupMemberRepository.find({
        where: { groupId },
        relations: ['user'],
      });

      for (const m of allMembers) {
        if (m.lessonSchedule && Array.isArray(m.lessonSchedule)) {
          for (const schedule of m.lessonSchedule as LessonSchedule[]) {
            if (schedule.lessonRoomId === roomId) {
              schedules.push({
                type: 'member',
                id: m.id,
                name: m.nickname || m.user?.name || '알 수 없음',
                dayOfWeek: schedule.dayOfWeek,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
              });
            }
          }
        }
      }

      // 2. 반(SubGroup)의 수업 스케줄
      const allSubGroups = await subGroupRepository.find({
        where: { parentGroupId: groupId, lessonRoomId: roomId, type: 'class' as any },
      });

      for (const sg of allSubGroups) {
        if (sg.classSchedule && Array.isArray(sg.classSchedule)) {
          for (const schedule of sg.classSchedule) {
            schedules.push({
              type: 'class',
              id: sg.id,
              name: sg.name,
              dayOfWeek: schedule.dayOfWeek,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
            });
          }
        }
      }

      // 요일순, 시간순 정렬
      schedules.sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.startTime.localeCompare(b.startTime);
      });

      return res.json({ data: schedules });
    } catch (error) {
      console.error('Failed to get lesson room schedule:', error);
      return res.status(500).json({ message: '수업실 스케줄 조회에 실패했습니다.' });
    }
  },

  // ===== 예약 관련 메서드 =====

  // 예약 목록 조회 (날짜 범위)
  async getReservations(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const { startDate, endDate, roomId } = req.query;
      const userId = req.user!.id;

      // 그룹 멤버인지 확인
      const member = await groupMemberRepository.findOne({
        where: { groupId, userId },
      });

      if (!member) {
        return res.status(403).json({ message: '그룹 멤버만 조회할 수 있습니다.' });
      }

      const whereCondition: any = {
        groupId,
        status: In([LessonReservationStatus.CONFIRMED]),
      };

      if (startDate && endDate) {
        whereCondition.date = Between(startDate as string, endDate as string);
      }

      if (roomId) {
        whereCondition.roomId = roomId as string;
      }

      const reservations = await reservationRepository.find({
        where: whereCondition,
        relations: ['room', 'user', 'student'],
        order: { date: 'ASC', startTime: 'ASC' },
      });

      const isAdmin = member.role === MemberRole.OWNER;

      return res.json({
        data: reservations.map((r) => ({
          id: r.id,
          roomId: r.roomId,
          roomName: r.room?.name,
          date: r.date,
          startTime: r.startTime,
          endTime: r.endTime,
          status: r.status,
          note: r.note,
          userId: r.userId,
          userName: r.user?.name,
          studentId: r.studentId,
          studentName: r.student?.name,
          isOwn: r.userId === userId,
          canCancel: isAdmin || r.userId === userId,
        })),
      });
    } catch (error) {
      console.error('Failed to get reservations:', error);
      return res.status(500).json({ message: '예약 목록 조회에 실패했습니다.' });
    }
  },

  // 예약 생성
  async createReservation(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.user!.id;
      const { roomId, date, startTime, endTime, studentId, note } = req.body;

      // 그룹 멤버인지 확인
      const member = await groupMemberRepository.findOne({
        where: { groupId, userId },
      });

      if (!member) {
        return res.status(403).json({ message: '그룹 멤버만 예약할 수 있습니다.' });
      }

      // 그룹이 education 타입이고 1:1 수업인지 확인
      const group = await groupRepository.findOne({ where: { id: groupId } });
      if (!group || group.type !== 'education' || group.hasClasses) {
        return res.status(400).json({ message: '1:1 수업 학원만 수업실 예약을 사용할 수 있습니다.' });
      }

      // 수업실 존재 확인
      const lessonRoom = await lessonRoomRepository.findOne({
        where: { id: roomId, groupId, isActive: true },
      });

      if (!lessonRoom) {
        return res.status(404).json({ message: '수업실을 찾을 수 없습니다.' });
      }

      // 날짜 유효성 검사 (오늘 이후, 최대 3주 이내)
      const reservationDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      reservationDate.setHours(0, 0, 0, 0);

      if (reservationDate < today) {
        return res.status(400).json({ message: '과거 날짜는 예약할 수 없습니다.' });
      }

      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + MAX_WEEKS_ADVANCE * 7);

      if (reservationDate > maxDate) {
        return res.status(400).json({ message: `최대 ${MAX_WEEKS_ADVANCE}주 이내만 예약할 수 있습니다.` });
      }

      // 시간 겹침 체크 (같은 수업실, 같은 날짜)
      const existingReservations = await reservationRepository.find({
        where: {
          roomId,
          date,
          status: LessonReservationStatus.CONFIRMED,
        },
      });

      const hasConflict = existingReservations.some((r) =>
        timesOverlap(startTime, endTime, r.startTime, r.endTime)
      );

      if (hasConflict) {
        return res.status(409).json({ message: '해당 시간에 이미 예약이 있습니다.' });
      }

      // 예약 생성
      const reservation = reservationRepository.create({
        groupId,
        roomId,
        userId,
        studentId: studentId || null,
        date,
        startTime,
        endTime,
        note: note || null,
        status: LessonReservationStatus.CONFIRMED,
      });

      await reservationRepository.save(reservation);

      // 관계 데이터 조회
      const savedReservation = await reservationRepository.findOne({
        where: { id: reservation.id },
        relations: ['room', 'user', 'student'],
      });

      // 학생에게 알림 전송 (studentId가 있는 경우)
      if (studentId && savedReservation) {
        const userRepository = AppDataSource.getRepository(User);
        const instructor = await userRepository.findOne({ where: { id: userId } });

        await notificationService.notifyLessonRoomReservation({
          studentId,
          groupId,
          roomName: savedReservation.room?.name || '수업실',
          date,
          startTime,
          endTime,
          instructorName: instructor?.name || '강사',
        });
      }

      return res.status(201).json({
        data: {
          id: savedReservation!.id,
          roomId: savedReservation!.roomId,
          roomName: savedReservation!.room?.name,
          date: savedReservation!.date,
          startTime: savedReservation!.startTime,
          endTime: savedReservation!.endTime,
          status: savedReservation!.status,
          note: savedReservation!.note,
          userId: savedReservation!.userId,
          userName: savedReservation!.user?.name,
          studentId: savedReservation!.studentId,
          studentName: savedReservation!.student?.name,
        },
        message: '예약이 완료되었습니다.',
      });
    } catch (error) {
      console.error('Failed to create reservation:', error);
      return res.status(500).json({ message: '예약 생성에 실패했습니다.' });
    }
  },

  // 예약 취소
  async cancelReservation(req: Request, res: Response) {
    try {
      const { groupId, reservationId } = req.params;
      const userId = req.user!.id;

      // 그룹 멤버인지 확인
      const member = await groupMemberRepository.findOne({
        where: { groupId, userId },
      });

      if (!member) {
        return res.status(403).json({ message: '그룹 멤버만 취소할 수 있습니다.' });
      }

      const reservation = await reservationRepository.findOne({
        where: { id: reservationId, groupId },
      });

      if (!reservation) {
        return res.status(404).json({ message: '예약을 찾을 수 없습니다.' });
      }

      // 본인 예약이거나 관리자인지 확인
      const isAdmin = member.role === MemberRole.OWNER;
      if (reservation.userId !== userId && !isAdmin) {
        return res.status(403).json({ message: '본인 예약만 취소할 수 있습니다.' });
      }

      // 이미 취소된 경우
      if (reservation.status === LessonReservationStatus.CANCELLED) {
        return res.status(400).json({ message: '이미 취소된 예약입니다.' });
      }

      // 과거 예약은 취소 불가
      const reservationDate = new Date(reservation.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      reservationDate.setHours(0, 0, 0, 0);

      if (reservationDate < today) {
        return res.status(400).json({ message: '과거 예약은 취소할 수 없습니다.' });
      }

      reservation.status = LessonReservationStatus.CANCELLED;
      await reservationRepository.save(reservation);

      return res.json({ message: '예약이 취소되었습니다.' });
    } catch (error) {
      console.error('Failed to cancel reservation:', error);
      return res.status(500).json({ message: '예약 취소에 실패했습니다.' });
    }
  },

  // 특정 날짜의 예약 가능 시간 조회
  async getAvailableSlots(req: Request, res: Response) {
    try {
      const { groupId, roomId } = req.params;
      const { date } = req.query;
      const userId = req.user!.id;

      // 그룹 멤버인지 확인
      const member = await groupMemberRepository.findOne({
        where: { groupId, userId },
      });

      if (!member) {
        return res.status(403).json({ message: '그룹 멤버만 조회할 수 있습니다.' });
      }

      // 그룹 운영 시간 확인
      const group = await groupRepository.findOne({ where: { id: groupId } });
      if (!group) {
        return res.status(404).json({ message: '그룹을 찾을 수 없습니다.' });
      }

      const operatingHours = group.operatingHours || { openTime: '09:00', closeTime: '22:00' };

      // 해당 날짜의 예약 조회
      const reservations = await reservationRepository.find({
        where: {
          roomId,
          date: date as string,
          status: LessonReservationStatus.CONFIRMED,
        },
        order: { startTime: 'ASC' },
      });

      // 요일에 따른 정기 수업 스케줄 조회
      const reservationDate = new Date(date as string);
      const dayOfWeek = reservationDate.getDay();

      // 멤버의 정기 스케줄에서 해당 요일 + 수업실 확인
      const regularSchedules: { startTime: string; endTime: string; name: string }[] = [];

      const allMembers = await groupMemberRepository.find({
        where: { groupId },
        relations: ['user'],
      });

      for (const m of allMembers) {
        if (m.lessonSchedule && Array.isArray(m.lessonSchedule)) {
          for (const schedule of m.lessonSchedule as LessonSchedule[]) {
            if (schedule.lessonRoomId === roomId && schedule.dayOfWeek === dayOfWeek) {
              regularSchedules.push({
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                name: m.nickname || m.user?.name || '정기 수업',
              });
            }
          }
        }
      }

      return res.json({
        data: {
          operatingHours,
          reservations: reservations.map((r) => ({
            startTime: r.startTime,
            endTime: r.endTime,
          })),
          regularSchedules,
        },
      });
    } catch (error) {
      console.error('Failed to get available slots:', error);
      return res.status(500).json({ message: '예약 가능 시간 조회에 실패했습니다.' });
    }
  },

  // 내 예약 목록 조회
  async getMyReservations(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.user!.id;

      // 그룹 멤버인지 확인
      const member = await groupMemberRepository.findOne({
        where: { groupId, userId },
      });

      if (!member) {
        return res.status(403).json({ message: '그룹 멤버만 조회할 수 있습니다.' });
      }

      // 오늘 이후의 내 예약만 조회
      const today = new Date().toISOString().split('T')[0];

      const reservations = await reservationRepository
        .createQueryBuilder('r')
        .leftJoinAndSelect('r.room', 'room')
        .leftJoinAndSelect('r.student', 'student')
        .where('r.groupId = :groupId', { groupId })
        .andWhere('r.userId = :userId', { userId })
        .andWhere('r.date >= :today', { today })
        .andWhere('r.status = :status', { status: LessonReservationStatus.CONFIRMED })
        .orderBy('r.date', 'ASC')
        .addOrderBy('r.startTime', 'ASC')
        .getMany();

      return res.json({
        data: reservations.map((r) => ({
          id: r.id,
          roomId: r.roomId,
          roomName: r.room?.name,
          date: r.date,
          startTime: r.startTime,
          endTime: r.endTime,
          status: r.status,
          note: r.note,
          studentId: r.studentId,
          studentName: r.student?.name,
        })),
      });
    } catch (error) {
      console.error('Failed to get my reservations:', error);
      return res.status(500).json({ message: '내 예약 조회에 실패했습니다.' });
    }
  },
};
