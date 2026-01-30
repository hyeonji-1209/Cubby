import type { GroupMember, Group, Position, PositionPermissions } from '@/types';

export type MemberRole = 'owner' | 'member';

/**
 * 권한 체크 유틸리티
 *
 * 새로운 권한 시스템:
 * - role: owner | member (2가지만)
 * - 세부 권한은 Position(직책)의 permissions로 관리
 * - owner는 모든 권한 보유
 * - member는 직책에 따른 권한만 보유
 */

// 역할이 소유자인지 확인
export const isOwnerRole = (role?: string): boolean => {
  return role === 'owner';
};

// 직책 기반 권한 확인 (특정 권한 보유 여부)
export const hasPositionPermission = (
  member: GroupMember | undefined,
  positions: Position[],
  permission: keyof PositionPermissions
): boolean => {
  if (!member) return false;

  // owner는 모든 권한 보유
  if (member.role === 'owner') return true;

  // 직책이 없으면 권한 없음
  if (!member.positionId) return false;

  // 멤버의 직책 찾기
  const position = positions.find(p => p.id === member.positionId);
  if (!position || !position.permissions) return false;

  // 해당 권한 확인
  return position.permissions[permission] === true;
};

// 역할이 운영진인지 확인 (owner이거나 관리 권한이 있는 직책)
// 하위 호환성을 위해 유지하되, 직책 기반으로 동작
export const isAdminRole = (role?: string, member?: GroupMember, positions?: Position[]): boolean => {
  if (role === 'owner') return true;

  // 직책 정보가 없으면 단순히 owner 여부만 확인
  if (!member || !positions) return false;

  // 직책에 관리 권한이 있는지 확인
  return hasPositionPermission(member, positions, 'canManageMembers') ||
         hasPositionPermission(member, positions, 'canApproveRequests');
};

// 역할이 리더 이상인지 확인 (직책 기반)
export const isLeaderOrAbove = (role?: string, member?: GroupMember, positions?: Position[]): boolean => {
  if (role === 'owner') return true;

  if (!member || !positions) return false;

  // 어떤 관리 권한이라도 있으면 리더급으로 간주
  const adminPermissions: (keyof PositionPermissions)[] = [
    'canManageMembers',
    'canManageSubGroups',
    'canManageAnnouncements',
    'canManageSchedules',
    'canManageFinance',
    'canApproveRequests'
  ];

  return adminPermissions.some(perm => hasPositionPermission(member, positions, perm));
};

// 멤버 목록에서 운영진 필터링 (owner만)
export const filterAdminMembers = (members: GroupMember[]): GroupMember[] => {
  return members.filter((m) => m.role === 'owner');
};

// 멤버 목록에서 일반 멤버 필터링 (owner 제외)
export const filterRegularMembers = (members: GroupMember[]): GroupMember[] => {
  return members.filter((m) => m.role !== 'owner');
};

/**
 * 직책별 멤버 필터링
 */
export const filterMembersByTitle = (members: GroupMember[], title: string): GroupMember[] => {
  return members.filter((m) => m.title === title);
};

// 강사 멤버 필터링
export const filterInstructors = (members: GroupMember[]): GroupMember[] => {
  return filterMembersByTitle(members, '강사');
};

// 학생 멤버 필터링 (보호자, 강사 제외)
export const filterStudents = (members: GroupMember[]): GroupMember[] => {
  return members.filter((m) => m.title !== '보호자' && m.title !== '강사' && m.role !== 'owner');
};

// 보호자 멤버 필터링
export const filterGuardians = (members: GroupMember[]): GroupMember[] => {
  return filterMembersByTitle(members, '보호자');
};

/**
 * 현재 사용자의 권한 정보를 계산
 */
export interface UserPermissions {
  currentMember: GroupMember | undefined;
  myRole: string | undefined;
  isOwner: boolean;
  isAdmin: boolean; // 하위 호환성: owner면 true
  canWriteAnnouncement: boolean;
  canWriteSchedule: boolean;
  canManageMembers: boolean;
  canManageSubGroups: boolean;
  canManageSchedules: boolean;
  canApproveRequests: boolean;
}

