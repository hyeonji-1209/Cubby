import { apiClient } from './client';
import type { ApiResponse, SubGroup, SubGroupRequest, RequestStatus } from '@/types';

export const subGroupApi = {
  // 소모임 목록 조회 (계층 구조)
  getList: async (groupId: string, parentSubGroupId?: string): Promise<ApiResponse<SubGroup[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/subgroups`, {
      params: parentSubGroupId ? { parentSubGroupId } : undefined,
    });
    return response.data;
  },

  // 소모임 생성 요청
  requestCreate: async (
    groupId: string,
    data: {
      name: string;
      description?: string;
      parentSubGroupId?: string;
    }
  ): Promise<ApiResponse<SubGroup | SubGroupRequest>> => {
    const response = await apiClient.post(`/groups/${groupId}/subgroups`, data);
    return response.data;
  },

  // 소모임 상세 조회
  getById: async (groupId: string, subGroupId: string): Promise<ApiResponse<SubGroup>> => {
    const response = await apiClient.get(`/groups/${groupId}/subgroups/${subGroupId}`);
    return response.data;
  },

  // 소모임 수정
  update: async (
    groupId: string,
    subGroupId: string,
    data: Partial<Pick<SubGroup, 'name' | 'description' | 'coverImage' | 'leaderId' | 'classSchedule' | 'lessonRoomId'>>
  ): Promise<ApiResponse<SubGroup>> => {
    const response = await apiClient.patch(`/groups/${groupId}/subgroups/${subGroupId}`, data);
    return response.data;
  },

  // 소모임 삭제
  delete: async (groupId: string, subGroupId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/groups/${groupId}/subgroups/${subGroupId}`);
    return response.data;
  },

  // === 승인 요청 관련 ===

  // 요청 목록 조회
  getRequests: async (groupId: string, status?: RequestStatus): Promise<ApiResponse<SubGroupRequest[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/subgroup-requests`, {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  // 요청 승인
  approveRequest: async (groupId: string, requestId: string): Promise<ApiResponse<SubGroup>> => {
    const response = await apiClient.post(`/groups/${groupId}/subgroup-requests/${requestId}/approve`);
    return response.data;
  },

  // 요청 거절
  rejectRequest: async (groupId: string, requestId: string, reason?: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post(`/groups/${groupId}/subgroup-requests/${requestId}/reject`, { reason });
    return response.data;
  },
};
