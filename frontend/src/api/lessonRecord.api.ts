import { apiClient } from './client';
import type { ApiResponse, Attendance, LessonSchedule } from '@/types';

export interface LessonRecord {
  id: string;
  groupId: string;
  memberId: string;
  lessonDate: string; // YYYY-MM-DD
  lessonStartTime: string; // HH:mm
  lessonEndTime: string; // HH:mm
  previousContent?: string; // 지난 수업 내용
  currentContent?: string; // 이번 수업 내용
  homework?: string; // 과제
  note?: string; // 비고
  attendanceId?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodayLessonResponse {
  record: LessonRecord;
  attendance: Attendance | null;
  lessonSchedule: LessonSchedule;
}

export interface LessonRecordListResponse {
  items: LessonRecord[];
  total: number;
  hasMore: boolean;
}

// 학생용 응답 (note 필드 제외)
export interface StudentLessonRecord {
  id: string;
  groupId: string;
  memberId: string;
  lessonDate: string;
  lessonStartTime: string;
  lessonEndTime: string;
  previousContent?: string;
  currentContent?: string;
  homework?: string;
  // note 필드 없음
  createdAt: string;
  updatedAt: string;
}

export interface StudentLessonListResponse {
  items: StudentLessonRecord[];
  attendanceList: Attendance[];
  total: number;
  hasMore: boolean;
}

export const lessonRecordApi = {
  // 내 수업 기록 조회 (학생용 - note 필드 제외)
  getMyLessons: async (
    groupId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<ApiResponse<StudentLessonListResponse>> => {
    const response = await apiClient.get(`/groups/${groupId}/my-lessons`, { params });
    return response.data;
  },

  // 특정 멤버의 수업 기록 목록 (관리자용)
  getByMember: async (
    groupId: string,
    memberId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<ApiResponse<LessonRecordListResponse>> => {
    const response = await apiClient.get(`/groups/${groupId}/members/${memberId}/lessons`, { params });
    return response.data;
  },

  // 오늘 수업 기록 조회 또는 생성
  getTodayOrCreate: async (groupId: string, memberId: string): Promise<ApiResponse<TodayLessonResponse>> => {
    const response = await apiClient.get(`/groups/${groupId}/members/${memberId}/lessons/today`);
    return response.data;
  },

  // 특정 수업 기록 조회
  getOne: async (groupId: string, memberId: string, recordId: string): Promise<ApiResponse<LessonRecord>> => {
    const response = await apiClient.get(`/groups/${groupId}/members/${memberId}/lessons/${recordId}`);
    return response.data;
  },

  // 수업 기록 저장 (생성/수정)
  save: async (
    groupId: string,
    memberId: string,
    data: {
      lessonDate: string;
      lessonStartTime: string;
      lessonEndTime: string;
      previousContent?: string;
      currentContent?: string;
      homework?: string;
      note?: string;
    }
  ): Promise<ApiResponse<LessonRecord>> => {
    const response = await apiClient.post(`/groups/${groupId}/members/${memberId}/lessons`, data);
    return response.data;
  },

  // 수업 기록 삭제
  delete: async (groupId: string, memberId: string, recordId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/groups/${groupId}/members/${memberId}/lessons/${recordId}`);
    return response.data;
  },
};
