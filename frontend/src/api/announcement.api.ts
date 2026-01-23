import { apiClient } from './client';
import type { ApiResponse, Announcement, AnnouncementFormData } from '@/types';

interface AnnouncementListResponse {
  success: boolean;
  data: Announcement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const announcementApi = {
  // 모임의 공지사항 목록 조회
  getByGroup: async (
    groupId: string,
    params?: { subGroupId?: string; page?: number; limit?: number }
  ): Promise<AnnouncementListResponse> => {
    const response = await apiClient.get(`/announcements/group/${groupId}`, { params });
    return response.data;
  },

  // 공지사항 상세 조회
  getById: async (announcementId: string): Promise<ApiResponse<Announcement>> => {
    const response = await apiClient.get(`/announcements/${announcementId}`);
    return response.data;
  },

  // 공지사항 작성
  create: async (groupId: string, data: AnnouncementFormData): Promise<ApiResponse<Announcement>> => {
    const response = await apiClient.post(`/announcements/group/${groupId}`, data);
    return response.data;
  },

  // 공지사항 수정
  update: async (
    announcementId: string,
    data: Partial<AnnouncementFormData & { isPublished?: boolean }>
  ): Promise<ApiResponse<Announcement>> => {
    const response = await apiClient.patch(`/announcements/${announcementId}`, data);
    return response.data;
  },

  // 공지사항 삭제
  delete: async (announcementId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/announcements/${announcementId}`);
    return response.data;
  },

  // 공지사항 고정/해제 토글
  togglePin: async (announcementId: string): Promise<ApiResponse<{ isPinned: boolean }>> => {
    const response = await apiClient.patch(`/announcements/${announcementId}/pin`);
    return response.data;
  },
};
