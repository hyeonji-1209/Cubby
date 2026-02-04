import { Crown, GraduationCap, Users, ShieldCheck } from "lucide-react";
import { MemberRole } from "@/types";

// 역할(직책) 라벨
export const ROLE_LABELS: Record<MemberRole, string> = {
  instructor: "강사",
  student: "학생",
  guardian: "보호자",
};

// 역할 아이콘
export const ROLE_ICONS: Record<MemberRole, React.ComponentType<{ className?: string }>> = {
  instructor: GraduationCap,
  student: Users,
  guardian: ShieldCheck,
};

// 역할 색상 (배경 + 텍스트)
export const ROLE_COLORS: Record<MemberRole, string> = {
  instructor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  student: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  guardian: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

// 역할별 배경 색상만 (아이콘 원형 배경용)
export const ROLE_BG_COLORS: Record<MemberRole, string> = {
  instructor: "bg-purple-100 dark:bg-purple-900/30",
  student: "bg-teal-100 dark:bg-teal-900/30",
  guardian: "bg-green-100 dark:bg-green-900/30",
};

// 역할별 아이콘 텍스트 색상
export const ROLE_ICON_COLORS: Record<MemberRole, string> = {
  instructor: "text-purple-600 dark:text-purple-400",
  student: "text-teal-600 dark:text-teal-400",
  guardian: "text-green-600 dark:text-green-400",
};

// Owner 아이콘 (is_owner=true일 때 표시용)
export const OwnerIcon = Crown;
export const OWNER_LABEL = "관리자";
export const OWNER_COLOR = "text-yellow-600 dark:text-yellow-400";

// 역할 라벨 가져오기
export function getRoleLabel(role: MemberRole): string {
  return ROLE_LABELS[role];
}

// 역할 아이콘 가져오기
export function getRoleIcon(role: MemberRole): React.ComponentType<{ className?: string }> {
  return ROLE_ICONS[role];
}

// 역할 색상 가져오기
export function getRoleColor(role: MemberRole): string {
  return ROLE_COLORS[role];
}

// 멤버 표시 라벨 (직책 + 관리자 표시)
export function getMemberDisplayLabel(role: MemberRole, isOwner: boolean): string {
  const roleLabel = ROLE_LABELS[role];
  return isOwner ? `${roleLabel} (관리자)` : roleLabel;
}
