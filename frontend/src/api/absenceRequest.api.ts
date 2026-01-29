import { apiClient } from './client';
import type { ApiResponse } from '@/types';

// 결석 유형
export type AbsenceType = 'personal' | 'sick' | 'family' | 'travel' | 'exam' | 'other';

// 결석 신청 상태
export type AbsenceRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

// 결석 신청
export interface AbsenceRequest {
  id: string;
  absenceDate: string;
  absenceType: AbsenceType;
  reason?: string;
  status: AbsenceRequestStatus;
  responseNote?: string;
  scheduleId?: string;
  scheduleTitle?: string;
  subGroupId?: string;
  subGroupName?: string;
  studentId?: string;
  studentName?: string;
  requester?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  student?: {
    id: string;
    name: string;
    profileImage?: string;
  } | null;
  createdAt: string;
  respondedAt?: string;
}

// 결석 신청 생성 DTO
export interface CreateAbsenceRequestDto {
  absenceDate: string;
  absenceType?: AbsenceType;
  reason?: string;
  scheduleId?: string;
  subGroupId?: string;
  studentId?: string; // 보호자가 대신 신청 시
}

export const absenceRequestApi = {
  // 결석 신청 생성
  create: async (
    groupId: string,
    data: CreateAbsenceRequestDto
  ): Promise<ApiResponse<AbsenceRequest>> => {
    const response = await apiClient.post(`/groups/${groupId}/absence-requests`, data);
    return response.data;
  },

  // 내 결석 신청 목록 조회
  getMyRequests: async (
    groupId: string,
    status?: AbsenceRequestStatus
  ): Promise<ApiResponse<AbsenceRequest[]>> => {
    const params = status ? { status } : {};
    const response = await apiClient.get(`/groups/${groupId}/absence-requests/my`, { params });
    return response.data;
  },

  // 대기 중인 결석 신청 목록 (관리자)
  getPendingRequests: async (groupId: string): Promise<ApiResponse<AbsenceRequest[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/absence-requests/pending`);
    return response.data;
  },

  // 모든 결석 신청 목록 (관리자)
  getAllRequests: async (
    groupId: string,
    params?: {
      status?: AbsenceRequestStatus;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<ApiResponse<AbsenceRequest[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/absence-requests`, { params });
    return response.data;
  },

  // 결석 신청 승인
  approve: async (
    groupId: string,
    requestId: string,
    note?: string
  ): Promise<ApiResponse<AbsenceRequest>> => {
    const response = await apiClient.post(
      `/groups/${groupId}/absence-requests/${requestId}/approve`,
      { note }
    );
    return response.data;
  },

  // 결석 신청 거절
  reject: async (
    groupId: string,
    requestId: string,
    note?: string
  ): Promise<ApiResponse<AbsenceRequest>> => {
    const response = await apiClient.post(
      `/groups/${groupId}/absence-requests/${requestId}/reject`,
      { note }
    );
    return response.data;
  },

  // 결석 신청 취소
  cancel: async (groupId: string, requestId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post(
      `/groups/${groupId}/absence-requests/${requestId}/cancel`
    );
    return response.data;
  },
};
