import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export interface LessonRoom {
  id: string;
  groupId: string;
  name: string;
  order: number;
  isActive: boolean;
  capacity: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonRoomDto {
  name: string;
  capacity?: number;
  color?: string;
}

export interface UpdateLessonRoomDto {
  name?: string;
  capacity?: number;
  color?: string;
  isActive?: boolean;
}

export const lessonRoomApi = {
  // 레슨실 목록 조회
  getByGroup: async (groupId: string): Promise<ApiResponse<LessonRoom[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/lesson-rooms`);
    return response.data;
  },

  // 레슨실 생성
  create: async (groupId: string, data: CreateLessonRoomDto): Promise<ApiResponse<LessonRoom>> => {
    const response = await apiClient.post(`/groups/${groupId}/lesson-rooms`, data);
    return response.data;
  },

  // 레슨실 수정
  update: async (
    groupId: string,
    roomId: string,
    data: UpdateLessonRoomDto
  ): Promise<ApiResponse<LessonRoom>> => {
    const response = await apiClient.put(`/groups/${groupId}/lesson-rooms/${roomId}`, data);
    return response.data;
  },

  // 레슨실 삭제
  delete: async (groupId: string, roomId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/groups/${groupId}/lesson-rooms/${roomId}`);
    return response.data;
  },

  // 레슨실 순서 변경
  reorder: async (groupId: string, roomIds: string[]): Promise<ApiResponse<null>> => {
    const response = await apiClient.put(`/groups/${groupId}/lesson-rooms/reorder`, { roomIds });
    return response.data;
  },
};
