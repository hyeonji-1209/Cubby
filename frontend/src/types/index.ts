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

// 학원 운영시간
export interface OperatingHours {
  openTime: string; // "09:00"
  closeTime: string; // "22:00"
  closedDays?: number[]; // 휴무일 요일 (0=일요일, 6=토요일)
}

// ============ 타입별 설정 인터페이스 ============

// 학원/교육 타입 설정
export interface EducationSettings {
  hasClasses: boolean;
  hasMultipleInstructors: boolean;
  hasAttendance: boolean;
  hasPracticeRooms: boolean;
  allowGuardians: boolean;
  requiresApproval: boolean;
  allowSameDayChange: boolean;
  operatingHours?: OperatingHours;
  practiceRoomSettings?: PracticeRoomSettings;
}

// 교회/종교 타입 설정
export interface ReligiousSettings {
  denomination?: string;
  hasSmallGroups: boolean;
  worshipTimes?: {
    dayOfWeek: number;
    time: string;
    name: string;
  }[];
}

// 동호회/커뮤니티 타입 설정
export interface CommunitySettings {
  category?: string;
  isPublic: boolean;
  maxMembers?: number;
  hasSchedule: boolean;
  hasDues: boolean;
}

// 회사/팀 타입 설정
export interface CompanySettings {
  department?: string;
  hasProjects: boolean;
  hasAttendance: boolean;
  workingHours?: {
    startTime: string;
    endTime: string;
  };
}

// 연인/커플 타입 설정
export interface CoupleSettings {
  anniversaryDate?: string;
  partnerBirthday?: string;
  myBirthday?: string;
  myRole?: 'boyfriend' | 'girlfriend';
}

// 타입별 설정 유니온
export type GroupTypeSettings =
  | EducationSettings
  | ReligiousSettings
  | CommunitySettings
  | CompanySettings
  | CoupleSettings;

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
  // 타입별 설정 (JSON)
  typeSettings?: GroupTypeSettings;
  // 하위 호환성: 학원 타입 전용 설정 (백엔드 getter로 제공)
  hasClasses?: boolean;
  hasPracticeRooms?: boolean;
  allowGuardians?: boolean;
  hasAttendance?: boolean;
  hasMultipleInstructors?: boolean;
  practiceRoomSettings?: PracticeRoomSettings;
  operatingHours?: OperatingHours;
  requiresApproval?: boolean;
  allowSameDayChange?: boolean;
  ownerId: string;
  owner?: User;
  memberCount?: number;
  subGroupCount?: number;
  myRole?: MemberRole;
  myStatus?: MemberStatus;
  myMembershipId?: string;
  joinedAt?: string;
  createdAt: string;
}

// Member
export type MemberRole = 'owner' | 'admin' | 'leader' | 'member' | 'guardian';
export type MemberStatus = 'active' | 'pending' | 'suspended';

// 보호자의 자녀 정보
export interface ChildInfo {
  name: string;
  birthYear?: number;
  gender?: 'male' | 'female' | 'other';
  note?: string;
}

// 1:1 수업 스케줄 (요일 + 시간 + 수업실)
export interface LessonSchedule {
  dayOfWeek: number;      // 0 = 일요일, 1 = 월요일, ..., 6 = 토요일
  startTime: string;      // "14:00"
  endTime: string;        // "15:00"
  lessonRoomId?: string;  // 배정된 수업실 ID
  lessonRoomName?: string; // 수업실 이름 (표시용)
}

// 반(class) 수업 스케줄 (요일 + 시간)
export interface ClassSchedule {
  dayOfWeek: number;      // 0 = 일요일, 1 = 월요일, ..., 6 = 토요일
  startTime: string;      // "14:00"
  endTime: string;        // "15:00"
}

// ============ 타입별 멤버 데이터 인터페이스 ============

// 학원/교육 타입 - 학생 데이터
export interface EducationStudentData {
  lessonSchedule?: LessonSchedule[];
  paymentDueDay?: number;
  instructorId?: string;
}

// 학원/교육 타입 - 보호자 데이터
export interface EducationGuardianData {
  children: ChildInfo[];
  linkedStudentIds?: string[];
}

// 멤버 타입 데이터 유니온
export type MemberTypeData =
  | EducationStudentData
  | EducationGuardianData;

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: MemberRole;
  status: MemberStatus;
  nickname?: string;
  title?: string; // 직책/직분 (본인이 설정)
  positionId?: string; // 선택한 직책 ID
  // 타입별 데이터 (JSON)
  typeData?: MemberTypeData;
  // 하위 호환성: 개별 필드 (백엔드 getter로 제공)
  childInfo?: ChildInfo[];
  lessonSchedule?: LessonSchedule[];
  paymentDueDay?: number;
  instructorId?: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
}

