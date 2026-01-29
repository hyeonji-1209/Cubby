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

// 예약 관련 타입
export type LessonReservationStatus = 'confirmed' | 'cancelled' | 'completed';

export interface LessonRoomReservation {
  id: string;
  roomId: string;
  roomName?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: LessonReservationStatus;
  note?: string;
  userId: string;
  userName?: string;
  studentId?: string;
  studentName?: string;
  isOwn?: boolean;
  canCancel?: boolean;
}

export interface CreateReservationDto {
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  studentId?: string;
  note?: string;
}

export interface AvailableSlotsResponse {
  operatingHours: {
    openTime: string;
    closeTime: string;
  };
  reservations: {
    startTime: string;
    endTime: string;
  }[];
  regularSchedules: {
    startTime: string;
    endTime: string;
    name: string;
  }[];
}

export const lessonRoomApi = {
  // 수업실 목록 조회
  getByGroup: async (groupId: string): Promise<ApiResponse<LessonRoom[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/lesson-rooms`);
    return response.data;
  },

  // 수업실 생성
  create: async (groupId: string, data: CreateLessonRoomDto): Promise<ApiResponse<LessonRoom>> => {
    const response = await apiClient.post(`/groups/${groupId}/lesson-rooms`, data);
    return response.data;
  },

  // 수업실 수정
  update: async (
    groupId: string,
    roomId: string,
    data: UpdateLessonRoomDto
  ): Promise<ApiResponse<LessonRoom>> => {
    const response = await apiClient.put(`/groups/${groupId}/lesson-rooms/${roomId}`, data);
    return response.data;
  },

  // 수업실 삭제
  delete: async (groupId: string, roomId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/groups/${groupId}/lesson-rooms/${roomId}`);
    return response.data;
  },

  // 수업실 순서 변경
  reorder: async (groupId: string, roomIds: string[]): Promise<ApiResponse<null>> => {
    const response = await apiClient.put(`/groups/${groupId}/lesson-rooms/reorder`, { roomIds });
    return response.data;
  },

  // ===== 예약 관련 API =====

  // 예약 목록 조회 (날짜 범위)
  getReservations: async (
    groupId: string,
    params?: { startDate?: string; endDate?: string; roomId?: string }
  ): Promise<ApiResponse<LessonRoomReservation[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/lesson-room-reservations`, { params });
    return response.data;
  },

  // 내 예약 목록 조회
  getMyReservations: async (groupId: string): Promise<ApiResponse<LessonRoomReservation[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/lesson-room-reservations/my`);
    return response.data;
  },

  // 특정 수업실의 예약 가능 시간 조회
  getAvailableSlots: async (
    groupId: string,
    roomId: string,
    date: string
  ): Promise<ApiResponse<AvailableSlotsResponse>> => {
    const response = await apiClient.get(`/groups/${groupId}/lesson-rooms/${roomId}/available-slots`, {
      params: { date },
    });
    return response.data;
  },

  // 예약 생성
  createReservation: async (
    groupId: string,
    data: CreateReservationDto
  ): Promise<ApiResponse<LessonRoomReservation>> => {
    const response = await apiClient.post(`/groups/${groupId}/lesson-room-reservations`, data);
    return response.data;
  },

  // 예약 취소
  cancelReservation: async (groupId: string, reservationId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/groups/${groupId}/lesson-room-reservations/${reservationId}`);
    return response.data;
  },
};
