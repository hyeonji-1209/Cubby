import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { User, AuthProvider } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { hashPassword, comparePassword } from '../utils/password.util';
import { verifyRefreshToken } from '../utils/jwt.util';
import { AppError } from '../middlewares/error.middleware';
import { VerificationController } from './verification.controller';
import { tokenService } from '../services/token.service';
import { oauthService } from '../services/oauth.service';

export class AuthController {
  private userRepository = AppDataSource.getRepository(User);
  private refreshTokenRepository = AppDataSource.getRepository(RefreshToken);

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, phone, emailVerificationToken } = req.body;

      // 이메일 인증 필수
      if (!emailVerificationToken) {
        throw new AppError('Email verification is required', 400);
      }

      // 이메일 인증 토큰 검증
      const isEmailVerified = await VerificationController.verifyEmailToken(email, emailVerificationToken);
      if (!isEmailVerified) {
        throw new AppError('Invalid or expired email verification', 400);
      }

      // 이메일 중복 확인
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        throw new AppError('Email already exists', 400);
      }

      // 비밀번호 해싱
      const hashedPassword = await hashPassword(password);

      // 휴대폰 번호 정리 (선택사항)
      const cleanPhone = phone ? phone.replace(/-/g, '') : null;

      // 사용자 생성
      const user = this.userRepository.create({
        email,
        password: hashedPassword,
        name,
        phone: cleanPhone,
        emailVerified: true,
        phoneVerified: false,
        provider: AuthProvider.LOCAL,
      });

      await this.userRepository.save(user);

      // 토큰 생성 및 저장
      const tokens = await tokenService.createAndSaveTokens(user.id);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            phoneVerified: user.phoneVerified,
            profileImage: user.profileImage,
          },
          tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      // 사용자 조회 (비밀번호 포함)
      const user = await this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.email = :email', { email })
        .getOne();

      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      if (user.provider !== AuthProvider.LOCAL) {
        throw new AppError(`Please login with ${user.provider}`, 400);
      }

      // 비밀번호 확인
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }

      if (user.status !== 'active') {
        throw new AppError('Account is not active', 403);
      }

      // 토큰 생성 및 저장
      const tokens = await tokenService.createAndSaveTokens(user.id);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            profileImage: user.profileImage,
          },
          tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400);
      }

      // 토큰 검증
      const decoded = verifyRefreshToken(refreshToken);

      // DB에서 토큰 확인
      const storedToken = await this.refreshTokenRepository.findOne({
        where: {
          token: refreshToken,
          userId: decoded.userId,
          isRevoked: false,
        },
      });

      if (!storedToken) {
        throw new AppError('Invalid refresh token', 401);
      }

      if (storedToken.expiresAt < new Date()) {
        throw new AppError('Refresh token expired', 401);
      }

      // 토큰 갱신 (기존 토큰 폐기 + 새 토큰 생성)
      const tokens = await tokenService.refreshTokens(refreshToken, decoded.userId);

      res.json({
        success: true,
        data: { tokens },
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // 해당 리프레시 토큰 폐기
        await this.refreshTokenRepository.update(
          { token: refreshToken, userId: req.user!.id },
          { isRevoked: true }
        );
      }

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      const user = await this.userRepository.findOne({ where: { email } });

      // 보안상 사용자 존재 여부와 관계없이 동일한 응답
      res.json({
        success: true,
        message: 'If the email exists, a reset link will be sent',
      });

      // TODO: 이메일 전송 로직 구현 (user가 존재할 때만)
      if (user) {
        // 비밀번호 재설정 이메일 전송
      }
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: 구현
      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: 구현
      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // Google OAuth - 인증 시작
  googleAuth = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const authUrl = oauthService.getAuthUrl('google');
      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  };

  // Google OAuth - 콜백 처리
  googleCallback = async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { code } = req.query;

      if (!code) {
        return res.redirect(oauthService.getErrorRedirectUrl('missing_code'));
      }

      const { tokens } = await oauthService.handleCallback('google', code as string);
      res.redirect(oauthService.getSuccessRedirectUrl(tokens));
    } catch (error) {
      res.redirect(oauthService.getErrorRedirectUrl());
    }
  };

  // Kakao OAuth - 인증 시작
  kakaoAuth = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const authUrl = oauthService.getAuthUrl('kakao');
      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  };

  // Kakao OAuth - 콜백 처리
  kakaoCallback = async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { code } = req.query;

      if (!code) {
        return res.redirect(oauthService.getErrorRedirectUrl('missing_code'));
      }

      const { tokens } = await oauthService.handleCallback('kakao', code as string);
      res.redirect(oauthService.getSuccessRedirectUrl(tokens));
    } catch (error) {
      res.redirect(oauthService.getErrorRedirectUrl());
    }
  };
}
