import { apiClient } from './client';
import type { ApiResponse, Group, GroupMember, GroupType, Announcement, Schedule, JoinGroupResponse, ChildInfo, LessonSchedule } from '@/types';

// Overview API 응답 타입
export interface GroupOverviewResponse {
  group: Group;
  announcements: Announcement[];
  schedules: Schedule[];
}

export const groupApi = {
  // 모임 생성
  create: async (data: {
    name: string;
    description?: string;
    type: GroupType;
    icon?: string;
    color?: string;
    logoImage?: string;
    coverImage?: string;
    // 학원(education) 타입 전용
    hasClasses?: boolean;
    hasPracticeRooms?: boolean;
    allowGuardians?: boolean;
    hasAttendance?: boolean;
    hasMultipleInstructors?: boolean;
    practiceRoomSettings?: {
      openTime: string;
      closeTime: string;
      slotMinutes: 30 | 60;
      maxHoursPerDay: number;
    };
  }): Promise<ApiResponse<Group>> => {
    const response = await apiClient.post('/groups', data);
    return response.data;
  },

  // 초대 코드 검증 (가입 전 그룹 정보 확인)
  validateInviteCode: async (inviteCode: string): Promise<ApiResponse<JoinGroupResponse>> => {
    const response = await apiClient.post('/groups/validate-invite', { inviteCode });
    return response.data;
  },

  // 초대 코드로 가입
  joinByInviteCode: async (
    inviteCode: string,
    options?: {
      isGuardian?: boolean;
      childInfo?: ChildInfo[];
      positionId?: string;
    }
  ): Promise<ApiResponse<JoinGroupResponse>> => {
    const response = await apiClient.post('/groups/join', {
      inviteCode,
      ...options,
    });
    return response.data;
  },

  // 모임 상세 조회
  getById: async (groupId: string): Promise<ApiResponse<Group>> => {
    const response = await apiClient.get(`/groups/${groupId}`);
    return response.data;
  },

  // 모임 홈 개요 조회 (그룹 정보 + 최근 공지사항 + 이번 달 일정)
  getOverview: async (groupId: string): Promise<ApiResponse<GroupOverviewResponse>> => {
    const response = await apiClient.get(`/groups/${groupId}/overview`);
    return response.data;
  },

  // 모임 수정
  update: async (
    groupId: string,
    data: Partial<Pick<Group, 'name' | 'description' | 'icon' | 'color' | 'logoImage' | 'coverImage' | 'settings' | 'enabledFeatures' | 'practiceRoomSettings' | 'hasPracticeRooms' | 'hasClasses' | 'allowGuardians' | 'hasAttendance' | 'hasMultipleInstructors' | 'requiresApproval' | 'operatingHours' | 'allowSameDayChange'>>
  ): Promise<ApiResponse<Group>> => {
    const response = await apiClient.patch(`/groups/${groupId}`, data);
    return response.data;
  },

  // 모임 삭제
  delete: async (groupId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/groups/${groupId}`);
    return response.data;
  },

  // 초대 코드 재생성
  regenerateInviteCode: async (groupId: string): Promise<ApiResponse<{ inviteCode: string }>> => {
    const response = await apiClient.post(`/groups/${groupId}/invite-code`);
    return response.data;
  },

  // 멤버 목록 조회
  getMembers: async (groupId: string, params?: { role?: string; status?: string }): Promise<ApiResponse<GroupMember[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/members`, { params });
    return response.data;
  },

  // 멤버 역할 변경
  updateMemberRole: async (groupId: string, memberId: string, role: string): Promise<ApiResponse<GroupMember>> => {
    const response = await apiClient.patch(`/groups/${groupId}/members/${memberId}`, { role });
    return response.data;
  },

  // 멤버 제거
  removeMember: async (groupId: string, memberId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/groups/${groupId}/members/${memberId}`);
    return response.data;
  },

  // 모임 나가기
  leave: async (groupId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post(`/groups/${groupId}/leave`);
    return response.data;
  },

  // 본인 프로필 수정 (닉네임, 직책)
  updateMyProfile: async (
    groupId: string,
    data: { nickname?: string; title?: string; positionId?: string }
  ): Promise<ApiResponse<{ nickname?: string; title?: string; positionId?: string }>> => {
    const response = await apiClient.patch(`/groups/${groupId}/my-profile`, data);
    return response.data;
  },

  // 멤버 수업 정보 업데이트 (1:1 교육용)
  updateMemberLessonInfo: async (
    groupId: string,
    memberId: string,
    data: { lessonSchedule?: LessonSchedule[]; paymentDueDay?: number | null; instructorId?: string | null }
  ): Promise<ApiResponse<{ id: string; lessonSchedule?: LessonSchedule[]; paymentDueDay?: number; instructorId?: string }>> => {
    const response = await apiClient.patch(`/groups/${groupId}/members/${memberId}/lesson-info`, data);
    return response.data;
  },

  // 강사 목록 조회 (다중 강사 모드용)
  getInstructors: async (groupId: string): Promise<ApiResponse<GroupMember[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/instructors`);
    return response.data;
  },

  // 가입 대기 멤버 목록 조회
  getPendingMembers: async (groupId: string): Promise<ApiResponse<GroupMember[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/pending-members`);
    return response.data;
  },

  // 멤버 승인 (1:1 교육 그룹용)
  approveMember: async (
    groupId: string,
    memberId: string,
    data?: { instructorId?: string; lessonSchedule?: LessonSchedule[]; paymentDueDay?: number }
  ): Promise<ApiResponse<GroupMember>> => {
    const response = await apiClient.post(`/groups/${groupId}/members/${memberId}/approve`, data || {});
    return response.data;
  },

  // 멤버 거부
  rejectMember: async (groupId: string, memberId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post(`/groups/${groupId}/members/${memberId}/reject`);
    return response.data;
  },
};
