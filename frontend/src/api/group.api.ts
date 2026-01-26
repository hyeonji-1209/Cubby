import { apiClient } from './client';
import type { ApiResponse, Group, GroupMember, GroupType } from '@/types';

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
  }): Promise<ApiResponse<Group>> => {
    const response = await apiClient.post('/groups', data);
    return response.data;
  },

  // 초대 코드로 가입
  joinByInviteCode: async (inviteCode: string): Promise<ApiResponse<{ id: string; name: string; type: GroupType }>> => {
    const response = await apiClient.post('/groups/join', { inviteCode });
    return response.data;
  },

  // 모임 상세 조회
  getById: async (groupId: string): Promise<ApiResponse<Group>> => {
    const response = await apiClient.get(`/groups/${groupId}`);
    return response.data;
  },

  // 모임 수정
  update: async (
    groupId: string,
    data: Partial<Pick<Group, 'name' | 'description' | 'icon' | 'color' | 'logoImage' | 'coverImage' | 'settings' | 'enabledFeatures'>>
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
};
