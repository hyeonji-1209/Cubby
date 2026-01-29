import { AppDataSource } from '../config/database';
import { RefreshToken } from '../models/RefreshToken';
import { generateTokens as generateJwtTokens } from '../utils/jwt.util';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

class TokenService {
  private refreshTokenRepository = AppDataSource.getRepository(RefreshToken);

  /**
   * 새 토큰 쌍을 생성하고 리프레시 토큰을 DB에 저장
   */
  async createAndSaveTokens(userId: string): Promise<Tokens> {
    const tokens = generateJwtTokens(userId);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return tokens;
  }

  /**
   * 특정 사용자의 모든 리프레시 토큰 삭제 (로그아웃)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.delete({ userId });
  }

  /**
   * 특정 리프레시 토큰 삭제
   */
  async revokeToken(token: string): Promise<void> {
    await this.refreshTokenRepository.delete({ token });
  }

  /**
   * 리프레시 토큰 유효성 확인
   */
  async findValidToken(token: string): Promise<RefreshToken | null> {
    return this.refreshTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });
  }

  /**
   * 토큰 갱신: 기존 토큰 삭제 후 새 토큰 생성
   */
  async refreshTokens(oldToken: string, userId: string): Promise<Tokens> {
    // 기존 토큰 삭제
    await this.revokeToken(oldToken);

    // 새 토큰 생성 및 저장
    return this.createAndSaveTokens(userId);
  }
}

export const tokenService = new TokenService();
