import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { User, AuthProvider, UserStatus } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.util';
import { AppError } from '../middlewares/error.middleware';
import { config } from '../config';
import axios from 'axios';
import { VerificationController } from './verification.controller';

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

      // 토큰 생성
      const tokens = generateTokens(user.id);

      // 리프레시 토큰 저장
      const refreshTokenEntity = this.refreshTokenRepository.create({
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일
      });
      await this.refreshTokenRepository.save(refreshTokenEntity);

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

      // 토큰 생성
      const tokens = generateTokens(user.id);

      // 리프레시 토큰 저장
      const refreshTokenEntity = this.refreshTokenRepository.create({
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      await this.refreshTokenRepository.save(refreshTokenEntity);

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

      // 기존 토큰 폐기
      storedToken.isRevoked = true;
      await this.refreshTokenRepository.save(storedToken);

      // 새 토큰 생성
      const tokens = generateTokens(decoded.userId);

      // 새 리프레시 토큰 저장
      const newRefreshToken = this.refreshTokenRepository.create({
        userId: decoded.userId,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      await this.refreshTokenRepository.save(newRefreshToken);

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
  googleAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId, callbackUrl } = config.oauth.google;

      if (!clientId) {
        throw new AppError('Google OAuth is not configured', 500);
      }

      const scope = encodeURIComponent('email profile');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=${scope}&access_type=offline`;

      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  };

  // Google OAuth - 콜백 처리
  googleCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.query;

      if (!code) {
        throw new AppError('Authorization code is required', 400);
      }

      const { clientId, clientSecret, callbackUrl } = config.oauth.google;

      // 액세스 토큰 요청
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      });

      const { access_token } = tokenResponse.data;

      // 사용자 정보 요청
      const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const { id: googleId, email, name, picture } = userInfoResponse.data;

      // 사용자 조회 또는 생성
      let user = await this.userRepository.findOne({
        where: [
          { provider: AuthProvider.GOOGLE, providerId: googleId },
          { email },
        ],
      });

      if (user) {
        // 기존 사용자가 다른 provider로 가입된 경우
        if (user.provider !== AuthProvider.GOOGLE && user.providerId !== googleId) {
          // Google 정보로 업데이트 (계정 연동)
          user.provider = AuthProvider.GOOGLE;
          user.providerId = googleId;
          if (picture && !user.profileImage) {
            user.profileImage = picture;
          }
          await this.userRepository.save(user);
        }
      } else {
        // 새 사용자 생성
        user = this.userRepository.create({
          email,
          name,
          profileImage: picture,
          provider: AuthProvider.GOOGLE,
          providerId: googleId,
          emailVerified: true,
          status: UserStatus.ACTIVE,
        });
        await this.userRepository.save(user);
      }

      // 토큰 생성
      const tokens = generateTokens(user.id);

      // 리프레시 토큰 저장
      const refreshTokenEntity = this.refreshTokenRepository.create({
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      await this.refreshTokenRepository.save(refreshTokenEntity);

      // 프론트엔드로 리다이렉트 (토큰 포함)
      const frontendUrl = `${config.frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
      res.redirect(frontendUrl);
    } catch (error) {
      // 오류 시 프론트엔드로 리다이렉트
      const errorUrl = `${config.frontendUrl}/auth/callback?error=oauth_failed`;
      res.redirect(errorUrl);
    }
  };

  // Kakao OAuth - 인증 시작
  kakaoAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId, callbackUrl } = config.oauth.kakao;

      if (!clientId) {
        throw new AppError('Kakao OAuth is not configured', 500);
      }

      const authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code`;

      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  };

  // Kakao OAuth - 콜백 처리
  kakaoCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.query;

      if (!code) {
        throw new AppError('Authorization code is required', 400);
      }

      const { clientId, clientSecret, callbackUrl } = config.oauth.kakao;

      // 액세스 토큰 요청
      const tokenResponse = await axios.post(
        'https://kauth.kakao.com/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret || '',
          redirect_uri: callbackUrl,
          code: code as string,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token } = tokenResponse.data;

      // 사용자 정보 요청
      const userInfoResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const { id: kakaoId, kakao_account } = userInfoResponse.data;
      const email = kakao_account?.email;
      const name = kakao_account?.profile?.nickname || `카카오사용자${kakaoId}`;
      const profileImage = kakao_account?.profile?.profile_image_url;

      if (!email) {
        throw new AppError('Email permission is required', 400);
      }

      // 사용자 조회 또는 생성
      let user = await this.userRepository.findOne({
        where: [
          { provider: AuthProvider.KAKAO, providerId: String(kakaoId) },
          { email },
        ],
      });

      if (user) {
        // 기존 사용자가 다른 provider로 가입된 경우
        if (user.provider !== AuthProvider.KAKAO && user.providerId !== String(kakaoId)) {
          // Kakao 정보로 업데이트 (계정 연동)
          user.provider = AuthProvider.KAKAO;
          user.providerId = String(kakaoId);
          if (profileImage && !user.profileImage) {
            user.profileImage = profileImage;
          }
          await this.userRepository.save(user);
        }
      } else {
        // 새 사용자 생성
        user = this.userRepository.create({
          email,
          name,
          profileImage,
          provider: AuthProvider.KAKAO,
          providerId: String(kakaoId),
          emailVerified: true,
          status: UserStatus.ACTIVE,
        });
        await this.userRepository.save(user);
      }

      // 토큰 생성
      const tokens = generateTokens(user.id);

      // 리프레시 토큰 저장
      const refreshTokenEntity = this.refreshTokenRepository.create({
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      await this.refreshTokenRepository.save(refreshTokenEntity);

      // 프론트엔드로 리다이렉트 (토큰 포함)
      const frontendUrl = `${config.frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
      res.redirect(frontendUrl);
    } catch (error) {
      // 오류 시 프론트엔드로 리다이렉트
      const errorUrl = `${config.frontendUrl}/auth/callback?error=oauth_failed`;
      res.redirect(errorUrl);
    }
  };
}
