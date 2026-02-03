import { Crown, Shield, GraduationCap, Users, ShieldCheck } from "lucide-react";
import { MemberRole } from "@/types";

// 역할 라벨
export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "오너",
  admin: "관리자",
  instructor: "강사",
  student: "학생",
  guardian: "보호자",
  member: "멤버",
};

// 역할 아이콘
export const ROLE_ICONS: Record<MemberRole, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  admin: Shield,
  instructor: GraduationCap,
  student: Users,
  guardian: ShieldCheck,
  member: Users,
};

// 역할 색상 (배경 + 텍스트)
export const ROLE_COLORS: Record<MemberRole, string> = {
  owner: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  instructor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  student: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  guardian: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  member: "bg-muted text-muted-foreground",
};

// 역할별 배경 색상만 (아이콘 원형 배경용)
export const ROLE_BG_COLORS: Record<MemberRole, string> = {
  owner: "bg-yellow-100 dark:bg-yellow-900/30",
  admin: "bg-blue-100 dark:bg-blue-900/30",
  instructor: "bg-green-100 dark:bg-green-900/30",
  student: "bg-teal-100 dark:bg-teal-900/30",
  guardian: "bg-purple-100 dark:bg-purple-900/30",
  member: "bg-muted",
};

// 역할별 아이콘 텍스트 색상
export const ROLE_ICON_COLORS: Record<MemberRole, string> = {
  owner: "text-yellow-600 dark:text-yellow-400",
  admin: "text-blue-600 dark:text-blue-400",
  instructor: "text-green-600 dark:text-green-400",
  student: "text-teal-600 dark:text-teal-400",
  guardian: "text-purple-600 dark:text-purple-400",
  member: "text-muted-foreground",
};

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
