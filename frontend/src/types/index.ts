// User
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  profileImage?: string;
  role: 'admin' | 'user';
  provider: 'local' | 'google' | 'kakao';
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

// Group
export type GroupType = 'education' | 'religious' | 'community' | 'company' | 'couple';
export type GroupStatus = 'active' | 'inactive' | 'suspended';

export interface PracticeRoomSettings {
  openTime: string; // "09:00"
  closeTime: string; // "22:00"
  slotMinutes: 30 | 60;
  maxHoursPerDay: number; // 1-8
}

export interface PracticeRoom {
  id: string;
  groupId: string;
  name: string;
  order: number;
  isActive: boolean;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface PracticeRoomReservation {
  id: string;
  roomId: string;
  roomName?: string;
  userId: string;
  userName?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  note?: string;
  isOwn?: boolean;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  type: GroupType;
  icon?: string; // emoji or icon name
  color?: string; // group color
  logoImage?: string;
  coverImage?: string;
  inviteCode: string;
  inviteCodeExpiresAt?: string;
  settings?: Record<string, unknown>;
  enabledFeatures?: string[];
  status: GroupStatus;
  // 학원 타입 전용 설정
  hasClasses?: boolean; // 반 운영 여부
  hasPracticeRooms?: boolean; // 연습실 운영 여부
  allowGuardians?: boolean; // 보호자 허용 여부
  practiceRoomSettings?: PracticeRoomSettings;
  ownerId: string;
  owner?: User;
  memberCount?: number;
  subGroupCount?: number;
  myRole?: MemberRole;
  myMembershipId?: string; // 그룹 생성 시 반환
  joinedAt?: string;
  createdAt: string;
}

// Member
export type MemberRole = 'owner' | 'admin' | 'leader' | 'member' | 'guardian';
export type MemberStatus = 'active' | 'pending' | 'suspended';

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: MemberRole;
  status: MemberStatus;
  nickname?: string;
  title?: string; // 직책/직분 (본인이 설정)
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
}

// SubGroup
export type SubGroupStatus = 'active' | 'inactive' | 'pending';

export interface SubGroup {
  id: string;
  parentGroupId: string;
  parentSubGroupId?: string;
  depth: number;
  name: string;
  description?: string;
  coverImage?: string;
  leaderId?: string;
  status: SubGroupStatus;
  childSubGroupCount?: number;
  leader?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  createdAt: string;
}

// SubGroup Request
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface SubGroupRequest {
  id: string;
  groupId: string;
  parentSubGroupId?: string;
  name: string;
  description?: string;
  status: RequestStatus;
  rejectionReason?: string;
  createdAt: string;
  requester: {
    id: string;
    name: string;
    profileImage?: string;
  };
  parentSubGroup?: {
    id: string;
    name: string;
  };
}

// Notification
export type NotificationType =
  | 'subgroup_request'
  | 'subgroup_approved'
  | 'subgroup_rejected'
  | 'subgroup_created_notify'
  | 'member_joined'
  | 'member_left'
  | 'role_changed'
  | 'new_announcement'
  | 'new_schedule'
  | 'schedule_reminder'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  groupId?: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// Announcement
export interface Announcement {
  id: string;
  groupId: string;
  subGroupId?: string;
  authorId?: string;
  title: string;
  content?: string;           // 상세 조회에서만 포함
  isPinned: boolean;
  isPublished?: boolean;
  isAdminOnly: boolean;
  attachments?: { name: string; url: string; type: string }[]; // 상세 조회에서만 포함
  hasAttachments?: boolean;   // 목록 조회에서 첨부파일 유무
  viewCount?: number;         // 조회수
  likeCount?: number;         // 좋아요 수 (상세 조회)
  isLiked?: boolean;          // 내가 좋아요 했는지 (상세 조회)
  author: {
    id: string;
    name: string;
    profileImage?: string;
    title?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface AnnouncementFormData {
  title: string;
  content: string;
  subGroupId?: string;
  isPinned?: boolean;
  isAdminOnly?: boolean;
  attachments?: { name: string; url: string; type: string }[];
}

// Comment (공지사항 댓글)
export interface Comment {
  id: string;
  content: string;
  parentId?: string | null;
  author: {
    id: string;
    name: string;
    profileImage?: string;
    title?: string; // 직책/직분
  };
  likeCount: number;
  isLiked: boolean;
  replies?: Comment[];
  createdAt: string;
  updatedAt?: string;
}

// Schedule
export interface ScheduleLocation {
  name: string;
  address: string;
  detail?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
}

export interface Schedule {
  id: string;
  groupId: string;
  subGroupId?: string;
  authorId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  location?: string;           // 표시용 (호환성)
  locationData?: ScheduleLocation; // 상세 장소 정보
  color?: string;
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
    count?: number;
  };
  author: {
    id: string;
    name: string;
    profileImage?: string;
  };
  group?: {
    id: string;
    name: string;
    type: GroupType;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface ScheduleFormData {
  title: string;
  description?: string;
  subGroupId?: string;
  startAt: string;
  endAt: string;
  isAllDay?: boolean;
  location?: string;
  locationData?: ScheduleLocation;
  color?: string;
  recurrence?: Schedule['recurrence'];
}

// Position (직책)
export interface PositionPermissions {
  canManageMembers?: boolean;
  canManageSubGroups?: boolean;
  canManageAnnouncements?: boolean;
  canManageSchedules?: boolean;
  canManageFinance?: boolean;
  canApproveRequests?: boolean;
  customPermissions?: string[];
}

export interface Position {
  id: string;
  groupId: string;
  subGroupId?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder: number;
  permissions?: PositionPermissions;
  isActive: boolean;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PositionFormData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  subGroupId?: string;
  permissions?: PositionPermissions;
}

export interface MemberPosition {
  id: string;
  memberId: string;
  positionId: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  position: Position;
  createdAt: string;
}

export interface PositionMember {
  memberId: string;
  userId: string;
  name: string;
  profileImage?: string;
  startDate?: string;
  endDate?: string;
  assignedAt: string;
}

// Subscription
export type SubscriptionPlan = 'basic' | 'standard' | 'premium';

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'expired' | 'cancelled';
  startedAt?: string;
  expiresAt?: string;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
  };
}
