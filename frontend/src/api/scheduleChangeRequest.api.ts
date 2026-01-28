import { apiClient } from './client';
import type { ApiResponse, ScheduleChangeRequest } from '@/types';

export interface CreateChangeRequestDto {
  requestedStartAt?: string;
  requestedEndAt?: string;
  reason: string;
}

export const scheduleChangeRequestApi = {
  // 일정 변경 요청 생성
  create: async (
    groupId: string,
    scheduleId: string,
    data: CreateChangeRequestDto
  ): Promise<ApiResponse<ScheduleChangeRequest>> => {
    const response = await apiClient.post(
      `/groups/${groupId}/schedules/${scheduleId}/change-requests`,
      data
    );
    return response.data;
  },

  // 내 요청 목록
  getMyRequests: async (groupId: string): Promise<ApiResponse<ScheduleChangeRequest[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/schedule-change-requests/me`);
    return response.data;
  },

  // 대기 중인 요청 목록 (관리자)
  getPendingRequests: async (groupId: string): Promise<ApiResponse<ScheduleChangeRequest[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/schedule-change-requests/pending`);
    return response.data;
  },

  // 요청 승인 (관리자)
  approve: async (
    groupId: string,
    requestId: string,
    note?: string
  ): Promise<ApiResponse<ScheduleChangeRequest>> => {
    const response = await apiClient.post(
      `/groups/${groupId}/schedule-change-requests/${requestId}/approve`,
      { note }
    );
    return response.data;
  },

  // 요청 거절 (관리자)
  reject: async (
    groupId: string,
    requestId: string,
    note?: string
  ): Promise<ApiResponse<ScheduleChangeRequest>> => {
    const response = await apiClient.post(
      `/groups/${groupId}/schedule-change-requests/${requestId}/reject`,
      { note }
    );
    return response.data;
  },

  // 요청 취소
  cancel: async (groupId: string, requestId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(
      `/groups/${groupId}/schedule-change-requests/${requestId}`
    );
    return response.data;
  },
};
