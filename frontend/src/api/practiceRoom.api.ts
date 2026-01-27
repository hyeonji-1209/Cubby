import { apiClient } from './client';
import type { ApiResponse, PracticeRoom } from '@/types';

export const practiceRoomApi = {
  // 연습실 목록 조회
  getList: async (groupId: string): Promise<ApiResponse<PracticeRoom[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/practice-rooms`);
    return response.data;
  },

  // 연습실 생성
  create: async (groupId: string, data: { name: string; capacity?: number }): Promise<ApiResponse<PracticeRoom>> => {
    const response = await apiClient.post(`/groups/${groupId}/practice-rooms`, data);
    return response.data;
  },

  // 연습실 수정
  update: async (
    groupId: string,
    roomId: string,
    data: { name?: string; isActive?: boolean; capacity?: number }
  ): Promise<ApiResponse<PracticeRoom>> => {
    const response = await apiClient.patch(`/groups/${groupId}/practice-rooms/${roomId}`, data);
    return response.data;
  },

  // 연습실 삭제
  delete: async (groupId: string, roomId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/groups/${groupId}/practice-rooms/${roomId}`);
    return response.data;
  },

  // 연습실 순서 변경
  reorder: async (groupId: string, roomIds: string[]): Promise<ApiResponse<null>> => {
    const response = await apiClient.patch(`/groups/${groupId}/practice-rooms/reorder`, { roomIds });
    return response.data;
  },
};
