import { apiClient } from './client';
import type { ApiResponse, Attendance, QRToken, AttendanceStatus } from '@/types';

export const attendanceApi = {
  // QR 토큰 생성 (관리자) - 일반 스케줄용
  generateQRToken: async (groupId: string, scheduleId: string): Promise<ApiResponse<QRToken>> => {
    const response = await apiClient.post(`/groups/${groupId}/schedules/${scheduleId}/attendance/qr`);
    return response.data;
  },

  // QR 토큰 생성 (관리자) - 1:1 수업용
  generateLessonQRToken: async (groupId: string, memberId: string): Promise<ApiResponse<LessonQRToken>> => {
    const response = await apiClient.post(`/groups/${groupId}/members/${memberId}/lesson-qr`);
    return response.data;
  },

  // QR로 출석 체크
  checkInByQR: async (token: string): Promise<ApiResponse<Attendance>> => {
    const response = await apiClient.post('/attendance/qr-checkin', { token });
    return response.data;
  },

  // 수동 출석 체크 (관리자)
  checkInManual: async (
    groupId: string,
    scheduleId: string,
    data: { userId: string; status?: AttendanceStatus; note?: string }
  ): Promise<ApiResponse<Attendance>> => {
    const response = await apiClient.post(`/groups/${groupId}/schedules/${scheduleId}/attendance`, data);
    return response.data;
  },

  // 일정별 출석 목록
  getBySchedule: async (groupId: string, scheduleId: string): Promise<ApiResponse<Attendance[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/schedules/${scheduleId}/attendance`);
    return response.data;
  },

  // 내 출석 상태 (특정 일정)
  getMyAttendance: async (groupId: string, scheduleId: string): Promise<ApiResponse<Attendance | null>> => {
    const response = await apiClient.get(`/groups/${groupId}/schedules/${scheduleId}/attendance/me`);
    return response.data;
  },

  // 내 모든 출석 기록 (그룹 내)
  getMyAllAttendances: async (groupId: string): Promise<ApiResponse<Attendance[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/attendance/me`);
    return response.data;
  },

  // 조퇴 처리 (관리자)
  markEarlyLeave: async (groupId: string, attendanceId: string, note?: string): Promise<ApiResponse<Attendance>> => {
    const response = await apiClient.patch(`/groups/${groupId}/attendance/${attendanceId}/early-leave`, { note });
    return response.data;
  },

  // 출석 삭제 (관리자)
  delete: async (groupId: string, attendanceId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/groups/${groupId}/attendance/${attendanceId}`);
    return response.data;
  },

  // 특정 멤버의 출석 통계 조회 (관리자)
  getMemberStats: async (groupId: string, userId: string): Promise<ApiResponse<MemberAttendanceStats>> => {
    const response = await apiClient.get(`/groups/${groupId}/members/${userId}/attendance-stats`);
    return response.data;
  },
};

export interface LessonQRToken {
  token: string;
  expiresAt: string;
  memberName: string;
  lessonTime: string;
}

export interface MemberAttendanceStats {
  stats: {
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    earlyLeave: number;
  };
  recentAttendances: Array<{
    id: string;
    scheduleId: string;
    status: AttendanceStatus;
    checkedAt: string;
  }>;
}
