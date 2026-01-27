import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { VerificationCode, VerificationType } from '../models/VerificationCode';
import { AppError } from '../middlewares/error.middleware';
import { LessThan } from 'typeorm';
import crypto from 'crypto';
import { sendVerificationSms } from '../utils/sms.util';
import { sendVerificationEmail } from '../utils/email.util';

// 6자리 랜덤 코드 생성
const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 인증 완료 토큰 생성 (회원가입용)
const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// 만료 시간 (5분)
const CODE_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
// 인증 완료 토큰 만료 시간 (10분)
const TOKEN_EXPIRY_MINUTES = 10;

export class VerificationController {
  private userRepository = AppDataSource.getRepository(User);
  private codeRepository = AppDataSource.getRepository(VerificationCode);

  // 이메일 인증 코드 발송
  sendEmailCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const userId = req.user!.id;

      if (!email) {
        throw new AppError('Email is required', 400);
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError('Invalid email format', 400);
      }

      // 이미 다른 사용자가 사용 중인 이메일인지 확인
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });
      if (existingUser && existingUser.id !== userId) {
        throw new AppError('Email is already in use', 400);
      }

      // 기존 코드 삭제
      await this.codeRepository.delete({
        userId,
        type: VerificationType.EMAIL,
      });

      // 새 코드 생성
      const code = generateCode();
      const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

      const verificationCode = this.codeRepository.create({
        userId,
        type: VerificationType.EMAIL,
        target: email,
        code,
        expiresAt,
      });
      await this.codeRepository.save(verificationCode);

      // 이메일 발송
      const emailSent = await sendVerificationEmail(email, code);
      if (!emailSent) {
        console.error(`Failed to send email to ${email}`);
      }

      res.json({
        success: true,
        message: 'Verification code sent to email',
        // 개발용: 프로덕션에서는 제거
        data: process.env.NODE_ENV !== 'production' ? { code } : undefined,
      });
    } catch (error) {
      next(error);
    }
  };

  // 휴대폰 인증 코드 발송
  sendPhoneCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone } = req.body;
      const userId = req.user!.id;

      if (!phone) {
        throw new AppError('Phone number is required', 400);
      }

      // 전화번호 형식 검증 (한국 번호)
      const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
      const cleanPhone = phone.replace(/-/g, '');
      if (!phoneRegex.test(phone) && !/^01[0-9]{8,9}$/.test(cleanPhone)) {
        throw new AppError('Invalid phone number format', 400);
      }

      // 이미 다른 사용자가 사용 중인 번호인지 확인
      const existingUser = await this.userRepository.findOne({
        where: { phone: cleanPhone },
      });
      if (existingUser && existingUser.id !== userId) {
        throw new AppError('Phone number is already in use', 400);
      }

      // 기존 코드 삭제
      await this.codeRepository.delete({
        userId,
        type: VerificationType.PHONE,
      });

      // 새 코드 생성
      const code = generateCode();
      const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

      const verificationCode = this.codeRepository.create({
        userId,
        type: VerificationType.PHONE,
        target: cleanPhone,
        code,
        expiresAt,
      });
      await this.codeRepository.save(verificationCode);

      // SMS 발송
      const smsSent = await sendVerificationSms(cleanPhone, code);
      if (!smsSent) {
        console.error(`Failed to send SMS to ${cleanPhone}`);
      }

      res.json({
        success: true,
        message: 'Verification code sent to phone',
        // 개발용: 프로덕션에서는 제거
        ...(process.env.NODE_ENV !== 'production' && { code }),
      });
    } catch (error) {
      next(error);
    }
  };

  // 이메일 인증 확인
  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code } = req.body;
      const userId = req.user!.id;

      if (!email || !code) {
        throw new AppError('Email and code are required', 400);
      }

      const verificationCode = await this.codeRepository.findOne({
        where: {
          userId,
          type: VerificationType.EMAIL,
          target: email,
        },
      });

      if (!verificationCode) {
        throw new AppError('Verification code not found. Please request a new code.', 400);
      }

      // 만료 확인
      if (new Date() > verificationCode.expiresAt) {
        await this.codeRepository.delete(verificationCode.id);
        throw new AppError('Verification code has expired', 400);
      }

      // 시도 횟수 확인
      if (verificationCode.attempts >= MAX_ATTEMPTS) {
        await this.codeRepository.delete(verificationCode.id);
        throw new AppError('Too many attempts. Please request a new code.', 400);
      }

      // 코드 확인
      if (verificationCode.code !== code) {
        verificationCode.attempts += 1;
        await this.codeRepository.save(verificationCode);
        throw new AppError('Invalid verification code', 400);
      }

      // 사용자 이메일 업데이트
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        user.email = email;
        user.emailVerified = true;
        await this.userRepository.save(user);
      }

      // 인증 코드 삭제
      await this.codeRepository.delete(verificationCode.id);

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: { email, emailVerified: true },
      });
    } catch (error) {
      next(error);
    }
  };

  // 휴대폰 인증 확인
  verifyPhone = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, code } = req.body;
      const userId = req.user!.id;

      if (!phone || !code) {
        throw new AppError('Phone and code are required', 400);
      }

      const cleanPhone = phone.replace(/-/g, '');

      const verificationCode = await this.codeRepository.findOne({
        where: {
          userId,
          type: VerificationType.PHONE,
          target: cleanPhone,
        },
      });

      if (!verificationCode) {
        throw new AppError('Verification code not found. Please request a new code.', 400);
      }

      // 만료 확인
      if (new Date() > verificationCode.expiresAt) {
        await this.codeRepository.delete(verificationCode.id);
        throw new AppError('Verification code has expired', 400);
      }

      // 시도 횟수 확인
      if (verificationCode.attempts >= MAX_ATTEMPTS) {
        await this.codeRepository.delete(verificationCode.id);
        throw new AppError('Too many attempts. Please request a new code.', 400);
      }

      // 코드 확인
      if (verificationCode.code !== code) {
        verificationCode.attempts += 1;
        await this.codeRepository.save(verificationCode);
        throw new AppError('Invalid verification code', 400);
      }

      // 사용자 전화번호 업데이트
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        user.phone = cleanPhone;
        user.phoneVerified = true;
        await this.userRepository.save(user);
      }

      // 인증 코드 삭제
      await this.codeRepository.delete(verificationCode.id);

      res.json({
        success: true,
        message: 'Phone verified successfully',
        data: { phone: cleanPhone, phoneVerified: true },
      });
    } catch (error) {
      next(error);
    }
  };

  // 만료된 코드 정리 (스케줄러용)
  cleanupExpiredCodes = async () => {
    await this.codeRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  };

  // ============ 회원가입용 (인증 없이 접근 가능) ============

  // ============ 회원가입용 이메일 인증 (비로그인 상태) ============

  // 회원가입용 이메일 인증 코드 발송
  sendEmailCodeForSignup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError('Email is required', 400);
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError('Invalid email format', 400);
      }

      // 이미 사용 중인 이메일인지 확인
      const existingUser = await this.userRepository.findOne({
        where: { email, emailVerified: true },
      });
      if (existingUser) {
        throw new AppError('Email is already registered', 400);
      }

      // 기존 코드 삭제 (같은 이메일로 발송된 코드)
      await this.codeRepository.delete({
        type: VerificationType.EMAIL,
        target: email,
        userId: 'signup',
      });

      // 새 코드 생성
      const code = generateCode();
      const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

      const verificationCode = this.codeRepository.create({
        userId: 'signup',
        type: VerificationType.EMAIL,
        target: email,
        code,
        expiresAt,
      });
      await this.codeRepository.save(verificationCode);

      // 이메일 발송
      const emailSent = await sendVerificationEmail(email, code);
      if (!emailSent) {
        console.error(`Failed to send email to ${email}`);
      }

      res.json({
        success: true,
        message: 'Verification code sent to email',
        // 개발용: 프로덕션에서는 제거
        data: process.env.NODE_ENV !== 'production' ? { code } : undefined,
      });
    } catch (error) {
      next(error);
    }
  };

  // 회원가입용 이메일 인증 확인
  verifyEmailForSignup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        throw new AppError('Email and code are required', 400);
      }

      const verificationCode = await this.codeRepository.findOne({
        where: {
          userId: 'signup',
          type: VerificationType.EMAIL,
          target: email,
        },
      });

      if (!verificationCode) {
        throw new AppError('Verification code not found. Please request a new code.', 400);
      }

      // 만료 확인
      if (new Date() > verificationCode.expiresAt) {
        await this.codeRepository.delete(verificationCode.id);
        throw new AppError('Verification code has expired', 400);
      }

      // 시도 횟수 확인
      if (verificationCode.attempts >= MAX_ATTEMPTS) {
        await this.codeRepository.delete(verificationCode.id);
        throw new AppError('Too many attempts. Please request a new code.', 400);
      }

      // 코드 확인
      if (verificationCode.code !== code) {
        verificationCode.attempts += 1;
        await this.codeRepository.save(verificationCode);
        throw new AppError('Invalid verification code', 400);
      }

      // 인증 완료 토큰 생성
      const verificationToken = generateVerificationToken();

      // 코드를 토큰으로 업데이트 (재사용 방지)
      verificationCode.code = verificationToken;
      verificationCode.verified = true;
      verificationCode.expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);
      await this.codeRepository.save(verificationCode);

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: {
          email,
          verificationToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 회원가입 시 이메일 인증 토큰 검증 (내부 사용)
  static verifyEmailToken = async (email: string, token: string): Promise<boolean> => {
    const codeRepository = AppDataSource.getRepository(VerificationCode);

    const verificationCode = await codeRepository.findOne({
      where: {
        userId: 'signup',
        type: VerificationType.EMAIL,
        target: email,
        code: token,
        verified: true,
      },
    });

    if (!verificationCode) {
      return false;
    }

    // 만료 확인
    if (new Date() > verificationCode.expiresAt) {
      await codeRepository.delete(verificationCode.id);
      return false;
    }

    // 토큰 사용 후 삭제
    await codeRepository.delete(verificationCode.id);
    return true;
  };
}
