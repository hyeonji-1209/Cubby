import { apiClient } from './client';
import type { ApiResponse, Schedule, ScheduleFormData } from '@/types';

export const scheduleApi = {
  // 모임의 일정 목록 조회
  getByGroup: async (
    groupId: string,
    params?: { subGroupId?: string; startDate?: string; endDate?: string }
  ): Promise<ApiResponse<Schedule[]>> => {
    const response = await apiClient.get(`/schedules/group/${groupId}`, { params });
    return response.data;
  },

  // 일정 상세 조회
  getById: async (scheduleId: string): Promise<ApiResponse<Schedule>> => {
    const response = await apiClient.get(`/schedules/${scheduleId}`);
    return response.data;
  },

  // 일정 생성
  create: async (groupId: string, data: ScheduleFormData): Promise<ApiResponse<Schedule>> => {
    const response = await apiClient.post(`/schedules/group/${groupId}`, data);
    return response.data;
  },

  // 일정 수정
  update: async (scheduleId: string, data: Partial<ScheduleFormData>): Promise<ApiResponse<Schedule>> => {
    const response = await apiClient.patch(`/schedules/${scheduleId}`, data);
    return response.data;
  },

  // 일정 삭제
  delete: async (scheduleId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/schedules/${scheduleId}`);
    return response.data;
  },

  // 내 모든 일정 조회
  getMySchedules: async (params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<Schedule[]>> => {
    const response = await apiClient.get('/schedules/my/all', { params });
    return response.data;
  },
};
