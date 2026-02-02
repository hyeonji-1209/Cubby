import { create } from 'zustand';
import { Group, GroupMember } from '@/types';

interface GroupsState {
  groups: Group[];
  currentGroup: Group | null;
  currentMembership: GroupMember | null;
  isLoading: boolean;

  setGroups: (groups: Group[]) => void;
  setCurrentGroup: (group: Group | null) => void;
  setCurrentMembership: (membership: GroupMember | null) => void;
  setLoading: (loading: boolean) => void;
  addGroup: (group: Group) => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  removeGroup: (id: string) => void;
}

export const useGroupsStore = create<GroupsState>((set) => ({
  groups: [],
  currentGroup: null,
  currentMembership: null,
  isLoading: true,

  setGroups: (groups) => set({ groups }),
  setCurrentGroup: (currentGroup) => set({ currentGroup }),
  setCurrentMembership: (currentMembership) => set({ currentMembership }),
  setLoading: (isLoading) => set({ isLoading }),

  addGroup: (group) =>
    set((state) => ({ groups: [...state.groups, group] })),

  updateGroup: (id, updates) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === id ? { ...g, ...updates } : g
      ),
      currentGroup:
        state.currentGroup?.id === id
          ? { ...state.currentGroup, ...updates }
          : state.currentGroup,
    })),

  removeGroup: (id) =>
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
      currentGroup: state.currentGroup?.id === id ? null : state.currentGroup,
    })),
}));
