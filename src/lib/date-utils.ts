import { format } from "date-fns";
import { ko } from "date-fns/locale";

// 날짜 포맷 상수
export const DATE_FORMATS = {
  monthYear: "yyyy년 M월",
  fullDateWithDay: "M월 d일 EEEE",
  shortDateWithDay: "M월 d일 (EEE)",
  fullDate: "yyyy년 M월 d일",
  yearOnly: "yyyy년",
  time: "HH:mm",
  dateTime: "yyyy-MM-dd HH:mm",
  isoDate: "yyyy-MM-dd",
} as const;

// 포맷 함수들
export function formatMonthYear(date: Date): string {
  return format(date, DATE_FORMATS.monthYear, { locale: ko });
}

export function formatFullDateWithDay(date: Date): string {
  return format(date, DATE_FORMATS.fullDateWithDay, { locale: ko });
}

export function formatShortDateWithDay(date: Date): string {
  return format(date, DATE_FORMATS.shortDateWithDay, { locale: ko });
}

export function formatYearOnly(date: Date): string {
  return format(date, DATE_FORMATS.yearOnly, { locale: ko });
}

export function formatTime(date: Date): string {
  return format(date, DATE_FORMATS.time);
}

export function formatIsoDate(date: Date): string {
  return format(date, DATE_FORMATS.isoDate);
}

// 날짜/시간 범위 생성 (이벤트 생성용)
export function buildDateTimeRange(
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  allDay: boolean
): { start_at: string; end_at: string } {
  const startAt = new Date(startDate);
  const endAt = new Date(endDate);

  if (!allDay) {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    startAt.setHours(startHour, startMin, 0, 0);
    endAt.setHours(endHour, endMin, 0, 0);
  } else {
    startAt.setHours(0, 0, 0, 0);
    endAt.setHours(23, 59, 59, 999);
  }

  return {
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
  };
}

// 날짜가 특정 범위 내에 있는지 확인
export function isDateInRange(date: Date, startAt: string, endAt: string): boolean {
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  const checkDate = new Date(date);
  checkDate.setHours(12, 0, 0, 0);
  return checkDate >= startDate && checkDate <= endDate;
}

// 시간 문자열에서 Date 객체 생성
export function parseTimeToDate(baseDate: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(":").map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

// 오늘 날짜인지 확인
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
