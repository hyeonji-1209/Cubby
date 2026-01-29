import { apiClient } from './client';
import type { ApiResponse, PracticeRoomReservation } from '@/types';

export interface LessonByDate {
  memberId: string;
  memberName: string;
  startTime: string;
  endTime: string;
  lessonRoomName?: string;
}

export const practiceRoomReservationApi = {
  // 특정 날짜의 예약 목록 조회
  getByDate: async (groupId: string, date: string): Promise<ApiResponse<PracticeRoomReservation[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/practice-room-reservations/date/${date}`);
    return response.data;
  },

  // 특정 날짜의 수업 목록 조회 (연습실 예약 시 참고용)
  getLessonsByDate: async (groupId: string, date: string): Promise<ApiResponse<LessonByDate[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/practice-room-reservations/lessons/${date}`);
    return response.data;
  },

  // 내 예약 목록 조회
  getMyReservations: async (groupId: string): Promise<ApiResponse<PracticeRoomReservation[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/practice-room-reservations/my`);
    return response.data;
  },

  // 예약 생성
  create: async (
    groupId: string,
    data: {
      roomId: string;
      date: string;
      startTime: string;
      endTime: string;
      note?: string;
    }
  ): Promise<ApiResponse<PracticeRoomReservation>> => {
    const response = await apiClient.post(`/groups/${groupId}/practice-room-reservations`, data);
    return response.data;
  },

  // 예약 취소
  cancel: async (groupId: string, reservationId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/groups/${groupId}/practice-room-reservations/${reservationId}`);
    return response.data;
  },
};
