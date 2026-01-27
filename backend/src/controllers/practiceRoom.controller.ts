import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { PracticeRoom } from '../models/PracticeRoom';
import { Group, GroupType } from '../models/Group';
import { GroupMember } from '../models/GroupMember';
import { AppError } from '../middlewares/error.middleware';
import { requireAdmin } from '../utils/membership';

export class PracticeRoomController {
  private practiceRoomRepository = AppDataSource.getRepository(PracticeRoom);
  private groupRepository = AppDataSource.getRepository(Group);
  private memberRepository = AppDataSource.getRepository(GroupMember);

  // 연습실 목록 조회
  getList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      // 그룹 확인
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (!group) {
        throw new AppError('Group not found', 404);
      }

      // 학원 타입이고 연습실 운영 중인지 확인
      if (group.type !== GroupType.EDUCATION || !group.hasPracticeRooms) {
        throw new AppError('Practice rooms are not enabled for this group', 400);
      }

      const practiceRooms = await this.practiceRoomRepository.find({
        where: { groupId },
        order: { order: 'ASC', createdAt: 'ASC' },
      });

      res.json({
        success: true,
        data: practiceRooms,
      });
    } catch (error) {
      next(error);
    }
  };

  // 연습실 생성
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { name, capacity } = req.body;
      const userId = req.user!.id;

      if (!name?.trim()) {
        throw new AppError('Practice room name is required', 400);
      }

      // 그룹 확인
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (!group) {
        throw new AppError('Group not found', 404);
      }

      // 학원 타입이고 연습실 운영 중인지 확인
      if (group.type !== GroupType.EDUCATION || !group.hasPracticeRooms) {
        throw new AppError('Practice rooms are not enabled for this group', 400);
      }

      // 관리자 권한 확인
      await requireAdmin(this.memberRepository, groupId, userId, 'create practice rooms');

      // 현재 최대 order 값 조회
      const maxOrderResult = await this.practiceRoomRepository
        .createQueryBuilder('pr')
        .where('pr.groupId = :groupId', { groupId })
        .select('MAX(pr.order)', 'maxOrder')
        .getRawOne();
      const nextOrder = (maxOrderResult?.maxOrder ?? -1) + 1;

      const practiceRoom = this.practiceRoomRepository.create({
        groupId,
        name: name.trim(),
        order: nextOrder,
        capacity: capacity || 1,
      });

      await this.practiceRoomRepository.save(practiceRoom);

      res.status(201).json({
        success: true,
        data: practiceRoom,
      });
    } catch (error) {
      next(error);
    }
  };

  // 연습실 수정
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, roomId } = req.params;
      const { name, isActive, capacity } = req.body;
      const userId = req.user!.id;

      // 관리자 권한 확인
      await requireAdmin(this.memberRepository, groupId, userId, 'update practice rooms');

      const practiceRoom = await this.practiceRoomRepository.findOne({
        where: { id: roomId, groupId },
      });
      if (!practiceRoom) {
        throw new AppError('Practice room not found', 404);
      }

      if (name !== undefined) practiceRoom.name = name.trim();
      if (isActive !== undefined) practiceRoom.isActive = isActive;
      if (capacity !== undefined) practiceRoom.capacity = capacity;

      await this.practiceRoomRepository.save(practiceRoom);

      res.json({
        success: true,
        data: practiceRoom,
      });
    } catch (error) {
      next(error);
    }
  };

  // 연습실 삭제
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, roomId } = req.params;
      const userId = req.user!.id;

      // 관리자 권한 확인
      await requireAdmin(this.memberRepository, groupId, userId, 'delete practice rooms');

      const practiceRoom = await this.practiceRoomRepository.findOne({
        where: { id: roomId, groupId },
      });
      if (!practiceRoom) {
        throw new AppError('Practice room not found', 404);
      }

      await this.practiceRoomRepository.remove(practiceRoom);

      res.json({
        success: true,
        message: 'Practice room deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // 연습실 순서 변경
  reorder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { roomIds } = req.body; // 순서대로 정렬된 roomId 배열
      const userId = req.user!.id;

      if (!Array.isArray(roomIds)) {
        throw new AppError('roomIds must be an array', 400);
      }

      // 관리자 권한 확인
      await requireAdmin(this.memberRepository, groupId, userId, 'reorder practice rooms');

      // 순서 업데이트
      await Promise.all(
        roomIds.map((roomId: string, index: number) =>
          this.practiceRoomRepository.update(
            { id: roomId, groupId },
            { order: index }
          )
        )
      );

      res.json({
        success: true,
        message: 'Practice rooms reordered successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
