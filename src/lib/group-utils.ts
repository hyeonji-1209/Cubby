import {
  GraduationCap,
  Heart,
  Users,
  Building2,
  Gamepad2,
  MoreHorizontal,
  Folder,
  LucideIcon,
} from "lucide-react";

// 그룹 타입별 아이콘
export const GROUP_TYPE_ICONS: Record<string, LucideIcon> = {
  education: GraduationCap,
  couple: Heart,
  family: Users,
  religion: Building2,
  hobby: Gamepad2,
  other: MoreHorizontal,
};

// 기본 아이콘
export const DEFAULT_GROUP_ICON = Folder;

// 그룹 타입 라벨
export const GROUP_TYPE_LABELS: Record<string, string> = {
  education: "교육",
  couple: "커플",
  family: "가족",
  religion: "종교",
  hobby: "취미",
  other: "기타",
};
