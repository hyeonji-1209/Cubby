import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { PracticeRoomReservation, ReservationStatus } from '../models/PracticeRoomReservation';
import { PracticeRoom } from '../models/PracticeRoom';
import { Group } from '../models/Group';
import { GroupMember, LessonSchedule } from '../models/GroupMember';
import { AppError } from '../middlewares/error.middleware';
import { MoreThanOrEqual, Not } from 'typeorm';
import { requireActiveMember, isAdmin } from '../utils/membership';
import { getMinutesDiff, getTodayDateString } from '../utils/time';

export class PracticeRoomReservationController {
  private reservationRepository = AppDataSource.getRepository(PracticeRoomReservation);
  private roomRepository = AppDataSource.getRepository(PracticeRoom);
  private groupRepository = AppDataSource.getRepository(Group);
  private memberRepository = AppDataSource.getRepository(GroupMember);

  // 특정 날짜의 예약 목록 조회
  getByDate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, date } = req.params;

      // 멤버 확인
      await requireActiveMember(this.memberRepository, groupId, req.user!.id);

      const reservations = await this.reservationRepository.find({
        where: {
          groupId,
          date,
          status: Not(ReservationStatus.CANCELLED),
        },
        relations: ['room', 'user'],
        order: { startTime: 'ASC' },
      });

      res.json({
        success: true,
        data: reservations.map((r) => ({
          id: r.id,
          roomId: r.roomId,
          roomName: r.room?.name,
          userId: r.userId,
          userName: r.user?.name,
          date: r.date,
          startTime: r.startTime,
          endTime: r.endTime,
          status: r.status,
          note: r.note,
          isOwn: r.userId === req.user!.id,
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  // 내 예약 목록 조회
  getMyReservations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      // 멤버 확인
      await requireActiveMember(this.memberRepository, groupId, req.user!.id);

      const today = getTodayDateString();

      const reservations = await this.reservationRepository.find({
        where: {
          groupId,
          userId: req.user!.id,
          date: MoreThanOrEqual(today),
          status: Not(ReservationStatus.CANCELLED),
        },
        relations: ['room'],
        order: { date: 'ASC', startTime: 'ASC' },
      });

      res.json({
        success: true,
        data: reservations.map((r) => ({
          id: r.id,
          roomId: r.roomId,
          roomName: r.room?.name,
          date: r.date,
          startTime: r.startTime,
          endTime: r.endTime,
          status: r.status,
          note: r.note,
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  // 예약 생성
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { roomId, date, startTime, endTime, note } = req.body;

      // 멤버 확인
      await requireActiveMember(this.memberRepository, groupId, req.user!.id);

      // 그룹 확인
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (!group || !group.hasPracticeRooms) {
        throw new AppError('연습실 기능이 활성화되지 않은 모임입니다', 400);
      }

      // 연습실 확인
      const room = await this.roomRepository.findOne({
        where: { id: roomId, groupId, isActive: true },
      });
      if (!room) {
        throw new AppError('연습실을 찾을 수 없거나 비활성 상태입니다', 404);
      }

      // 날짜 검증 (과거 날짜 불가)
      const today = getTodayDateString();
      if (date < today) {
        throw new AppError('과거 날짜는 예약할 수 없습니다', 400);
      }

      // 시간 검증
      if (startTime >= endTime) {
        throw new AppError('종료 시간은 시작 시간 이후여야 합니다', 400);
      }

      // 운영 시간 검증
      if (group.practiceRoomSettings) {
        const { openTime, closeTime, maxHoursPerDay } = group.practiceRoomSettings;
        if (startTime < openTime || endTime > closeTime) {
          throw new AppError(`운영 시간 내에 예약해주세요 (${openTime} - ${closeTime})`, 400);
        }

        // 1일 최대 시간 검증
        const existingReservations = await this.reservationRepository.find({
          where: {
            groupId,
            userId: req.user!.id,
            date,
            status: Not(ReservationStatus.CANCELLED),
          },
        });

        let totalMinutes = existingReservations.reduce(
          (acc, r) => acc + getMinutesDiff(r.startTime, r.endTime),
          0
        );
        totalMinutes += getMinutesDiff(startTime, endTime);

        if (totalMinutes > maxHoursPerDay * 60) {
          throw new AppError(`1일 최대 ${maxHoursPerDay}시간을 초과할 수 없습니다`, 400);
        }
      }

      // 해당 연습실 중복 예약 확인
      const conflicting = await this.reservationRepository
        .createQueryBuilder('r')
        .where('r.roomId = :roomId', { roomId })
        .andWhere('r.date = :date', { date })
        .andWhere('r.status != :cancelled', { cancelled: ReservationStatus.CANCELLED })
        .andWhere(
          '(r.startTime < :endTime AND r.endTime > :startTime)',
          { startTime, endTime }
        )
        .getOne();

      if (conflicting) {
        throw new AppError('해당 시간대는 이미 예약되어 있습니다', 409);
      }

      // 같은 사용자가 같은 시간대에 다른 연습실 예약했는지 확인
      const userConflicting = await this.reservationRepository
        .createQueryBuilder('r')
        .where('r.userId = :userId', { userId: req.user!.id })
        .andWhere('r.groupId = :groupId', { groupId })
        .andWhere('r.date = :date', { date })
        .andWhere('r.status != :cancelled', { cancelled: ReservationStatus.CANCELLED })
        .andWhere(
          '(r.startTime < :endTime AND r.endTime > :startTime)',
          { startTime, endTime }
        )
        .getOne();

      if (userConflicting) {
        throw new AppError('동일 시간대에 이미 예약이 있습니다', 409);
      }

      const reservation = this.reservationRepository.create({
        roomId,
        groupId,
        userId: req.user!.id,
        date,
        startTime,
        endTime,
        note,
        status: ReservationStatus.CONFIRMED,
      });

      await this.reservationRepository.save(reservation);

      res.status(201).json({
        success: true,
        data: {
          id: reservation.id,
          roomId: reservation.roomId,
          date: reservation.date,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          status: reservation.status,
          note: reservation.note,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 예약 취소
  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, reservationId } = req.params;

      const reservation = await this.reservationRepository.findOne({
        where: { id: reservationId, groupId },
      });

      if (!reservation) {
        throw new AppError('예약을 찾을 수 없습니다', 404);
      }

      // 본인 예약만 취소 가능 (관리자는 모든 예약 취소 가능)
      const member = await requireActiveMember(this.memberRepository, groupId, req.user!.id);

      if (reservation.userId !== req.user!.id && !isAdmin(member)) {
        throw new AppError('본인의 예약만 취소할 수 있습니다', 403);
      }

      reservation.status = ReservationStatus.CANCELLED;
      await this.reservationRepository.save(reservation);

      res.json({
        success: true,
        message: '예약이 취소되었습니다',
      });
    } catch (error) {
      next(error);
    }
  };

  // 특정 날짜의 수업 목록 조회 (연습실 예약 시 참고용)
  getLessonsByDate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, date } = req.params;

      // 멤버 확인
      await requireActiveMember(this.memberRepository, groupId, req.user!.id);

      // 날짜에서 요일 추출 (0 = 일요일, 6 = 토요일)
      const targetDate = new Date(date);
      const dayOfWeek = targetDate.getDay();

      // 해당 그룹의 모든 멤버 조회
      const members = await this.memberRepository.find({
        where: { groupId },
        relations: ['user'],
      });

      // 해당 요일에 수업이 있는 멤버 필터링
      const lessons: {
        memberId: string;
        memberName: string;
        startTime: string;
        endTime: string;
        lessonRoomName?: string;
      }[] = [];

      for (const member of members) {
        const lessonSchedule = member.lessonSchedule as LessonSchedule[] | null;
        if (lessonSchedule && Array.isArray(lessonSchedule)) {
          for (const schedule of lessonSchedule) {
            if (schedule.dayOfWeek === dayOfWeek) {
              lessons.push({
                memberId: member.id,
                memberName: member.nickname || member.user?.name || '알 수 없음',
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                lessonRoomName: schedule.lessonRoomName,
              });
            }
          }
        }
      }

      // 시간순 정렬
      lessons.sort((a, b) => a.startTime.localeCompare(b.startTime));

      res.json({
        success: true,
        data: lessons,
      });
    } catch (error) {
      next(error);
    }
  };
}
