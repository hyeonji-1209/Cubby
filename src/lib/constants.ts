// 요일 상수
export const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
export const WEEK_DAYS_FULL = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"] as const;

// 시간 관련 상수
export const DEFAULT_START_TIME = "09:00";
export const DEFAULT_END_TIME = "18:00";
export const TIME_SLOT_INTERVAL = 30; // minutes

// 색상 상수
export const EVENT_COLORS = {
  primary: "bg-primary/80 text-primary-foreground",
  holiday: "bg-red-500 text-white",
  academyHoliday: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400",
} as const;

// 그룹 타입 라벨
export const GROUP_TYPE_LABELS: Record<string, string> = {
  education: "교육/학원",
  couple: "연인",
  family: "가족",
  religion: "종교",
  hobby: "동호회",
  other: "기타",
};

// 멤버 역할 라벨
export const MEMBER_ROLE_LABELS: Record<string, string> = {
  owner: "소유자",
  admin: "관리자",
  instructor: "강사",
  guardian: "보호자",
  member: "멤버",
};

// 승인 상태 라벨
export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  pending: "대기중",
  approved: "승인됨",
  rejected: "거절됨",
};
