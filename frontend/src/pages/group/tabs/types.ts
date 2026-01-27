import type { Group, GroupMember, SubGroup, SubGroupRequest } from '@/types';
import type { FavoriteLocation } from '@/api';

export type TabType = 'home' | 'members' | 'subgroups' | 'practicerooms' | 'announcements' | 'schedules' | 'settings';

export interface BaseTabProps {
  groupId: string;
  currentGroup: Group;
  isOwner: boolean;
  isAdmin: boolean;
  myRole?: string;
}

// HomeTab - uses store for announcements/schedules
export interface HomeTabProps extends BaseTabProps {
  homeCalendarDate: Date | null | [Date | null, Date | null];
  setHomeCalendarDate: (date: Date | null | [Date | null, Date | null]) => void;
  selectedDate: Date | null;
  regeneratingCode: boolean;
  onCopyInviteCode: () => void;
  onRegenerateInviteCode: () => void;
  onNavigateToTab: (tab: TabType) => void;
  formatExpiryDate: (dateStr?: string) => string;
  isInviteCodeExpired: () => boolean;
}

// MembersTab - minimal props (members are fetched externally)
export interface MembersTabProps extends BaseTabProps {
  members: GroupMember[];
  membersLoading: boolean;
  memberSearch: string;
  setMemberSearch: (search: string) => void;
  filteredMembers: GroupMember[];
  onOpenMemberModal: (member: GroupMember) => void;
}

// SubGroupsTab - minimal props
export interface SubGroupsTabProps extends BaseTabProps {
  subGroups: SubGroup[];
  subGroupsLoading: boolean;
  subGroupRequests: SubGroupRequest[];
  onShowSubGroupModal: () => void;
  onApproveRequest: (request: SubGroupRequest) => void;
  onRejectRequest: (request: SubGroupRequest) => void;
}

// AnnouncementsTab - uses groupDetailStore
export interface AnnouncementsTabProps {
  groupId: string;
  isAdmin: boolean;
  canWriteAnnouncement: boolean;
  subGroupRequests: SubGroupRequest[];
  onApproveRequest: (request: SubGroupRequest) => void;
  onRejectRequest: (request: SubGroupRequest) => void;
}

// SchedulesTab - uses groupDetailStore
export interface SchedulesTabProps {
  groupId: string;
  isAdmin: boolean;
  canWriteSchedule: boolean;
  userId?: string;
  favoriteLocations: FavoriteLocation[];
}

// PracticeRoomsTab - uses groupDetailStore
export interface PracticeRoomsTabProps {
  groupId: string;
  currentGroup: Group;
  isAdmin: boolean;
}

// SettingsTab - uses groupDetailStore for practice rooms/locations
export interface SettingsTabProps extends BaseTabProps {
  members: GroupMember[];
  memberCount: number;
  onShowLeaveModal: () => void;
  onShowDeleteModal: () => void;
}

// Legacy interfaces for backward compatibility during refactoring
export interface AttachmentFile {
  id: string;
  file?: File;
  name?: string;
  url?: string;
  preview?: string;
  type: 'image' | 'file' | string;
}
