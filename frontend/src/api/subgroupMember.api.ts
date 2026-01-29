import { apiClient } from './client';
import type { ApiResponse, SubGroup, ClassSchedule } from '@/types';

export interface InstructorSubGroup {
  id: string;
  name: string;
  description?: string;
  instructorId: string;
  instructor: {
    id: string;
    name: string;
    profileImage?: string;
  } | null;
  memberCount: number;
  createdAt: string;
}

export interface ClassSubGroup {
  id: string;
  name: string;
  description?: string;
  instructorId?: string;
  instructor: {
    id: string;
    name: string;
    profileImage?: string;
  } | null;
  classSchedule?: ClassSchedule[];
  lessonRoomId?: string;
  lessonRoom: {
    id: string;
    name: string;
    capacity: number;
  } | null;
  memberCount: number;
  createdAt: string;
}

export interface CreateClassSubGroupDto {
  name?: string;
  description?: string;
  instructorId?: string;
  classSchedule?: ClassSchedule[];
  lessonRoomId?: string;
}

export interface UpdateClassSubGroupDto {
  name?: string;
  description?: string;
  instructorId?: string;
  classSchedule?: ClassSchedule[];
  lessonRoomId?: string;
}

export interface SubGroupMemberInfo {
  id: string;
  subGroupId: string;
  groupMemberId: string;
  role: 'leader' | 'member';
  joinedAt: string;
  groupMember: {
    id: string;
    userId: string;
    nickname?: string;
    lessonSchedule?: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      lessonRoomId?: string;
      lessonRoomName?: string;
    }[];
    user: {
      id: string;
      name: string;
      email: string;
      profileImage?: string;
    };
  } | null;
}

export interface UnassignedStudent {
  id: string; // GroupMember ID
  userId: string;
  nickname?: string;
  lessonSchedule?: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    lessonRoomId?: string;
    lessonRoomName?: string;
  }[];
  user: {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
}

export interface MemberInstructorSubGroup {
  subGroupId: string;
  subGroupName: string;
  instructorId: string;
  instructor: {
    id: string;
    name: string;
  } | null;
}

export const subgroupMemberApi = {
  // 강사 소그룹 생성
  createInstructorSubGroup: async (
    groupId: string,
    data: { instructorId: string; name?: string; description?: string }
  ): Promise<ApiResponse<SubGroup>> => {
    const response = await apiClient.post(`/groups/${groupId}/instructor-subgroups`, data);
    return response.data;
  },

  // 강사 소그룹 목록 조회
  getInstructorSubGroups: async (groupId: string): Promise<ApiResponse<InstructorSubGroup[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/instructor-subgroups`);
    return response.data;
  },

  // 미배정 학생 목록 조회
  getUnassignedStudents: async (groupId: string): Promise<ApiResponse<UnassignedStudent[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/unassigned-students`);
    return response.data;
  },

  // 소그룹 멤버 목록 조회
  getSubGroupMembers: async (
    groupId: string,
    subGroupId: string
  ): Promise<ApiResponse<SubGroupMemberInfo[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/subgroups/${subGroupId}/members`);
    return response.data;
  },

  // 소그룹에 학생 배정
  assignStudent: async (
    groupId: string,
    subGroupId: string,
    memberId: string
  ): Promise<ApiResponse<SubGroupMemberInfo>> => {
    const response = await apiClient.post(`/groups/${groupId}/subgroups/${subGroupId}/members`, {
      memberId,
    });
    return response.data;
  },

  // 소그룹에서 학생 제거
  removeStudent: async (
    groupId: string,
    subGroupId: string,
    memberId: string
  ): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(
      `/groups/${groupId}/subgroups/${subGroupId}/members/${memberId}`
    );
    return response.data;
  },

  // 특정 멤버의 강사 소그룹 조회
  getMemberInstructorSubGroup: async (
    groupId: string,
    memberId: string
  ): Promise<ApiResponse<MemberInstructorSubGroup | null>> => {
    const response = await apiClient.get(
      `/groups/${groupId}/members/${memberId}/instructor-subgroup`
    );
    return response.data;
  },

  // ===== 반(CLASS) 소그룹 관리 (그룹 수업용) =====

  // 반 생성
  createClassSubGroup: async (
    groupId: string,
    data: CreateClassSubGroupDto
  ): Promise<ApiResponse<SubGroup>> => {
    const response = await apiClient.post(`/groups/${groupId}/class-subgroups`, data);
    return response.data;
  },

  // 반 목록 조회
  getClassSubGroups: async (groupId: string): Promise<ApiResponse<ClassSubGroup[]>> => {
    const response = await apiClient.get(`/groups/${groupId}/class-subgroups`);
    return response.data;
  },

  // 반 수정
  updateClassSubGroup: async (
    groupId: string,
    subGroupId: string,
    data: UpdateClassSubGroupDto
  ): Promise<ApiResponse<SubGroup>> => {
    const response = await apiClient.put(`/groups/${groupId}/class-subgroups/${subGroupId}`, data);
    return response.data;
  },
};
