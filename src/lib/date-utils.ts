// 날짜 포맷 유틸리티

/**
 * 간단한 날짜 포맷 (YY.MM.DD)
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * 월/일만 표시 (MM.DD)
 */
export function formatDateMonthDay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * 월/일 + 요일 (MM.DD (요일))
 */
export function formatDateWithWeekday(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
}

/**
 * 상대적 시간 표시 (방금 전, 5분 전, 3시간 전 등)
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

/**
 * 시간만 표시 (HH:mm)
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * 전체 날짜 + 시간 표시 (YYYY년 M월 D일 HH:mm)
 */
export function formatDateTimeFull(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 요일 배열 (한국어)
 */
export const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 요일 인덱스로 한국어 요일 가져오기
 */
export function getWeekdayKo(dayIndex: number): string {
  return WEEKDAYS_KO[dayIndex % 7];
}
