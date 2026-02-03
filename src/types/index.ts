// ============================================
// 공통 타입
// ============================================

export type GroupType =
  | 'education'    // 교육/학원
  | 'couple'       // 연인
  | 'family'       // 가족
  | 'religion'     // 종교
  | 'hobby'        // 동호회
  | 'other';       // 기타

export type MemberRole =
  | 'owner'        // 소유자
  | 'admin'        // 관리자
  | 'instructor'   // 강사 (교육 타입)
  | 'student'      // 학생 (교육 타입)
  | 'guardian'     // 보호자 (교육 타입)
  | 'member';      // 일반 멤버

export type ApprovalStatus =
  | 'pending'      // 대기중
  | 'approved'     // 승인됨
  | 'rejected';    // 거절됨

export type AttendanceStatus =
  | 'present'      // 출석
  | 'late'         // 지각
  | 'early_leave'  // 조퇴
  | 'absent'       // 결석
  | 'excused';     // 사유결석

export type LessonType =
  | 'individual'   // 1:1 수업
  | 'group';       // 그룹 수업

// ============================================
// 사용자 관련 타입
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// 모임(그룹) 관련 타입
// ============================================

export interface Group {
  id: string;
  name: string;
  description?: string;
  type: GroupType;
  icon?: string;
  settings: GroupSettings;
  invite_code: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface GroupSettings {
  // 공통 - 오너 설정
  max_owners?: number;

  // 초대 코드 설정
  invite_code_type?: 'one_time' | 'expiry';  // 단발성 / 유효기간
  invite_code_used?: boolean;                 // 단발성일 때 사용 여부
  invite_code_expiry?: string;                // 유효기간일 때 만료일

  // 교육 타입 설정
  lesson_type?: LessonType;
  attendance_check?: boolean;
  multi_instructor?: boolean;
  allow_guardian?: boolean;

  // 클래스 설정
  classes?: ClassRoom[];

  // 연습실 설정
  has_practice_room?: boolean;
  practice_room_hours?: {
    start: string;
    end: string;
  };
  practice_room_slot_unit?: 30 | 60; // 예약 단위 (30분/1시간)
  excluded_practice_classes?: string[]; // 연습실로 사용 안하는 클래스 이름들

  // 레거시 (이전 버전 호환)
  practice_rooms?: PracticeRoom[];

  same_day_change_allowed?: boolean;
  bulk_payment_date?: boolean;
  payment_date?: number; // 1-31

  // 연인/가족 타입 설정
  is_married?: boolean;
  anniversary_date?: string;
  share_menstrual_cycle?: boolean;

  // 공통 설정
  holidays?: Holiday[];
  positions?: Position[];
}

export interface ClassRoom {
  id: string;
  name: string;
  capacity?: number; // 수용 인원
}

export interface PracticeRoom {
  id: string;
  name: string;
  capacity?: number;
}

export interface Holiday {
  date: string;
  name: string;
}

export interface Position {
  id: string;
  name: string;
  permissions: string[];
}

// ============================================
// 멤버 관련 타입
// ============================================

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: MemberRole;
  nickname?: string;
  position_id?: string;
  status: ApprovalStatus;

  // 교육 타입 전용
  instructor_id?: string;
  lesson_schedule?: LessonSchedule[];
  payment_date?: number;

  // 연인/가족 타입 전용
  family_role?: string; // 남자친구, 여자친구, 아내, 남편, 딸, 아들 등
  birthday?: string;

  created_at: string;
  updated_at: string;
}

export interface LessonSchedule {
  day_of_week: number; // 0-6 (일-토)
  start_time: string;  // HH:mm
  end_time: string;    // HH:mm
  room_id?: string;
}

// ============================================
// 소그룹 관련 타입
// ============================================

export interface SubGroup {
  id: string;
  group_id: string;
  name: string;
  instructor_id: string;
  lesson_schedule: LessonSchedule[];
  room_id?: string;
  member_ids: string[];
  created_at: string;
  updated_at: string;
}

// ============================================
// 수업/일정 관련 타입
// ============================================