export const getUserPermissions = (
  group: Group | null,
  members: GroupMember[],
  userId?: string,
  positions?: Position[]
): UserPermissions => {
  const currentMember = members.find((m) => m.userId === userId);
  const myRole = group?.myRole || currentMember?.role;
  const isOwner = isOwnerRole(myRole);

  // owner는 모든 권한 보유
  if (isOwner) {
    return {
      currentMember,
      myRole,
      isOwner: true,
      isAdmin: true,
      canWriteAnnouncement: true,
      canWriteSchedule: true,
      canManageMembers: true,
      canManageSubGroups: true,
      canManageSchedules: true,
      canApproveRequests: true,
    };
  }

  // member는 직책 기반 권한
  const positionList = positions || [];

  // 그룹 설정에 따른 공지/일정 작성 권한
  const announcementPermission = (group?.settings as Record<string, unknown>)?.announcementWritePermission ?? 'admin';
  const schedulePermission = (group?.settings as Record<string, unknown>)?.scheduleWritePermission ?? 'admin';

  const canManageAnnouncements = hasPositionPermission(currentMember, positionList, 'canManageAnnouncements');
  const canManageSchedules = hasPositionPermission(currentMember, positionList, 'canManageSchedules');

  const canWriteAnnouncement = canManageAnnouncements || announcementPermission === 'all';
  const canWriteSchedule = canManageSchedules || schedulePermission === 'all';

  return {
    currentMember,
    myRole,
    isOwner: false,
    isAdmin: false, // member는 admin이 아님
    canWriteAnnouncement,
    canWriteSchedule,
    canManageMembers: hasPositionPermission(currentMember, positionList, 'canManageMembers'),
    canManageSubGroups: hasPositionPermission(currentMember, positionList, 'canManageSubGroups'),
    canManageSchedules,
    canApproveRequests: hasPositionPermission(currentMember, positionList, 'canApproveRequests'),
  };
};

/**
 * 역할별 우선순위 반환 (정렬용)
 * 새로운 시스템: owner > member (직책에 따라 추가 정렬 가능)
 */
export const getRolePriority = (role?: string): number => {
  switch (role) {
    case 'owner':
      return 0;
    case 'member':
      return 1;
    default:
      return 2;
  }
};

/**
 * 멤버를 역할 우선순위로 정렬
 */
export const sortMembersByRole = (members: GroupMember[]): GroupMember[] => {
  return [...members].sort((a, b) => getRolePriority(a.role) - getRolePriority(b.role));
};

/**
 * 특정 기능에 대한 접근 권한 확인
 */
export const canAccessFeature = (
  feature: 'members' | 'settings' | 'subgroups' | 'announcements' | 'schedules',
  role?: string,
  _member?: GroupMember,
  _positions?: Position[]
): boolean => {
  switch (feature) {
    case 'settings':
      // 설정은 owner만 접근 가능
      return role === 'owner';
    case 'members':
    case 'subgroups':
    case 'announcements':
    case 'schedules':
      // 기본적으로 모든 멤버가 접근 가능
      return true;
    default:
      return false;
  }
};

/**
 * 특정 액션에 대한 권한 확인
 */
export const canPerformAction = (
  action: 'edit' | 'delete' | 'approve' | 'kick',
  role?: string,
  targetRole?: string,
  member?: GroupMember,
  positions?: Position[]
): boolean => {
  // owner는 모든 액션 가능 (자신 제외한 멤버에게)
  if (role === 'owner') {
    // 다른 owner에게는 액션 불가
    return targetRole !== 'owner';
  }

  // member는 직책 권한에 따라
  if (!member || !positions) return false;

  switch (action) {
    case 'approve':
      return hasPositionPermission(member, positions, 'canApproveRequests');
    case 'kick':
    case 'edit':
    case 'delete':
      return hasPositionPermission(member, positions, 'canManageMembers') && targetRole !== 'owner';
    default:
      return false;
  }
};

/**
 * 특정 직책인지 확인하는 헬퍼 함수들
 */
export const isInstructor = (member?: GroupMember): boolean => {
  return member?.title === '강사';
};

export const isStudent = (member?: GroupMember): boolean => {
  return member?.title !== '보호자' && member?.title !== '강사' && member?.role !== 'owner';
};

export const isGuardian = (member?: GroupMember): boolean => {
  return member?.title === '보호자';
};
