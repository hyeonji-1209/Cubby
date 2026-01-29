/**
 * OAuth Provider Endpoints
 */
export const OAUTH_ENDPOINTS = {
  google: {
    auth: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    userInfo: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'email profile',
  },
  kakao: {
    auth: 'https://kauth.kakao.com/oauth/authorize',
    token: 'https://kauth.kakao.com/oauth/token',
    userInfo: 'https://kapi.kakao.com/v2/user/me',
  },
} as const;

export type OAuthProvider = keyof typeof OAUTH_ENDPOINTS;
