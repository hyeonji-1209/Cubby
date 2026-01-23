import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from './error.middleware';
import { UserRole } from '../models/User';
import { MemberRole, MemberStatus } from '../models/GroupMember';
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

// Check if user has specific role in a group
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

      if (!roles.includes(membership.role)) {
        return next(new AppError('Insufficient group permissions', 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
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