// 그룹 가입 응답
export interface JoinGroupResponse {
  id: string;
  name: string;
  type: GroupType;
  allowGuardians?: boolean;
  requiresApproval?: boolean;
  isPending?: boolean; // 승인 대기 중인지 여부
  alreadyPending?: boolean; // 이미 대기 중인 멤버십이 있는지 여부
  positions?: { id: string; name: string; color?: string }[];
}

// SubGroup
export type SubGroupStatus = 'active' | 'inactive' | 'pending';
export type SubGroupType = 'general' | 'class' | 'instructor';

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
  type: SubGroupType; // 소그룹 타입: general, class, instructor
  instructorId?: string; // 강사별 소그룹일 때 담당 강사
  // 반(class) 전용 필드들
  classSchedule?: ClassSchedule[]; // 수업 시간표
  lessonRoomId?: string; // 배정된 수업실 ID
  lessonRoom?: {
    id: string;
    name: string;
    capacity: number;
  };
  childSubGroupCount?: number;
  leader?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  instructor?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  createdAt: string;
}

// SubGroupMember (소그룹 멤버십)
export type SubGroupMemberRole = 'leader' | 'member';

export interface SubGroupMember {
  id: string;
  subGroupId: string;
  groupMemberId: string;
  role: SubGroupMemberRole;
  joinedAt: string;
  groupMember?: GroupMember;
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
  // 멤버 관련
  | 'member_join_request'
  | 'member_approved'
  | 'member_rejected'
  | 'member_removed'
  | 'member_joined'
  | 'member_left'
  | 'role_changed'
  // 소모임 관련
  | 'subgroup_request'
  | 'subgroup_approved'
  | 'subgroup_rejected'
  | 'subgroup_created_notify'
  // 일정 관련
  | 'schedule_created'
  | 'schedule_updated'
  | 'schedule_cancelled'
  | 'schedule_reminder'
  | 'new_schedule'
  // 일정 변경 요청
  | 'schedule_change_request'
  | 'schedule_change_approved'
  | 'schedule_change_rejected'
  // 결석 관련
  | 'absence_request'
  | 'absence_approved'
  | 'absence_rejected'
  // 수업실 예약
  | 'reservation_created'
  | 'reservation_cancelled'
  | 'reservation_reminder'
  // 공지사항
  | 'announcement_new'
  | 'new_announcement'
  // 그룹 관련
  | 'group_settings_updated'
  // 시스템
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high';

export interface Notification {
  id: string;
  userId: string;
  groupId?: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  isRead: boolean;
  readAt?: string;
  actorId?: string;
  actor?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  group?: {
    id: string;
    name: string;
  };
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

// Attendance (출석)
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'early_leave';

export interface Attendance {
  id: string;
  scheduleId: string;
  groupId: string;
  userId: string;
  userName?: string;
  status: AttendanceStatus;
  checkedAt?: string;
  leftAt?: string; // 퇴장 시각 (조퇴 시)
  note?: string;
}

export interface QRToken {
  token: string;
  expiresAt: string;
  scheduleId: string;
  scheduleName: string;
}

// Absence Request (결석 신청)
export type AbsenceRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type AbsenceType = 'personal' | 'sick' | 'family' | 'travel' | 'exam' | 'other';

export interface AbsenceRequest {
  id: string;
  groupId: string;
  subGroupId?: string;
  scheduleId?: string;
  requesterId: string;
  studentId?: string;
  absenceDate: string;
  absenceType: AbsenceType;
  reason: string;
  status: AbsenceRequestStatus;
  responseNote?: string;
  createdAt: string;
  respondedAt?: string;
  requester?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  student?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  scheduleTitle?: string;
  subGroupName?: string;
}

// 출석 멤버 정보 (전체 멤버 출석 현황 조회용)
export interface AttendanceMember {
  memberId: string;
  userId: string;
  userName: string;
  profileImage?: string;
  role: MemberRole;
  // 출석 정보
  attendanceId: string | null;
  status: AttendanceStatus | null;
  checkedAt: string | null;
  leftAt: string | null;
  note: string | null;
  // 사유결석 정보
  absenceRequest: {
    id: string;
    status: AbsenceRequestStatus;
    absenceType: AbsenceType;
    reason: string;
    responseNote?: string;
  } | null;
}

export interface ScheduleAttendanceSummary {
  total: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  earlyLeave: number;
  notChecked: number;
}

// Schedule Change Request (일정 변경 요청)
export type ScheduleChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ScheduleChangeRequest {
  id: string;
  scheduleId: string;
  scheduleTitle?: string;
  originalStartAt?: string;
  originalEndAt?: string;
  requestedStartAt?: string;
  requestedEndAt?: string;
  reason?: string;
  status: ScheduleChangeRequestStatus;
  responseNote?: string;
  requester?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  createdAt: string;
  respondedAt?: string;
}
