import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - 토큰 추가
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 회원가입/비로그인 API는 토큰을 보내지 않음
    const skipAuthPaths = ['/verification/signup/', '/auth/register', '/auth/login', '/auth/refresh'];
    const shouldSkipAuth = skipAuthPaths.some((path) => config.url?.includes(path));

    if (shouldSkipAuth) {
      // 인증 불필요한 요청은 Authorization 헤더 명시적 제거
      delete config.headers.Authorization;
    } else {
      const tokens = useAuthStore.getState().tokens;
      if (tokens?.accessToken && tokens.accessToken.length > 0) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - 토큰 갱신
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 비로그인 API 에러는 토큰 갱신 시도하지 않음
    const skipRefreshPaths = ['/verification/signup/', '/auth/register', '/auth/login', '/auth/refresh'];
    const shouldSkipRefresh = skipRefreshPaths.some((path) => originalRequest.url?.includes(path));

    if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
      originalRequest._retry = true;

      const { tokens, _hasHydrated } = useAuthStore.getState();

      // 아직 hydration이 완료되지 않았으면 로그아웃하지 않음
      if (!_hasHydrated) {
        return Promise.reject(error);
      }

      if (tokens?.refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken: tokens.refreshToken,
          });

          const newTokens = response.data.data.tokens;
          useAuthStore.getState().setTokens(newTokens.accessToken, newTokens.refreshToken);

          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return apiClient(originalRequest);
        } catch {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
