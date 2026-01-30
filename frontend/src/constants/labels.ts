/**
 * 공통 레이블 상수
 */

import type { GroupType, MemberRole, NotificationType, AttendanceStatus } from '@/types';

/**
 * 모임 타입 레이블
 */
export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  education: '교육/학원',
  religious: '종교',
  community: '동호회/커뮤니티',
  company: '회사/팀',
  couple: '연인/커플',
};

/**
 * 모임 타입 아이콘 (이모지)
 */
export const GROUP_TYPE_ICONS: Record<GroupType, string> = {
  education: '📚',
  religious: '⛪',
  community: '🎯',
  company: '💼',
  couple: '💕',
};

/**
 * 멤버 역할 레이블
 * 새로운 시스템: owner/member 두 가지만 사용
 * 세부 구분은 title(직책)로 관리
 */
export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: '운영자',
  member: '멤버',
};

/**
 * 멤버 역할 색상
 */
export const MEMBER_ROLE_COLORS: Record<MemberRole, string> = {
  owner: '#6366f1',   // primary
  member: '#6b7280',  // gray
};

/**
 * 멤버 역할 옵션 (선택용) - owner로 변경은 별도 기능으로만 가능
 */
export const ROLE_OPTIONS = [
  { value: 'member', label: '멤버' },
];

/**
 * 알림 타입 레이블
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  // 멤버 관련
  member_join_request: '가입 요청',
  member_approved: '가입 승인',
  member_rejected: '가입 거절',
  member_removed: '멤버 제외',
  member_joined: '멤버 가입',
  member_left: '멤버 탈퇴',
  role_changed: '역할 변경',
  // 소모임 관련
  subgroup_request: '소모임 생성 요청',
  subgroup_approved: '소모임 승인',
  subgroup_rejected: '소모임 거절',
  subgroup_created_notify: '소모임 생성',
  // 일정 관련
  schedule_created: '일정 생성',
  schedule_updated: '일정 수정',
  schedule_cancelled: '일정 취소',
  schedule_reminder: '일정 알림',
  new_schedule: '새 일정',
  // 일정 변경 요청
  schedule_change_request: '일정 변경 요청',
  schedule_change_approved: '일정 변경 승인',
  schedule_change_rejected: '일정 변경 거절',
  // 결석 관련
  absence_request: '결석 신청',
  absence_approved: '결석 승인',
  absence_rejected: '결석 거절',
  // 수업실 예약
  reservation_created: '예약 등록',
  reservation_cancelled: '예약 취소',
  reservation_reminder: '예약 알림',
  // 공지사항
  announcement_new: '새 공지사항',
  new_announcement: '새 공지사항',
  // 그룹 관련
  group_settings_updated: '설정 변경',
  // 시스템
  system: '시스템',
};

/**
 * 일정 색상 옵션
 */
export const SCHEDULE_COLORS = [
  { value: '#6366f1', label: '인디고' },
  { value: '#8b5cf6', label: '보라' },
  { value: '#ec4899', label: '핑크' },
  { value: '#ef4444', label: '빨강' },
  { value: '#f97316', label: '주황' },
  { value: '#eab308', label: '노랑' },
  { value: '#22c55e', label: '초록' },
  { value: '#14b8a6', label: '청록' },
  { value: '#3b82f6', label: '파랑' },
  { value: '#6b7280', label: '회색' },
];

/**
 * 구독 플랜 레이블
 */
export const SUBSCRIPTION_PLAN_LABELS: Record<string, string> = {
  basic: '베이직 (무료)',
  standard: '스탠다드',
  premium: '프리미엄',
};

/**
 * 구독 플랜 제한
 */
export const SUBSCRIPTION_LIMITS: Record<string, { groups: number | string; members: number | string; subgroups: number | string }> = {
  basic: { groups: 1, members: 10, subgroups: 2 },
  standard: { groups: 3, members: 50, subgroups: 10 },
  premium: { groups: '무제한', members: '무제한', subgroups: '무제한' },
};

/**
 * 출석 상태 레이블
 */
export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: '출석',
  absent: '결석',
  late: '지각',
  excused: '사유 결석',
  early_leave: '조퇴',
};

/**
 * 출석 상태 색상
 */
export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: '#22c55e',   // green
  absent: '#ef4444',    // red
  late: '#f97316',      // orange
  excused: '#6b7280',   // gray
  early_leave: '#eab308', // yellow
};

/**
 * 요일
 */
export const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];
export const DAYS_OF_WEEK_FULL = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

/**
 * 소모임 상태 레이블
 */
export const SUBGROUP_STATUS_LABELS: Record<string, string> = {
  active: '활성',
  inactive: '비활성',
  pending: '승인 대기',
};

/**
 * 소모임 요청 상태 레이블
 */
export const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: '대기 중',
  approved: '승인됨',
  rejected: '거절됨',
};

/**
 * 직책/직분 레이블 반환
 * - 종교 모임: 직분
 * - 그 외: 직책
 */
export const getPositionLabel = (groupType?: string): string => {
  return groupType === 'religious' ? '직분' : '직책';
};

/**
 * 모임 타입별 기본 색상
 */
export const GROUP_TYPE_COLORS: Record<GroupType, string> = {
  education: '#3b82f6',
  religious: '#8b5cf6',
  community: '#10b981',
  company: '#f59e0b',
  couple: '#ec4899',
};

/**
 * 모임 타입별 기본 아이콘 (아이콘명)
 */
export const GROUP_TYPE_DEFAULT_ICONS: Record<GroupType, string> = {
  education: 'book',
  religious: 'church',
  community: 'target',
  company: 'briefcase',
  couple: 'heart',
};

/**
 * 모임 타입별 특징
 */
export const GROUP_TYPE_FEATURES: Record<GroupType, string[]> = {
  education: ['수업 진도 관리', '과제 관리', '보호자 연동', '성적/평가', '출석 관리'],
  religious: ['주보 관리', '봉사활동 관리', '기도제목 공유', '찬양콘티 관리'],
  community: ['회비 관리', '정기 모임', '게시판', '투표/설문', '사진 공유'],
  company: ['프로젝트 관리', '업무 할당', '회의록', '문서 공유', '결재'],
  couple: ['기념일 관리', 'D-day 카운트', '데이트 일정', '추억 앨범', '위시리스트'],
};
