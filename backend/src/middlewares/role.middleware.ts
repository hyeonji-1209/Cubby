import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from './error.middleware';
import { UserRole } from '../models/User';
import { MemberRole, MemberStatus } from '../models/GroupMember';
import { GroupPosition, PositionPermissions } from '../models/GroupPosition';
import { AppDataSource } from '../config/database';
import { GroupMember } from '../models/GroupMember';

// Check if user has specific system role
export const requireRole = (...roles: UserRole[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

/**
 * 멤버의 직책 권한 확인 (미들웨어 내부용)
 */
const checkPositionPermission = async (
  membership: GroupMember,
  permission: keyof PositionPermissions
): Promise<boolean> => {
  // owner는 모든 권한 보유
  if (membership.role === MemberRole.OWNER) return true;

  // 직책이 없으면 권한 없음
  if (!membership.positionId) return false;

  // 직책 조회
  const positionRepository = AppDataSource.getRepository(GroupPosition);
  const position = await positionRepository.findOne({
    where: { id: membership.positionId, isActive: true },
  });

  if (!position || !position.permissions) return false;

  return position.permissions[permission] === true;
};

/**
 * Check if user has specific role in a group
 * 새로운 시스템: owner만 role로 체크, 나머지는 직책 기반
 * 하위 호환성: MemberRole.OWNER 이외의 role은 무시됨
 */
export const requireGroupRole = (...roles: MemberRole[]): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError('Authentication required', 401));
      }

      const groupId = req.params.groupId;
      if (!groupId) {
        return next(new AppError('Group ID is required', 400));
      }

      const memberRepository = AppDataSource.getRepository(GroupMember);
      const membership = await memberRepository.findOne({
        where: {
          groupId,
          userId: req.user.id,
          status: MemberStatus.ACTIVE,
        },
      });

      if (!membership) {
        return next(new AppError('Not a member of this group', 403));
      }

      // owner는 항상 통과
      if (membership.role === MemberRole.OWNER) {
        return next();
      }

      // owner만 요구하는 경우 (roles에 owner만 있을 때)
      if (roles.length === 1 && roles[0] === MemberRole.OWNER) {
        return next(new AppError('Insufficient group permissions', 403));
      }

      // 그 외의 경우는 멤버면 통과 (직책 권한은 컨트롤러에서 체크)
      // 하위 호환성: 기존 ADMIN, LEADER 체크는 canManageMembers, canManageSchedules 등으로 대체 필요
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 특정 직책 권한 요구 (새로운 권한 시스템)
 * @param permission - 요구하는 권한 (PositionPermissions의 키)
 */
export const requireGroupPermission = (permission: keyof PositionPermissions): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError('Authentication required', 401));
      }

      const groupId = req.params.groupId;
      if (!groupId) {
        return next(new AppError('Group ID is required', 400));
      }

      const memberRepository = AppDataSource.getRepository(GroupMember);
      const membership = await memberRepository.findOne({
        where: {
          groupId,
          userId: req.user.id,
          status: MemberStatus.ACTIVE,
        },
      });

      if (!membership) {
        return next(new AppError('Not a member of this group', 403));
      }

      const hasPermission = await checkPositionPermission(membership, permission);

      if (!hasPermission) {
        return next(new AppError('Insufficient group permissions', 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * owner만 허용
 */
export const requireGroupOwner: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const groupId = req.params.groupId;
    if (!groupId) {
      return next(new AppError('Group ID is required', 400));
    }

    const memberRepository = AppDataSource.getRepository(GroupMember);
    const membership = await memberRepository.findOne({
      where: {
        groupId,
        userId: req.user.id,
        status: MemberStatus.ACTIVE,
      },
    });

    if (!membership || membership.role !== MemberRole.OWNER) {
      return next(new AppError('Only group owners can perform this action', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Check if user is a member of the group (any role)
export const requireGroupMember: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const groupId = req.params.groupId;
    if (!groupId) {
      return next(new AppError('Group ID is required', 400));
    }

    const memberRepository = AppDataSource.getRepository(GroupMember);
    const membership = await memberRepository.findOne({
      where: {
        groupId,
        userId: req.user.id,
        status: MemberStatus.ACTIVE,
      },
    });

    if (!membership) {
      return next(new AppError('Not a member of this group', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};
