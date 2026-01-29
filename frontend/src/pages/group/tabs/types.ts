import type { Group, GroupMember, SubGroup, SubGroupRequest } from '@/types';
import type { FavoriteLocation, InstructorSubGroup } from '@/api';

export type TabType = 'lesson' | 'home' | 'members' | 'subgroups' | 'practicerooms' | 'lessonrooms' | 'announcements' | 'schedules' | 'settings';

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
  hasAttendance?: boolean; // 출석 기능 활성화 여부
}

// MembersTab - minimal props (members are fetched externally)
export interface MembersTabProps extends BaseTabProps {
  members: GroupMember[];
  membersLoading: boolean;
  memberSearch: string;
  setMemberSearch: (search: string) => void;
  filteredMembers: GroupMember[];
  onOpenMemberModal: (member: GroupMember) => void;
  // 출석 QR 관련
  hasAttendance?: boolean;
  onShowAttendanceQR?: (member: GroupMember) => void;
  getMemberNextSchedule?: (memberId: string) => { id: string; title: string; startAt: Date; endAt: Date } | null;
  // 1:1 수업 관련
  isOneOnOneEducation?: boolean;
  onOpenLessonPanel?: (member: GroupMember) => void;
  // 다중 강사 모드 필터링
  hasMultipleInstructors?: boolean;
  instructorSubGroups?: InstructorSubGroup[];
  instructorFilter?: string; // 'all' | 'unassigned' | subGroupId
  setInstructorFilter?: (filter: string) => void;
  // 가입 승인 관련
  pendingMembers?: GroupMember[];
  pendingMembersLoading?: boolean;
  onApproveMember?: (member: GroupMember) => void;
  onRejectMember?: (member: GroupMember) => void;
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
  groupType?: string; // 그룹 타입 (휴일 관리 표시용)
  isAdmin: boolean;
  canWriteSchedule: boolean;
  userId?: string;
  favoriteLocations: FavoriteLocation[];
  hasAttendance?: boolean; // 출석 기능 활성화 여부
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

// LessonTab - for 1:1 education active lesson
export interface LessonTabProps {
  groupId: string;
  member: GroupMember;
  onEarlyLeave?: (attendanceId: string) => Promise<void>;
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
