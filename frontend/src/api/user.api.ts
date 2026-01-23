import { apiClient } from './client';
import type { ApiResponse, User, Group, Subscription, SubscriptionPlan } from '@/types';

export const userApi = {
  // 내 정보 조회
  getMe: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  // 내 정보 수정
  updateMe: async (data: Partial<Pick<User, 'name' | 'phone' | 'profileImage'>>): Promise<ApiResponse<User>> => {
    const response = await apiClient.patch('/users/me', data);
    return response.data;
  },

  // 비밀번호 변경
  updatePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.patch('/users/me/password', { currentPassword, newPassword });
    return response.data;
  },

  // 회원 탈퇴
  deleteMe: async (password: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete('/users/me', { data: { password } });
    return response.data;
  },

  // 내가 속한 모임 목록
  getMyGroups: async (): Promise<ApiResponse<Group[]>> => {
    const response = await apiClient.get('/users/me/groups');
    return response.data;
  },

  // 내 구독 정보 조회
  getMySubscription: async (): Promise<ApiResponse<{ plan: SubscriptionPlan; subscription: Subscription | null }>> => {
    const response = await apiClient.get('/users/me/subscription');
    return response.data;
  },

  // 디바이스 토큰 등록 (FCM 푸시)
  registerDeviceToken: async (token: string, platform: 'ios' | 'android' | 'web', deviceName?: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/users/me/device-token', { token, platform, deviceName });
    return response.data;
  },

  // 디바이스 토큰 삭제
  removeDeviceToken: async (token: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete('/users/me/device-token', { data: { token } });
    return response.data;
  },
};
