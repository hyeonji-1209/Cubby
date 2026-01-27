import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { FavoriteLocation } from '../models/FavoriteLocation';
import { GroupMember } from '../models/GroupMember';
import { AppError } from '../middlewares/error.middleware';
import { requireActiveMember, requireAdmin } from '../utils/membership';

export class LocationController {
  private locationRepository = AppDataSource.getRepository(FavoriteLocation);
  private memberRepository = AppDataSource.getRepository(GroupMember);

  // 그룹의 자주 쓰는 장소 목록 조회
  getByGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;

      // 멤버인지 확인
      await requireActiveMember(this.memberRepository, groupId, req.user!.id);

      const locations = await this.locationRepository.find({
        where: { groupId },
        order: { sortOrder: 'ASC', createdAt: 'DESC' },
      });

      res.json({
        success: true,
        data: locations,
      });
    } catch (error) {
      next(error);
    }
  };

  // 자주 쓰는 장소 추가 (관리자 전용)
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params;
      const { name, address, placeId, lat, lng, detail } = req.body;

      // 관리자인지 확인
      await requireAdmin(this.memberRepository, groupId, req.user!.id, 'add locations');

      // 순서 계산
      const maxOrder = await this.locationRepository
        .createQueryBuilder('loc')
        .where('loc.groupId = :groupId', { groupId })
        .select('MAX(loc.sortOrder)', 'max')
        .getRawOne();

      const location = this.locationRepository.create({
        groupId,
        name,
        address,
        placeId,
        lat,
        lng,
        detail,
        sortOrder: (maxOrder?.max || 0) + 1,
      });

      await this.locationRepository.save(location);

      res.status(201).json({
        success: true,
        data: location,
        message: '장소가 추가되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 자주 쓰는 장소 수정 (관리자 전용)
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, locationId } = req.params;
      const { name, address, placeId, lat, lng, sortOrder, detail } = req.body;

      // 관리자인지 확인
      await requireAdmin(this.memberRepository, groupId, req.user!.id, 'update locations');

      const location = await this.locationRepository.findOne({
        where: { id: locationId, groupId },
      });

      if (!location) {
        throw new AppError('Location not found', 404);
      }

      if (name) location.name = name;
      if (address) location.address = address;
      if (placeId !== undefined) location.placeId = placeId;
      if (lat !== undefined) location.lat = lat;
      if (lng !== undefined) location.lng = lng;
      if (sortOrder !== undefined) location.sortOrder = sortOrder;
      if (detail !== undefined) location.detail = detail;

      await this.locationRepository.save(location);

      res.json({
        success: true,
        data: location,
        message: '장소가 수정되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 자주 쓰는 장소 삭제 (관리자 전용)
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, locationId } = req.params;

      // 관리자인지 확인
      await requireAdmin(this.memberRepository, groupId, req.user!.id, 'delete locations');

      const location = await this.locationRepository.findOne({
        where: { id: locationId, groupId },
      });

      if (!location) {
        throw new AppError('Location not found', 404);
      }

      await this.locationRepository.remove(location);

      res.json({
        success: true,
        message: '장소가 삭제되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };
}
