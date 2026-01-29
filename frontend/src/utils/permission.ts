import type { GroupMember, Group } from '@/types';

export type MemberRole = 'owner' | 'admin' | 'leader' | 'member' | 'guardian';

/**
 * 권한 체크 유틸리티
 */

// 역할이 운영진(owner 또는 admin)인지 확인
export const isAdminRole = (role?: string): boolean => {
  return role === 'owner' || role === 'admin';
};

// 역할이 소유자인지 확인
export const isOwnerRole = (role?: string): boolean => {
  return role === 'owner';
};

// 역할이 리더 이상인지 확인
export const isLeaderOrAbove = (role?: string): boolean => {
  return role === 'owner' || role === 'admin' || role === 'leader';
};

// 멤버 목록에서 운영진 필터링
export const filterAdminMembers = (members: GroupMember[]): GroupMember[] => {
  return members.filter((m) => isAdminRole(m.role));
};

// 멤버 목록에서 일반 멤버 필터링 (운영진 제외)
export const filterRegularMembers = (members: GroupMember[]): GroupMember[] => {
  return members.filter((m) => !isAdminRole(m.role));
};

/**
 * 현재 사용자의 권한 정보를 계산
 */
export interface UserPermissions {
  currentMember: GroupMember | undefined;
  myRole: string | undefined;
  isOwner: boolean;
  isAdmin: boolean;
  canWriteAnnouncement: boolean;
  canWriteSchedule: boolean;
}

export const getUserPermissions = (
  group: Group | null,
  members: GroupMember[],
  userId?: string
): UserPermissions => {
  const currentMember = members.find((m) => m.userId === userId);
  const myRole = group?.myRole || currentMember?.role;
  const isOwner = isOwnerRole(myRole);
  const isAdmin = isAdminRole(myRole);

  // 공지/일정 작성 권한 (그룹 설정에 따름)
  const announcementPermission = (group?.settings as Record<string, unknown>)?.announcementWritePermission ?? 'admin';
  const schedulePermission = (group?.settings as Record<string, unknown>)?.scheduleWritePermission ?? 'admin';

  const canWriteAnnouncement = isAdmin || announcementPermission === 'all';
  const canWriteSchedule = isAdmin || schedulePermission === 'all';

  return {
    currentMember,
    myRole,
    isOwner,
    isAdmin,
    canWriteAnnouncement,
    canWriteSchedule,
  };
};

/**
 * 역할별 우선순위 반환 (정렬용)
 */
export const getRolePriority = (role?: string): number => {
  switch (role) {
    case 'owner':
      return 0;
    case 'admin':
      return 1;
    case 'leader':
      return 2;
    case 'member':
      return 3;
    case 'guardian':
      return 4;
    default:
      return 5;
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
  role?: string
): boolean => {
  switch (feature) {
    case 'settings':
      // 설정은 운영진만 접근 가능
      return isAdminRole(role);
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
  targetRole?: string
): boolean => {
  // 자기 자신에 대한 액션은 기본적으로 허용 (탈퇴 등)
  if (!targetRole) return isAdminRole(role);

  const myPriority = getRolePriority(role);
  const targetPriority = getRolePriority(targetRole);

  switch (action) {
    case 'edit':
    case 'delete':
    case 'kick':
      // 자신보다 낮은 권한의 멤버에게만 액션 가능
      return myPriority < targetPriority;
    case 'approve':
      // 승인은 운영진만 가능
      return isAdminRole(role);
    default:
      return false;
  }
};
