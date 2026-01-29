import axios from 'axios';
import { AppDataSource } from '../config/database';
import { User, AuthProvider, UserStatus } from '../models/User';
import { config } from '../config';
import { OAUTH_ENDPOINTS, OAuthProvider } from '../config/oauth.constants';
import { tokenService } from './token.service';
import { AppError } from '../middlewares/error.middleware';

export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
}

class OAuthService {
  private userRepository = AppDataSource.getRepository(User);

  /**
   * OAuth 인증 URL 생성
   */
  getAuthUrl(provider: OAuthProvider): string {
    const providerConfig = config.oauth[provider];
    const endpoints = OAUTH_ENDPOINTS[provider];

    if (!providerConfig.clientId) {
      throw new AppError(`${provider} OAuth is not configured`, 500);
    }

    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: providerConfig.callbackUrl,
      response_type: 'code',
    });

    if (provider === 'google') {
      params.append('scope', OAUTH_ENDPOINTS.google.scope);
      params.append('access_type', 'offline');
    }

    return `${endpoints.auth}?${params.toString()}`;
  }

  /**
   * Authorization Code를 Access Token으로 교환
   */
  async exchangeCodeForToken(provider: OAuthProvider, code: string): Promise<string> {
    const providerConfig = config.oauth[provider];
    const endpoints = OAUTH_ENDPOINTS[provider];

    if (provider === 'google') {
      const response = await axios.post(endpoints.token, {
        code,
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret,
        redirect_uri: providerConfig.callbackUrl,
        grant_type: 'authorization_code',
      });
      return response.data.access_token;
    }

    if (provider === 'kakao') {
      const response = await axios.post(
        endpoints.token,
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: providerConfig.clientId,
          client_secret: providerConfig.clientSecret || '',
          redirect_uri: providerConfig.callbackUrl,
          code,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );
      return response.data.access_token;
    }

    throw new AppError(`Unsupported OAuth provider: ${provider}`, 400);
  }

  /**
   * Access Token으로 사용자 정보 조회
   */
  async getUserInfo(provider: OAuthProvider, accessToken: string): Promise<OAuthUserInfo> {
    const endpoints = OAUTH_ENDPOINTS[provider];

    const response = await axios.get(endpoints.userInfo, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (provider === 'google') {
      const { id, email, name, picture } = response.data;
      return { id, email, name, profileImage: picture };
    }

    if (provider === 'kakao') {
      const { id, kakao_account } = response.data;
      const email = kakao_account?.email;
      const name = kakao_account?.profile?.nickname || `카카오사용자${id}`;
      const profileImage = kakao_account?.profile?.profile_image_url;

      if (!email) {
        throw new AppError('Email permission is required', 400);
      }

      return { id: String(id), email, name, profileImage };
    }

    throw new AppError(`Unsupported OAuth provider: ${provider}`, 400);
  }

  /**
   * 사용자 조회 또는 생성
   */
  async findOrCreateUser(
    provider: OAuthProvider,
    userInfo: OAuthUserInfo
  ): Promise<User> {
    const authProvider = provider === 'google' ? AuthProvider.GOOGLE : AuthProvider.KAKAO;

    // 기존 사용자 조회
    let user = await this.userRepository.findOne({
      where: [
        { provider: authProvider, providerId: userInfo.id },
        { email: userInfo.email },
      ],
    });

    if (user) {
      // 기존 사용자가 다른 provider로 가입된 경우 계정 연동
      if (user.provider !== authProvider || user.providerId !== userInfo.id) {
        user.provider = authProvider;
        user.providerId = userInfo.id;
        if (userInfo.profileImage && !user.profileImage) {
          user.profileImage = userInfo.profileImage;
        }
        await this.userRepository.save(user);
      }
    } else {
      // 새 사용자 생성
      user = this.userRepository.create({
        email: userInfo.email,
        name: userInfo.name,
        profileImage: userInfo.profileImage,
        provider: authProvider,
        providerId: userInfo.id,
        emailVerified: true,
        status: UserStatus.ACTIVE,
      });
      await this.userRepository.save(user);
    }

    return user;
  }

  /**
   * OAuth 콜백 전체 처리 (토큰 교환 → 사용자 정보 → 사용자 생성/조회 → 앱 토큰 발급)
   */
  async handleCallback(
    provider: OAuthProvider,
    code: string
  ): Promise<{ user: User; tokens: OAuthTokens }> {
    // 1. 토큰 교환
    const accessToken = await this.exchangeCodeForToken(provider, code);

    // 2. 사용자 정보 조회
    const userInfo = await this.getUserInfo(provider, accessToken);

    // 3. 사용자 생성/조회
    const user = await this.findOrCreateUser(provider, userInfo);

    // 4. 앱 토큰 생성
    const tokens = await tokenService.createAndSaveTokens(user.id);

    return { user, tokens };
  }

  /**
   * 프론트엔드 리다이렉트 URL 생성
   */
  getSuccessRedirectUrl(tokens: OAuthTokens): string {
    return `${config.frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
  }

  getErrorRedirectUrl(error: string = 'oauth_failed'): string {
    return `${config.frontendUrl}/auth/callback?error=${error}`;
  }
}

export const oauthService = new OAuthService();
