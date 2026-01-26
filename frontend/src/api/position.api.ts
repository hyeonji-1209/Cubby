import { apiClient } from './client';
import type { ApiResponse, Position, PositionFormData, PositionMember } from '@/types';

export const positionApi = {
  // 직책 목록 조회
  getList: async (
    groupId: string,
    subGroupId?: string
  ): Promise<ApiResponse<Position[]>> => {
    const response = await apiClient.get(`/positions/${groupId}/positions`, {
      params: subGroupId ? { subGroupId } : undefined,
    });
    return response.data;
  },

  // 직책 생성
  create: async (
    groupId: string,
    data: PositionFormData
  ): Promise<ApiResponse<Position>> => {
    const response = await apiClient.post(`/positions/${groupId}/positions`, data);
    return response.data;
  },

  // 직책 수정
  update: async (
    groupId: string,
    positionId: string,
    data: Partial<PositionFormData & { sortOrder?: number }>
  ): Promise<ApiResponse<Position>> => {
    const response = await apiClient.patch(
      `/positions/${groupId}/positions/${positionId}`,
      data
    );
    return response.data;
  },

  // 직책 삭제
  delete: async (groupId: string, positionId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(
      `/positions/${groupId}/positions/${positionId}`
    );
    return response.data;
  },

  // 직책별 멤버 목록 조회
  getPositionMembers: async (
    groupId: string,
    positionId: string
  ): Promise<ApiResponse<PositionMember[]>> => {
    const response = await apiClient.get(
      `/positions/${groupId}/positions/${positionId}/members`
    );
    return response.data;
  },

  // 멤버의 직책 목록 조회
  getMemberPositions: async (
    groupId: string,
    memberId: string
  ): Promise<ApiResponse<Position[]>> => {
    const response = await apiClient.get(
      `/positions/${groupId}/members/${memberId}/positions`
    );
    return response.data;
  },

  // 멤버에게 직책 부여
  assignPosition: async (
    groupId: string,
    memberId: string,
    data: { positionId: string; startDate?: string; endDate?: string }
  ): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.post(
      `/positions/${groupId}/members/${memberId}/positions`,
      data
    );
    return response.data;
  },

  // 멤버 직책 해제
  removePosition: async (
    groupId: string,
    memberId: string,
    positionId: string
  ): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(
      `/positions/${groupId}/members/${memberId}/positions/${positionId}`
    );
    return response.data;
  },
};
