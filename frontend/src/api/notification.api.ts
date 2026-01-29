import { apiClient } from './client';
import type { ApiResponse, Notification } from '@/types';

interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
  pagination: {
    limit: number;
    offset: number;
  };
}

export const notificationApi = {
  // 알림 목록 조회
  getList: async (params?: { limit?: number; offset?: number; unreadOnly?: boolean }): Promise<ApiResponse<NotificationListResponse>> => {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  // 읽지 않은 알림 개수
  getUnreadCount: async (): Promise<ApiResponse<{ unreadCount: number }>> => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  // 알림 읽음 처리
  markAsRead: async (notificationId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post(`/notifications/${notificationId}/read`);
    return response.data;
  },

  // 모든 알림 읽음 처리
  markAllAsRead: async (): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/notifications/read-all');
    return response.data;
  },

  // 알림 삭제
  delete: async (notificationId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  // 모든 알림 삭제
  deleteAll: async (): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete('/notifications/all');
    return response.data;
  },
};
