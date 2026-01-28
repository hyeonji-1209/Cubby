import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { LessonRoom, Group, GroupMember, MemberRole, SubGroup } from '../models';
import type { LessonSchedule } from '../models/GroupMember';

const lessonRoomRepository = AppDataSource.getRepository(LessonRoom);
const groupRepository = AppDataSource.getRepository(Group);
const groupMemberRepository = AppDataSource.getRepository(GroupMember);
const subGroupRepository = AppDataSource.getRepository(SubGroup);

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

// 권한 체크 헬퍼
const checkAdminPermission = async (groupId: string, userId: string): Promise<boolean> => {
  const member = await groupMemberRepository.findOne({
    where: { groupId, userId },
  });
  return member?.role === MemberRole.OWNER || member?.role === MemberRole.ADMIN;
};

export const lessonRoomController = {
  // 레슨실 목록 조회
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
      return res.status(500).json({ message: '레슨실 목록 조회에 실패했습니다.' });
    }
  },

  // 레슨실 생성
  async create(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.user!.id;
      const { name, capacity = 1, color } = req.body;

      // 관리자 권한 확인
      const isAdmin = await checkAdminPermission(groupId, userId);
      if (!isAdmin) {
        return res.status(403).json({ message: '관리자만 레슨실을 생성할 수 있습니다.' });
      }

      // 그룹이 education 타입이고 1:1 수업인지 확인
      const group = await groupRepository.findOne({ where: { id: groupId } });
      if (!group) {
        return res.status(404).json({ message: '그룹을 찾을 수 없습니다.' });
      }

      if (group.type !== 'education' || group.hasClasses) {
        return res.status(400).json({ message: '1:1 수업 학원만 레슨실을 사용할 수 있습니다.' });
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
      return res.status(500).json({ message: '레슨실 생성에 실패했습니다.' });
    }
  },

  // 레슨실 수정
  async update(req: Request, res: Response) {
    try {
      const { groupId, roomId } = req.params;
      const userId = req.user!.id;
      const { name, capacity, color, isActive } = req.body;

      // 관리자 권한 확인
      const isAdmin = await checkAdminPermission(groupId, userId);
      if (!isAdmin) {
        return res.status(403).json({ message: '관리자만 레슨실을 수정할 수 있습니다.' });
      }

      const lessonRoom = await lessonRoomRepository.findOne({
        where: { id: roomId, groupId },
      });

      if (!lessonRoom) {
        return res.status(404).json({ message: '레슨실을 찾을 수 없습니다.' });
      }

      if (name !== undefined) lessonRoom.name = name.trim();
      if (capacity !== undefined) lessonRoom.capacity = capacity;
      if (color !== undefined) lessonRoom.color = color;
      if (isActive !== undefined) lessonRoom.isActive = isActive;

      await lessonRoomRepository.save(lessonRoom);

      return res.json({ data: lessonRoom });
    } catch (error) {
      console.error('Failed to update lesson room:', error);
      return res.status(500).json({ message: '레슨실 수정에 실패했습니다.' });
    }
  },

  // 레슨실 삭제
  async delete(req: Request, res: Response) {
    try {
      const { groupId, roomId } = req.params;
      const userId = req.user!.id;

      // 관리자 권한 확인
      const isAdmin = await checkAdminPermission(groupId, userId);
      if (!isAdmin) {
        return res.status(403).json({ message: '관리자만 레슨실을 삭제할 수 있습니다.' });
      }

      const lessonRoom = await lessonRoomRepository.findOne({
        where: { id: roomId, groupId },
      });

      if (!lessonRoom) {
        return res.status(404).json({ message: '레슨실을 찾을 수 없습니다.' });
      }

      // TODO: 해당 레슨실에 배정된 수업이 있는지 확인하고 경고

      await lessonRoomRepository.remove(lessonRoom);

      return res.json({ message: '레슨실이 삭제되었습니다.' });
    } catch (error) {
      console.error('Failed to delete lesson room:', error);
      return res.status(500).json({ message: '레슨실 삭제에 실패했습니다.' });
    }
  },

  // 레슨실 순서 변경
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

  // 레슨실 충돌 검사
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

      // 레슨실 존재 확인
      const lessonRoom = await lessonRoomRepository.findOne({
        where: { id: roomId, groupId },
      });

      if (!lessonRoom) {
        return res.status(404).json({ message: '레슨실을 찾을 수 없습니다.' });
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

  // 특정 레슨실의 모든 예약 현황 조회
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

      // 레슨실 존재 확인
      const lessonRoom = await lessonRoomRepository.findOne({
        where: { id: roomId, groupId },
      });

      if (!lessonRoom) {
        return res.status(404).json({ message: '레슨실을 찾을 수 없습니다.' });
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
      return res.status(500).json({ message: '레슨실 스케줄 조회에 실패했습니다.' });
    }
  },
};
