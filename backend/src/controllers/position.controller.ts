import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { GroupPosition } from '../models/GroupPosition';
import { MemberPosition } from '../models/MemberPosition';
import { GroupMember } from '../models/GroupMember';
import { AppError } from '../middlewares/error.middleware';

export class PositionController {
  private positionRepository = AppDataSource.getRepository(GroupPosition);
  private memberPositionRepository = AppDataSource.getRepository(MemberPosition);
  private memberRepository = AppDataSource.getRepository(GroupMember);

  // 직책 목록 조회
  getPositions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { subGroupId } = req.query;

      const queryBuilder = this.positionRepository
        .createQueryBuilder('position')
        .where('position.groupId = :groupId', { groupId })
        .andWhere('position.isActive = :isActive', { isActive: true });

      if (subGroupId) {
        queryBuilder.andWhere('(position.subGroupId = :subGroupId OR position.subGroupId IS NULL)', { subGroupId });
      } else {
        queryBuilder.andWhere('position.subGroupId IS NULL');
      }

      const positions = await queryBuilder.orderBy('position.sortOrder', 'ASC').getMany();

      res.json({
        success: true,
        data: positions,
      });
    } catch (error) {
      next(error);
    }
  };

  // 직책 생성
  createPosition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { name, description, color, icon, permissions, subGroupId } = req.body;

      // 중복 이름 체크
      const existing = await this.positionRepository.findOne({
        where: { groupId, name, subGroupId: subGroupId || undefined },
      });

      if (existing) {
        throw new AppError('이미 존재하는 직책명입니다.', 400);
      }

      // 정렬 순서
      const maxOrder = await this.positionRepository
        .createQueryBuilder('position')
        .where('position.groupId = :groupId', { groupId })
        .select('MAX(position.sortOrder)', 'max')
        .getRawOne();

      const position = this.positionRepository.create({
        groupId,
        subGroupId,
        name,
        description,
        color,
        icon,
        permissions,
        sortOrder: (maxOrder?.max || 0) + 1,
      });

      await this.positionRepository.save(position);

      res.status(201).json({
        success: true,
        data: position,
        message: '직책이 생성되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 직책 수정
  updatePosition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, positionId } = req.params;
      const { name, description, color, icon, permissions, sortOrder } = req.body;

      const position = await this.positionRepository.findOne({
        where: { id: positionId, groupId },
      });

      if (!position) {
        throw new AppError('직책을 찾을 수 없습니다.', 404);
      }

      if (name) position.name = name;
      if (description !== undefined) position.description = description;
      if (color !== undefined) position.color = color;
      if (icon !== undefined) position.icon = icon;
      if (permissions !== undefined) position.permissions = permissions;
      if (sortOrder !== undefined) position.sortOrder = sortOrder;

      await this.positionRepository.save(position);

      res.json({
        success: true,
        data: position,
        message: '직책이 수정되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 직책 삭제
  deletePosition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, positionId } = req.params;

      const position = await this.positionRepository.findOne({
        where: { id: positionId, groupId },
      });

      if (!position) {
        throw new AppError('직책을 찾을 수 없습니다.', 404);
      }

      // 소프트 삭제 (isActive = false)
      position.isActive = false;
      await this.positionRepository.save(position);

      // 해당 직책을 가진 멤버들의 직책도 비활성화
      await this.memberPositionRepository.update({ positionId }, { isActive: false });

      res.json({
        success: true,
        message: '직책이 삭제되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 멤버에게 직책 부여
  assignPosition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, memberId } = req.params;
      const { positionId, startDate, endDate } = req.body;

      // 멤버 확인
      const member = await this.memberRepository.findOne({
        where: { id: memberId, groupId },
      });

      if (!member) {
        throw new AppError('멤버를 찾을 수 없습니다.', 404);
      }

      // 직책 확인
      const position = await this.positionRepository.findOne({
        where: { id: positionId, groupId, isActive: true },
      });

      if (!position) {
        throw new AppError('직책을 찾을 수 없습니다.', 404);
      }

      // 이미 부여된 직책인지 확인
      const existing = await this.memberPositionRepository.findOne({
        where: { memberId, positionId, isActive: true },
      });

      if (existing) {
        throw new AppError('이미 해당 직책이 부여되어 있습니다.', 400);
      }

      const memberPosition = this.memberPositionRepository.create({
        memberId,
        positionId,
        assignedById: req.user!.id,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      await this.memberPositionRepository.save(memberPosition);

      res.status(201).json({
        success: true,
        data: memberPosition,
        message: '직책이 부여되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 멤버 직책 해제
  removePosition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, memberId, positionId } = req.params;

      const memberPosition = await this.memberPositionRepository.findOne({
        where: { memberId, positionId, isActive: true },
        relations: ['member'],
      });

      if (!memberPosition || memberPosition.member.groupId !== groupId) {
        throw new AppError('직책 정보를 찾을 수 없습니다.', 404);
      }

      memberPosition.isActive = false;
      await this.memberPositionRepository.save(memberPosition);

      res.json({
        success: true,
        message: '직책이 해제되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 멤버의 직책 목록 조회
  getMemberPositions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, memberId } = req.params;

      const memberPositions = await this.memberPositionRepository.find({
        where: { memberId, isActive: true },
        relations: ['position'],
      });

      // 해당 그룹의 직책만 필터링
      const positions = memberPositions
        .filter((mp) => mp.position.groupId === groupId)
        .map((mp) => ({
          ...mp.position,
          startDate: mp.startDate,
          endDate: mp.endDate,
          assignedAt: mp.createdAt,
        }));

      res.json({
        success: true,
        data: positions,
      });
    } catch (error) {
      next(error);
    }
  };

  // 직책별 멤버 목록 조회
  getPositionMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, positionId } = req.params;

      const memberPositions = await this.memberPositionRepository.find({
        where: { positionId, isActive: true },
        relations: ['member', 'member.user'],
      });

      // 해당 그룹 멤버만 필터링
      const members = memberPositions
        .filter((mp) => mp.member.groupId === groupId)
        .map((mp) => ({
          memberId: mp.member.id,
          userId: mp.member.userId,
          name: mp.member.user.name,
          profileImage: mp.member.user.profileImage,
          startDate: mp.startDate,
          endDate: mp.endDate,
          assignedAt: mp.createdAt,
        }));

      res.json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  };
}
