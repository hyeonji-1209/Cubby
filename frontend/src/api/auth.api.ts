import { apiClient } from './client';
import { User } from '@/types';

interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (
    email: string,
    password: string,
    name: string,
    phone: string,
    emailVerificationToken: string
  ): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      name,
      phone,
      emailVerificationToken,
    });
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  refresh: async (refreshToken: string): Promise<{ tokens: { accessToken: string; refreshToken: string } }> => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data.data;
  },

  getMe: async (): Promise<{ success: boolean; data: User }> => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },
};