export interface Lesson {
  id: string;
  group_id: string;
  subgroup_id?: string;
  instructor_id: string;
  student_id?: string; // 1:1 수업일 경우
  room_id?: string;

  scheduled_at: string;
  duration_minutes: number;

  is_makeup: boolean;        // 보강 여부
  original_lesson_id?: string;

  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

  content?: string;          // 수업 내용
  homework?: string;         // 과제
  notes?: string;            // 비고

  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  lesson_id: string;
  member_id: string;
  status: AttendanceStatus;
  check_in_at?: string;
  check_out_at?: string;
  reason?: string;           // 지각/조퇴/결석 사유
  created_at: string;
}

// ============================================
// 수업 변경 신청 타입
// ============================================

export interface LessonChangeRequest {
  id: string;
  lesson_id: string;
  requested_by: string;
  requested_date: string;    // 변경 요청한 새 날짜
  reason?: string;
  status: ApprovalStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

// ============================================
// 연습실 예약 타입
// ============================================

export interface RoomReservation {
  id: string;
  group_id: string;
  room_id: string;
  reserved_by: string;
  start_at: string;
  end_at: string;
  status: ApprovalStatus;
  created_at: string;
}

// ============================================
// 공지사항 타입
// ============================================

export interface AnnouncementAttachment {
  id: string;
  name: string;
  url: string;
  type: string; // mime type
  size: number; // bytes
}

export interface Announcement {
  id: string;
  group_id: string;
  subgroup_id?: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_instructor_only: boolean; // 강사만 볼 수 있는 공지
  attachments?: AnnouncementAttachment[];
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementComment {
  id: string;
  announcement_id: string;
  author_id: string;
  parent_id?: string; // 대댓글인 경우 부모 댓글 ID
  content: string;
  created_at: string;
  updated_at: string;
  // 조인된 데이터
  author?: {
    id: string;
    name: string;
    avatar_url?: string;
    role?: string; // 직책/역할
  };
  replies?: AnnouncementComment[];
}

export interface AnnouncementLike {
  id: string;
  announcement_id: string;
  user_id: string;
  created_at: string;
}

// ============================================
// 일정(캘린더) 타입
// ============================================

export interface CalendarEvent {
  id: string;
  group_id?: string;
  user_id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  color?: string;
  event_type: 'personal' | 'shared' | 'lesson' | 'reservation' | 'academy_holiday' | string;
  visibility?: 'private' | 'partner' | 'all';
  is_academy_holiday?: boolean;
  group_name?: string; // 캘린더 표시용
  location_id?: string; // 장소 ID
  location?: string;    // 장소 이름
  created_at?: string;
}

// 조합 타입
export type GroupMemberWithUser = GroupMember & { user: User };
export type GroupMemberWithInstructor = GroupMember & {
  instructor: (GroupMember & { user: User }) | null;
};

// 모달 기본 Props
export interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// ============================================
// 연인/가족 전용 타입
// ============================================

export interface MenstrualCycle {
  id: string;
  user_id: string;
  group_id: string;
  period_start: string;
  period_end?: string;
  cycle_length?: number;
  period_length?: number;
  notes?: string;
  created_at: string;
}

export interface DailyMessage {
  id: string;
  group_id: string;
  sender_id: string;
  message: string;
  date: string;
  created_at: string;
}

// ============================================
// 알림 타입
// ============================================

export interface Notification {
  id: string;
  user_id: string;
  group_id?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export type NotificationType =
  | 'lesson_reminder'
  | 'lesson_change_request'
  | 'lesson_change_approved'
  | 'lesson_completed'
  | 'room_reminder'
  | 'payment_reminder'
  | 'holiday_notice'
  | 'announcement'
  | 'member_joined'
  | 'menstrual_reminder'
  | 'daily_message';

// ============================================
// 수강료 관련 타입
// ============================================

export interface Payment {
  id: string;
  group_id: string;
  member_id: string;
  amount: number;
  due_date: string;
  paid_at?: string;
  status: 'pending' | 'paid' | 'overdue';
  created_at: string;
}
