import { create } from 'zustand';
import { groupApi, subGroupApi, userApi } from '@/api';
import type { Group, SubGroup, SubGroupRequest, GroupMember, GroupType, JoinGroupResponse, ChildInfo } from '@/types';

interface GroupState {
  // 내 모임 목록
  myGroups: Group[];
  myGroupsLoading: boolean;

  // 현재 선택된 모임
  currentGroup: Group | null;
  currentGroupLoading: boolean;

  // 소모임 목록
  subGroups: SubGroup[];
  subGroupsLoading: boolean;

  // 소모임 요청 목록
  subGroupRequests: SubGroupRequest[];

  // 멤버 목록
  members: GroupMember[];
  membersLoading: boolean;

  // Actions
  fetchMyGroups: () => Promise<void>;
  fetchGroup: (groupId: string) => Promise<void>;
  createGroup: (data: {
    name: string;
    description?: string;
    type: GroupType;
    icon?: string;
    color?: string;
    logoImage?: string;
    // 학원(education) 타입 전용
    hasClasses?: boolean;
    hasPracticeRooms?: boolean;
    allowGuardians?: boolean;
    hasAttendance?: boolean; // 출석 기능 사용 여부
    hasMultipleInstructors?: boolean; // 다중 강사 모드
    practiceRoomSettings?: {
      openTime: string;
      closeTime: string;
      slotMinutes: 30 | 60;
      maxHoursPerDay: number;
    };
  }) => Promise<Group>;
  joinGroup: (
    inviteCode: string,
    options?: { isGuardian?: boolean; isInstructor?: boolean; childInfo?: ChildInfo[]; positionId?: string }
  ) => Promise<JoinGroupResponse>;
  leaveGroup: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;

  // 소모임
  fetchSubGroups: (groupId: string, parentSubGroupId?: string) => Promise<void>;
  createSubGroup: (groupId: string, data: { name: string; description?: string; parentSubGroupId?: string }) => Promise<SubGroup | SubGroupRequest>;

  // 승인 요청
  fetchSubGroupRequests: (groupId: string) => Promise<void>;
  approveRequest: (groupId: string, requestId: string) => Promise<void>;
  rejectRequest: (groupId: string, requestId: string, reason?: string) => Promise<void>;

  // 멤버
  fetchMembers: (groupId: string) => Promise<void>;

  // 초기화
  clearCurrentGroup: () => void;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  myGroups: [],
  myGroupsLoading: false,
  currentGroup: null,
  currentGroupLoading: false,
  subGroups: [],
  subGroupsLoading: false,
  subGroupRequests: [],
  members: [],
  membersLoading: false,

  fetchMyGroups: async () => {
    set({ myGroupsLoading: true });
    try {
      const response = await userApi.getMyGroups();
      set({ myGroups: response.data, myGroupsLoading: false });
    } catch (error) {
      set({ myGroupsLoading: false });
      throw error;
    }
  },

  fetchGroup: async (groupId: string) => {
    set({ currentGroupLoading: true });
    try {
      const response = await groupApi.getById(groupId);
      set({ currentGroup: response.data, currentGroupLoading: false });
    } catch (error) {
      set({ currentGroupLoading: false });
      throw error;
    }
  },

  createGroup: async (data) => {
    const response = await groupApi.create(data);
    const newGroup = response.data;
    set((state) => ({ myGroups: [...state.myGroups, newGroup] }));
    return newGroup;
  },

  joinGroup: async (inviteCode, options) => {
    const response = await groupApi.joinByInviteCode(inviteCode, options);
    // fetchMyGroups는 InviteModal에서 처리
    return response.data;
  },

  leaveGroup: async (groupId: string) => {
    await groupApi.leave(groupId);
    set((state) => ({
      myGroups: state.myGroups.filter((g) => g.id !== groupId),
      currentGroup: state.currentGroup?.id === groupId ? null : state.currentGroup,
    }));
  },

  deleteGroup: async (groupId: string) => {
    await groupApi.delete(groupId);
    set((state) => ({
      myGroups: state.myGroups.filter((g) => g.id !== groupId),
      currentGroup: state.currentGroup?.id === groupId ? null : state.currentGroup,
    }));
  },

  fetchSubGroups: async (groupId: string, parentSubGroupId?: string) => {
    set({ subGroupsLoading: true });
    try {
      const response = await subGroupApi.getList(groupId, parentSubGroupId);
      set({ subGroups: response.data, subGroupsLoading: false });
    } catch (error) {
      set({ subGroupsLoading: false });
      throw error;
    }
  },

  createSubGroup: async (groupId, data) => {
    const response = await subGroupApi.requestCreate(groupId, data);
    // 바로 생성된 경우 목록 갱신
    if ('depth' in response.data) {
      await get().fetchSubGroups(groupId, data.parentSubGroupId);
    }
    return response.data;
  },

  fetchSubGroupRequests: async (groupId: string) => {
    const response = await subGroupApi.getRequests(groupId, 'pending');
    set({ subGroupRequests: response.data });
  },

  approveRequest: async (groupId: string, requestId: string) => {
    await subGroupApi.approveRequest(groupId, requestId);
    set((state) => ({
      subGroupRequests: state.subGroupRequests.filter((r) => r.id !== requestId),
    }));
    await get().fetchSubGroups(groupId);
  },

  rejectRequest: async (groupId: string, requestId: string, reason?: string) => {
    await subGroupApi.rejectRequest(groupId, requestId, reason);
    set((state) => ({
      subGroupRequests: state.subGroupRequests.filter((r) => r.id !== requestId),
    }));
  },

  fetchMembers: async (groupId: string) => {
    set({ membersLoading: true });
    try {
      const response = await groupApi.getMembers(groupId);
      set({ members: response.data, membersLoading: false });
    } catch (error) {
      set({ membersLoading: false });
      throw error;
    }
  },

  clearCurrentGroup: () => {
    set({
      currentGroup: null,
      subGroups: [],
      subGroupRequests: [],
      members: [],
    });
  },
}));
