import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { GroupMember, MemberStatus } from '../models/GroupMember';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from '../models/Subscription';
import { hashPassword, comparePassword } from '../utils/password.util';
import { AppError } from '../middlewares/error.middleware';
import { pushService } from '../services/push.service';

export class UserController {
  private userRepository = AppDataSource.getRepository(User);
  private memberRepository = AppDataSource.getRepository(GroupMember);
  private subscriptionRepository = AppDataSource.getRepository(Subscription);

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          profileImage: user.profileImage,
          role: user.role,
          provider: user.provider,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  updateMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { name, phone, profileImage } = req.body;

      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;
      if (profileImage !== undefined) user.profileImage = profileImage;

      await this.userRepository.save(user);

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          profileImage: user.profileImage,
          role: user.role,
          provider: user.provider,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  updatePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // 비밀번호 포함해서 다시 조회
      const user = await this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.id = :id', { id: req.user!.id })
        .getOne();

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // 현재 비밀번호 확인
      const isPasswordValid = await comparePassword(currentPassword, user.password);

      if (!isPasswordValid) {
        throw new AppError('Current password is incorrect', 400);
      }

      // 새 비밀번호 해싱 및 저장
      user.password = await hashPassword(newPassword);
      await this.userRepository.save(user);

      res.json({
        success: true,
        message: 'Password updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  deleteMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { password } = req.body;

      // 비밀번호 포함해서 다시 조회
      const user = await this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.id = :id', { id: req.user!.id })
        .getOne();

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // 비밀번호 확인
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        throw new AppError('Password is incorrect', 400);
      }

      // Soft delete
      await this.userRepository.softDelete(user.id);

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getMyGroups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const memberships = await this.memberRepository.find({
        where: {
          userId: req.user!.id,
          status: MemberStatus.ACTIVE,
        },
        relations: ['group'],
        order: {
          joinedAt: 'DESC',
        },
      });

      const groups = memberships.map((membership) => ({
        ...membership.group,
        myRole: membership.role,
        joinedAt: membership.joinedAt,
      }));

      res.json({
        success: true,
        data: groups,
      });
    } catch (error) {
      next(error);
    }
  };

  // 디바이스 토큰 등록 (FCM 푸시 알림용)
  registerDeviceToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { token, platform, deviceName } = req.body;

      if (!token || !platform) {
        throw new AppError('token과 platform은 필수입니다.', 400);
      }

      if (!['ios', 'android', 'web'].includes(platform)) {
        throw new AppError('platform은 ios, android, web 중 하나여야 합니다.', 400);
      }

      const deviceToken = await pushService.registerToken(userId, token, platform, deviceName);

      res.json({
        success: true,
        data: deviceToken,
        message: '디바이스 토큰이 등록되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 디바이스 토큰 삭제 (로그아웃 시)
  removeDeviceToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { token } = req.body;

      if (!token) {
        throw new AppError('token은 필수입니다.', 400);
      }

      await pushService.removeToken(userId, token);

      res.json({
        success: true,
        message: '디바이스 토큰이 삭제되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  // 내 구독 정보 조회
  getMySubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const subscription = await this.subscriptionRepository.findOne({
        where: { userId, status: SubscriptionStatus.ACTIVE },
        order: { createdAt: 'DESC' },
      });

      const plan = subscription?.plan || SubscriptionPlan.BASIC;

      res.json({
        success: true,
        data: {
          plan,
          subscription,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
