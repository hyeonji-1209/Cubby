/**
 * 공통 레이블 상수
 */

import type { GroupType, MemberRole, NotificationType } from '@/types';

/**
 * 모임 타입 레이블
 */
export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  education: '교육/학원',
  religious: '종교',
  community: '동호회/커뮤니티',
  company: '회사/팀',
};

/**
 * 모임 타입 아이콘 (이모지)
 */
export const GROUP_TYPE_ICONS: Record<GroupType, string> = {
  education: '📚',
  religious: '⛪',
  community: '🎯',
  company: '💼',
};

/**
 * 멤버 역할 레이블
 */
export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: '운영자',
  admin: '관리자',
  leader: '리더',
  member: '멤버',
  guardian: '보호자',
};

/**
 * 멤버 역할 색상
 */
export const MEMBER_ROLE_COLORS: Record<MemberRole, string> = {
  owner: '#6366f1',   // primary
  admin: '#8b5cf6',   // purple
  leader: '#10b981',  // green
  member: '#6b7280',  // gray
  guardian: '#f59e0b', // amber
};

/**
 * 알림 타입 레이블
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  subgroup_request: '소모임 생성 요청',
  subgroup_approved: '소모임 승인',
  subgroup_rejected: '소모임 거절',
  subgroup_created_notify: '소모임 생성',
  member_joined: '멤버 가입',
  member_left: '멤버 탈퇴',
  role_changed: '역할 변경',
  new_announcement: '새 공지사항',
  new_schedule: '새 일정',
  schedule_reminder: '일정 알림',
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
