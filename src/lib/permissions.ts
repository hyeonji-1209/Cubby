import { MemberRole } from "@/types";

/**
 * 그룹 관리 권한 확인 (오너 또는 강사)
 */
export function canManageGroup(role: MemberRole, isOwner: boolean): boolean {
  return isOwner || role === "instructor";
}

/**
 * 강사 전용 권한 (오너 아님)
 */
export function isInstructorOnly(role: MemberRole, isOwner: boolean): boolean {
  return role === "instructor" && !isOwner;
}

/**
 * 멤버 관리 권한 (특정 멤버에 대해)
 */
export function canManageMember(
  currentRole: MemberRole,
  currentIsOwner: boolean,
  targetRole: MemberRole,
  targetIsOwner: boolean
): boolean {
  // 오너는 다른 오너 제외 모두 관리 가능
  if (currentIsOwner) {
    return !targetIsOwner || targetRole !== "instructor";
  }
  // 강사는 학생/보호자만 관리 가능
  if (currentRole === "instructor") {
    return targetRole === "student" || targetRole === "guardian";
  }
  return false;
}

/**
 * 공지사항 관리 권한
 */
export function canManageAnnouncements(role: MemberRole, isOwner: boolean): boolean {
  return isOwner || role === "instructor";
}

/**
 * 수업 관리 권한
 */
export function canManageLessons(role: MemberRole, isOwner: boolean): boolean {
  return isOwner || role === "instructor";
}

/**
 * 설정 접근 권한 (오너만)
 */
export function canAccessSettings(isOwner: boolean): boolean {
  return isOwner;
}

/**
 * 소그룹 관리 권한
 */
export function canManageSubgroups(role: MemberRole, isOwner: boolean): boolean {
  return isOwner || role === "instructor";
}
