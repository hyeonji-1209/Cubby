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

/**
 * 현재 시간을 30분 단위로 반올림 (HH:mm 형식)
 * 예: 10:17 → 10:30, 10:45 → 11:00
 */
export function getRoundedCurrentTime(): string {
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();

  // 30분 단위로 반올림
  if (minutes < 15) {
    minutes = 0;
  } else if (minutes < 45) {
    minutes = 30;
  } else {
    minutes = 0;
    hours += 1;
  }

  // 24시 넘어가면 0시로
  if (hours >= 24) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * 시간에 지정된 분을 더함 (HH:mm 형식)
 * 예: addMinutesToTime("10:30", 60) → "11:30"
 */
export function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [hours, minutes] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;

  let newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;

  return `${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`;
}
